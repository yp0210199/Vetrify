import React, { useState } from 'react';
import { SupplierList } from './SupplierList';
import { POList } from './POList';
import { GRNList } from './GRNList';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PermissionGate } from '../common/PermissionGate';
import { ShoppingBag, PackageCheck, Building2 } from 'lucide-react';

export interface ProcurementModuleProps {
  mode?: 'purchases' | 'suppliers';
}

export const ProcurementModule: React.FC<ProcurementModuleProps> = ({ mode }) => {
  const { hasPermission } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'po' | 'grn' | 'suppliers'>(
    mode === 'suppliers' ? 'suppliers' : 'po'
  );

  // If we are in suppliers mode, directly render the Supplier List with no tabs
  if (mode === 'suppliers') {
    return (
      <PermissionGate permission="supplier.read">
        <SupplierList />
      </PermissionGate>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Switching Navigation */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('po')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'po'
              ? 'bg-[#0D5C63] text-white shadow-sm'
              : 'bg-white border border-[#CBD5E1] text-[#64748B] hover:bg-[#F8FAFC]'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Purchase Orders (PO)
        </button>

        <button
          onClick={() => setActiveTab('grn')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'grn'
              ? 'bg-[#0D5C63] text-white shadow-sm'
              : 'bg-white border border-[#CBD5E1] text-[#64748B] hover:bg-[#F8FAFC]'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          Goods Receipt Notes (GRN) & Inwarding
        </button>
      </div>

      {/* Tab Content rendering */}
      {activeTab === 'po' && (
        <PermissionGate permission="purchases.read">
          <POList />
        </PermissionGate>
      )}

      {activeTab === 'grn' && (
        <PermissionGate permission="grn.read">
          <GRNList />
        </PermissionGate>
      )}
    </div>
  );
};
