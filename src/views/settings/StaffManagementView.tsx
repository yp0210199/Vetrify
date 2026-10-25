import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { staffService } from '../../services/staffService';
import { staffInvitationService } from '../../services/staffInvitationService';
import { StaffMember, StaffInvitation, getRoleRank } from '../../types/firestore';
import {
  Users,
  Search,
  Plus,
  Shield,
  ShieldAlert,
  Clock,
  MoreVertical,
  CheckCircle2,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { InviteStaffModal } from '../../components/staff/InviteStaffModal';
import { EditStaffModal } from '../../components/staff/EditStaffModal';
import { StaffDetailsDrawer } from '../../components/staff/StaffDetailsDrawer';
import { canManageStaff } from '../../utils/rbac';

export const StaffManagementView: React.FC = () => {
  const { organization, currentStaff } = useWorkspace();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedStaffForEdit, setSelectedStaffForEdit] = useState<StaffMember | null>(null);
  
  // Drawer
  const [drawerData, setDrawerData] = useState<{
    isOpen: boolean;
    staff: StaffMember | null;
    invitation: StaffInvitation | null;
  }>({
    isOpen: false,
    staff: null,
    invitation: null,
  });

  const loadData = async () => {
    if (!organization?.id) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [fetchedStaff, fetchedInvitations] = await Promise.all([
        staffService.getStaffMembers(organization.id),
        staffInvitationService.getStaffInvitations(organization.id),
      ]);
      setStaffList(fetchedStaff);
      setInvitations(fetchedInvitations);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load staff records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [organization?.id]);

  const hasStaffManagementAccess = canManageStaff(currentStaff);

  const filteredStaff = staffList.filter((s) =>
    s.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.employeeId && s.employeeId.toLowerCase().includes(searchQuery.toLowerCase()))
  ).sort((a, b) => getRoleRank(b.roleId) - getRoleRank(a.roleId));

  const filteredInvitations = invitations.filter((inv) => 
    inv.status === 'pending' || inv.status === 'expired' || inv.status === 'revoked'
  ).filter((i) =>
    i.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.email.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-[#0B1F33] text-white border-[#1E3A5F]';
      case 'admin': return 'bg-[#0D5C63] text-white border-[#0D5C63]';
      case 'manager': return 'bg-[#7C3AED]/10 text-[#6D28D9] border-[#DDD6FE]';
      case 'pharmacist': return 'bg-[#15803D]/10 text-[#15803D] border-[#BBF7D0]';
      case 'cashier': return 'bg-[#D97706]/10 text-[#B45309] border-[#FDE68A]';
      default: return 'bg-[#64748B]/10 text-[#475569] border-[#CBD5E1]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-lg font-bold text-[#0B1F33] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0D5C63]" />
            Staff & Role Management
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage your pharmacy workforce, configure role hierarchies, and grant store-specific permissions.
          </p>
        </div>
        
        {hasStaffManagementAccess && (
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsInviteModalOpen(true)}
          >
            Invite Staff
          </Button>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-[#FEF2F2] rounded-xl border border-[#FCA5A5] flex items-center gap-3 text-sm text-[#B91C1C]">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Security Context Banner */}
      {!hasStaffManagementAccess && (
        <div className="p-3.5 bg-[#FFFBEB] rounded-xl border border-[#FDE68A] flex items-start gap-2.5 text-xs text-[#92400E]">
          <ShieldAlert className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Restricted View</p>
            <p className="mt-0.5 text-[#B45309]">
              You are viewing the staff directory in read-only mode. Higher role privileges are required to invite staff or alter roles.
            </p>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or employee ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-3.5 py-2 text-sm text-[#0B1F33] focus:border-[#0D5C63] focus:ring-1 focus:ring-[#0D5C63] outline-none transition-all placeholder:text-[#94A3B8]"
          />
        </div>
      </div>

      {/* Staff Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-[#E2E8F0] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Active & Suspended Staff */}
          <div>
            <h3 className="text-base font-bold text-[#0B1F33] mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#15803D]" />
              Active Team Members
              <span className="text-xs font-medium text-[#64748B] px-2 py-0.5 bg-[#F1F5F9] rounded-full">
                {filteredStaff.length}
              </span>
            </h3>

            {filteredStaff.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStaff.map((staff) => (
                  <div
                    key={staff.uid}
                    onClick={() => setDrawerData({ isOpen: true, staff, invitation: null })}
                    className="p-4 bg-white rounded-2xl border border-[#E2E8F0] hover:border-[#0D5C63] hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] text-[#475569] flex items-center justify-center font-bold text-sm">
                          {staff.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#0B1F33] truncate max-w-[160px]">
                            {staff.displayName}
                          </p>
                          <p className="text-xs text-[#64748B] truncate max-w-[160px]">{staff.email}</p>
                        </div>
                      </div>
                      {staff.status === 'suspended' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-[#FEE2E2] text-[#B91C1C] rounded-full border border-[#FCA5A5]">
                          Suspended
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${getRoleBadgeColor(staff.roleId)}`}>
                        {staff.roleId}
                      </span>
                      {currentStaff?.uid === staff.uid && (
                        <span className="text-[10px] font-medium text-[#0D5C63] bg-[#0D5C63]/10 px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-[#E2E8F0] border-dashed">
                <Users className="w-8 h-8 text-[#94A3B8] mx-auto mb-3" />
                <p className="text-sm font-medium text-[#0B1F33]">No team members found.</p>
                <p className="text-xs text-[#64748B] mt-1">Adjust your search query.</p>
              </div>
            )}
          </div>

          {/* Pending Invitations */}
          {filteredInvitations.length > 0 && (
            <div>
              <h3 className="text-base font-bold text-[#0B1F33] mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#D97706]" />
                Pending Invitations
                <span className="text-xs font-medium text-[#64748B] px-2 py-0.5 bg-[#F1F5F9] rounded-full">
                  {filteredInvitations.length}
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => setDrawerData({ isOpen: true, staff: null, invitation: inv })}
                    className="p-4 bg-white rounded-2xl border border-[#E2E8F0] border-dashed hover:border-[#0D5C63] transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#FFFBEB] rounded-bl-full -z-10 transition-colors group-hover:bg-[#E6F4F1]" />
                    
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#D97706] flex items-center justify-center font-bold text-sm">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#0B1F33] truncate max-w-[160px]">
                            {inv.displayName}
                          </p>
                          <p className="text-xs text-[#64748B] truncate max-w-[160px]">{inv.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${getRoleBadgeColor(inv.roleId)}`}>
                        {inv.roleId}
                      </span>
                      {inv.status === 'expired' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]">
                          Expired
                        </span>
                      ) : inv.status === 'revoked' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]">
                          Revoked
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-[#D97706]">
                          Awaiting Accept
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Modals & Drawers */}
      <InviteStaffModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvitationCreated={() => {
          loadData();
        }}
      />

      <EditStaffModal
        isOpen={!!selectedStaffForEdit}
        onClose={() => setSelectedStaffForEdit(null)}
        staff={selectedStaffForEdit}
        onStaffUpdated={() => {
          loadData();
        }}
      />

      <StaffDetailsDrawer
        isOpen={drawerData.isOpen}
        onClose={() => setDrawerData({ isOpen: false, staff: null, invitation: null })}
        staff={drawerData.staff}
        invitation={drawerData.invitation}
        onEditStaff={(s) => setSelectedStaffForEdit(s)}
        onStaffStatusChanged={() => loadData()}
      />

    </div>
  );
};
