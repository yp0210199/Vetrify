import React, { useState } from 'react';
import { X, Warehouse, ShieldAlert, Snowflake, Building2, Phone, Mail, FileText } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { warehouseService } from '../../services/warehouseService';
import { WarehouseType, WarehouseStatus } from '../../types/warehouse';
import { Button } from '../ui/Button';

interface AddWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddWarehouseModal: React.FC<AddWarehouseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { organization, firestoreUser } = useWorkspace();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'DISTRIBUTION' as WarehouseType,
    address: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    gstin: '',
    drugLicense: '',
    status: 'ACTIVE' as WarehouseStatus,
    coldChainEnabled: false,
    capacity: 10000,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !firestoreUser) {
      setError('Missing organization or user context.');
      return;
    }

    if (!formData.name.trim() || !formData.code.trim()) {
      setError('Warehouse Name and Code are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await warehouseService.createWarehouse(
        organization.id,
        {
          uid: firestoreUser.uid,
          email: firestoreUser.email,
          displayName: firestoreUser.displayName,
        },
        {
          code: formData.code.toUpperCase().trim(),
          name: formData.name.trim(),
          type: formData.type,
          address: formData.address.trim(),
          contactName: formData.contactName.trim() || undefined,
          contactPhone: formData.contactPhone.trim() || undefined,
          contactEmail: formData.contactEmail.trim() || undefined,
          gstin: formData.gstin.toUpperCase().trim() || undefined,
          drugLicense: formData.drugLicense.trim() || undefined,
          status: formData.status,
          coldChainEnabled: formData.coldChainEnabled,
          capacity: Number(formData.capacity) || 10000,
          occupiedCapacity: 0,
        }
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create warehouse:', err);
      setError(err?.message || 'Failed to create warehouse.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 text-[#0D5C63] rounded-lg">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Add New Warehouse</h2>
              <p className="text-xs text-slate-500">Configure central hub or regional distribution facility</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-sm text-red-700">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Warehouse Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. WH-CENTRAL-01"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/30 uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Facility Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as WarehouseType })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/30 bg-white"
              >
                <option value="DISTRIBUTION">Central Distribution Hub</option>
                <option value="REGIONAL">Regional Fulfillment Center</option>
                <option value="COLD_CHAIN">Dedicated Cold Chain Hub</option>
                <option value="QUARANTINE">Quarantine & Compliance Center</option>
                <option value="TRANSIT">Transit Depot</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Warehouse Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Central Medical Logistics Hub"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Facility Physical Address
            </label>
            <textarea
              rows={2}
              placeholder="Plot No., Industrial Zone, City, State, PIN"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/30"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Contact Person
              </label>
              <input
                type="text"
                placeholder="Manager Name"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Contact Phone
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Contact Email
              </label>
              <input
                type="email"
                placeholder="yard@vetrify.internal"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                GSTIN Number
              </label>
              <input
                type="text"
                placeholder="27AAAAA0000A1Z5"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/30 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Trade / Yard Reg. No.
              </label>
              <input
                type="text"
                placeholder="YARD-REG-2024"
                value={formData.drugLicense}
                onChange={(e) => setFormData({ ...formData, drugLicense: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Storage Capacity (Units)
              </label>
              <input
                type="number"
                min="100"
                step="100"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/30"
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Snowflake className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Cold Chain Facility</p>
                <p className="text-xs text-slate-500">Enable temperature-controlled storage (2°C - 8°C & -20°C)</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.coldChainEnabled}
                onChange={(e) => setFormData({ ...formData, coldChainEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0D5C63]"></div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create Warehouse
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
