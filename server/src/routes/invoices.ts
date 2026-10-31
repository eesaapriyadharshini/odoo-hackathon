import { Router, Response } from 'express';
import db from '../db';
import { Invoice, InvoiceLine, InvoiceStatus } from '../types';
import { authenticateToken, requireRole, AuthenticatedRequest, checkCustomerAccess } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export const invoicesRouter = Router();

invoicesRouter.use(authenticateToken);

function populateInvoice(inv: Invoice): Invoice {
  const customer = db.users.findById(inv.customer_id);
  const subscription = inv.subscription_id ? db.subscriptions.findById(inv.subscription_id) : undefined;
  const lines = db.invoice_lines.find((l) => l.invoice_id === inv.id);
  const payments = db.payments.find((p) => p.invoice_id === inv.id);

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = inv.status !== 'paid' && inv.status !== 'cancelled' && inv.due_date < today;

  return {
    ...inv,
    customer_name: customer?.name,
    customer_email: customer?.email,
    subscription_number: subscription?.subscription_number,
    lines,
    payments,
    is_overdue: isOverdue,
  };
}

// GET /api/invoices
invoicesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { customer_id, status, overdue } = req.query;

  let invoices = db.invoices.find();

  // Multi-tenant security for customers
  if (req.user?.role === 'customer') {
    invoices = invoices.filter((inv) => inv.customer_id === req.user!.id);
  } else {
    if (customer_id) {
      invoices = invoices.filter((inv) => inv.customer_id === customer_id);
    }
  }

  if (status) {
    invoices = invoices.filter((inv) => inv.status === status);
  }

  const today = new Date().toISOString().split('T')[0];
  if (overdue === 'true') {
    invoices = invoices.filter((inv) => inv.status !== 'paid' && inv.status !== 'cancelled' && inv.due_date < today);
  }

  // Sort newest first
  invoices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({ invoices: invoices.map(populateInvoice) });
});

// GET /api/invoices/:id
invoicesRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const invoice = db.invoices.findById(req.params.id);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found.' });
    return;
  }

  if (!checkCustomerAccess(req, invoice.customer_id)) {
    res.status(403).json({ error: 'Access denied to this invoice.' });
    return;
  }

  res.json({ invoice: populateInvoice(invoice) });
});

// POST /api/invoices/:id/confirm - Confirm draft invoice
invoicesRouter.post('/:id/confirm', requireRole(['admin', 'staff']), (req: AuthenticatedRequest, res: Response) => {
  const invoice = db.invoices.findById(req.params.id);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found.' });
    return;
  }

  if (invoice.status !== 'draft') {
    res.status(400).json({ error: `Cannot confirm invoice with status '${invoice.status}'.` });
    return;
  }

  const updated = db.invoices.update(invoice.id, {
    status: 'confirmed',
    updated_at: new Date().toISOString(),
  });

  logAudit({
    userId: req.user?.id,
    userEmail: req.user?.email,
    action: 'CONFIRM_INVOICE',
    entityType: 'invoice',
    entityId: invoice.id,
    details: { invoiceNumber: invoice.invoice_number },
    ipAddress: req.ip,
  });

  res.json({ message: `Invoice ${invoice.invoice_number} confirmed.`, invoice: populateInvoice(updated!) });
});

// POST /api/invoices/:id/cancel - Cancel invoice
invoicesRouter.post('/:id/cancel', requireRole(['admin', 'staff']), (req: AuthenticatedRequest, res: Response) => {
  const invoice = db.invoices.findById(req.params.id);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found.' });
    return;
  }

  if (invoice.status === 'paid') {
    res.status(400).json({ error: 'Cannot cancel a paid invoice.' });
    return;
  }

  const updated = db.invoices.update(invoice.id, {
    status: 'cancelled',
    amount_due: 0,
    updated_at: new Date().toISOString(),
  });

  logAudit({
    userId: req.user?.id,
    userEmail: req.user?.email,
    action: 'CANCEL_INVOICE',
    entityType: 'invoice',
    entityId: invoice.id,
    details: { invoiceNumber: invoice.invoice_number },
    ipAddress: req.ip,
  });

  res.json({ message: `Invoice ${invoice.invoice_number} cancelled.`, invoice: populateInvoice(updated!) });
});

// POST /api/invoices/:id/send - Send invoice email notification to customer
invoicesRouter.post('/:id/send', requireRole(['admin', 'staff']), (req: AuthenticatedRequest, res: Response) => {
  const invoice = db.invoices.findById(req.params.id);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found.' });
    return;
  }

  const customer = db.users.findById(invoice.customer_id);
  const now = new Date().toISOString();

  const updated = db.invoices.update(invoice.id, {
    sent_at: now,
    updated_at: now,
  });

  logAudit({
    userId: req.user?.id,
    userEmail: req.user?.email,
    action: 'SEND_INVOICE',
    entityType: 'invoice',
    entityId: invoice.id,
    details: { invoiceNumber: invoice.invoice_number, recipient: customer?.email },
    ipAddress: req.ip,
  });

  res.json({
    message: `Invoice ${invoice.invoice_number} dispatched to ${customer?.email || 'customer'}.`,
    sent_at: now,
    invoice: populateInvoice(updated!),
  });
});

