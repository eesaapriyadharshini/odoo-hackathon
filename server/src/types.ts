export type UserRole = 'admin' | 'staff' | 'customer';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  company_name?: string | null;
  address?: string | null;
  reset_token?: string | null;
  reset_token_expiry?: string | null;
  created_at: string;
  updated_at: string;
}

export type SafeUser = Omit<User, 'password_hash' | 'reset_token' | 'reset_token_expiry'>;

export type ProductType = 'software' | 'service' | 'addon' | 'consumable';

export interface Product {
  id: string;
  name: string;
  code: string;
  type: ProductType;
  sales_price: number;
  cost_price: number;
  notes?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  attribute_name: string;
  attribute_value: string;
  price_extra: number;
  sku?: string | null;
  created_at: string;
}

export type BillingInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Plan {
  id: string;
  name: string;
  code: string;
  cost: number;
  billing_interval: BillingInterval;
  min_quantity: number;
  start_date: string;
  end_date?: string | null;
  auto_close_on_end: number; // 1 or 0
  allow_early_close: number;
  allow_pause: number;
  allow_renew: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Tax {
  id: string;
  name: string;
  rate: number;
  is_default: number;
  is_active: number;
  created_at: string;
}

export type DiscountType = 'percentage' | 'fixed';
export type DiscountScope = 'subscription' | 'product';

export interface Discount {
  id: string;
  code: string;
  name: string;
  type: DiscountType;
  value: number;
  min_purchase_amount: number;
  min_quantity: number;
  start_date: string;
  end_date?: string | null;
  max_uses?: number | null;
  used_count: number;
  scope: DiscountScope;
  product_id?: string | null;
  is_active: number;
  created_at: string;
}

export type PaymentTerms = 'immediate' | 'net_15' | 'net_30' | 'net_60';

export interface QuotationTemplate {
  id: string;
  name: string;
  description?: string | null;
  plan_id?: string | null;
  validity_days: number;
  payment_terms: PaymentTerms;
  created_at: string;
  updated_at: string;
  lines?: QuotationTemplateLine[];
  plan_name?: string;
}

export interface QuotationTemplateLine {
  id: string;
  template_id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  product_name?: string;
  variant_name?: string;
}

export type SubscriptionStatus = 'draft' | 'quotation' | 'confirmed' | 'active' | 'paused' | 'closed';

export interface Subscription {
  id: string;
  subscription_number: string;
  customer_id: string;
  plan_id: string;
  template_id?: string | null;
  status: SubscriptionStatus;
  start_date: string;
  expiry_date?: string | null;
  next_billing_date?: string | null;
  last_billing_date?: string | null;
  payment_terms: PaymentTerms;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  discount_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer_name?: string;
  customer_email?: string;
  plan_name?: string;
  billing_interval?: BillingInterval;
  lines?: SubscriptionLine[];
  discount_code?: string;
}

export interface SubscriptionLine {
  id: string;
  subscription_id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  unit_price: number;
  tax_id?: string | null;
  tax_rate: number;
  tax_amount: number;
  discount_pct: number;
  discount_amount: number;
  line_total: number;
  created_at: string;
  product_name?: string;
  product_code?: string;
  variant_name?: string;
}

export type InvoiceStatus = 'draft' | 'confirmed' | 'paid' | 'cancelled';

export interface Invoice {
  id: string;
  invoice_number: string;
  subscription_id?: string | null;
  customer_id: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  billing_period_start?: string | null;
  billing_period_end?: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  notes?: string | null;
  sent_at?: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_email?: string;
  subscription_number?: string;
  lines?: InvoiceLine[];
  payments?: Payment[];
  is_overdue?: boolean;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  product_id: string;
  variant_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  line_total: number;
  product_name?: string;
  variant_name?: string;
}

export type PaymentMethod = 'credit_card' | 'bank_transfer' | 'stripe' | 'paypal' | 'cash';

export interface Payment {
  id: string;
  payment_number: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  recorded_by?: string | null;
  created_at: string;
  invoice_number?: string;
  customer_name?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: string | null;
  ip_address?: string | null;
  created_at: string;
}

