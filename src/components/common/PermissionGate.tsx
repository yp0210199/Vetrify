import React, { ReactNode } from 'react';
import { Permission } from '../../types/firestore';
import { useWorkspace } from '../../context/WorkspaceContext';

export interface PermissionGateProps {
  permission?: Permission | Permission[];
  storeId?: string;
  mode?: 'hide' | 'disable' | 'fallback';
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Reusable UX Gating primitive.
 * IMPORTANT SECURITY RULE: This is for UX feedback ONLY.
 * Firestore security rules remain the authoritative security boundary.
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  storeId,
  mode = 'hide',
  fallback = null,
  children,
}) => {
  const { hasPermission, currentStaff } = useWorkspace();

  let isAllowed = true;

  // 1. Check permission(s)
  if (permission) {
    if (Array.isArray(permission)) {
      isAllowed = permission.some((p) => hasPermission(p));
    } else {
      isAllowed = hasPermission(permission);
    }
  }

  // 2. Check store access bounds if storeId specified
  if (isAllowed && storeId && currentStaff) {
    if (!currentStaff.allStoresAccess && (!currentStaff.storeIds || !currentStaff.storeIds.includes(storeId))) {
      isAllowed = false;
    }
  }

  if (isAllowed) {
    return <>{children}</>;
  }

  if (mode === 'hide') {
    return null;
  }

  if (mode === 'fallback') {
    return <>{fallback}</>;
  }

  if (mode === 'disable') {
    return (
      <div
        className="opacity-50 pointer-events-none select-none cursor-not-allowed filter grayscale-25"
        aria-disabled="true"
        title="You do not have permission for this action"
      >
        {children}
      </div>
    );
  }

  return null;
};
