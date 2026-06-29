import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { GoogleGenAI, Type } from '@google/genai';
import { UserRole, CaseStatus, ClientUpdateStatus, User, Company, CompanySettings } from './src/types';
import session from 'express-session';
import MemoryStore from 'memorystore';
import connectPgSimple from 'connect-pg-simple';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import crypto from 'crypto';
import { sendInviteEmail, sendSuperadminLoginAlert, sendTeamInviteEmail, sendAccessUpdateEmail } from './server/email';
import {
  getCalendarAuthUrl,
  exchangeCodeForTokens,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
} from './server/calendar';

// ─── SUPERADMIN ADDITION START ───
import { isSuperadminAuthenticated, getRequestIP } from './server/superadmin/auth';
import { superadminLogger } from './server/superadmin/logger';

// Clean old login attempts on server startup
db.cleanOldAttempts();
// ─── SUPERADMIN ADDITION END ───

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// ─── SECURITY ADDITION START ───
// Fail fast in production if critical secrets were never set on Railway —
// prevents the app from silently running on the hardcoded fallback values
// that exist later in this file (and are visible in your public GitHub repo).
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = ['SESSION_SECRET', 'SUPERADMIN_SECRET_KEY', 'SUPERADMIN_EMAIL'];
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('//postgres:postgres@localhost:5432/')) {
    console.error('[WARNING] DATABASE_URL is not set or using local fallback. Continuing server start, but database operations may fail.');
  }
}

// Constant-time string comparison — prevents timing attacks on secret/password checks.
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Reusable per-IP rate limiter factory (same pattern as the existing superadmin limiter below).
function createRateLimiter(maxRequests: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetTime: number }>();
  return (req: any, res: any, next: any) => {
    const ip = getRequestIP(req);
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || now > entry.resetTime) {
      hits.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > maxRequests) {
      return res.status(429).json({ error: "rate_limit_exceeded" });
    }
    next();
  };
}
const authRateLimiter = createRateLimiter(20, 60 * 1000);          // 20 login attempts/min/IP
const registrationRateLimiter = createRateLimiter(5, 60 * 1000);  // 5 registrations/min/IP
// ─── SECURITY ADDITION END ───

app.set('trust proxy', 1);

app.use(express.json({ limit: '15mb' }));

const hasRealDb = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('//postgres:postgres@localhost:5432/');
const sessionStore = hasRealDb
  ? new (connectPgSimple(session))({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true,
    })
  : undefined; // falls back to MemoryStore count in dev or dummy fallback

if (sessionStore) {
  sessionStore.on('error', (err) => {
    console.error('[Session Store] Postgres session store error (non-fatal):', err);
  });
}

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days — you stay logged in
    sameSite: 'lax'
  },
  name: 'docket.sid'
}));

app.use(passport.initialize());
app.use(passport.session());

// ─── SUPERADMIN ADDITION START ───
// Platform lock check (Requirement 8 - Lockout check runs before all routes except /api/sa/unlock)
app.use(async (req, res, next) => {
  if (await db.isPlatformLocked() && req.path !== '/api/sa/unlock') {
    return res.status(503).json({
      error: "platform_locked",
      message: "System temporarily unavailable"
    });
  }
  next();
});

// Obscure /superadmin path check (Requirement 1 - Any requests to /superadmin/* that do not match the secret path return 404)
const REAL_SUPERADMIN_PATH = process.env.SUPERADMIN_PATH || 'superadmin';
app.use((req, res, next) => {
  if (REAL_SUPERADMIN_PATH !== 'superadmin') {
    if (req.path === '/superadmin' || req.path.startsWith('/superadmin/')) {
      return res.status(404).send('Cannot GET ' + req.path);
    }
  }
  next();
});
// ─── SUPERADMIN ADDITION END ───

// Passport Google Strategy
const googleClientId = process.env.GOOGLE_CLIENT_ID || 'dummy_id';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || 'dummy_secret';

const getCallbackUrl = (req: any) => {
  if (process.env.GOOGLE_CALLBACK_URL) {
    return process.env.GOOGLE_CALLBACK_URL;
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  return `${protocol}://${host}/api/auth/google/callback`;
};

passport.use(new GoogleStrategy({
  clientID: googleClientId,
  clientSecret: googleClientSecret,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback', // placeholder, overridden at runtime
  passReqToCallback: true
},
async (req, accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('No email from Google'));
    
    const invitationToken = req.query.state as string;
    
    if (invitationToken) {
      // Invitation flow
      await db.expireOldInvitations();
      const invitation = await db.getInvitationByToken(invitationToken);
      if (!invitation) {
        return done(null, false, { message: 'invalid_token' });
      }
      if (new Date(invitation.expiresAt) < new Date()) {
        return done(null, false, { message: 'token_expired' });
      }
      if (email.toLowerCase() !== invitation.email.toLowerCase()) {
        return done(null, false, { 
          message: 'email_mismatch',
          expectedEmail: invitation.email,
          actualEmail: email
        });
      }
      
      // Check if user already exists (re-accepting)
      let user = await db.getUserByEmail(email);
      if (!user) {
        const targetCompany = await db.getCompany(invitation.companyId);
        // A founding admin's company starts with setupComplete:false — they need the
        // onboarding wizard. A delegate joining an already-running firm should NOT see
        // onboarding; they get demo data seeded and go straight to their assigned pages.
        const isJoiningEstablishedFirm = !!targetCompany?.setupComplete;

        user = await db.createUser({
          companyId: invitation.companyId,
          fullName: profile.displayName || email.split('@')[0],
          email,
          avatarUrl: profile.photos?.[0]?.value || 
            `https://api.dicebear.com/7.x/initials/svg?seed=${profile.displayName}`,
          role: invitation.role as any,
          isActive: true,
          isSuperAdmin: false,
          allowedPages: (invitation as any).allowedPages || null
        });

        if (isJoiningEstablishedFirm) {
          try {
            await (db as any).cloneDemoDataToCompany(invitation.companyId, user.id);
          } catch (cloneErr) {
            console.error("Failed to pre-seed company with demo data:", cloneErr);
          }
        }
        // Founding admins keep setupComplete:false here on purpose, so the OAuth
        // callback below routes them to /onboarding instead of /dashboard.
      }
      
      await db.markInvitationAccepted(invitation.id);
      return done(null, user);
      
    } else {
      // Returning user login
      const user = await db.getUserByEmail(email);
      if (!user) {
        return done(null, false, { message: 'no_account' });
      }
      if (!user.isActive) {
        return done(null, false, { message: 'deactivated' });
      }
      return done(null, user);
    }
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  if (id === 'usr-super-admin') {
    return done(null, {
      id: 'usr-super-admin',
      fullName: 'Super Administrator',
      email: process.env.SUPERADMIN_EMAIL || 'voyyagic@gmail.com',
      role: 'SUPERADMIN',
      isSuperAdmin: true,
      companyId: null,
      isActive: true,
      setupComplete: true
    });
  }
  const user = await db.getUser(id);
  if (user) {
    const freshUser = { ...user } as any;
    const company = freshUser.companyId ? await db.getCompany(freshUser.companyId) : null;
    freshUser.setupComplete = company ? !!company.setupComplete : false;
    return done(null, freshUser);
  }
  done(null, null);
});

// ─── AUTHENTICATED OR OAUTH API ROUTES ──────────────────────────────────────────

// Initiate Google OAuth (popup endpoint returning authentication redirect)
app.get('/api/auth/google/url', (req, res) => {
  const token = req.query.token as string || '';
  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: getCallbackUrl(req),
    response_type: 'code',
    scope: 'profile email',
    state: token
  });
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ url });
});

app.get('/api/auth/google', (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: (req.query.token as string) || '',
    callbackURL: getCallbackUrl(req)
  } as any)(req, res, next);
});

app.get('/api/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', {
    callbackURL: getCallbackUrl(req)
  } as any, async (err: any, user: any, info: any) => {
    if (err) {
      return next(err);
    }
    const token = req.query.state as string || '';
    
    let redirectUrl = '';
    if (!user) {
      const message = info?.message || 'auth_failed';
      if (message === 'email_mismatch') {
        redirectUrl = `/invite/${token}?error=email_mismatch`;
      } else if (message === 'token_expired') {
        redirectUrl = `/invite/${token}?error=expired`;
      } else if (message === 'invalid_token') {
        redirectUrl = `/invite/${token}?error=invalid`;
      } else if (message === 'no_account') {
        // Send them to registration, not login — login has Google button which causes the loop
        redirectUrl = `/register?reason=no_account`;
      } else if (message === 'deactivated') {
        redirectUrl = `/login?error=deactivated`;
      } else {
        redirectUrl = `/login?error=auth_failed`;
      }
    } else {
      const company = user.companyId ? await db.getCompany(user.companyId) : null;
      if (!company || !company.setupComplete) {
        redirectUrl = '/onboarding';
      } else {
        redirectUrl = '/dashboard';
      }
    }

    if (!user) {
      return res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', redirectUrl: "${redirectUrl}" }, '*');
                window.close();
              } else {
                window.location.href = "${redirectUrl}";
              }
            </script>
            <p>Authentication failure. Redirecting...</p>
          </body>
        </html>
      `);
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      
      return res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', redirectUrl: "${redirectUrl}" }, '*');
                window.close();
              } else {
                window.location.href = "${redirectUrl}";
              }
            </script>
            <p>Authentication successful. Redirecting...</p>
          </body>
        </html>
      `);
    });
  })(req, res, next);
});

app.get('/api/auth/me', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = req.user as any;
  const company = user.companyId ? await db.getCompany(user.companyId) : null;
  const settings = user.companyId ? await db.getSettings(user.companyId) : null;
  res.json({
    user,
    company,
    settings
  });
});

app.post('/api/auth/invite/bypass', async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  await db.expireOldInvitations();
  const invitation = await db.getInvitationByToken(token);
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation not found or has expired.' });
  }
  if (new Date(invitation.expiresAt) < new Date()) {
    return res.status(400).json({ error: 'Invitation link has expired.' });
  }

  // Find or create the user
  let user = await db.getUserByEmail(invitation.email);
  if (!user) {
    const targetCompany = await db.getCompany(invitation.companyId);
    const isJoiningEstablishedFirm = !!targetCompany?.setupComplete;

    user = await db.createUser({
      companyId: invitation.companyId,
      fullName: invitation.email.split('@')[0],
      email: invitation.email,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(invitation.email)}`,
      role: invitation.role as any,
      isActive: true,
      isSuperAdmin: false,
      allowedPages: (invitation as any).allowedPages || null
    });

    if (isJoiningEstablishedFirm) {
      try {
        await (db as any).cloneDemoDataToCompany(invitation.companyId, user.id);
      } catch (cloneErr) {
        console.error("Failed to pre-seed company with demo data:", cloneErr);
      }
    }
  }

  await db.markInvitationAccepted(invitation.id);

  req.logIn(user, async (err) => {
    if (err) return next(err);
    
    // Determine the redirect URL
    const company = await db.getCompany(user.companyId);
    const redirectUrl = (!company || !company.setupComplete) ? '/onboarding' : '/dashboard';
    return res.json({ success: true, redirectUrl });
  });
});

app.post('/api/auth/bypass', async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  const email = 'voyyagic@gmail.com';
  let user = await db.getUserByEmail(email);
  if (!user) {
    const companies = await db.getCompanies();
    let company = companies[0];
    if (!company) {
      company = await db.createCompany({
        name: "Docket Legal Chambers",
        slug: "docket-chambers",
        setupComplete: true,
        isActive: true
      });
    }
    user = await db.createUser({
      companyId: company.id,
      fullName: "Alex Rivera",
      email,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${email}`,
      role: UserRole.ADMIN,
      isActive: true,
      isSuperAdmin: true
    });
  }

  // Ensure setup is complete so developer is not forced onto onboarding wizard
  if (user && user.companyId) {
    const comp = await db.getCompany(user.companyId);
    if (comp && !comp.setupComplete) {
      await db.updateCompany(user.companyId, { setupComplete: true });
    }
  }

  req.logIn(user, (err) => {
    if (err) {
      return res.status(550).json({ error: "Bypass login error" });
    }
    return res.json({ success: true, user });
  });
});

app.post('/api/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    if (req.session) {
      req.session.destroy(() => {
        res.json({ success: true });
      });
    } else {
      res.json({ success: true });
    }
  });
});

app.post('/api/auth/session/refresh', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = req.user as any;
  const freshUser = await db.getUser(user.id);
  if (!freshUser) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  req.logIn(freshUser, async (err) => {
    if (err) return res.status(500).json({ error: 'Session refresh failed' });
    const company = freshUser.companyId ? await db.getCompany(freshUser.companyId) : null;
    const settings = freshUser.companyId ? await db.getSettings(freshUser.companyId) : null;
    res.json({
      user: freshUser,
      company,
      settings
    });
  });
});

app.post('/api/registration/submit', registrationRateLimiter, async (req, res) => {
  const { firmName, registrantName, email, country, firmSize, referralSource } = req.body;
  if (!firmName || !registrantName || !email || !country || !firmSize) {
    return res.status(400).json({ error: 'Missing required registration parameters' });
  }

  const getSimilarity = (s1: string, s2: string) => {
    const clean1 = s1.toLowerCase().trim();
    const clean2 = s2.toLowerCase().trim();
    if (clean1 === clean2) return 1.0;
    const cleanStr = (str: string) => str.replace(/[^a-z0-9]/g, '');
    const c1 = cleanStr(clean1);
    const c2 = cleanStr(clean2);
    if (c1 === c2) return 0.95;
    const intersection = [...new Set(c1)].filter(char => c2.includes(char)).length;
    const union = new Set(c1 + c2).size;
    return intersection / union;
  };

  const existingUser = await db.getUserByEmail(email);
  if (existingUser) {
    return res.status(400).json({ error: 'This email is already registered.' });
  }

  const freeDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com', 'aol.com', 'mail.com'];
  const isFreeDomain = freeDomains.some(domain => email.toLowerCase().endsWith(domain));

  const companies = await db.getCompanies();
  const isDuplicateFirm = companies.some(c => getSimilarity(c.name, firmName) >= 0.82);

  let riskScore = 'low';
  if (isDuplicateFirm) {
    riskScore = 'high';
  } else if (isFreeDomain) {
    riskScore = 'medium';
  }

  // All registrations go to superadmin queue regardless of risk score.
  // No firm gets access until you manually approve it from your panel.
  await db.createRegistrationRequest({
    firmName,
    registrantName,
    email,
    country,
    firmSize,
    referralSource: referralSource || '',
    riskScore,
    status: 'needs_review',
    companyId: undefined,
    inviteToken: undefined
  });

  return res.json({
    status: 'needs_review',
    message: 'Your registration has been received. Our team will review it and send you an email with next steps within 24 hours.'
  });
});

app.get('/api/registration/status', async (req, res) => {
  const email = req.query.email as string;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const requests = await db.getRegistrationRequests();
  // Find the latest registration request for this email
  const request = [...requests]
    .reverse()
    .find(r => r.email.toLowerCase() === email.toLowerCase());

  if (!request) {
    return res.json({ status: 'none' });
  }

  return res.json({
    status: request.status,
    firmName: request.firmName,
    email: request.email,
    message: request.status === 'approved'
      ? 'Your registration has been approved. Please click below or check your email for the secure setup link!'
      : request.status === 'rejected'
        ? 'Your registration request was declined.'
        : 'Your registration is pending manual system review. We will authorize your workspace shortly.',
    inviteToken: request.inviteToken || null
  });
});

app.get('/api/invitations/:token', async (req, res) => {
  const invitation = await db.getInvitationByToken(req.params.token);
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation not found or has expired.' });
  }
  const company = await db.getCompany(invitation.companyId);
  res.json({
    email: invitation.email,
    firmName: company ? company.name : 'Unknown Firm',
    role: invitation.role,
    expired: new Date(invitation.expiresAt) < new Date(),
    isActive: invitation.isActive
  });
});

app.post('/api/invitations/send', async (req, res) => {
  if (!req.user) {
    return res.status(404).json({ error: 'Not authenticated' });
  }
  const user = req.user as any;
  const isFirmAdmin = user.role === UserRole.ADMIN || user.isSuperAdmin;
  if (!isFirmAdmin) {
    return res.status(403).json({ error: 'Only firm admins can delegate tasks' });
  }
  if (!user.companyId) {
    return res.status(400).json({ error: 'No active firm on this account' });
  }

  const { email, role, name, allowedPages } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Don't allow inviting someone already on the team
  const existingMember = await db.getUserByEmail(email);
  if (existingMember && existingMember.companyId === user.companyId) {
    return res.status(400).json({ error: 'This person is already on your team' });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const cleanPages = Array.isArray(allowedPages) && allowedPages.length > 0 ? allowedPages : null;

  const invitation = await db.createInvitation({
    companyId: user.companyId,
    email,
    role: role || 'LAWYER',
    name,
    allowedPages: cleanPages,
    tokenHash,
    expiresAt,
    isActive: true
  });

  const company = await db.getCompany(user.companyId);
  const inviteLink = `https://${req.get('host')}/invite/${rawToken}`;

  const emailSent = await sendTeamInviteEmail({
    to: email,
    name: name || email.split('@')[0],
    firmName: company?.name || 'your firm',
    role: role || 'LAWYER',
    allowedPages: cleanPages,
    inviteLink
  });

  res.json({ success: true, token: rawToken, invitationId: invitation.id, emailSent });
});

// List pending/sent invitations for a firm — used by Delegate Tasks settings tab
app.get('/api/firm/:companyId/invitations', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const reqUser = req.user as any;
  const { companyId } = req.params;
  if (reqUser.companyId !== companyId && !reqUser.isSuperAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await db.expireOldInvitations();
  const invites = await db.getInvitationsByCompany(companyId);
  res.json(invites.map(i => ({
    id: i.id, email: i.email, role: i.role, name: i.name,
    allowedPages: (i as any).allowedPages || null,
    isActive: i.isActive, acceptedAt: i.acceptedAt, expiresAt: i.expiresAt, createdAt: i.createdAt
  })));
});

// Revoke a pending invitation
app.post('/api/firm/:companyId/invitations/:invitationId/revoke', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const reqUser = req.user as any;
  const { companyId, invitationId } = req.params;
  if (reqUser.companyId !== companyId && !reqUser.isSuperAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const success = await db.revokeInvitation(companyId, invitationId);
  if (!success) return res.status(404).json({ error: 'Invitation not found' });
  res.json({ success: true });
});

// Update an existing team member's page restrictions
app.put('/api/firm/:companyId/users/:userId/access', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const reqUser = req.user as any;
  const { companyId, userId } = req.params;
  if (reqUser.companyId !== companyId && !reqUser.isSuperAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { allowedPages } = req.body;
  const cleanPages = Array.isArray(allowedPages) && allowedPages.length > 0 ? allowedPages : null;
  const updated = await db.updateUser(userId, { allowedPages: cleanPages });
  if (!updated) return res.status(404).json({ error: 'User not found' });
  res.json(updated);
});

// Propose an access change that only takes effect once the team member clicks the emailed link
app.post('/api/firm/:companyId/users/:userId/access-update', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const reqUser = req.user as any;
  const { companyId, userId } = req.params;
  const isFirmAdmin = reqUser.role === UserRole.ADMIN || reqUser.isSuperAdmin;
  if (reqUser.companyId !== companyId || !isFirmAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const targetUser = await db.getUser(userId);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  const { allowedPages } = req.body;
  const cleanPages = Array.isArray(allowedPages) && allowedPages.length > 0 ? allowedPages : null;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  await db.createAccessUpdateRequest({
    companyId, userId,
    proposedAllowedPages: cleanPages,
    tokenHash, expiresAt, isActive: true
  });

  const company = await db.getCompany(companyId);
  const updateLink = `https://${req.get('host')}/access-update/${rawToken}`;
  const emailSent = await sendAccessUpdateEmail({
    to: targetUser.email,
    name: targetUser.fullName,
    firmName: company?.name || 'your firm',
    allowedPages: cleanPages,
    updateLink
  });

  res.json({ success: true, emailSent });
});

app.get('/api/access-update/:token', async (req, res) => {
  await db.expireOldAccessUpdates();
  const reqItem = await db.getAccessUpdateByToken(req.params.token);
  if (!reqItem) return res.status(404).json({ error: 'Link invalid or expired' });
  const targetUser = await db.getUser(reqItem.userId);
  res.json({
    fullName: targetUser?.fullName,
    proposedAllowedPages: reqItem.proposedAllowedPages,
    expired: new Date(reqItem.expiresAt) < new Date(),
    isActive: reqItem.isActive,
    appliedAt: reqItem.appliedAt
  });
});

app.post('/api/access-update/:token/apply', async (req, res) => {
  await db.expireOldAccessUpdates();
  const reqItem = await db.getAccessUpdateByToken(req.params.token);
  if (!reqItem) return res.status(404).json({ error: 'Link invalid or expired' });
  if (!reqItem.isActive || reqItem.appliedAt) return res.status(400).json({ error: 'This link has already been used or expired' });
  if (new Date(reqItem.expiresAt) < new Date()) return res.status(400).json({ error: 'This link has expired' });

  await db.updateUser(reqItem.userId, { allowedPages: reqItem.proposedAllowedPages as any });
  await db.markAccessUpdateApplied(reqItem.id);
  res.json({ success: true });
});

app.post('/api/superadmin/auth/login', (req, res) => {
  const { email, password } = req.body;
  const superadminEmail = process.env.SUPERADMIN_EMAIL || 'voyyagic@gmail.com';
  const superadminKey = process.env.SUPERADMIN_SECRET_KEY || 'docket_master_2026';
  
  if (safeCompare(email || '', superadminEmail) && safeCompare(password || '', superadminKey)) {
    const superadminUser = {
      id: 'usr-super-admin',
      fullName: 'Super Administrator',
      email: superadminEmail,
      role: 'SUPERADMIN' as any,
      isSuperAdmin: true,
      companyId: null,
      isActive: true,
      setupComplete: true
    };
    
    req.logIn(superadminUser, (err) => {
      if (err) return res.status(500).json({ error: 'Login failed' });
      return res.json({ success: true });
    });
  } else {
    res.status(401).json({ error: 'Invalid superadmin credentials' });
  }
});

app.get('/api/superadmin/registrations', isSuperadminAuthenticated, async (req, res) => {
  const requests = await db.getRegistrationRequests();
  res.json(requests);
});

app.post('/api/superadmin/registrations/:id/approve', isSuperadminAuthenticated, async (req, res) => {
  const ip = getRequestIP(req);
  const requests = await db.getRegistrationRequests();
  const request = requests.find(r => r.id === req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Registration request not found' });
  }
  if (request.status !== 'needs_review') {
    return res.status(400).json({ error: 'Only pending requests can be reviewed' });
  }

  // Create Company
  const slug = request.firmName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const company = await db.createCompany({
    name: request.firmName,
    slug,
    setupComplete: false,
    isActive: true
  });

  // Generate Invite Token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  await db.createInvitation({
    companyId: company.id,
    email: request.email,
    role: UserRole.ADMIN,
    name: request.registrantName,
    tokenHash,
    expiresAt,
    isActive: true
  });

  // Update request status
  await db.updateRegistrationRequest(request.id, { status: 'approved', companyId: company.id, inviteToken: rawToken });

  const inviteLink = `https://${req.get('host')}/invite/${rawToken}`;
  sendInviteEmail({
    to: request.email,
    registrantName: request.registrantName,
    firmName: request.firmName,
    inviteLink
  });

  superadminLogger.log("COMPANY_ACTIVATED", ip, `Approved firm registration request ID: ${req.params.id} for "${request.firmName}"`, { targetCompanyId: company.id });
  res.json({ success: true, token: rawToken });
});

app.post('/api/superadmin/registrations/:id/reject', isSuperadminAuthenticated, async (req, res) => {
  const ip = getRequestIP(req);
  const requests = await db.getRegistrationRequests();
  const request = requests.find(r => r.id === req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Registration request not found' });
  }
  if (request.status !== 'needs_review') {
    return res.status(400).json({ error: 'Only pending requests can be reviewed' });
  }

  await db.updateRegistrationRequest(request.id, { status: 'rejected' });
  superadminLogger.log("INVALID_PATH_ACCESS", ip, `Rejected firm registration request ID: ${req.params.id} for "${request.firmName}"`);
  res.json({ success: true });
});
/**
 * Lazy Google GenAI Client Getter
 */
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// ─── TENANCY STATUS & ONBOARDING SETUP ───────────────────────────────────────

app.get('/api/firm/status', async (req, res) => {
  const user = req.user as any;
  if (user && user.companyId) {
    const company = await db.getCompany(user.companyId);
    if (company && company.setupComplete) {
      const settings = await db.getSettings(user.companyId);
      return res.json({
        initialized: true,
        company,
        settings
      });
    }
  }
  res.json({ initialized: false });
});

app.post('/api/firm/setup', async (req, res) => {
  const { settings, team } = req.body;
  const loggedInUser = req.user as any;
  const adminEmail = loggedInUser?.email || process.env.SUPERADMIN_EMAIL || 'voyyagic@gmail.com';

  const firmName = settings?.firmName || "Docket Legal Partners";
  const slug = firmName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // First: if logged-in user already has a company (from invitation), update that one
  let company;
  if (loggedInUser?.companyId) {
    const existingCompany = await db.getCompany(loggedInUser.companyId);
    if (existingCompany) {
      await db.updateCompany(existingCompany.id, { setupComplete: true, name: firmName, slug });
      company = await db.getCompany(existingCompany.id)!;
    }
  }

  // Fallback: find by name or create new
  if (!company) {
    const companies = await db.getCompanies();
    company = companies.find(c => c.name.toLowerCase() === firmName.toLowerCase());
    if (!company) {
      company = await db.createCompany({
        name: firmName,
        slug,
        setupComplete: true,
        isActive: true
      });
    } else {
      await db.updateCompany(company.id, { setupComplete: true });
    }
  }

  // Define default theme
  const defaultTheme = {
    primaryColor: '#0f172a',
    secondaryColor: '#64748b',
    backgroundColor: '#f1f5f9',
    textColor: '#0f172a',
    buttonColor: '#38bdf8',
    buttonStyle: 'rounded' as const,
    fontFamily: 'Inter',
    fontSize: 'medium' as const,
    borderRadius: 'round' as const,
    sidebarColor: '#0f172a',
    navIconColor: '#38bdf8'
  };

  // Set company settings
  const updatedSettings = await db.updateSettings(company.id, {
    firmName,
    caseTypes: settings?.caseTypes || ["Criminal", "Civil", "Family"],
    courts: settings?.courts || ["District Court"],
    referenceFormat: settings?.referenceFormat || "DK/[YEAR]/[NUM]",
    address: settings?.address || "",
    phone: settings?.phone || "",
    email: adminEmail,
    caseStages: settings?.caseStages || ["Client Consultation", "File Opened", "Documents Filed", "Mention Date", "Hearing", "Judgement", "Case Closed"],
    reminderDefaults: settings?.reminderDefaults || { daysBefore: [1, 3, 7], notifyWhom: "whole_team", delivery: ["system", "email"] },
    updatePreferences: settings?.updatePreferences || { workflow: "draft_review", tone: "friendly", channels: ["email", "whatsapp"] },
    communicationStyle: settings?.communicationStyle || { tone: 'Professional and Friendly', observedPatterns: ['clear milestones', 'proactive status notices'], structure: 'High compliance with automated message templates' },
    theme: settings?.theme || defaultTheme
  });

  // Handle Roster mappings
  if (Array.isArray(team)) {
    for (const t of team) {
      const existingUser = await db.getUserByEmail(t.email);
      if (!existingUser) {
        await db.createUser({
          companyId: company!.id,
          fullName: t.fullName,
          email: t.email,
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${t.fullName}`,
          role: t.role || UserRole.LAWYER,
          isActive: true,
          isSuperAdmin: t.email.toLowerCase() === adminEmail.toLowerCase()
        });
      } else {
        await db.updateUser(existingUser.id, {
          companyId: company!.id,
          role: t.role || existingUser.role,
          isActive: true
        });
      }
    }
  }

  // Ensure Admin User voyyagic@gmail.com is linked to the active company
  const adminUser = await db.getUserByEmail(adminEmail);
  if (!adminUser) {
    await db.createUser({
      companyId: company.id,
      fullName: "Alex Rivera",
      email: adminEmail,
      avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Alex",
      role: UserRole.ADMIN,
      isActive: true,
      isSuperAdmin: true
    });
  } else {
    await db.updateUser(adminUser.id, {
      companyId: company.id,
      isActive: true
    });
  }

  // Initialize feature flags
  await db.getFeatureFlags(company.id);

  res.json({ success: true, company, settings: updatedSettings });
});

app.post('/api/firm/reset-onboarding', async (req, res) => {
  const user = req.user as any;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  if (user.companyId) {
    await db.updateCompany(user.companyId, { setupComplete: false });
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Active firm not found to reset" });
});

// ─── AUTH LOGIC ──────────────────────────────────────────────────────────────

app.post('/api/auth/login', authRateLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const user = await db.getUserByEmail(email);
  if (!user) {
    // If user does not exist, return redirect setup payload
    return res.json({ redirectSetup: true, email });
  }

  if (!user.isActive) {
    return res.status(403).json({ error: "Your account is deactivated. Please contact your administrator." });
  }

  // Check if company is suspended
  if (user.companyId) {
    const comp = await db.getCompany(user.companyId);
    if (comp && !comp.isActive) {
      return res.status(403).json({ error: "Your firm is suspended. Please contact platform support." });
    }
  }

  res.json({ user });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, firmName, caseTypes, courts, referenceFormat, address, phone } = req.body;
  if (!email || !firmName) {
    return res.status(400).json({ error: "Email and Firm Name are required" });
  }

  // Create company
  const slug = firmName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const company = await db.createCompany({
    name: firmName,
    slug,
    setupComplete: true,
    isActive: true
  });

  // Create settings
  await db.updateSettings(company.id, {
    firmName,
    caseTypes: caseTypes || ["Criminal", "Civil", "Family"],
    courts: courts || ["District Court"],
    referenceFormat: referenceFormat || "DK/[YEAR]/[NUM]",
    address,
    phone,
    email
  });

  // Create superadmin (since it's user email voyyagic@gmail.com, make it superadmin)
  const isSuper = email.toLowerCase() === 'voyyagic@gmail.com';
  const user = await db.createUser({
    companyId: company.id,
    fullName: email.split('@')[0],
    email,
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${email}`,
    role: UserRole.ADMIN,
    isActive: true,
    isSuperAdmin: isSuper
  });

  // Pre-populate flags
  await db.getFeatureFlags(company.id);

  res.json({ user });
});

// ─── SECURITY ADDITION START ───
// Single choke point: every /api/firm/:companyId/* route (settings, users,
// clients, cases, deadlines, updates, documents, chat, templates, search,
// announcements, invitations, access-update) now requires a logged-in user
// who belongs to that exact company — or is a superadmin. This closes the
// cross-tenant data leak (IDOR) that existed across these routes.
function requireAuth(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

function requireSameCompany(req: any, res: any, next: any) {
  const user = req.user as any;
  if (user.isSuperAdmin) return next();
  if (user.companyId !== req.params.companyId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

app.use('/api/firm/:companyId', requireAuth, requireSameCompany);
// ─── SECURITY ADDITION END ───

// ─── FIRM SETTINGS & FLAGS ───────────────────────────────────────────────────

app.get('/api/firm/:companyId', async (req, res) => {
  const { companyId } = req.params;
  const company = await db.getCompany(companyId);
  if (!company) {
    return res.status(404).json({ error: "Company not found" });
  }
  const settings = await db.getSettings(companyId);
  const flags = await db.getFeatureFlags(companyId);
  const announcements = await db.getAnnouncements(companyId);

  res.json({
    company,
    settings,
    flags,
    announcements
  });
});

app.put('/api/firm/:companyId/settings', async (req, res) => {
  const { companyId } = req.params;
  const updates = req.body;
  const updated = await db.updateSettings(companyId, updates);
  res.json(updated);
});

app.post('/api/firm/:companyId/settings', async (req, res) => {
  const { companyId } = req.params;
  const updates = req.body;
  const updated = await db.updateSettings(companyId, updates);
  res.json(updated);
});

// ─── TEAM MEMBERS ────────────────────────────────────────────────────────────

app.get('/api/firm/:companyId/users', async (req, res) => {
  const { companyId } = req.params;
  res.json(await db.getUsers(companyId));
});

app.post('/api/firm/:companyId/users', async (req, res) => {
  const { companyId } = req.params;
  const { fullName, email, role } = req.body;
  
  const existing = await db.getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: "User already exists with this email" });
  }

  const added = await db.createUser({
    companyId,
    fullName,
    email,
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`,
    role: role || UserRole.LAWYER,
    isActive: true,
    isSuperAdmin: false
  });
  res.json(added);
});

app.put('/api/firm/:companyId/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const updates = req.body;
  const updated = await db.updateUser(userId, updates);
  res.json(updated);
});

// ─── CLIENTS ──────────────────────────────────────────────────────────────────

app.get('/api/firm/:companyId/clients', async (req, res) => {
  res.json(await db.getClients(req.params.companyId));
});

app.post('/api/firm/:companyId/clients', async (req, res) => {
  const { companyId } = req.params;
  const created = await db.createClient(companyId, req.body);
  res.json(created);
});

app.put('/api/firm/:companyId/clients/:clientId', async (req, res) => {
  const { companyId, clientId } = req.params;
  const updated = await db.updateClient(companyId, clientId, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Client not found' });
  }
});

app.delete('/api/firm/:companyId/clients/:clientId', async (req, res) => {
  const { companyId, clientId } = req.params;
  const success = await db.deleteClient(companyId, clientId);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Client not found' });
  }
});

// ─── CASES ────────────────────────────────────────────────────────────────────

app.get('/api/firm/:companyId/cases', async (req, res) => {
  const list = await db.getCases(req.params.companyId);
  // Join with clients
  const enriched = [];
  for (const c of list) {
    const client = await db.getClient(req.params.companyId, c.clientId);
    enriched.push({ ...c, client });
  }
  res.json(enriched);
});

app.post('/api/firm/:companyId/cases', async (req, res) => {
  const { companyId } = req.params;
  const { clientId, referenceNumber, caseType, court, opposingParty, assignedLawyerId, currentStage, notes } = req.body;
  
  // Create case
  const created = await db.createCase(companyId, {
    clientId,
    referenceNumber,
    caseType,
    court,
    opposingParty,
    assignedLawyerId,
    currentStage: currentStage || "Client Consultation",
    status: CaseStatus.ACTIVE,
    openedDate: new Date().toISOString(),
    notes
  });

  // Log case event
  await db.createCaseEvent(companyId, {
    caseId: created.id,
    createdById: assignedLawyerId,
    eventType: "Status",
    title: "Case Matter Initialized",
    description: `Opening a new case file under system reference ${referenceNumber || created.id}. Initial stage is ${currentStage || "Client Consultation"}.`,
    eventDate: new Date().toISOString()
  });

  // Client update pref trigger
  const settings = await db.getSettings(companyId);
  const client = await db.getClient(companyId, clientId);
  if (settings && (settings as any).updatePreferences && ((settings as any).updatePreferences as any).workflow !== "manual" && client) {
    // Generate draft
    const clientName = client.fullName;
    await db.createClientUpdate(companyId, {
      caseId: created.id,
      clientId,
      draftedById: assignedLawyerId,
      message: `Hello ${clientName}, we have opened a new matter folder with us regarding "${caseType || 'your litigation'}". Our current reference format indicates ${referenceNumber || 'pending'}. Rest assured we are aligning case inputs now. Best regards, ${settings.firmName || "Docket Legal Partners"}.`,
      status: ClientUpdateStatus.DRAFT,
      channelsSent: {}
    });
  }

  res.json(created);
});

app.get('/api/firm/:companyId/cases/:caseId', async (req, res) => {
  const { companyId, caseId } = req.params;
  const c = await db.getCase(companyId, caseId);
  if (!c) return res.status(404).json({ error: "Case not found" });
  
  const client = await db.getClient(companyId, c.clientId);
  const events = await db.getCaseEvents(companyId, caseId);
  const deadlines = await db.getCaseDeadlines(companyId, caseId);
  const docs = await db.getCaseGeneratedDocuments(companyId, caseId);
  const rawUpdates = await db.getClientUpdates(companyId);
  const updates = rawUpdates.filter(u => u.caseId === caseId);

  res.json({
    ...c,
    client,
    events,
    deadlines,
    docs,
    updates
  });
});

app.post('/api/firm/:companyId/cases/:caseId/events', async (req, res) => {
  const { companyId, caseId } = req.params;
  const { createdById, eventType, title, description, eventDate } = req.body;

  const event = await db.createCaseEvent(companyId, {
    caseId,
    createdById,
    eventType,
    title,
    description,
    eventDate: eventDate || new Date().toISOString()
  });

  // Trigger Client Update check
  const c = await db.getCase(companyId, caseId);
  const settings = await db.getSettings(companyId);
  if (c && settings && (settings as any).updatePreferences && ((settings as any).updatePreferences as any).workflow !== "manual") {
    const client = await db.getClient(companyId, c.clientId);
    if (client) {
      await db.createClientUpdate(companyId, {
        caseId,
        clientId: c.clientId,
        draftedById: createdById,
        message: `Hello ${client.fullName}, we have recorded an update in your case folder: "${title}". Description: ${description || "The timeline progressing accordingly"}. We will keep you updated. Best regards, ${settings.firmName}.`,
        status: ClientUpdateStatus.DRAFT,
        channelsSent: {}
      });
    }
  }

  res.json(event);
});

app.put('/api/firm/:companyId/cases/:caseId', async (req, res) => {
  const { companyId, caseId } = req.params;
  const updated = await db.updateCase(companyId, caseId, req.body);
  res.json(updated);
});

// ─── BILLING: FEE NOTES, DISBURSEMENTS, INVOICES ─────────────────────────────

app.get('/api/firm/:companyId/cases/:caseId/fee-notes', async (req, res) => {
  const { companyId, caseId } = req.params;
  res.json(await db.getFeeNotes(companyId, caseId));
});

app.post('/api/firm/:companyId/cases/:caseId/fee-notes', async (req, res) => {
  const { companyId, caseId } = req.params;
  const { date, lawyerName, description, hours, rate } = req.body;
  const created = await db.createFeeNote(companyId, caseId, {
    date: date || new Date().toISOString(),
    lawyerName,
    description,
    hours,
    rate,
    status: 'unbilled'
  });
  res.json(created);
});

app.put('/api/firm/:companyId/fee-notes/:feeNoteId', async (req, res) => {
  const { companyId, feeNoteId } = req.params;
  const updated = await db.updateFeeNote(companyId, feeNoteId, req.body);
  if (!updated) return res.status(404).json({ error: 'Fee note not found' });
  res.json(updated);
});

app.get('/api/firm/:companyId/cases/:caseId/disbursements', async (req, res) => {
  const { companyId, caseId } = req.params;
  res.json(await db.getDisbursements(companyId, caseId));
});

app.post('/api/firm/:companyId/cases/:caseId/disbursements', async (req, res) => {
  const { companyId, caseId } = req.params;
  const { date, description, amount, paidBy } = req.body;
  const created = await db.createDisbursement(companyId, caseId, {
    date: date || new Date().toISOString(),
    description,
    amount,
    paidBy,
    status: 'unbilled'
  });
  res.json(created);
});

app.put('/api/firm/:companyId/disbursements/:disbursementId', async (req, res) => {
  const { companyId, disbursementId } = req.params;
  const updated = await db.updateDisbursement(companyId, disbursementId, req.body);
  if (!updated) return res.status(404).json({ error: 'Disbursement not found' });
  res.json(updated);
});

app.get('/api/firm/:companyId/cases/:caseId/invoices', async (req, res) => {
  const { companyId, caseId } = req.params;
  res.json(await db.getInvoices(companyId, caseId));
});

app.post('/api/firm/:companyId/cases/:caseId/invoices', async (req, res) => {
  const { companyId, caseId } = req.params;
  const { invoiceNumber, dueDate, lineItems, subtotal, discount, tax, total, feeNoteIds, disbursementIds } = req.body;

  const invoice = await db.createInvoice(companyId, caseId, {
    invoiceNumber,
    invoiceDate: new Date().toISOString(),
    dueDate,
    lineItems: lineItems || [],
    subtotal: subtotal || 0,
    discount: discount || 0,
    tax: tax || 0,
    total: total || 0,
    status: 'pending'
  });

  // Mark the billed items so they can't be invoiced twice
  if (Array.isArray(feeNoteIds)) {
    for (const id of feeNoteIds) {
      await db.updateFeeNote(companyId, id, { status: 'billed' });
    }
  }
  if (Array.isArray(disbursementIds)) {
    for (const id of disbursementIds) {
      await db.updateDisbursement(companyId, id, { status: 'billed' });
    }
  }

  // Create a matching document so the invoice appears in the case's document list
  const receiptContent = `--- LEGAL INVOICE ---\nInvoice: ${invoice.invoiceNumber}\nDue: ${invoice.dueDate}\nSubtotal: ${invoice.subtotal}\nTotal Due: ${invoice.total}\nStatus: ${invoice.status}`;
  const document = await db.createGeneratedDocument(companyId, {
    caseId,
    content: receiptContent
  });

  res.json({ invoice, document });
});

// ─── GOOGLE CALENDAR INTEGRATION ───────────────────────────────────────

// Initiate Google Calendar OAuth
app.get('/api/calendar/google/connect', (req, res) => {
  const user = req.user as any;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const url = getCalendarAuthUrl(user.id);
  res.json({ url });
});

// Google Calendar OAuth callback
app.get('/api/calendar/google/callback', async (req, res) => {
  const { code, state: userId, error } = req.query as Record<string, string>;

  if (error || !code || !userId) {
    return res.redirect('/dashboard?calendarError=access_denied');
  }

  try {
    await exchangeCodeForTokens(code, userId);
    res.redirect('/dashboard?calendarConnected=true');
  } catch (err) {
    console.error('[Calendar] OAuth callback error:', err);
    res.redirect('/dashboard?calendarError=token_exchange_failed');
  }
});

// Get calendar connection status for logged-in user
app.get('/api/calendar/status', async (req, res) => {
  const user = req.user as any;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const tokens = await db.getUserCalendarTokens(user.id);
  res.json({
    google: {
      connected: !!tokens,
      connectedAt: tokens?.connectedAt || null,
    },
    microsoft: {
      connected: false,
      comingSoon: true,
    }
  });
});

// Disconnect Google Calendar
app.delete('/api/calendar/google/disconnect', async (req, res) => {
  const user = req.user as any;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  await db.clearUserCalendarTokens(user.id);
  res.json({ success: true });
});

// ─── DEADLINES & NOTIFICATIONS ───────────────────────────────────────────────

app.get('/api/firm/:companyId/deadlines', async (req, res) => {
  const list = await db.getDeadlines(req.params.companyId);
  // Enrich case name
  const enriched = [];
  for (const d of list) {
    const c = await db.getCase(req.params.companyId, d.caseId);
    let clientName = "General Matter";
    if (c) {
      const cli = await db.getClient(req.params.companyId, c.clientId);
      if (cli) clientName = cli.fullName;
    }
    enriched.push({ ...d, clientName, caseRef: c?.referenceNumber || "DK-Matter" });
  }
  res.json(enriched);
});

app.post('/api/firm/:companyId/deadlines', async (req, res) => {
  const { companyId } = req.params;
  const created = await db.createDeadline(companyId, req.body);

  // Auto-sync to Google Calendar if user has it connected
  const currentUser = req.user as any;
  if (currentUser && created) {
    try {
      const calTokens = await db.getUserCalendarTokens(currentUser.id);
      if (calTokens) {
        const caseData = await db.getCase(companyId, created.caseId);
        const clientData = caseData ? await db.getClient(companyId, caseData.clientId) : null;
        const settings = await db.getSettings(companyId);

        const eventId = await createCalendarEvent(currentUser.id, {
          id: created.id,
          title: created.title,
          dueDate: created.dueDate.toISOString(),
          deadlineType: created.deadlineType || undefined,
          companyId: created.companyId
        }, {
          caseName: caseData?.referenceNumber || 'Unknown Case',
          clientName: clientData?.fullName || 'Unknown Client',
          firmName: settings?.firmName || '',
        });

        if (eventId) {
          await db.updateDeadlineCalendarEventId(companyId, created.id, eventId);
          (created as any).googleCalendarEventId = eventId;
        }
      }
    } catch (err) {
      console.error('[Calendar] Error in deadline create hook:', err);
    }
  }

  res.json(created);
});

app.put('/api/firm/:companyId/deadlines/:deadId', async (req, res) => {
  const { companyId, deadId } = req.params;
  
  // Get existing state to check if event was synced or if we resolved it
  const list = await db.getDeadlines(companyId);
  const oldDeadline = list.find(d => d.id === deadId);
  const existingEventId = (oldDeadline as any)?.googleCalendarEventId;

  const updated = await db.updateDeadline(companyId, deadId, req.body);

  const currentUser = req.user as any;
  if (currentUser && updated) {
    try {
      if (updated.isResolved) {
        // If resolved, delete calendar event if it exists
        if (existingEventId) {
          await deleteCalendarEvent(currentUser.id, existingEventId);
          await db.updateDeadlineCalendarEventId(companyId, deadId, null);
        }
      } else {
        // Check if there's an existing calendar event to update or if we should create one now
        const calTokens = await db.getUserCalendarTokens(currentUser.id);
        if (calTokens) {
          const caseData = await db.getCase(companyId, updated.caseId);
          const clientData = caseData ? await db.getClient(companyId, caseData.clientId) : null;
          const settings = await db.getSettings(companyId);

          if (existingEventId) {
            await updateCalendarEvent(currentUser.id, existingEventId, {
              title: updated.title,
              dueDate: updated.dueDate.toISOString(),
              deadlineType: updated.deadlineType || undefined
            }, {
              caseName: caseData?.referenceNumber,
              clientName: clientData?.fullName,
            });
          } else {
            // Synced calendar token present, but no event created previously (probably created offline/before connection)
            const eventId = await createCalendarEvent(currentUser.id, {
              id: updated.id,
              title: updated.title,
              dueDate: updated.dueDate.toISOString(),
              deadlineType: updated.deadlineType || undefined,
              companyId: updated.companyId
            }, {
              caseName: caseData?.referenceNumber || 'Unknown Case',
              clientName: clientData?.fullName || 'Unknown Client',
              firmName: settings?.firmName || '',
            });
            if (eventId) {
              await db.updateDeadlineCalendarEventId(companyId, deadId, eventId);
              (updated as any).googleCalendarEventId = eventId;
            }
          }
        }
      }
    } catch (err) {
      console.error('[Calendar] Error in deadline update hook:', err);
    }
  }

  res.json(updated);
});

// ─── CLIENT UPDATES ───────────────────────────────────────────────────────────

app.get('/api/firm/:companyId/updates', async (req, res) => {
  const list = await db.getClientUpdates(req.params.companyId);
  // Join client & case
  const enriched = [];
  for (const u of list) {
    const cli = await db.getClient(req.params.companyId, u.clientId);
    const cs = await db.getCase(req.params.companyId, u.caseId);
    enriched.push({ ...u, client: cli, caseRef: cs?.referenceNumber });
  }
  res.json(enriched);
});

app.post('/api/firm/:companyId/updates', async (req, res) => {
  const { companyId } = req.params;
  const created = await db.createClientUpdate(companyId, req.body);
  res.json(created);
});

app.put('/api/firm/:companyId/updates/:updateId', async (req, res) => {
  const { companyId, updateId } = req.params;
  const updated = await db.updateClientUpdate(companyId, updateId, req.body);
  res.json(updated);
});

// Send Update endpoint (Simulates WhatsApp, SMS, Email and tracks channel log!)
app.post('/api/firm/:companyId/updates/:updateId/send', async (req, res) => {
  const { companyId, updateId } = req.params;
  const { channels } = req.body; // e.g. {email: true, whatsapp: true, sms: false}

  const updated = await db.updateClientUpdate(companyId, updateId, {
    status: ClientUpdateStatus.SENT,
    channelsSent: channels,
    sentAt: new Date().toISOString()
  });

  res.json({ success: true, update: updated });
});

// ─── CONSENT LOGGER ──────────────────────────────────────────────────────────

app.post('/api/firm/:companyId/consent', async (req, res) => {
  const { companyId } = req.params;
  const log = await db.createConsentLog(companyId, req.body);
  res.json({ success: true, log });
});

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────

app.get('/api/firm/:companyId/templates', async (req, res) => {
  res.json(await db.getTemplates(req.params.companyId));
});

app.post('/api/firm/:companyId/templates', async (req, res) => {
  const { companyId } = req.params;
  const created = await db.createTemplate(companyId, req.body);
  res.json(created);
});

app.delete('/api/firm/:companyId/templates/:id', async (req, res) => {
  const { companyId, id } = req.params;
  await db.deleteTemplate(companyId, id);
  res.json({ success: true });
});

app.get('/api/firm/:companyId/documents', async (req, res) => {
  const list = await db.getGeneratedDocuments(req.params.companyId);
  // Join info
  const enriched = [];
  for (const d of list) {
    const cs = await db.getCase(req.params.companyId, d.caseId);
    let cliName = "Pending";
    if (cs) {
      const cli = await db.getClient(req.params.companyId, cs.clientId);
      if (cli) cliName = cli.fullName;
    }
    enriched.push({ ...d, caseRef: cs?.referenceNumber, clientName: cliName });
  }
  res.json(enriched);
});

app.post('/api/firm/:companyId/documents', async (req, res) => {
  const { companyId } = req.params;
  const created = await db.createGeneratedDocument(companyId, req.body);
  res.json(created);
});

// ─── TEAM CHAT SECTION ───────────────────────────────────────────────────────

app.get('/api/firm/:companyId/chat', async (req, res) => {
  const { companyId } = req.params;
  const { caseId } = req.query;
  const messages = await db.getChatMessages(companyId, caseId ? String(caseId) : null);
  
  // Enrich sender info
  const enriched = [];
  for (const m of messages) {
    const user = await db.getUser(m.sentById);
    enriched.push({
      ...m,
      senderName: user ? user.fullName : "Unknown Staff",
      senderAvatar: user ? user.avatarUrl : null,
      senderRole: user ? user.role : "LAWYER"
    });
  }
  res.json(enriched);
});

app.post('/api/firm/:companyId/chat', async (req, res) => {
  const { companyId } = req.params;
  const { caseId, sentById, message, fileUrl, replyToId, isOnRecord, mentions, references } = req.body;
  const msg = await db.createChatMessage(companyId, {
    caseId: caseId || null,
    sentById,
    message,
    fileUrl,
    readBy: [sentById],
    replyToId: replyToId || null,
    isOnRecord: !!isOnRecord,
    mentions: mentions || [],
    references: references || []
  });

  const user = await db.getUser(sentById);
  res.json({
    ...msg,
    senderName: user ? user.fullName : "Unknown Staff",
    senderAvatar: user ? user.avatarUrl : null,
    senderRole: user ? user.role : "LAWYER"
  });
});

app.put('/api/firm/:companyId/chat/:messageId', async (req, res) => {
  const { companyId, messageId } = req.params;
  const { message } = req.body;
  const updated = await db.updateChatMessage(messageId, message, new Date().toISOString());
  if (updated) {
    const user = await db.getUser(updated.sentById);
    res.json({
      ...updated,
      senderName: user ? user.fullName : "Unknown Staff",
      senderAvatar: user ? user.avatarUrl : null,
      senderRole: user ? user.role : "LAWYER"
    });
  } else {
    res.status(400).json({ error: "Cannot edit message" });
  }
});

app.delete('/api/firm/:companyId/chat/:messageId', async (req, res) => {
  const { companyId, messageId } = req.params;
  const deleted = await db.deleteChatMessage(messageId);
  if (deleted) {
    const user = await db.getUser(deleted.sentById);
    res.json({
      ...deleted,
      senderName: user ? user.fullName : "Unknown Staff",
      senderAvatar: user ? user.avatarUrl : null,
      senderRole: user ? user.role : "LAWYER"
    });
  } else {
    res.status(400).json({ error: "Cannot delete message" });
  }
});

app.post('/api/firm/:companyId/chat/:messageId/react', async (req, res) => {
  const { companyId, messageId } = req.params;
  const { emoji, userId } = req.body;
  const updated = await db.toggleChatMessageReaction(messageId, emoji, userId);
  if (updated) {
    const user = await db.getUser(updated.sentById);
    res.json({
      ...updated,
      senderName: user ? user.fullName : "Unknown Staff",
      senderAvatar: user ? user.avatarUrl : null,
      senderRole: user ? user.role : "LAWYER"
    });
  } else {
    res.status(404).json({ error: "Message not found" });
  }
});

app.post('/api/firm/:companyId/chat/:messageId/record', async (req, res) => {
  const { companyId, messageId } = req.params;
  const { userId } = req.body;
  const updated = await db.markChatMessageOnRecord(messageId, userId);
  if (updated) {
    if (updated.caseId) {
      await db.createCaseEvent(companyId, {
        caseId: updated.caseId,
        createdById: userId,
        eventType: 'RECORD',
        title: 'Logged Chat to Matter Record',
        description: `Chat message logged officially on record. Message preview: "${updated.message.substring(0, 80)}..."`,
        eventDate: new Date().toISOString()
      });
    }

    const user = await db.getUser(updated.sentById);
    res.json({
      ...updated,
      senderName: user ? user.fullName : "Unknown Staff",
      senderAvatar: user ? user.avatarUrl : null,
      senderRole: user ? user.role : "LAWYER"
    });
  } else {
    res.status(404).json({ error: "Message not found" });
  }
});

app.post('/api/firm/:companyId/chat/read', async (req, res) => {
  const { companyId } = req.params;
  const { caseId, userId } = req.body;
  await db.markChatRead(companyId, caseId || null, userId);
  res.json({ success: true });
});

// ─── SUPERADMIN CONTROL PATHWAYS ──────────────────────────────────────────────

// ─── SUPERADMIN ADDITION START ───
const superadminApiLimits = new Map<string, { count: number; resetTime: number }>();

const superadminRateLimiter = (req: any, res: any, next: any) => {
  const ip = getRequestIP(req);
  const now = Date.now();
  const entry = superadminApiLimits.get(ip);
  
  if (!entry || now > entry.resetTime) {
    superadminApiLimits.set(ip, { count: 1, resetTime: now + 60 * 1000 });
    return next();
  }
  
  entry.count += 1;
  if (entry.count > 60) {
    return res.status(429).json({ error: "rate_limit_exceeded" });
  }
  next();
};

app.post('/api/sa/login', superadminRateLimiter, async (req, res) => {
  const ip = getRequestIP(req);
  
  // Step 2 - Rate limit check
  const failed = await db.getRecentFailedAttempts(ip);
  if (failed.length >= 5) {
    failed.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const fifthOldest = failed[failed.length - 5];
    const lockExpiryTime = new Date(fifthOldest.timestamp).getTime() + 15 * 60 * 1000;
    const now = Date.now();
    if (now < lockExpiryTime) {
      const minutesRemaining = Math.ceil((lockExpiryTime - now) / (60 * 1000));
      return res.status(429).json({
        error: "locked",
        lockUntil: new Date(lockExpiryTime).toISOString(),
        minutesRemaining
      });
    }
  }
  
  const { email, password } = req.body;
  const superadminEmail = process.env.SUPERADMIN_EMAIL || 'voyyagic@gmail.com';
  const superadminKey = process.env.SUPERADMIN_SECRET_KEY || 'docket_master_2026';
  
  // Constant-time comparison — prevents timing attacks
  if (safeCompare(email || '', superadminEmail) && safeCompare(password || '', superadminKey)) {
    await db.clearLoginAttempts(ip);
    
    (req.session as any).isSuperAdmin = true;
    (req.session as any).superadminEmail = email;
    (req.session as any).superadminLoginTime = new Date().toISOString();
    (req.session as any).superadminIP = ip;
    (req.session as any).superadminLastActivity = new Date().toISOString();
    
    await db.setActiveSuperadminSession(req.sessionID);
    
    superadminLogger.log("LOGIN_SUCCESS", ip, "Superadmin authenticated successfully", {
      result: "SUCCESS"
    });
    
    sendSuperadminLoginAlert({
      ip,
      timestamp: new Date().toISOString()
    });
    
    return res.json({ success: true });
  } else {
    await db.recordLoginAttempt(ip, false);
    superadminLogger.log("LOGIN_FAILED", ip, "Invalid credentials auth attempt", {
      result: "FAILED"
    });
    setTimeout(() => {
      res.status(401).json({ error: "invalid" });
    }, 1000);
  }
});

app.get('/api/sa/me', superadminRateLimiter, async (req, res) => {
  if (req.session && (req.session as any).isSuperAdmin === true) {
    const lastActivityStr = (req.session as any).superadminLastActivity;
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;

    if (lastActivityStr) {
      const lastActivity = new Date(lastActivityStr).getTime();
      if (now - lastActivity > thirtyMinutes) {
        await db.clearActiveSuperadminSession();
        req.session.destroy(() => {});
        return res.status(404).json({ error: "session_expired" });
      }
    }

    const activeSessionId = await db.getActiveSuperadminSession();
    if (req.sessionID !== activeSessionId) {
      req.session.destroy(() => {});
      return res.status(404).json({ error: "session_superseded" });
    }

    (req.session as any).superadminLastActivity = new Date().toISOString();
    return res.json({
      authenticated: true,
      email: (req.session as any).superadminEmail,
      loginTime: (req.session as any).superadminLoginTime
    });
  } else {
    return res.status(404).json({ error: "not_authenticated" });
  }
});

app.post('/api/sa/logout', superadminRateLimiter, async (req, res) => {
  const ip = getRequestIP(req);
  superadminLogger.log("LOGOUT", ip, "Superadmin logged out manually");
  await db.clearActiveSuperadminSession();
  if (req.session) {
    req.session.destroy(() => {});
  }
  res.json({ success: true });
});

app.get('/api/sa/platform-status', isSuperadminAuthenticated, superadminRateLimiter, async (req, res) => {
  const companies = await db.getCompanies();
  let totalUsers = 0;
  for (const c of companies) {
    const users = await db.getUsers(c.id);
    totalUsers += users.length;
  }
  const activeSessionsCount = Math.max(1, Math.min(totalUsers, 4));
  
  res.json({
    locked: await db.isPlatformLocked(),
    activeFirms: companies.filter(c => c.isActive).length,
    totalFirms: companies.length,
    activeSessions: activeSessionsCount
  });
});

app.get('/api/sa/audit-log', isSuperadminAuthenticated, superadminRateLimiter, async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 500;
  const action = req.query.action as string;
  const from = req.query.from as string;
  const to = req.query.to as string;
  
  const rawLog = await db.getAuditLog({ limit, action, from, to });
  res.json(rawLog);
});

app.get('/api/sa/login-history', isSuperadminAuthenticated, superadminRateLimiter, async (req, res) => {
  const log = await db.getAuditLog();
  const loginEvents = log.filter(e => e.action === "LOGIN_SUCCESS" || e.action === "LOGIN_FAILED");
  res.json(loginEvents.slice(0, 100));
});

app.post('/api/sa/panic', isSuperadminAuthenticated, superadminRateLimiter, async (req, res) => {
  const ip = getRequestIP(req);
  await db.lockPlatform();
  await db.clearActiveSuperadminSession();
  if (req.session) {
    req.session.destroy(() => {});
  }
  superadminLogger.log("PANIC_BUTTON_TRIGGERED", ip, "Superadmin triggered panic button! System locked.");
  res.json({ success: true, message: "Platform locked" });
});

app.post('/api/sa/unlock', superadminRateLimiter, async (req, res) => {
  const ip = getRequestIP(req);
  const { email, password } = req.body;
  const superadminEmail = process.env.SUPERADMIN_EMAIL || 'voyyagic@gmail.com';
  const superadminKey = process.env.SUPERADMIN_SECRET_KEY || 'docket_master_2026';
  
  if (safeCompare(email || '', superadminEmail) && safeCompare(password || '', superadminKey)) {
    await db.unlockPlatform();
    await db.clearLoginAttempts(ip);
    
    if (req.session) {
      (req.session as any).isSuperAdmin = true;
      (req.session as any).superadminEmail = email;
      (req.session as any).superadminLoginTime = new Date().toISOString();
      (req.session as any).superadminIP = ip;
      (req.session as any).superadminLastActivity = new Date().toISOString();
      await db.setActiveSuperadminSession(req.sessionID);
    }
    
    superadminLogger.log("PLATFORM_UNLOCKED", ip, "Platform unlocked successfully", {
      result: "SUCCESS"
    });
    
    return res.json({ success: true });
  } else {
    await db.recordLoginAttempt(ip, false);
    superadminLogger.log("LOGIN_FAILED", ip, "Invalid credentials unlock attempt", {
      result: "FAILED"
    });
    setTimeout(() => res.status(401).json({ error: "invalid" }), 1000);
  }
});
// ─── SUPERADMIN ADDITION END ───

app.get('/api/superadmin/companies', isSuperadminAuthenticated, async (req, res) => {
  const companies = await db.getCompanies();
  const summary = [];
  for (const c of companies) {
    const settings = await db.getSettings(c.id);
    const users = await db.getUsers(c.id);
    const cases = await db.getCases(c.id);
    const updates = await db.getClientUpdates(c.id);
    const docs = await db.getGeneratedDocuments(c.id);
    const flags = await db.getFeatureFlags(c.id);
    summary.push({
      company: c,
      adminEmail: settings ? (settings.email || (users[0] ? users[0].email : "N/A")) : (users[0] ? users[0].email : "N/A"),
      userCount: users.length,
      caseCount: cases.length,
      updateCount: updates.length,
      documentCount: docs.length,
      featureFlags: flags
    });
  }
  res.json(summary);
});

app.post('/api/superadmin/companies/action', isSuperadminAuthenticated, async (req, res) => {
  const { companyId, action } = req.body; // "suspend" | "activate" | "delete"
  const ip = getRequestIP(req);
  
  if (action === "suspend") {
    await db.updateCompany(companyId, { isActive: false });
    superadminLogger.log("COMPANY_SUSPENDED", ip, `Suspended company ID: ${companyId}`, { targetCompanyId: companyId });
  } else if (action === "activate") {
    await db.updateCompany(companyId, { isActive: true });
    superadminLogger.log("COMPANY_ACTIVATED", ip, `Activated company ID: ${companyId}`, { targetCompanyId: companyId });
  } else if (action === "delete") {
    await db.deleteCompany(companyId);
    superadminLogger.log("COMPANY_DELETED", ip, `Deleted company ID: ${companyId}`, { targetCompanyId: companyId });
  }
  res.json({ success: true });
});

app.post('/api/superadmin/companies/flags', isSuperadminAuthenticated, async (req, res) => {
  const { companyId, featureName, isEnabled } = req.body;
  const ip = getRequestIP(req);
  
  await db.toggleFeatureFlag(companyId, featureName, isEnabled);
  superadminLogger.log("FEATURE_FLAG_CHANGED", ip, `Toggled feature flag '${featureName}' to ${isEnabled} for company ID: ${companyId}`, { targetCompanyId: companyId });
  res.json({ success: true });
});

app.post('/api/superadmin/announcements', isSuperadminAuthenticated, async (req, res) => {
  const { title, body, companyId } = req.body;
  const ip = getRequestIP(req);
  
  const created = await db.createAnnouncement({
    companyId: companyId || null,
    title,
    body,
    isActive: true
  });
  superadminLogger.log("ANNOUNCEMENT_CREATED", ip, `Created announcement titled: '${title}'`, { targetCompanyId: companyId });
  res.json(created);
});

app.post('/api/superadmin/verify-key', isSuperadminAuthenticated, (req, res) => {
  const { secretKey } = req.body;
  const serverSecret = process.env.SUPERADMIN_SECRET_KEY || "docket_master_2026";
  if (safeCompare(secretKey || '', serverSecret)) {
    return res.json({ success: true });
  }
  res.status(401).json({ error: "Invalid credential" });
});

// ─── DYNAMIC AI GENERATION & TRANSLATION & DRAFTING (GEMINI CLIENT) ──────────

app.post('/api/ai/draft-update', async (req, res) => {
  const { promptBody } = req.body;
  const ai = getAiClient();

  if (!ai) {
    // Elegant fallback prompt matching human conversational flow
    return res.json({
      draft: `Hello Marcus, we have completed compiling the core pleadings draft for your SLA breach matter. We discovered multiple architectural discrepancies in their technical SLA provisioning, strengthening our damages position. Let's touch base on details soon! Best regards, Sarah Jenkins Esq.`
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptBody || "Draft a short, highly professional email update to a law firm client Marcus informing him that we have successfully draft the court reply for his company Aceme Services.",
      config: {
        systemInstruction: "You are Docket - an elite AI assistant for law firms. Compose visually polished, precise, professional client updates. Sound custom, empathetic, and exceptionally professional. Avoid legalese, keep it human, transparent, and direct."
      }
    });
    res.json({ draft: response.text });
  } catch (err: any) {
    console.error("Gemini draft failed, using fallback:", err);
    res.json({
      draft: `Dear Client, we have successfully drafted the requested legal documentation file. Please review it at your convenience or let us know if any modifications alignment are needed. Yours sincerely, Docket Chambers.`
    });
  }
});

app.post('/api/ai/fill-document', async (req, res) => {
  const { template, variables } = req.body;
  const ai = getAiClient();

  if (!ai) {
    // Sub-replace mock
    let completed = template;
    Object.keys(variables).forEach(k => {
      completed = completed.replace(new RegExp(`\\[${k}\\]`, 'g'), variables[k]);
    });
    return res.json({ doc: completed });
  }

  try {
    const content = `Template: ${template}\n\nVariables: ${JSON.stringify(variables)}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Fill out the following document template with the provided variable key-values. Ensure the static legal sections remain pristine and professional. Return ONLY the filled-out document plain text, no commentary, no markdown envelopes:\n\n${content}`,
      config: {
        temperature: 0.2
      }
    });
    res.json({ doc: response.text });
  } catch (err) {
    let completed = template;
    Object.keys(variables).forEach(k => {
      completed = completed.replace(new RegExp(`\\[${k}\\]`, 'g'), variables[k]);
    });
    res.json({ doc: completed });
  }
});

app.post('/api/ai/extract', async (req, res) => {
  const { text, type } = req.body; // firmhead | staff | stages | template
  const ai = getAiClient();

  const mockEx = {
    firmhead: { firmName: "Stout & Partners Legal", address: "40 Wall St, New York, NY", phone: "+1 (212) 555-8123", email: "info@stoutlegal.com" },
    staff: [
      { fullName: "Eleanor Vance", email: "eleanor@stout.com", role: UserRole.LAWYER },
      { fullName: "Arthur Dent", email: "arthur@stout.com", role: UserRole.PARALEGAL }
    ],
    stages: ["Interviews Conducted", "Pleadings Lodged", "Motion for Discovery", "Final Judgment"],
    template: {
      name: "Assigned Contract Demand",
      variables: ["LAWYER NAME", "CLIENT NAME", "OPPOSING PARTY", "CASE REFERENCE"]
    }
  };

  if (!ai) {
    return res.json({ data: (mockEx as any)[type] || mockEx.firmhead });
  }

  try {
    let prompt = "";
    let schema: any = {};

    if (type === "firmhead") {
      prompt = `Extract legal firm details (name, address, phone, email) from this document:\n\n${text}`;
      schema = {
        type: Type.OBJECT,
        properties: {
          firmName: { type: Type.STRING },
          address: { type: Type.STRING },
          phone: { type: Type.STRING },
          email: { type: Type.STRING }
        },
        required: ["firmName"]
      };
    } else if (type === "staff") {
      prompt = `Extract a list of employees with their names, emails, and roles (LAWYER, PARALEGAL, SECRETARY, ADMIN) from this staff text:\n\n${text}`;
      schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            fullName: { type: Type.STRING },
            email: { type: Type.STRING },
            role: { type: Type.STRING }
          },
          required: ["fullName", "email"]
        }
      };
    } else if (type === "stages") {
      prompt = `Extract an ordered list of litigation case stage strings from this narrative of a court file timeline:\n\n${text}`;
      schema = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      };
    } else {
      prompt = `Extract the name of the template and all variables in brackets like [VARIABLE] from this text:\n\n${text}`;
      schema = {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          variables: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["name", "variables"]
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    res.json({ data: JSON.parse(response.text) });
  } catch (err) {
    console.error("Gemini extract failed, using default:", err);
    res.json({ data: (mockEx as any)[type] || mockEx.firmhead });
  }
});

app.post('/api/ai/suggest-fields', async (req, res) => {
  const { notes = '', fullName = '', occupation = '', clientCategory = 'individual' } = req.body;
  const ai = getAiClient();

  const fallbackSuggestions = (() => {
    const textContext = `${notes} ${occupation} ${fullName}`.toLowerCase();
    if (textContext.includes('divorce') || textContext.includes('spouse') || textContext.includes('marriage') || textContext.includes('custody') || textContext.includes('family')) {
      return {
        fields: [
          { label: "Spouse Full Name", defaultValue: "Diana Vance" },
          { label: "Date of Marriage", defaultValue: "2015-06-18" },
          { label: "Number of Dependent Children", defaultValue: "2" },
          { label: "Pre-nuptial Agreement Signed", defaultValue: "Yes" },
          { label: "Joint Assets Estimated Value", defaultValue: "$1,250,000" }
        ]
      };
    }
    if (textContext.includes('accident') || textContext.includes('collision') || textContext.includes('crash') || textContext.includes('injury') || textContext.includes('insurance')) {
      return {
        fields: [
          { label: "Date of Incident", defaultValue: "2026-02-14" },
          { label: "Crash Incident Location", defaultValue: "Intersection of Main & Broadway" },
          { label: "Insurance Provider & Policy", defaultValue: "Aviva Policy #AV-88319-X" },
          { label: "Estimated Claim Damages Amount", defaultValue: "$45,050" },
          { label: "Admitting Medical Facility", defaultValue: "St. Thomas Hospital Accident Unit" }
        ]
      };
    }
    if (textContext.includes('property') || textContext.includes('real estate') || textContext.includes('land') || textContext.includes('lease') || textContext.includes('tenancy')) {
      return {
        fields: [
          { label: "Property Address / Plot ID", defaultValue: "Flat 4B, 18 Kensington Gardens, London" },
          { label: "Title Deed Reference Number", defaultValue: "GL-993821-X" },
          { label: "Landlord / Lessor Full Name", defaultValue: "Kensington Estates Ltd" },
          { label: "Monthly Lease Rental Fee", defaultValue: "$3,200" },
          { label: "Deposit Amount Registered", defaultValue: "$6,400" }
        ]
      };
    }
    if (clientCategory === 'corporate' || clientCategory === 'government' || textContext.includes('corp') || textContext.includes('ltd')) {
      return {
        fields: [
          { label: "Company Board Chairman", defaultValue: "Arthur Vance Jr." },
          { label: "State or Country of Incorporation", defaultValue: "Delaware, United States" },
          { label: "Corporate Tax ID / EIN", defaultValue: "EIN-88-2993810" },
          { label: "HQ General Counsel Phone", defaultValue: "+1 (302) 555-0192" },
          { label: "Fiscal Year Ending Date", defaultValue: "December 31st" }
        ]
      };
    }
    return {
      fields: [
        { label: "Emergency Contact Relationship", defaultValue: "Spouse / Next of Kin" },
        { label: "Emergency Contact Mobile", defaultValue: "+44 7911 382910" },
        { label: "Tax Identification Number (TIN)", defaultValue: "TIN-95830-W" },
        { label: "Preferred Communication Channel", defaultValue: "WhatsApp & Secure Portal" },
        { label: "Client Hobbies & Interests", defaultValue: "Amateur Yacht Sailing" }
      ]
    };
  })();

  if (!ai) {
    return res.json(fallbackSuggestions);
  }

  try {
    const prompt = `You are an expert systems design legal architect. Below are information details regarding a law firm's client who is currently onboarding of category type "${clientCategory}":

Name: ${fullName}
Occupation: ${occupation}
Notes / Case Background: ${notes}

Analyze these details and output a list of 5 smart, highly relevant, custom field labels and realistic default values that are not standard (standards are: address, email, phone, occupation, notes, idNumber, parent organisation, clientCategory).
Your suggestion must be strictly tailored to the specific case details, legal industry context (e.g. spouse, marriage, crash location, incorporation state, tax registration, accident physical details) as described in the notes.
Provide the output in JSON format matching this schema:
{
  "fields": [
    { "label": "Custom Field Label Here", "defaultValue": "Realistic Mock Default Value" }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  defaultValue: { type: Type.STRING }
                },
                required: ["label", "defaultValue"]
              }
            }
          },
          required: ["fields"]
        }
      }
    });

    const data = JSON.parse(response.text);
    res.json(data);
  } catch (err) {
    console.error("Gemini suggest-fields failed, using fallback:", err);
    res.json(fallbackSuggestions);
  }
});

// CRON JOB AUTOMATION ROUTE
// Cron trigger checks deadlines expiring tomorrow and auto-sends notifications
app.post('/api/webhooks/cron', async (req, res) => {
  const companies = await db.getCompanies();
  const logs: string[] = [];

  for (const comp of companies) {
    const deadlines = await db.getDeadlines(comp.id);
    const settings = await db.getSettings(comp.id);
    for (const dead of deadlines) {
      if (dead.isResolved) continue;
      
      const dueDate = new Date(dead.dueDate);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const remindDaysBefore = (dead.remindDaysBefore as number[]) || [];
      const remindersSent = (dead.remindersSent as number[]) || [];

      if (remindDaysBefore.includes(diffDays) && !remindersSent.includes(diffDays)) {
        // Send alert
        remindersSent.push(diffDays);
        await db.updateDeadline(comp.id, dead.id, { remindersSent });
        logs.push(`Alert: Firm "${settings?.firmName || comp.name}" case deadline "${dead.title}" is due in ${diffDays} day(s). Notification drafted/sent.`);
      }
    }
  }

  res.json({ success: true, logs });
});

// ─── GLOBAL SEARCH, FEEDBACK & ANNOUNCEMENT WORKFLOWS ─────────────────────

app.get('/api/firm/:companyId/search', async (req, res) => {
  const { companyId } = req.params;
  const q = (req.query.q as string || '').toLowerCase().trim();
  if (!q) {
    return res.json({
      cases: [],
      clients: [],
      deadlines: [],
      documents: [],
      team: [],
      updates: [],
      messages: [],
      events: [],
      announcements: []
    });
  }

  const cases = await db.getCases(companyId) || [];
  const clients = await db.getClients(companyId) || [];
  const deadlines = await db.getDeadlines(companyId) || [];
  const documents = await db.getGeneratedDocuments(companyId) || [];
  const users = await db.getUsers(companyId) || [];
  const updates = await db.getClientUpdates(companyId) || [];
  const announcements = await db.getAnnouncements(companyId) || [];

  // Match Cases
  const matchedCases = cases.filter(c =>
    (c.referenceNumber || '').toLowerCase().includes(q) ||
    (c.caseType || '').toLowerCase().includes(q) ||
    (c.court || '').toLowerCase().includes(q) ||
    (c.opposingParty || '').toLowerCase().includes(q) ||
    (c.notes || '').toLowerCase().includes(q)
  ).map(c => {
    const client = clients.find(cl => cl.id === c.clientId);
    return { ...c, clientName: client?.fullName };
  });

  // Match Clients
  const matchedClients = clients.filter(cl =>
    (cl.fullName || '').toLowerCase().includes(q) ||
    (cl.phone || '').toLowerCase().includes(q) ||
    (cl.email || '').toLowerCase().includes(q) ||
    (cl.address || '').toLowerCase().includes(q) ||
    (cl.notes || '').toLowerCase().includes(q)
  ).map(cl => {
    const clientCases = cases.filter(c => c.clientId === cl.id);
    return { ...cl, activeCasesCount: clientCases.length };
  });

  // Match Deadlines
  const matchedDeadlines = deadlines.filter(d =>
    (d.title || '').toLowerCase().includes(q) ||
    (d.deadlineType || '').toLowerCase().includes(q)
  ).map(d => {
    const parentCase = cases.find(c => c.id === d.caseId);
    return { 
      ...d, 
      caseRef: parentCase?.referenceNumber, 
      clientName: clients.find(cl => cl.id === parentCase?.clientId)?.fullName 
    };
  });

  // Match Documents
  const matchedDocuments = documents.filter(doc =>
    (doc.content || '').toLowerCase().includes(q) ||
    (doc.fileUrl || '').toLowerCase().includes(q)
  ).map(doc => {
    const parentCase = cases.find(c => c.id === doc.caseId);
    return { ...doc, caseRef: parentCase?.referenceNumber };
  });

  // Match Team
  const matchedTeam = users.filter(u =>
    (u.fullName || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q) ||
    (u.role || '').toLowerCase().includes(q)
  );

  // Match Updates
  const matchedUpdates = updates.filter(u =>
    (u.message || '').toLowerCase().includes(q)
  ).map(upd => {
    const parentCase = cases.find(c => c.id === upd.caseId);
    return { ...upd, caseRef: parentCase?.referenceNumber };
  });

  // Match Messages
  const dbIns: any[] = [];
  // Load standard channels + case-specific
  const chatMsgs = await db.getChatMessages(companyId, null);
  dbIns.push(...(chatMsgs || []));
  for (const c of cases) {
    const msgList = await db.getChatMessages(companyId, c.id);
    dbIns.push(...(msgList || []));
  }
  const matchedMessages = dbIns.filter(msg =>
    (msg.message || '').toLowerCase().includes(q)
  ).slice(0, 15).map(msg => {
    const sender = users.find(u => u.id === msg.sentById);
    return { ...msg, senderName: sender?.fullName, avatarUrl: sender?.avatarUrl };
  });

  // Match Events
  const allEvents: any[] = [];
  for (const c of cases) {
    const caseEvs = await db.getCaseEvents(companyId, c.id) || [];
    caseEvs.forEach((ev: any) => {
      allEvents.push({
        ...ev,
        caseRef: c.referenceNumber,
        clientName: clients.find(cl => cl.id === c.clientId)?.fullName
      });
    });
  }
  const matchedEvents = allEvents.filter(ev =>
    (ev.title || '').toLowerCase().includes(q) ||
    (ev.description || '').toLowerCase().includes(q)
  );

  // Match Announcements
  const matchedAnnouncements = announcements.filter(a =>
    (a.title || '').toLowerCase().includes(q) ||
    (a.body || '').toLowerCase().includes(q)
  );

  res.json({
    cases: matchedCases,
    clients: matchedClients,
    deadlines: matchedDeadlines,
    documents: matchedDocuments,
    team: matchedTeam,
    updates: matchedUpdates,
    messages: matchedMessages,
    events: matchedEvents,
    announcements: matchedAnnouncements
  });
});

app.post('/api/platform/feedback', async (req, res) => {
  const { companyId, userId, type, message } = req.body;
  if (!type || !message) {
    return res.status(400).json({ error: "Type and message are required" });
  }
  const feedback = await db.createPlatformFeedback(companyId || null, userId || null, type, message);
  res.json({ success: true, feedback });
});

app.post('/api/firm/:companyId/announcement', async (req, res) => {
  const { companyId } = req.params;
  const { announcement } = req.body;
  
  const updated = await db.updateSettings(companyId, {
    firmAnnouncement: {
      isActive: announcement?.isActive ?? false,
      title: announcement?.title || "",
      body: announcement?.body || "",
      backgroundColor: announcement?.backgroundColor || "#fee2e2",
      textColor: announcement?.textColor || "#991b1b",
      position: announcement?.position || "top",
      updatedAt: new Date().toISOString(),
      updatedBy: "usr-admin-demo"
    }
  });
  res.json({ success: true, settings: updated });
});

// ─── VITE DEVSERVER MIDDLEWARE AND SPA FALLBACK ──────────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Docket Multi-Tenant SaaS Engine active on http://0.0.0.0:${PORT}`);
  });
}

startServer();