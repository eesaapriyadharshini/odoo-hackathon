import React, { useState, useEffect } from 'react';
import {
  Plus,
  Filter,
  Search,
  CheckCircle,
  Clock,
  Pause,
  Play,
  XCircle,
  RefreshCw,
  Eye,
  Tag,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import api from '../services/api';
import { Subscription, SubscriptionStatus } from '../types';
import { CreateSubscriptionModal } from '../components/CreateSubscriptionModal';
import { useAuth } from '../context/AuthContext';

export const SubscriptionsView: React.FC = () => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [transitioning, setTransitioning] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await api.getSubscriptions({
        status: statusFilter || undefined,
      });
      setSubscriptions(res.subscriptions);
      if (selectedSub) {
        const refreshed = res.subscriptions.find((s) => s.id === selectedSub.id);
        if (refreshed) setSelectedSub(refreshed);
      }
    } catch (err: any) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [statusFilter]);

  const handleTransition = async (targetStatus: string, reason?: string) => {
    if (!selectedSub) return;
    setTransitioning(true);
    setActionMessage(null);
    try {
      const res = await api.transitionSubscription(selectedSub.id, targetStatus, reason);
      setActionMessage(res.message);
      setSelectedSub(res.subscription);
      loadSubscriptions();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Transition failed.');
    } finally {
      setTransitioning(false);
    }
  };

  const filtered = subscriptions.filter((s) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      s.subscription_number.toLowerCase().includes(term) ||
      (s.customer_name && s.customer_name.toLowerCase().includes(term)) ||
      (s.plan_name && s.plan_name.toLowerCase().includes(term))
    );
  });

  const getStatusBadge = (status: SubscriptionStatus) => {
    const config: Record<SubscriptionStatus, { bg: string; text: string; border: string }> = {
      draft: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
      quotation: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
      active: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
      paused: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
      closed: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200' },
    };

    const cfg = config[status] || config.draft;
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${cfg.bg} ${cfg.text} ${cfg.border}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Subscriptions & Quotations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage quotation templates, customer agreements, and automated lifecycle state machines.
          </p>
        </div>

        {user?.role !== 'customer' && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Subscription / Quote
          </button>
        )}
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold animate-fadeIn">
          {actionMessage}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SUB#, customer, or plan..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['', 'draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === '' ? 'All Statuses' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Layout (Table + Detail Drawer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Subscriptions Table */}
        <div className={selectedSub ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Subscription</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Plan & Terms</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Amount / Cycle</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        No subscriptions found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((sub) => {
                      const isSelected = selectedSub?.id === sub.id;
                      return (
                        <tr
                          key={sub.id}
                          onClick={() => setSelectedSub(sub)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {sub.subscription_number}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{sub.customer_name}</div>
                            <div className="text-[11px] text-slate-500">{sub.customer_email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{sub.plan_name}</div>
                            <div className="text-[11px] text-slate-500">
                              {sub.payment_terms.replace('_', ' ').toUpperCase()} • Start: {sub.start_date}
                            </div>
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(sub.status)}</td>
                          <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                            ${sub.total_amount.toFixed(2)}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              /{sub.billing_interval}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSub(sub);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-200/50 transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Selected Subscription Drawer */}
        {selectedSub && (
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 text-xs animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Subscription Details
                </span>
                <h3 className="text-lg font-black text-slate-900 font-mono">{selectedSub.subscription_number}</h3>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Status and Action Buttons (State Machine) */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Current Lifecycle Status:</span>
                <div>{getStatusBadge(selectedSub.status)}</div>
              </div>

              {/* Transition Action Buttons */}
              {user?.role !== 'customer' && (
                <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-1.5">
                  {selectedSub.status === 'draft' && (
                    <>
                      <button
                        onClick={() => handleTransition('quotation')}
                        disabled={transitioning}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shadow-sm transition-colors"
                      >
                        Send as Quotation
                      </button>
                      <button
                        onClick={() => handleTransition('active')}
                        disabled={transitioning}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-sm transition-colors"
                      >
                        Activate Direct
                      </button>
                    </>
                  )}

                  {selectedSub.status === 'quotation' && (
                    <button
                      onClick={() => handleTransition('confirmed')}
                      disabled={transitioning}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] shadow-sm transition-colors"
                    >
                      Customer Confirms Quote
                    </button>
                  )}

                  {selectedSub.status === 'confirmed' && (
                    <button
                      onClick={() => handleTransition('active')}
                      disabled={transitioning}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-sm transition-colors"
                    >
                      Activate Subscription
                    </button>
                  )}

                  {selectedSub.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleTransition('paused', 'Customer requested temporary pause')}
                        disabled={transitioning}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-[11px] shadow-sm transition-colors flex items-center gap-1"
                      >
                        <Pause className="w-3 h-3" /> Pause
                      </button>
                      <button
                        onClick={() => handleTransition('closed', 'Terminated early')}
                        disabled={transitioning}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] shadow-sm transition-colors"
                      >
                        Close Early
                      </button>
                    </>
                  )}

                  {selectedSub.status === 'paused' && (
                    <>
                      <button
                        onClick={() => handleTransition('active', 'Resumed')}
                        disabled={transitioning}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-sm transition-colors flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" /> Resume
                      </button>
                      <button
                        onClick={() => handleTransition('closed', 'Closed while paused')}
                        disabled={transitioning}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] shadow-sm transition-colors"
                      >
                        Close
                      </button>
                    </>
                  )}

                  {selectedSub.status === 'closed' && (
                    <button
                      onClick={() => handleTransition('active', 'Renewed for another term')}
                      disabled={transitioning}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] shadow-sm transition-colors flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Renew Subscription
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Line items list */}
            <div>
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-2">
                Agreed Line Items
              </span>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                {selectedSub.lines?.map((line) => (
                  <div key={line.id} className="p-3 bg-white flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">{line.product_name}</div>
                      {line.variant_name && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mt-0.5">
                          Variant: {line.variant_name}
                        </span>
                      )}
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {line.quantity} × ${line.unit_price.toFixed(2)} (Tax: {line.tax_rate}%)
                      </div>
                    </div>
                    <div className="text-right font-bold text-slate-900">${line.line_total.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-right">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">${selectedSub.subtotal.toFixed(2)}</span>
              </div>
              {selectedSub.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>
                    Discount {selectedSub.discount_code ? `(${selectedSub.discount_code})` : ''}:
                  </span>
                  <span>-${selectedSub.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>Taxes:</span>
                <span className="font-semibold text-slate-800">${selectedSub.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Total per Cycle:</span>
                <span className="text-indigo-600">${selectedSub.total_amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Next Billing Date metadata */}
            <div className="text-[11px] text-slate-500 space-y-1">
              <div>
                Next Billing Date:{' '}
                <span className="font-bold text-slate-800">
                  {selectedSub.next_billing_date || 'Not yet scheduled'}
                </span>
              </div>
              {selectedSub.expiry_date && (
                <div>
                  Contract Expiration: <span className="font-semibold text-slate-800">{selectedSub.expiry_date}</span>
                </div>
              )}
              {selectedSub.notes && (
                <div className="text-slate-600 italic mt-1">Notes: "{selectedSub.notes}"</div>
              )}
            </div>
          </div>
        )}
      </div>

      <CreateSubscriptionModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={loadSubscriptions}
      />
    </div>
  );
};

