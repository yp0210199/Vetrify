import {
  doc,
  deleteDoc,
  query,
  where,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getFirestoreDb } from '../lib/firebase/config';
import {
  StaffInvitation,
  StaffMember,
  SystemRoleId,
  getRoleRank,
} from '../types/firestore';
import { validateStaffInvitation, isValidEmail } from '../lib/firebase/validators';
import { auditService } from './auditService';
import { userService } from './userService';

export const staffInvitationService = {
  /**
   * Create and send a new staff invitation
   */
  async createInvitation(
    orgId: string,
    params: {
      email: string;
      displayName: string;
      phone?: string;
      employeeId?: string;
      roleId: SystemRoleId | string;
      allStoresAccess: boolean;
      storeIds: string[];
    },
    callerStaff: StaffMember
  ): Promise<StaffInvitation> {
    if (!orgId) throw new Error('Organization ID is required.');
    if (!callerStaff || callerStaff.status !== 'active') {
      throw new Error('Unauthorized: Caller must be an active staff member.');
    }

    // Role Hierarchy Authorization Check
    const callerRank = getRoleRank(callerStaff.roleId);
    const targetRank = getRoleRank(params.roleId);

    if (callerStaff.roleId === 'admin') {
      if (targetRank >= 5) {
        throw new Error('Unauthorized: Administrators cannot invite Owners or other Administrators.');
      }
    } else if (callerStaff.roleId !== 'owner') {
      throw new Error('Unauthorized: Only Business Owners and Administrators can invite staff.');
    }

    const cleanEmail = params.email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      throw new Error('Invalid email address format.');
    }

    if (!params.displayName.trim()) {
      throw new Error('Staff full name is required.');
    }

    if (!params.allStoresAccess && (!params.storeIds || params.storeIds.length === 0)) {
      throw new Error('Please select at least one permitted showroom or godown branch.');
    }

    const db = getFirestoreDb();
    const invitationId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const inviteDocRef = doc(db, 'organizations', orgId, 'staffInvitations', invitationId);

    // 7-day expiration window
    const expiresAtDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiresAtTimestamp = Timestamp.fromDate(expiresAtDate);

    const invitationData = {
      id: invitationId,
      organizationId: orgId,
      email: cleanEmail,
      displayName: params.displayName.trim(),
      phone: params.phone?.trim() || null,
      employeeId: params.employeeId?.trim() || null,
      roleId: params.roleId,
      allStoresAccess: params.allStoresAccess,
      storeIds: params.allStoresAccess ? [] : params.storeIds,
      invitedByUid: callerStaff.uid,
      invitedByEmail: callerStaff.email || null,
      status: 'pending' as const,
      expiresAt: expiresAtTimestamp,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      acceptedAt: null,
      acceptedByUid: null,
    };

    await setDoc(inviteDocRef, invitationData);

    // Operational Audit Log
    await auditService.logAuditEvent({
      organizationId: orgId,
      storeId: params.storeIds[0] || null,
      actorUid: callerStaff.uid,
      actorEmail: callerStaff.email,
      actorDisplayName: callerStaff.displayName,
      action: 'staff.invited',
      entityType: 'invitation',
      entityId: invitationId,
      metadata: {
        invitedEmail: cleanEmail,
        displayName: params.displayName.trim(),
        roleId: params.roleId,
        allStoresAccess: params.allStoresAccess,
        storeIds: params.storeIds,
      },
    });

    return {
      ...invitationData,
      phone: params.phone?.trim() || undefined,
      employeeId: params.employeeId?.trim() || undefined,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  },

  /**
   * Fetch all staff invitations for an organization
   */
  async getStaffInvitations(orgId: string): Promise<StaffInvitation[]> {
    if (!orgId) return [];
    try {
      const db = getFirestoreDb();
      const collRef = collection(db, 'organizations', orgId, 'staffInvitations');
      const snapshot = await getDocs(collRef);

      const now = Date.now();

      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        let status = data.status || 'pending';

        // Check if pending invitation has expired
        if (status === 'pending' && data.expiresAt && data.expiresAt.toMillis() < now) {
          status = 'expired';
        }

        const inv: StaffInvitation = {
          id: docSnap.id,
          organizationId: orgId,
          email: data.email || '',
          displayName: data.displayName || '',
          phone: data.phone || undefined,
          employeeId: data.employeeId || undefined,
          roleId: data.roleId || 'staff',
          allStoresAccess: data.allStoresAccess ?? false,
          storeIds: Array.isArray(data.storeIds) ? data.storeIds : [],
          invitedByUid: data.invitedByUid || '',
          invitedByEmail: data.invitedByEmail || null,
          status,
          expiresAt: data.expiresAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          acceptedAt: data.acceptedAt || null,
          acceptedByUid: data.acceptedByUid || null,
        };

        if (!validateStaffInvitation(inv, orgId)) {
          console.warn(`Staff invitation validation warning for ID: ${docSnap.id}`);
        }

        return inv;
      });
    } catch (err) {
      console.warn('Failed to load staff invitations:', err);
      return [];
    }
  },

  /**
   * Fetch a single invitation with explicit diagnostic resolution
   */
  async getStaffInvitationWithDiagnostics(
    orgId: string,
    invitationId: string
  ): Promise<{
    invitation: StaffInvitation | null;
    errorCode?:
      | 'INVALID_PARAMS'
      | 'INVITATION_NOT_FOUND'
      | 'FIRESTORE_PERMISSION_DENIED'
      | 'ORG_MISMATCH';
    errorMessage?: string;
  }> {
    const cleanOrgId = orgId?.trim();
    const cleanInviteId = invitationId?.trim();

    if (!cleanOrgId || !cleanInviteId) {
      console.warn('[InvitationLifecycle] Missing parameters for invitation fetch:', { cleanOrgId, cleanInviteId });
      return {
        invitation: null,
        errorCode: 'INVALID_PARAMS',
        errorMessage: 'Invalid invitation link parameters.',
      };
    }

    try {
      const db = getFirestoreDb();
      const docRef = doc(db, 'organizations', cleanOrgId, 'staffInvitations', cleanInviteId);
      console.info(`[InvitationLifecycle] Attempting getDoc at /organizations/${cleanOrgId}/staffInvitations/${cleanInviteId}`);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        console.warn(`[InvitationLifecycle] INVITATION_NOT_FOUND at path: /organizations/${cleanOrgId}/staffInvitations/${cleanInviteId}`);
        return {
          invitation: null,
          errorCode: 'INVITATION_NOT_FOUND',
          errorMessage: 'Invitation record not found in Firestore.',
        };
      }

      const data = snapshot.data();

      if (data.organizationId && data.organizationId !== cleanOrgId) {
        console.warn(`[InvitationLifecycle] ORG_MISMATCH: expected ${cleanOrgId}, document had ${data.organizationId}`);
        return {
          invitation: null,
          errorCode: 'ORG_MISMATCH',
          errorMessage: 'Invitation organization mismatch.',
        };
      }

      let status = data.status || 'pending';
      if (status === 'pending' && data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
        status = 'expired';
      }

      const invitation: StaffInvitation = {
        id: snapshot.id,
        organizationId: cleanOrgId,
        email: data.email || '',
        displayName: data.displayName || '',
        phone: data.phone || undefined,
        employeeId: data.employeeId || undefined,
        roleId: data.roleId || 'staff',
        allStoresAccess: data.allStoresAccess ?? false,
        storeIds: Array.isArray(data.storeIds) ? data.storeIds : [],
        invitedByUid: data.invitedByUid || '',
        invitedByEmail: data.invitedByEmail || null,
        status,
        expiresAt: data.expiresAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        acceptedAt: data.acceptedAt || null,
        acceptedByUid: data.acceptedByUid || null,
      };

      console.info(`[InvitationLifecycle] Successfully resolved invitation (${invitation.id}): status=${invitation.status}, email=${invitation.email}`);
      return { invitation };
    } catch (err: any) {
      console.error('[InvitationLifecycle] Error fetching invitation from Firestore:', err);
      const isPermissionError =
        err?.code === 'permission-denied' ||
        err?.message?.toLowerCase().includes('permission');

      return {
        invitation: null,
        errorCode: isPermissionError ? 'FIRESTORE_PERMISSION_DENIED' : 'INVITATION_NOT_FOUND',
        errorMessage: err?.message || 'Failed to fetch invitation document.',
      };
    }
  },

  /**
   * Fetch a single invitation by ID within an organization
   */
  async getStaffInvitation(orgId: string, invitationId: string): Promise<StaffInvitation | null> {
    const result = await this.getStaffInvitationWithDiagnostics(orgId, invitationId);
    return result.invitation;
  },

  /**
   * Resend an invitation (extends expiration by 7 days)
   */
  async regenerateStaffInvitation(
    orgId: string,
    invitationId: string,
    callerStaff: StaffMember
  ): Promise<StaffInvitation> {
    const db = getFirestoreDb();
    const docRef = doc(db, 'organizations', orgId, 'staffInvitations', invitationId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
      throw new Error('Invitation record not found.');
    }
    const existing = snapshot.data();
    
    // Authorization
    const callerRank = getRoleRank(callerStaff.roleId);
    const targetRank = getRoleRank(existing.roleId);
    if (callerStaff.roleId === 'admin' && targetRank >= 5) {
      throw new Error('Unauthorized: Administrators cannot regenerate invitations for Admin or Owner roles.');
    }

    if (existing.status === 'accepted') {
       throw new Error('Cannot regenerate an invitation that has already been accepted.');
    }

    // Revoke the old one if it is pending or expired
    if (existing.status === 'pending' || existing.status === 'expired') {
      await updateDoc(docRef, {
        status: 'revoked',
        updatedAt: serverTimestamp(),
      });
      await auditService.logAuditEvent({
        organizationId: orgId,
        actorUid: callerStaff.uid,
        actorEmail: callerStaff.email,
        actorDisplayName: callerStaff.displayName,
        action: 'staff.invitation_revoked',
        entityType: 'invitation',
        entityId: invitationId,
        metadata: { reason: 'regenerated', revokedEmail: existing.email }
      });
    }

    // Create a NEW invitation
    return await this.createInvitation(
       orgId,
       {
         email: existing.email,
         displayName: existing.displayName,
         phone: existing.phone || undefined,
         employeeId: existing.employeeId || undefined,
         roleId: existing.roleId,
         allStoresAccess: existing.allStoresAccess,
         storeIds: Array.isArray(existing.storeIds) ? existing.storeIds : [],
       },
       callerStaff
    );
  },

  async deleteStaffInvitation(
    orgId: string,
    invitationId: string,
    callerStaff: StaffMember
  ): Promise<void> {
    const db = getFirestoreDb();
    const docRef = doc(db, 'organizations', orgId, 'staffInvitations', invitationId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return; // already deleted

    const existing = snapshot.data();
    if (existing.status === 'accepted') {
      throw new Error('Accepted invitations cannot be deleted to preserve audit history.');
    }

    const callerRank = getRoleRank(callerStaff.roleId);
    const targetRank = getRoleRank(existing.roleId);
    if (callerStaff.roleId === 'admin' && targetRank >= 5) {
      throw new Error('Unauthorized: Administrators cannot delete invitations for Admin or Owner roles.');
    }

    await deleteDoc(docRef);

    await auditService.logAuditEvent({
      organizationId: orgId,
      actorUid: callerStaff.uid,
      actorEmail: callerStaff.email,
      actorDisplayName: callerStaff.displayName,
      action: 'staff.invitation_revoked',
      entityType: 'invitation',
      entityId: invitationId,
      metadata: { deletedEmail: existing.email }
    });
  },

  async checkPendingInvitation(orgId: string, email: string): Promise<StaffInvitation | null> {
    const db = getFirestoreDb();
    const collRef = collection(db, 'organizations', orgId, 'staffInvitations');
    const q = query(collRef, where('email', '==', email.trim().toLowerCase()));
    const snapshot = await getDocs(q);
    const now = Date.now();
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as any;
      let status = data.status || 'pending';
      if (status === 'pending' && data.expiresAt && data.expiresAt.toMillis() < now) {
         status = 'expired';
      }
      if (status === 'pending') {
        return {
          id: docSnap.id,
          organizationId: orgId,
          email: data.email || '',
          displayName: data.displayName || '',
          phone: data.phone || undefined,
          employeeId: data.employeeId || undefined,
          roleId: data.roleId || 'staff',
          allStoresAccess: data.allStoresAccess ?? false,
          storeIds: Array.isArray(data.storeIds) ? data.storeIds : [],
          invitedByUid: data.invitedByUid || '',
          status,
          expiresAt: data.expiresAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as StaffInvitation;
      }
    }
    return null;
  },

  async revokeStaffInvitation(
    orgId: string,
    invitationId: string,
    callerStaff: StaffMember
  ): Promise<void> {
    const db = getFirestoreDb();
    const docRef = doc(db, 'organizations', orgId, 'staffInvitations', invitationId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      throw new Error('Invitation record not found.');
    }

    const existing = snapshot.data();
    const targetRank = getRoleRank(existing.roleId);

    if (callerStaff.roleId === 'admin' && targetRank >= 5) {
      throw new Error('Unauthorized: Administrators cannot revoke invitations for Admin or Owner roles.');
    }

    await updateDoc(docRef, {
      status: 'revoked',
      updatedAt: serverTimestamp(),
    });

    await auditService.logAuditEvent({
      organizationId: orgId,
      actorUid: callerStaff.uid,
      actorEmail: callerStaff.email,
      actorDisplayName: callerStaff.displayName,
      action: 'staff.invitation_revoked',
      entityType: 'invitation',
      entityId: invitationId,
      metadata: {
        revokedEmail: existing.email,
        roleId: existing.roleId,
      },
    });
  },

  /**
   * Accept an invitation and activate staff membership
   */
  async acceptStaffInvitation(params: {
    orgId: string;
    invitationId: string;
    user: {
      uid: string;
      email: string;
      displayName?: string;
    };
  }): Promise<StaffMember> {
    const { orgId, invitationId, user } = params;
    if (!orgId || !invitationId || !user?.uid) {
      throw new Error('Missing parameters for invitation acceptance.');
    }

    const db = getFirestoreDb();
    const inviteDocRef = doc(db, 'organizations', orgId, 'staffInvitations', invitationId);
    const inviteSnap = await getDoc(inviteDocRef);

    if (!inviteSnap.exists()) {
      throw new Error('Invitation record does not exist or has been removed.');
    }

    const inv = inviteSnap.data();

    if (inv.status === 'revoked') {
      throw new Error('This invitation has been revoked by workspace administration.');
    }

    if (inv.status === 'accepted') {
      throw new Error('This invitation has already been accepted and activated.');
    }

    if (inv.expiresAt && inv.expiresAt.toMillis() < Date.now()) {
      throw new Error('This invitation has expired. Please ask your workspace manager to resend an invite.');
    }

    // Verify email binding
    const userEmailClean = user.email.trim().toLowerCase();
    const invEmailClean = (inv.email || '').trim().toLowerCase();
    if (userEmailClean !== invEmailClean) {
      throw new Error(
        `Email mismatch: This invitation was issued for ${invEmailClean}, but you are authenticated as ${userEmailClean}.`
      );
    }

    // 1. Create authoritative staff membership document
    const staffDocRef = doc(db, 'organizations', orgId, 'staff', user.uid);
    const staffData = {
      uid: user.uid,
      organizationId: orgId,
      allStoresAccess: inv.allStoresAccess ?? false,
      storeIds: Array.isArray(inv.storeIds) ? inv.storeIds : [],
      roleId: inv.roleId || 'staff',
      invitationId: invitationId,
      employeeId: inv.employeeId || null,
      displayName: (user.displayName || inv.displayName || 'Staff Member').trim(),
      email: invEmailClean,
      phone: inv.phone || null,
      status: 'active' as const,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(staffDocRef, staffData);

    // 2. Mark invitation as accepted
    batch.update(inviteDocRef, {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      acceptedByUid: user.uid,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    // 3. Update global user profile with primaryOrganizationId preference
    try {
      await userService.updateUserProfile(user.uid, { primaryOrganizationId: orgId });
    } catch (e) {
      console.warn('Profile preference update note:', e);
    }

    // 4. Operational Audit Log
    await auditService.logAuditEvent({
      organizationId: orgId,
      actorUid: user.uid,
      actorEmail: userEmailClean,
      actorDisplayName: staffData.displayName,
      action: 'staff.activated',
      entityType: 'staff',
      entityId: user.uid,
      metadata: {
        invitationId,
        roleId: inv.roleId,
        allStoresAccess: inv.allStoresAccess,
        storeIds: inv.storeIds,
      },
    });

    return {
      ...staffData,
      phone: inv.phone || undefined,
      employeeId: inv.employeeId || undefined,
      joinedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  },
};
