import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  AlertOctagon,
  Users,
  Clock,
  Filter,
  Send,
  CheckCircle2,
  Zap,
  ArrowUpRight,
  PieChart,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import { FinanceDashboardData, SafeUser, Plan } from '../types';

export const FinanceDashboardView: React.FC = () => {
  const [data, setData] = useState<FinanceDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');

  const [customers, setCustomers] = useState<SafeUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [chasingId, setChasingId] = useState<string | null>(null);
  const [chaseSuccess, setChaseSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getFinanceDashboard({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        planId: selectedPlan || undefined,
        customerId: selectedCustomer || undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load finance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([api.getUsers('customer'), api.getPlans()]).then(([usersRes, plansRes]) => {
      setCustomers(usersRes.users);
      setPlans(plansRes.plans);
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [startDate, endDate, selectedPlan, selectedCustomer]);

  const handleChase = async (invoiceId: string) => {
    setChasingId(invoiceId);
    setChaseSuccess(null);
    try {
      const res = await api.chaseInvoice(invoiceId);
      setChaseSuccess(res.message);
      setTimeout(() => setChaseSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to send reminder.');
    } finally {
      setChasingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Performance Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Finance Lead Command Center</h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Zap className="w-3.5 h-3.5 text-emerald-600 fill-current" />
              {data ? `${data.executionTimeMs} ms` : 'Querying'} (Sub-2s SLA)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time recurring revenue, accounts receivable, payments collection, and automated overdue tracking.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </button>
      </div>

      {chaseSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{chaseSuccess}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-indigo-600" />
          <span>Filter Finance Insights</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-500 font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Filter by Plan</label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Filter by Customer</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Card */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Monthly Recurring (MRR)
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ${data ? data.metrics.mrr.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Annual Run-Rate (ARR):</span>
            <span className="font-bold text-slate-700">
              ${data ? data.metrics.arr.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
            </span>
          </div>
        </div>

        {/* Total Revenue Collected */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Revenue Collected
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">
            ${data ? data.metrics.totalRevenueCollected.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Total invoiced: ${data ? data.metrics.totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
        </div>

        {/* Outstanding Balance (AR) */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Outstanding (A/R)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ${data ? data.metrics.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Uncollected balance on open invoices
          </div>
        </div>

        {/* Overdue Total */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Overdue Invoices
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 tracking-tight">
            ${data ? data.metrics.totalOverdueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[11px] text-rose-700 font-medium mt-1">
            {data ? data.metrics.overdueInvoicesCount : 0} invoice(s) past due date
          </div>
        </div>
      </div>

      {/* Overdue Invoices Section (Scene 7: "Which invoices are overdue? ... so overdue ones can be chased") */}
      <div className="bg-white rounded-2xl border border-rose-200/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-rose-50/60 border-b border-rose-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Overdue Accounts Receivable ({data ? data.overdueInvoices.length : 0} Invoices Need Follow-up)
            </h2>
          </div>
          <span className="text-xs text-rose-700 font-semibold">
            Total Overdue: ${data ? data.metrics.totalOverdueAmount.toFixed(2) : '0.00'}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-10 text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            Analyzing real-time financial metrics...
          </div>
        ) : data && data.overdueInvoices.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            Great news! No overdue invoices at this time.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-center">Days Overdue</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.overdueInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{inv.customer_name}</div>
                      <div className="text-[11px] text-slate-500">{inv.customer_email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{inv.due_date}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                        {inv.days_overdue} days
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">${inv.total_amount.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-rose-700">
                      ${inv.amount_due.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleChase(inv.id)}
                        disabled={chasingId === inv.id}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg font-bold text-[11px] shadow-sm flex items-center gap-1.5 ml-auto transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        {chasingId === inv.id ? 'Sending...' : 'Chase / Remind'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Plan Distribution & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Subscriptions by Plan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Active Subscriptions by Plan ({data ? data.metrics.activeSubscriptionsCount : 0} Total)
            </h3>
          </div>
          <div className="space-y-3">
            {data?.planDistribution.map((pl) => (
              <div key={pl.planId} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-800">
                    {pl.planName} (${pl.cost}/{pl.billingInterval})
                  </span>
                  <span className="font-bold text-slate-900">{pl.activeCount} active</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        data.metrics.activeSubscriptionsCount > 0
                          ? (pl.activeCount / data.metrics.activeSubscriptionsCount) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Payment Method */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              Collected Revenue by Payment Channel
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data &&
              Object.entries(data.revenueByMethod).map(([method, amt]) => (
                <div key={method} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                  <div className="text-slate-500 capitalize font-medium">{method.replace('_', ' ')}</div>
                  <div className="text-base font-extrabold text-slate-900 mt-1">
                    ${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

