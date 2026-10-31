import { Router, Response } from 'express';
import { uuidv4 } from '../utils/id';
import db from '../db';
import { Plan, BillingInterval } from '../types';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export const plansRouter = Router();

plansRouter.use(authenticateToken);

// GET /api/plans - List plans
plansRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const plans = db.plans.find((p) => p.is_active === 1);
  res.json({ plans });
});

// GET /api/plans/:id
plansRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const plan = db.plans.findById(req.params.id);
  if (!plan) {
    res.status(404).json({ error: 'Plan not found.' });
    return;
  }
  res.json({ plan });
});

// POST /api/plans - Admin creates a new plan
plansRouter.post('/', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      code,
      cost,
      billing_interval,
      min_quantity,
      start_date,
      end_date,
      auto_close_on_end,
      allow_early_close,
      allow_pause,
      allow_renew,
    } = req.body;

    if (!name || !code || cost === undefined || !billing_interval || !start_date) {
      res.status(400).json({ error: 'Name, code, cost, billing_interval and start_date are required.' });
      return;
    }

    const validIntervals: BillingInterval[] = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!validIntervals.includes(billing_interval)) {
      res.status(400).json({ error: `billing_interval must be one of: ${validIntervals.join(', ')}` });
      return;
    }

    const planCost = Number(cost);
    if (isNaN(planCost) || planCost < 0) {
      res.status(400).json({ error: 'Plan cost must be a non-negative number.' });
      return;
    }

    const minQty = Number(min_quantity || 1);
    if (isNaN(minQty) || minQty < 1) {
      res.status(400).json({ error: 'min_quantity must be at least 1.' });
      return;
    }

    const existing = db.plans.findOne((p) => p.code.toLowerCase() === code.trim().toLowerCase());
    if (existing) {
      res.status(409).json({ error: 'A plan with this code already exists.' });
      return;
    }

    const newPlan: Plan = {
      id: uuidv4(),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      cost: planCost,
      billing_interval,
      min_quantity: minQty,
      start_date,
      end_date: end_date || null,
      auto_close_on_end: auto_close_on_end === false ? 0 : 1,
      allow_early_close: allow_early_close === false ? 0 : 1,
      allow_pause: allow_pause === false ? 0 : 1,
      allow_renew: allow_renew === false ? 0 : 1,
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.plans.insert(newPlan);

    logAudit({
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'ADMIN_CREATE_PLAN',
      entityType: 'plan',
      entityId: newPlan.id,
      details: { name: newPlan.name, interval: newPlan.billing_interval, cost: newPlan.cost },
      ipAddress: req.ip,
    });

    res.status(201).json({ message: 'Plan created successfully.', plan: newPlan });
  } catch (err) {
    console.error('[Create Plan Error]', err);
    res.status(500).json({ error: 'Failed to create plan.' });
  }
});

// PUT /api/plans/:id - Admin updates plan
plansRouter.put('/:id', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const plan = db.plans.findById(req.params.id);
  if (!plan) {
    res.status(404).json({ error: 'Plan not found.' });
    return;
  }

  const {
    name,
    cost,
    billing_interval,
    min_quantity,
    start_date,
    end_date,
    auto_close_on_end,
    allow_early_close,
    allow_pause,
    allow_renew,
    is_active,
  } = req.body;

  const updates: Partial<Plan> = {
    updated_at: new Date().toISOString(),
  };

  if (name !== undefined) updates.name = name.trim();
  if (cost !== undefined) {
    const c = Number(cost);
    if (!isNaN(c) && c >= 0) updates.cost = c;
  }
  if (billing_interval !== undefined) updates.billing_interval = billing_interval;
  if (min_quantity !== undefined) {
    const q = Number(min_quantity);
    if (!isNaN(q) && q >= 1) updates.min_quantity = q;
  }
  if (start_date !== undefined) updates.start_date = start_date;
  if (end_date !== undefined) updates.end_date = end_date;
  if (auto_close_on_end !== undefined) updates.auto_close_on_end = auto_close_on_end ? 1 : 0;
  if (allow_early_close !== undefined) updates.allow_early_close = allow_early_close ? 1 : 0;
  if (allow_pause !== undefined) updates.allow_pause = allow_pause ? 1 : 0;
  if (allow_renew !== undefined) updates.allow_renew = allow_renew ? 1 : 0;
  if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;

  const updated = db.plans.update(plan.id, updates);
  res.json({ message: 'Plan updated successfully.', plan: updated });
});

// DELETE /api/plans/:id - Admin deactivates/deletes plan
plansRouter.delete('/:id', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const plan = db.plans.findById(req.params.id);
  if (!plan) {
    res.status(404).json({ error: 'Plan not found.' });
    return;
  }

  db.plans.delete(plan.id);

  logAudit({
    userId: req.user?.id,
    userEmail: req.user?.email,
    action: 'ADMIN_DELETE_PLAN',
    entityType: 'plan',
    entityId: plan.id,
    details: { name: plan.name, code: plan.code },
    ipAddress: req.ip,
  });

  res.json({ message: 'Plan deleted successfully.' });
});
