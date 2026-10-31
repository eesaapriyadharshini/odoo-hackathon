import React, { useState, useEffect } from 'react';
import { Tag, Percent, Plus, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import api from '../services/api';
import { Discount, Tax } from '../types';
import { CreateDiscountModal } from '../components/CreateDiscountModal';
import { useAuth } from '../context/AuthContext';

export const DiscountsTaxesView: React.FC = () => {
  const { user } = useAuth();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);

  const [createDiscountOpen, setCreateDiscountOpen] = useState(false);
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxRate, setNewTaxRate] = useState<number>(10);
  const [newTaxDefault, setNewTaxDefault] = useState(false);
  const [creatingTax, setCreatingTax] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [discRes, taxRes] = await Promise.all([api.getDiscounts(), api.getTaxes()]);
      setDiscounts(discRes.discounts);
      setTaxes(taxRes.taxes);
    } catch (err) {
      console.error('Failed to load discounts/taxes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaxName) return;
    setCreatingTax(true);
    try {
      await api.createTax({
        name: newTaxName.trim(),
        rate: Number(newTaxRate),
        is_default: newTaxDefault,
      });
      setNewTaxName('');
      setNewTaxRate(10);
      setNewTaxDefault(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create tax.');
    } finally {
      setCreatingTax(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Discounts & Tax Governance</h1>
          <p className="text-xs text-slate-500 mt-1">
            Admin-restricted promotional incentive limits, usage tracking, and automated calculation rules.
          </p>
        </div>

        {user?.role === 'admin' && (
          <button
            onClick={() => setCreateDiscountOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Discount Rule
          </button>
        )}
      </div>

      {/* Discount Rules Grid (Scene 5) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-600" />
            Active Discount Rules ({discounts.length})
          </h2>
          <span className="text-[11px] text-slate-500">
            Rules auto-apply on next invoice and deactivate when max uses or expiration is reached.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 text-center py-8 text-slate-400 text-xs">Loading discount rules...</div>
          ) : discounts.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-slate-400 text-xs">No active discount rules created yet. Click "Create Discount Rule" above.</div>
          ) : (
            discounts.map((d) => (
              <div
                key={d.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 hover:border-indigo-200 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{d.name}</h3>
                      <span className="font-mono text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block mt-1">
                        {d.code}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-slate-900">
                        {d.type === 'percentage' ? `${d.value}%` : `$${d.value}`}
                      </span>
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                        {d.type === 'percentage' ? 'Percentage' : 'Fixed Credit'}
                      </span>
                    </div>
                  </div>

                  {/* Criteria */}
                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-1 text-slate-600">
                    <div>
                      Scope: <span className="font-semibold text-slate-800 capitalize">{d.scope}</span>
                    </div>
                    {d.min_purchase_amount > 0 && (
                      <div>
                        Min. Purchase: <span className="font-semibold text-slate-800">${d.min_purchase_amount}</span>
                      </div>
                    )}
                    {d.min_quantity > 0 && (
                      <div>
                        Min. Quantity: <span className="font-semibold text-slate-800">{d.min_quantity} items</span>
                      </div>
                    )}
                    <div>
                      Validity: <span className="font-semibold text-slate-800">{d.start_date}</span>
                      {d.end_date ? ` to ${d.end_date}` : ' (No expiry)'}
                    </div>
                  </div>
                </div>

                {/* Usage tracking meter */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-500">Usage Limit:</span>
                    <span className="font-bold text-slate-800">
                      {d.used_count} / {d.max_uses !== null ? d.max_uses : '∞'} used
                    </span>
                  </div>
                  {d.max_uses !== null && (
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, (d.used_count / d.max_uses) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tax Rules Section (Scene 4) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Percent className="w-4 h-4 text-indigo-600" />
            Tax Calculation Rules
          </h2>
          <span className="text-xs text-slate-500">
            Automatically applied to product and subscription lines during quote and invoice creation.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {taxes.map((t) => (
            <div key={t.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{t.name}</span>
                {t.is_default === 1 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                    Default
                  </span>
                )}
              </div>
              <div className="text-lg font-black text-indigo-700">{t.rate}%</div>
              <div className="text-[10px] text-slate-400">Rule ID: {t.id}</div>
            </div>
          ))}
        </div>

        {/* Quick Add Tax (Admin Only) */}
        {user?.role === 'admin' && (
          <form onSubmit={handleCreateTax} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
            <span className="font-bold text-xs text-slate-800 block">Add New Tax Rule</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Tax Name (e.g. State Sales Tax 6%)"
                  value={newTaxName}
                  onChange={(e) => setNewTaxName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Rate %"
                  value={newTaxRate}
                  onChange={(e) => setNewTaxRate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={newTaxDefault}
                    onChange={(e) => setNewTaxDefault(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Set as default</span>
                </label>
                <button
                  type="submit"
                  disabled={creatingTax}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg ml-auto"
                >
                  {creatingTax ? 'Saving...' : 'Add Tax'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <CreateDiscountModal
        isOpen={createDiscountOpen}
        onClose={() => setCreateDiscountOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};

