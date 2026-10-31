import React, { useState } from 'react';
import {
  TrendingUp,
  RotateCw,
  Layers,
  Receipt,
  Box,
  Tag,
  Users,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { BillingRunModal } from './components/BillingRunModal';

// Views
import { FinanceDashboardView } from './views/FinanceDashboardView';
import { SubscriptionsView } from './views/SubscriptionsView';
import { InvoicesView } from './views/InvoicesView';
import { BillingDayView } from './views/BillingDayView';
import { ProductsPlansView } from './views/ProductsPlansView';
import { DiscountsTaxesView } from './views/DiscountsTaxesView';
import { TeamView } from './views/TeamView';
import { CustomerPortalView } from './views/CustomerPortalView';

export const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('finance');
  const [billingModalOpen, setBillingModalOpen] = useState<boolean>(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center animate-pulse">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-slate-300">
            Initializing Brightloop Subscription System...
          </span>
        </div>
      </div>
    );
  }

  // Determine navigation items depending on role
  const isCustomer = user?.role === 'customer';
  const isAdmin = user?.role === 'admin';

  const staffNavItems = [
    { id: 'finance', label: 'Finance Lead (Scene 7)', icon: TrendingUp },
    { id: 'billing', label: 'Billing Day (Scene 4)', icon: RotateCw },
    { id: 'subscriptions', label: 'Subscriptions & Quotes (Scene 3)', icon: Layers },
    { id: 'invoices', label: 'Invoices & Payments (Scene 6)', icon: Receipt },
    { id: 'products', label: 'Products & Plans (Scene 2)', icon: Box },
    { id: 'discounts', label: 'Discounts & Taxes (Scene 5)', icon: Tag },
    ...(isAdmin ? [{ id: 'team', label: 'Staff & Team (Scene 1)', icon: Users }] : []),
  ];

  const customerNavItems = [
    { id: 'portal', label: 'My Subscriptions & Portal', icon: UserCheck },
    { id: 'invoices', label: 'My Invoices & Payments', icon: Receipt },
  ];

  const navItems = isCustomer ? customerNavItems : staffNavItems;

  // Auto-switch tab when role changes
  React.useEffect(() => {
    if (isCustomer && activeTab !== 'portal' && activeTab !== 'invoices') {
      setActiveTab('portal');
    } else if (!isCustomer && activeTab === 'portal') {
      setActiveTab('finance');
    }
  }, [isCustomer, activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenBillingModal={() => setBillingModalOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* View Switcher */}
        <div className="animate-fadeIn">
          {activeTab === 'finance' && <FinanceDashboardView />}
          {activeTab === 'billing' && <BillingDayView />}
          {activeTab === 'subscriptions' && <SubscriptionsView />}
          {activeTab === 'invoices' && <InvoicesView />}
          {activeTab === 'products' && <ProductsPlansView />}
          {activeTab === 'discounts' && <DiscountsTaxesView />}
          {activeTab === 'team' && <TeamView />}
          {activeTab === 'portal' && <CustomerPortalView />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Brightloop Software</span>
            <span>• Subscription & Recurring Billing Management System</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Engineered with High-Security RBAC, Idempotency & Sub-2s Performance
          </div>
        </div>
      </footer>

      {/* Global Billing Day Modal */}
      <BillingRunModal
        isOpen={billingModalOpen}
        onClose={() => setBillingModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
};

export default App;

