import bcrypt from 'bcryptjs';
import { uuidv4 } from '../utils/id';
import db from './index';
import {
  User,
  Product,
  ProductVariant,
  Plan,
  Tax,
  Discount,
  QuotationTemplate,
  QuotationTemplateLine,
  Subscription,
  SubscriptionLine,
  Invoice,
  InvoiceLine,
  Payment,
} from '../types';

export function seedDatabaseIfEmpty() {
  if (db.users.count() > 0) {
    console.log('[Seed] Database already contains records. Skipping seed.');
    return;
  }

  console.log('[Seed] Seeding Brightloop Software initial dataset...');

  const today = new Date().toISOString().split('T')[0];
  const salt = bcrypt.genSaltSync(10);

  // 1. Users
  const adminUser: User = {
    id: 'user-admin-1',
    email: 'admin@brightloop.com',
    password_hash: bcrypt.hashSync('BrightAdmin!2026', salt),
    name: 'Eleanor Vance (Admin)',
    role: 'admin',
    phone: '+1 (555) 019-2831',
    company_name: 'Brightloop Software HQ',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const staffUser: User = {
    id: 'user-staff-1',
    email: 'staff@brightloop.com',
    password_hash: bcrypt.hashSync('BrightStaff!2026', salt),
    name: 'Marcus Brody (Sales & Billing)',
    role: 'staff',
    phone: '+1 (555) 019-7462',
    company_name: 'Brightloop Operations',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const customer1: User = {
    id: 'user-cust-1',
    email: 'sarah@shoplocal.com',
    password_hash: bcrypt.hashSync('Customer!2026', salt),
    name: 'Sarah Jenkins',
    role: 'customer',
    phone: '+1 (555) 234-5678',
    company_name: 'ShopLocal Retail Inc',
    address: '742 Evergreen Terrace, Springfield, OR',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const customer2: User = {
    id: 'user-cust-2',
    email: 'john@enterprisecorp.com',
    password_hash: bcrypt.hashSync('Customer!2026', salt),
    name: 'John Davis',
    role: 'customer',
    phone: '+1 (555) 876-5432',
    company_name: 'EnterpriseCorp Global',
    address: '100 Wall Street, Suite 400, New York, NY',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const customer3: User = {
    id: 'user-cust-3',
    email: 'alex@startupflow.io',
    password_hash: bcrypt.hashSync('Customer!2026', salt),
    name: 'Alex Chen',
    role: 'customer',
    phone: '+1 (555) 432-1098',
    company_name: 'StartupFlow Tech',
    address: '500 Howard Street, San Francisco, CA',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.users.insertMany([adminUser, staffUser, customer1, customer2, customer3]);

  // 2. Products & Variants
  const erpCore: Product = {
    id: 'prod-erp-1',
    name: 'Brightloop ERP Core',
    code: 'PROD-ERP',
    type: 'software',
    sales_price: 499.0,
    cost_price: 150.0,
    notes: 'Modular cloud subscription software with automated inventory, quotes and financials.',
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const cloudBackup: Product = {
    id: 'prod-backup-1',
    name: 'Automated Cloud Backup Add-on',
    code: 'PROD-BACKUP',
    type: 'addon',
    sales_price: 49.0,
    cost_price: 10.0,
    notes: 'Real-time encrypted snapshots with zero downtime restore.',
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const slaSupport: Product = {
    id: 'prod-support-1',
    name: 'Priority 24/7 SLA Support',
    code: 'PROD-SUPPORT',
    type: 'service',
    sales_price: 199.0,
    cost_price: 60.0,
    notes: 'Guaranteed 15-minute response time SLA and dedicated account engineer.',
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const apiPack: Product = {
    id: 'prod-api-1',
    name: 'Developer API & Webhooks Pack',
    code: 'PROD-API',
    type: 'software',
    sales_price: 89.0,
    cost_price: 15.0,
    notes: 'Unlimited webhook subscriptions and 10,000 req/min rate limit.',
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.products.insertMany([erpCore, cloudBackup, slaSupport, apiPack]);

  // Product Variants
  // Note: Exactly meeting the requirement: "where choosing the Odoo brand adds 560 to the price"
  const varOdoo: ProductVariant = {
    id: 'var-erp-odoo',
    product_id: erpCore.id,
    attribute_name: 'Brand',
    attribute_value: 'Odoo Edition',
    price_extra: 560.0, // Adds 560 to price!
    sku: 'ERP-ODOO-SYNC',
    created_at: new Date().toISOString(),
  };

  const varStandard: ProductVariant = {
    id: 'var-erp-standard',
    product_id: erpCore.id,
    attribute_name: 'Brand',
    attribute_value: 'Standard Brightloop Edition',
    price_extra: 0.0,
    sku: 'ERP-STD',
    created_at: new Date().toISOString(),
  };

  const varMultiRegion: ProductVariant = {
    id: 'var-erp-multiregion',
    product_id: erpCore.id,
    attribute_name: 'Hosting',
    attribute_value: 'Global Multi-Region HA',
    price_extra: 350.0,
    sku: 'ERP-HOST-MULTI',
    created_at: new Date().toISOString(),
  };

  db.product_variants.insertMany([varStandard, varOdoo, varMultiRegion]);

  // 3. Plans
  const planMonthlyStarter: Plan = {
    id: 'plan-monthly-1',
    name: 'Monthly Starter',
    code: 'PLAN-MONTHLY-STARTER',
    cost: 99.0,
    billing_interval: 'monthly',
    min_quantity: 1,
    start_date: '2026-01-01',
    end_date: null,
    auto_close_on_end: 0,
    allow_early_close: 1,
    allow_pause: 1,
    allow_renew: 1,
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const planYearlyEnterprise: Plan = {
    id: 'plan-yearly-1',
    name: 'Yearly Enterprise',
    code: 'PLAN-YEARLY-ENT',
    cost: 4990.0,
    billing_interval: 'yearly',
    min_quantity: 3,
    start_date: '2026-01-01',
    end_date: '2028-12-31',
    auto_close_on_end: 1,
    allow_early_close: 1,
    allow_pause: 1,
    allow_renew: 1,
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const planWeeklyPro: Plan = {
    id: 'plan-weekly-1',
    name: 'Weekly Pro Sprint',
    code: 'PLAN-WEEKLY-PRO',
    cost: 150.0,
    billing_interval: 'weekly',
    min_quantity: 1,
    start_date: '2026-01-01',
    end_date: null,
    auto_close_on_end: 0,
    allow_early_close: 1,
    allow_pause: 1,
    allow_renew: 1,
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const planDailySandbox: Plan = {
    id: 'plan-daily-1',
    name: 'Daily Sandbox Testing',
    code: 'PLAN-DAILY-SANDBOX',
    cost: 15.0,
    billing_interval: 'daily',
    min_quantity: 1,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    auto_close_on_end: 1,
    allow_early_close: 1,
    allow_pause: 0,
    allow_renew: 0,
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.plans.insertMany([planMonthlyStarter, planYearlyEnterprise, planWeeklyPro, planDailySandbox]);

  // 4. Taxes
  const vat10: Tax = {
    id: 'tax-vat-10',
    name: 'VAT 10%',
    rate: 10.0,
    is_default: 1,
    is_active: 1,
    created_at: new Date().toISOString(),
  };

  const salesTax8: Tax = {
    id: 'tax-sales-8',
    name: 'Sales Tax 8%',
    rate: 8.0,
    is_default: 0,
    is_active: 1,
    created_at: new Date().toISOString(),
  };

  const gst18: Tax = {
    id: 'tax-gst-18',
    name: 'GST 18%',
    rate: 18.0,
    is_default: 0,
    is_active: 1,
    created_at: new Date().toISOString(),
  };

  const zeroTax: Tax = {
    id: 'tax-zero',
    name: 'Tax Exempt 0%',
    rate: 0.0,
    is_default: 0,
    is_active: 1,
    created_at: new Date().toISOString(),
  };

  db.taxes.insertMany([vat10, salesTax8, gst18, zeroTax]);

  // 5. Discounts (Admin configured)
  const discountVolume15: Discount = {
    id: 'disc-vol-15',
    code: 'VOLUME15',
    name: 'Volume Tier 15% Off',
    type: 'percentage',
    value: 15.0,
    min_purchase_amount: 300.0,
    min_quantity: 2,
    start_date: '2026-01-01',
    end_date: '2027-12-31',
    max_uses: 100,
    used_count: 5,
    scope: 'subscription',
    product_id: null,
    is_active: 1,
    created_at: new Date().toISOString(),
  };

  const discountEnterprise200: Discount = {
    id: 'disc-ent-200',
    code: 'ENTERPRISE200',
    name: 'Enterprise $200 Loyalty Credit',
    type: 'fixed',
    value: 200.0,
    min_purchase_amount: 800.0,
    min_quantity: 1,
    start_date: '2026-01-01',
    end_date: '2027-12-31',
    max_uses: 50,
    used_count: 2,
    scope: 'subscription',
    product_id: null,
    is_active: 1,
    created_at: new Date().toISOString(),
  };

  const discountWelcome10: Discount = {
    id: 'disc-welcome-10',
    code: 'WELCOME10',
    name: 'New Customer Welcome 10%',
    type: 'percentage',
    value: 10.0,
    min_purchase_amount: 50.0,
    min_quantity: 1,
    start_date: '2026-01-01',
    end_date: '2027-12-31',
    max_uses: 500,
    used_count: 12,
    scope: 'subscription',
    product_id: null,
    is_active: 1,
    created_at: new Date().toISOString(),
  };

  db.discounts.insertMany([discountVolume15, discountEnterprise200, discountWelcome10]);

  // 6. Quotation Templates
  const tplStandard: QuotationTemplate = {
    id: 'tpl-std-1',
    name: 'Standard ERP Quickstart Bundle',
    description: 'Preconfigured package with Monthly Starter, ERP Core, and Cloud Backup.',
    plan_id: planMonthlyStarter.id,
    validity_days: 30,
    payment_terms: 'net_30',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const tplEnterprise: QuotationTemplate = {
    id: 'tpl-ent-1',
    name: 'Large Enterprise Annual Solution',
    description: 'Tailored for large teams with Odoo Brand variant, Dedicated 24/7 SLA, and Backups.',
    plan_id: planYearlyEnterprise.id,
    validity_days: 60,
    payment_terms: 'net_30',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.quotation_templates.insertMany([tplStandard, tplEnterprise]);

  // Template Lines
  const tplLines: QuotationTemplateLine[] = [
    {
      id: uuidv4(),
      template_id: tplStandard.id,
      product_id: erpCore.id,
      variant_id: varStandard.id,
      quantity: 1,
      unit_price: 499.0,
      discount_pct: 0,
    },
    {
      id: uuidv4(),
      template_id: tplStandard.id,
      product_id: cloudBackup.id,
      variant_id: null,
      quantity: 1,
      unit_price: 49.0,
      discount_pct: 0,
    },
    {
      id: uuidv4(),
      template_id: tplEnterprise.id,
      product_id: erpCore.id,
      variant_id: varOdoo.id, // Odoo variant (+$560)
      quantity: 5,
      unit_price: 1059.0, // 499 + 560
      discount_pct: 5,
    },
    {
      id: uuidv4(),
      template_id: tplEnterprise.id,
      product_id: slaSupport.id,
      variant_id: null,
      quantity: 1,
      unit_price: 199.0,
      discount_pct: 0,
    },
  ];

  db.quotation_template_lines.insertMany(tplLines);

  // 7. Subscriptions
  // Sub 1: Active, due for billing TODAY (demonstrates "Billing Day" engine)
  const sub1Id = 'sub-demo-due';
  const sub1: Subscription = {
    id: sub1Id,
    subscription_number: 'SUB-2026-0001',
    customer_id: customer1.id,
    plan_id: planMonthlyStarter.id,
    template_id: tplStandard.id,
    status: 'active',
    start_date: '2026-10-01',
    expiry_date: null,
    next_billing_date: today, // DUE TODAY!
    last_billing_date: '2026-10-01',
    payment_terms: 'net_30',
    subtotal: 548.0,
    tax_amount: 54.8,
    discount_amount: 0.0,
    total_amount: 602.8,
    discount_id: null,
    notes: 'Monthly subscription for ShopLocal main store.',
    created_by: adminUser.id,
    created_at: '2026-10-01T08:00:00.000Z',
    updated_at: new Date().toISOString(),
  };

  const sub1Lines: SubscriptionLine[] = [
    {
      id: uuidv4(),
      subscription_id: sub1Id,
      product_id: erpCore.id,
      variant_id: varStandard.id,
      quantity: 1,
      unit_price: 499.0,
      tax_id: vat10.id,
      tax_rate: 10.0,
      tax_amount: 49.9,
      discount_pct: 0,
      discount_amount: 0,
      line_total: 548.9,
      created_at: '2026-10-01T08:00:00.000Z',
    },
    {
      id: uuidv4(),
      subscription_id: sub1Id,
      product_id: cloudBackup.id,
      variant_id: null,
      quantity: 1,
      unit_price: 49.0,
      tax_id: vat10.id,
      tax_rate: 10.0,
      tax_amount: 4.9,
      discount_pct: 0,
      discount_amount: 0,
      line_total: 53.9,
      created_at: '2026-10-01T08:00:00.000Z',
    },
  ];

  // Sub 2: Enterprise with Odoo Edition variant & Volume Discount
  const sub2Id = 'sub-demo-ent';
  const sub2: Subscription = {
    id: sub2Id,
    subscription_number: 'SUB-2026-0002',
    customer_id: customer2.id,
    plan_id: planYearlyEnterprise.id,
    template_id: tplEnterprise.id,
    status: 'active',
    start_date: '2026-06-15',
    expiry_date: '2027-06-15',
    next_billing_date: '2027-06-15',
    last_billing_date: '2026-06-15',
    payment_terms: 'net_30',
    subtotal: 5494.0,
    tax_amount: 549.4,
    discount_amount: 824.1, // 15% volume discount
    total_amount: 5219.3,
    discount_id: discountVolume15.id,
    notes: 'Enterprise contract with Odoo Brand variant integration.',
    created_by: staffUser.id,
    created_at: '2026-06-15T10:30:00.000Z',
    updated_at: new Date().toISOString(),
  };

  const sub2Lines: SubscriptionLine[] = [
    {
      id: uuidv4(),
      subscription_id: sub2Id,
      product_id: erpCore.id,
      variant_id: varOdoo.id, // Odoo variant adds 560
      quantity: 5,
      unit_price: 1059.0,
      tax_id: vat10.id,
      tax_rate: 10.0,
      tax_amount: 529.5,
      discount_pct: 0,
      discount_amount: 0,
      line_total: 5824.5,
      created_at: '2026-06-15T10:30:00.000Z',
    },
    {
      id: uuidv4(),
      subscription_id: sub2Id,
      product_id: slaSupport.id,
      variant_id: null,
      quantity: 1,
      unit_price: 199.0,
      tax_id: vat10.id,
      tax_rate: 10.0,
      tax_amount: 19.9,
      discount_pct: 0,
      discount_amount: 0,
      line_total: 218.9,
      created_at: '2026-06-15T10:30:00.000Z',
    },
  ];

  // Sub 3: Quotation stage for StartupFlow
  const sub3Id = 'sub-demo-quote';
  const sub3: Subscription = {
    id: sub3Id,
    subscription_number: 'SUB-2026-0003',
    customer_id: customer3.id,
    plan_id: planWeeklyPro.id,
    template_id: null,
    status: 'quotation',
    start_date: today,
    expiry_date: null,
    next_billing_date: null,
    last_billing_date: null,
    payment_terms: 'net_15',
    subtotal: 239.0,
    tax_amount: 23.9,
    discount_amount: 23.9,
    total_amount: 239.0,
    discount_id: discountWelcome10.id,
    notes: 'Quotation sent to Alex Chen with 10% Welcome discount.',
    created_by: staffUser.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sub3Lines: SubscriptionLine[] = [
    {
      id: uuidv4(),
      subscription_id: sub3Id,
      product_id: erpCore.id,
      variant_id: varStandard.id,
      quantity: 1,
      unit_price: 150.0,
      tax_id: vat10.id,
      tax_rate: 10.0,
      tax_amount: 15.0,
      discount_pct: 0,
      discount_amount: 0,
      line_total: 165.0,
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      subscription_id: sub3Id,
      product_id: apiPack.id,
      variant_id: null,
      quantity: 1,
      unit_price: 89.0,
      tax_id: vat10.id,
      tax_rate: 10.0,
      tax_amount: 8.9,
      discount_pct: 0,
      discount_amount: 0,
      line_total: 97.9,
      created_at: new Date().toISOString(),
    },
  ];

  db.subscriptions.insertMany([sub1, sub2, sub3]);
  db.subscription_lines.insertMany([...sub1Lines, ...sub2Lines, ...sub3Lines]);

  // 8. Invoices
  // Invoice 1: Paid invoice
  const inv1Id = 'inv-demo-1';
  const inv1: Invoice = {
    id: inv1Id,
    invoice_number: 'INV-2026-0001',
    subscription_id: sub2.id,
    customer_id: customer2.id,
    status: 'paid',
    issue_date: '2026-06-15',
    due_date: '2026-07-15',
    billing_period_start: '2026-06-15',
    billing_period_end: '2027-06-15',
    subtotal: 5494.0,
    tax_amount: 549.4,
    discount_amount: 824.1,
    total_amount: 5219.3,
    amount_paid: 5219.3,
    amount_due: 0.0,
    notes: 'Annual billing for EnterpriseCorp Global',
    sent_at: '2026-06-15T11:00:00.000Z',
    created_at: '2026-06-15T10:45:00.000Z',
    updated_at: '2026-06-18T14:20:00.000Z',
  };

  const inv1Lines: InvoiceLine[] = [
    {
      id: uuidv4(),
      invoice_id: inv1Id,
      product_id: erpCore.id,
      variant_id: varOdoo.id,
      description: 'Brightloop ERP Core (Brand: Odoo Edition)',
      quantity: 5,
      unit_price: 1059.0,
      tax_rate: 10.0,
      tax_amount: 529.5,
      discount_amount: 794.25,
      line_total: 5029.25,
    },
    {
      id: uuidv4(),
      invoice_id: inv1Id,
      product_id: slaSupport.id,
      variant_id: null,
      description: 'Priority 24/7 SLA Support',
      quantity: 1,
      unit_price: 199.0,
      tax_rate: 10.0,
      tax_amount: 19.9,
      discount_amount: 29.85,
      line_total: 189.05,
    },
  ];

  // Invoice 2: Overdue invoice (for Finance Lead to review & chase)
  const inv2Id = 'inv-demo-2';
  const inv2: Invoice = {
    id: inv2Id,
    invoice_number: 'INV-2026-0002',
    subscription_id: sub1.id,
    customer_id: customer1.id,
    status: 'confirmed',
    issue_date: '2026-09-01',
    due_date: '2026-10-01', // Due in the past => OVERDUE!
    billing_period_start: '2026-09-01',
    billing_period_end: '2026-10-01',
    subtotal: 548.0,
    tax_amount: 54.8,
    discount_amount: 0.0,
    total_amount: 602.8,
    amount_paid: 200.0, // Partial payment of $200!
    amount_due: 402.8, // Outstanding $402.80 overdue!
    notes: 'Monthly cycle for ShopLocal September 2026',
    sent_at: '2026-09-01T09:00:00.000Z',
    created_at: '2026-09-01T08:30:00.000Z',
    updated_at: '2026-09-15T12:00:00.000Z',
  };

  const inv2Lines: InvoiceLine[] = [
    {
      id: uuidv4(),
      invoice_id: inv2Id,
      product_id: erpCore.id,
      variant_id: varStandard.id,
      description: 'Brightloop ERP Core (Brand: Standard Brightloop Edition)',
      quantity: 1,
      unit_price: 499.0,
      tax_rate: 10.0,
      tax_amount: 49.9,
      discount_amount: 0,
      line_total: 548.9,
    },
    {
      id: uuidv4(),
      invoice_id: inv2Id,
      product_id: cloudBackup.id,
      variant_id: null,
      description: 'Automated Cloud Backup Add-on',
      quantity: 1,
      unit_price: 49.0,
      tax_rate: 10.0,
      tax_amount: 4.9,
      discount_amount: 0,
      line_total: 53.9,
    },
  ];

  db.invoices.insertMany([inv1, inv2]);
  db.invoice_lines.insertMany([...inv1Lines, ...inv2Lines]);

  // 9. Payments
  const pay1: Payment = {
    id: 'pay-demo-1',
    payment_number: 'PAY-2026-0001',
    invoice_id: inv1.id,
    customer_id: customer2.id,
    amount: 5219.3,
    payment_date: '2026-06-18',
    payment_method: 'bank_transfer',
    reference: 'WIRE-ENT-884920',
    notes: 'Bank wire received for Annual Enterprise invoice.',
    recorded_by: staffUser.id,
    created_at: '2026-06-18T14:20:00.000Z',
  };

  const pay2: Payment = {
    id: 'pay-demo-2',
    payment_number: 'PAY-2026-0002',
    invoice_id: inv2.id,
    customer_id: customer1.id,
    amount: 200.0,
    payment_date: '2026-09-15',
    payment_method: 'credit_card',
    reference: 'CC-AUTH-77382',
    notes: 'Partial payment on account.',
    recorded_by: staffUser.id,
    created_at: '2026-09-15T12:00:00.000Z',
  };

  db.payments.insertMany([pay1, pay2]);

  console.log('[Seed] Database successfully populated with realistic Brightloop demo data.');
}
