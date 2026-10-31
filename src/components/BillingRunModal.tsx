import React, { useState, useEffect } from 'react';
import { X, Calendar, Play, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../services/api';
import { BillingRunResult } from '../types';

interface BillingRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BillingRunModal: React.FC<BillingRunModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [fetchingDue, setFetchingDue] = useState(false);
  const [dueData, setDueData] = useState<any>(null);
  const [result, setResult] = useState<BillingRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDuePreview = async () => {
    setFetchingDue(true);
    try {
      const data = await api.getBillingDue(targetDate);
      setDueData(data);
    } catch (err: any) {
      console.error('Error fetching due subscriptions:', err);
    } finally {
      setFetchingDue(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setError(null);
      fetchDuePreview();
    }
  }, [isOpen, targetDate]);

  if (!isOpen) return null;

  const handleRunBilling = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.runBillingDay(targetDate);
      setResult(res.result);
      if (res.result.invoicesGenerated.length > 0) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Billing run failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Run Automated Billing Day</h2>
              <p className="text-xs text-slate-500">
                Generate recurring invoices automatically from due subscriptions with idempotency protection.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Configuration controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Target Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Any active subscription due on or before this date will be invoiced.
              </span>
            </div>

            <div className="flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-700">Billing Engine Safeguards</span>
              <div className="space-y-1 text-xs text-slate-600 mt-1">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Strict idempotency: No double billing</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Rule-based automatic taxes & discounts</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Auto-close expired subscriptions</span>
                </div>
              </div>
            </div>
          </div>

          {/* Due Subscriptions Preview */}
          {!result && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Subscriptions Due for Invoicing ({dueData ? dueData.dueCount : '...'} / {dueData ? dueData.totalActive : '...'})
                </h3>
                {fetchingDue && (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Checking...
                  </span>
                )}
              </div>

              {dueData && dueData.subscriptions.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                  No active subscriptions found.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-52 overflow-y-auto">
                  {dueData?.subscriptions.map((sub: any) => (
                    <div
                      key={sub.id}
                      className={`p-3 text-xs flex items-center justify-between transition-colors ${
                        sub.is_due ? 'bg-indigo-50/40 hover:bg-indigo-50/70' : 'bg-white text-slate-400'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <span>{sub.subscription_number}</span>
                          <span className="text-slate-500 font-normal">({sub.customer_name})</span>
                          {sub.is_due ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              DUE
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                              Next: {sub.next_billing_date}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {sub.plan_name} • Interval: {sub.billing_interval}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">${sub.total_amount.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-500">per cycle</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Results Summary */}
          {result && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Billing Run Completed Successfully
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-3 pt-3 border-t border-emerald-200/60">
                  <div>
                    <div className="text-lg font-extrabold text-emerald-900">{result.invoicesGenerated.length}</div>
                    <div className="text-[11px] text-emerald-700 font-medium">Invoices Created</div>
                  </div>
                  <div>
                    <div className="text-lg font-extrabold text-emerald-900">${result.totalBilledAmount.toFixed(2)}</div>
                    <div className="text-[11px] text-emerald-700 font-medium">Total Invoiced</div>
                  </div>
                  <div>
                    <div className="text-lg font-extrabold text-slate-700">{result.skippedCount}</div>
                    <div className="text-[11px] text-slate-500 font-medium">Skipped (Billed/Future)</div>
                  </div>
                </div>
              </div>

              {/* Execution Logs */}
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Execution Audit Trail
                </span>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-xl text-xs font-mono max-h-44 overflow-y-auto space-y-1">
                  {result.logs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            {result ? 'Done' : 'Cancel'}
          </button>

          {!result ? (
            <button
              onClick={handleRunBilling}
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              {loading ? 'Executing Billing Run...' : 'Execute Billing Run Now'}
            </button>
          ) : (
            <button
              onClick={() => {
                setResult(null);
                fetchDuePreview();
              }}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Run Another Date
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

