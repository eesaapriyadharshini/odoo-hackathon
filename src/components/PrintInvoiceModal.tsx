import React from 'react';
import { X, Printer, Download, CheckCircle2, AlertCircle, Building, Mail, Layers } from 'lucide-react';
import { Invoice } from '../types';

interface PrintInvoiceModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({ invoice, isOpen, onClose }) => {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Invoice Document Preview</span>
            <span className="text-xs text-slate-400">• Ready for Print or PDF Export</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div id="printable-invoice" className="p-8 sm:p-10 overflow-y-auto bg-white flex-1 text-slate-800">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Layers className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-xl font-black tracking-tight text-slate-900">Brightloop Software</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cloud Enterprise Software & Subscriptions<br />
                100 Innovation Way, Suite 500<br />
                billing@brightloop.com • +1 (800) 555-0199
              </p>
            </div>

            <div className="sm:text-right">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">INVOICE</h1>
              <div className="text-xs font-mono font-bold text-indigo-600 mt-1">{invoice.invoice_number}</div>
              <div className="mt-2 inline-block">
                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                    invoice.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : invoice.status === 'confirmed'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : invoice.status === 'cancelled'
                      ? 'bg-slate-200 text-slate-600'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>

          {/* Bill To & Invoice Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs">
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1.5 text-[10px]">
                Billed To
              </span>
              <div className="font-bold text-slate-900 text-sm">{invoice.customer_name}</div>
              <div className="text-slate-600 mt-0.5">{invoice.customer_email}</div>
              {invoice.subscription_number && (
                <div className="text-slate-500 mt-1">
                  Subscription Ref: <span className="font-semibold text-slate-700">{invoice.subscription_number}</span>
                </div>
              )}
            </div>

            <div className="sm:text-right space-y-1">
              <div>
                <span className="text-slate-500">Invoice Date: </span>
                <span className="font-semibold text-slate-900">{invoice.issue_date}</span>
              </div>
              <div>
                <span className="text-slate-500">Payment Due Date: </span>
                <span className="font-bold text-slate-900">{invoice.due_date}</span>
              </div>
              {invoice.billing_period_start && invoice.billing_period_end && (
                <div>
                  <span className="text-slate-500">Billing Period: </span>
                  <span className="text-slate-700 font-medium">
                    {invoice.billing_period_start} to {invoice.billing_period_end}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5">Item Description</th>
                  <th className="py-2.5 text-center">Qty</th>
                  <th className="py-2.5 text-right">Unit Price</th>
                  <th className="py-2.5 text-right">Tax Rate</th>
                  <th className="py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.lines && invoice.lines.length > 0 ? (
                  invoice.lines.map((line) => (
                    <tr key={line.id} className="py-2.5">
                      <td className="py-3 font-semibold text-slate-800">
                        {line.description}
                      </td>
                      <td className="py-3 text-center text-slate-600">{line.quantity}</td>
                      <td className="py-3 text-right text-slate-600">${line.unit_price.toFixed(2)}</td>
                      <td className="py-3 text-right text-slate-600">{line.tax_rate}%</td>
                      <td className="py-3 text-right font-bold text-slate-900">${line.line_total.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">
                      Standard recurring subscription charges
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">${invoice.subtotal.toFixed(2)}</span>
              </div>

              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discounts Applied:</span>
                  <span>-${invoice.discount_amount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Calculated Tax:</span>
                <span className="font-semibold text-slate-900">${invoice.tax_amount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Due:</span>
                <span className="text-indigo-600">${invoice.total_amount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-xs text-slate-600">
                <span>Amount Paid:</span>
                <span className="font-bold text-emerald-600">${invoice.amount_paid.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-xs font-bold text-slate-900 pt-1 border-t border-dashed border-slate-200">
                <span>Balance Due:</span>
                <span className={invoice.amount_due > 0 ? 'text-rose-600 font-extrabold' : 'text-slate-900'}>
                  ${invoice.amount_due.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Receipts Record (if any) */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Recorded Payment Receipts
              </span>
              <div className="space-y-1.5">
                {invoice.payments.map((p) => (
                  <div key={p.id} className="p-2.5 bg-slate-50 rounded-lg text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{p.payment_number}</span>
                      <span className="text-slate-500 ml-2">via {p.payment_method.replace('_', ' ')}</span>
                      {p.reference && <span className="text-slate-400 ml-2 font-mono">({p.reference})</span>}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-700">${p.amount.toFixed(2)}</span>
                      <span className="text-slate-400 ml-2 text-[10px]">{p.payment_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="mt-10 pt-6 border-t border-slate-200 text-center text-[11px] text-slate-400">
            Thank you for partnering with Brightloop Software. For billing inquiries, contact billing@brightloop.com.
          </div>
        </div>
      </div>
    </div>
  );
};

