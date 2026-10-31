import React, { useState } from 'react';
import { X, Calendar, Check } from 'lucide-react';
import api from '../services/api';
import { BillingInterval } from '../types';

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [cost, setCost] = useState<number>(99);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [minQuantity, setMinQuantity] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>('');

  // Lifecycle toggles (configured plan by plan as required by prompt!)
  const [autoCloseOnEnd, setAutoCloseOnEnd] = useState<boolean>(true);
  const [allowEarlyClose, setAllowEarlyClose] = useState<boolean>(true);
  const [allowPause, setAllowPause] = useState<boolean>(true);
  const [allowRenew, setAllowRenew] = useState<boolean>(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setCode('');
      setCost(99);
      setBillingInterval('monthly');
      setMinQuantity(1);
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setAutoCloseOnEnd(true);
      setAllowEarlyClose(true);
      setAllowPause(true);
      setAllowRenew(true);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.createPlan({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        cost: Number(cost),
        billing_interval: billingInterval,
        min_quantity: Number(minQuantity),
        start_date: startDate,
        end_date: endDate || null,
        auto_close_on_end: autoCloseOnEnd ? 1 : 0,
        allow_early_close: allowEarlyClose ? 1 : 0,
        allow_pause: allowPause ? 1 : 0,
        allow_renew: allowRenew ? 1 : 0,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Create Billing Plan</h2>
              <p className="text-xs text-slate-500">
                Define recurring billing intervals and plan-by-plan lifecycle governance.
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Plan Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Enterprise Monthly"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Plan Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. PLAN-ENT-M"
                className="w-full px-3 py-2 uppercase font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Billing Frequency</label>
              <select
                value={billingInterval}
                onChange={(e) => setBillingInterval(e.target.value as BillingInterval)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Plan Base Cost ($ USD)</label>
              <input
                type="number"
                step="0.01"
                required
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Min. Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={minQuantity}
                onChange={(e) => setMinQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Available From Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Available To Date (Optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Plan Lifecycle Rules (Scene 2) */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 space-y-2.5">
            <div>
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                Lifecycle & Renewal Policies
              </span>
              <span className="text-[11px] text-slate-500">
                "Some plans should close on their own when they end, and others can be closed early, paused or renewed."
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={autoCloseOnEnd}
                  onChange={(e) => setAutoCloseOnEnd(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div>
                  <div className="font-bold text-slate-800">Auto-Close on End Date</div>
                  <div className="text-[10px] text-slate-500">Closes automatically when validity expires</div>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={allowEarlyClose}
                  onChange={(e) => setAllowEarlyClose(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div>
                  <div className="font-bold text-slate-800">Allow Early Closure</div>
                  <div className="text-[10px] text-slate-500">Team can terminate before expiry</div>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={allowPause}
                  onChange={(e) => setAllowPause(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div>
                  <div className="font-bold text-slate-800">Allow Pause / Resume</div>
                  <div className="text-[10px] text-slate-500">Temporarily freeze subscription cycles</div>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={allowRenew}
                  onChange={(e) => setAllowRenew(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div>
                  <div className="font-bold text-slate-800">Allow Renewal</div>
                  <div className="text-[10px] text-slate-500">Reactivate or extend after expiration</div>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
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
              {loading ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

