import { Router, Response } from 'express';
import { uuidv4 } from '../utils/id';
import db from '../db';
import { Payment, PaymentMethod } from '../types';
import { authenticateToken, AuthenticatedRequest, checkCustomerAccess } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export const paymentsRouter = Router();

paymentsRouter.use(authenticateToken);

// GET /api/payments
paymentsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { invoice_id, customer_id } = req.query;

  let payments = db.payments.find();

  if (req.user?.role === 'customer') {
    payments = payments.filter((p) => p.customer_id === req.user!.id);
  } else {
    if (customer_id) {
      payments = payments.filter((p) => p.customer_id === customer_id);
    }
  }

  if (invoice_id) {
    payments = payments.filter((p) => p.invoice_id === invoice_id);
  }

  const populated = payments.map((p) => {
    const inv = db.invoices.findById(p.invoice_id);
    const cust = db.users.findById(p.customer_id);
    return {
      ...p,
      invoice_number: inv?.invoice_number,
      customer_name: cust?.name,
    };
  });

  // Sort newest first
  populated.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

  res.json({ payments: populated });
});

// POST /api/payments - Record a payment against an invoice
paymentsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { invoice_id, amount, payment_method, payment_date, reference, notes } = req.body;

    if (!invoice_id || amount === undefined || !payment_method) {
      res.status(400).json({ error: 'invoice_id, amount, and payment_method are required.' });
      return;
    }

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      res.status(400).json({ error: 'Payment amount must be greater than zero.' });
      return;
    }

    const invoice = db.invoices.findById(invoice_id);
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    if (!checkCustomerAccess(req, invoice.customer_id)) {
      res.status(403).json({ error: 'Access denied to this invoice.' });
      return;
    }

    if (invoice.status === 'cancelled') {
      res.status(400).json({ error: 'Cannot record payment for a cancelled invoice.' });
      return;
    }

    if (invoice.status === 'paid' || invoice.amount_due <= 0) {
      res.status(400).json({ error: 'This invoice is already fully paid.' });
      return;
    }

    if (payAmount > invoice.amount_due + 0.001) {
      res.status(400).json({
        error: `Payment amount ($${payAmount.toFixed(2)}) exceeds remaining balance of $${invoice.amount_due.toFixed(2)}.`,
      });
      return;
    }

    const validMethods: PaymentMethod[] = ['credit_card', 'bank_transfer', 'stripe', 'paypal', 'cash'];
    if (!validMethods.includes(payment_method)) {
      res.status(400).json({ error: `payment_method must be one of: ${validMethods.join(', ')}` });
      return;
    }

    const paymentId = uuidv4();
    const paymentNumber = db.getNextPaymentNumber();
    const effectiveDate = payment_date || new Date().toISOString().split('T')[0];

    const newPayment: Payment = {
      id: paymentId,
      payment_number: paymentNumber,
      invoice_id: invoice.id,
      customer_id: invoice.customer_id,
      amount: Math.round(payAmount * 100) / 100,
      payment_date: effectiveDate,
      payment_method,
      reference: reference || null,
      notes: notes || null,
      recorded_by: req.user?.id || null,
      created_at: new Date().toISOString(),
    };

    db.payments.insert(newPayment);

    // Update invoice balance and status
    const newPaid = Math.round((invoice.amount_paid + payAmount) * 100) / 100;
    const newDue = Math.max(0, Math.round((invoice.total_amount - newPaid) * 100) / 100);
    const newStatus = newDue <= 0.001 ? 'paid' : (invoice.status === 'draft' ? 'confirmed' : invoice.status);

    db.invoices.update(invoice.id, {
      amount_paid: newPaid,
      amount_due: newDue,
      status: newStatus,
      updated_at: new Date().toISOString(),
    });

    logAudit({
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'RECORD_PAYMENT',
      entityType: 'payment',
      entityId: paymentId,
      details: {
        paymentNumber,
        invoiceNumber: invoice.invoice_number,
        amount: payAmount,
        method: payment_method,
        remainingDue: newDue,
        isFullyPaid: newStatus === 'paid',
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: newStatus === 'paid' ? 'Invoice fully paid.' : 'Partial payment recorded successfully.',
      payment: newPayment,
      invoiceStatus: newStatus,
      remainingDue: newDue,
    });
  } catch (err) {
    console.error('[Record Payment Error]', err);
    res.status(500).json({ error: 'Failed to record payment.' });
  }
});
