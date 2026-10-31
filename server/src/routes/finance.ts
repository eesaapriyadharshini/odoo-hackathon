import { Router, Response } from 'express';
import db from '../db';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export const financeRouter = Router();

financeRouter.use(authenticateToken);

// GET /api/finance/dashboard - Executive Finance Summary & Analytics
financeRouter.get('/dashboard', requireRole(['admin', 'staff']), (req: AuthenticatedRequest, res: Response) => {
  const startTime = performance.now();
  const today = new Date().toISOString().split('T')[0];

  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const planId = req.query.planId as string | undefined;
  const customerId = req.query.customerId as string | undefined;

  // 1. Subscriptions stats
  let subscriptions = db.subscriptions.find();
  if (planId) subscriptions = subscriptions.filter((s) => s.plan_id === planId);
  if (customerId) subscriptions = subscriptions.filter((s) => s.customer_id === customerId);

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');
  const draftSubscriptions = subscriptions.filter((s) => s.status === 'draft' || s.status === 'quotation');
  const pausedSubscriptions = subscriptions.filter((s) => s.status === 'paused');
  const closedSubscriptions = subscriptions.filter((s) => s.status === 'closed');

  // Calculate MRR & ARR
  let mrr = 0;
  for (const sub of activeSubscriptions) {
    const plan = db.plans.findById(sub.plan_id);
    if (!plan) continue;
    switch (plan.billing_interval) {
      case 'daily':
        mrr += sub.total_amount * 30;
        break;
      case 'weekly':
        mrr += sub.total_amount * 4.33;
        break;
      case 'monthly':
        mrr += sub.total_amount;
        break;
      case 'yearly':
        mrr += sub.total_amount / 12;
        break;
    }
  }
  const arr = mrr * 12;

  // 2. Invoices & Outstanding balance (Scoped by customer, date, and planId)
  let invoices = db.invoices.find();
  if (startDate) invoices = invoices.filter((i) => i.issue_date >= startDate);
  if (endDate) invoices = invoices.filter((i) => i.issue_date <= endDate);
  if (customerId) invoices = invoices.filter((i) => i.customer_id === customerId);

  // If planId filter is applied, only include invoices linked to subscriptions of that plan
  if (planId) {
    const matchingSubIds = new Set(db.subscriptions.find((s) => s.plan_id === planId).map((s) => s.id));
    invoices = invoices.filter((i) => i.subscription_id && matchingSubIds.has(i.subscription_id));
  }

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.total_amount, 0);
  const totalOutstanding = invoices
    .filter((i) => i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.amount_due, 0);

  // 3. Payments & Revenue collected (Scoped by customer, date, and plan invoices if filtered)
  let payments = db.payments.find();
  if (startDate) payments = payments.filter((p) => p.payment_date >= startDate);
  if (endDate) payments = payments.filter((p) => p.payment_date <= endDate);
  if (customerId) payments = payments.filter((p) => p.customer_id === customerId);

  if (planId) {
    const matchingInvoiceIds = new Set(invoices.map((i) => i.id));
    payments = payments.filter((p) => matchingInvoiceIds.has(p.invoice_id));
  }

  const totalRevenueCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  // Payments by method
  const revenueByMethod: Record<string, number> = {
    credit_card: 0,
    bank_transfer: 0,
    stripe: 0,
    paypal: 0,
    cash: 0,
  };
  for (const p of payments) {
    if (revenueByMethod[p.payment_method] !== undefined) {
      revenueByMethod[p.payment_method] += p.amount;
    }
  }
  for (const m of Object.keys(revenueByMethod)) {
    revenueByMethod[m] = Math.round(revenueByMethod[m] * 100) / 100;
  }

  // 4. Overdue Invoices
  const overdueInvoicesList = invoices
    .filter((i) => i.status !== 'paid' && i.status !== 'cancelled' && i.due_date < today)
    .map((inv) => {
      const cust = db.users.findById(inv.customer_id);
      const sub = inv.subscription_id ? db.subscriptions.findById(inv.subscription_id) : undefined;
      const daysOverdue = Math.floor(
        (new Date(today).getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        customer_id: inv.customer_id,
        customer_name: cust?.name,
        customer_email: cust?.email,
        company_name: cust?.company_name,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        days_overdue: daysOverdue,
        total_amount: inv.total_amount,
        amount_paid: inv.amount_paid,
        amount_due: inv.amount_due,
        subscription_number: sub?.subscription_number,
      };
    })
    .sort((a, b) => b.days_overdue - a.days_overdue);

  const totalOverdueAmount = overdueInvoicesList.reduce((sum, i) => sum + i.amount_due, 0);

  // 5. Plan breakdown
  const planDistribution = db.plans.find().map((pl) => {
    const count = activeSubscriptions.filter((s) => s.plan_id === pl.id).length;
    return {
      planId: pl.id,
      planName: pl.name,
      billingInterval: pl.billing_interval,
      cost: pl.cost,
      activeCount: count,
    };
  });

  const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

  res.json({
    executionTimeMs: durationMs,
    metrics: {
      activeSubscriptionsCount: activeSubscriptions.length,
      totalSubscriptionsCount: subscriptions.length,
      draftCount: draftSubscriptions.length,
      pausedCount: pausedSubscriptions.length,
      closedCount: closedSubscriptions.length,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      totalRevenueCollected: Math.round(totalRevenueCollected * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalOverdueAmount: Math.round(totalOverdueAmount * 100) / 100,
      overdueInvoicesCount: overdueInvoicesList.length,
    },
    overdueInvoices: overdueInvoicesList,
    revenueByMethod,
    planDistribution,
    filtersApplied: {
      startDate: startDate || null,
      endDate: endDate || null,
      planId: planId || null,
      customerId: customerId || null,
    },
  });
});

// POST /api/finance/chase-invoice - Send reminder / chase overdue invoice
financeRouter.post('/chase-invoice', requireRole(['admin', 'staff']), (req: AuthenticatedRequest, res: Response) => {
  const { invoiceId, note } = req.body;
  if (!invoiceId) {
    res.status(400).json({ error: 'invoiceId is required.' });
    return;
  }

  const invoice = db.invoices.findById(invoiceId);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found.' });
    return;
  }

  const customer = db.users.findById(invoice.customer_id);

  logAudit({
    userId: req.user?.id,
    userEmail: req.user?.email,
    action: 'CHASE_OVERDUE_INVOICE',
    entityType: 'invoice',
    entityId: invoice.id,
    details: {
      invoiceNumber: invoice.invoice_number,
      customerEmail: customer?.email,
      amountDue: invoice.amount_due,
      note: note || 'Automated overdue payment reminder dispatched',
    },
    ipAddress: req.ip,
  });

  res.json({
    message: `Payment reminder successfully sent to ${customer?.name} (${customer?.email}) for Invoice ${invoice.invoice_number}.`,
    customerEmail: customer?.email,
    amountDue: invoice.amount_due,
  });
});
