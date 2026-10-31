import { Router, Response } from 'express';
import db from '../db';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';

export const auditRouter = Router();

auditRouter.use(authenticateToken);

// GET /api/audit-logs - Admin inspection
auditRouter.get('/', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  const logs = db.audit_logs.find();

  // Sort newest first
  logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({ logs: logs.slice(0, limit) });
});

