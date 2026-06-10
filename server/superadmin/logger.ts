import { db } from '../db';

export const superadminLogger = {
  log(action: string, ip: string, detail: string, extra?: {
    endpoint?: string;
    method?: string;
    targetCompanyId?: string;
    targetUserId?: string;
    result?: string;
  }) {
    db.createAuditEntry({
      action,
      ip,
      detail,
      ...extra
    });
  }
};
