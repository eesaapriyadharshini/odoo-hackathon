import { Router, Response } from 'express';
import db from '../db';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { runBillingDay } from '../services/billingService';

export const billingRouter = Router();

billingRouter.use(authenticateToken);

// GET /api/billing/due - Preview subscriptions that are due for billing
billingRouter.get('/due', requireRole(['admin', 'staff']), (req: AuthenticatedRequest, res: Response) => {
  const targetDate = (req.query.targetDate as string) || new Date().toISOString().split('T')[0];

  const activeSubs = db.subscriptions.find((s) => s.status === 'active');
  const dueList = [];

  for (const sub of activeSubs) {
    const nextBill = sub.next_billing_date || sub.start_date;
    const isDue = nextBill <= targetDate;

    const customer = db.users.findById(sub.customer_id);
    const plan = db.plans.findById(sub.plan_id);

    dueList.push({
      id: sub.id,
      subscription_number: sub.subscription_number,
      customer_name: customer?.name,
      customer_email: customer?.email,
      plan_name: plan?.name,
      billing_interval: plan?.billing_interval,
      total_amount: sub.total_amount,
      next_billing_date: nextBill,
      is_due: isDue,
      is_expired: sub.expiry_date ? sub.expiry_date <= targetDate : false,
    });
  }

  res.json({
    targetDate,
    totalActive: activeSubs.length,
    dueCount: dueList.filter((d) => d.is_due).length,
    subscriptions: dueList,
  });
});

// POST /api/billing/run - Execute Billing Day
billingRouter.post('/run', requireRole(['admin', 'staff']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetDate } = req.body;
    const result = runBillingDay(targetDate, req.user?.id);
    res.json({
      message: `Billing Day completed for ${result.runDate}. ${result.invoicesGenerated.length} invoices generated.`,
      result,
    });
  } catch (err) {
    console.error('[Run Billing Error]', err);
    res.status(500).json({ error: 'Failed to execute billing run.' });
  }
});

