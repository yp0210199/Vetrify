import React from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Store, LogOut, RefreshCw, Building2 } from 'lucide-react';
import { Button } from '../ui/Button';

export const NoStoreAssignedView: React.FC = () => {
  const { signOut } = useAuth();
  const { organization, refreshWorkspace, switchOrganization, availableMemberships } = useWorkspace();

  const otherActiveMemberships = availableMemberships.filter(
    (m) => m.staff.status === 'active' && m.organization.id !== organization?.id
  );

  return (
    <div className="min-h-screen w-screen bg-[#0B1F33] flex flex-col items-center justify-center p-4 sm:p-6 text-white antialiased">
      <div className="w-full max-w-md bg-[#132C46] border border-[#183654] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center mx-auto">
          <Store className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white">No Store Branch Assigned</h1>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            You are an active team member of <span className="font-semibold text-white">{organization?.name}</span>, but no store branch has been assigned to your account yet.
          </p>
          <p className="text-[11px] text-[#64748B]">
            Please contact your showroom owner or administrator to assign a showroom or godown branch to your profile.
          </p>
        </div>

        {otherActiveMemberships.length > 0 && (
          <div className="pt-4 border-t border-[#183654] space-y-2 text-left">
            <p className="text-xs font-semibold text-[#CBD5E1]">Or Switch Workspace:</p>
            {otherActiveMemberships.map((m) => (
              <button
                key={m.organization.id}
                onClick={() => switchOrganization(m.organization.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#0B1F33] border border-[#183654] hover:border-[#0D5C63] transition-all text-xs text-white"
              >
                <Building2 className="w-4 h-4 text-[#38BDF8]" />
                <span className="font-bold">{m.organization.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-[#183654] flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={signOut}
            className="text-xs text-[#94A3B8] hover:text-white hover:bg-[#183654]"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>

          <Button
            variant="secondary"
            onClick={refreshWorkspace}
            className="text-xs bg-[#0D5C63] text-white hover:bg-[#09484E]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Again
          </Button>
        </div>
      </div>
    </div>
  );
};
