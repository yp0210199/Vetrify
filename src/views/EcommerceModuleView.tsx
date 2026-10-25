import React, { useState } from 'react';
import { CustomerStorefrontView } from './ecommerce/CustomerStorefrontView';
import { StaffEcommerceView } from './ecommerce/StaffEcommerceView';
import { Store, UserCheck, ShieldCheck } from 'lucide-react';

export const EcommerceModuleView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'customer' | 'staff'>('staff');

  return (
    <div className="space-y-6">
      {/* Top Toggle Switch Bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <Store className="w-5 h-5 text-[#0D5C63]" />
          <div>
            <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">Vetrify Omnichannel E-Commerce Suite</h2>
            <p className="text-[11px] text-slate-500">Seamlessly switch between Customer Storefront simulator and Staff Fulfillment Control Center.</p>
          </div>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewMode('staff')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'staff' ? 'bg-[#0D5C63] text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
          >
            <UserCheck className="w-3.5 h-3.5" /> Staff Fulfillment
          </button>
          <button
            onClick={() => setViewMode('customer')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'customer' ? 'bg-[#0D5C63] text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
          >
            <Store className="w-3.5 h-3.5" /> Customer Storefront
          </button>
        </div>
      </div>

      {viewMode === 'staff' ? <StaffEcommerceView /> : <CustomerStorefrontView />}
    </div>
  );
};
