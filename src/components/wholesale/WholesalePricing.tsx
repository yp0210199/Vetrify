import React, { useState } from 'react';
import { Percent, Plus, Search, CheckCircle2, X, Building2, Tag } from 'lucide-react';
import { WholesalePriceRule, PricingRuleType } from '../../types/wholesale';
import { Customer, Product } from '../../types';

interface WholesalePricingProps {
  priceRules: WholesalePriceRule[];
  customers: Customer[];
  products: Product[];
  onCreatePriceRule: (payload: any) => Promise<WholesalePriceRule>;
}

export const WholesalePricing: React.FC<WholesalePricingProps> = ({
  priceRules,
  customers,
  products,
  onCreatePriceRule,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState<PricingRuleType>('PRODUCT_WHOLESALE');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [tier, setTier] = useState<'TIER_A' | 'TIER_B' | 'TIER_C' | 'TIER_D'>('TIER_A');
  const [minQuantity, setMinQuantity] = useState(10);
  const [wholesalePrice, setWholesalePrice] = useState(100);

  const safePriceRules = Array.isArray(priceRules) ? priceRules : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeProducts = Array.isArray(products) ? products : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim() || !selectedProductId) {
      alert('Please fill rule name and select a product.');
      return;
    }

    const prod = safeProducts.find((p) => p.id === selectedProductId);
    const cust = safeCustomers.find((c) => c.id === selectedCustomerId);

    setIsSubmitting(true);
    try {
      await onCreatePriceRule({
        ruleName,
        ruleType,
        customerId: selectedCustomerId || undefined,
        customerName: cust?.name || undefined,
        productId: selectedProductId,
        productName: prod?.productName || 'Product',
        sku: prod?.sku,
        tier: ruleType === 'CUSTOMER_TIER' ? tier : undefined,
        minQuantity,
        wholesalePrice,
      });

      setRuleName('');
      setSelectedProductId('');
      setIsOpenModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create pricing rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRules = safePriceRules.filter(
    (r) =>
      r.ruleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Create Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-auto flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Pricing Rules by Product or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <button
          onClick={() => setIsOpenModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          New Wholesale Price Rule
        </button>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Rule Name</th>
                <th className="p-4">Rule Type</th>
                <th className="p-4">Product Name</th>
                <th className="p-4 text-right">Min Qty</th>
                <th className="p-4 text-right">Wholesale Rate (₹)</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <Tag className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="font-semibold text-slate-700">No Custom Price Rules Defined</p>
                    <p className="text-xs text-slate-400 mt-1">
                      System will use standard wholesale price fallback from product master.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRules.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{r.ruleName}</td>
                    <td className="p-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {r.ruleType}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-800">{r.productName}</td>
                    <td className="p-4 text-right font-bold text-slate-900">{r.minQuantity}</td>
                    <td className="p-4 text-right font-black text-emerald-700">₹{r.wholesalePrice.toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold">New Wholesale Pricing Rule</h2>
              </div>
              <button onClick={() => setIsOpenModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Rule Name / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hospital Paracetamol Contract 2026"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pricing Rule Category</label>
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium"
                >
                  <option value="PRODUCT_WHOLESALE">Standard Product Wholesale Tier</option>
                  <option value="CUSTOMER_PRODUCT">Customer Specific Contract Rate</option>
                  <option value="CUSTOMER_TIER">Customer Price Tier (A / B / C / D)</option>
                  <option value="CONTRACT">Institutional Annual Contract</option>
                </select>
              </div>

              {ruleType === 'CUSTOMER_PRODUCT' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Customer Account</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">-- Choose Account --</option>
                    {safeCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {ruleType === 'CUSTOMER_TIER' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Price Tier</label>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold"
                  >
                    <option value="TIER_A">Tier A (Standard Wholesale)</option>
                    <option value="TIER_B">Tier B (Volume Buyer)</option>
                    <option value="TIER_C">Tier C (Institutional Contract)</option>
                    <option value="TIER_D">Tier D (Key Account)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Target Product *</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="">-- Choose Product --</option>
                  {safeProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productName} ({p.brand})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Minimum Order Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Wholesale Rate (INR ₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={wholesalePrice}
                    onChange={(e) => setWholesalePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-emerald-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-all"
                >
                  {isSubmitting ? 'Saving...' : 'Save Pricing Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
