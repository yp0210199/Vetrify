import React, { useState, useEffect } from 'react';
import {
  Store,
  Plus,
  Search,
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ShieldCheck,
  Star,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { SearchInput } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { BranchModal } from './BranchModal';
import { PharmacyStore } from '../../types/firestore';
import { storeService } from '../../services/storeService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../context/ToastContext';

export const BranchesManagementTab: React.FC = () => {
  const { organization, stores, refreshWorkspace, currentStaff } = useWorkspace();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<PharmacyStore | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canManageStores = currentStaff?.roleId === 'owner' || currentStaff?.roleId === 'admin';

  const handleOpenAdd = () => {
    setSelectedStore(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (store: PharmacyStore) => {
    setSelectedStore(store);
    setIsModalOpen(true);
  };

  const handleSetMainBranch = async (store: PharmacyStore) => {
    if (!organization?.id || !user?.uid) return;
    try {
      await storeService.setMainBranch(organization.id, store.id, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });
      success(`"${store.name}" is now set as the primary branch.`);
      await refreshWorkspace();
    } catch (err: any) {
      error(err?.message || 'Failed to update main branch.');
    }
  };

  const handleToggleStatus = async (store: PharmacyStore) => {
    if (!organization?.id || !user?.uid) return;
    try {
      await storeService.toggleStoreStatus(organization.id, store.id, store.status, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });
      success(
        `Branch "${store.name}" status changed to ${store.status === 'active' ? 'inactive' : 'active'}.`
      );
      await refreshWorkspace();
    } catch (err: any) {
      error(err?.message || 'Failed to toggle branch status.');
    }
  };

  const filteredStores = stores.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.address?.city && s.address.city.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-lg font-bold text-[#0B1F33] flex items-center gap-2">
            <Store className="w-5 h-5 text-[#0D5C63]" />
            Pharmacy Store Branches & Dispensaries
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage multi-location pharmacy branches, dedicated Form 20B/21B drug licenses, and GSTIN billing contexts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageStores && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={handleOpenAdd}
            >
              Add Pharmacy Branch
            </Button>
          )}
        </div>
      </div>

      {/* Search and summary */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <SearchInput
            placeholder="Search branches by name, code, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-xs text-[#64748B] font-medium">
          Showing {filteredStores.length} of {stores.length} registered {stores.length === 1 ? 'branch' : 'branches'}
        </div>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredStores.map((store) => {
          const isMain = store.isMainBranch;
          const isActive = store.status === 'active';

          return (
            <div
              key={store.id}
              className={`p-5 rounded-2xl border transition-all relative ${
                isMain
                  ? 'border-[#0D5C63]/40 bg-[#F4FAF8] shadow-xs'
                  : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
              }`}
            >
              {/* Top Row: Name, Badges & Code */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-[#0B1F33]">{store.name}</h3>
                    {isMain && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#0D5C63] text-white">
                        <Star className="w-3 h-3 fill-white" /> MAIN BRANCH
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        isActive
                          ? 'bg-[#15803D]/10 text-[#15803D] border border-[#BBF7D0]'
                          : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#FECACA]'
                      }`}
                    >
                      {store.status}
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-[#0D5C63] bg-[#E6F4F1] inline-block px-2 py-0.5 rounded-md">
                    CODE: {store.code}
                  </div>
                </div>

                {canManageStores && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenEdit(store)}
                  >
                    Edit
                  </Button>
                )}
              </div>

              {/* Location & Details */}
              <div className="mt-4 space-y-2 text-xs text-[#475569] border-t border-[#E2E8F0]/60 pt-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0 mt-0.5" />
                  <span>
                    {store.address
                      ? [store.address.street, store.address.city, store.address.state, store.address.postalCode]
                          .filter(Boolean)
                          .join(', ') || 'No physical address configured'
                      : 'No physical address configured'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-[#64748B] pt-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="w-3.5 h-3.5 text-[#94A3B8]" />
                    <span>{store.phone || 'No phone'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-[#94A3B8]" />
                    <span>{store.email || 'No email'}</span>
                  </div>
                </div>

                <div className="mt-3 p-2.5 bg-white rounded-xl border border-[#E2E8F0] space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">GSTIN:</span>
                    <span className="font-bold text-[#0B1F33]">
                      {store.gstin || organization?.gstin || 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              {canManageStores && (
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2 text-xs">
                  {!isMain ? (
                    <button
                      type="button"
                      onClick={() => handleSetMainBranch(store)}
                      className="text-[#0D5C63] hover:underline font-semibold flex items-center gap-1"
                    >
                      <Star className="w-3.5 h-3.5" /> Make Primary Branch
                    </button>
                  ) : (
                    <span className="text-[#64748B] text-[11px] italic">Primary Billing Branch</span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(store)}
                    className={`font-semibold ${
                      isActive ? 'text-[#EF4444] hover:underline' : 'text-[#15803D] hover:underline'
                    }`}
                  >
                    {isActive ? 'Deactivate Branch' : 'Activate Branch'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredStores.length === 0 && (
        <div className="text-center py-12 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
          <Store className="w-10 h-10 text-[#94A3B8] mx-auto mb-2" />
          <h4 className="text-sm font-bold text-[#0B1F33]">No branches found</h4>
          <p className="text-xs text-[#64748B] mt-1">
            {searchQuery
              ? 'Try refining your search keyword.'
              : 'Add your first pharmacy branch location.'}
          </p>
        </div>
      )}

      {/* Branch Add/Edit Modal */}
      <BranchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        storeToEdit={selectedStore}
        onSuccess={async () => {
          await refreshWorkspace();
        }}
      />
    </div>
  );
};
