import fs from 'fs';
import path from 'path';
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
  AuditLog,
} from '../types';

export interface DatabaseSchema {
  users: User[];
  products: Product[];
  product_variants: ProductVariant[];
  plans: Plan[];
  taxes: Tax[];
  discounts: Discount[];
  quotation_templates: QuotationTemplate[];
  quotation_template_lines: QuotationTemplateLine[];
  subscriptions: Subscription[];
  subscription_lines: SubscriptionLine[];
  invoices: Invoice[];
  invoice_lines: InvoiceLine[];
  payments: Payment[];
  audit_logs: AuditLog[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'brightloop-db.json');
const DB_TMP_PATH = path.join(DB_DIR, 'brightloop-db.tmp.json');

const INITIAL_DATA: DatabaseSchema = {
  users: [],
  products: [],
  product_variants: [],
  plans: [],
  taxes: [],
  discounts: [],
  quotation_templates: [],
  quotation_template_lines: [],
  subscriptions: [],
  subscription_lines: [],
  invoices: [],
  invoice_lines: [],
  payments: [],
  audit_logs: [],
};

class Collection<T extends { id: string }> {
  constructor(
    private getItems: () => T[],
    private setItems: (items: T[]) => void,
    private persist: () => void
  ) {}

  find(predicate?: (item: T) => boolean): T[] {
    const items = this.getItems();
    if (!predicate) return [...items];
    return items.filter(predicate);
  }

  findById(id: string): T | undefined {
    return this.getItems().find((item) => item.id === id);
  }

  findOne(predicate: (item: T) => boolean): T | undefined {
    return this.getItems().find(predicate);
  }

  insert(item: T): T {
    const items = this.getItems();
    items.push(item);
    this.persist();
    return item;
  }

  insertMany(newItems: T[]): T[] {
    const items = this.getItems();
    items.push(...newItems);
    this.persist();
    return newItems;
  }

  update(id: string, updates: Partial<T>): T | undefined {
    const items = this.getItems();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return undefined;

    items[index] = { ...items[index], ...updates };
    this.persist();
    return items[index];
  }

  updateWhere(predicate: (item: T) => boolean, updater: (item: T) => Partial<T>): number {
    const items = this.getItems();
    let updatedCount = 0;
    for (let i = 0; i < items.length; i++) {
      if (predicate(items[i])) {
        items[i] = { ...items[i], ...updater(items[i]) };
        updatedCount++;
      }
    }
    if (updatedCount > 0) {
      this.persist();
    }
    return updatedCount;
  }

  delete(id: string): boolean {
    const items = this.getItems();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return false;

    items.splice(index, 1);
    this.persist();
    return true;
  }

  deleteWhere(predicate: (item: T) => boolean): number {
    const items = this.getItems();
    const initialLen = items.length;
    const filtered = items.filter((item) => !predicate(item));
    this.setItems(filtered);
    const deletedCount = initialLen - filtered.length;
    if (deletedCount > 0) {
      this.persist();
    }
    return deletedCount;
  }

  count(predicate?: (item: T) => boolean): number {
    if (!predicate) return this.getItems().length;
    return this.getItems().filter(predicate).length;
  }

  clear(): void {
    this.setItems([]);
    this.persist();
  }
}

class FastDatabase {
  private data: DatabaseSchema;
  private isPersisting = false;

  public users!: Collection<User>;
  public products!: Collection<Product>;
  public product_variants!: Collection<ProductVariant>;
  public plans!: Collection<Plan>;
  public taxes!: Collection<Tax>;
  public discounts!: Collection<Discount>;
  public quotation_templates!: Collection<QuotationTemplate>;
  public quotation_template_lines!: Collection<QuotationTemplateLine>;
  public subscriptions!: Collection<Subscription>;
  public subscription_lines!: Collection<SubscriptionLine>;
  public invoices!: Collection<Invoice>;
  public invoice_lines!: Collection<InvoiceLine>;
  public payments!: Collection<Payment>;
  public audit_logs!: Collection<AuditLog>;

  constructor() {
    this.ensureDir();
    this.data = this.loadData();
    this.initCollections();
  }

  private ensureDir() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        return { ...INITIAL_DATA, ...parsed };
      }
    } catch (err) {
      console.error('[DB] Failed to load database file, creating fresh database:', err);
    }
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  private persist = () => {
    try {
      this.ensureDir();
      const content = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(DB_TMP_PATH, content, 'utf-8');
      fs.renameSync(DB_TMP_PATH, DB_PATH);
    } catch (err) {
      console.error('[DB] Persistence error:', err);
    }
  };

  private initCollections() {
    this.users = new Collection<User>(
      () => this.data.users,
      (items) => (this.data.users = items),
      this.persist
    );
    this.products = new Collection<Product>(
      () => this.data.products,
      (items) => (this.data.products = items),
      this.persist
    );
    this.product_variants = new Collection<ProductVariant>(
      () => this.data.product_variants,
      (items) => (this.data.product_variants = items),
      this.persist
    );
    this.plans = new Collection<Plan>(
      () => this.data.plans,
      (items) => (this.data.plans = items),
      this.persist
    );
    this.taxes = new Collection<Tax>(
      () => this.data.taxes,
      (items) => (this.data.taxes = items),
      this.persist
    );
    this.discounts = new Collection<Discount>(
      () => this.data.discounts,
      (items) => (this.data.discounts = items),
      this.persist
    );
    this.quotation_templates = new Collection<QuotationTemplate>(
      () => this.data.quotation_templates,
      (items) => (this.data.quotation_templates = items),
      this.persist
    );
    this.quotation_template_lines = new Collection<QuotationTemplateLine>(
      () => this.data.quotation_template_lines,
      (items) => (this.data.quotation_template_lines = items),
      this.persist
    );
    this.subscriptions = new Collection<Subscription>(
      () => this.data.subscriptions,
      (items) => (this.data.subscriptions = items),
      this.persist
    );
    this.subscription_lines = new Collection<SubscriptionLine>(
      () => this.data.subscription_lines,
      (items) => (this.data.subscription_lines = items),
      this.persist
    );
    this.invoices = new Collection<Invoice>(
      () => this.data.invoices,
      (items) => (this.data.invoices = items),
      this.persist
    );
    this.invoice_lines = new Collection<InvoiceLine>(
      () => this.data.invoice_lines,
      (items) => (this.data.invoice_lines = items),
      this.persist
    );
    this.payments = new Collection<Payment>(
      () => this.data.payments,
      (items) => (this.data.payments = items),
      this.persist
    );
    this.audit_logs = new Collection<AuditLog>(
      () => this.data.audit_logs,
      (items) => (this.data.audit_logs = items),
      this.persist
    );
  }

  // Sequential ID generators
  public getNextSubscriptionNumber(): string {
    const year = new Date().getFullYear();
    const count = this.data.subscriptions.length + 1;
    return `SUB-${year}-${String(count).padStart(4, '0')}`;
  }

  public getNextInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const count = this.data.invoices.length + 1;
    return `INV-${year}-${String(count).padStart(4, '0')}`;
  }

  public getNextPaymentNumber(): string {
    const year = new Date().getFullYear();
    const count = this.data.payments.length + 1;
    return `PAY-${year}-${String(count).padStart(4, '0')}`;
  }
}

export const db = new FastDatabase();
export default db;
