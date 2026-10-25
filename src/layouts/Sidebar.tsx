import React, { useState } from 'react';
import {
  LayoutDashboard,
  Store,
  Boxes,
  Package,
  ShoppingBag,
  RotateCcw,
  Users,
  Building2,
  Wallet,
  Globe,
  BarChart3,
  ReceiptText,
  Bell,
  CheckSquare,
  Settings,
  Warehouse,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowLeftRight,
  ShieldCheck,
  RefreshCw,
  ShieldAlert,
  Activity,
  Brain,
} from 'lucide-react';
import { NavModuleId, NavItem } from '../types';
import { RxLogo } from '../design/RxLogo';
import { useWorkspace } from '../context/WorkspaceContext';

interface SidebarProps {
  activeModule: NavModuleId;
  onSelectModule: (id: NavModuleId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  unreadNotificationsCount?: number;
  storeName?: string;
  storeLocation?: string;
  userName?: string;
  userRole?: string;
  userAvatarUrl?: string;
  onOpenStoreSelector?: () => void;
  onOpenProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  isCollapsed,
  onToggleCollapse,
  unreadNotificationsCount = 0,
  storeName = 'Main Street Pharmacy',
  storeLocation = 'Gurugram, Haryana',
  userName = 'Admin User',
  userRole = 'Owner',
  userAvatarUrl,
  onOpenStoreSelector,
  onOpenProfile,
}) => {
  const {
    organization,
    availableMemberships,
    switchOrganization,
    hasPermission,
  } = useWorkspace();

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);

  const activeMemberships = availableMemberships.filter((m) => m.staff.status === 'active');

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', shortcut: 'Alt+1' },
    { id: 'pos', label: 'Retail POS', icon: 'Store', shortcut: 'F1', badge: 'Fast', badgeVariant: 'primary' },
    { id: 'compliance', label: 'Compliance & H1', icon: 'ShieldCheck', badge: 'Form 20', badgeVariant: 'warning' },
    { id: 'wholesale', label: 'Wholesale', icon: 'Boxes', badge: 'B2B', badgeVariant: 'primary' },
    { id: 'inventory', label: 'Inventory', icon: 'Package', shortcut: 'Alt+3' },
    { id: 'warehouses', label: 'Warehouses', icon: 'Warehouse', badge: 'Hub', badgeVariant: 'primary' },
    { id: 'transfers', label: 'Stock Transfers', icon: 'ArrowLeftRight', badge: 'Inter-Store', badgeVariant: 'primary' },
    { id: 'purchases', label: 'Purchases', icon: 'ShoppingBag', shortcut: 'Alt+4', badge: 'GRN', badgeVariant: 'primary' },
    { id: 'replenishment', label: 'Replenishment', icon: 'RefreshCw', badge: 'Auto PO', badgeVariant: 'warning' },
    { id: 'sales_returns', label: 'Sales & Returns', icon: 'RotateCcw', isFuture: true, phase: 2 },
    { id: 'customers', label: 'Customers', icon: 'Users', badge: 'Khata', badgeVariant: 'primary' },
    { id: 'suppliers', label: 'Suppliers', icon: 'Building2', shortcut: 'Alt+5' },
    { id: 'collections', label: 'Collections', icon: 'Wallet', isFuture: true, phase: 2 },
    { id: 'ecommerce', label: 'E-commerce', icon: 'Globe', badge: 'Omni', badgeVariant: 'primary' },
    { id: 'reports', label: 'Reports', icon: 'BarChart3', isFuture: true, phase: 2 },
    { id: 'gst_accounts', label: 'GST & Accounts', icon: 'ReceiptText' },
    { id: 'tasks', label: 'Tasks', icon: 'CheckSquare' },
    { id: 'clinical_support', label: 'Clinical Support', icon: 'Brain', badge: 'AI', badgeVariant: 'primary' },
    { id: 'audit_centre', label: 'Audit Centre', icon: 'ShieldAlert' },
    { id: 'activity_centre', label: 'Activity Centre', icon: 'Activity' },
    { id: 'settings', label: 'Settings', icon: 'Settings' },
  ];

  // Role-based permission filtering for nav items
  const visibleNavItems = navItems.filter((item) => {
    switch (item.id) {
      case 'dashboard':
      case 'compliance':
      case 'tasks':
      case 'clinical_support':
      case 'audit_centre':
      case 'activity_centre':
        return true;
      case 'pos':
        return hasPermission('pos.create');
      case 'wholesale':
        return hasPermission('wholesale.read');
      case 'inventory':
        return hasPermission('inventory.read');
      case 'purchases':
        return hasPermission('purchases.read');
      case 'replenishment':
        return hasPermission('replenishment.read') || hasPermission('purchases.create');
      case 'suppliers':
        return hasPermission('supplier.read');
      case 'customers':
        return hasPermission('customer.read');
      case 'settings':
        return (
          hasPermission('settings.read') ||
          hasPermission('settings.update') ||
          hasPermission('staff.read') ||
          hasPermission('staff.invite')
        );
      default:
        // Future / secondary modules
        return true;
    }
  });

  const getIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case 'LayoutDashboard': return <LayoutDashboard className={className} />;
      case 'Store': return <Store className={className} />;
      case 'Boxes': return <Boxes className={className} />;
      case 'Package': return <Package className={className} />;
      case 'Warehouse': return <Warehouse className={className} />;
      case 'ArrowLeftRight': return <ArrowLeftRight className={className} />;
      case 'ShoppingBag': return <ShoppingBag className={className} />;
      case 'RotateCcw': return <RotateCcw className={className} />;
      case 'Users': return <Users className={className} />;
      case 'Building2': return <Building2 className={className} />;
      case 'Wallet': return <Wallet className={className} />;
      case 'Globe': return <Globe className={className} />;
      case 'BarChart3': return <BarChart3 className={className} />;
      case 'ReceiptText': return <ReceiptText className={className} />;
      case 'Bell': return <Bell className={className} />;
      case 'CheckSquare': return <CheckSquare className={className} />;
      case 'Settings': return <Settings className={className} />;
      case 'ShieldCheck': return <ShieldCheck className={className} />;
      case 'RefreshCw': return <RefreshCw className={className} />;
      case 'ShieldAlert': return <ShieldAlert className={className} />;
      case 'Activity': return <Activity className={className} />;
      case 'Brain': return <Brain className={className} />;
      default: return <Package className={className} />;
    }
  };

  return (
    <aside
      className={`hidden md:flex flex-col h-screen bg-[#0B1F33] text-white border-r border-[#183654] transition-all duration-200 select-none z-30 flex-shrink-0 ${
        isCollapsed ? 'w-[72px]' : 'w-[250px]'
      }`}
    >
      {/* Brand & Organization Header */}
      <div className="flex-shrink-0 border-b border-[#183654]">
        <div className="h-16 flex items-center justify-between px-4">
          {!isCollapsed ? (
            <div className="flex items-center gap-2">
              <RxLogo variant="dark" size="sm" showTagline={true} />
            </div>
          ) : (
            <div className="mx-auto">
              <RxLogo variant="symbol" size="sm" />
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1 rounded text-[#94A3B8] hover:text-white hover:bg-[#183654] transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Multi-Organization Switcher Bar */}
        {!isCollapsed && activeMemberships.length > 1 && (
          <div className="px-3 pb-3 relative">
            <button
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-[#132C46] border border-[#183654] hover:border-[#0D5C63] text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Building2 className="w-3.5 h-3.5 text-[#38BDF8] flex-shrink-0" />
                <span className="text-xs font-bold text-white truncate">
                  {organization?.name || 'Pharmacy Workspace'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform ${isOrgDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOrgDropdownOpen && (
              <div className="absolute top-full left-3 right-3 mt-1 bg-[#132C46] border border-[#183654] rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                <p className="text-[10px] font-bold text-[#64748B] uppercase px-2 py-1">
                  Switch Organization
                </p>
                {activeMemberships.map((m) => (
                  <button
                    key={m.organization.id}
                    onClick={() => {
                      switchOrganization(m.organization.id);
                      setIsOrgDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                      m.organization.id === organization?.id
                        ? 'bg-[#0D5C63] text-white font-bold'
                        : 'text-[#CBD5E1] hover:bg-[#183654] hover:text-white'
                    }`}
                  >
                    <span className="truncate">{m.organization.name}</span>
                    <span className="text-[9px] text-[#94A3B8] capitalize ml-1">{m.staff.roleId}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 overscroll-contain">
        {visibleNavItems.map((item) => {
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group cursor-pointer ${
                isActive
                  ? 'bg-[#0D5C63] text-white shadow-sm font-bold'
                  : item.isFuture
                  ? 'text-[#64748B] hover:text-[#94A3B8] hover:bg-[#132C46]/50'
                  : 'text-[#CBD5E1] hover:text-white hover:bg-[#132C46]'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex-shrink-0 transition-colors ${
                    isActive ? 'text-white' : item.isFuture ? 'text-[#64748B]' : 'text-[#94A3B8] group-hover:text-white'
                  }`}
                >
                  {getIcon(item.icon, 'w-4 h-4')}
                </span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!isCollapsed && (
                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono-num ${
                        item.badgeVariant === 'warning'
                          ? 'bg-[#F59E0B] text-white'
                          : 'bg-[#2FA36A] text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.isFuture && (
                    <span className="text-[9px] font-medium text-[#64748B] bg-[#183654] px-1.5 py-0.2 rounded">
                      P{item.phase}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Store Context & User Info Footer */}
      <div className="p-3 border-t border-[#183654] space-y-2 flex-shrink-0">
        {/* Store Status Indicator */}
        <div
          onClick={onOpenStoreSelector}
          className="flex items-center justify-between p-2 rounded-xl bg-[#132C46]/60 border border-[#183654] hover:border-[#0D5C63] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] flex-shrink-0 animate-pulse" />
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p className="text-[11px] font-bold text-white truncate">{storeName}</p>
                <p className="text-[9px] text-[#94A3B8] truncate">{storeLocation}</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <span className="text-[9px] font-bold text-[#22C55E] bg-[#22C55E]/10 px-1.5 py-0.5 rounded">
              Online
            </span>
          )}
        </div>

        {/* User Mini Profile */}
        <div
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#132C46] transition-colors cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-lg bg-[#0D5C63] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden border border-[#183654]">
            {userAvatarUrl ? (
              <img
                src={userAvatarUrl}
                alt={userName || 'User Avatar'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              (userName && userName.length > 0 ? userName[0] : 'U').toUpperCase()
            )}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-white truncate group-hover:text-[#38BDF8] transition-colors">
                {userName || 'Staff User'}
              </p>
              <p className="text-[10px] text-[#94A3B8] truncate">{userRole || 'Staff Member'}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
