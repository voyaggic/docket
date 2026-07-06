import express from 'express';
import 'express-async-errors';
import path from 'path';
import { Readable } from 'stream';
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
import dns from 'dns';
import nodemailer from 'nodemailer';
import { sendInviteEmail, sendSuperadminLoginAlert, sendTeamInviteEmail, sendAccessUpdateEmail, sendSignatureOTPEmail } from './server/email';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  getCalendarAuthUrl,
  exchangeCodeForTokens,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
} from './server/calendar';
import { getUploadUrl, getDownloadUrl, deleteFile, uploadFileDirect, downloadFileDirect } from './server/storage';

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

// ─── AT-REST ENCRYPTION FOR THIRD-PARTY API TOKENS ─────────────────────────
// AES-256-GCM. The token/password never touches the database in plaintext.
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || 'docket_fallback_encryption_key_32bytes_long_secret_123';
  return Buffer.from(key.slice(0, 32));
}

function encryptSecret(plaintext: string): { encrypted: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex')
  };
}

function decryptSecret(encrypted: string, iv: string, authTag: string): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
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

app.get('/api/firm/:companyId/clients/:clientId/invoices', async (req, res) => {
  const { companyId, clientId } = req.params;
  const invoices = await db.getClientInvoices(companyId, clientId);
  res.json(invoices);
});

app.put('/api/firm/:companyId/invoices/:invoiceId', async (req, res) => {
  const { companyId, invoiceId } = req.params;
  const updated = await db.updateInvoice(companyId, invoiceId, req.body);
  if (!updated) return res.status(404).json({ error: 'Invoice not found' });
  res.json(updated);
});

// ─── CASE DIARY ──────────────────────────────────────────────────────────

app.get('/api/firm/:companyId/cases/:caseId/diary', async (req, res) => {
  const { companyId, caseId } = req.params;
  const entries = await db.getCaseDiaryEntries(companyId, caseId);
  res.json(entries);
});

app.post('/api/firm/:companyId/cases/:caseId/diary', async (req, res) => {
  const { companyId, caseId } = req.params;
  const { category, text, isPinned, hours, color, entryDate } = req.body;
  const user = req.user as any;
  const authorName = user?.fullName || 'Voyyagic';
  const created = await db.createCaseDiaryEntry(companyId, caseId, {
    authorName,
    category,
    text,
    isPinned: isPinned || false,
    hours: hours || 0,
    color: color || 'indigo',
    entryDate: entryDate || new Date().toISOString()
  });
  res.json(created);
});

app.put('/api/firm/:companyId/cases/:caseId/diary/:diaryId/pin', async (req, res) => {
  const { companyId, diaryId } = req.params;
  const { isPinned } = req.body;
  const updated = await db.updateCaseDiaryEntry(companyId, diaryId, { isPinned });
  res.json(updated);
});

app.put('/api/firm/:companyId/cases/:caseId/diary/:diaryId/approve', async (req, res) => {
  const { companyId, diaryId } = req.params;
  const updated = await db.updateCaseDiaryEntry(companyId, diaryId, { reviewStatus: 'Approved' });
  res.json(updated);
});

// ─── CASE CLIENT DISPATCH LOG ────────────────────────────────────────────

app.get('/api/firm/:companyId/cases/:caseId/dispatch-log', async (req, res) => {
  const { companyId, caseId } = req.params;
  res.json(await db.getDispatchLogs(companyId, caseId));
});

app.post('/api/firm/:companyId/cases/:caseId/dispatch-log', async (req, res) => {
  const { companyId, caseId } = req.params;
  const currentUser = req.user as any;
  const { type, text } = req.body;
  const created = await db.createDispatchLog(companyId, caseId, {
    authorId: currentUser?.id || null,
    type: type || 'Bilateral Email Update',
    text
  });
  res.json(created);
});

// ─── CASE TEAM ASSIGNMENTS ────────────────────────────────────────────────

app.get('/api/firm/:companyId/cases/:caseId/team', async (req, res) => {
  const { companyId, caseId } = req.params;
  const rows = await db.getCaseTeamMembers(companyId, caseId);
  const enriched = [];
  for (const r of rows) {
    const user = await db.getUser(r.userId);
    enriched.push({ ...r, fullName: user?.fullName || 'Unknown', avatarUrl: user?.avatarUrl });
  }
  res.json(enriched);
});

app.post('/api/firm/:companyId/cases/:caseId/team', async (req, res) => {
  const { companyId, caseId } = req.params;
  const { userId, roleOnMatter, contribution } = req.body;
  if (!userId || !roleOnMatter) return res.status(400).json({ error: 'userId and roleOnMatter are required' });

  const existing = await db.getCaseTeamMember(companyId, caseId, userId);
  if (existing) return res.status(400).json({ error: 'This person is already assigned to this matter' });

  const created = await db.createCaseTeamMember(companyId, caseId, { userId, roleOnMatter, contribution });
  const user = await db.getUser(userId);
  res.json({ ...created, fullName: user?.fullName, avatarUrl: user?.avatarUrl });
});

app.delete('/api/firm/:companyId/cases/:caseId/team/:memberId', async (req, res) => {
  const { companyId, memberId } = req.params;
  const success = await db.deleteCaseTeamMember(companyId, memberId);
  if (!success) return res.status(404).json({ error: 'Team assignment not found' });
  res.json({ success: true });
});

// ─── CASE FILES (R2 OBJECT STORAGE) ──────────────────────────────────────

// Step 1: client asks for a signed upload URL. companyId is taken from the
// route param, which requireSameCompany already validated against the
// logged-in user — so this can never be tricked into issuing a URL for
// another firm's storage folder.
app.post('/api/firm/:companyId/cases/:caseId/files/request-upload', async (req, res) => {
  const { companyId, caseId } = req.params;
  const { fileName, mimeType, fileSize } = req.body;

  if (!fileName || !mimeType) {
    return res.status(400).json({ error: 'fileName and mimeType are required' });
  }

  // 25MB cap — keeps storage costs and request times predictable
  const MAX_FILE_SIZE = 25 * 1024 * 1024;
  if (fileSize && fileSize > MAX_FILE_SIZE) {
    return res.status(400).json({ error: 'File exceeds 25MB limit' });
  }

  const caseRecord = await db.getCase(companyId, caseId);
  if (!caseRecord) return res.status(404).json({ error: 'Case not found' });

  try {
    const { uploadUrl, storageKey } = await getUploadUrl(companyId, caseId, fileName, mimeType);
    res.json({ uploadUrl, storageKey });
  } catch (err: any) {
    console.error('[Files] Failed to generate upload URL:', err.message);
    res.status(503).json({ error: 'File storage is not currently available' });
  }
});

// Proxied direct upload route: Receives the raw file buffer on our Express server and
// uploads it directly to R2 using the AWS S3 SDK. This bypasses client-side SSL mismatch errors.
app.post('/api/firm/:companyId/cases/:caseId/files/upload-direct', express.raw({ limit: '25mb', type: '*/*' }), async (req, res) => {
  const { companyId, caseId } = req.params;
  const fileName = req.query.fileName as string;
  const mimeType = (req.query.mimeType as string) || 'application/octet-stream';
  const currentUser = req.user as any;

  if (!fileName) {
    return res.status(400).json({ error: 'fileName query parameter is required' });
  }

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ error: 'No file body received' });
  }

  const caseRecord = await db.getCase(companyId, caseId);
  if (!caseRecord) return res.status(404).json({ error: 'Case not found' });

  try {
    const { storageKey } = await uploadFileDirect(companyId, caseId, fileName, mimeType, req.body);
    const created = await db.createCaseFile(companyId, caseId, {
      storageKey,
      fileName,
      fileSize: req.body.length,
      mimeType,
      uploadedById: currentUser?.id || null
    });
    res.json(created);
  } catch (err: any) {
    console.error('[Files] Direct upload proxy failed. Root cause details:', err);
    let friendlyMessage = 'File storage is not currently configured correctly or is unavailable.';
    if (err.message && err.message.includes('ENOTFOUND')) {
      friendlyMessage = `Could not connect to storage provider. Please verify R2_ACCOUNT_ID: "${process.env.R2_ACCOUNT_ID}" is valid.`;
    } else if (err.name === 'InvalidAccessKeyId' || err.name === 'SignatureDoesNotMatch' || (err.message && err.message.includes('signature'))) {
      friendlyMessage = 'Invalid credentials configuration for R2 storage bucket — verify access and secret keys.';
    } else if (err.name === 'NoSuchBucket' || (err.message && err.message.includes('bucket'))) {
      friendlyMessage = `Bucket "${process.env.R2_BUCKET_NAME || 'docket-files'}" not found in Cloudflare.`;
    } else if (err.message) {
      friendlyMessage = `Storage provider rejected upload: ${err.message}`;
    }
    res.status(503).json({ error: friendlyMessage });
  }
});

// Step 2: after the browser successfully PUTs the file bytes to R2 directly,
// it calls this to confirm the upload and record the file's metadata.
app.post('/api/firm/:companyId/cases/:caseId/files/confirm', async (req, res) => {
  const { companyId, caseId } = req.params;
  const { storageKey, fileName, fileSize, mimeType } = req.body;
  const currentUser = req.user as any;

  if (!storageKey || !fileName) {
    return res.status(400).json({ error: 'storageKey and fileName are required' });
  }

  // Defense in depth: confirm the storageKey the client claims to have
  // uploaded to actually starts with this company's own folder prefix.
  if (!storageKey.startsWith(`${companyId}/${caseId}/`)) {
    return res.status(403).json({ error: 'Invalid storage key for this case' });
  }

  const created = await db.createCaseFile(companyId, caseId, {
    storageKey,
    fileName,
    fileSize: fileSize || 0,
    mimeType: mimeType || 'application/octet-stream',
    uploadedById: currentUser?.id || null
  });

  res.json(created);
});

app.get('/api/firm/:companyId/cases/:caseId/files', async (req, res) => {
  const { companyId, caseId } = req.params;
  res.json(await db.getCaseFiles(companyId, caseId));
});

// Proxies download streaming directly from R2 through the Express backend to deliver
// standard SSL connections and bypass direct client-to-R2 download and SSL mismatch issues.
app.get('/api/firm/:companyId/files/:fileId/download', async (req, res) => {
  const { companyId, fileId } = req.params;
  const file = await db.getCaseFile(companyId, fileId);
  if (!file) return res.status(404).json({ error: 'File not found' });

  try {
    const { body, contentType, contentLength } = await downloadFileDirect(file.storageKey);

    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);

    if (body && typeof body.pipe === 'function') {
      body.pipe(res);
    } else if (body && typeof body.transformToWebStream === 'function') {
      Readable.fromWeb(body.transformToWebStream() as any).pipe(res);
    } else {
      res.send(body);
    }
  } catch (err: any) {
    console.error('[Files] Download proxy failed:', err);
    let friendlyMessage = 'File download is currently unavailable.';
    if (err.message && err.message.includes('ENOTFOUND')) {
      friendlyMessage = `Could not connect to storage: Please verify your R2_ACCOUNT_ID is correct.`;
    } else if (err.name === 'NoSuchKey' || (err.message && err.message.includes('key'))) {
      friendlyMessage = 'The requested file does not exist in the storage bucket.';
    }
    res.status(503).json({ error: friendlyMessage });
  }
});

app.delete('/api/firm/:companyId/files/:fileId', async (req, res) => {
  const { companyId, fileId } = req.params;
  const file = await db.getCaseFile(companyId, fileId);
  if (!file) return res.status(404).json({ error: 'File not found' });

  try {
    await deleteFile(file.storageKey);
  } catch (err: any) {
    console.error('[Files] R2 delete failed (continuing to remove DB record):', err.message);
  }

  await db.deleteCaseFile(companyId, fileId);
  res.json({ success: true });
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

// ─── DEADLINE DISCUSSION COMMENTS (backed by CaseEvent, scoped to one deadline) ──
app.get('/api/firm/:companyId/deadlines/:deadlineId/comments', async (req, res) => {
  const { companyId, deadlineId } = req.params;
  const deadlines = await db.getDeadlines(companyId);
  const deadline = deadlines.find(d => d.id === deadlineId);
  if (!deadline) return res.status(404).json({ error: 'Deadline not found' });

  const events = await db.getCaseEvents(companyId, deadline.caseId);
  const comments = events.filter(e => e.eventType === 'Comment' && (e as any).relatedDeadlineId === deadlineId);

  const enriched = [];
  for (const c of comments) {
    const user = c.createdById ? await db.getUser(c.createdById) : null;
    enriched.push({ ...c, authorName: user?.fullName || 'Unknown Staff' });
  }
  res.json(enriched);
});

app.post('/api/firm/:companyId/deadlines/:deadlineId/comments', async (req, res) => {
  const { companyId, deadlineId } = req.params;
  const currentUser = req.user as any;
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text is required' });

  const deadlines = await db.getDeadlines(companyId);
  const deadline = deadlines.find(d => d.id === deadlineId);
  if (!deadline) return res.status(404).json({ error: 'Deadline not found' });

  const event = await db.createCaseEvent(companyId, {
    caseId: deadline.caseId,
    createdById: currentUser?.id || null,
    eventType: 'Comment',
    title: 'Deadline Discussion Comment',
    description: text,
    eventDate: new Date().toISOString(),
    relatedDeadlineId: deadlineId
  } as any);

  res.json({ ...event, authorName: currentUser?.fullName || 'You' });
});

// ─── CLIENT UPDATES ───────────────────────────────────────────────────────────

app.get('/api/firm/:companyId/updates', async (req, res) => {
  const { companyId } = req.params;
  const list = await db.getClientUpdates(companyId);
  const settings = await db.getSettings(companyId);
  const slaHours = (settings as any)?.updatePreferences?.correspondenceSlaHours ?? (settings as any)?.correspondenceSlaHours ?? 4;
  const slaMs = slaHours * 60 * 60 * 1000;

  const enriched = [];
  for (const u of list) {
    const cli = await db.getClient(companyId, u.clientId);
    const cs = await db.getCase(companyId, u.caseId);

    let slaBreached = false;
    let slaMsElapsed: number | null = null;
    const submitted = (u as any).submittedForApprovalAt;
    if (submitted) {
      const endpoint = (u as any).approvedAt || new Date().toISOString();
      slaMsElapsed = new Date(endpoint).getTime() - new Date(submitted).getTime();
      slaBreached = slaMsElapsed > slaMs;
    }

    enriched.push({
      ...u,
      client: cli,
      caseRef: cs?.referenceNumber,
      slaBreached,
      slaHoursElapsed: slaMsElapsed !== null ? +(slaMsElapsed / (60 * 60 * 1000)).toFixed(1) : null,
      slaThresholdHours: slaHours
    });
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

app.delete('/api/firm/:companyId/updates/:updateId', async (req, res) => {
  const { companyId, updateId } = req.params;
  const deleted = await db.deleteClientUpdate(companyId, updateId);
  res.json({ success: deleted });
});

app.post('/api/firm/:companyId/updates/:updateId/submit-for-approval', async (req, res) => {
  const { companyId, updateId } = req.params;
  const { userId } = req.body;

  const updated = await db.updateClientUpdate(companyId, updateId, {
    submittedForApprovalAt: new Date().toISOString(),
    submittedById: userId || 'usr-lawyer-demo'
  });
  res.json(updated);
});

app.post('/api/firm/:companyId/updates/:updateId/approve', async (req, res) => {
  const { companyId, updateId } = req.params;
  const { userId } = req.body;

  const updated = await db.updateClientUpdate(companyId, updateId, {
    status: ClientUpdateStatus.APPROVED,
    approvedById: userId || 'usr-admin-demo',
    approvedAt: new Date().toISOString()
  });
  res.json(updated);
});

app.post('/api/firm/:companyId/updates/:updateId/reject', async (req, res) => {
  const { companyId, updateId } = req.params;
  const { rejectionReason } = req.body;

  const updated = await db.updateClientUpdate(companyId, updateId, {
    status: ClientUpdateStatus.DRAFT,
    submittedForApprovalAt: null as any,
    rejectionReason: rejectionReason || 'Re-edit required by reviewing partner'
  });
  res.json(updated);
});

// Send Update endpoint with real transmissions (SMTP, Twilio, WhatsApp Cloud API)
app.post('/api/firm/:companyId/updates/:updateId/send', async (req, res) => {
  const { companyId, updateId } = req.params;
  const { channels } = req.body; // e.g. {email: true, whatsapp: true, sms: false}

  const list = await db.getClientUpdates(companyId);
  const targetUpdate = list.find(u => u.id === updateId);
  if (!targetUpdate) {
    return res.status(404).json({ error: 'Update not found.' });
  }

  const settings = await db.getSettings(companyId);
  const workflow = (settings?.updatePreferences as any)?.workflow || 'draft_review';
  if (workflow === 'draft_review' && targetUpdate.status !== 'APPROVED') {
    return res.status(400).json({ error: 'Update is not approved and cannot be sent under the active review workflow.' });
  }

  const client = await db.getClient(companyId, targetUpdate.clientId);
  if (!client) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  const transmissions: Record<string, { success: boolean; error?: string }> = {};

  // 1. Email Channel (Real SMTP using nodemailer)
  if (channels?.email && client.email) {
    try {
      const emailConfig = await db.getEmailChannelConfig(companyId);
      if (emailConfig && (emailConfig as any).isVerified) {
        const smtpPass = decryptSecret(
          (emailConfig as any).smtpPassEncrypted,
          (emailConfig as any).smtpPassIv,
          (emailConfig as any).smtpPassAuthTag
        );
        const transporter = nodemailer.createTransport({
          host: (emailConfig as any).smtpHost,
          port: (emailConfig as any).smtpPort,
          secure: (emailConfig as any).smtpPort === 465,
          auth: {
            user: (emailConfig as any).smtpUser,
            pass: smtpPass
          }
        } as any);

        await transporter.sendMail({
          from: `"${(emailConfig as any).fromName || 'Docket chambers'}" <${(emailConfig as any).fromEmail || (emailConfig as any).smtpUser}>`,
          to: client.email,
          subject: (targetUpdate as any).subject || 'Client Matter Update',
          text: (targetUpdate as any).message,
          html: `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2>Matter Update: ${(targetUpdate as any).subject || 'Status Update'}</h2>
            <p>${(targetUpdate as any).message.replace(/\n/g, '<br/>')}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;"/>
            <p style="font-size: 11px; color: #666;">This is a secure transmission from your legal counsel powered by Docket Chambers.</p>
          </div>`
        });
        transmissions.email = { success: true };
      } else {
        transmissions.email = { success: false, error: 'Email channel is not configured or verified.' };
      }
    } catch (err: any) {
      console.error('[Email Transmission Error]', err);
      transmissions.email = { success: false, error: err.message || 'SMTP transmission failed.' };
    }
  }

  // 2. SMS Channel (Real Twilio API)
  if (channels?.sms && client.phone) {
    try {
      const smsConfig = await db.getSmsChannelConfig(companyId);
      if (smsConfig && (smsConfig as any).isVerified) {
        const authToken = decryptSecret(
          (smsConfig as any).twilioAuthTokenEncrypted,
          (smsConfig as any).twilioAuthTokenIv,
          (smsConfig as any).twilioAuthTokenAuthTag
        );
        const url = `https://api.twilio.com/2010-04-01/Accounts/${(smsConfig as any).twilioAccountSid}/Messages.json`;
        const authHeader = Buffer.from(`${(smsConfig as any).twilioAccountSid}:${authToken}`).toString('base64');
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            From: (smsConfig as any).fromPhoneNumber,
            To: client.phone,
            Body: (targetUpdate as any).message
          })
        });

        if (!response.ok) {
          const errRes = await response.text();
          throw new Error(`Twilio returned ${response.status}: ${errRes}`);
        }
        transmissions.sms = { success: true };
      } else {
        transmissions.sms = { success: false, error: 'SMS channel is not configured or verified.' };
      }
    } catch (err: any) {
      console.error('[SMS Transmission Error]', err);
      transmissions.sms = { success: false, error: err.message || 'Twilio SMS transmission failed.' };
    }
  }

  // 3. WhatsApp Channel (Real Meta Cloud API)
  if (channels?.whatsapp && client.phone) {
    try {
      const waConfig = await db.getWhatsAppConfig(companyId);
      if (waConfig && (waConfig as any).isVerified) {
        const accessToken = decryptSecret(
          (waConfig as any).accessTokenEncrypted,
          (waConfig as any).accessTokenIv,
          (waConfig as any).accessTokenAuthTag
        );
        const url = `https://graph.facebook.com/v21.0/${(waConfig as any).phoneNumberId}/messages`;
        
        // Send actual text message via Meta Cloud API
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: client.phone.replace(/[\s\-\+\(\)]/g, ''), // strip punctuation
            type: 'text',
            text: {
              preview_url: false,
              body: `${(targetUpdate as any).subject ? `*${(targetUpdate as any).subject}*\n\n` : ''}${(targetUpdate as any).message}`
            }
          })
        });

        if (!response.ok) {
          const errRes = await response.text();
          throw new Error(`Meta Cloud API returned ${response.status}: ${errRes}`);
        }
        transmissions.whatsapp = { success: true };
      } else {
        transmissions.whatsapp = { success: false, error: 'WhatsApp channel is not configured or verified.' };
      }
    } catch (err: any) {
      console.error('[WhatsApp Transmission Error]', err);
      transmissions.whatsapp = { success: false, error: err.message || 'WhatsApp transmission failed.' };
    }
  }

  const updated = await db.updateClientUpdate(companyId, updateId, {
    status: ClientUpdateStatus.SENT,
    channelsSent: channels,
    sentAt: new Date().toISOString()
  });

  res.json({ success: true, update: updated, transmissions });
});

// ─── WHATSAPP INTEGRATION ENDPOINTS ──────────────────────────────────────────

app.get('/api/firm/:companyId/whatsapp/config', async (req, res) => {
  const { companyId } = req.params;
  const config = await db.getWhatsAppConfig(companyId);
  if (!config) return res.json(null);
  
  const { accessTokenEncrypted, accessTokenIv, accessTokenAuthTag, ...rest } = config as any;
  res.json({
    ...rest,
    hasAccessToken: !!accessTokenEncrypted
  });
});

app.post('/api/firm/:companyId/whatsapp/config', async (req, res) => {
  const { companyId } = req.params;
  const { phoneNumberId, businessAccountId, accessToken } = req.body;

  if (!phoneNumberId || !businessAccountId || !accessToken) {
    return res.status(400).json({ error: 'phoneNumberId, businessAccountId, and accessToken are all required.' });
  }

  try {
    // 1. Live Validation against Meta Cloud API (Fetch business phone number info)
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}?access_token=${accessToken}`);
    if (!response.ok) {
      const errTxt = await response.text();
      return res.status(400).json({ error: `Meta Cloud API verification failed: ${errTxt}` });
    }

    const metadata = await response.json();
    const displayPhoneNumber = metadata.display_phone_number || null;
    const verifiedBusinessName = metadata.verified_name || null;

    // 2. Encrypt Token
    const { encrypted, iv, authTag } = encryptSecret(accessToken);

    // 3. Upsert
    const saved = await db.upsertWhatsAppConfig(companyId, {
      phoneNumberId,
      businessAccountId,
      accessTokenEncrypted: encrypted,
      accessTokenIv: iv,
      accessTokenAuthTag: authTag,
      displayPhoneNumber,
      verifiedBusinessName,
      isVerified: true,
      lastVerifiedAt: new Date().toISOString()
    });

    res.json({
      id: saved.id,
      companyId: saved.companyId,
      phoneNumberId: saved.phoneNumberId,
      businessAccountId: saved.businessAccountId,
      displayPhoneNumber: saved.displayPhoneNumber,
      verifiedBusinessName: saved.verifiedBusinessName,
      isVerified: saved.isVerified,
      lastVerifiedAt: saved.lastVerifiedAt,
      hasAccessToken: true
    });
  } catch (err: any) {
    console.error('[WhatsApp Config Error]', err);
    res.status(500).json({ error: err.message || 'Internal verification error.' });
  }
});

app.delete('/api/firm/:companyId/whatsapp/config', async (req, res) => {
  const { companyId } = req.params;
  const success = await db.deleteWhatsAppConfig(companyId);
  res.json({ success });
});

app.get('/api/firm/:companyId/whatsapp/templates', async (req, res) => {
  const { companyId } = req.params;
  const templates = await db.getWhatsAppTemplates(companyId);
  res.json(templates);
});

app.post('/api/firm/:companyId/whatsapp/templates', async (req, res) => {
  const { companyId } = req.params;
  const { name, category, language, bodyText, headerText, footerText } = req.body;

  if (!name || !category || !bodyText) {
    return res.status(400).json({ error: 'name, category, and bodyText are required fields.' });
  }

  try {
    const waConfig = await db.getWhatsAppConfig(companyId);
    if (!waConfig) {
      return res.status(400).json({ error: 'WhatsApp is not configured. Configure first.' });
    }

    const accessToken = decryptSecret(
      (waConfig as any).accessTokenEncrypted,
      (waConfig as any).accessTokenIv,
      (waConfig as any).accessTokenAuthTag
    );

    // Prepare components payload for Meta Cloud API
    const components: any[] = [{ type: 'BODY', text: bodyText }];
    if (headerText) {
      components.push({ type: 'HEADER', format: 'TEXT', text: headerText });
    }
    if (footerText) {
      components.push({ type: 'FOOTER', text: footerText });
    }

    // Call Meta Cloud API to create template
    const url = `https://graph.facebook.com/v21.0/${(waConfig as any).businessAccountId}/message_templates`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        category, // MARKETING | UTILITY | AUTHENTICATION
        language: language || 'en_US',
        components
      })
    });

    let metaTemplateId = null;
    let status = 'approved'; // Mark approved instantly in local playground/sandbox, or set pending
    let syncError = null;

    if (response.ok) {
      const resData = await response.json();
      metaTemplateId = resData.id;
    } else {
      const errTxt = await response.text();
      syncError = `Meta API Warning: ${errTxt}. Created in draft state locally.`;
      status = 'submission_failed';
    }

    const created = await db.createWhatsAppTemplate(companyId, {
      metaTemplateId,
      name,
      category,
      language: language || 'en_US',
      bodyText,
      headerText,
      footerText,
      status,
      rejectionReason: syncError,
      submittedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString()
    });

    res.json(created);
  } catch (err: any) {
    console.error('[WhatsApp Template Creation Error]', err);
    res.status(500).json({ error: err.message || 'Failed to submit template.' });
  }
});

app.post('/api/firm/:companyId/whatsapp/templates/sync', async (req, res) => {
  const { companyId } = req.params;

  try {
    const waConfig = await db.getWhatsAppConfig(companyId);
    if (!waConfig) {
      return res.status(400).json({ error: 'WhatsApp integration is not configured.' });
    }

    const accessToken = decryptSecret(
      (waConfig as any).accessTokenEncrypted,
      (waConfig as any).accessTokenIv,
      (waConfig as any).accessTokenAuthTag
    );

    const url = `https://graph.facebook.com/v21.0/${(waConfig as any).businessAccountId}/message_templates?limit=100`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      const errTxt = await response.text();
      return res.status(400).json({ error: `Meta template sync failed: ${errTxt}` });
    }

    const resData = await response.json();
    const metaTemplates = resData.data || [];

    const localTemplates = await db.getWhatsAppTemplates(companyId);
    const synced = [];

    for (const mt of metaTemplates) {
      const bodyComp = mt.components?.find((c: any) => c.type === 'BODY');
      const headerComp = mt.components?.find((c: any) => c.type === 'HEADER');
      const footerComp = mt.components?.find((c: any) => c.type === 'FOOTER');

      const existing = localTemplates.find(
        (t: any) => t.name === mt.name && t.language === mt.language
      );

      if (existing) {
        const updated = await db.updateWhatsAppTemplate(companyId, existing.id, {
          metaTemplateId: mt.id,
          status: mt.status?.toLowerCase() || 'approved',
          category: mt.category,
          bodyText: bodyComp?.text || existing.bodyText,
          headerText: headerComp?.text || existing.headerText,
          footerText: footerComp?.text || existing.footerText,
          lastSyncedAt: new Date().toISOString()
        });
        synced.push(updated);
      } else {
        const created = await db.createWhatsAppTemplate(companyId, {
          metaTemplateId: mt.id,
          name: mt.name,
          category: mt.category,
          language: mt.language,
          bodyText: bodyComp?.text || '',
          headerText: headerComp?.text || null,
          footerText: footerComp?.text || null,
          status: mt.status?.toLowerCase() || 'approved',
          submittedAt: new Date().toISOString(),
          lastSyncedAt: new Date().toISOString()
        });
        synced.push(created);
      }
    }

    res.json({ success: true, count: synced.length, synced });
  } catch (err: any) {
    console.error('[WhatsApp Sync Error]', err);
    res.status(500).json({ error: err.message || 'Sync failed.' });
  }
});

app.post('/api/firm/:companyId/whatsapp/send', async (req, res) => {
  const { companyId } = req.params;
  const { recipientPhone, templateId, variables } = req.body;

  if (!recipientPhone || !templateId) {
    return res.status(400).json({ error: 'recipientPhone and templateId are required.' });
  }

  try {
    const waConfig = await db.getWhatsAppConfig(companyId);
    if (!waConfig) {
      return res.status(400).json({ error: 'WhatsApp integration is not configured.' });
    }

    const template = await db.getWhatsAppTemplate(companyId, templateId);
    if (!template) {
      return res.status(404).json({ error: 'WhatsApp template not found.' });
    }

    const accessToken = decryptSecret(
      (waConfig as any).accessTokenEncrypted,
      (waConfig as any).accessTokenIv,
      (waConfig as any).accessTokenAuthTag
    );

    // Call Meta Cloud API messages sending endpoint
    const url = `https://graph.facebook.com/v21.0/${(waConfig as any).phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipientPhone.replace(/[\s\-\+\(\)]/g, ''),
        type: 'template',
        template: {
          name: template.name,
          language: { code: template.language },
          components: [
            {
              type: 'body',
              parameters: (variables || []).map((v: string) => ({ type: 'text', text: v }))
            }
          ]
        }
      })
    });

    if (!response.ok) {
      const errTxt = await response.text();
      return res.status(400).json({ error: `Meta message transmission failed: ${errTxt}` });
    }

    // Increment template usage count
    await db.incrementWhatsAppTemplateUsage(companyId, templateId);

    res.json({ success: true });
  } catch (err: any) {
    console.error('[WhatsApp Send Message Error]', err);
    res.status(500).json({ error: err.message || 'Failed to send WhatsApp message.' });
  }
});

// ─── EMAIL (SMTP) CHANNEL CONFIG ENDPOINTS ───────────────────────────────────

app.get('/api/firm/:companyId/email-config', async (req, res) => {
  const { companyId } = req.params;
  const config = await db.getEmailChannelConfig(companyId);
  if (!config) return res.json(null);

  const { smtpPassEncrypted, smtpPassIv, smtpPassAuthTag, ...rest } = config as any;
  res.json({
    ...rest,
    hasPassword: !!smtpPassEncrypted
  });
});

app.post('/api/firm/:companyId/email-config', async (req, res) => {
  const { companyId } = req.params;
  const { smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, fromName } = req.body;

  if (!smtpHost || !smtpPort || !smtpUser) {
    return res.status(400).json({ error: 'smtpHost, smtpPort, and smtpUser are required fields.' });
  }

  try {
    let resolvedPass = smtpPass;

    // Reuse existing password if placeholder matches and pass was already configured
    if (smtpPass === '••••••••••••••••') {
      const existing = await db.getEmailChannelConfig(companyId);
      if (existing && (existing as any).smtpPassEncrypted) {
        resolvedPass = decryptSecret(
          (existing as any).smtpPassEncrypted,
          (existing as any).smtpPassIv,
          (existing as any).smtpPassAuthTag
        );
      } else {
        return res.status(400).json({ error: 'Password was not previously saved.' });
      }
    }

    if (!resolvedPass) {
      return res.status(400).json({ error: 'smtpPass is required.' });
    }

    // 1. Live SMTP Connection Verification via nodemailer
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465,
      auth: {
        user: smtpUser,
        pass: resolvedPass
      },
      connectTimeout: 5000 // 5 seconds fail-fast limit
    } as any);

    await transporter.verify();

    // 2. Encrypt Credential
    const { encrypted, iv, authTag } = encryptSecret(resolvedPass);

    // 3. Upsert Config
    const saved = await db.upsertEmailChannelConfig(companyId, {
      smtpHost,
      smtpPort: parseInt(smtpPort, 10),
      smtpUser,
      smtpPassEncrypted: encrypted,
      smtpPassIv: iv,
      smtpPassAuthTag: authTag,
      fromEmail: fromEmail || smtpUser,
      fromName: fromName || null,
      isVerified: true,
      lastVerifiedAt: new Date().toISOString()
    });

    res.json({
      id: saved.id,
      companyId: saved.companyId,
      smtpHost: saved.smtpHost,
      smtpPort: saved.smtpPort,
      smtpUser: saved.smtpUser,
      fromEmail: saved.fromEmail,
      fromName: saved.fromName,
      isVerified: saved.isVerified,
      lastVerifiedAt: saved.lastVerifiedAt,
      hasPassword: true
    });
  } catch (err: any) {
    console.error('[SMTP Config Error]', err);
    res.status(400).json({ error: `SMTP verification failed: ${err.message || err}` });
  }
});

app.post('/api/firm/:companyId/email-config/send-test', async (req, res) => {
  const { companyId } = req.params;
  const { recipientEmail } = req.body;

  if (!recipientEmail) {
    return res.status(400).json({ error: 'recipientEmail is required.' });
  }

  try {
    const config = await db.getEmailChannelConfig(companyId);
    if (!config || !(config as any).isVerified) {
      return res.status(400).json({ error: 'SMTP config is not verified or not saved.' });
    }

    const smtpPass = decryptSecret(
      (config as any).smtpPassEncrypted,
      (config as any).smtpPassIv,
      (config as any).smtpPassAuthTag
    );

    const transporter = nodemailer.createTransport({
      host: (config as any).smtpHost,
      port: (config as any).smtpPort,
      secure: (config as any).smtpPort === 465,
      auth: {
        user: (config as any).smtpUser,
        pass: smtpPass
      }
    } as any);

    await transporter.sendMail({
      from: `"${(config as any).fromName || 'Docket chambers'}" <${(config as any).fromEmail || (config as any).smtpUser}>`,
      to: recipientEmail,
      subject: 'Docket Chambers - SMTP Connection Test',
      text: 'Congratulations! This email verifies that your SMTP connection settings in Docket are correct and secure.',
      html: `<h3>Docket Connection Success!</h3>
      <p>This message confirms that your SMTP custom email integration is operational.</p>`
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('[SMTP Test Error]', err);
    res.status(500).json({ error: err.message || 'SMTP test send failed.' });
  }
});

// ─── SMS (TWILIO) CHANNEL CONFIG ENDPOINTS ───────────────────────────────────

app.get('/api/firm/:companyId/sms-config', async (req, res) => {
  const { companyId } = req.params;
  const config = await db.getSmsChannelConfig(companyId);
  if (!config) return res.json(null);

  const { twilioAuthTokenEncrypted, twilioAuthTokenIv, twilioAuthTokenAuthTag, ...rest } = config as any;
  res.json({
    ...rest,
    hasAuthToken: !!twilioAuthTokenEncrypted
  });
});

app.post('/api/firm/:companyId/sms-config', async (req, res) => {
  const { companyId } = req.params;
  const { twilioAccountSid, twilioAuthToken, fromPhoneNumber } = req.body;

  if (!twilioAccountSid || !fromPhoneNumber) {
    return res.status(400).json({ error: 'twilioAccountSid and fromPhoneNumber are required.' });
  }

  try {
    let resolvedToken = twilioAuthToken;

    if (twilioAuthToken === '••••••••••••••••') {
      const existing = await db.getSmsChannelConfig(companyId);
      if (existing && (existing as any).twilioAuthTokenEncrypted) {
        resolvedToken = decryptSecret(
          (existing as any).twilioAuthTokenEncrypted,
          (existing as any).twilioAuthTokenIv,
          (existing as any).twilioAuthTokenAuthTag
        );
      } else {
        return res.status(400).json({ error: 'Auth token was not previously saved.' });
      }
    }

    if (!resolvedToken) {
      return res.status(400).json({ error: 'twilioAuthToken is required.' });
    }

    // 1. Live Validation against Twilio API
    const authHeader = Buffer.from(`${twilioAccountSid}:${resolvedToken}`).toString('base64');
    const verifyUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}.json`;

    const response = await fetch(verifyUrl, {
      headers: {
        'Authorization': `Basic ${authHeader}`
      }
    });

    if (!response.ok) {
      const errTxt = await response.text();
      return res.status(400).json({ error: `Twilio API validation failed: ${errTxt}` });
    }

    // 2. Encrypt Token
    const { encrypted, iv, authTag } = encryptSecret(resolvedToken);

    // 3. Upsert
    const saved = await db.upsertSmsChannelConfig(companyId, {
      twilioAccountSid,
      twilioAuthTokenEncrypted: encrypted,
      twilioAuthTokenIv: iv,
      twilioAuthTokenAuthTag: authTag,
      fromPhoneNumber,
      isVerified: true,
      lastVerifiedAt: new Date().toISOString()
    });

    res.json({
      id: saved.id,
      companyId: saved.companyId,
      twilioAccountSid: saved.twilioAccountSid,
      fromPhoneNumber: saved.fromPhoneNumber,
      isVerified: saved.isVerified,
      lastVerifiedAt: saved.lastVerifiedAt,
      hasAuthToken: true
    });
  } catch (err: any) {
    console.error('[Twilio Config Error]', err);
    res.status(400).json({ error: err.message || 'Twilio verification error.' });
  }
});

app.post('/api/firm/:companyId/sms-config/send-test', async (req, res) => {
  const { companyId } = req.params;
  const { recipientPhone } = req.body;

  if (!recipientPhone) {
    return res.status(400).json({ error: 'recipientPhone is required.' });
  }

  try {
    const config = await db.getSmsChannelConfig(companyId);
    if (!config || !(config as any).isVerified) {
      return res.status(400).json({ error: 'Twilio integration is not verified or not saved.' });
    }

    const authToken = decryptSecret(
      (config as any).twilioAuthTokenEncrypted,
      (config as any).twilioAuthTokenIv,
      (config as any).twilioAuthTokenAuthTag
    );

    const authHeader = Buffer.from(`${(config as any).twilioAccountSid}:${authToken}`).toString('base64');
    const sendUrl = `https://api.twilio.com/2010-04-01/Accounts/${(config as any).twilioAccountSid}/Messages.json`;

    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: (config as any).fromPhoneNumber,
        To: recipientPhone,
        Body: 'Docket - Twilio SMS connection verification message. It works!'
      })
    });

    if (!response.ok) {
      const errTxt = await response.text();
      return res.status(400).json({ error: `Twilio test transmission failed: ${errTxt}` });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('[Twilio Test Error]', err);
    res.status(500).json({ error: err.message || 'Twilio test SMS send failed.' });
  }
});

// ─── DOMAIN VERIFICATION (real DNS TXT lookups — SPF, DKIM, DMARC) ─────────
const dnsResolveTxt = dns.promises.resolveTxt;

async function checkSpfRecord(domain: string): Promise<{ verified: boolean; record: string | null }> {
  try {
    const records = await dnsResolveTxt(domain);
    const flat = records.map(r => r.join(''));
    const spf = flat.find(r => r.startsWith('v=spf1'));
    return { verified: !!spf, record: spf || null };
  } catch (err) {
    return { verified: false, record: null };
  }
}

async function checkDkimRecord(domain: string, selector: string): Promise<{ verified: boolean; record: string | null }> {
  if (!selector) return { verified: false, record: null };
  try {
    const records = await dnsResolveTxt(`${selector}._domainkey.${domain}`);
    const flat = records.map(r => r.join(''));
    const dkim = flat.find(r => r.includes('v=DKIM1') || r.includes('k=rsa'));
    return { verified: !!dkim, record: dkim || null };
  } catch (err) {
    return { verified: false, record: null };
  }
}

async function checkDmarcRecord(domain: string): Promise<{ verified: boolean; record: string | null; policy: string | null }> {
  try {
    const records = await dnsResolveTxt(`_dmarc.${domain}`);
    const flat = records.map(r => r.join(''));
    const dmarc = flat.find(r => r.startsWith('v=DMARC1'));
    const policyMatch = dmarc?.match(/p=(\w+)/);
    return { verified: !!dmarc, record: dmarc || null, policy: policyMatch ? policyMatch[1] : null };
  } catch (err) {
    return { verified: false, record: null, policy: null };
  }
}

app.get('/api/firm/:companyId/domain-verification', async (req, res) => {
  const config = await db.getDomainVerification(req.params.companyId);
  if (!config) return res.json({ configured: false });
  const score = [config.spfVerified, config.dkimVerified, config.dmarcVerified].filter(Boolean).length;
  res.json({ configured: true, ...config, deliverabilityScore: Math.round((score / 3) * 100) });
});

app.post('/api/firm/:companyId/domain-verification/check', async (req, res) => {
  const { companyId } = req.params;
  const currentUser = req.user as any;
  const isFirmAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.isSuperAdmin;
  if (!isFirmAdmin) return res.status(403).json({ error: 'Only firm admins can verify domain configuration' });

  const { domain, dkimSelector } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });

  // Real, live DNS lookups — this is the actual verification, not a saved boolean
  const [spf, dkim, dmarc] = await Promise.all([
    checkSpfRecord(domain),
    checkDkimRecord(domain, dkimSelector),
    checkDmarcRecord(domain)
  ]);

  const saved = await db.upsertDomainVerification(companyId, {
    domain,
    dkimSelector: dkimSelector || null,
    spfVerified: spf.verified,
    spfRecord: spf.record,
    dkimVerified: dkim.verified,
    dkimRecord: dkim.record,
    dmarcVerified: dmarc.verified,
    dmarcRecord: dmarc.record,
    dmarcPolicy: dmarc.policy,
    lastCheckedAt: new Date().toISOString()
  });

  const score = [spf.verified, dkim.verified, dmarc.verified].filter(Boolean).length;
  res.json({ configured: true, ...saved, deliverabilityScore: Math.round((score / 3) * 100) });
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

// ─── CORRESPONDENCE SNIPPETS ──────────────────────────────────────────────
app.get('/api/firm/:companyId/snippets', async (req, res) => {
  const snippets = await db.getCorrespondenceSnippets(req.params.companyId);
  res.json(snippets);
});

app.post('/api/firm/:companyId/snippets', async (req, res) => {
  const { companyId } = req.params;
  const currentUser = req.user as any;
  const { title, category, richContent, variables } = req.body;
  if (!title || !richContent) return res.status(400).json({ error: 'title and richContent are required' });

  const created = await db.createCorrespondenceSnippet(companyId, {
    title,
    category: category || 'Custom',
    richContent,
    variables: variables || [],
    isFirmWide: true,
    createdById: currentUser?.id || null,
    usageCount: 0
  });
  res.json(created);
});

app.put('/api/firm/:companyId/snippets/:id', async (req, res) => {
  const { companyId, id } = req.params;
  const updated = await db.updateCorrespondenceSnippet(companyId, id, req.body);
  if (!updated) return res.status(404).json({ error: 'Snippet not found' });
  res.json(updated);
});

app.delete('/api/firm/:companyId/snippets/:id', async (req, res) => {
  const { companyId, id } = req.params;
  const success = await db.deleteCorrespondenceSnippet(companyId, id);
  if (!success) return res.status(404).json({ error: 'Snippet not found' });
  res.json({ success: true });
});

// Increment usage count when a snippet is actually inserted into a draft
app.post('/api/firm/:companyId/snippets/:id/use', async (req, res) => {
  const { companyId, id } = req.params;
  const updated = await db.incrementSnippetUsage(companyId, id);
  if (!updated) return res.status(404).json({ error: 'Snippet not found' });
  res.json(updated);
});

// ─── CORRESPONDENCE TEMPLATES ─────────────────────────────────────────────
app.get('/api/firm/:companyId/correspondence-templates', async (req, res) => {
  const templates = await db.getCorrespondenceTemplates(req.params.companyId);
  res.json(templates);
});

app.post('/api/firm/:companyId/correspondence-templates', async (req, res) => {
  const { companyId } = req.params;
  const currentUser = req.user as any;
  const { name, category, matterType, eventType, richContent, variables, disclaimers } = req.body;
  if (!name || !richContent) return res.status(400).json({ error: 'name and richContent are required' });

  const created = await db.createCorrespondenceTemplate(companyId, {
    name,
    category: category || 'Civil',
    matterType,
    eventType,
    richContent,
    variables: variables || [],
    disclaimers: disclaimers || [],
    isDefault: false,
    isFirmWide: true,
    createdById: currentUser?.id || null,
    usageCount: 0
  });
  res.json(created);
});

app.put('/api/firm/:companyId/correspondence-templates/:id', async (req, res) => {
  const { companyId, id } = req.params;
  const updated = await db.updateCorrespondenceTemplate(companyId, id, req.body);
  if (!updated) return res.status(404).json({ error: 'Template not found' });
  res.json(updated);
});

app.delete('/api/firm/:companyId/correspondence-templates/:id', async (req, res) => {
  const { companyId, id } = req.params;
  const success = await db.deleteCorrespondenceTemplate(companyId, id);
  if (!success) return res.status(404).json({ error: 'Template not found' });
  res.json({ success: true });
});

// Track usage + set lastUsedAt when a template is applied to a draft
app.post('/api/firm/:companyId/correspondence-templates/:id/use', async (req, res) => {
  const { companyId, id } = req.params;
  const updated = await db.incrementTemplateUsage(companyId, id);
  if (!updated) return res.status(404).json({ error: 'Template not found' });
  res.json(updated);
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

app.put('/api/firm/:companyId/documents/:docId/approve', async (req, res) => {
  const { companyId, docId } = req.params;
  const currentUser = req.user as any;
  const updated = await db.updateGeneratedDocument(companyId, docId, {
    approvalStatus: 'Approved',
    approvedById: currentUser?.id || null,
    approvedAt: new Date().toISOString()
  });
  if (!updated) return res.status(404).json({ error: 'Document not found' });
  res.json(updated);
});

// ─── CLAUSES ENDPOINTS ────────────────────────────────────────────────
app.get('/api/firm/:companyId/clauses', async (req, res) => {
  const list = await db.getClauses(req.params.companyId);
  res.json(list);
});

app.post('/api/firm/:companyId/clauses', async (req, res) => {
  const { companyId } = req.params;
  const currentUser = req.user as any;
  const created = await db.createClause(companyId, {
    ...req.body,
    createdById: currentUser?.id || null
  });
  res.json(created);
});

app.put('/api/firm/:companyId/clauses/:id', async (req, res) => {
  const { companyId, id } = req.params;
  const updated = await db.updateClause(companyId, id, req.body);
  if (!updated) return res.status(404).json({ error: 'Clause not found' });
  res.json(updated);
});

app.delete('/api/firm/:companyId/clauses/:id', async (req, res) => {
  const { companyId, id } = req.params;
  const success = await db.deleteClause(companyId, id);
  if (!success) return res.status(404).json({ error: 'Clause not found' });
  res.json({ success: true });
});

app.post('/api/firm/:companyId/clauses/:id/use', async (req, res) => {
  const { companyId, id } = req.params;
  const updated = await db.incrementClauseUsage(companyId, id);
  if (!updated) return res.status(404).json({ error: 'Clause not found' });
  res.json(updated);
});

// ─── COURT BUNDLES ENDPOINTS ──────────────────────────────────────────
app.get('/api/firm/:companyId/bundles', async (req, res) => {
  const list = await db.getCompanyCourtBundles(req.params.companyId);
  res.json(list);
});

app.get('/api/firm/:companyId/cases/:caseId/bundles', async (req, res) => {
  const list = await db.getCaseCourtBundles(req.params.companyId, req.params.caseId);
  res.json(list);
});

app.post('/api/firm/:companyId/cases/:caseId/bundles', async (req, res) => {
  const { companyId, caseId } = req.params;
  const created = await db.createCourtBundle(companyId, caseId, req.body);
  res.json(created);
});

app.put('/api/firm/:companyId/bundles/:id', async (req, res) => {
  const { companyId, id } = req.params;
  const updated = await db.updateCourtBundle(companyId, id, req.body);
  if (!updated) return res.status(404).json({ error: 'Bundle not found' });
  res.json(updated);
});

app.post('/api/firm/:companyId/bundles/:id/compile', async (req, res) => {
  const { companyId, id } = req.params;
  const bundle = await db.getCourtBundle(id);
  if (!bundle) return res.status(404).json({ error: 'Bundle not found' });

  try {
    const mergedPdf = await PDFDocument.create();
    const helveticaFont = await mergedPdf.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);

    // 1. Cover page
    const coverPage = mergedPdf.addPage([595.28, 841.89]); // A4 Size
    coverPage.drawText('REPUBLIC OF KENYA', { x: 230, y: 750, size: 14, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });
    coverPage.drawText('IN THE HIGH COURT OF KENYA', { x: 190, y: 720, size: 12, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });
    coverPage.drawText(`AT ${bundle.court.toUpperCase()}`, { x: 210, y: 700, size: 12, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });

    coverPage.drawText('LITIGATION SUBMISSION BUNDLE', { x: 150, y: 550, size: 18, font: helveticaBold, color: rgb(0.15, 0.35, 0.6) });
    
    coverPage.drawText(`TITLE: ${bundle.title}`, { x: 80, y: 450, size: 11, font: helveticaBold });
    coverPage.drawText(`VERSION: ${bundle.version}`, { x: 80, y: 420, size: 10, font: helveticaFont });
    coverPage.drawText(`COMPILED ON: ${new Date().toISOString().split('T')[0]} (EAT)`, { x: 80, y: 390, size: 10, font: helveticaFont });
    coverPage.drawText('STATUS: CERTIFIED FINAL RECORDS', { x: 80, y: 360, size: 11, font: helveticaBold, color: rgb(0.1, 0.5, 0.2) });

    // Footer decoration
    coverPage.drawLine({ start: { x: 50, y: 150 }, end: { x: 545, y: 150 }, thickness: 1.5, color: rgb(0.7, 0.7, 0.7) });
    coverPage.drawText('GENERATED BY DOCKET LITIGATION SUITE • CONFIDENTIAL', { x: 160, y: 120, size: 8, font: helveticaFont, color: rgb(0.5, 0.5, 0.5) });

    // 2. Index page
    const indexPage = mergedPdf.addPage([595.28, 841.89]);
    indexPage.drawText('TABLE OF CONTENTS & INDEX', { x: 50, y: 780, size: 14, font: helveticaBold });
    indexPage.drawLine({ start: { x: 50, y: 765 }, end: { x: 545, y: 765 }, thickness: 1 });

    let currentY = 730;
    const docOrder = typeof bundle.documentOrder === 'string' ? JSON.parse(bundle.documentOrder) : bundle.documentOrder;

    if (Array.isArray(docOrder)) {
      let tabNum = 1;
      for (const item of docOrder) {
        let labelText = '';
        if (item.type === 'generated') {
          const doc = await db.getGeneratedDocument(companyId, item.id);
          labelText = doc ? `Generated Document: ${doc.content.substring(0, 40)}...` : `Generated Pleading [ID: ${item.id}]`;
        } else {
          const file = await db.getCaseFile(companyId, item.id);
          labelText = file ? `Uploaded File: ${file.fileName}` : `Exhibit File [ID: ${item.id}]`;
        }
        
        indexPage.drawText(`TAB ${tabNum}:`, { x: 60, y: currentY, size: 10, font: helveticaBold });
        indexPage.drawText(labelText, { x: 120, y: currentY, size: 10, font: helveticaFont });
        if (item.dividerLabel) {
          indexPage.drawText(`[Divider: ${item.dividerLabel}]`, { x: 420, y: currentY, size: 9, font: helveticaFont, color: rgb(0.5, 0.5, 0.5) });
        }
        
        currentY -= 25;
        tabNum++;
        
        if (currentY < 100) {
          break;
        }
      }
    }

    // 3. Document contents
    if (Array.isArray(docOrder)) {
      let idx = 1;
      for (const item of docOrder) {
        if (item.dividerLabel) {
          const divPage = mergedPdf.addPage([595.28, 841.89]);
          divPage.drawSquare({ x: 100, y: 300, size: 400, color: rgb(0.97, 0.97, 0.97) });
          divPage.drawText(`TAB ${idx}`, { x: 250, y: 550, size: 28, font: helveticaBold, color: rgb(0.15, 0.35, 0.6) });
          divPage.drawText(item.dividerLabel.toUpperCase(), { x: 150, y: 480, size: 16, font: helveticaBold });
          divPage.drawLine({ start: { x: 150, y: 450 }, end: { x: 450, y: 450 }, thickness: 2, color: rgb(0.15, 0.35, 0.6) });
        }

        if (item.type === 'generated') {
          const doc = await db.getGeneratedDocument(companyId, item.id);
          if (doc) {
            const docText = doc.content;
            const lines = docText.split('\n');
            let contentPage = mergedPdf.addPage([595.28, 841.89]);
            contentPage.drawText(`TAB ${idx} CONTENT: GENERATED PLEADING`, { x: 50, y: 800, size: 9, font: helveticaBold, color: rgb(0.5, 0.5, 0.5) });
            
            let textY = 750;
            for (const line of lines) {
              if (textY < 60) {
                contentPage = mergedPdf.addPage([595.28, 841.89]);
                contentPage.drawText(`TAB ${idx} CONTENT: GENERATED PLEADING (CONTINUED)`, { x: 50, y: 800, size: 9, font: helveticaBold, color: rgb(0.5, 0.5, 0.5) });
                textY = 750;
              }
              const slicedLine = line.substring(0, 95);
              contentPage.drawText(slicedLine, { x: 50, y: textY, size: 9, font: helveticaFont });
              textY -= 15;
            }
          }
        } else if (item.type === 'file') {
          const file = await db.getCaseFile(companyId, item.id);
          if (file && file.storageKey) {
            try {
              const { body } = await downloadFileDirect(file.storageKey);
              let fileBuffer: Buffer;
              if (body instanceof Buffer) {
                fileBuffer = body;
              } else if (body && typeof body.transformToByteArray === 'function') {
                fileBuffer = Buffer.from(await body.transformToByteArray());
              } else if (body && typeof body.read === 'function') {
                const chunks: any[] = [];
                for await (const chunk of body) {
                  chunks.push(chunk);
                }
                fileBuffer = Buffer.concat(chunks);
              } else {
                throw new Error('Unsupported stream type for pdf merging');
              }

              if (file.mimeType === 'application/pdf') {
                const subPdf = await PDFDocument.load(fileBuffer);
                const copiedPages = await mergedPdf.copyPages(subPdf, subPdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
              } else {
                let contentPage = mergedPdf.addPage([595.28, 841.89]);
                contentPage.drawText(`TAB ${idx} CONTENT: ${file.fileName}`, { x: 50, y: 800, size: 9, font: helveticaBold, color: rgb(0.5, 0.5, 0.5) });
                contentPage.drawText(`[Non-PDF attachment file rendered as visual placeholder. Download original file in client portal.]`, { x: 50, y: 700, size: 10, font: helveticaFont });
              }
            } catch (err: any) {
              console.error('Failed to copy sub-pdf pages:', err);
              const errPage = mergedPdf.addPage([595.28, 841.89]);
              errPage.drawText(`TAB ${idx} CONTENT: COMPILATION ERROR`, { x: 50, y: 800, size: 9, font: helveticaBold, color: rgb(0.9, 0.1, 0.1) });
              errPage.drawText(`Error compiling file "${file.fileName}": ${err.message}`, { x: 50, y: 700, size: 10, font: helveticaFont });
            }
          }
        }
        idx++;
      }
    }

    const pdfBytes = await mergedPdf.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    const { storageKey } = await uploadFileDirect(companyId, bundle.caseId, `Compiled_Bundle_${id}.pdf`, 'application/pdf', pdfBuffer);

    const updated = await db.updateCourtBundle(companyId, id, {
      storageKey,
      status: 'Final',
      version: bundle.version + 1
    });

    res.json(updated);
  } catch (err: any) {
    console.error('Failed to compile court bundle:', err);
    res.status(500).json({ error: 'Failed to compile court bundle: ' + err.message });
  }
});

app.get('/api/firm/:companyId/bundles/:id/download', async (req, res) => {
  const { companyId, id } = req.params;
  const bundle = await db.getCourtBundle(id);
  if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
  if (!bundle.storageKey) return res.status(400).json({ error: 'Bundle is not compiled yet' });

  try {
    const { body, contentType, contentLength } = await downloadFileDirect(bundle.storageKey);

    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(bundle.title)}.pdf"`);

    if (body && typeof body.pipe === 'function') {
      body.pipe(res);
    } else if (body && typeof body.transformToWebStream === 'function') {
      Readable.fromWeb(body.transformToWebStream() as any).pipe(res);
    } else {
      res.send(body);
    }
  } catch (err: any) {
    console.error('Failed to download compiled bundle:', err);
    res.status(500).json({ error: 'Failed to download compiled bundle: ' + err.message });
  }
});

// ─── ELECTRONIC SIGNATURES ENDPOINTS ──────────────────────────────────
app.get('/api/firm/:companyId/signature-requests', async (req, res) => {
  const list = await db.getSignatureRequests(req.params.companyId);
  res.json(list);
});

app.post('/api/firm/:companyId/signature-requests', async (req, res) => {
  const { companyId } = req.params;
  const { caseId, documentId, documentType, title, signingOrder, signatories } = req.body;

  let contentToHash = "SECURE DOCKET CERTIFICATION BYTES";
  if (documentType === 'generated' && documentId) {
    const genDoc = await db.getGeneratedDocument(companyId, documentId);
    if (genDoc) contentToHash = genDoc.content;
  } else if (documentType === 'file' && documentId) {
    const caseFile = await db.getCaseFile(companyId, documentId);
    if (caseFile) {
      contentToHash = `${caseFile.fileName}_${caseFile.fileSize}_${caseFile.storageKey}`;
    }
  }

  const documentHash = crypto.createHash('sha256').update(contentToHash).digest('hex');

  const created = await db.createSignatureRequest(companyId, caseId, {
    documentId,
    documentType,
    title,
    signingOrder,
    documentHash,
    status: 'Pending',
    signatories
  });

  res.json(created);
});

app.post('/api/firm/:companyId/signature-requests/:id/request-otp', async (req, res) => {
  const { companyId, id } = req.params;
  const { signatoryEmail } = req.body;

  const request = await db.getSignatureRequest(id);
  if (!request) return res.status(404).json({ error: 'Signature request not found' });

  const sigs = await db.getSignatories(id);
  const signatory = sigs.find((s: any) => s.email.toLowerCase() === signatoryEmail.toLowerCase());
  if (!signatory) return res.status(404).json({ error: 'Signatory not found' });

  const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpCodeHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  await db.updateSignatory(signatory.id, {
    otpCodeHash,
    otpExpiresAt
  });

  // Send real email with OTP
  await sendSignatureOTPEmail({
    to: signatory.email,
    signatoryName: signatory.name,
    documentTitle: request.title,
    otp: rawOtp
  });

  res.json({ success: true, message: 'OTP sent successfully to ' + signatory.email });
});

app.post('/api/firm/:companyId/signature-requests/:id/verify-otp', async (req, res) => {
  const { companyId, id } = req.params;
  const { signatoryEmail, otp } = req.body;

  const request = await db.getSignatureRequest(id);
  if (!request) return res.status(404).json({ error: 'Signature request not found' });

  const sigs = await db.getSignatories(id);
  const signatory = sigs.find((s: any) => s.email.toLowerCase() === signatoryEmail.toLowerCase());
  if (!signatory) return res.status(404).json({ error: 'Signatory not found' });

  if (!signatory.otpCodeHash || !signatory.otpExpiresAt) {
    return res.status(400).json({ error: 'No OTP requested or OTP has expired' });
  }

  if (new Date() > new Date(signatory.otpExpiresAt)) {
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  const computedHash = crypto.createHash('sha256').update(otp).digest('hex');
  if (computedHash !== signatory.otpCodeHash) {
    return res.status(400).json({ error: 'Invalid OTP code' });
  }

  res.json({ success: true, message: 'OTP verified successfully' });
});

app.post('/api/firm/:companyId/signature-requests/:id/sign', async (req, res) => {
  const { companyId, id } = req.params;
  const { signatoryEmail, otp, signatureTypedText } = req.body;

  const request = await db.getSignatureRequest(id);
  if (!request) return res.status(404).json({ error: 'Signature request not found' });

  const sigs = await db.getSignatories(id);
  const signatory = sigs.find((s: any) => s.email.toLowerCase() === signatoryEmail.toLowerCase());
  if (!signatory) return res.status(404).json({ error: 'Signatory not found' });

  if (!signatory.otpCodeHash || !signatory.otpExpiresAt) {
    return res.status(400).json({ error: 'Verification required' });
  }

  const computedHash = crypto.createHash('sha256').update(otp).digest('hex');
  if (computedHash !== signatory.otpCodeHash) {
    return res.status(400).json({ error: 'Invalid verification' });
  }

  const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  await db.updateSignatory(signatory.id, {
    status: 'Signed',
    signedAt: new Date().toISOString(),
    signatureTypedText,
    ipAddress,
    userAgent
  });

  // Check if all signatories have signed
  const updatedSigs = await db.getSignatories(id);
  const allSigned = updatedSigs.every((s: any) => s.status === 'Signed');
  if (allSigned) {
    await db.updateSignatureRequest(companyId, id, {
      status: 'Completed'
    });
  }

  res.json({ success: true, message: 'Document signed successfully' });
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
  const currentUser = req.user as any;
  const { caseId, message, fileUrl, replyToId, isOnRecord, mentions, references, attachments } = req.body;

  // Always use the authenticated session user — never trust client-supplied sentById
  const sentById = currentUser?.id;
  if (!sentById) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const msg = await db.createChatMessage(companyId, {
      caseId: caseId || null,
      sentById,
      message,
      fileUrl,
      readBy: [sentById],
      replyToId: replyToId || null,
      isOnRecord: !!isOnRecord,
      mentions: Array.isArray(mentions) ? mentions : [],
      references: Array.isArray(references) ? references : [],
      attachments: Array.isArray(attachments) ? attachments : null
    });

    const user = await db.getUser(sentById);
    res.json({
      ...msg,
      senderName: user ? user.fullName : "Unknown Staff",
      senderAvatar: user ? user.avatarUrl : null,
      senderRole: user ? user.role : "LAWYER"
    });
  } catch (err: any) {
    console.error('[Chat] Failed to create message:', err.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.put('/api/firm/:companyId/chat/:messageId', async (req, res) => {
  const { companyId, messageId } = req.params;
  const { message, isPinned } = req.body;
  
  let updated;
  if (isPinned !== undefined) {
    updated = await db.toggleChatMessagePin(messageId, !!isPinned);
  } else {
    updated = await db.updateChatMessage(messageId, message, new Date().toISOString());
  }

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

// ─── KYC DOCUMENT VERIFICATION + EXTRACTION (multimodal — actually reads the image) ──
const documentAiRateLimiter = createRateLimiter(10, 60 * 1000); // 10 uploads/min/IP — this costs real API money per call

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_DOC_BYTES = 8 * 1024 * 1024; // 8MB — plenty for a phone photo of a passport

app.post('/api/ai/verify-client-document', documentAiRateLimiter, async (req, res) => {
  const { fileBase64, mimeType, fileName } = req.body;

  if (!fileBase64 || !mimeType) {
    return res.status(400).json({ error: 'fileBase64 and mimeType are required' });
  }
  if (!ACCEPTED_MIME_TYPES.includes(mimeType)) {
    return res.status(400).json({ error: `Unsupported file type: ${mimeType}. Please upload a JPG, PNG, or PDF.` });
  }
  // base64 is ~33% larger than raw bytes — rough size check before we even call the AI
  const approxBytes = Math.floor(fileBase64.length * 0.75);
  if (approxBytes > MAX_DOC_BYTES) {
    return res.status(400).json({ error: 'File exceeds 8MB limit.' });
  }

  const ai = getAiClient();

  if (!ai) {
    // Honest failure — NOT a fabricated fake client. This is the fix: the old
    // fallback invented a random name/passport number/phone when AI was
    // unavailable. That's worse than doing nothing.
    return res.status(503).json({
      error: 'Document verification is not currently configured. Please enter client details manually.'
    });
  }

  try {
    const classifyAndExtractPrompt = `You are a strict document verification system for a law firm's client intake process.

Examine the attached image/document carefully. You must determine:
1. Is this a real, legible, official identity or supporting document (not a screenshot of unrelated content, a meme, a random photo, a blank page, or an illegible/corrupted image)?
2. What TYPE of document is it? Choose exactly one: "passport", "national_id", "drivers_license", "utility_bill", "retainer_agreement", "other_legal_document", or "unrelated"
3. How confident are you in this classification, from 0-100?
4. If and ONLY if it is a passport, national_id, or drivers_license with confidence 70 or above, extract the visible identity fields. Otherwise leave extractedFields fields empty/null.

Be strict. If the image is a person's face with no visible document, a random photo, a meme, a screenshot of a chat, or anything unrelated to identity/legal documentation, set isValidDocument to false and documentType to "unrelated" — do not guess or invent data.

Respond in JSON matching this exact schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: classifyAndExtractPrompt },
            { inlineData: { mimeType, data: fileBase64 } }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValidDocument: { type: Type.BOOLEAN },
            documentType: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            rejectionReason: { type: Type.STRING },
            extractedFields: {
              type: Type.OBJECT,
              properties: {
                fullName: { type: Type.STRING },
                idNumber: { type: Type.STRING },
                dateOfBirth: { type: Type.STRING },
                address: { type: Type.STRING },
                nationality: { type: Type.STRING },
                expiryDate: { type: Type.STRING }
              }
            }
          },
          required: ['isValidDocument', 'documentType', 'confidence']
        }
      }
    });

    const result = JSON.parse(response.text);
    const KYC_ACCEPTED_TYPES = ['passport', 'national_id', 'drivers_license'];

    if (!result.isValidDocument || !KYC_ACCEPTED_TYPES.includes(result.documentType) || result.confidence < 70) {
      return res.status(422).json({
        rejected: true,
        documentType: result.documentType,
        confidence: result.confidence,
        reason: result.rejectionReason || `This does not appear to be a valid identity document (detected: ${result.documentType}, confidence: ${result.confidence}%). Please upload a clear photo of a passport, national ID, or driver's license.`
      });
    }

    return res.json({
      rejected: false,
      documentType: result.documentType,
      confidence: result.confidence,
      extractedFields: result.extractedFields || {}
    });

  } catch (err: any) {
    console.error('[AI Document Verify] Failed:', err.message);
    // Fail closed, not open — never populate a form on an error we can't explain
    return res.status(503).json({ error: 'Document verification failed. Please try again or enter details manually.' });
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

// ─── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error] Unhandled error in request:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR'
  });
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