import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirestoreDb } from '../lib/firebase/config';
import { StaffMember, SystemRoleId, getRoleRank } from '../types/firestore';
import { validateStaffMember } from '../lib/firebase/validators';
import { auditService } from './auditService';
import { canEditStaff, canSuspendStaff, canRevokeStaff } from '../utils/rbac';

export const staffService = {
  /**
   * Fetch a single staff membership document
   */
  async getStaffMember(orgId: string, uid: string): Promise<StaffMember | null> {
    if (!orgId || !uid) return null;
    const db = getFirestoreDb();
    const staffDocRef = doc(db, 'organizations', orgId, 'staff', uid);
    const snapshot = await getDoc(staffDocRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    const staff: StaffMember = {
      uid: snapshot.id,
      organizationId: orgId,
      allStoresAccess: data.allStoresAccess ?? (data.roleId === 'owner' || data.roleId === 'admin'),
      storeIds: Array.isArray(data.storeIds) ? data.storeIds : [],
      roleId: data.roleId || 'staff',
      employeeId: data.employeeId,
      displayName: data.displayName || '',
      email: data.email || '',
      phone: data.phone,
      status: data.status || 'active',
      joinedAt: data.joinedAt,
      updatedAt: data.updatedAt,
    };
    if (!validateStaffMember(staff, orgId)) {
      console.warn(`Staff validation warning for UID: ${uid}`);
    }
    return staff;
  },

  /**
   * List all staff members under an organization
   */
  async getStaffMembers(orgId: string): Promise<StaffMember[]> {
    if (!orgId) return [];
    const db = getFirestoreDb();
    const staffCollRef = collection(db, 'organizations', orgId, 'staff');
    const snapshot = await getDocs(staffCollRef);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        uid: docSnap.id,
        organizationId: orgId,
        allStoresAccess: data.allStoresAccess ?? (data.roleId === 'owner' || data.roleId === 'admin'),
        storeIds: Array.isArray(data.storeIds) ? data.storeIds : [],
        roleId: data.roleId || 'staff',
        employeeId: data.employeeId,
        displayName: data.displayName || '',
        email: data.email || '',
        phone: data.phone,
        status: data.status || 'active',
        joinedAt: data.joinedAt,
        updatedAt: data.updatedAt,
      };
    });
  },

  /**
   * Add a staff member directly (by Admin or Owner)
   */
  async addStaffMember(
    orgId: string,
    params: {
      uid: string;
      roleId: SystemRoleId | string;
      displayName: string;
      email: string;
      phone?: string;
      employeeId?: string;
      allStoresAccess?: boolean;
      storeIds?: string[];
    },
    callerStaff?: StaffMember
  ): Promise<StaffMember> {
    if (callerStaff) {
      if (callerStaff.roleId === 'admin' && getRoleRank(params.roleId) >= 5) {
        throw new Error('Unauthorized: Admin cannot create Admin or Owner staff.');
      }
    }

    const db = getFirestoreDb();
    const staffDocRef = doc(db, 'organizations', orgId, 'staff', params.uid);

    const isHighRole = params.roleId === 'owner' || params.roleId === 'admin';
    const staffData = {
      uid: params.uid,
      organizationId: orgId,
      allStoresAccess: params.allStoresAccess ?? isHighRole,
      storeIds: params.storeIds || [],
      roleId: params.roleId,
      employeeId: params.employeeId?.trim() || null,
      displayName: params.displayName.trim(),
      email: params.email.trim().toLowerCase(),
      phone: params.phone?.trim() || null,
      status: 'active' as const,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(staffDocRef, staffData);

    if (callerStaff) {
      await auditService.logAuditEvent({
        organizationId: orgId,
        actorUid: callerStaff.uid,
        actorEmail: callerStaff.email,
        actorDisplayName: callerStaff.displayName,
        action: 'staff.activated',
        entityType: 'staff',
        entityId: params.uid,
        metadata: {
          roleId: params.roleId,
          email: params.email,
        },
      });
    }

    return { ...staffData, joinedAt: undefined, updatedAt: undefined } as any;
  },

  /**
   * Update staff role and/or store permissions with RBAC enforcement
   */
  async updateStaffMember(
    orgId: string,
    targetUid: string,
    params: {
      roleId?: SystemRoleId | string;
      allStoresAccess?: boolean;
      storeIds?: string[];
      displayName?: string;
      phone?: string;
      employeeId?: string;
      status?: 'active' | 'suspended';
    },
    callerStaff?: StaffMember
  ): Promise<void> {
    if (callerStaff) {
      // Prevent self-role modification
      if (callerStaff.uid === targetUid && params.roleId && params.roleId !== callerStaff.roleId) {
        throw new Error('Security Violation: Users cannot alter their own organizational role.');
      }
      if (callerStaff.uid === targetUid && params.status && params.status !== callerStaff.status) {
        throw new Error('Security Violation: Users cannot change their own account status.');
      }

      // Check hierarchy if updating another member
      if (callerStaff.roleId === 'admin') {
        const targetCurrent = await this.getStaffMember(orgId, targetUid);
        if (targetCurrent && getRoleRank(targetCurrent.roleId) >= 5) {
          throw new Error('Unauthorized: Admin cannot modify another Admin or Owner.');
        }
        if (params.roleId && getRoleRank(params.roleId) >= 5) {
          throw new Error('Unauthorized: Admin cannot promote members to Admin or Owner.');
        }
      }
    }

    const db = getFirestoreDb();
    const staffDocRef = doc(db, 'organizations', orgId, 'staff', targetUid);

    await updateDoc(staffDocRef, {
      ...params,
      updatedAt: serverTimestamp(),
    });

    if (callerStaff) {
      if (params.roleId) {
        await auditService.logAuditEvent({
          organizationId: orgId,
          actorUid: callerStaff.uid,
          actorEmail: callerStaff.email,
          actorDisplayName: callerStaff.displayName,
          action: 'staff.role_updated',
          entityType: 'staff',
          entityId: targetUid,
          metadata: { newRoleId: params.roleId },
        });
      }
      if (params.allStoresAccess !== undefined || params.storeIds) {
        await auditService.logAuditEvent({
          organizationId: orgId,
          actorUid: callerStaff.uid,
          actorEmail: callerStaff.email,
          actorDisplayName: callerStaff.displayName,
          action: 'staff.store_access_updated',
          entityType: 'staff',
          entityId: targetUid,
          metadata: {
            allStoresAccess: params.allStoresAccess,
            storeIds: params.storeIds,
          },
        });
      }
    }
  },

  /**
   * Suspend a staff member
   */
  async suspendStaff(orgId: string, targetUid: string, callerStaff: StaffMember): Promise<void> {
    if (!canSuspendStaff(callerStaff, { uid: targetUid, roleId: '' })) {
      const target = await this.getStaffMember(orgId, targetUid);
      if (!canSuspendStaff(callerStaff, target)) {
        throw new Error('Unauthorized to suspend this staff member.');
      }
    }

    const db = getFirestoreDb();
    const staffDocRef = doc(db, 'organizations', orgId, 'staff', targetUid);
    await updateDoc(staffDocRef, {
      status: 'suspended',
      updatedAt: serverTimestamp(),
    });

    await auditService.logAuditEvent({
      organizationId: orgId,
      actorUid: callerStaff.uid,
      actorEmail: callerStaff.email,
      actorDisplayName: callerStaff.displayName,
      action: 'staff.suspended',
      entityType: 'staff',
      entityId: targetUid,
    });
  },

  /**
   * Reactivate a suspended staff member
   */
  async reactivateStaff(orgId: string, targetUid: string, callerStaff: StaffMember): Promise<void> {
    const target = await this.getStaffMember(orgId, targetUid);
    if (!target) throw new Error('Staff member not found.');

    if (!canSuspendStaff(callerStaff, target)) {
      throw new Error('Unauthorized to reactivate this staff member.');
    }

    const db = getFirestoreDb();
    const staffDocRef = doc(db, 'organizations', orgId, 'staff', targetUid);
    await updateDoc(staffDocRef, {
      status: 'active',
      updatedAt: serverTimestamp(),
    });

    await auditService.logAuditEvent({
      organizationId: orgId,
      actorUid: callerStaff.uid,
      actorEmail: callerStaff.email,
      actorDisplayName: callerStaff.displayName,
      action: 'staff.reactivated',
      entityType: 'staff',
      entityId: targetUid,
    });
  },

  /**
   * Remove staff member from organization
   */
  async removeStaffMember(orgId: string, targetUid: string, callerStaff?: StaffMember): Promise<void> {
    if (callerStaff) {
      const target = await this.getStaffMember(orgId, targetUid);
      if (!target) throw new Error('Staff member not found.');
      if (!canRevokeStaff(callerStaff, target.roleId, targetUid)) {
        throw new Error('Unauthorized to remove this staff member.');
      }
    }

    const db = getFirestoreDb();
    const staffDocRef = doc(db, 'organizations', orgId, 'staff', targetUid);
    await deleteDoc(staffDocRef);

    if (callerStaff) {
      await auditService.logAuditEvent({
        organizationId: orgId,
        actorUid: callerStaff.uid,
        actorEmail: callerStaff.email,
        actorDisplayName: callerStaff.displayName,
        action: 'staff.removed',
        entityType: 'staff',
        entityId: targetUid,
      });
    }
  },
};
