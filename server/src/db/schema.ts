export const CREATE_TABLES_SQL = `
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'staff', 'customer')),
  phone TEXT,
  company_name TEXT,
  address TEXT,
  reset_token TEXT,
  reset_token_expiry TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('software', 'service', 'addon', 'consumable')),
  sales_price REAL NOT NULL DEFAULT 0.0,
  cost_price REAL NOT NULL DEFAULT 0.0,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Product Variants table (e.g., Odoo Brand adds 560 to price)
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_name TEXT NOT NULL,
  attribute_value TEXT NOT NULL,
  price_extra REAL NOT NULL DEFAULT 0.0,
  sku TEXT,
  created_at TEXT NOT NULL
);

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  cost REAL NOT NULL DEFAULT 0.0,
  billing_interval TEXT NOT NULL CHECK(billing_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
  min_quantity INTEGER NOT NULL DEFAULT 1,
  start_date TEXT NOT NULL,
  end_date TEXT,
  auto_close_on_end INTEGER NOT NULL DEFAULT 1,
  allow_early_close INTEGER NOT NULL DEFAULT 1,
  allow_pause INTEGER NOT NULL DEFAULT 1,
  allow_renew INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Taxes table
CREATE TABLE IF NOT EXISTS taxes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rate REAL NOT NULL DEFAULT 0.0,
  is_default INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- Discounts table
CREATE TABLE IF NOT EXISTS discounts (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('percentage', 'fixed')),
  value REAL NOT NULL DEFAULT 0.0,
  min_purchase_amount REAL NOT NULL DEFAULT 0.0,
  min_quantity INTEGER NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL,
  end_date TEXT,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  scope TEXT NOT NULL CHECK(scope IN ('subscription', 'product')),
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- Quotation Templates table
CREATE TABLE IF NOT EXISTS quotation_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  plan_id TEXT REFERENCES plans(id) ON DELETE SET NULL,
  validity_days INTEGER NOT NULL DEFAULT 30,
  payment_terms TEXT NOT NULL DEFAULT 'net_30',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Quotation Template Lines table
CREATE TABLE IF NOT EXISTS quotation_template_lines (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES quotation_templates(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0.0,
  discount_pct REAL NOT NULL DEFAULT 0.0
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  subscription_number TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  template_id TEXT REFERENCES quotation_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK(status IN ('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed')),
  start_date TEXT NOT NULL,
  expiry_date TEXT,
  next_billing_date TEXT,
  last_billing_date TEXT,
  payment_terms TEXT NOT NULL DEFAULT 'net_30' CHECK(payment_terms IN ('immediate', 'net_15', 'net_30', 'net_60')),
  subtotal REAL NOT NULL DEFAULT 0.0,
  tax_amount REAL NOT NULL DEFAULT 0.0,
  discount_amount REAL NOT NULL DEFAULT 0.0,
  total_amount REAL NOT NULL DEFAULT 0.0,
  discount_id TEXT REFERENCES discounts(id) ON DELETE SET NULL,
  notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Subscription Lines table
CREATE TABLE IF NOT EXISTS subscription_lines (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0.0,
  tax_id TEXT REFERENCES taxes(id) ON DELETE SET NULL,
  tax_rate REAL NOT NULL DEFAULT 0.0,
  tax_amount REAL NOT NULL DEFAULT 0.0,
  discount_pct REAL NOT NULL DEFAULT 0.0,
  discount_amount REAL NOT NULL DEFAULT 0.0,
  line_total REAL NOT NULL DEFAULT 0.0,
  created_at TEXT NOT NULL
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
  customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK(status IN ('draft', 'confirmed', 'paid', 'cancelled')),
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  billing_period_start TEXT,
  billing_period_end TEXT,
  subtotal REAL NOT NULL DEFAULT 0.0,
  tax_amount REAL NOT NULL DEFAULT 0.0,
  discount_amount REAL NOT NULL DEFAULT 0.0,
  total_amount REAL NOT NULL DEFAULT 0.0,
  amount_paid REAL NOT NULL DEFAULT 0.0,
  amount_due REAL NOT NULL DEFAULT 0.0,
  notes TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Invoice Lines table
CREATE TABLE IF NOT EXISTS invoice_lines (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0.0,
  tax_rate REAL NOT NULL DEFAULT 0.0,
  tax_amount REAL NOT NULL DEFAULT 0.0,
  discount_amount REAL NOT NULL DEFAULT 0.0,
  line_total REAL NOT NULL DEFAULT 0.0
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT UNIQUE NOT NULL,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount REAL NOT NULL DEFAULT 0.0,
  payment_date TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('credit_card', 'bank_transfer', 'stripe', 'paypal', 'cash')),
  reference TEXT,
  notes TEXT,
  recorded_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL
);

-- Indexes for lightning fast lookups and sub-2-second responses
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
`;

