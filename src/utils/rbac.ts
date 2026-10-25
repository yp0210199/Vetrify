import { StaffMember, SystemRoleId, getRoleRank } from '../types/firestore';

/**
 * Vetrify Role Hierarchy & RBAC Utilities
 * 
 * Hierarchy:
 * owner (6) > admin (5) > manager (4) > pharmacist (3) > cashier (2) > staff (1)
 */

export const SUPPORTED_ROLES: { id: SystemRoleId; label: string; description: string; rank: number }[] = [
  {
    id: 'owner',
    label: 'Pharmacy Owner',
    description: 'Full administrative access across all stores, licensing, financials, staff, and system settings.',
    rank: 6,
  },
  {
    id: 'admin',
    label: 'Administrator',
    description: 'Operational control over stores, staff onboarding, inventory, and dispensing workflows.',
    rank: 5,
  },
  {
    id: 'manager',
    label: 'Store Manager',
    description: 'Branch-level operational management, purchase approvals, and inventory audits.',
    rank: 4,
  },
  {
    id: 'pharmacist',
    label: 'Registered Pharmacist',
    description: 'Prescription dispensing, Schedule H/H1 registers, POS billing, and inventory dispensing.',
    rank: 3,
  },
  {
    id: 'cashier',
    label: 'Retail Cashier',
    description: 'POS retail checkout, cash/UPI collection, returns processing, and day-end shift closing.',
    rank: 2,
  },
  {
    id: 'staff',
    label: 'Pharmacy Staff',
    description: 'Basic inventory stocking, rack organization, and read-only catalog lookup.',
    rank: 1,
  },
];

/**
 * Check if the caller can manage the staff section
 */
export function canManageStaff(caller: StaffMember | null | undefined): boolean {
  if (!caller || caller.status !== 'active') return false;
  return caller.roleId === 'owner' || caller.roleId === 'admin';
}

/**
 * Check if the caller can create/invite staff members
 */
export function canCreateStaff(caller: StaffMember | null | undefined): boolean {
  if (!caller || caller.status !== 'active') return false;
  return caller.roleId === 'owner' || caller.roleId === 'admin';
}

/**
 * Check if a specific target role can be assigned/created by the caller
 */
export function canCreateRole(caller: StaffMember | null | undefined, targetRoleId: SystemRoleId | string): boolean {
  if (!caller || caller.status !== 'active') return false;
  if (caller.roleId === 'owner') return true;
  if (caller.roleId === 'admin') {
    // Admin can ONLY create roles strictly below Admin (rank < 5)
    return getRoleRank(targetRoleId) < 5;
  }
  return false;
}

/**
 * Returns the list of roles that the caller is authorized to assign
 */
export function getAssignableRoles(caller: StaffMember | null | undefined) {
  if (!caller || caller.status !== 'active') return [];
  if (caller.roleId === 'owner') {
    return SUPPORTED_ROLES;
  }
  if (caller.roleId === 'admin') {
    return SUPPORTED_ROLES.filter((r) => r.rank < 5);
  }
  return [];
}

/**
 * Check if caller can edit a specific target staff member
 * (Self-editing role/stores is strictly forbidden)
 */
export function canEditStaff(
  caller: StaffMember | null | undefined,
  targetStaff: StaffMember | { uid: string; roleId: string } | null | undefined
): boolean {
  if (!caller || caller.status !== 'active' || !targetStaff) return false;
  // A user CANNOT edit their own staff permissions (prevents self-escalation)
  if (caller.uid === targetStaff.uid) return false;

  if (caller.roleId === 'owner') return true;
  if (caller.roleId === 'admin') {
    // Admin can only edit staff with rank strictly below Admin
    return getRoleRank(targetStaff.roleId) < 5;
  }
  return false;
}

/**
 * Check if caller can suspend a specific target staff member
 */
export function canSuspendStaff(
  caller: StaffMember | null | undefined,
  targetStaff: StaffMember | { uid: string; roleId: string } | null | undefined
): boolean {
  if (!caller || caller.status !== 'active' || !targetStaff) return false;
  if (caller.uid === targetStaff.uid) return false; // Cannot suspend self

  if (caller.roleId === 'owner') return true;
  if (caller.roleId === 'admin') {
    return getRoleRank(targetStaff.roleId) < 5;
  }
  return false;
}

/**
 * Check if caller can reactivate a suspended staff member
 */
export function canReactivateStaff(
  caller: StaffMember | null | undefined,
  targetStaff: StaffMember | { uid: string; roleId: string } | null | undefined
): boolean {
  return canSuspendStaff(caller, targetStaff);
}

/**
 * Check if caller can revoke an invitation or remove staff access
 */
export function canRevokeStaff(
  caller: StaffMember | null | undefined,
  targetRoleId: string,
  targetUid?: string
): boolean {
  if (!caller || caller.status !== 'active') return false;
  if (targetUid && caller.uid === targetUid) return false; // Cannot revoke self

  if (caller.roleId === 'owner') return true;
  if (caller.roleId === 'admin') {
    return getRoleRank(targetRoleId) < 5;
  }
  return false;
}

/**
 * Check if caller can assign all stores access
 */
export function canAssignAllStores(caller: StaffMember | null | undefined): boolean {
  if (!caller || caller.status !== 'active') return false;
  return caller.roleId === 'owner' || caller.roleId === 'admin';
}
