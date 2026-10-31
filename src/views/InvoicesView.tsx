import React, { useState, useEffect } from 'react';
import {
  Printer,
  DollarSign,
  Send,
  Check,
  X,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Eye,
} from 'lucide-react';
import api from '../services/api';
import { Invoice, InvoiceStatus } from '../types';
import { PrintInvoiceModal } from '../components/PrintInvoiceModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { useAuth } from '../context/AuthContext';

export const InvoicesView: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const isOverdueFilter = statusFilter === 'overdue';
      const res = await api.getInvoices({
        status: isOverdueFilter ? undefined : statusFilter || undefined,
        overdue: isOverdueFilter ? true : undefined,
      });
      setInvoices(res.invoices);
    } catch (err: any) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  const handleConfirm = async (id: string) => {
    try {
      const res = await api.confirmInvoice(id);
      setActionNotice(res.message);
      loadInvoices();
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to confirm invoice.');
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this invoice?')) return;
    try {
      const res = await api.cancelInvoice(id);
      setActionNotice(res.message);
      loadInvoices();
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel invoice.');
    }
  };

  const handleSend = async (id: string) => {
    try {
      const res = await api.sendInvoice(id);
      setActionNotice(res.message);
      loadInvoices();
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to send invoice.');
    }
  };

  const filtered = invoices.filter((i) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      i.invoice_number.toLowerCase().includes(s) ||
      (i.customer_name && i.customer_name.toLowerCase().includes(s)) ||
      (i.subscription_number && i.subscription_number.toLowerCase().includes(s))
    );
  });

  const getStatusBadge = (invoice: Invoice) => {
    if (invoice.is_overdue) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-300">
          OVERDUE
        </span>
      );
    }

    const config: Record<InvoiceStatus, { bg: string; text: string; border: string }> = {
      draft: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
      paid: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
      cancelled: { bg: 'bg-slate-200', text: 'text-slate-500', border: 'border-slate-300' },
    };

    const cfg = config[invoice.status] || config.draft;
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.bg} ${cfg.text} ${cfg.border}`}
      >
        {invoice.status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Invoices & Collections</h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated recurring invoices, payment recording, and clean printable statements.
          </p>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold animate-fadeIn">
          {actionNotice}
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
            placeholder="Search invoice #, customer..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['', 'draft', 'confirmed', 'paid', 'overdue', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === '' ? 'All Invoices' : st === 'overdue' ? '⚠️ Overdue' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Issue / Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Due</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {inv.invoice_number}
                      {inv.sent_at && (
                        <span className="block text-[10px] text-emerald-600 font-sans font-normal">
                          ✓ Sent {inv.sent_at.split('T')[0]}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{inv.customer_name}</div>
                      <div className="text-[11px] text-slate-500">{inv.customer_email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800">{inv.issue_date}</div>
                      <div className={`text-[11px] ${inv.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                        Due: {inv.due_date}
                      </div>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(inv)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ${inv.total_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                      ${inv.amount_paid.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold">
                      <span className={inv.amount_due > 0 ? 'text-slate-900' : 'text-slate-400'}>
                        ${inv.amount_due.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Printable View */}
                        <button
                          onClick={() => setPrintInvoice(inv)}
                          title="Print / View Invoice"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* Confirm if Draft */}
                        {inv.status === 'draft' && user?.role !== 'customer' && (
                          <button
                            onClick={() => handleConfirm(inv.id)}
                            title="Confirm Invoice"
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <Check className="w-4 h-4 text-blue-600 font-bold" />
                          </button>
                        )}

                        {/* Send Email */}
                        {inv.status !== 'cancelled' && user?.role !== 'customer' && (
                          <button
                            onClick={() => handleSend(inv.id)}
                            title="Send Invoice to Customer"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}

                        {/* Record Payment */}
                        {inv.status !== 'cancelled' && inv.amount_due > 0 && (
                          <button
                            onClick={() => setPaymentInvoice(inv)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-sm flex items-center gap-1 transition-colors"
                          >
                            <DollarSign className="w-3 h-3" />
                            {user?.role === 'customer' ? 'Pay Online' : 'Record Pay'}
                          </button>
                        )}

                        {/* Cancel */}
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && user?.role !== 'customer' && (
                          <button
                            onClick={() => handleCancel(inv.id)}
                            title="Cancel Invoice"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
        onSuccess={loadInvoices}
      />
    </div>
  );
};
