import React, { useState, useEffect } from 'react';
import {
  Layers,
  DollarSign,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Mail,
  Building,
  Pause,
  Play,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import api from '../services/api';
import { Subscription, Invoice, SafeUser } from '../types';
import { PrintInvoiceModal } from '../components/PrintInvoiceModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { useAuth } from '../context/AuthContext';

export const CustomerPortalView: React.FC = () => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [processingSubId, setProcessingSubId] = useState<string | null>(null);

  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  const loadCustomerData = async () => {
    setLoading(true);
    try {
      const [subsRes, invsRes, plansRes] = await Promise.all([
        api.getSubscriptions(),
        api.getInvoices(),
        api.getPlans(),
      ]);
      setSubscriptions(subsRes.subscriptions);
      setInvoices(invsRes.invoices);
      const planMap: Record<string, any> = {};
      for (const p of plansRes.plans) {
        planMap[p.id] = p;
      }
      setPlans(planMap);
    } catch (err) {
      console.error('Failed to load customer portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [user]);

  const handleCustomerTransition = async (subId: string, targetStatus: string, reason?: string) => {
    setProcessingSubId(subId);
    setActionNotice(null);
    try {
      const res = await api.transitionSubscription(subId, targetStatus, reason);
      setActionNotice(res.message);
      loadCustomerData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    } finally {
      setProcessingSubId(null);
    }
  };

  const totalOutstanding = invoices
    .filter((i) => i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.amount_due, 0);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              Customer Self-Service Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome, {user?.name}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200 mt-1">
              {user?.company_name || 'Brightloop Customer Account'} • {user?.email}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-right">
            <span className="text-[11px] uppercase tracking-wider text-emerald-200 block">Total Balance Due</span>
            <span className="text-2xl font-black text-white">${totalOutstanding.toFixed(2)}</span>
            <span className="text-[10px] text-emerald-300 block mt-0.5">Secure Instant Checkout</span>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Subscriptions Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            My Active Subscriptions & Plans ({subscriptions.length})
          </h2>
          <span className="text-xs text-slate-500">Self-service pause, resume, and renewal</span>
        </div>

        {subscriptions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            You do not have any subscriptions on file yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions.map((sub) => {
              const plan = plans[sub.plan_id];
              return (
                <div
                  key={sub.id}
                  className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {sub.subscription_number}
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm mt-1.5">{sub.plan_name}</h3>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          sub.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : sub.status === 'paused'
                            ? 'bg-purple-100 text-purple-800 border-purple-300'
                            : sub.status === 'closed'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-600 pt-3 border-t border-slate-200/60 mt-3">
                      <div className="flex justify-between">
                        <span>Recurring Rate:</span>
                        <span className="font-bold text-slate-900">
                          ${sub.total_amount.toFixed(2)} / {sub.billing_interval}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Next Billing Date:</span>
                        <span className="font-semibold text-slate-800">
                          {sub.next_billing_date || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payment Terms:</span>
                        <span className="font-semibold text-slate-800">
                          {sub.payment_terms.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Sub lines preview */}
                    <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 space-y-0.5">
                      <span className="font-bold uppercase text-[9px] text-slate-400 block">Included Products:</span>
                      {sub.lines?.map((l) => (
                        <div key={l.id} className="flex justify-between">
                          <span>
                            • {l.product_name} {l.variant_name ? `(${l.variant_name})` : ''}
                          </span>
                          <span>Qty: {l.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customer Self-Service Actions (governed by plan rules!) */}
                  <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Manage Agreement:</span>
                    <div className="flex items-center gap-1.5">
                      {/* Active: allow Pause or Close Early if permitted by plan */}
                      {sub.status === 'active' && plan?.allow_pause === 1 && (
                        <button
                          onClick={() => handleCustomerTransition(sub.id, 'paused', 'Customer self-service pause')}
                          disabled={processingSubId === sub.id}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded font-bold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <Pause className="w-3 h-3" /> Pause
                        </button>
                      )}

                      {sub.status === 'paused' && (
                        <button
                          onClick={() => handleCustomerTransition(sub.id, 'active', 'Customer self-service resume')}
                          disabled={processingSubId === sub.id}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-bold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <Play className="w-3 h-3" /> Resume
                        </button>
                      )}

                      {sub.status === 'closed' && plan?.allow_renew === 1 && (
                        <button
                          onClick={() => handleCustomerTransition(sub.id, 'active', 'Customer self-service renewal')}
                          disabled={processingSubId === sub.id}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-bold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" /> Renew
                        </button>
                      )}

                      {sub.status === 'active' && plan?.allow_early_close === 1 && (
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to cancel this subscription?')) {
                              handleCustomerTransition(sub.id, 'closed', 'Customer self-service early termination');
                            }
                          }}
                          disabled={processingSubId === sub.id}
                          className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded text-[11px] font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoices & Receipts Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            My Billing Invoices & Receipts ({invoices.length})
          </h2>
          <span className="text-xs text-slate-500">View statements and pay balances</span>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No invoices on file.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Billing Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Remaining Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                    <td className="py-3 px-4 text-slate-700">{inv.issue_date}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{inv.due_date}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      ${inv.total_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold">
                      <span className={inv.amount_due > 0 ? 'text-rose-600' : 'text-slate-400'}>
                        ${inv.amount_due.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : inv.is_overdue
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {inv.is_overdue ? 'Overdue' : inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPrintInvoice(inv)}
                          title="Print / View Receipt"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {inv.amount_due > 0 && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => setPaymentInvoice(inv)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-sm flex items-center gap-1 transition-colors"
                          >
                            <DollarSign className="w-3 h-3" /> Pay Online
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PrintInvoiceModal
        invoice={printInvoice}
        isOpen={Boolean(printInvoice)}
        onClose={() => setPrintInvoice(null)}
      />

      <RecordPaymentModal
        invoice={paymentInvoice}
        isOpen={Boolean(paymentInvoice)}
        onClose={() => setPaymentInvoice(null)}
        onSuccess={loadCustomerData}
      />
    </div>
  );
};
