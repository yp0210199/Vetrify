const fs = require('fs');
let code = fs.readFileSync('src/services/staffInvitationService.ts', 'utf8');

// Replace resendStaffInvitation logic
code = code.replace(
  /async resendStaffInvitation[\s\S]*?async revokeStaffInvitation/g,
  `async regenerateStaffInvitation(
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

    const { deleteDoc } = require('firebase/firestore');
    await deleteDoc(docRef);

    await auditService.logAuditEvent({
      organizationId: orgId,
      actorUid: callerStaff.uid,
      actorEmail: callerStaff.email,
      actorDisplayName: callerStaff.displayName,
      action: 'staff.invitation_removed',
      entityType: 'invitation',
      entityId: invitationId,
      metadata: { deletedEmail: existing.email }
    });
  },

  async checkPendingInvitation(orgId: string, email: string): Promise<StaffInvitation | null> {
    const { query, where } = require('firebase/firestore');
    const db = getFirestoreDb();
    const collRef = collection(db, 'organizations', orgId, 'staffInvitations');
    const q = query(collRef, where('email', '==', email.trim().toLowerCase()));
    const snapshot = await getDocs(q);
    const now = Date.now();
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
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

  async revokeStaffInvitation`
);

// We need to make sure deleteDoc, query, where are imported.
if (!code.includes('deleteDoc,')) {
   code = code.replace("import {\n  doc,", "import {\n  doc,\n  deleteDoc,\n  query,\n  where,");
}

fs.writeFileSync('src/services/staffInvitationService.ts', code);
