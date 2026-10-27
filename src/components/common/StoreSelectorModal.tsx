import React, { useState } from 'react';
import { Building, MapPin, CheckCircle2, Plus, Store as StoreIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { StoreContext } from '../../types';
import { useWorkspace } from '../../context/WorkspaceContext';

interface StoreSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStore: StoreContext;
  onSelectStore: (store: StoreContext) => void;
}

export const StoreSelectorModal: React.FC<StoreSelectorModalProps> = ({
  isOpen,
  onClose,
  currentStore,
  onSelectStore,
}) => {
  const { stores, organization } = useWorkspace();

  const formattedStores: StoreContext[] = stores.length > 0
    ? stores.map((s) => ({
        id: s.id,
        name: s.name,
        location: s.address
          ? [s.address.city, s.address.state].filter(Boolean).join(', ') || 'Branch Location'
          : 'Branch Location',
        gstin: s.gstin || organization?.gstin || 'GST Unregistered',
        dlNumber: s.gstin || organization?.gstin || 'GST Active',
        status: s.status === 'active' ? 'online' : 'offline',
      }))
    : [currentStore];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Store & Branch Selection"
      subtitle="Switch active pharmacy billing context and drug license entity"
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-[11px] text-[#64748B]">
            {stores.length} Registered {stores.length === 1 ? 'Branch' : 'Branches'} in {organization?.name || 'Workspace'}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {formattedStores.map((store) => {
          const isSelected = store.id === currentStore.id;
          return (
            <div
              key={store.id}
              onClick={() => {
                onSelectStore(store);
                onClose();
              }}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start justify-between ${
                isSelected
                  ? 'border-[#0D5C63] bg-[#E6F4F1]/40 shadow-xs'
                  : 'border-[#E2E8F0] hover:border-[#CBD5E1] bg-white'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-[#0D5C63] text-white' : 'bg-[#F1F5F9] text-[#0D5C63]'
                  }`}
                >
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#0B1F33]">{store.name}</h4>
                    {isSelected && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-[#0D5C63] text-white rounded-full">
                        ACTIVE CONTEXT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#64748B] flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />
                    {store.location}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-[#64748B] font-mono">
                    <span>GSTIN: {store.gstin}</span>
                    <span>DL: {store.dlNumber}</span>
                  </div>
                </div>
              </div>
              {isSelected && <CheckCircle2 className="w-5 h-5 text-[#0D5C63] flex-shrink-0" />}
            </div>
          );
        })}
      </div>
    </Modal>
  );
};
