import React, { useState } from 'react';
import {
  Mail,
  User,
  Shield,
  Phone,
  Building2,
  Store,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useWorkspace } from '../../context/WorkspaceContext';
import { staffInvitationService } from '../../services/staffInvitationService';
import { StaffInvitation, SystemRoleId } from '../../types/firestore';
import { getAssignableRoles, canAssignAllStores } from '../../utils/rbac';

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvitationCreated: (invitation: StaffInvitation) => void;
}

export const InviteStaffModal: React.FC<InviteStaffModalProps> = ({
  isOpen,
  onClose,
  onInvitationCreated,
}) => {
  const { organization, stores, currentStaff } = useWorkspace();

  // Step 1: Form / Step 2: Success Link Screen
  const [createdInvite, setCreatedInvite] = useState<StaffInvitation | null>(null);
  const [existingInvite, setExistingInvite] = useState<StaffInvitation | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<SystemRoleId>('sales_staff');
  const [allStoresAccess, setAllStoresAccess] = useState(true);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const assignableRoles = getAssignableRoles(currentStaff);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setEmployeeId('');
    setSelectedRoleId(assignableRoles[0]?.id || 'sales_staff');
    setAllStoresAccess(true);
    setSelectedStoreIds(stores.length > 0 ? [stores[0].id] : []);
    setCreatedInvite(null);
    setExistingInvite(null);
    setCopiedLink(false);
    setErrorMsg(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleToggleStore = (storeId: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!organization?.id || !currentStaff) {
      setErrorMsg('Active workspace session not resolved.');
      return;
    }

    if (!fullName.trim()) {
      setErrorMsg('Please enter staff member full name.');
      return;
    }

    const emailClean = email.trim().toLowerCase();
    if (!emailClean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!allStoresAccess && selectedStoreIds.length === 0) {
      setErrorMsg('Please select at least one showroom or godown branch for this staff member.');
      return;
    }

    
    setIsSubmitting(true);

    try {
      const pending = await staffInvitationService.checkPendingInvitation(organization.id, emailClean);
      if (pending) {
         setExistingInvite(pending);
         setIsSubmitting(false);
         return;
      }

      const invitation = await staffInvitationService.createInvitation(
        organization.id,
        {
          displayName: fullName.trim(),
          email: emailClean,
          phone: phone.trim() || undefined,
          employeeId: employeeId.trim() || undefined,
          roleId: selectedRoleId,
          allStoresAccess,
          storeIds: allStoresAccess ? [] : selectedStoreIds,
        },
        currentStaff
      );

      setCreatedInvite(invitation);
      onInvitationCreated(invitation);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to generate invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInviteUrl = (invite: StaffInvitation) => {
    const origin = window.location.origin;
    return `${origin}?invite=${invite.id}&org=${invite.organizationId}`;
  };

  const handleCopyLink = () => {
    if (!createdInvite) return;
    const url = getInviteUrl(createdInvite);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdInvite ? 'Invitation Generated' : 'Invite Staff Member'}
      subtitle={
        createdInvite
          ? 'Secure activation link ready to share with team member'
          : `Add a team member to ${organization?.name || 'Workspace'}`
      }
      size={createdInvite ? 'md' : 'lg'}
    >
      
      {existingInvite ? (
        <div className="space-y-5">
          <div className="p-4 bg-[#FFFBEB] rounded-2xl border border-[#FDE68A] flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#D97706] text-white flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#92400E]">
                Active Invitation Exists
              </h4>
              <p className="text-xs text-[#92400E] mt-0.5">
                An active invitation already exists for <span className="font-mono">{existingInvite.email}</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <Button variant="secondary" onClick={() => setExistingInvite(null)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const url = getInviteUrl(existingInvite);
                navigator.clipboard.writeText(url);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 3000);
                setExistingInvite(null);
                setCreatedInvite(existingInvite);
              }}
            >
              {copiedLink ? 'Copied' : 'Copy Existing Link'}
            </Button>
            <Button
              variant="primary"
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  const newInv = await staffInvitationService.regenerateStaffInvitation(
                    organization!.id,
                    existingInvite.id,
                    currentStaff!
                  );
                  setExistingInvite(null);
                  setCreatedInvite(newInv);
                  onInvitationCreated(newInv);
                } catch (err: any) {
                  setErrorMsg(err?.message || 'Failed to regenerate invitation');
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              {isSubmitting ? 'Generating...' : 'Revoke & Generate New'}
            </Button>
          </div>
        </div>
      ) : createdInvite ? (

        // SUCCESS INVITATION LINK PREVIEW
        <div className="space-y-5">
          <div className="p-4 bg-[#E6F4F1] rounded-2xl border border-[#0D5C63]/20 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0D5C63] text-white flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-[#00E5FF]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0B1F33]">
                Invitation Issued for {createdInvite.displayName}
              </h4>
              <p className="text-xs text-[#475569] mt-0.5">
                Role: <span className="font-bold capitalize text-[#0D5C63]">{createdInvite.roleId}</span> • 
                Recipient: <span className="font-mono text-[#0B1F33]">{createdInvite.email}</span>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#0B1F33] uppercase tracking-wider">
              Activation URL (7-Day Validity)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={getInviteUrl(createdInvite)}
                className="flex-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#0F172A] select-all focus:outline-none"
              />
              <Button
                variant="primary"
                size="sm"
                icon={copiedLink ? Check : Copy}
                onClick={handleCopyLink}
              >
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
          </div>

          <div className="p-3.5 bg-[#FFFBEB] rounded-xl border border-[#FDE68A] flex items-start gap-3 text-xs text-[#92400E]">
            <Info className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Automated Email Dispatch Notice</p>
              <p className="text-[11px] text-[#B45309] mt-0.5 leading-relaxed">
                Direct automated SMTP/SendGrid dispatch will be incorporated via backend Cloud Functions in an upcoming phase. You can directly copy and share the secure link above with your team member right now.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setCreatedInvite(null);
                resetForm();
              }}
            >
              Invite Another Staff
            </Button>
          </div>
        </div>
      ) : (
        // INVITATION CREATION FORM
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-[#FEF2F2] rounded-xl border border-[#FCA5A5] flex items-center gap-3 text-xs text-[#B91C1C]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Personal Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1.5">
                Full Name <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#0D5C63] focus:ring-1 focus:ring-[#0D5C63] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1.5">
                Email Address <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="rajesh.pharma@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#0D5C63] focus:ring-1 focus:ring-[#0D5C63] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1.5">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#0D5C63] focus:ring-1 focus:ring-[#0D5C63] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1.5">
                Employee / Reg. ID (Optional)
              </label>
              <input
                type="text"
                placeholder="EMP-104 / PCI-7782"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#0D5C63] focus:ring-1 focus:ring-[#0D5C63] outline-none"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-bold text-[#334155] mb-2 flex items-center justify-between">
              <span>Select System Role & Permissions</span>
              {currentStaff?.roleId === 'admin' && (
                <span className="text-[10px] text-[#64748B] font-normal">
                  (Admin rank limited: Roles below Admin only)
                </span>
              )}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {assignableRoles.map((role) => {
                const isSelected = selectedRoleId === role.id;
                return (
                  <button
                    type="button"
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0D5C63] bg-[#E6F4F1]/60 shadow-sm ring-1 ring-[#0D5C63]'
                        : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#0B1F33]">{role.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#0D5C63]" />}
                      </div>
                      <p className="text-[11px] text-[#64748B] leading-tight">{role.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Branch & Store Permissions */}
          <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-[#0B1F33] flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-[#0D5C63]" /> Store Branch Authorization
                </h5>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Define whether this staff member can access all branches or specific counters.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <label
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  allStoresAccess
                    ? 'border-[#0D5C63] bg-[#E6F4F1] text-[#0D5C63] font-bold'
                    : 'border-[#CBD5E1] bg-white text-[#334155]'
                }`}
              >
                <input
                  type="radio"
                  name="storeAccessType"
                  checked={allStoresAccess}
                  onChange={() => setAllStoresAccess(true)}
                  className="accent-[#0D5C63]"
                />
                <span className="text-xs">All Current & Future Branches</span>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  !allStoresAccess
                    ? 'border-[#0D5C63] bg-[#E6F4F1] text-[#0D5C63] font-bold'
                    : 'border-[#CBD5E1] bg-white text-[#334155]'
                }`}
              >
                <input
                  type="radio"
                  name="storeAccessType"
                  checked={!allStoresAccess}
                  onChange={() => {
                    setAllStoresAccess(false);
                    if (selectedStoreIds.length === 0 && stores.length > 0) {
                      setSelectedStoreIds([stores[0].id]);
                    }
                  }}
                  className="accent-[#0D5C63]"
                />
                <span className="text-xs">Specific Branch Selection</span>
              </label>
            </div>

            {!allStoresAccess && (
              <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
                <span className="text-[11px] font-bold text-[#334155]">Permitted Branches:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {stores.map((st) => {
                    const isChecked = selectedStoreIds.includes(st.id);
                    return (
                      <label
                        key={st.id}
                        className={`p-2.5 rounded-lg border flex items-center gap-2.5 cursor-pointer text-xs transition-all ${
                          isChecked
                            ? 'border-[#0D5C63] bg-white text-[#0B1F33] font-medium'
                            : 'border-[#E2E8F0] bg-white/60 text-[#64748B]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleStore(st.id)}
                          className="rounded text-[#0D5C63] focus:ring-[#0D5C63]"
                        />
                        <span className="truncate">{st.name}</span>
                        {st.isMainBranch && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-[#0D5C63]/10 text-[#0D5C63] rounded font-bold ml-auto">
                            Main
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={Sparkles}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Generating Invitation...' : 'Issue Invitation'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
