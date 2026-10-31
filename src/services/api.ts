import {
  SafeUser,
  Product,
  Plan,
  Tax,
  Discount,
  QuotationTemplate,
  Subscription,
  Invoice,
  Payment,
  FinanceDashboardData,
  BillingRunResult,
} from '../types';

const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('brightloop_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('brightloop_token', token);
    } else {
      localStorage.removeItem('brightloop_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
    }

    return data as T;
  }

  // Auth
  async signup(data: { email: string; password: string; name: string; company_name?: string; phone?: string; address?: string }) {
    return this.request<{ message: string; user: SafeUser; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ message: string; user: SafeUser; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string; resetToken?: string; resetLink?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async getMe() {
    return this.request<{ user: SafeUser }>('/auth/me');
  }

  // Users
  async getUsers(role?: string, search?: string) {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (search) params.set('search', search);
    return this.request<{ users: SafeUser[] }>(`/users?${params.toString()}`);
  }

  async createStaff(data: { email: string; password: string; name: string; phone?: string; company_name?: string }) {
    return this.request<{ message: string; user: SafeUser }>('/users/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createCustomer(data: { email: string; password?: string; name: string; phone?: string; company_name?: string; address?: string }) {
    return this.request<{ message: string; user: SafeUser }>('/users/customer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Products
  async getProducts() {
    return this.request<{ products: Product[] }>('/products');
  }

  async createProduct(data: {
    name: string;
    code: string;
    type: string;
    sales_price: number;
    cost_price: number;
    notes?: string;
    variants?: Array<{ attribute_name: string; attribute_value: string; price_extra: number; sku?: string }>;
  }) {
    return this.request<{ message: string; product: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addProductVariant(productId: string, data: { attribute_name: string; attribute_value: string; price_extra: number; sku?: string }) {
    return this.request<{ message: string; variant: any }>(`/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Plans
  async getPlans() {
    return this.request<{ plans: Plan[] }>('/plans');
  }

  async createPlan(data: Partial<Plan>) {
    return this.request<{ message: string; plan: Plan }>('/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Taxes
  async getTaxes() {
    return this.request<{ taxes: Tax[] }>('/taxes');
  }

  async createTax(data: { name: string; rate: number; is_default?: boolean }) {
    return this.request<{ message: string; tax: Tax }>('/taxes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Discounts
  async getDiscounts() {
    return this.request<{ discounts: Discount[] }>('/discounts');
  }

  async createDiscount(data: Partial<Discount>) {
    return this.request<{ message: string; discount: Discount }>('/discounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async validateDiscount(data: { code: string; subtotal: number; totalQuantity: number; items?: any[] }) {
    return this.request<{ valid: boolean; reason?: string; discount?: Discount; discountAmount: number }>(
      '/discounts/validate',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // Quotation Templates
  async getQuotationTemplates() {
    return this.request<{ templates: QuotationTemplate[] }>('/quotation-templates');
  }

  async createQuotationTemplate(data: any) {
    return this.request<{ message: string; template: QuotationTemplate }>('/quotation-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Subscriptions
  async getSubscriptions(params?: { customer_id?: string; status?: string; plan_id?: string }) {
    const q = new URLSearchParams();
    if (params?.customer_id) q.set('customer_id', params.customer_id);
    if (params?.status) q.set('status', params.status);
    if (params?.plan_id) q.set('plan_id', params.plan_id);
    return this.request<{ subscriptions: Subscription[] }>(`/subscriptions?${q.toString()}`);
  }

  async getSubscription(id: string) {
    return this.request<{ subscription: Subscription }>(`/subscriptions/${id}`);
  }

  async createSubscription(data: any) {
    return this.request<{ message: string; subscription: Subscription }>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async transitionSubscription(id: string, targetStatus: string, reason?: string) {
    return this.request<{ message: string; subscription: Subscription }>(`/subscriptions/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ targetStatus, reason }),
    });
  }

  // Invoices
  async getInvoices(params?: { customer_id?: string; status?: string; overdue?: boolean }) {
    const q = new URLSearchParams();
    if (params?.customer_id) q.set('customer_id', params.customer_id);
    if (params?.status) q.set('status', params.status);
    if (params?.overdue) q.set('overdue', 'true');
    return this.request<{ invoices: Invoice[] }>(`/invoices?${q.toString()}`);
  }

  async getInvoice(id: string) {
    return this.request<{ invoice: Invoice }>(`/invoices/${id}`);
  }

  async confirmInvoice(id: string) {
    return this.request<{ message: string; invoice: Invoice }>(`/invoices/${id}/confirm`, {
      method: 'POST',
    });
  }

  async cancelInvoice(id: string) {
    return this.request<{ message: string; invoice: Invoice }>(`/invoices/${id}/cancel`, {
      method: 'POST',
    });
  }

  async sendInvoice(id: string) {
    return this.request<{ message: string; sent_at: string; invoice: Invoice }>(`/invoices/${id}/send`, {
      method: 'POST',
    });
  }

  // Payments
  async getPayments(params?: { invoice_id?: string; customer_id?: string }) {
    const q = new URLSearchParams();
    if (params?.invoice_id) q.set('invoice_id', params.invoice_id);
    if (params?.customer_id) q.set('customer_id', params.customer_id);
    return this.request<{ payments: Payment[] }>(`/payments?${q.toString()}`);
  }

  async recordPayment(data: {
    invoice_id: string;
    amount: number;
    payment_method: string;
    payment_date?: string;
    reference?: string;
    notes?: string;
  }) {
    return this.request<{ message: string; payment: Payment; invoiceStatus: string; remainingDue: number }>(
      '/payments',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // Billing Day
  async getBillingDue(targetDate?: string) {
    const q = targetDate ? `?targetDate=${targetDate}` : '';
    return this.request<{
      targetDate: string;
      totalActive: number;
      dueCount: number;
      subscriptions: any[];
    }>(`/billing/due${q}`);
  }

  async runBillingDay(targetDate?: string) {
    return this.request<{ message: string; result: BillingRunResult }>('/billing/run', {
      method: 'POST',
      body: JSON.stringify({ targetDate }),
    });
  }

  // Finance Dashboard
  async getFinanceDashboard(filters?: { startDate?: string; endDate?: string; planId?: string; customerId?: string }) {
    const q = new URLSearchParams();
    if (filters?.startDate) q.set('startDate', filters.startDate);
    if (filters?.endDate) q.set('endDate', filters.endDate);
    if (filters?.planId) q.set('planId', filters.planId);
    if (filters?.customerId) q.set('customerId', filters.customerId);
    return this.request<FinanceDashboardData>(`/finance/dashboard?${q.toString()}`);
  }

  async chaseInvoice(invoiceId: string, note?: string) {
    return this.request<{ message: string; customerEmail?: string; amountDue: number }>('/finance/chase-invoice', {
      method: 'POST',
      body: JSON.stringify({ invoiceId, note }),
    });
  }

  // Audit Logs
  async getAuditLogs(limit = 100) {
    return this.request<{ logs: any[] }>(`/audit-logs?limit=${limit}`);
  }
}

export const api = new ApiClient();
export default api;

