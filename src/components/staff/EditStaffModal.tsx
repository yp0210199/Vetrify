import React, { useState, useEffect } from 'react';
import {
  Shield,
  User,
  Phone,
  Store,
  Check,
  AlertCircle,
  Building2,
  Lock,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useWorkspace } from '../../context/WorkspaceContext';
import { staffService } from '../../services/staffService';
import { StaffMember, SystemRoleId } from '../../types/firestore';
import { getAssignableRoles, canEditStaff } from '../../utils/rbac';

interface EditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMember | null;
  onStaffUpdated: (updated: StaffMember) => void;
}

export const EditStaffModal: React.FC<EditStaffModalProps> = ({
  isOpen,
  onClose,
  staff,
  onStaffUpdated,
}) => {
  const { organization, stores, currentStaff } = useWorkspace();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<SystemRoleId>('pharmacist');
  const [allStoresAccess, setAllStoresAccess] = useState(true);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (staff) {
      setDisplayName(staff.displayName || '');
      setPhone(staff.phone || '');
      setEmployeeId(staff.employeeId || '');
      setSelectedRoleId((staff.roleId as SystemRoleId) || 'pharmacist');
      setAllStoresAccess(staff.allStoresAccess ?? false);
      setSelectedStoreIds(Array.isArray(staff.storeIds) ? staff.storeIds : []);
      setErrorMsg(null);
    }
  }, [staff]);

  if (!staff) return null;

  const isSelf = currentStaff?.uid === staff.uid;
  const isAuthorizedToEdit = canEditStaff(currentStaff, staff);
  const assignableRoles = getAssignableRoles(currentStaff);

  const handleToggleStore = (storeId: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!organization?.id || !currentStaff) {
      setErrorMsg('Active pharmacy session not resolved.');
      return;
    }

    if (isSelf) {
      setErrorMsg('Security Policy: You cannot modify your own role or store permissions.');
      return;
    }

    if (!isAuthorizedToEdit) {
      setErrorMsg('Unauthorized: You do not possess administrative clearance to modify this staff member.');
      return;
    }

    if (!allStoresAccess && selectedStoreIds.length === 0) {
      setErrorMsg('Please select at least one permitted store branch.');
      return;
    }

    setIsSubmitting(true);

    try {
      await staffService.updateStaffMember(
        organization.id,
        staff.uid,
        {
          displayName: displayName.trim(),
          phone: phone.trim() || undefined,
          employeeId: employeeId.trim() || undefined,
          roleId: selectedRoleId,
          allStoresAccess,
          storeIds: allStoresAccess ? [] : selectedStoreIds,
        },
        currentStaff
      );

      const updatedStaff: StaffMember = {
        ...staff,
        displayName: displayName.trim(),
        phone: phone.trim() || undefined,
        employeeId: employeeId.trim() || undefined,
        roleId: selectedRoleId,
        allStoresAccess,
        storeIds: allStoresAccess ? [] : selectedStoreIds,
      };

      onStaffUpdated(updatedStaff);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Staff Member"
      subtitle={`Configure role and store access for ${staff.displayName || staff.email}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="p-3.5 bg-[#FEF2F2] rounded-xl border border-[#FCA5A5] flex items-center gap-3 text-xs text-[#B91C1C]">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSelf && (
          <div className="p-3.5 bg-[#FFFBEB] rounded-xl border border-[#FDE68A] flex items-center gap-3 text-xs text-[#92400E]">
            <Lock className="w-4 h-4 text-[#D97706] flex-shrink-0" />
            <span>Self-modification protected. Only another owner or admin can alter your role permissions.</span>
          </div>
        )}

        {/* Identity fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#334155] mb-1.5">Full Name</label>
            <input
              type="text"
              required
              disabled={isSelf}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] focus:border-[#0D5C63] focus:ring-1 focus:ring-[#0D5C63] outline-none disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#334155] mb-1.5">Email Address (Locked)</label>
            <input
              type="email"
              readOnly
              value={staff.email}
              className="w-full bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#64748B] outline-none select-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#334155] mb-1.5">Phone Number</label>
            <input
              type="tel"
              disabled={isSelf}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] focus:border-[#0D5C63] focus:ring-1 focus:ring-[#0D5C63] outline-none disabled:bg-[#F1F5F9]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#334155] mb-1.5">Employee / License ID</label>
            <input
              type="text"
              disabled={isSelf}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] focus:border-[#0D5C63] focus:ring-1 focus:ring-[#0D5C63] outline-none disabled:bg-[#F1F5F9]"
            />
          </div>
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-xs font-bold text-[#334155] mb-2">Assigned System Role</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {assignableRoles.map((role) => {
              const isSelected = selectedRoleId === role.id;
              return (
                <button
                  type="button"
                  key={role.id}
                  disabled={isSelf}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer disabled:cursor-not-allowed ${
                    isSelected
                      ? 'border-[#0D5C63] bg-[#E6F4F1]/60 shadow-sm ring-1 ring-[#0D5C63]'
                      : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#0B1F33]">{role.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#0D5C63]" />}
                  </div>
                  <p className="text-[11px] text-[#64748B] leading-tight">{role.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Store Permissions */}
        <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-3">
          <h5 className="text-xs font-bold text-[#0B1F33] flex items-center gap-1.5">
            <Store className="w-4 h-4 text-[#0D5C63]" /> Store Branch Authorization
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label
              className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer ${
                allStoresAccess
                  ? 'border-[#0D5C63] bg-[#E6F4F1] text-[#0D5C63] font-bold'
                  : 'border-[#CBD5E1] bg-white text-[#334155]'
              }`}
            >
              <input
                type="radio"
                name="editStoreAccess"
                disabled={isSelf}
                checked={allStoresAccess}
                onChange={() => setAllStoresAccess(true)}
                className="accent-[#0D5C63]"
              />
              <span className="text-xs">All Current & Future Branches</span>
            </label>

            <label
              className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer ${
                !allStoresAccess
                  ? 'border-[#0D5C63] bg-[#E6F4F1] text-[#0D5C63] font-bold'
                  : 'border-[#CBD5E1] bg-white text-[#334155]'
              }`}
            >
              <input
                type="radio"
                name="editStoreAccess"
                disabled={isSelf}
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
                      className={`p-2.5 rounded-lg border flex items-center gap-2.5 cursor-pointer text-xs ${
                        isChecked
                          ? 'border-[#0D5C63] bg-white text-[#0B1F33] font-medium'
                          : 'border-[#E2E8F0] bg-white/60 text-[#64748B]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={isSelf}
                        checked={isChecked}
                        onChange={() => handleToggleStore(st.id)}
                        className="rounded text-[#0D5C63] focus:ring-[#0D5C63]"
                      />
                      <span className="truncate">{st.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || isSelf || !isAuthorizedToEdit}
          >
            {isSubmitting ? 'Saving Changes...' : 'Update Staff Member'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
