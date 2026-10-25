import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Building2,
  FileCheck,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Lock,
  Phone,
  Mail,
  X,
  ShieldAlert,
} from 'lucide-react';
import { Customer } from '../../types';
import { B2BCustomerExtension, CreditStatus } from '../../types/wholesale';

interface WholesaleCustomersProps {
  customers: Customer[];
  onAddCustomer: (payload: any) => Promise<void>;
  onUpdateCustomer: (id: string, updates: any) => Promise<void>;
  onSelectCustomerLedger: (customer: Customer) => void;
  isOpenModal: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
}

export const WholesaleCustomers: React.FC<WholesaleCustomersProps> = ({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onSelectCustomerLedger,
  isOpenModal,
  onCloseModal,
  onOpenModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'B2B' | 'INSTITUTIONAL'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    phone: '',
    email: '',
    contactPerson: '',
    gstin: '',
    panNumber: '',
    businessRegistration: '',
    customerType: 'B2B' as 'B2B' | 'INSTITUTIONAL',
    address: '',
    city: '',
    state: '',
    pincode: '',
    creditLimit: 100000,
    creditPeriodDays: 30,
    assignedPriceTier: 'TIER_A' as 'TIER_A' | 'TIER_B' | 'TIER_C' | 'TIER_D',
    status: 'active' as 'active' | 'inactive' | 'blocked',
    notes: '',
  });

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      legalName: '',
      phone: '',
      email: '',
      contactPerson: '',
      gstin: '',
      panNumber: '',
      businessRegistration: '',
      customerType: 'B2B',
      address: '',
      city: '',
      state: '',
      pincode: '',
      creditLimit: 100000,
      creditPeriodDays: 30,
      assignedPriceTier: 'TIER_A',
      status: 'active',
      notes: '',
    });
    onOpenModal();
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    const ext = cust as unknown as B2BCustomerExtension;
    setFormData({
      name: cust.name || '',
      legalName: ext.legalName || cust.name || '',
      phone: cust.phone || '',
      email: cust.email || '',
      contactPerson: ext.contactPerson || '',
      gstin: ext.gstin || '',
      panNumber: ext.panNumber || '',
      businessRegistration: ext.businessRegistration || '',
      customerType: (ext.customerType as 'B2B' | 'INSTITUTIONAL') || 'B2B',
      address: cust.address || '',
      city: cust.city || '',
      state: cust.state || '',
      pincode: cust.pincode || '',
      creditLimit: cust.creditLimit || 100000,
      creditPeriodDays: ext.creditPeriodDays || 30,
      assignedPriceTier: ext.assignedPriceTier || 'TIER_A',
      status: cust.status || 'active',
      notes: cust.notes || '',
    });
    onOpenModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('Customer Name and Phone are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        await onUpdateCustomer(editingCustomer.id, formData);
      } else {
        await onAddCustomer(formData);
      }
      onCloseModal();
    } catch (err: any) {
      alert(err.message || 'Failed to save customer record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const safeCustomers = Array.isArray(customers) ? customers : [];

  const filteredCustomers = safeCustomers.filter((cust) => {
    const ext = cust as unknown as B2BCustomerExtension;
    const matchesSearch =
      cust.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust.phone.includes(searchTerm) ||
      (ext.gstin && ext.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ext.customerCode && ext.customerCode.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType =
      typeFilter === 'ALL' ||
      (typeFilter === 'B2B' && ext.customerType !== 'INSTITUTIONAL') ||
      (typeFilter === 'INSTITUTIONAL' && ext.customerType === 'INSTITUTIONAL');

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Search & Actions Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by B2B Name, GSTIN, Phone, Code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 font-medium"
          >
            <option value="ALL">All Types</option>
            <option value="B2B">B2B Pharmacies</option>
            <option value="INSTITUTIONAL">Hospitals & Clinics</option>
          </select>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Add B2B / Institutional Customer
        </button>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Customer Details</th>
                <th className="p-4">GSTIN / Tax ID</th>
                <th className="p-4">Type & Tier</th>
                <th className="p-4">Credit Utilization</th>
                <th className="p-4">Credit Period</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="font-semibold text-slate-700">No B2B Customers Found</p>
                    <p className="text-xs text-slate-400 mt-1">Add your first wholesale account to get started.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const ext = cust as unknown as B2BCustomerExtension;
                  const creditLimit = cust.creditLimit || 100000;
                  const outstanding = cust.currentOutstanding || 0;
                  const utilPercent = creditLimit > 0 ? Math.min(100, Math.round((outstanding / creditLimit) * 100)) : 0;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm">{cust.name}</div>
                        {ext.legalName && ext.legalName !== cust.name && (
                          <div className="text-[11px] text-slate-500">{ext.legalName}</div>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {cust.phone}</span>
                          {cust.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {cust.email}</span>}
                        </div>
                      </td>

                      <td className="p-4 font-mono">
                        {ext.gstin ? (
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {ext.gstin}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unregistered</span>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] uppercase text-slate-700">
                            <Building2 className="w-3 h-3 text-blue-500" />
                            {ext.customerType || 'B2B'}
                          </span>
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/60 w-max">
                            {ext.assignedPriceTier || 'TIER_A'}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 w-48">
                        <div className="flex justify-between text-[11px] font-bold mb-1">
                          <span className="text-slate-700">₹{outstanding.toLocaleString('en-IN')}</span>
                          <span className="text-slate-500">Limit: ₹{creditLimit.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              utilPercent > 90
                                ? 'bg-rose-500'
                                : utilPercent > 75
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${utilPercent}%` }}
                          />
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-1 text-right">
                          {utilPercent}% Utilized
                        </div>
                      </td>

                      <td className="p-4 font-semibold text-slate-700">
                        {ext.creditPeriodDays || 30} Days (NET)
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            cust.status === 'blocked'
                              ? 'bg-rose-100 text-rose-800'
                              : utilPercent > 90
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {cust.status === 'blocked' ? 'ON HOLD' : utilPercent > 90 ? 'NEAR LIMIT' : 'ACTIVE'}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onSelectCustomerLedger(cust)}
                            className="px-2.5 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                          >
                            Khata / Ledger
                          </button>
                          <button
                            onClick={() => handleOpenEdit(cust)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold">
                  {editingCustomer ? 'Edit B2B Customer Account' : 'New B2B / Institutional Customer Account'}
                </h2>
              </div>
              <button onClick={onCloseModal} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trade / Display Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. City Life Hospital"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Legal Registered Name</label>
                  <input
                    type="text"
                    placeholder="e.g. City Healthcare Pvt. Ltd."
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="procurement@hospital.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer Type</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="B2B">Retail Pharmacy / Distributor (B2B)</option>
                    <option value="INSTITUTIONAL">Hospital / Clinic / Nursing Home</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Wholesale Price Tier</label>
                  <select
                    value={formData.assignedPriceTier}
                    onChange={(e) => setFormData({ ...formData, assignedPriceTier: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="TIER_A">Tier A (Standard Wholesale Rate)</option>
                    <option value="TIER_B">Tier B (Volume Buyer Rate)</option>
                    <option value="TIER_C">Tier C (Institutional Contract Rate)</option>
                    <option value="TIER_D">Tier D (Key Account Special Rate)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    placeholder="22AAAAA0000A1Z5"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Drug License / Reg No.</label>
                  <input
                    type="text"
                    placeholder="DL-2026-WHO-001"
                    value={formData.businessRegistration}
                    onChange={(e) => setFormData({ ...formData, businessRegistration: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Credit Period (Days)</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={formData.creditPeriodDays}
                    onChange={(e) => setFormData({ ...formData, creditPeriodDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
                <textarea
                  rows={2}
                  placeholder="Street, Landmark, Sector"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
                <input
                  type="text"
                  placeholder="Pincode"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-all"
                >
                  {isSubmitting ? 'Saving...' : 'Save Customer Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
