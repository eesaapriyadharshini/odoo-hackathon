import { Router, Response } from 'express';
import { uuidv4 } from '../utils/id';
import db from '../db';
import { Subscription, SubscriptionLine, SubscriptionStatus, PaymentTerms } from '../types';
import { authenticateToken, requireRole, AuthenticatedRequest, checkCustomerAccess } from '../middleware/auth';
import { validateAndCalculateDiscount, incrementDiscountUsage } from '../services/discountService';
import { logAudit } from '../services/auditService';

export const subscriptionsRouter = Router();

subscriptionsRouter.use(authenticateToken);

// Helper to populate subscription details
function populateSubscription(sub: Subscription): Subscription {
  const customer = db.users.findById(sub.customer_id);
  const plan = db.plans.findById(sub.plan_id);
  const discount = sub.discount_id ? db.discounts.findById(sub.discount_id) : undefined;
  const lines = db.subscription_lines.find((l) => l.subscription_id === sub.id);

  const populatedLines = lines.map((l) => {
    const product = db.products.findById(l.product_id);
    const variant = l.variant_id ? db.product_variants.findById(l.variant_id) : undefined;
    return {
      ...l,
      product_name: product?.name,
      product_code: product?.code,
      variant_name: variant ? `${variant.attribute_name}: ${variant.attribute_value}` : undefined,
    };
  });

  return {
    ...sub,
    customer_name: customer?.name,
    customer_email: customer?.email,
    plan_name: plan?.name,
    billing_interval: plan?.billing_interval,
    discount_code: discount?.code,
    lines: populatedLines,
  };
}

// GET /api/subscriptions - List subscriptions
subscriptionsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { customer_id, status, plan_id } = req.query;

  let subs = db.subscriptions.find();

  // Strict tenant boundary for customers
  if (req.user?.role === 'customer') {
    subs = subs.filter((s) => s.customer_id === req.user!.id);
  } else {
    if (customer_id) {
      subs = subs.filter((s) => s.customer_id === customer_id);
    }
  }

  if (status) {
    subs = subs.filter((s) => s.status === status);
  }

  if (plan_id) {
    subs = subs.filter((s) => s.plan_id === plan_id);
  }

  // Sort newest first
  subs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({ subscriptions: subs.map(populateSubscription) });
});

// GET /api/subscriptions/:id
subscriptionsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const sub = db.subscriptions.findById(req.params.id);
  if (!sub) {
    res.status(404).json({ error: 'Subscription not found.' });
    return;
  }

  if (!checkCustomerAccess(req, sub.customer_id)) {
    res.status(403).json({ error: 'Access denied to this subscription.' });
    return;
  }

  res.json({ subscription: populateSubscription(sub) });
});

// POST /api/subscriptions - Create subscription (Draft or Quotation)
subscriptionsRouter.post('/', requireRole(['admin', 'staff']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      customer_id,
      plan_id,
      template_id,
      start_date,
      expiry_date,
      payment_terms,
      discount_code,
      notes,
      lines,
      status: requestedStatus,
    } = req.body;

    if (!customer_id || !plan_id || !start_date) {
      res.status(400).json({ error: 'customer_id, plan_id, and start_date are required.' });
      return;
    }

    const customer = db.users.findById(customer_id);
    if (!customer) {
      res.status(400).json({ error: 'Customer not found.' });
      return;
    }

    const plan = db.plans.findById(plan_id);
    if (!plan) {
      res.status(400).json({ error: 'Plan not found.' });
      return;
    }

    const subscriptionId = uuidv4();
    const subscriptionNumber = db.getNextSubscriptionNumber();

    // Process lines & taxes
    let subtotal = 0;
    let taxAmount = 0;
    let totalLineDiscounts = 0;
    const subscriptionLines: SubscriptionLine[] = [];

    if (Array.isArray(lines) && lines.length > 0) {
      for (const line of lines) {
        const product = db.products.findById(line.product_id);
        if (!product) continue;

        let unitPrice = Number(line.unit_price !== undefined ? line.unit_price : product.sales_price);

        // If variant selected, add variant price_extra (e.g. +$560 for Odoo brand)
        if (line.variant_id) {
          const variant = db.product_variants.findById(line.variant_id);
          if (variant && line.unit_price === undefined) {
            unitPrice += Number(variant.price_extra || 0);
          }
        }

        const qty = Math.max(1, Number(line.quantity || 1));
        const lineRawSubtotal = unitPrice * qty;

        // Tax calculation
        let taxRate = 0;
        let taxId = line.tax_id || null;
        if (taxId) {
          const taxRecord = db.taxes.findById(taxId);
          if (taxRecord) taxRate = taxRecord.rate;
        } else {
          // Default tax if any
          const defaultTax = db.taxes.findOne((t) => t.is_default === 1 && t.is_active === 1);
          if (defaultTax) {
            taxId = defaultTax.id;
            taxRate = defaultTax.rate;
          }
        }

        const lineTax = (lineRawSubtotal * taxRate) / 100;
        const discountPct = Math.max(0, Math.min(100, Number(line.discount_pct || 0)));
        const lineDiscount = (lineRawSubtotal * discountPct) / 100;
        const lineTotal = lineRawSubtotal + lineTax - lineDiscount;

        subtotal += lineRawSubtotal;
        taxAmount += lineTax;
        totalLineDiscounts += lineDiscount;

        subscriptionLines.push({
          id: uuidv4(),
          subscription_id: subscriptionId,
          product_id: line.product_id,
          variant_id: line.variant_id || null,
          quantity: qty,
          unit_price: unitPrice,
          tax_id: taxId,
          tax_rate: taxRate,
          tax_amount: Math.round(lineTax * 100) / 100,
          discount_pct: discountPct,
          discount_amount: Math.round(lineDiscount * 100) / 100,
          line_total: Math.round(lineTotal * 100) / 100,
          created_at: new Date().toISOString(),
        });
      }
    }

    // Check discount code if provided
    let discountId: string | null = null;
    let orderDiscountAmount = 0;
    if (discount_code) {
      const totalQty = subscriptionLines.reduce((acc, l) => acc + l.quantity, 0);
      const discountCheck = validateAndCalculateDiscount(discount_code, {
        subtotal,
        totalQuantity: totalQty,
        items: subscriptionLines.map((l) => ({
          productId: l.product_id,
          quantity: l.quantity,
          unitPrice: l.unit_price,
          lineTotal: l.line_total,
        })),
      });

      if (discountCheck.valid && discountCheck.discount) {
        discountId = discountCheck.discount.id;
        orderDiscountAmount = discountCheck.discountAmount;
      }
    }

    const totalDiscount = Math.round((totalLineDiscounts + orderDiscountAmount) * 100) / 100;
    const totalAmount = Math.max(0, Math.round((subtotal + taxAmount - totalDiscount) * 100) / 100);

    const initialStatus: SubscriptionStatus = requestedStatus || 'draft';

    const newSub: Subscription = {
      id: subscriptionId,
      subscription_number: subscriptionNumber,
      customer_id,
      plan_id,
      template_id: template_id || null,
      status: initialStatus,
      start_date,
      expiry_date: expiry_date || null,
      next_billing_date: initialStatus === 'active' ? start_date : null,
      last_billing_date: null,
      payment_terms: (payment_terms as PaymentTerms) || 'net_30',
      subtotal: Math.round(subtotal * 100) / 100,
      tax_amount: Math.round(taxAmount * 100) / 100,
      discount_amount: totalDiscount,
      total_amount: totalAmount,
      discount_id: discountId,
      notes: notes || null,
      created_by: req.user?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.subscriptions.insert(newSub);
    if (subscriptionLines.length > 0) {
      db.subscription_lines.insertMany(subscriptionLines);
    }

    logAudit({
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'CREATE_SUBSCRIPTION',
      entityType: 'subscription',
      entityId: newSub.id,
      details: {
        number: newSub.subscription_number,
        status: newSub.status,
        total: newSub.total_amount,
        customer: customer.email,
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Subscription created successfully.',
      subscription: populateSubscription(newSub),
    });
  } catch (err) {
    console.error('[Create Subscription Error]', err);
    res.status(500).json({ error: 'Failed to create subscription.' });
  }
});

// POST /api/subscriptions/:id/transition - Move state
// Supports both team operations & customer self-service according to plan lifecycle policies!
subscriptionsRouter.post('/:id/transition', (req: AuthenticatedRequest, res: Response) => {
  try {
    const sub = db.subscriptions.findById(req.params.id);
    if (!sub) {
      res.status(404).json({ error: 'Subscription not found.' });
      return;
    }

    if (!checkCustomerAccess(req, sub.customer_id)) {
      res.status(403).json({ error: 'Access denied to this subscription.' });
      return;
    }

    const { targetStatus, reason } = req.body;
    const plan = db.plans.findById(sub.plan_id);

    if (!targetStatus) {
      res.status(400).json({ error: 'targetStatus is required.' });
      return;
    }

    // Role-specific transition rules:
    // If customer: self-service allowed for Pause, Resume, Close Early, and Renew (governed by plan!)
    if (req.user?.role === 'customer') {
      const customerAllowedTransitions: Record<SubscriptionStatus, SubscriptionStatus[]> = {
        draft: [],
        quotation: ['confirmed'], // Customer can accept quote!
        confirmed: [],
        active: ['paused', 'closed'],
        paused: ['active', 'closed'],
        closed: ['active'], // Self-service renewal
      };

      const allowedForCust = customerAllowedTransitions[sub.status] || [];
      if (!allowedForCust.includes(targetStatus)) {
        res.status(403).json({
          error: `Customers cannot transition subscriptions from '${sub.status}' to '${targetStatus}'.`,
        });
        return;
      }
    } else {
      // Admin / Staff standard state machine
      const allowedTransitions: Record<SubscriptionStatus, SubscriptionStatus[]> = {
        draft: ['quotation', 'confirmed', 'active', 'closed'],
        quotation: ['confirmed', 'draft', 'closed'],
        confirmed: ['active', 'draft', 'closed'],
        active: ['paused', 'closed'],
        paused: ['active', 'closed'],
        closed: ['active'],
      };

      const validNextStates = allowedTransitions[sub.status] || [];
      if (!validNextStates.includes(targetStatus)) {
        res.status(400).json({
          error: `Cannot transition from '${sub.status}' to '${targetStatus}'. Allowed: ${validNextStates.join(', ')}`,
        });
        return;
      }
    }

    // Plan rule checks
    if (targetStatus === 'paused' && plan && plan.allow_pause === 0) {
      res.status(400).json({ error: `This subscription's plan (${plan.name}) does not allow pausing.` });
      return;
    }

    if (targetStatus === 'closed' && sub.status === 'active' && plan && plan.allow_early_close === 0) {
      res.status(400).json({ error: `This subscription's plan (${plan.name}) does not allow early closure.` });
      return;
    }

    if (sub.status === 'closed' && targetStatus === 'active' && plan && plan.allow_renew === 0) {
      res.status(400).json({ error: `This subscription's plan (${plan.name}) does not allow renewals.` });
      return;
    }

    const updates: Partial<Subscription> = {
      status: targetStatus,
      updated_at: new Date().toISOString(),
    };

    // When activating for the first time, set next_billing_date
    if (targetStatus === 'active' && !sub.next_billing_date) {
      updates.next_billing_date = sub.start_date;
    }

    // If renewing from closed
    if (sub.status === 'closed' && targetStatus === 'active') {
      const today = new Date().toISOString().split('T')[0];
      updates.start_date = today;
      updates.next_billing_date = today;
    }

    const updated = db.subscriptions.update(sub.id, updates);

    logAudit({
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'TRANSITION_SUBSCRIPTION_STATUS',
      entityType: 'subscription',
      entityId: sub.id,
      details: {
        from: sub.status,
        to: targetStatus,
        number: sub.subscription_number,
        reason: reason || null,
        initiatedByRole: req.user?.role,
      },
      ipAddress: req.ip,
    });

    res.json({
      message: `Subscription ${sub.subscription_number} transitioned to ${targetStatus}.`,
      subscription: populateSubscription(updated!),
    });
  } catch (err) {
    console.error('[Transition Subscription Error]', err);
    res.status(500).json({ error: 'Failed to transition subscription status.' });
  }
});
