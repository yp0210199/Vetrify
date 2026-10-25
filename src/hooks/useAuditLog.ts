import { useCallback } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../auth/AuthProvider';
import { auditService } from '../services/auditService';
import { AuditAction, AuditEntityType } from '../types/firestore';

export function useAuditLog() {
  const { organization, currentStore, currentStaff } = useWorkspace();
  const { user } = useAuth();

  const recordAuditEvent = useCallback(
    async (params: {
      action: AuditAction;
      entityType: AuditEntityType;
      entityId: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!organization?.id || !user?.uid) return;

      await auditService.logAuditEvent({
        organizationId: organization.id,
        storeId: currentStore?.id || null,
        actorUid: user.uid,
        actorEmail: user.email || currentStaff?.email || null,
        actorDisplayName: user.displayName || currentStaff?.displayName || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata,
      });
    },
    [organization?.id, currentStore?.id, user?.uid, user?.email, user?.displayName, currentStaff]
  );

  return {
    recordAuditEvent,
  };
}
