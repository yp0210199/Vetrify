import React from 'react';
import {
  LayoutDashboard,
  Store,
  Package,
  ArrowLeftRight,
  Users,
} from 'lucide-react';
import { NavModuleId } from '../types';

interface MobileBottomNavProps {
  activeModule: NavModuleId;
  onSelectModule: (id: NavModuleId) => void;
  onOpenMoreMenu?: () => void;
  unreadNotificationsCount?: number;
}

interface BottomNavItem {
  id: NavModuleId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeModule,
  onSelectModule,
}) => {
  const primaryTabs: BottomNavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'POS', icon: Store },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
    { id: 'customers', label: 'Customers', icon: Users },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] px-1.5 py-1.5 flex items-center justify-around shadow-lg select-none pb-safe">
      {primaryTabs.map((item) => {
        const isActive = activeModule === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectModule(item.id)}
            className={`relative flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              isActive ? 'text-[#0D5C63]' : 'text-[#64748B] hover:text-[#0B1F33]'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-colors ${
                isActive ? 'bg-[#E6F4F1] text-[#0D5C63]' : ''
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
            </div>
            <span
              className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight truncate max-w-full ${
                isActive ? 'font-bold text-[#0D5C63]' : 'font-medium'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};


