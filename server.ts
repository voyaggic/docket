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
import { sendInviteEmail, sendSuperadminLoginAlert } from './server/email';
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
const PORT = 3000;

app.set('trust proxy', 1);

app.use(express.json({ limit: '15mb' }));

const sessionStore = process.env.DATABASE_URL
  ? new (connectPgSimple(session))({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true,
    })
  : undefined; // falls back to MemoryStore in dev

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
app.use((req, res, next) => {
  if (db.isPlatformLocked() && req.path !== '/api/sa/unlock') {
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
      db.expireOldInvitations();
      const invitation = db.getInvitationByToken(invitationToken);
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
      let user = db.getUserByEmail(email);
      if (!user) {
        user = db.createUser({
          companyId: invitation.companyId,
          fullName: profile.displayName || email.split('@')[0],
          email,
          avatarUrl: profile.photos?.[0]?.value || 
            `https://api.dicebear.com/7.x/initials/svg?seed=${profile.displayName}`,
          role: invitation.role as any,
          isActive: true,
          isSuperAdmin: false
        });

        // Trigger pre-population of company with complete demo data from default template
        try {
          (db as any).cloneDemoDataToCompany(invitation.companyId, user.id);
        } catch (cloneErr) {
          console.error("Failed to pre-seed company with demo data:", cloneErr);
        }
        db.updateCompany(invitation.companyId, { setupComplete: true });
      }
      
      db.markInvitationAccepted(invitation.id);
      return done(null, user);
      
    } else {
      // Returning user login
      const user = db.getUserByEmail(email);
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

passport.deserializeUser((id: string, done) => {
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
  const user = db.getUser(id);
  if (user) {
    const freshUser = { ...user } as any;
    const company = freshUser.companyId ? db.getCompany(freshUser.companyId) : null;
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
  } as any, (err: any, user: any, info: any) => {
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
      const company = user.companyId ? db.getCompany(user.companyId) : null;
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

app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = req.user as any;
  const company = user.companyId ? db.getCompany(user.companyId) : null;
  const settings = user.companyId ? db.getSettings(user.companyId) : null;
  res.json({
    user,
    company,
    settings
  });
});

app.post('/api/auth/invite/bypass', (req, res, next) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  db.expireOldInvitations();
  const invitation = db.getInvitationByToken(token);
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation not found or has expired.' });
  }
  if (new Date(invitation.expiresAt) < new Date()) {
    return res.status(400).json({ error: 'Invitation link has expired.' });
  }

  // Find or create the user
  let user = db.getUserByEmail(invitation.email);
  if (!user) {
    user = db.createUser({
      companyId: invitation.companyId,
      fullName: invitation.email.split('@')[0],
      email: invitation.email,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(invitation.email)}`,
      role: invitation.role as any,
      isActive: true,
      isSuperAdmin: false
    });

    // Populate company with complete demo data
    try {
      (db as any).cloneDemoDataToCompany(invitation.companyId, user.id);
    } catch (cloneErr) {
      console.error("Failed to pre-seed company with demo data:", cloneErr);
    }
    db.updateCompany(invitation.companyId, { setupComplete: true });
  }

  db.markInvitationAccepted(invitation.id);

  req.logIn(user, (err) => {
    if (err) return next(err);
    
    // Determine the redirect URL
    const company = db.getCompany(user.companyId);
    const redirectUrl = (!company || !company.setupComplete) ? '/onboarding' : '/dashboard';
    return res.json({ success: true, redirectUrl });
  });
});

app.post('/api/auth/bypass', (req, res, next) => {
  const email = 'voyyagic@gmail.com';
  let user = db.getUserByEmail(email);
  if (!user) {
    const companies = db.getCompanies();
    let company = companies[0];
    if (!company) {
      company = db.createCompany({
        name: "Docket Legal Chambers",
        slug: "docket-chambers",
        setupComplete: true,
        isActive: true
      });
    }
    user = db.createUser({
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
    const comp = db.getCompany(user.companyId);
    if (comp && !comp.setupComplete) {
      db.updateCompany(user.companyId, { setupComplete: true });
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

app.post('/api/auth/session/refresh', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = req.user as any;
  const freshUser = db.getUser(user.id);
  if (!freshUser) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  req.logIn(freshUser, (err) => {
    if (err) return res.status(500).json({ error: 'Session refresh failed' });
    const company = freshUser.companyId ? db.getCompany(freshUser.companyId) : null;
    const settings = freshUser.companyId ? db.getSettings(freshUser.companyId) : null;
    res.json({
      user: freshUser,
      company,
      settings
    });
  });
});

app.post('/api/registration/submit', (req, res) => {
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

  const existingUser = db.getUserByEmail(email);
  if (existingUser) {
    return res.status(400).json({ error: 'This email is already registered.' });
  }

  const freeDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com', 'aol.com', 'mail.com'];
  const isFreeDomain = freeDomains.some(domain => email.toLowerCase().endsWith(domain));

  const companies = db.getCompanies();
  const isDuplicateFirm = companies.some(c => getSimilarity(c.name, firmName) >= 0.82);

  let riskScore = 'low';
  if (isDuplicateFirm) {
    riskScore = 'high';
  } else if (isFreeDomain) {
    riskScore = 'medium';
  }

  // All registrations go to superadmin queue regardless of risk score.
  // No firm gets access until you manually approve it from your panel.
  db.createRegistrationRequest({
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

app.get('/api/registration/status', (req, res) => {
  const email = req.query.email as string;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const requests = db.getRegistrationRequests();
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

app.get('/api/invitations/:token', (req, res) => {
  const invitation = db.getInvitationByToken(req.params.token);
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation not found or has expired.' });
  }
  const company = db.getCompany(invitation.companyId);
  res.json({
    email: invitation.email,
    firmName: company ? company.name : 'Unknown Firm',
    role: invitation.role,
    expired: new Date(invitation.expiresAt) < new Date(),
    isActive: invitation.isActive
  });
});

app.post('/api/invitations/send', (req, res) => {
  if (!req.user) {
    return res.status(404).json({ error: 'Not authenticated' });
  }
  const user = req.user as any;
  if (user.role !== 'admin' && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Unauthorized access' });
  }

  const { email, role, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  db.createInvitation({
    companyId: user.companyId,
    email,
    role: role || 'lawyer',
    name,
    tokenHash,
    expiresAt,
    isActive: true
  });

  const inviteLink = `https://${req.get('host')}/invite/${rawToken}`;
  console.log(`
======================================================================
EMAIL SIMULATION (TO: ${email})
Subject: Welcome to Docket - Access Invitation
Body:
Hello ${name || 'there'},

You have been invited to join the Docket platform for your firm.
Role: ${role}

Click the secure link below to accept and complete your registration using Google:
${inviteLink}

This link is valid for 48 hours.
======================================================================
  `);

  res.json({ success: true, token: rawToken });
});

app.post('/api/superadmin/auth/login', (req, res) => {
  const { email, password } = req.body;
  const superadminEmail = process.env.SUPERADMIN_EMAIL || 'voyyagic@gmail.com';
  const superadminKey = process.env.SUPERADMIN_SECRET_KEY || 'docket_master_2026';
  
  if (email === superadminEmail && password === superadminKey) {
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

app.get('/api/superadmin/registrations', isSuperadminAuthenticated, (req, res) => {
  const requests = db.getRegistrationRequests();
  res.json(requests);
});

app.post('/api/superadmin/registrations/:id/approve', isSuperadminAuthenticated, (req, res) => {
  const ip = getRequestIP(req);
  const request = db.getRegistrationRequests().find(r => r.id === req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Registration request not found' });
  }
  if (request.status !== 'needs_review') {
    return res.status(400).json({ error: 'Only pending requests can be reviewed' });
  }

  // Create Company
  const slug = request.firmName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const company = db.createCompany({
    name: request.firmName,
    slug,
    setupComplete: false,
    isActive: true
  });

  // Generate Invite Token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  db.createInvitation({
    companyId: company.id,
    email: request.email,
    role: 'admin',
    name: request.registrantName,
    tokenHash,
    expiresAt,
    isActive: true
  });

  // Update request status
  db.updateRegistrationRequest(request.id, { status: 'approved', companyId: company.id, inviteToken: rawToken });

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

app.post('/api/superadmin/registrations/:id/reject', isSuperadminAuthenticated, (req, res) => {
  const ip = getRequestIP(req);
  const request = db.getRegistrationRequests().find(r => r.id === req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Registration request not found' });
  }
  if (request.status !== 'needs_review') {
    return res.status(400).json({ error: 'Only pending requests can be reviewed' });
  }

  db.updateRegistrationRequest(request.id, { status: 'rejected' });
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

app.get('/api/firm/status', (req, res) => {
  const email = 'voyyagic@gmail.com'; // Admin user segment from email context
  const user = db.getUserByEmail(email);
  if (user && user.companyId) {
    const company = db.getCompany(user.companyId);
    if (company && company.setupComplete) {
      const settings = db.getSettings(user.companyId);
      return res.json({
        initialized: true,
        company,
        settings
      });
    }
  }
  res.json({ initialized: false });
});

app.post('/api/firm/setup', (req, res) => {
  const { settings, team } = req.body;
  const loggedInUser = req.user as any;
  const adminEmail = loggedInUser?.email || process.env.SUPERADMIN_EMAIL || 'voyyagic@gmail.com';

  const firmName = settings?.firmName || "Docket Legal Partners";
  const slug = firmName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // First: if logged-in user already has a company (from invitation), update that one
  let company;
  if (loggedInUser?.companyId) {
    const existingCompany = db.getCompany(loggedInUser.companyId);
    if (existingCompany) {
      db.updateCompany(existingCompany.id, { setupComplete: true, name: firmName, slug });
      company = db.getCompany(existingCompany.id)!;
    }
  }

  // Fallback: find by name or create new
  if (!company) {
    company = db.getCompanies().find(c => c.name.toLowerCase() === firmName.toLowerCase());
    if (!company) {
      company = db.createCompany({
        name: firmName,
        slug,
        setupComplete: true,
        isActive: true
      });
    } else {
      db.updateCompany(company.id, { setupComplete: true });
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
  const updatedSettings = db.updateSettings(company.id, {
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
    team.forEach(t => {
      const existingUser = db.getUserByEmail(t.email);
      if (!existingUser) {
        db.createUser({
          companyId: company!.id,
          fullName: t.fullName,
          email: t.email,
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${t.fullName}`,
          role: t.role || UserRole.LAWYER,
          isActive: true,
          isSuperAdmin: t.email.toLowerCase() === adminEmail.toLowerCase()
        });
      } else {
        db.updateUser(existingUser.id, {
          companyId: company!.id,
          role: t.role || existingUser.role,
          isActive: true
        });
      }
    });
  }

  // Ensure Admin Uservoyyagic@gmail.com is linked to the active company
  const adminUser = db.getUserByEmail(adminEmail);
  if (!adminUser) {
    db.createUser({
      companyId: company.id,
      fullName: "Alex Rivera",
      email: adminEmail,
      avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Alex",
      role: UserRole.ADMIN,
      isActive: true,
      isSuperAdmin: true
    });
  } else {
    db.updateUser(adminUser.id, {
      companyId: company.id,
      isActive: true
    });
  }

  // Initialize feature flags
  db.getFeatureFlags(company.id);

  res.json({ success: true, company, settings: updatedSettings });
});

app.post('/api/firm/reset-onboarding', (req, res) => {
  const email = 'voyyagic@gmail.com';
  const user = db.getUserByEmail(email);
  if (user && user.companyId) {
    db.updateCompany(user.companyId, { setupComplete: false });
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Active firm not found to reset" });
});

// ─── AUTH LOGIC ──────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    // If user does not exist, return redirect setup payload
    return res.json({ redirectSetup: true, email });
  }

  if (!user.isActive) {
    return res.status(403).json({ error: "Your account is deactivated. Please contact your administrator." });
  }

  // Check if company is suspended
  if (user.companyId) {
    const comp = db.getCompany(user.companyId);
    if (comp && !comp.isActive) {
      return res.status(403).json({ error: "Your firm is suspended. Please contact platform support." });
    }
  }

  res.json({ user });
});

app.post('/api/auth/register', (req, res) => {
  const { email, firmName, caseTypes, courts, referenceFormat, address, phone } = req.body;
  if (!email || !firmName) {
    return res.status(400).json({ error: "Email and Firm Name are required" });
  }

  // Create company
  const slug = firmName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const company = db.createCompany({
    name: firmName,
    slug,
    setupComplete: true,
    isActive: true
  });

  // Create settings
  db.updateSettings(company.id, {
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
  const user = db.createUser({
    companyId: company.id,
    fullName: email.split('@')[0],
    email,
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${email}`,
    role: UserRole.ADMIN,
    isActive: true,
    isSuperAdmin: isSuper
  });

  // Pre-populate flags
  db.getFeatureFlags(company.id);

  res.json({ user });
});

// ─── FIRM SETTINGS & FLAGS ───────────────────────────────────────────────────

app.get('/api/firm/:companyId', (req, res) => {
  const { companyId } = req.params;
  const company = db.getCompany(companyId);
  if (!company) {
    return res.status(404).json({ error: "Company not found" });
  }
  const settings = db.getSettings(companyId);
  const flags = db.getFeatureFlags(companyId);
  const announcements = db.getAnnouncements(companyId);

  res.json({
    company,
    settings,
    flags,
    announcements
  });
});

app.put('/api/firm/:companyId/settings', (req, res) => {
  const { companyId } = req.params;
  const updates = req.body;
  const updated = db.updateSettings(companyId, updates);
  res.json(updated);
});

app.post('/api/firm/:companyId/settings', (req, res) => {
  const { companyId } = req.params;
  const updates = req.body;
  const updated = db.updateSettings(companyId, updates);
  res.json(updated);
});

// ─── TEAM MEMBERS ────────────────────────────────────────────────────────────

app.get('/api/firm/:companyId/users', (req, res) => {
  const { companyId } = req.params;
  res.json(db.getUsers(companyId));
});

app.post('/api/firm/:companyId/users', (req, res) => {
  const { companyId } = req.params;
  const { fullName, email, role } = req.body;
  
  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: "User already exists with this email" });
  }

  const added = db.createUser({
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

app.put('/api/firm/:companyId/users/:userId', (req, res) => {
  const { userId } = req.params;
  const updates = req.body;
  const updated = db.updateUser(userId, updates);
  res.json(updated);
});

// ─── CLIENTS ──────────────────────────────────────────────────────────────────

app.get('/api/firm/:companyId/clients', (req, res) => {
  res.json(db.getClients(req.params.companyId));
});

app.post('/api/firm/:companyId/clients', (req, res) => {
  const { companyId } = req.params;
  const created = db.createClient(companyId, req.body);
  res.json(created);
});

app.put('/api/firm/:companyId/clients/:clientId', (req, res) => {
  const { companyId, clientId } = req.params;
  const updated = db.updateClient(companyId, clientId, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Client not found' });
  }
});

app.delete('/api/firm/:companyId/clients/:clientId', (req, res) => {
  const { companyId, clientId } = req.params;
  const success = db.deleteClient(companyId, clientId);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Client not found' });
  }
});

// ─── CASES ────────────────────────────────────────────────────────────────────

app.get('/api/firm/:companyId/cases', (req, res) => {
  const list = db.getCases(req.params.companyId);
  // Join with clients
  const enriched = list.map(c => {
    const client = db.getClient(req.params.companyId, c.clientId);
    return { ...c, client };
  });
  res.json(enriched);
});

app.post('/api/firm/:companyId/cases', (req, res) => {
  const { companyId } = req.params;
  const { clientId, referenceNumber, caseType, court, opposingParty, assignedLawyerId, currentStage, notes } = req.body;
  
  // Create case
  const created = db.createCase(companyId, {
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
  db.createCaseEvent(companyId, {
    caseId: created.id,
    createdById: assignedLawyerId,
    eventType: "Status",
    title: "Case Matter Initialized",
    description: `Opening a new case file under system reference ${referenceNumber || created.id}. Initial stage is ${currentStage || "Client Consultation"}.`,
    eventDate: new Date().toISOString()
  });

  // Client update pref trigger
  const settings = db.getSettings(companyId);
  const client = db.getClient(companyId, clientId);
  if (settings.updatePreferences.workflow !== "manual" && client) {
    // Generate draft
    const clientName = client.fullName;
    db.createClientUpdate(companyId, {
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

app.get('/api/firm/:companyId/cases/:caseId', (req, res) => {
  const { companyId, caseId } = req.params;
  const c = db.getCase(companyId, caseId);
  if (!c) return res.status(404).json({ error: "Case not found" });
  
  const client = db.getClient(companyId, c.clientId);
  const events = db.getCaseEvents(companyId, caseId);
  const deadlines = db.getCaseDeadlines(companyId, caseId);
  const docs = db.getCaseGeneratedDocuments(companyId, caseId);
  const updates = db.getClientUpdates(companyId).filter(u => u.caseId === caseId);

  res.json({
    ...c,
    client,
    events,
    deadlines,
    docs,
    updates
  });
});

app.post('/api/firm/:companyId/cases/:caseId/events', (req, res) => {
  const { companyId, caseId } = req.params;
  const { createdById, eventType, title, description, eventDate } = req.body;

  const event = db.createCaseEvent(companyId, {
    caseId,
    createdById,
    eventType,
    title,
    description,
    eventDate: eventDate || new Date().toISOString()
  });

  // Trigger Client Update check
  const c = db.getCase(companyId, caseId);
  const settings = db.getSettings(companyId);
  if (c && settings.updatePreferences.workflow !== "manual") {
    const client = db.getClient(companyId, c.clientId);
    if (client) {
      db.createClientUpdate(companyId, {
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

app.put('/api/firm/:companyId/cases/:caseId', (req, res) => {
  const { companyId, caseId } = req.params;
  const updated = db.updateCase(companyId, caseId, req.body);
  res.json(updated);
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
app.get('/api/calendar/status', (req, res) => {
  const user = req.user as any;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const tokens = db.getUserCalendarTokens(user.id);
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
app.delete('/api/calendar/google/disconnect', (req, res) => {
  const user = req.user as any;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  db.clearUserCalendarTokens(user.id);
  res.json({ success: true });
});

// ─── DEADLINES & NOTIFICATIONS ───────────────────────────────────────────────

app.get('/api/firm/:companyId/deadlines', (req, res) => {
  const list = db.getDeadlines(req.params.companyId);
  // Enrich case name
  const enriched = list.map(d => {
    const c = db.getCase(req.params.companyId, d.caseId);
    let clientName = "General Matter";
    if (c) {
      const cli = db.getClient(req.params.companyId, c.clientId);
      if (cli) clientName = cli.fullName;
    }
    return { ...d, clientName, caseRef: c?.referenceNumber || "DK-Matter" };
  });
  res.json(enriched);
});

app.post('/api/firm/:companyId/deadlines', async (req, res) => {
  const { companyId } = req.params;
  const created = db.createDeadline(companyId, req.body);

  // Auto-sync to Google Calendar if user has it connected
  const currentUser = req.user as any;
  if (currentUser && created) {
    try {
      const calTokens = db.getUserCalendarTokens(currentUser.id);
      if (calTokens) {
        const caseData = db.getCase(companyId, created.caseId);
        const clientData = caseData ? db.getClient(companyId, caseData.clientId) : null;
        const settings = db.getSettings(companyId);

        const eventId = await createCalendarEvent(currentUser.id, created, {
          caseName: caseData?.referenceNumber || 'Unknown Case',
          clientName: clientData?.fullName || 'Unknown Client',
          firmName: settings?.firmName || '',
        });

        if (eventId) {
          db.updateDeadlineCalendarEventId(companyId, created.id, eventId);
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
  const list = db.getDeadlines(companyId);
  const oldDeadline = list.find(d => d.id === deadId);
  const existingEventId = (oldDeadline as any)?.googleCalendarEventId;

  const updated = db.updateDeadline(companyId, deadId, req.body);

  const currentUser = req.user as any;
  if (currentUser && updated) {
    try {
      if (updated.isResolved) {
        // If resolved, delete calendar event if it exists
        if (existingEventId) {
          await deleteCalendarEvent(currentUser.id, existingEventId);
          db.updateDeadlineCalendarEventId(companyId, deadId, null);
        }
      } else {
        // Check if there's an existing calendar event to update or if we should create one now
        const calTokens = db.getUserCalendarTokens(currentUser.id);
        if (calTokens) {
          const caseData = db.getCase(companyId, updated.caseId);
          const clientData = caseData ? db.getClient(companyId, caseData.clientId) : null;
          const settings = db.getSettings(companyId);

          if (existingEventId) {
            await updateCalendarEvent(currentUser.id, existingEventId, updated, {
              caseName: caseData?.referenceNumber,
              clientName: clientData?.fullName,
            });
          } else {
            // Synced calendar token present, but no event created previously (probably created offline/before connection)
            const eventId = await createCalendarEvent(currentUser.id, updated, {
              caseName: caseData?.referenceNumber || 'Unknown Case',
              clientName: clientData?.fullName || 'Unknown Client',
              firmName: settings?.firmName || '',
            });
            if (eventId) {
              db.updateDeadlineCalendarEventId(companyId, deadId, eventId);
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

app.get('/api/firm/:companyId/updates', (req, res) => {
  const list = db.getClientUpdates(req.params.companyId);
  // Join client & case
  const enriched = list.map(u => {
    const cli = db.getClient(req.params.companyId, u.clientId);
    const cs = db.getCase(req.params.companyId, u.caseId);
    return { ...u, client: cli, caseRef: cs?.referenceNumber };
  });
  res.json(enriched);
});

app.post('/api/firm/:companyId/updates', (req, res) => {
  const { companyId } = req.params;
  const created = db.createClientUpdate(companyId, req.body);
  res.json(created);
});

app.put('/api/firm/:companyId/updates/:updateId', (req, res) => {
  const { companyId, updateId } = req.params;
  const updated = db.updateClientUpdate(companyId, updateId, req.body);
  res.json(updated);
});

// Send Update endpoint (Simulates WhatsApp, SMS, Email and tracks channel log!)
app.post('/api/firm/:companyId/updates/:updateId/send', (req, res) => {
  const { companyId, updateId } = req.params;
  const { channels } = req.body; // e.g. {email: true, whatsapp: true, sms: false}

  const list = db.updateClientUpdate(companyId, updateId, {
    status: ClientUpdateStatus.SENT,
    channelsSent: channels,
    sentAt: new Date().toISOString()
  });

  res.json({ success: true, update: list });
});

// ─── CONSENT LOGGER ──────────────────────────────────────────────────────────

app.post('/api/firm/:companyId/consent', (req, res) => {
  const { companyId } = req.params;
  const log = db.createConsentLog(companyId, req.body);
  res.json({ success: true, log });
});

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────

app.get('/api/firm/:companyId/templates', (req, res) => {
  res.json(db.getTemplates(req.params.companyId));
});

app.post('/api/firm/:companyId/templates', (req, res) => {
  const { companyId } = req.params;
  const created = db.createTemplate(companyId, req.body);
  res.json(created);
});

app.delete('/api/firm/:companyId/templates/:id', (req, res) => {
  const { companyId, id } = req.params;
  db.deleteTemplate(companyId, id);
  res.json({ success: true });
});

app.get('/api/firm/:companyId/documents', (req, res) => {
  const list = db.getGeneratedDocuments(req.params.companyId);
  // Join info
  const enriched = list.map(d => {
    const cs = db.getCase(req.params.companyId, d.caseId);
    let cliName = "Pending";
    if (cs) {
      const cli = db.getClient(req.params.companyId, cs.clientId);
      if (cli) cliName = cli.fullName;
    }
    return { ...d, caseRef: cs?.referenceNumber, clientName: cliName };
  });
  res.json(enriched);
});

app.post('/api/firm/:companyId/documents', (req, res) => {
  const { companyId } = req.params;
  const created = db.createGeneratedDocument(companyId, req.body);
  res.json(created);
});

// ─── TEAM CHAT SECTION ───────────────────────────────────────────────────────

app.get('/api/firm/:companyId/chat', (req, res) => {
  const { companyId } = req.params;
  const { caseId } = req.query;
  const messages = db.getChatMessages(companyId, caseId ? String(caseId) : null);
  
  // Enrich sender info
  const enriched = messages.map(m => {
    const user = db.getUser(m.sentById);
    return {
      ...m,
      senderName: user ? user.fullName : "Unknown Staff",
      senderAvatar: user ? user.avatarUrl : null,
      senderRole: user ? user.role : "LAWYER"
    };
  });
  res.json(enriched);
});

app.post('/api/firm/:companyId/chat', (req, res) => {
  const { companyId } = req.params;
  const { caseId, sentById, message, fileUrl, replyToId, isOnRecord, mentions, references } = req.body;
  const msg = db.createChatMessage(companyId, {
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

  const user = db.getUser(sentById);
  res.json({
    ...msg,
    senderName: user ? user.fullName : "Unknown Staff",
    senderAvatar: user ? user.avatarUrl : null,
    senderRole: user ? user.role : "LAWYER"
  });
});

app.put('/api/firm/:companyId/chat/:messageId', (req, res) => {
  const { companyId, messageId } = req.params;
  const { message } = req.body;
  const updated = db.updateChatMessage(messageId, message, new Date().toISOString());
  if (updated) {
    const user = db.getUser(updated.sentById);
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

app.delete('/api/firm/:companyId/chat/:messageId', (req, res) => {
  const { companyId, messageId } = req.params;
  const deleted = db.deleteChatMessage(messageId);
  if (deleted) {
    const user = db.getUser(deleted.sentById);
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

app.post('/api/firm/:companyId/chat/:messageId/react', (req, res) => {
  const { companyId, messageId } = req.params;
  const { emoji, userId } = req.body;
  const updated = db.toggleChatMessageReaction(messageId, emoji, userId);
  if (updated) {
    const user = db.getUser(updated.sentById);
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

app.post('/api/firm/:companyId/chat/:messageId/record', (req, res) => {
  const { companyId, messageId } = req.params;
  const { userId } = req.body;
  const updated = db.markChatMessageOnRecord(messageId, userId);
  if (updated) {
    if (updated.caseId) {
      db.createCaseEvent(companyId, {
        caseId: updated.caseId,
        createdById: userId,
        eventType: 'RECORD',
        title: 'Logged Chat to Matter Record',
        description: `Chat message logged officially on record. Message preview: "${updated.message.substring(0, 80)}..."`,
        eventDate: new Date().toISOString()
      });
    }

    const user = db.getUser(updated.sentById);
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

app.post('/api/firm/:companyId/chat/read', (req, res) => {
  const { companyId } = req.params;
  const { caseId, userId } = req.body;
  db.markChatRead(companyId, caseId || null, userId);
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

app.post('/api/sa/login', superadminRateLimiter, (req, res) => {
  const ip = getRequestIP(req);
  
  // Step 2 - Rate limit check
  const failed = db.getRecentFailedAttempts(ip);
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
  
  // Case-sensitive check
  if (email === superadminEmail && password === superadminKey) {
    db.clearLoginAttempts(ip);
    
    (req.session as any).isSuperAdmin = true;
    (req.session as any).superadminEmail = email;
    (req.session as any).superadminLoginTime = new Date().toISOString();
    (req.session as any).superadminIP = ip;
    (req.session as any).superadminLastActivity = new Date().toISOString();
    
    db.setActiveSuperadminSession(req.sessionID);
    
    superadminLogger.log("LOGIN_SUCCESS", ip, "Superadmin authenticated successfully", {
      result: "SUCCESS"
    });
    
    sendSuperadminLoginAlert({
      ip,
      timestamp: new Date().toISOString()
    });
    
    return res.json({ success: true });
  } else {
    db.recordLoginAttempt(ip, false);
    superadminLogger.log("LOGIN_FAILED", ip, "Invalid credentials auth attempt", {
      result: "FAILED"
    });
    setTimeout(() => {
      res.status(401).json({ error: "invalid" });
    }, 1000);
  }
});

app.get('/api/sa/me', superadminRateLimiter, (req, res) => {
  if (req.session && (req.session as any).isSuperAdmin === true) {
    const lastActivityStr = (req.session as any).superadminLastActivity;
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;

    if (lastActivityStr) {
      const lastActivity = new Date(lastActivityStr).getTime();
      if (now - lastActivity > thirtyMinutes) {
        db.clearActiveSuperadminSession();
        req.session.destroy(() => {});
        return res.status(404).json({ error: "session_expired" });
      }
    }

    const activeSessionId = db.getActiveSuperadminSession();
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

app.post('/api/sa/logout', superadminRateLimiter, (req, res) => {
  const ip = getRequestIP(req);
  superadminLogger.log("LOGOUT", ip, "Superadmin logged out manually");
  db.clearActiveSuperadminSession();
  if (req.session) {
    req.session.destroy(() => {});
  }
  res.json({ success: true });
});

app.get('/api/sa/platform-status', isSuperadminAuthenticated, superadminRateLimiter, (req, res) => {
  const companies = db.getCompanies();
  const totalUsers = companies.reduce((sum, c) => sum + db.getUsers(c.id).length, 0);
  const activeSessionsCount = Math.max(1, Math.min(totalUsers, 4));
  
  res.json({
    locked: db.isPlatformLocked(),
    activeFirms: companies.filter(c => c.isActive).length,
    totalFirms: companies.length,
    activeSessions: activeSessionsCount
  });
});

app.get('/api/sa/audit-log', isSuperadminAuthenticated, superadminRateLimiter, (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 500;
  const action = req.query.action as string;
  const from = req.query.from as string;
  const to = req.query.to as string;
  
  const rawLog = db.getAuditLog({ limit, action, from, to });
  res.json(rawLog);
});

app.get('/api/sa/login-history', isSuperadminAuthenticated, superadminRateLimiter, (req, res) => {
  const log = db.getAuditLog();
  const loginEvents = log.filter(e => e.action === "LOGIN_SUCCESS" || e.action === "LOGIN_FAILED");
  res.json(loginEvents.slice(0, 100));
});

app.post('/api/sa/panic', isSuperadminAuthenticated, superadminRateLimiter, (req, res) => {
  const ip = getRequestIP(req);
  db.lockPlatform();
  db.clearActiveSuperadminSession();
  if (req.session) {
    req.session.destroy(() => {});
  }
  superadminLogger.log("PANIC_BUTTON_TRIGGERED", ip, "Superadmin triggered panic button! System locked.");
  res.json({ success: true, message: "Platform locked" });
});

app.post('/api/sa/unlock', superadminRateLimiter, (req, res) => {
  const ip = getRequestIP(req);
  const { email, password } = req.body;
  const superadminEmail = process.env.SUPERADMIN_EMAIL || 'voyyagic@gmail.com';
  const superadminKey = process.env.SUPERADMIN_SECRET_KEY || 'docket_master_2026';
  
  if (email === superadminEmail && password === superadminKey) {
    db.unlockPlatform();
    db.clearLoginAttempts(ip);
    
    if (req.session) {
      (req.session as any).isSuperAdmin = true;
      (req.session as any).superadminEmail = email;
      (req.session as any).superadminLoginTime = new Date().toISOString();
      (req.session as any).superadminIP = ip;
      (req.session as any).superadminLastActivity = new Date().toISOString();
      db.setActiveSuperadminSession(req.sessionID);
    }
    
    superadminLogger.log("PLATFORM_UNLOCKED", ip, "Platform unlocked successfully", {
      result: "SUCCESS"
    });
    
    return res.json({ success: true });
  } else {
    db.recordLoginAttempt(ip, false);
    superadminLogger.log("LOGIN_FAILED", ip, "Invalid credentials unlock attempt", {
      result: "FAILED"
    });
    setTimeout(() => res.status(401).json({ error: "invalid" }), 1000);
  }
});
// ─── SUPERADMIN ADDITION END ───

app.get('/api/superadmin/companies', isSuperadminAuthenticated, (req, res) => {
  const companies = db.getCompanies();
  const summary = companies.map(c => {
    const settings = db.getSettings(c.id);
    const users = db.getUsers(c.id);
    const cases = db.getCases(c.id);
    const updates = db.getClientUpdates(c.id);
    const docs = db.getGeneratedDocuments(c.id);
    const flags = db.getFeatureFlags(c.id);
    return {
      company: c,
      adminEmail: settings.email || (users[0] ? users[0].email : "N/A"),
      userCount: users.length,
      caseCount: cases.length,
      updateCount: updates.length,
      documentCount: docs.length,
      featureFlags: flags
    };
  });
  res.json(summary);
});

app.post('/api/superadmin/companies/action', isSuperadminAuthenticated, (req, res) => {
  const { companyId, action } = req.body; // "suspend" | "activate" | "delete"
  const ip = getRequestIP(req);
  
  if (action === "suspend") {
    db.updateCompany(companyId, { isActive: false });
    superadminLogger.log("COMPANY_SUSPENDED", ip, `Suspended company ID: ${companyId}`, { targetCompanyId: companyId });
  } else if (action === "activate") {
    db.updateCompany(companyId, { isActive: true });
    superadminLogger.log("COMPANY_ACTIVATED", ip, `Activated company ID: ${companyId}`, { targetCompanyId: companyId });
  } else if (action === "delete") {
    db.deleteCompany(companyId);
    superadminLogger.log("COMPANY_DELETED", ip, `Deleted company ID: ${companyId}`, { targetCompanyId: companyId });
  }
  res.json({ success: true });
});

app.post('/api/superadmin/companies/flags', isSuperadminAuthenticated, (req, res) => {
  const { companyId, featureName, isEnabled } = req.body;
  const ip = getRequestIP(req);
  
  db.toggleFeatureFlag(companyId, featureName, isEnabled);
  superadminLogger.log("FEATURE_FLAG_CHANGED", ip, `Toggled feature flag '${featureName}' to ${isEnabled} for company ID: ${companyId}`, { targetCompanyId: companyId });
  res.json({ success: true });
});

app.post('/api/superadmin/announcements', isSuperadminAuthenticated, (req, res) => {
  const { title, body, companyId } = req.body;
  const ip = getRequestIP(req);
  
  const created = db.createAnnouncement({
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
  if (secretKey === serverSecret) {
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
app.post('/api/webhooks/cron', (req, res) => {
  const companies = db.getCompanies();
  const logs: string[] = [];

  companies.forEach(comp => {
    const deadlines = db.getDeadlines(comp.id);
    const settings = db.getSettings(comp.id);
    deadlines.forEach(dead => {
      if (dead.isResolved) return;
      
      const dueDate = new Date(dead.dueDate);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dead.remindDaysBefore.includes(diffDays) && !dead.remindersSent.includes(diffDays)) {
        // Send alert
        dead.remindersSent.push(diffDays);
        db.updateDeadline(comp.id, dead.id, { remindersSent: dead.remindersSent });
        logs.push(`Alert: Firm "${settings.firmName}" case deadline "${dead.title}" is due in ${diffDays} day(s). Notification drafted/sent.`);
      }
    });
  });

  res.json({ success: true, logs });
});

// ─── GLOBAL SEARCH, FEEDBACK & ANNOUNCEMENT WORKFLOWS ─────────────────────

app.get('/api/firm/:companyId/search', (req, res) => {
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

  const cases = db.getCases(companyId) || [];
  const clients = db.getClients(companyId) || [];
  const deadlines = db.getDeadlines(companyId) || [];
  const documents = db.getGeneratedDocuments(companyId) || [];
  const users = db.getUsers(companyId) || [];
  const updates = db.getClientUpdates(companyId) || [];
  const announcements = db.getAnnouncements(companyId) || [];

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
  dbIns.push(...(db.getChatMessages(companyId, null) || []));
  cases.forEach(c => {
    dbIns.push(...(db.getChatMessages(companyId, c.id) || []));
  });
  const matchedMessages = dbIns.filter(msg =>
    (msg.message || '').toLowerCase().includes(q)
  ).slice(0, 15).map(msg => {
    const sender = users.find(u => u.id === msg.sentById);
    return { ...msg, senderName: sender?.fullName, avatarUrl: sender?.avatarUrl };
  });

  // Match Events
  const allEvents: any[] = [];
  cases.forEach(c => {
    const caseEvs = db.getCaseEvents(companyId, c.id) || [];
    caseEvs.forEach((ev: any) => {
      allEvents.push({
        ...ev,
        caseRef: c.referenceNumber,
        clientName: clients.find(cl => cl.id === c.clientId)?.fullName
      });
    });
  });
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

app.post('/api/platform/feedback', (req, res) => {
  const { companyId, userId, type, message } = req.body;
  if (!type || !message) {
    return res.status(400).json({ error: "Type and message are required" });
  }
  const feedback = db.createPlatformFeedback(companyId || "comp-docket-chambers", userId || "usr-admin-demo", type, message);
  res.json({ success: true, feedback });
});

app.post('/api/firm/:companyId/announcement', (req, res) => {
  const { companyId } = req.params;
  const { announcement } = req.body;
  
  const updated = db.updateSettings(companyId, {
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
