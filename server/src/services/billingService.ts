import { uuidv4 } from '../utils/id';
import db from '../db';
import { Invoice, InvoiceLine, Subscription, SubscriptionLine, Plan, User } from '../types';
import { validateAndCalculateDiscount, incrementDiscountUsage } from './discountService';
import { logAudit } from './auditService';

export interface BillingRunResult {
  runDate: string;
  processedCount: number;
  invoicesGenerated: Invoice[];
  skippedCount: number;
  closedSubscriptions: string[];
  totalBilledAmount: number;
  logs: string[];
}

// UTC-safe and month-overflow safe date arithmetic
export function addIntervalToDate(dateStr: string, interval: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return new Date().toISOString().split('T')[0];
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-based
  const day = parseInt(parts[2], 10);

  const d = new Date(Date.UTC(year, month, day));
  if (isNaN(d.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  switch (interval) {
    case 'daily':
      d.setUTCDate(d.getUTCDate() + 1);
      break;
    case 'weekly':
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case 'monthly': {
      const targetMonth = d.getUTCMonth() + 1;
      d.setUTCMonth(targetMonth);
      // Clamp if day overflowed (e.g. Jan 31 -> March 2/3 becomes Feb 28/29)
      if (d.getUTCMonth() > (targetMonth % 12)) {
        d.setUTCDate(0);
      }
      break;
    }
    case 'yearly': {
      const targetYear = d.getUTCFullYear() + 1;
      d.setUTCFullYear(targetYear);
      // Leap year Feb 29 check
      if (month === 1 && day === 29 && d.getUTCMonth() === 2) {
        d.setUTCDate(0);
      }
      break;
    }
  }
  return d.toISOString().split('T')[0];
}

export function calculateDueDate(issueDateStr: string, paymentTerms: string): string {
  const parts = issueDateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(Date.UTC(year, month, day));

  switch (paymentTerms) {
    case 'immediate':
      return issueDateStr;
    case 'net_15':
      d.setUTCDate(d.getUTCDate() + 15);
      break;
    case 'net_30':
      d.setUTCDate(d.getUTCDate() + 30);
      break;
    case 'net_60':
      d.setUTCDate(d.getUTCDate() + 60);
      break;
    default:
      d.setUTCDate(d.getUTCDate() + 30);
  }
  return d.toISOString().split('T')[0];
}

export function generateInvoiceForSubscription(
  subscription: Subscription,
  billingDate: string,
  executedByUserId?: string
): Invoice | null {
  const customer = db.users.findById(subscription.customer_id);
  const plan = db.plans.findById(subscription.plan_id);

  if (!customer || !plan) {
    console.error(`Cannot generate invoice for subscription ${subscription.subscription_number}: missing customer or plan.`);
    return null;
  }

  const periodStart = subscription.next_billing_date || billingDate;
  const periodEnd = addIntervalToDate(periodStart, plan.billing_interval);

  // Idempotency check: Don't bill twice for the same billing period
  const existingInvoice = db.invoices.findOne(
    (inv) =>
      inv.subscription_id === subscription.id &&
      inv.billing_period_start === periodStart &&
      inv.status !== 'cancelled'
  );

  if (existingInvoice) {
    console.warn(`Invoice already exists for subscription ${subscription.subscription_number} period ${periodStart} to ${periodEnd}`);
    return null;
  }

  // Get lines
  const lines = db.subscription_lines.find((l) => l.subscription_id === subscription.id);
  if (lines.length === 0) {
    console.warn(`Subscription ${subscription.subscription_number} has no product lines.`);
    return null;
  }

  const invoiceId = uuidv4();
  const invoiceNumber = db.getNextInvoiceNumber();
  const dueDate = calculateDueDate(billingDate, subscription.payment_terms);

  let subtotal = 0;
  let totalTax = 0;
  let totalLineDiscounts = 0;
  const invoiceLines: InvoiceLine[] = [];

  for (const line of lines) {
    const product = db.products.findById(line.product_id);
    const variant = line.variant_id ? db.product_variants.findById(line.variant_id) : undefined;

    const desc = product
      ? `${product.name}${variant ? ` (${variant.attribute_name}: ${variant.attribute_value})` : ''}`
      : 'Subscription Product';

    const lineTotal = line.line_total || line.quantity * line.unit_price;
    subtotal += line.quantity * line.unit_price;
    totalTax += line.tax_amount || 0;
    totalLineDiscounts += line.discount_amount || 0;

    invoiceLines.push({
      id: uuidv4(),
      invoice_id: invoiceId,
      product_id: line.product_id,
      variant_id: line.variant_id || null,
      description: desc,
      quantity: line.quantity,
      unit_price: line.unit_price,
      tax_rate: line.tax_rate,
      tax_amount: line.tax_amount,
      discount_amount: line.discount_amount,
      line_total: lineTotal,
    });
  }

  // Calculate order-level discount if applicable
  let orderDiscountAmount = 0;
  if (subscription.discount_id) {
    const totalQty = lines.reduce((acc, l) => acc + l.quantity, 0);
    const discountRes = validateAndCalculateDiscount(subscription.discount_id, {
      subtotal,
      totalQuantity: totalQty,
      items: lines.map((l) => ({
        productId: l.product_id,
        quantity: l.quantity,
        unitPrice: l.unit_price,
        lineTotal: l.line_total,
      })),
    });

    if (discountRes.valid) {
      orderDiscountAmount = discountRes.discountAmount;
      incrementDiscountUsage(subscription.discount_id);
    } else {
      console.log(`Discount on subscription ${subscription.subscription_number} skipped: ${discountRes.reason}`);
    }
  }

  const totalDiscount = Math.round((totalLineDiscounts + orderDiscountAmount) * 100) / 100;
  const totalAmount = Math.max(0, Math.round((subtotal + totalTax - totalDiscount) * 100) / 100);

  const newInvoice: Invoice = {
    id: invoiceId,
    invoice_number: invoiceNumber,
    subscription_id: subscription.id,
    customer_id: customer.id,
    status: 'draft',
    issue_date: billingDate,
    due_date: dueDate,
    billing_period_start: periodStart,
    billing_period_end: periodEnd,
    subtotal: Math.round(subtotal * 100) / 100,
    tax_amount: Math.round(totalTax * 100) / 100,
    discount_amount: totalDiscount,
    total_amount: totalAmount,
    amount_paid: 0,
    amount_due: totalAmount,
    notes: `Recurring billing for ${plan.name} (${periodStart} to ${periodEnd})`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    customer_name: customer.name,
    customer_email: customer.email,
    subscription_number: subscription.subscription_number,
    lines: invoiceLines,
  };

  db.invoices.insert(newInvoice);
  db.invoice_lines.insertMany(invoiceLines);

  // Advance subscription billing dates
  const nextBilling = periodEnd;
  const updates: Partial<Subscription> = {
    last_billing_date: billingDate,
    next_billing_date: nextBilling,
    updated_at: new Date().toISOString(),
  };

  // Check if subscription should auto-close
  if (plan.auto_close_on_end && subscription.expiry_date && nextBilling > subscription.expiry_date) {
    updates.status = 'closed';
  }

  db.subscriptions.update(subscription.id, updates);

  logAudit({
    userId: executedByUserId,
    action: 'GENERATE_INVOICE',
    entityType: 'invoice',
    entityId: newInvoice.id,
    details: {
      invoiceNumber: newInvoice.invoice_number,
      subscriptionNumber: subscription.subscription_number,
      totalAmount: newInvoice.total_amount,
      periodStart,
      periodEnd,
    },
  });

  return newInvoice;
}

export function runBillingDay(targetDateStr?: string, executedByUserId?: string): BillingRunResult {
  const todayStr = targetDateStr || new Date().toISOString().split('T')[0];
  const logs: string[] = [];
  logs.push(`Starting Billing Run for date: ${todayStr}`);

  const activeSubscriptions = db.subscriptions.find((s) => s.status === 'active');
  logs.push(`Found ${activeSubscriptions.length} active subscriptions in total.`);

  const invoicesGenerated: Invoice[] = [];
  const closedSubscriptions: string[] = [];
  let skippedCount = 0;
  let totalBilledAmount = 0;

  for (const sub of activeSubscriptions) {
    const plan = db.plans.findById(sub.plan_id);
    if (!plan) {
      logs.push(`[Skip] Subscription ${sub.subscription_number}: Plan not found.`);
      skippedCount++;
      continue;
    }

    // Check expiry & auto-close
    if (plan.auto_close_on_end && sub.expiry_date && sub.expiry_date <= todayStr) {
      db.subscriptions.update(sub.id, { status: 'closed', updated_at: new Date().toISOString() });
      closedSubscriptions.push(sub.subscription_number);
      logs.push(`[Closed] Subscription ${sub.subscription_number} reached expiry date (${sub.expiry_date}). Closed automatically.`);
      continue;
    }

    // Check if billing is due
    const nextBill = sub.next_billing_date || sub.start_date;
    if (nextBill > todayStr) {
      logs.push(`[Skip] Subscription ${sub.subscription_number}: Next billing date is ${nextBill} (not yet due).`);
      skippedCount++;
      continue;
    }

    // Generate invoice
    const inv = generateInvoiceForSubscription(sub, todayStr, executedByUserId);
    if (inv) {
      invoicesGenerated.push(inv);
      totalBilledAmount += inv.total_amount;
      logs.push(`[Generated] Invoice ${inv.invoice_number} created for ${sub.subscription_number} ($${inv.total_amount.toFixed(2)}).`);
    } else {
      logs.push(`[Skip/Duplicate] Subscription ${sub.subscription_number} already billed or skipped.`);
      skippedCount++;
    }
  }

  logs.push(`Billing Run completed: ${invoicesGenerated.length} invoices generated, $${totalBilledAmount.toFixed(2)} total billed.`);

  logAudit({
    userId: executedByUserId,
    action: 'RUN_BILLING_DAY',
    entityType: 'billing_job',
    details: {
      date: todayStr,
      generatedCount: invoicesGenerated.length,
      totalAmount: totalBilledAmount,
      closedCount: closedSubscriptions.length,
    },
  });

  return {
    runDate: todayStr,
    processedCount: activeSubscriptions.length,
    invoicesGenerated,
    skippedCount,
    closedSubscriptions,
    totalBilledAmount: Math.round(totalBilledAmount * 100) / 100,
    logs,
  };
}
