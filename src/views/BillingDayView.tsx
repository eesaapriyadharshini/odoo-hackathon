import React, { useState, useEffect } from 'react';
import { Play, Calendar, CheckCircle2, Clock, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { BillingRunModal } from '../components/BillingRunModal';

export const BillingDayView: React.FC = () => {
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [dueData, setDueData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDueData = async () => {
    setLoading(true);
    try {
      const data = await api.getBillingDue();
      setDueData(data);
    } catch (err) {
      console.error('Failed to fetch due data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDueData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider inline-flex items-center gap-1.5 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            Automated Billing Engine
          </span>
          <h1 className="text-3xl font-black tracking-tight">Recurring Billing Operations</h1>
          <p className="text-sm text-indigo-200 mt-2 leading-relaxed">
            Eliminate manual invoice typing. When billing day arrives, the engine scans every active subscription,
            applies admin taxes and valid discounts, advances the billing cycle, and creates itemized invoices with zero duplicates.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setBillingModalOpen(true)}
              className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold rounded-xl shadow-lg shadow-indigo-950/40 text-xs flex items-center gap-2 transition-transform transform hover:scale-[1.02]"
            >
              <Play className="w-4 h-4 fill-current" />
              Run Billing Day Engine Now
            </button>
            <span className="text-xs text-indigo-300 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Guaranteed idempotency protection
            </span>
          </div>
        </div>
      </div>

      {/* Due Subscriptions Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Subscriptions Due for Recurring Cycle</h2>
            <p className="text-xs text-slate-500">
              Evaluated as of target date: <span className="font-semibold text-slate-700">{dueData?.targetDate}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 font-bold">
              {dueData?.dueCount || 0} Subscriptions Due Now
            </div>
            <div className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">
              {dueData?.totalActive || 0} Total Active Subscriptions
            </div>
          </div>
        </div>

        {/* Due Subscriptions Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-4">Subscription #</th>
                <th className="py-2.5 px-4">Customer Account</th>
                <th className="py-2.5 px-4">Billing Plan</th>
                <th className="py-2.5 px-4">Next Billing Date</th>
                <th className="py-2.5 px-4 text-right">Cycle Amount</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Scanning active subscriptions...
                  </td>
                </tr>
              ) : !dueData?.subscriptions || dueData.subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No active subscriptions found for this billing period.
                  </td>
                </tr>
              ) : (
                dueData.subscriptions.map((sub: any) => (
                  <tr key={sub.id} className={sub.is_due ? 'bg-amber-50/30' : ''}>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{sub.subscription_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{sub.customer_name}</div>
                      <div className="text-[11px] text-slate-500">{sub.customer_email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{sub.plan_name}</div>
                      <div className="text-[11px] text-slate-500">Interval: {sub.billing_interval}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{sub.next_billing_date}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      ${sub.total_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {sub.is_due ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                          BILLING DUE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                          Upcoming
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BillingRunModal
        isOpen={billingModalOpen}
        onClose={() => setBillingModalOpen(false)}
        onSuccess={fetchDueData}
      />
    </div>
  );
};

