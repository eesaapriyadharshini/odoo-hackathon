import React, { useState } from 'react';
import { Layers, Shield, Briefcase, User, LogOut, LogIn, ChevronDown, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';
import { UserRole } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenBillingModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenBillingModal }) => {
  const { user, logout, switchPersona } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);

  const personas: Array<{ role: UserRole; name: string; email: string; label: string; desc: string }> = [
    {
      role: 'admin',
      name: 'Eleanor Vance',
      email: 'admin@brightloop.com',
      label: 'Admin (Full System Control)',
      desc: 'Master plans, taxes, discounts, staff setup',
    },
    {
      role: 'staff',
      name: 'Marcus Brody',
      email: 'staff@brightloop.com',
      label: 'Internal Staff (Sales & Operations)',
      desc: 'Quotations, subscriptions, invoicing, payments',
    },
    {
      role: 'customer',
      name: 'Sarah Jenkins',
      email: 'sarah@shoplocal.com',
      label: 'Customer: ShopLocal Retail',
      desc: 'Monthly plan, overdue invoice, portal view',
    },
    {
      role: 'customer',
      name: 'John Davis',
      email: 'john@enterprisecorp.com',
      label: 'Customer: EnterpriseCorp',
      desc: 'Annual Odoo Brand variant contract, paid invoice',
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        {/* Top Demo Persona Switcher Banner */}
        <div className="bg-slate-900 text-slate-300 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 font-bold tracking-wide text-indigo-400 uppercase text-[10px] bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Role Simulator
            </span>
            <span className="hidden sm:inline text-slate-400">Quick-switch personas to test RBAC & customer isolation:</span>
          </div>

          <div className="flex items-center gap-1.5">
            {personas.map((p) => {
              const isActive = user?.email.toLowerCase() === p.email.toLowerCase();
              return (
                <button
                  key={p.email}
                  onClick={() => switchPersona(p.role, p.email)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-white/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  title={`${p.label}: ${p.desc}`}
                >
                  {p.role === 'admin' && '👑 Admin'}
                  {p.role === 'staff' && '💼 Staff'}
                  {p.role === 'customer' && (p.name.startsWith('Sarah') ? '👤 Sarah (ShopLocal)' : '👤 John (Enterprise)')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Header Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Layers className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-tight text-slate-900">Brightloop</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
                    SUBSCRIPTION PLATFORM
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Plans, Subscriptions & Recurring Billing
                </p>
              </div>
            </div>

            {/* Right side user info & action */}
            <div className="flex items-center gap-3">
              {user && user.role !== 'customer' && (
                <button
                  onClick={onOpenBillingModal}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-indigo-600/25 transition-all transform hover:scale-[1.02]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                  Run Billing Day
                </button>
              )}

              {user ? (
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0)}
                  </div>
                  <div className="text-left hidden sm:block pr-2">
                    <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                      {user.name}
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : user.role === 'staff'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 leading-none mt-0.5">{user.email}</div>
                  </div>

                  <button
                    onClick={logout}
                    title="Log Out"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In / Register
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

