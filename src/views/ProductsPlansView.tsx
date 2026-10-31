import React, { useState, useEffect } from 'react';
import { Box, Calendar, Plus, Tag, CheckCircle2, XCircle, ArrowRight, Sparkles } from 'lucide-react';
import api from '../services/api';
import { Product, Plan } from '../types';
import { CreateProductModal } from '../components/CreateProductModal';
import { CreatePlanModal } from '../components/CreatePlanModal';
import { useAuth } from '../context/AuthContext';

export const ProductsPlansView: React.FC = () => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'plans'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodsRes, plansRes] = await Promise.all([api.getProducts(), api.getPlans()]);
      setProducts(prodsRes.products);
      setPlans(plansRes.plans);
    } catch (err) {
      console.error('Failed to load products/plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Products, Variants & Plans</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure catalog offerings, variant pricing adjustments (e.g. Odoo edition +$560), and billing cycles.
          </p>
        </div>

        {user?.role === 'admin' && (
          <div className="flex items-center gap-2">
            {activeSubTab === 'products' ? (
              <button
                onClick={() => setCreateProductOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Product & Variants
              </button>
            ) : (
              <button
                onClick={() => setCreatePlanOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Create Billing Plan
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('products')}
          className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeSubTab === 'products'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Box className="w-4 h-4" />
          Products & Variants ({products.length})
        </button>
        <button
          onClick={() => setActiveSubTab('plans')}
          className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeSubTab === 'plans'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Subscription Plans ({plans.length})
        </button>
      </div>

      {/* Products Tab Content */}
      {activeSubTab === 'products' && (
        loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">No products configured yet. Click "Add Product & Variants" above.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 hover:border-indigo-200 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{prod.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                        {prod.type}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-indigo-600 font-semibold">{prod.code}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-slate-900">${prod.sales_price.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400">Cost: ${prod.cost_price.toFixed(2)}</div>
                  </div>
                </div>

                {prod.notes && <p className="text-xs text-slate-600 italic">"{prod.notes}"</p>}

                {/* Variants Section */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Available Variants ({prod.variants?.length || 0})
                  </span>
                  {prod.variants && prod.variants.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {prod.variants.map((v) => (
                        <div
                          key={v.id}
                          className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center gap-1.5"
                        >
                          <span className="text-slate-500 text-[11px]">{v.attribute_name}:</span>
                          <span className="font-semibold text-slate-800">{v.attribute_value}</span>
                          {v.price_extra > 0 && (
                            <span className="px-1 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                              +${v.price_extra}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Standard edition only.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Plans Tab Content */}
      {activeSubTab === 'plans' && (
        loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">Loading plans...</div>
        ) : plans.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">No subscription plans created yet. Click "Create Billing Plan" above.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((pl) => (
            <div
              key={pl.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-indigo-200 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{pl.name}</h3>
                    <span className="font-mono text-[11px] text-indigo-600 font-semibold">{pl.code}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {pl.billing_interval}
                  </span>
                </div>

                <div className="my-3">
                  <span className="text-3xl font-black text-slate-900">${pl.cost.toFixed(2)}</span>
                  <span className="text-xs text-slate-500 ml-1">/ {pl.billing_interval}</span>
                </div>

                <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                  <div>
                    Min. Quantity: <span className="font-semibold text-slate-800">{pl.min_quantity} units</span>
                  </div>
                  <div>
                    Available: <span className="font-semibold text-slate-800">{pl.start_date}</span>
                    {pl.end_date ? ` to ${pl.end_date}` : ' (Ongoing)'}
                  </div>
                </div>
              </div>

              {/* Lifecycle Governance Policies */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Lifecycle Policies
                </span>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Auto-close on end date:</span>
                  <span className={pl.auto_close_on_end ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {pl.auto_close_on_end ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Allow early termination:</span>
                  <span className={pl.allow_early_close ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {pl.allow_early_close ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Allow pause / resume:</span>
                  <span className={pl.allow_pause ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {pl.allow_pause ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Allow term renewal:</span>
                  <span className={pl.allow_renew ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {pl.allow_renew ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        )
      )}

      <CreateProductModal
        isOpen={createProductOpen}
        onClose={() => setCreateProductOpen(false)}
        onSuccess={loadData}
      />

      <CreatePlanModal
        isOpen={createPlanOpen}
        onClose={() => setCreatePlanOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};

