import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Phone, Mail, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField, TextInput } from '../ui/Input';
import { PharmacyStore } from '../../types/firestore';
import { storeService } from '../../services/storeService';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeToEdit: PharmacyStore | null;
  onSuccess: () => void;
}

export const BranchModal: React.FC<BranchModalProps> = ({
  isOpen,
  onClose,
  storeToEdit,
  onSuccess,
}) => {
  const { organization } = useWorkspace();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [drugLicenseNumber, setDrugLicenseNumber] = useState('');
  const [gstin, setGstin] = useState('');
  const [isMainBranch, setIsMainBranch] = useState(false);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (storeToEdit) {
      setName(storeToEdit.name || '');
      setCode(storeToEdit.code || '');
      setPhone(storeToEdit.phone || '');
      setEmail(storeToEdit.email || '');
      setStreet(storeToEdit.address?.street || '');
      setCity(storeToEdit.address?.city || '');
      setState(storeToEdit.address?.state || '');
      setPostalCode(storeToEdit.address?.postalCode || '');
      setDrugLicenseNumber(storeToEdit.drugLicenseNumber || '');
      setGstin(storeToEdit.gstin || '');
      setIsMainBranch(storeToEdit.isMainBranch ?? false);
      setStatus(storeToEdit.status || 'active');
    } else {
      setName('');
      setCode('');
      setPhone('');
      setEmail('');
      setStreet('');
      setCity('');
      setState('');
      setPostalCode('');
      setGstin(organization?.gstin || '');
      setIsMainBranch(false);
      setStatus('active');
    }
    setFormErrors({});
  }, [storeToEdit, isOpen, organization]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Branch name is required';
    if (!code.trim()) errs.code = 'Branch code is required';
    else if (!/^[A-Za-z0-9-_]+$/.test(code.trim())) {
      errs.code = 'Branch code can only contain alphanumeric characters, hyphens, and underscores';
    }

    if (postalCode.trim() && !/^\d{6}$/.test(postalCode.trim())) {
      errs.postalCode = 'Must be a 6-digit Indian PIN code';
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Enter a valid email address';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!organization?.id || !user?.uid) return;

    setIsSubmitting(true);
    try {
      const addressObj = {
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        country: 'India',
      };

      const actor = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      };

      if (storeToEdit) {
        await storeService.updateStore(
          organization.id,
          storeToEdit.id,
          {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            phone: phone.trim(),
            email: email.trim(),
            address: addressObj,
            gstin: gstin.trim(),
            isMainBranch,
            status,
          },
          actor
        );
        success(`Branch "${name.trim()}" updated successfully`);
      } else {
        await storeService.createStore(
          organization.id,
          {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            phone: phone.trim(),
            email: email.trim(),
            address: addressObj,
            gstin: gstin.trim(),
            isMainBranch,
          },
          actor
        );
        success(`Branch "${name.trim()}" created successfully`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Store save error:', err);
      error(err?.message || 'Failed to save branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={storeToEdit ? 'Edit Pharmacy Branch' : 'Register New Pharmacy Branch'}
      subtitle="Configure branch location, Drug License, GSTIN, and operational status"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            icon={isSubmitting ? undefined : CheckCircle2}
          >
            {isSubmitting ? 'Saving Branch...' : storeToEdit ? 'Update Branch' : 'Register Branch'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" id="rx-branch-form">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Branch / Store Name" required error={formErrors.name}>
            <TextInput
              placeholder="e.g. Apex Central Dispensary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              hasError={!!formErrors.name}
            />
          </FormField>

          <FormField
            label="Branch Code"
            required
            hint="Unique identifier (e.g. BR-MAIN-01)"
            error={formErrors.code}
          >
            <TextInput
              placeholder="e.g. BR-SOUTH-02"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={!!storeToEdit}
              hasError={!!formErrors.code}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Contact Phone" error={formErrors.phone}>
            <TextInput
              icon={<Phone className="w-4 h-4" />}
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </FormField>

          <FormField label="Branch Email" error={formErrors.email}>
            <TextInput
              icon={<Mail className="w-4 h-4" />}
              type="email"
              placeholder="branch@vetrify.internal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              hasError={!!formErrors.email}
            />
          </FormField>
        </div>

        {/* Address section */}
        <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3">
          <div className="text-xs font-bold text-[#0B1F33] flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#0D5C63]" /> Physical Store Address
          </div>
          <FormField label="Street / Premises">
            <TextInput
              placeholder="Shop No. 4, Medical Square, Ring Road"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="City">
              <TextInput
                placeholder="Mumbai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </FormField>
            <FormField label="State">
              <TextInput
                placeholder="Maharashtra"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </FormField>
            <FormField label="PIN Code" error={formErrors.postalCode}>
              <TextInput
                placeholder="400001"
                maxLength={6}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                hasError={!!formErrors.postalCode}
              />
            </FormField>
          </div>
        </div>

        {/* Licensing & Compliance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Branch Drug License (Form 20B/21B)"
            hint="Branch-specific DL number"
          >
            <TextInput
              icon={<FileText className="w-4 h-4" />}
              placeholder="MH-MZ2-123456"
              value={drugLicenseNumber}
              onChange={(e) => setDrugLicenseNumber(e.target.value)}
            />
          </FormField>

          <FormField
            label="Branch GSTIN"
            hint="15-character GSTIN"
          >
            <TextInput
              placeholder="27AAAAA0000A1Z5"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
            />
          </FormField>
        </div>

        {/* Status & Options */}
        <div className="pt-2 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#0B1F33]">
            <input
              type="checkbox"
              checked={isMainBranch}
              onChange={(e) => setIsMainBranch(e.target.checked)}
              className="rounded border-[#CBD5E1] text-[#0D5C63] focus:ring-[#0D5C63]"
            />
            <span>Set as Primary / Main Pharmacy Branch</span>
          </label>

          {storeToEdit && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-[#64748B]">Operational Status:</span>
              <button
                type="button"
                onClick={() => setStatus(status === 'active' ? 'inactive' : 'active')}
                className={`px-2.5 py-1 rounded-full font-bold text-[11px] transition-all ${
                  status === 'active'
                    ? 'bg-[#15803D]/10 text-[#15803D] border border-[#BBF7D0]'
                    : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#FECACA]'
                }`}
              >
                {status.toUpperCase()}
              </button>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};
