import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Tag, Percent, Sparkles, Check, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { SafeUser, Product, Plan, Tax, QuotationTemplate } from '../types';

interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateSubscriptionModal: React.FC<CreateSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [customers, setCustomers] = useState<SafeUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);

  // Form states
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('net_30');
  const [status, setStatus] = useState<string>('draft');
  const [notes, setNotes] = useState<string>('');

  // Discount code & validation
  const [discountCode, setDiscountCode] = useState<string>('');
  const [discountValidation, setDiscountValidation] = useState<any>(null);
  const [validatingDiscount, setValidatingDiscount] = useState<boolean>(false);

  // Line items
  const [lines, setLines] = useState<
    Array<{
      product_id: string;
      variant_id: string;
      quantity: number;
      unit_price: number;
      tax_id: string;
    }>
  >([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load prerequisites & reset state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setExpiryDate('');
      setPaymentTerms('net_30');
      setStatus('draft');
      setNotes('');
      setDiscountCode('');
      setDiscountValidation(null);
      setError(null);
      setLines([]);

      Promise.all([
        api.getUsers('customer'),
        api.getPlans(),
        api.getProducts(),
        api.getTaxes(),
        api.getQuotationTemplates(),
      ]).then(([usersRes, plansRes, prodsRes, taxesRes, tplsRes]) => {
        setCustomers(usersRes.users);
        setPlans(plansRes.plans);
        setProducts(prodsRes.products);
        setTaxes(taxesRes.taxes);
        setTemplates(tplsRes.templates);

        if (usersRes.users.length > 0) {
          setSelectedCustomer(usersRes.users[0].id);
        }
        if (plansRes.plans.length > 0) {
          setSelectedPlan(plansRes.plans[0].id);
        }
      });
    }
  }, [isOpen]);

  // Handle Template Selection (Scene 3: "Instead of building it from scratch, they start from a quotation template")
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (!templateId) return;

    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;

    if (tpl.plan_id) setSelectedPlan(tpl.plan_id);
    if (tpl.payment_terms) setPaymentTerms(tpl.payment_terms);

    if (tpl.validity_days) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + tpl.validity_days);
      setExpiryDate(d.toISOString().split('T')[0]);
    }

    if (tpl.lines && tpl.lines.length > 0) {
      const defaultTax = taxes.find((t) => t.is_default === 1)?.id || (taxes[0] ? taxes[0].id : '');
      const mapped = tpl.lines.map((l) => ({
        product_id: l.product_id,
        variant_id: l.variant_id || '',
        quantity: l.quantity,
        unit_price: l.unit_price,
        tax_id: defaultTax,
      }));
      setLines(mapped);
    }
  };

  const addLine = () => {
    if (products.length === 0) return;
    const defaultProduct = products[0];
    const defaultTax = taxes.find((t) => t.is_default === 1)?.id || (taxes[0] ? taxes[0].id : '');
    setLines([
      ...lines,
      {
        product_id: defaultProduct.id,
        variant_id: '',
        quantity: 1,
        unit_price: defaultProduct.sales_price,
        tax_id: defaultTax,
      },
    ]);
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, updates: Partial<(typeof lines)[0]>) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], ...updates };

    // If product changed, update base unit_price
    if (updates.product_id) {
      const prod = products.find((p) => p.id === updates.product_id);
      if (prod) {
        updated[idx].unit_price = prod.sales_price;
        updated[idx].variant_id = '';
      }
    }

    // If variant changed, add variant price_extra (e.g. +$560 for Odoo brand)
    if (updates.variant_id !== undefined) {
      const prod = products.find((p) => p.id === updated[idx].product_id);
      if (prod) {
        let price = prod.sales_price;
        if (updates.variant_id) {
          const variant = prod.variants?.find((v) => v.id === updates.variant_id);
          if (variant) {
            price += variant.price_extra;
          }
        }
        updated[idx].unit_price = price;
      }
    }

    setLines(updated);
  };

  // Calculate live totals
  let subtotal = 0;
  let taxTotal = 0;
  for (const line of lines) {
    const lineSubtotal = line.quantity * line.unit_price;
    subtotal += lineSubtotal;
    const tax = taxes.find((t) => t.id === line.tax_id);
    if (tax) {
      taxTotal += (lineSubtotal * tax.rate) / 100;
    }
  }

  const validateCode = async () => {
    if (!discountCode.trim()) return;
    setValidatingDiscount(true);
    setDiscountValidation(null);
    try {
      const totalQty = lines.reduce((acc, l) => acc + l.quantity, 0);
      const res = await api.validateDiscount({
        code: discountCode.trim(),
        subtotal,
        totalQuantity: totalQty,
        items: lines.map((l) => ({
          productId: l.product_id,
          quantity: l.quantity,
          unitPrice: l.unit_price,
          lineTotal: l.quantity * l.unit_price,
        })),
      });
      setDiscountValidation(res);
    } catch (err: any) {
      setDiscountValidation({ valid: false, reason: err.message, discountAmount: 0 });
    } finally {
      setValidatingDiscount(false);
    }
  };

  const discountAmount = discountValidation?.valid ? discountValidation.discountAmount : 0;
  const grandTotal = Math.max(0, subtotal + taxTotal - discountAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedPlan || !startDate) {
      setError('Please select a customer, plan, and start date.');
      return;
    }

    if (lines.length === 0) {
      setError('Please add at least one product line.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.createSubscription({
        customer_id: selectedCustomer,
        plan_id: selectedPlan,
        template_id: selectedTemplate || null,
        start_date: startDate,
        expiry_date: expiryDate || null,
        payment_terms: paymentTerms,
        discount_code: discountCode.trim() || null,
        notes: notes || null,
        status,
        lines,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create subscription.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create Subscription or Quote</h2>
            <p className="text-xs text-slate-500">
              Set up a new recurring agreement from scratch or start from a pre-configured quotation template.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Template Fast-Start Banner */}
          <div className="p-3.5 bg-indigo-50/60 border border-indigo-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="font-bold text-indigo-900">Start from Quotation Template:</span>
                <span className="text-indigo-700 ml-1">Pre-fills plan, products, and duration</span>
              </div>
            </div>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="px-3 py-1.5 bg-white border border-indigo-300 rounded-lg font-medium text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Build Custom From Scratch --</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.plan_name})
                </option>
              ))}
            </select>
          </div>

          {/* Customer, Plan, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customer Account</label>
              <select
                required
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company_name ? `(${c.company_name})` : `(${c.email})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Billing Plan</label>
              <select
                required
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.cost}/{p.billing_interval})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="draft">Draft</option>
                <option value="quotation">Quotation (Send to customer)</option>
                <option value="confirmed">Confirmed</option>
                <option value="active">Active (Start Billing Cycle)</option>
              </select>
            </div>
          </div>

          {/* Dates & Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expiry Date (Optional)</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="immediate">Immediate Payment</option>
                <option value="net_15">Net 15 Days</option>
                <option value="net_30">Net 30 Days (Standard)</option>
                <option value="net_60">Net 60 Days</option>
              </select>
            </div>
          </div>

          {/* Product Lines Section */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Subscription Product Lines
              </span>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-600 border border-indigo-200 rounded-lg font-bold text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product Line
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="text-center py-6 bg-white rounded-lg border border-dashed border-slate-200 text-slate-400">
                No items added yet. Click "+ Add Product Line" above or pick a template.
              </div>
            ) : (
              <div className="space-y-2">
                {lines.map((line, idx) => {
                  const prod = products.find((p) => p.id === line.product_id);
                  const variants = prod?.variants || [];

                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 p-2.5 bg-white rounded-lg border border-slate-200 items-center"
                    >
                      {/* Product */}
                      <div className="col-span-4">
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Product</label>
                        <select
                          value={line.product_id}
                          onChange={(e) => updateLine(idx, { product_id: e.target.value })}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (${p.sales_price})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Variant (Supports Odoo brand variant!) */}
                      <div className="col-span-3">
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Variant</label>
                        <select
                          value={line.variant_id}
                          onChange={(e) => updateLine(idx, { variant_id: e.target.value })}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs"
                        >
                          <option value="">Default / Standard</option>
                          {variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.attribute_value} {v.price_extra > 0 ? `(+${v.price_extra})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-1">
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) || 1 })}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-center"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Unit Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(e) => updateLine(idx, { unit_price: Number(e.target.value) })}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs"
                        />
                      </div>

                      {/* Line Subtotal & Delete */}
                      <div className="col-span-2 flex items-center justify-between pl-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Subtotal</label>
                          <span className="font-bold text-slate-800">
                            ${(line.quantity * line.unit_price).toFixed(2)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Discount Code Section (Scene 5) */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-600" />
              <label className="font-semibold text-slate-700">Apply Discount Code (Optional)</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={discountCode}
                onChange={(e) => {
                  setDiscountCode(e.target.value);
                  setDiscountValidation(null);
                }}
                placeholder="e.g. VOLUME15, ENTERPRISE200, WELCOME10"
                className="flex-1 px-3 py-1.5 uppercase font-mono bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={validateCode}
                disabled={validatingDiscount || !discountCode.trim()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white font-bold rounded-lg transition-colors"
              >
                {validatingDiscount ? 'Checking...' : 'Validate Code'}
              </button>
            </div>

            {discountValidation && (
              <div
                className={`p-2 rounded-lg text-[11px] font-medium flex items-center justify-between ${discountValidation.valid
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
              >
                <span>
                  {discountValidation.valid
                    ? `✓ Code active! ${discountValidation.discount?.name} applied.`
                    : `✕ ${discountValidation.reason}`}
                </span>
                {discountValidation.valid && (
                  <span className="font-bold text-emerald-700">
                    -${discountValidation.discountAmount.toFixed(2)} off
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-1.5 text-right">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount:</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>Tax (Est.):</span>
                <span className="font-semibold text-slate-900">${taxTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total per Cycle:</span>
                <span className="text-indigo-600">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Creating...' : `Save Subscription (${status})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

