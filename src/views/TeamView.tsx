import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, ShieldCheck, Mail, Building, Phone } from 'lucide-react';
import api from '../services/api';
import { SafeUser } from '../types';
import { CreateStaffModal } from '../components/CreateStaffModal';
import { useAuth } from '../context/AuthContext';

export const TeamView: React.FC = () => {
  const { user } = useAuth();
  const [staffUsers, setStaffUsers] = useState<SafeUser[]>([]);
  const [customerUsers, setCustomerUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createStaffOpen, setCreateStaffOpen] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [staffRes, custRes] = await Promise.all([
        api.getUsers('staff'),
        api.getUsers('customer'),
      ]);
      setStaffUsers(staffRes.users);
      setCustomerUsers(custRes.users);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  if (user?.role !== 'admin') {
    return (
      <div className="p-8 bg-amber-50 border border-amber-200 rounded-2xl text-center max-w-xl mx-auto space-y-3">
        <Shield className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="text-base font-bold text-amber-900">Admin Role Required</h2>
        <p className="text-xs text-amber-700">
          Only administrators have permission to manage staff members and view internal user credentials.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Team & Staff Governance</h1>
          <p className="text-xs text-slate-500 mt-1">
            "Only the admin can add a new member of staff." Manage internal roles and customer accounts.
          </p>
        </div>

        <button
          onClick={() => setCreateStaffOpen(true)}
          className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Add Staff Member
        </button>
      </div>

      {/* Staff Members List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            Internal Staff Operations Team ({staffUsers.length})
          </h2>
          <span className="text-xs text-slate-500">Day-to-day sales, quotes, and billing access</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {staffUsers.map((st) => (
            <div key={st.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{st.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                  Staff
                </span>
              </div>
              <div className="text-slate-600 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {st.email}
              </div>
              {st.company_name && (
                <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" /> {st.company_name}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Customers List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            Registered Customer Accounts ({customerUsers.length})
          </h2>
          <span className="text-xs text-slate-500">External customer portal users</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {customerUsers.map((c) => (
            <div key={c.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                  Customer
                </span>
              </div>
              <div className="text-slate-600 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {c.email}
              </div>
              {c.company_name && (
                <div className="text-slate-700 font-semibold text-[11px] flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" /> {c.company_name}
                </div>
              )}
              {c.address && <div className="text-slate-500 text-[10px]">{c.address}</div>}
            </div>
          ))}
        </div>
      </div>

      <CreateStaffModal
        isOpen={createStaffOpen}
        onClose={() => setCreateStaffOpen(false)}
        onSuccess={loadUsers}
      />
    </div>
  );
};

