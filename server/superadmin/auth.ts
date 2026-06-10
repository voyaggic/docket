import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { superadminLogger } from './logger';

export const getRequestIP = (req: any): string => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (typeof ip === 'string') {
    return ip.split(',')[0].trim();
  }
  return 'unknown';
};

export const isSuperadminAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const ip = getRequestIP(req);

  // 1. Check req.session.isSuperAdmin === true
  if (!req.session || !(req.session as any).isSuperAdmin) {
    superadminLogger.log("INVALID_PATH_ACCESS", ip, `Unauthorized access attempt on ${req.method} ${req.path}`, {
      endpoint: req.path,
      method: req.method
    });
    // Return 404 when not authenticated (Requirement 2 under Critical Rules)
    return res.status(404).json({ error: "Not Found" });
  }

  // 2. Check session has not timed out (30 min inactivity)
  const lastActivityStr = (req.session as any).superadminLastActivity;
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;

  if (lastActivityStr) {
    const lastActivity = new Date(lastActivityStr).getTime();
    if (now - lastActivity > thirtyMinutes) {
      db.clearActiveSuperadminSession();
      req.session.destroy(() => {});
      superadminLogger.log("SESSION_EXPIRED", ip, "Superadmin session expired due to inactivity");
      return res.status(404).json({ error: "Not Found" });
    }
  }

  // 3. Check sessionID matches active session in db
  const activeSessionId = db.getActiveSuperadminSession();
  if (req.sessionID !== activeSessionId) {
    req.session.destroy(() => {});
    superadminLogger.log("SESSION_SUPERSEDED", ip, "Superadmin session superseded by another login");
    return res.status(404).json({ error: "Not Found" });
  }

  // 4. Update superadminLastActivity = now
  (req.session as any).superadminLastActivity = new Date().toISOString();

  // 5. Log this request to superadminAuditLog
  superadminLogger.log("API_REQUEST", ip, `Superadmin requested ${req.method} ${req.path}`, {
    endpoint: req.path,
    method: req.method
  });

  // 6. Call next()
  next();
};
