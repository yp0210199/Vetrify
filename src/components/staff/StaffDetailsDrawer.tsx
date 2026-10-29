import React, { useState } from 'react';
import {
  User,
  Shield,
  Mail,
  Phone,
  Building2,
  Store,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserX,
  UserCheck,
  Edit,
  Trash2,
  Copy,
  Check,
  Send,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Drawer } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useWorkspace } from '../../context/WorkspaceContext';
import { staffService } from '../../services/staffService';
import { staffInvitationService } from '../../services/staffInvitationService';
import { StaffMember, StaffInvitation } from '../../types/firestore';
import {
  canEditStaff,
  canSuspendStaff,
  canReactivateStaff,
  canRevokeStaff,
} from '../../utils/rbac';

interface StaffDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMember | null;
  invitation: StaffInvitation | null;
  onEditStaff: (staff: StaffMember) => void;
  onStaffStatusChanged: () => void;
}

export const StaffDetailsDrawer: React.FC<StaffDetailsDrawerProps> = ({
  isOpen,
  onClose,
  staff,
  invitation,
  onEditStaff,
  onStaffStatusChanged,
}) => {
  const { organization, stores, currentStaff } = useWorkspace();
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resentNotice, setResentNotice] = useState<string | null>(null);

  if (!staff && !invitation) return null;

  const isInvite = !!invitation && !staff;
  const displayName = staff?.displayName || invitation?.displayName || 'Team Member';
  const email = staff?.email || invitation?.email || '';
  const roleId = staff?.roleId || invitation?.roleId || 'staff';
  const status = staff?.status || invitation?.status || 'active';
  const allStoresAccess = staff?.allStoresAccess ?? invitation?.allStoresAccess ?? false;
  const storeIds = staff?.storeIds || invitation?.storeIds || [];
  const phone = staff?.phone || invitation?.phone;
  const employeeId = staff?.employeeId || invitation?.employeeId;

  const isSelf = staff?.uid === currentStaff?.uid;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-[#0B1F33] text-white border-[#1E3A5F]';
      case 'admin':
        return 'bg-[#0D5C63] text-white border-[#0D5C63]';
      case 'manager':
        return 'bg-[#7C3AED]/10 text-[#6D28D9] border-[#DDD6FE]';
      case 'sales_staff':
      case 'pharmacist':
        return 'bg-[#15803D]/10 text-[#15803D] border-[#BBF7D0]';
      case 'godown_supervisor':
        return 'bg-[#0066FF]/10 text-[#0066FF] border-[#99C2FF]';
      case 'cashier':
        return 'bg-[#D97706]/10 text-[#B45309] border-[#FDE68A]';
      default:
        return 'bg-[#64748B]/10 text-[#475569] border-[#CBD5E1]';
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
            <CheckCircle2 className="w-3.5 h-3.5" /> Active Staff
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#B45309] border border-[#FCD34D]">
            <Clock className="w-3.5 h-3.5" /> Pending Activation
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]">
            <UserX className="w-3.5 h-3.5" /> Suspended
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]">
            <Trash2 className="w-3.5 h-3.5" /> Revoked
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#F1F5F9] text-[#DC2626] border border-[#CBD5E1]">
            <AlertTriangle className="w-3.5 h-3.5" /> Expired
          </span>
        );
      default:
        return null;
    }
  };

  // Actions
  const handleCopyInviteLink = () => {
    if (!invitation) return;
    const url = `${window.location.origin}?invite=${invitation.id}&org=${invitation.organizationId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleResendInvite = async () => {
    if (!organization?.id || !invitation || !currentStaff) return;
    setIsProcessing(true);
    setActionError(null);
    setResentNotice(null);
    try {
      const newInv = await staffInvitationService.regenerateStaffInvitation(
        organization.id,
        invitation.id,
        currentStaff
      );
      const url = `${window.location.origin}?invite=${newInv.id}&org=${newInv.organizationId}`;
      navigator.clipboard.writeText(url);
      setResentNotice(`Fresh invitation generated! Link copied to clipboard (${newInv.id}).`);
      onStaffStatusChanged();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to resend invitation.');
    } finally {
      setIsProcessing(false);
    }
  };

  
  const handleDeleteInvite = async () => {
    if (!organization?.id || !invitation || !currentStaff) return;
    if (!window.confirm(`Are you sure you want to permanently remove this invitation?`)) {
      return;
    }
    setIsProcessing(true);
    setActionError(null);
    try {
      await staffInvitationService.deleteStaffInvitation(
        organization.id,
        invitation.id,
        currentStaff
      );
      onStaffStatusChanged();
      onClose();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to remove invitation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeInvite
 = async () => {
    if (!organization?.id || !invitation || !currentStaff) return;
    if (!window.confirm(`Are you sure you want to revoke the invitation for ${invitation.email}?`)) {
      return;
    }
    setIsProcessing(true);
    setActionError(null);
    try {
      await staffInvitationService.revokeStaffInvitation(
        organization.id,
        invitation.id,
        currentStaff
      );
      onStaffStatusChanged();
      onClose();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to revoke invitation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspendStaff = async () => {
    if (!organization?.id || !staff || !currentStaff) return;
    if (!window.confirm(`Are you sure you want to suspend access for ${staff.displayName}?`)) {
      return;
    }
    setIsProcessing(true);
    setActionError(null);
    try {
      await staffService.suspendStaff(organization.id, staff.uid, currentStaff);
      onStaffStatusChanged();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to suspend staff.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivateStaff = async () => {
    if (!organization?.id || !staff || !currentStaff) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      await staffService.reactivateStaff(organization.id, staff.uid, currentStaff);
      onStaffStatusChanged();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to reactivate staff.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveStaff = async () => {
    if (!organization?.id || !staff || !currentStaff) return;
    if (!window.confirm(`Permanently remove staff membership for ${staff.displayName}? This action cannot be undone.`)) {
      return;
    }
    setIsProcessing(true);
    setActionError(null);
    try {
      await staffService.removeStaffMember(organization.id, staff.uid, currentStaff);
      onStaffStatusChanged();
      onClose();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to remove staff.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={displayName}
      subtitle={email}
      width="md"
    >
      <div className="space-y-6">
        {actionError && (
          <div className="p-3 bg-[#FEF2F2] rounded-xl border border-[#FCA5A5] flex items-center gap-2 text-xs text-[#B91C1C]">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {resentNotice && (
          <div className="p-3 bg-[#ECFDF5] rounded-xl border border-[#A7F3D0] flex items-center gap-2 text-xs text-[#065F46]">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#10B981]" />
            <span>{resentNotice}</span>
          </div>
        )}

        {/* Profile Card Header */}
        <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0B1F33] text-white flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-sm">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-[#0B1F33] truncate">{displayName}</h3>
              {getStatusBadge(status)}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border capitalize ${getRoleBadgeColor(
                  roleId
                )}`}
              >
                {roleId}
              </span>
              {isSelf && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0D5C63]/10 text-[#0D5C63]">
                  You (Current User)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contact & Professional Identification */}
        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] space-y-3 text-xs">
          <h4 className="font-bold text-[#0B1F33] uppercase tracking-wider text-[11px]">
            Identity & Credentials
          </h4>

          <div className="grid grid-cols-1 gap-2.5">
            <div className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9]">
              <span className="text-[#64748B] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#0D5C63]" /> Email:
              </span>
              <span className="font-mono text-[#0B1F33] font-medium select-all">{email}</span>
            </div>

            {phone && (
              <div className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#0D5C63]" /> Phone:
                </span>
                <span className="font-medium text-[#0B1F33]">{phone}</span>
              </div>
            )}

            {employeeId && (
              <div className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#0D5C63]" /> Employee / Lic. ID:
                </span>
                <span className="font-mono font-bold text-[#0B1F33]">{employeeId}</span>
              </div>
            )}

            {staff?.uid && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[#64748B] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#0D5C63]" /> Auth UID:
                </span>
                <span className="font-mono text-[10px] text-[#64748B] select-all truncate max-w-[180px]">
                  {staff.uid}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Store & Branch Access Permitted */}
        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] space-y-3 text-xs">
          <h4 className="font-bold text-[#0B1F33] uppercase tracking-wider text-[11px] flex items-center justify-between">
            <span>Branch Authorizations</span>
            <span className="text-[10px] font-normal text-[#64748B]">
              {allStoresAccess ? 'All Stores Access' : `${storeIds.length} Assigned Branch(es)`}
            </span>
          </h4>

          {allStoresAccess ? (
            <div className="p-3 bg-[#E6F4F1] rounded-xl border border-[#0D5C63]/20 flex items-center gap-2.5 text-[#0D5C63] font-medium">
              <Building2 className="w-4 h-4 flex-shrink-0" />
              <span>Full Access to all current & future store branches</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {stores
                .filter((st) => storeIds.includes(st.id))
                .map((st) => (
                  <div
                    key={st.id}
                    className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Store className="w-3.5 h-3.5 text-[#0D5C63]" />
                      <span className="font-semibold text-[#0B1F33]">{st.name}</span>
                    </div>
                    {st.isMainBranch && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#0D5C63]/10 text-[#0D5C63] rounded font-bold">
                        Main
                      </span>
                    )}
                  </div>
                ))}
              {storeIds.length === 0 && (
                <p className="text-xs text-[#94A3B8] italic">No specific store branches assigned.</p>
              )}
            </div>
          )}
        </div>

        {/* Pending Invitation Link Preview (If Invitation) */}
        {isInvite && invitation && invitation.status === 'pending' && (
          <div className="p-4 bg-[#FFFBEB] rounded-2xl border border-[#FDE68A] space-y-3 text-xs">
            <h4 className="font-bold text-[#92400E] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#D97706]" /> Active Invitation Token
            </h4>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}?invite=${invitation.id}&org=${invitation.organizationId}`}
                className="flex-1 bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 font-mono text-[11px] select-all"
              />
              <Button
                variant="primary"
                size="sm"
                icon={copiedLink ? Check : Copy}
                onClick={handleCopyInviteLink}
              >
                {copiedLink ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        )}

        {/* Operational Context Actions */}
        <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
          {isInvite && invitation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={Send}
                disabled={isProcessing}
                onClick={handleResendInvite}
              >
                Resend Invitation
              </Button>
              {invitation.status === 'pending' && (
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                disabled={isProcessing}
                onClick={handleRevokeInvite}
              >
                Revoke Invitation
              </Button>
              )}
              {invitation.status !== 'accepted' && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Trash2}
                  disabled={isProcessing}
                  onClick={handleDeleteInvite}
                  className="text-[#DC2626] hover:bg-[#FEF2F2] hover:border-[#FCA5A5]"
                >
                  Remove Invitation
                </Button>
              )}
            </div>
          )}

          {!isInvite && staff && (
            <div className="space-y-2">
              {/* Edit Role & Store Access */}
              {canEditStaff(currentStaff, staff) && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-center"
                  icon={Edit}
                  onClick={() => {
                    onClose();
                    onEditStaff(staff);
                  }}
                >
                  Edit Role & Store Permissions
                </Button>
              )}

              {/* Suspend or Reactivate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {status === 'active' && canSuspendStaff(currentStaff, staff) && (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={UserX}
                    disabled={isProcessing}
                    onClick={handleSuspendStaff}
                  >
                    Suspend Staff
                  </Button>
                )}

                {status === 'suspended' && canReactivateStaff(currentStaff, staff) && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={UserCheck}
                    disabled={isProcessing}
                    onClick={handleReactivateStaff}
                  >
                    Reactivate Staff
                  </Button>
                )}

                {canRevokeStaff(currentStaff, staff.roleId, staff.uid) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#DC2626] hover:bg-[#FEF2F2]"
                    icon={Trash2}
                    disabled={isProcessing}
                    onClick={handleRemoveStaff}
                  >
                    Remove Member
                  </Button>
                )}
              </div>

              {isSelf && (
                <p className="text-[11px] text-[#64748B] text-center italic mt-2">
                  To safeguard organizational continuity, you cannot modify your own role.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};
