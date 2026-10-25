import React, { useState } from 'react';
import { User, Shield, Key, LogOut, CheckCircle2, AlertCircle, Fingerprint, Building2, Store } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../context/WorkspaceContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const { organization, currentStore, currentStaff } = useWorkspace();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      onClose();
    } catch {
      // Error handled in auth context
    } finally {
      setIsSigningOut(false);
    }
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Staff User';
  const email = user?.email || 'No email provided';
  const initials = user?.initials || 'U';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Profile & Terminal Security"
      subtitle="Firebase authenticated credentials & tenant identity"
      size="sm"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="danger"
            size="sm"
            icon={LogOut}
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* User Card */}
        <div className="flex items-center gap-3.5 p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
          <div className="w-12 h-12 rounded-full bg-[#0B1F33] text-white flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="overflow-hidden flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-[#0B1F33] truncate">{displayName}</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#0D5C63]/10 text-[#0D5C63] border border-[#0D5C63]/20 rounded-full capitalize">
                {currentStaff?.roleId || 'Staff'}
              </span>
            </div>
            <p className="text-xs text-[#64748B] truncate mt-0.5">{email}</p>
          </div>
        </div>

        {/* Organization & Store Information */}
        {organization && (
          <div className="p-3 bg-[#E6F4F1]/30 rounded-xl border border-[#0D5C63]/15 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#64748B] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#0D5C63]" /> Pharmacy:
              </span>
              <span className="font-bold text-[#0B1F33]">{organization.name}</span>
            </div>
            {currentStore && (
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-[#0D5C63]" /> Store Branch:
                </span>
                <span className="font-medium text-[#0B1F33]">{currentStore.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Identity & Session Metadata */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-white border border-[#E2E8F0] rounded-lg">
            <span className="text-[#64748B] flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-[#0D5C63]" /> Auth UID:
            </span>
            <span className="font-mono text-[11px] text-[#0B1F33] truncate max-w-[180px]">
              {user?.uid || 'N/A'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-white border border-[#E2E8F0] rounded-lg">
            <span className="text-[#64748B] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#2FA36A]" /> Session Status:
            </span>
            <span className="font-semibold text-[#15803D]">Active &amp; Verified</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
