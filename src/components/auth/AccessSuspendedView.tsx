import React from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ShieldAlert, LogOut, Building2, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';

export const AccessSuspendedView: React.FC = () => {
  const { signOut } = useAuth();
  const {
    organization,
    availableMemberships,
    switchOrganization,
  } = useWorkspace();

  const activeMemberships = availableMemberships.filter((m) => m.staff.status === 'active');

  return (
    <div className="min-h-screen w-screen bg-[#0B1F33] flex flex-col items-center justify-center p-4 sm:p-6 text-white antialiased">
      <div className="w-full max-w-md bg-[#132C46] border border-[#183654] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white">Access Suspended</h1>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Your access to <span className="font-semibold text-white">{organization?.name || 'this business workspace'}</span> has been suspended by an administrator.
          </p>
        </div>

        {/* Switch Organization if active memberships exist */}
        {activeMemberships.length > 0 && (
          <div className="pt-4 border-t border-[#183654] space-y-3 text-left">
            <p className="text-xs font-semibold text-[#CBD5E1]">Switch to an Active Workspace:</p>
            <div className="space-y-2">
              {activeMemberships.map((m) => (
                <button
                  key={m.organization.id}
                  onClick={() => switchOrganization(m.organization.id)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[#0B1F33] border border-[#183654] hover:border-[#0D5C63] transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-[#38BDF8]" />
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-[#38BDF8] transition-colors">
                        {m.organization.name}
                      </p>
                      <p className="text-[10px] text-[#94A3B8] capitalize">Role: {m.staff.roleId}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#64748B] group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-[#183654] flex justify-center">
          <Button
            variant="ghost"
            onClick={signOut}
            className="text-xs text-[#94A3B8] hover:text-white hover:bg-[#183654]"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};
