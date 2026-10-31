import React, { useState } from 'react';
import { X, Plus, Trash2, Box, Check, Sparkles } from 'lucide-react';
import api from '../services/api';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('software');
  const [salesPrice, setSalesPrice] = useState<number>(499);
  const [costPrice, setCostPrice] = useState<number>(150);
  const [notes, setNotes] = useState('');
  const [variants, setVariants] = useState<Array<{ attribute_name: string; attribute_value: string; price_extra: number }>>([
    { attribute_name: 'Brand', attribute_value: 'Standard Edition', price_extra: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setCode('');
      setType('software');
      setSalesPrice(499);
      setCostPrice(150);
      setNotes('');
      setVariants([{ attribute_name: 'Brand', attribute_value: 'Standard Edition', price_extra: 0 }]);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const addVariant = () => {
    setVariants([...variants, { attribute_name: 'Brand', attribute_value: '', price_extra: 0 }]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: string, value: any) => {
    const updated = [...variants];
    (updated[index] as any)[field] = value;
    setVariants(updated);
  };

  // Helper to load Odoo variant preset from prompt scene 2
  const loadOdooVariantPreset = () => {
    setVariants([
      { attribute_name: 'Brand', attribute_value: 'Standard Brightloop', price_extra: 0 },
      { attribute_name: 'Brand', attribute_value: 'Odoo Edition', price_extra: 560 },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.createProduct({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        sales_price: Number(salesPrice),
        cost_price: Number(costPrice),
        notes: notes || undefined,
        variants: variants.filter((v) => v.attribute_value.trim().length > 0),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create product.');
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
              <Box className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Add New Product & Variants</h2>
              <p className="text-xs text-slate-500">
                Configure base pricing, product classification, and variant price differentials.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Product Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Brightloop CRM Suite"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Internal Reference / Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. PROD-CRM"
                className="w-full px-3 py-2 uppercase font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Product Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="software">Software Subscription</option>
                <option value="service">Service / SLA Support</option>
                <option value="addon">Add-on Feature</option>
                <option value="consumable">Consumable Units</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sales Price ($ USD)</label>
              <input
                type="number"
                step="0.01"
                required
                value={salesPrice}
                onChange={(e) => setSalesPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cost Price ($ USD)</label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes / Description</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Enterprise CRM with automated lead scoring and contact management"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Product Variants (Scene 2) */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Product Variants
                </span>
                <span className="text-[11px] text-slate-500">
                  Example: Choosing the Odoo brand variant adds $560 to the base price
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={loadOdooVariantPreset}
                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-semibold text-[11px] flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Preset: Odoo (+560)
                </button>
                <button
                  type="button"
                  onClick={addVariant}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-600 border border-indigo-200 rounded font-bold text-[11px] flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Variant
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {variants.map((v, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 bg-white p-2 rounded-lg border border-slate-200 items-center">
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Attribute (e.g. Brand)"
                      value={v.attribute_name}
                      onChange={(e) => updateVariant(idx, 'attribute_name', e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Value (e.g. Odoo Edition)"
                      value={v.attribute_value}
                      onChange={(e) => updateVariant(idx, 'attribute_value', e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-slate-400 font-bold">+$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price Extra"
                        value={v.price_extra}
                        onChange={(e) => updateVariant(idx, 'price_extra', Number(e.target.value))}
                        className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-semibold"
                      />
                    </div>
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeVariant(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
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
              {loading ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

