import React, { ReactNode } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace, WorkspaceProvider } from '../../context/WorkspaceContext';
import { AuthLoadingScreen } from './AuthLoadingScreen';
import { AuthView } from '../../views/auth/AuthView';
import { WorkspaceSetupView } from '../../views/auth/WorkspaceSetupView';
import { AcceptInvitationView } from '../../views/auth/AcceptInvitationView';
import { AccessSuspendedView } from './AccessSuspendedView';
import { NoStoreAssignedView } from './NoStoreAssignedView';

interface ProtectedRouteProps {
  children: ReactNode;
}

const WorkspaceGate: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { workspaceState, hasWorkspace } = useWorkspace();

  if (workspaceState === 'checking') {
    return <AuthLoadingScreen message="Resolving workspace permissions..." />;
  }

  // Handle invitation query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const rawInvite = urlParams.get('invite');
  const rawOrg = urlParams.get('org');
  const inviteId = rawInvite ? decodeURIComponent(rawInvite).trim() : null;
  const orgId = rawOrg ? decodeURIComponent(rawOrg).trim() : null;

  if (inviteId && orgId) {
    return <AcceptInvitationView inviteId={inviteId} orgId={orgId} />;
  }

  // Gate explicit states
  if (workspaceState === 'suspended-membership') {
    return <AccessSuspendedView />;
  }

  if (workspaceState === 'no-accessible-store') {
    return <NoStoreAssignedView />;
  }

  if (!hasWorkspace || workspaceState === 'authenticated-no-membership' || workspaceState === 'provisioning' || workspaceState === 'error' || workspaceState === 'invalid-membership') {
    return <WorkspaceSetupView />;
  }

  return <>{children}</>;
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { status, isAuthenticated } = useAuth();

  if (status === 'loading') {
    return <AuthLoadingScreen message="Initializing secure workspace session..." />;
  }

  if (!isAuthenticated || status === 'unauthenticated') {
    const urlParams = new URLSearchParams(window.location.search);
    const rawInvite = urlParams.get('invite');
    const rawOrg = urlParams.get('org');
    const inviteId = rawInvite ? decodeURIComponent(rawInvite).trim() : null;
    const orgId = rawOrg ? decodeURIComponent(rawOrg).trim() : null;

    if (inviteId && orgId) {
      return <AcceptInvitationView inviteId={inviteId} orgId={orgId} />;
    }
    return <AuthView />;
  }

  return (
    <WorkspaceProvider>
      <WorkspaceGate>{children}</WorkspaceGate>
    </WorkspaceProvider>
  );
};
