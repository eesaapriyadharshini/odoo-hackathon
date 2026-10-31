import { uuidv4 } from '../utils/id';
import db from '../db';
import { AuditLog } from '../types';

export function logAudit(params: {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, any> | string | null;
  ipAddress?: string | null;
}): void {
  try {
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const detailsStr =
      typeof params.details === 'object' && params.details !== null
        ? JSON.stringify(params.details)
        : params.details || null;

    const logEntry: AuditLog = {
      id,
      user_id: params.userId || null,
      user_email: params.userEmail || null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      details: detailsStr,
      ip_address: params.ipAddress || null,
      created_at: createdAt,
    };

    db.audit_logs.insert(logEntry);
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err);
  }
}
