import React, { useState, useEffect } from 'react';
import { Supplier, SupplierLedgerEntry } from '../../types/firestore';
import { supplierService } from '../../services/supplierService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../ui/Button';
import { TextInput } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { PermissionGate } from '../common/PermissionGate';
import { safeToFixed } from '../../lib/formatting/formatters';
import {
  Building2,
  Plus,
  Search,
  BookOpen,
  DollarSign,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

export const SupplierList: React.FC = () => {
  const { organization, currentStaff, hasPermission } = useWorkspace();
  const { addToast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Supplier Create/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    code: '',
    gstin: '',
    drugLicenseNumber: '',
    drugLicense20B: '',
    drugLicense21B: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: { street: '', city: '', state: '', pincode: '', country: 'India' },
    paymentTermsDays: 30,
    creditLimit: '',
    status: 'active' as 'active' | 'inactive' | 'blocked',
  });
  const [saving, setSaving] = useState(false);

  // Supplier Ledger Modal State
  const [selectedSupplierForLedger, setSelectedSupplierForLedger] = useState<Supplier | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<SupplierLedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    referenceNumber: '',
    notes: '',
  });
  const [recordingPayment, setRecordingPayment] = useState(false);

  useEffect(() => {
    if (organization?.id) {
      fetchSuppliers();
    }
  }, [organization?.id, statusFilter]);

  const fetchSuppliers = async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const data = await supplierService.getSuppliers(
        organization.id,
        statusFilter !== 'all' ? statusFilter : undefined
      );
      setSuppliers(data);
    } catch (err: any) {
      addToast(err.message || 'Failed to fetch suppliers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      displayName: '',
      code: `SUP-${Date.now().toString().slice(-4)}`,
      gstin: '',
      drugLicenseNumber: '',
      drugLicense20B: '',
      drugLicense21B: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: { street: '', city: '', state: '', pincode: '', country: 'India' },
      paymentTermsDays: 30,
      creditLimit: '',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      displayName: supplier.displayName || '',
      code: supplier.code || '',
      gstin: supplier.gstin || '',
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone,
      address: {
        street: supplier.address?.street || '',
        city: supplier.address?.city || '',
        state: supplier.address?.state || '',
        pincode: supplier.address?.pincode || '',
        country: supplier.address?.country || 'India',
      },
      paymentTermsDays: supplier.paymentTermsDays || 30,
      creditLimit: supplier.creditLimit ? String(supplier.creditLimit) : '',
      status: supplier.status,
    });
    setIsModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) return;

    if (!formData.name.trim() || !formData.phone.trim()) {
      addToast('Supplier Name and Phone are required.', 'error');
      return;
    }

    const caller = {
      uid: currentStaff?.uid || 'user',
      email: currentStaff?.email,
      displayName: currentStaff?.displayName,
    };

    setSaving(true);
    try {
      if (editingSupplier) {
        await supplierService.updateSupplier(organization.id, editingSupplier.id, caller, {
          name: formData.name,
          displayName: formData.displayName || undefined,
          gstin: formData.gstin || undefined,
          contactPerson: formData.contactPerson || undefined,
          email: formData.email || undefined,
          phone: formData.phone,
          address: formData.address,
          paymentTermsDays: Number(formData.paymentTermsDays),
          creditLimit: formData.creditLimit ? Number(formData.creditLimit) : undefined,
          status: formData.status,
        });
        addToast('Supplier updated successfully.', 'success');
      } else {
        await supplierService.createSupplier(organization.id, caller, {
          name: formData.name,
          displayName: formData.displayName || undefined,
          code: formData.code,
          gstin: formData.gstin || undefined,
          contactPerson: formData.contactPerson || undefined,
          email: formData.email || undefined,
          phone: formData.phone,
          address: formData.address,
          paymentTermsDays: Number(formData.paymentTermsDays),
          creditLimit: formData.creditLimit ? Number(formData.creditLimit) : undefined,
          status: formData.status,
        });
        addToast('Supplier created successfully.', 'success');
      }
      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      addToast(err.message || 'Failed to save supplier', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenLedger = async (supplier: Supplier) => {
    setSelectedSupplierForLedger(supplier);
    setLoadingLedger(true);
    try {
      const entries = await supplierService.getSupplierLedger(organization!.id, supplier.id);
      setLedgerEntries(entries);
    } catch (err: any) {
      addToast(err.message || 'Failed to fetch ledger entries', 'error');
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !selectedSupplierForLedger) return;

    const amount = parseFloat(paymentData.amount);
    if (isNaN(amount) || amount <= 0) {
      addToast('Please enter a valid positive payment amount.', 'error');
      return;
    }

    const caller = {
      uid: currentStaff?.uid || 'user',
      email: currentStaff?.email,
      displayName: currentStaff?.displayName,
    };

    setRecordingPayment(true);
    try {
      await supplierService.recordPayment(
        organization.id,
        selectedSupplierForLedger.id,
        caller,
        {
          amount,
          paymentMode: 'Bank Transfer',
          referenceNumber: paymentData.referenceNumber || `PAY-${Date.now().toString().slice(-6)}`,
          notes: paymentData.notes,
        }
      );
      addToast('Supplier payment recorded successfully.', 'success');
      setIsPaymentModalOpen(false);
      setPaymentData({ amount: '', referenceNumber: '', notes: '' });
      // Refresh ledger & suppliers
      handleOpenLedger(selectedSupplierForLedger);
      fetchSuppliers();
    } catch (err: any) {
      addToast(err.message || 'Failed to record payment', 'error');
    } finally {
      setRecordingPayment(false);
    }
  };

  const filteredSuppliers = suppliers.filter((sup) => {
    const q = searchQuery.toLowerCase();
    return (
      sup.name.toLowerCase().includes(q) ||
      sup.code.toLowerCase().includes(q) ||
      sup.phone.includes(q) ||
      (sup.gstin && sup.gstin.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E6F4F1] text-[#0D5C63] flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0B1F33]">Supplier Directory & Ledger</h2>
            <p className="text-xs text-[#64748B]">Manage vendors, drug license verification, and credit balances</p>
          </div>
        </div>

        <PermissionGate permission="supplier.create">
          <Button onClick={handleOpenCreateModal} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-1.5" />
            Add New Supplier
          </Button>
        </PermissionGate>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search supplier, GSTIN, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs font-medium text-[#0B1F33] focus:outline-none focus:border-[#0D5C63] focus:ring-1 focus:ring-[#0D5C63]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'active', 'inactive', 'blocked'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#0D5C63] text-white'
                  : 'bg-white border border-[#CBD5E1] text-[#64748B] hover:bg-[#F8FAFC]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Supplier Grid / Table */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-[#E2E8F0] text-center text-[#64748B] text-xs font-medium">
          Loading supplier master directory...
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#E2E8F0] text-center text-[#64748B] text-xs font-medium">
          No suppliers found in this workspace. Click "Add New Supplier" to create your first vendor record.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm hover:border-[#0D5C63]/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-[#0D5C63] bg-[#E6F4F1] px-2 py-0.5 rounded font-mono">
                      {supplier.code}
                    </span>
                    <h3 className="text-sm font-bold text-[#0B1F33] mt-1">{supplier.name}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      supplier.status === 'active'
                        ? 'bg-[#E6F4F1] text-[#0D5C63]'
                        : supplier.status === 'blocked'
                        ? 'bg-[#FEE2E2] text-[#DC2626]'
                        : 'bg-[#F1F5F9] text-[#64748B]'
                    }`}
                  >
                    {supplier.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[#475569] mb-4">
                  {supplier.gstin && (
                    <p className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="text-[#94A3B8] font-sans">GSTIN:</span> {supplier.gstin}
                    </p>
                  )}
                  {supplier.drugLicenseNumber && (
                    <p className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-[#94A3B8]">DL No:</span> {supplier.drugLicenseNumber}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#94A3B8]" />
                    {supplier.phone}
                  </p>
                  {supplier.email && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-[#94A3B8]" />
                      {supplier.email}
                    </p>
                  )}
                </div>

                {/* Ledger Balance Preview */}
                <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] mb-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#64748B]">Outstanding Balance:</span>
                  <span
                    className={`text-sm font-bold font-mono ${
                      supplier.currentBalance > 0
                        ? 'text-[#DC2626]'
                        : supplier.currentBalance < 0
                        ? 'text-[#16A34A]'
                        : 'text-[#0B1F33]'
                    }`}
                  >
                    ₹{supplier.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#F1F5F9]">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleOpenLedger(supplier)}
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1" />
                  Ledger
                </Button>
                <PermissionGate permission="supplier.update">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleOpenEditModal(supplier)}
                  >
                    Edit
                  </Button>
                </PermissionGate>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supplier Modal (Create/Edit) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier Details' : 'Create Supplier Master'}
        subtitle="Specify statutory GSTIN, Drug License, and credit terms"
        width="md"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#0B1F33] block mb-1">
                Legal Name <span className="text-red-500">*</span>
              </label>
              <TextInput
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Cipla Pharma Ltd"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#0B1F33] block mb-1">Display Name</label>
              <TextInput
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="e.g. Cipla"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#0B1F33] block mb-1">Supplier Code</label>
              <TextInput
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="SUP-1001"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#0B1F33] block mb-1">GSTIN Number</label>
              <TextInput
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="27AAAAA0000A1Z5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#0B1F33] block mb-1">Drug License (General/20B/21B)</label>
              <TextInput
                value={formData.drugLicenseNumber}
                onChange={(e) => setFormData({ ...formData, drugLicenseNumber: e.target.value })}
                placeholder="DL-10023"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#0B1F33] block mb-1">Drug License 20B</label>
              <TextInput
                value={formData.drugLicense20B}
                onChange={(e) => setFormData({ ...formData, drugLicense20B: e.target.value })}
                placeholder="20B-DL-10023"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#0B1F33] block mb-1">Drug License 21B</label>
              <TextInput
                value={formData.drugLicense21B}
                onChange={(e) => setFormData({ ...formData, drugLicense21B: e.target.value })}
                placeholder="21B-DL-10023"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#0B1F33] block mb-1">Contact Person</label>
              <TextInput
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="Ramesh Sharma"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#0B1F33] block mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <TextInput
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="9820012345"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#0B1F33] block mb-1">Email Address</label>
              <TextInput
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="orders@cipladist.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#0B1F33] block mb-1">Credit Payment Terms (Days)</label>
              <TextInput
                type="number"
                value={formData.paymentTermsDays}
                onChange={(e) => setFormData({ ...formData, paymentTermsDays: parseInt(e.target.value) || 0 })}
                placeholder="30"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#0B1F33] block mb-1">Credit Limit (₹)</label>
              <TextInput
                type="number"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                placeholder="e.g. 500000"
              />
            </div>
          </div>

          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] space-y-2">
            <h4 className="text-xs font-bold text-[#0B1F33]">Supplier Address</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <TextInput
                value={formData.address.street}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                placeholder="Street Address"
              />
              <TextInput
                value={formData.address.city}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                placeholder="City"
              />
              <TextInput
                value={formData.address.state}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                placeholder="State"
              />
              <TextInput
                value={formData.address.pincode}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, pincode: e.target.value } })}
                placeholder="Pincode"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#0B1F33] block mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs font-medium text-[#0B1F33]"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Create Supplier'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Supplier Ledger Drawer / Modal */}
      {selectedSupplierForLedger && (
        <Modal
          isOpen={!!selectedSupplierForLedger}
          onClose={() => setSelectedSupplierForLedger(null)}
          title={`Supplier Ledger — ${selectedSupplierForLedger.name}`}
          subtitle={`Current Balance: ₹${selectedSupplierForLedger.currentBalance.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
          })}`}
          width="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0B1F33]">Immutable Financial Statement</span>
              <Button size="sm" onClick={() => setIsPaymentModalOpen(true)}>
                <DollarSign className="w-3.5 h-3.5 mr-1" />
                Record Vendor Payment
              </Button>
            </div>

            {loadingLedger ? (
              <div className="p-8 text-center text-xs text-[#64748B]">Loading ledger entries...</div>
            ) : ledgerEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                No financial ledger transactions logged yet for this supplier.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase">
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Reference #</th>
                      <th className="p-2.5 text-right">Credit (Inward)</th>
                      <th className="p-2.5 text-right">Debit (Payment)</th>
                      <th className="p-2.5 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs font-medium">
                    {ledgerEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-[#F8FAFC]">
                        <td className="p-2.5 font-mono text-[11px]">
                          {new Date(
                            (entry.createdAt as any)?.seconds * 1000 || entry.createdAt
                          ).toLocaleDateString()}
                        </td>
                        <td className="p-2.5 capitalize font-semibold">{entry.type}</td>
                        <td className="p-2.5 font-mono text-[11px]">{entry.referenceNumber}</td>
                        <td className="p-2.5 text-right font-mono text-[#DC2626]">
                          {entry.creditAmount > 0 ? `₹${safeToFixed(entry.creditAmount)}` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono text-[#16A34A]">
                          {entry.debitAmount > 0 ? `₹${safeToFixed(entry.debitAmount)}` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold">
                          ₹{safeToFixed(entry.runningBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Supplier Payment"
        subtitle={`Supplier: ${selectedSupplierForLedger?.name}`}
        width="sm"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#0B1F33] block mb-1">
              Payment Amount (₹) <span className="text-red-500">*</span>
            </label>
            <TextInput
              type="number"
              step="0.01"
              value={paymentData.amount}
              onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
              placeholder="e.g. 5000"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#0B1F33] block mb-1">Payment Reference / Cheque / UTR #</label>
            <TextInput
              value={paymentData.referenceNumber}
              onChange={(e) => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
              placeholder="UTR-992102910"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#0B1F33] block mb-1">Notes / Remarks</label>
            <TextInput
              value={paymentData.notes}
              onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
              placeholder="Paid via RTGS / Bank Transfer"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
            <Button variant="ghost" type="button" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={recordingPayment}>
              {recordingPayment ? 'Posting...' : 'Post Payment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
