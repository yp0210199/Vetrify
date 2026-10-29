import React, { useState, useEffect } from 'react';
import {
  Building2,
  FileText,
  Shield,
  Clock,
  Coins,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { FormField, TextInput, Select } from '../ui/Input';
import { Organization } from '../../types/firestore';
import { organizationService } from '../../services/organizationService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../context/ToastContext';

export const OrganizationSettingsTab: React.FC = () => {
  const { organization, refreshWorkspace, currentStaff } = useWorkspace();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [gstin, setGstin] = useState('');
  const [drugLicenseNumber, setDrugLicenseNumber] = useState('');

  // Operational Settings
  const [fefoStrictEnforcement, setFefoStrictEnforcement] = useState(true);
  const [scheduleHAutoRegister, setScheduleHAutoRegister] = useState(true);
  const [taxInclusivePricing, setTaxInclusivePricing] = useState(false);
  const [autoReorderTriggers, setAutoReorderTriggers] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const canEditOrganization = currentStaff?.roleId === 'owner' || currentStaff?.roleId === 'admin';

  useEffect(() => {
    if (organization) {
      setName(organization.name || '');
      setLegalName(organization.legalName || '');
      setGstin(organization.gstin || '');

      setFefoStrictEnforcement(organization.settings?.fefoStrictEnforcement ?? true);
      setScheduleHAutoRegister(organization.settings?.scheduleHAutoRegister ?? true);
      setTaxInclusivePricing(organization.settings?.taxInclusivePricing ?? false);
      setAutoReorderTriggers(organization.settings?.autoReorderTriggers ?? true);
    }
  }, [organization]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Trading brand name is required';
    if (gstin.trim() && gstin.trim().length !== 15) {
      errs.gstin = 'GSTIN must be exactly 15 characters';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditOrganization) return;
    if (!validate()) return;
    if (!organization?.id || !user?.uid) return;

    setIsSubmitting(true);
    try {
      await organizationService.updateOrganization(
        organization.id,
        {
          name: name.trim(),
          legalName: legalName.trim() || name.trim(),
          gstin: gstin.trim().toUpperCase(),
          drugLicenseNumber: drugLicenseNumber.trim(),
          settings: {
            fefoStrictEnforcement,
            scheduleHAutoRegister,
            taxInclusivePricing,
            autoReorderTriggers,
          },
        },
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        }
      );

      success('Organization profile and compliance settings updated successfully');
      await refreshWorkspace();
    } catch (err: any) {
      console.error('Failed to update organization:', err);
      error(err?.message || 'Failed to save organization settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6" id="rx-org-settings-form">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0B1F33] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0066FF]" />
            Tiles & Building Materials Organization Profile
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configure central registered business credentials, GSTIN, Trade licensing, and material quality compliance.
          </p>
        </div>

        {canEditOrganization ? (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSubmitting}
            icon={isSubmitting ? undefined : Save}
          >
            {isSubmitting ? 'Saving Changes...' : 'Save Settings'}
          </Button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-[#64748B] bg-[#F1F5F9] px-3 py-1.5 rounded-lg">
            <Lock className="w-3.5 h-3.5" />
            <span>Owner / Admin authorization required to edit</span>
          </div>
        )}
      </div>

      {/* Legal Entity Details */}
      <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-[#E2E8F0] space-y-4">
        <h3 className="text-sm font-bold text-[#0B1F33] flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#0066FF]" /> Business Registration & Licensing
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Trading / Brand Name"
            required
            hint="Display name in POS receipts"
            error={formErrors.name}
          >
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEditOrganization}
              hasError={!!formErrors.name}
              placeholder="e.g. Royal Ceramics & Tiles"
            />
          </FormField>

          <FormField
            label="Legal Business Entity Name"
            hint="As registered with MCA / Registrar"
          >
            <TextInput
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              disabled={!canEditOrganization}
              placeholder="e.g. Royal Ceramics & Building Materials Pvt Ltd"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Central GSTIN (Goods & Services Tax)"
            hint="15-character statutory GSTIN"
            error={formErrors.gstin}
          >
            <TextInput
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              disabled={!canEditOrganization}
              placeholder="27AAAAA0000A1Z5"
              maxLength={15}
              hasError={!!formErrors.gstin}
            />
          </FormField>

          <FormField
            label="Trade / Factory / MSME Registration No."
            hint="State Trade / Industry / MSME Reg. No."
          >
            <TextInput
              value={drugLicenseNumber}
              onChange={(e) => setDrugLicenseNumber(e.target.value)}
              disabled={!canEditOrganization}
              placeholder="MSME-UDYAM-MH-12-0045612"
            />
          </FormField>
        </div>

        {/* Currency & Timezone info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E2E8F0]">
          <div className="p-3 bg-white rounded-xl border border-[#E2E8F0] text-xs space-y-1">
            <div className="text-[#64748B] flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-[#0066FF]" /> Operational Currency
            </div>
            <div className="font-bold text-[#0B1F33]">INR (₹) — Indian Rupee</div>
            <div className="text-[11px] text-[#94A3B8]">Fixed standard for Indian Building Materials Business</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-[#E2E8F0] text-xs space-y-1">
            <div className="text-[#64748B] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#0066FF]" /> System Timezone
            </div>
            <div className="font-bold text-[#0B1F33]">Asia/Kolkata (IST — UTC+05:30)</div>
            <div className="text-[11px] text-[#94A3B8]">Standard Indian Timezone (IST - UTC+05:30)</div>
          </div>
        </div>
      </div>

      {/* Operational Rules & Compliance Controls */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] space-y-4">
        <h3 className="text-sm font-bold text-[#0B1F33] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#0066FF]" /> Tiles & Building Materials Quality & Dispatch Rules
        </h3>

        <div className="space-y-3">
          {/* Shade & Caliber Consistency */}
          <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-all">
            <div>
              <div className="text-sm font-bold text-[#0B1F33]">Strict Shade & Caliber Lot Matching</div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Enforce same shade and caliber lot consistency on tile and slab orders to prevent tonal and dimensional variation at customer sites.
              </p>
            </div>
            <input
              type="checkbox"
              checked={fefoStrictEnforcement}
              onChange={(e) => setFefoStrictEnforcement(e.target.checked)}
              disabled={!canEditOrganization}
              className="mt-1 w-5 h-5 rounded border-[#CBD5E1] text-[#0066FF] focus:ring-[#0066FF]"
            />
          </div>

          {/* Project & Delivery Challan Register */}
          <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-all">
            <div>
              <div className="text-sm font-bold text-[#0B1F33]">Architect & Contractor Delivery Challan Register</div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Automatically link architect/contractor referral details and project site addresses with billing delivery challans.
              </p>
            </div>
            <input
              type="checkbox"
              checked={scheduleHAutoRegister}
              onChange={(e) => setScheduleHAutoRegister(e.target.checked)}
              disabled={!canEditOrganization}
              className="mt-1 w-5 h-5 rounded border-[#CBD5E1] text-[#0066FF] focus:ring-[#0066FF]"
            />
          </div>

          {/* Tax Inclusive Pricing */}
          <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-all">
            <div>
              <div className="text-sm font-bold text-[#0B1F33]">Tax-Inclusive MRP Billing</div>
              <p className="text-xs text-[#64748B] mt-0.5">
                When enabled, retail sale prices are calculated inclusive of CGST/SGST/IGST tax slabs automatically.
              </p>
            </div>
            <input
              type="checkbox"
              checked={taxInclusivePricing}
              onChange={(e) => setTaxInclusivePricing(e.target.checked)}
              disabled={!canEditOrganization}
              className="mt-1 w-5 h-5 rounded border-[#CBD5E1] text-[#0066FF] focus:ring-[#0066FF]"
            />
          </div>

          {/* Auto Reorder Triggers */}
          <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-all">
            <div>
              <div className="text-sm font-bold text-[#0B1F33]">Low Stock & Breakage Scrap Alerts</div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Generate in-app notifications and purchase triggers automatically whenever slab/box quantities drop below minimum threshold or damage scrap occurs.
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoReorderTriggers}
              onChange={(e) => setAutoReorderTriggers(e.target.checked)}
              disabled={!canEditOrganization}
              className="mt-1 w-5 h-5 rounded border-[#CBD5E1] text-[#0066FF] focus:ring-[#0066FF]"
            />
          </div>
        </div>
      </div>
    </form>
  );
};
