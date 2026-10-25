import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useWorkspace } from './context/WorkspaceContext';
import { Sidebar } from './layouts/Sidebar';
import { Topbar } from './layouts/Topbar';
import { MobileBottomNav } from './layouts/MobileBottomNav';
import { DashboardView } from './views/DashboardView';
import { InventoryView } from './views/InventoryView';
import { InterStoreTransfersView } from './views/InterStoreTransfersView';
import { PosView } from './views/PosView';
import { WholesaleView } from './views/WholesaleView';
import { ProcurementModule } from './components/procurement/ProcurementModule';
import { CustomerManagement } from './components/customers/CustomerManagement';
import { ReturnsWorkspace } from './components/returns/ReturnsWorkspace';
import { FutureModuleView } from './views/FutureModuleView';
import { SettingsView } from './views/settings/SettingsView';
import { NotificationsCenter } from './views/NotificationsCenter';
import { ComplianceView } from './views/ComplianceView';
import { ReplenishmentView } from './views/ReplenishmentView';
import { EInvoiceSettingsView } from './views/EInvoiceSettingsView';
import { EcommerceModuleView } from './views/EcommerceModuleView';
import { TasksWorkspaceView } from './views/TasksWorkspaceView';
import { AuditCentreView } from './views/AuditCentreView';
import { ActivityCentreView } from './views/ActivityCentreView';
import { ClinicalDecisionSupportView } from './views/ClinicalDecisionSupportView';
import { WarehouseControlCenterView } from './components/warehouse/WarehouseControlCenterView';
import { GlobalSearch } from './components/common/GlobalSearch';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { notificationService } from './services/notificationService';
import { StoreSelectorModal } from './components/common/StoreSelectorModal';
import { UserProfileModal } from './components/common/UserProfileModal';
import { CommandPaletteHelpModal } from './components/common/CommandPaletteHelpModal';
import { Drawer } from './components/ui/Modal';
import { Button } from './components/ui/Button';
import { NavModuleId, StoreContext, UserProfile } from './types';
import {
  LayoutDashboard,
  Store,
  Package,
  Bell,
  X,
  Boxes,
  ShoppingBag,
  RotateCcw,
  Users,
  Building2,
  Wallet,
  Globe,
  BarChart3,
  ReceiptText,
  CheckSquare,
  Settings,
  Warehouse,
  ArrowLeftRight,
  RefreshCw,
  ShieldCheck,
  Brain,
  ShieldAlert,
  Activity,
  Search,
} from 'lucide-react';

function AuthenticatedAppShell() {
  const { user } = useAuth();
  const { organization, currentStore: firestoreStore, stores, currentStaff, firestoreUser, switchStore, hasPermission } = useWorkspace();
  const [activeModule, setActiveModule] = useState<NavModuleId>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  // Real-time listener for unread notifications count
  useEffect(() => {
    if (!organization?.id || !user?.uid) {
      setUnreadNotificationsCount(0);
      return;
    }
    const unsubscribe = notificationService.subscribeUserNotifications(
      organization.id,
      user.uid,
      (list) => {
        const unread = list.filter((n) => !n.read).length;
        setUnreadNotificationsCount(unread);
      },
      (err) => {
        console.error('Failed to update unread notifications count:', err);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [organization?.id, user?.uid]);

  // Derive active store context from real Firestore PharmacyStore
  const activeStoreContext: StoreContext = {
    id: firestoreStore?.id || 'store_main',
    name: firestoreStore?.name || organization?.name || 'Primary Store Branch',
    location: firestoreStore?.address
      ? [firestoreStore.address.city, firestoreStore.address.state].filter(Boolean).join(', ') || 'India'
      : 'India',
    gstin: firestoreStore?.gstin || organization?.gstin || 'GST Unregistered',
    dlNumber: firestoreStore?.drugLicenseNumber || organization?.drugLicenseNumber || 'Form 20B/21B Active',
    status: firestoreStore?.status === 'active' ? 'online' : 'offline',
  };

  // Current User Profile derived from real Firebase Authentication & Firestore Staff Role
  const currentUser: UserProfile = {
    id: user?.uid || 'usr_staff',
    name: user?.displayName || user?.email?.split('@')[0] || 'Staff Member',
    email: user?.email || '',
    role: currentStaff?.roleId
      ? (currentStaff.roleId.charAt(0).toUpperCase() + currentStaff.roleId.slice(1)) as any
      : 'Pharmacist',
    storeName: activeStoreContext.name,
    avatarUrl: user?.photoURL || currentStaff?.photoURL || firestoreUser?.photoURL || undefined,
  };

  // Global Keyboard Shortcuts (Ctrl+K for search, Ctrl+/ for help, F1 for POS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
      }
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveModule('pos');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectModule = (moduleId: NavModuleId) => {
    setActiveModule(moduleId);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderActiveView = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardView onNavigate={handleSelectModule} />;
      case 'pos':
        if (!hasPermission('pos.create')) {
          return <DashboardView onNavigate={handleSelectModule} />;
        }
        return <PosView />;
      case 'wholesale':
        if (!hasPermission('wholesale.read')) {
          return <DashboardView onNavigate={handleSelectModule} />;
        }
        return <WholesaleView />;
      case 'inventory':
        if (!hasPermission('inventory.read')) {
          return <DashboardView onNavigate={handleSelectModule} />;
        }
        return <InventoryView />;
      case 'transfers':
        if (!hasPermission('stock_transfer.read') && !hasPermission('inventory.read') && !hasPermission('inventory.transfer')) {
          return <DashboardView onNavigate={handleSelectModule} />;
        }
        return <InterStoreTransfersView />;
      case 'purchases':
        if (!hasPermission('purchases.read') && !hasPermission('grn.read')) {
          return <DashboardView onNavigate={handleSelectModule} />;
        }
        return <ProcurementModule mode="purchases" />;
      case 'replenishment':
        if (!hasPermission('replenishment.read') && !hasPermission('purchases.create')) {
          return <DashboardView onNavigate={handleSelectModule} />;
        }
        return <ReplenishmentView />;
      case 'suppliers':
        if (!hasPermission('supplier.read')) {
          return <DashboardView onNavigate={handleSelectModule} />;
        }
        return <ProcurementModule mode="suppliers" />;
      case 'customers':
        if (!hasPermission('customer.read')) {
          return <DashboardView onNavigate={handleSelectModule} />;
        }
        return <CustomerManagement />;
      case 'sales_returns':
      case 'returns':
        if (!hasPermission('returns.read') && !hasPermission('returns.create') && !hasPermission('expiry.read')) {
          return <DashboardView onNavigate={handleSelectModule} />;
        }
        return <ReturnsWorkspace />;
      case 'notifications':
        return <NotificationsCenter onNavigateToModule={handleSelectModule} />;
      case 'compliance':
        return <ComplianceView />;
      case 'gst_accounts':
        return <EInvoiceSettingsView />;
      case 'ecommerce':
        return <EcommerceModuleView />;
      case 'tasks':
        return <TasksWorkspaceView onNavigateToModule={handleSelectModule} />;
      case 'audit_centre':
        return <AuditCentreView />;
      case 'activity_centre':
        return <ActivityCentreView onNavigateToModule={handleSelectModule} />;
      case 'clinical_support':
        return <ClinicalDecisionSupportView />;
      case 'warehouses':
        if (!hasPermission('warehouse.view')) {
          return <DashboardView onNavigate={handleSelectModule} />;
        }
        return <WarehouseControlCenterView />;

      case 'settings':
        if (
          !hasPermission('settings.read') &&
          !hasPermission('settings.update') &&
          !hasPermission('staff.read') &&
          !hasPermission('staff.invite')
        ) {
          return <DashboardView onNavigate={handleSelectModule} />;
        }
        return <SettingsView />;
      default:
        return (
          <FutureModuleView
            moduleId={activeModule}
            onNavigateToActive={handleSelectModule}
          />
        );
    }
  };

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] text-[#0B1F33] flex flex-col md:flex-row antialiased overflow-hidden">
      {/* Desktop & Tablet Persistent Sidebar */}
      <Sidebar
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        unreadNotificationsCount={unreadNotificationsCount}
        storeName={activeStoreContext.name}
        storeLocation={activeStoreContext.location}
        userName={currentUser.name}
        userRole={currentUser.role}
        userAvatarUrl={currentUser.avatarUrl}
        onOpenStoreSelector={() => setIsStoreModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Global Topbar */}
        <Topbar
          currentStore={activeStoreContext}
          currentUser={currentUser}
          unreadNotificationsCount={unreadNotificationsCount}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenHelp={() => setIsHelpOpen(true)}
          onOpenNotifications={() => setIsNotificationOpen(true)}
          onOpenStoreSelector={() => setIsStoreModalOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full mx-auto pb-20 md:pb-8 overscroll-contain">
          <div className="max-w-7xl mx-auto">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (< md) */}
      <MobileBottomNav
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        onOpenMoreMenu={() => setIsMobileMenuOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Global Command Palette / Search Modal (Ctrl+K) */}
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={(route, item) => {
          if (route) {
            handleSelectModule(route as any);
          }
        }}
      />

      {/* Dedicated Command Palette & System Help Modal (Ctrl+/) */}
      <CommandPaletteHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onNavigate={(mod) => handleSelectModule(mod)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onNavigateToModule={(mod) => handleSelectModule(mod as any)}
        onRefreshUnreadCount={async () => {
          if (organization?.id && user?.uid) {
            try {
              const count = await notificationService.getUnreadNotificationCount(organization.id, user.uid);
              setUnreadNotificationsCount(count);
            } catch (err) {
              console.error('Failed to refresh unread notification count:', err);
            }
          }
        }}
      />

      {/* Store Context Switcher Modal */}
      <StoreSelectorModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        currentStore={activeStoreContext}
        onSelectStore={(st) => switchStore(st.id)}
      />

      {/* Staff Profile & Security Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Mobile "More" Navigation Drawer */}
      <Drawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        title="Vetrify Navigation"
        subtitle="Billing, Inventory & E-commerce Suite"
        width="md"
      >
        {/* Mobile Store / Branch Quick Switcher */}
        <div className="mb-3.5 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#E6F4F1] text-[#0D5C63] flex items-center justify-center flex-shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-[#64748B] font-medium uppercase tracking-wider">Active Branch</p>
              <p className="text-xs font-bold text-[#0B1F33] truncate">{activeStoreContext.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              setIsStoreModalOpen(true);
            }}
            className="px-2.5 py-1 text-xs font-bold text-[#0D5C63] bg-white border border-[#CBD5E1] rounded-lg shadow-2xs hover:bg-[#E6F4F1] transition-colors cursor-pointer flex-shrink-0"
          >
            Switch Branch
          </button>
        </div>

        {/* Modules List Categorized */}
        <div className="space-y-4">
          {[
            {
              category: 'Core Operations & Sales',
              items: [
                { id: 'dashboard', label: 'Dashboard', desc: 'Real-time metrics & store overview', icon: LayoutDashboard },
                { id: 'pos', label: 'Retail POS', desc: 'Counter billing & thermal receipt print', icon: Store, badge: 'Fast' },
                { id: 'wholesale', label: 'Wholesale POS', desc: 'B2B bulk invoices & credit terms', icon: Boxes, badge: 'B2B' },
                { id: 'sales_returns', label: 'Sales & Returns', desc: 'Credit notes & return log', icon: RotateCcw, phase: 2 },
                { id: 'ecommerce', label: 'E-commerce Store', desc: 'Online orders & delivery sync', icon: Globe, badge: 'Omni' },
              ],
            },
            {
              category: 'Inventory & Supply Logistics',
              items: [
                { id: 'inventory', label: 'Inventory Master', desc: 'Medicine catalog & batch expiries', icon: Package, badge: 'Master' },
                { id: 'warehouses', label: 'Warehouses & Hubs', desc: 'Depot zones & central storage', icon: Warehouse, badge: 'Hub' },
                { id: 'transfers', label: 'Stock Transfers', desc: 'Inter-branch stock dispatch & GRN', icon: ArrowLeftRight, badge: 'Transfers' },
                { id: 'purchases', label: 'Purchases & GRN', desc: 'Vendor purchase orders & inwards', icon: ShoppingBag, badge: 'GRN' },
                { id: 'replenishment', label: 'Auto Replenishment', desc: 'Smart PO re-order triggers', icon: RefreshCw, badge: 'Auto PO' },
              ],
            },
            {
              category: 'CRM, Finance & Accounts',
              items: [
                { id: 'customers', label: 'Customers (Khata)', desc: 'Patient credit ledgers & balance', icon: Users, badge: 'Khata' },
                { id: 'suppliers', label: 'Suppliers Master', desc: 'Distributor directory & terms', icon: Building2 },
                { id: 'collections', label: 'Collections', desc: 'Outstanding dues & receipts', icon: Wallet, phase: 2 },
                { id: 'gst_accounts', label: 'GST & Ledgers', desc: 'GSTR-1, HSN tax summary & ledgers', icon: ReceiptText },
                { id: 'reports', label: 'Reports & Analytics', desc: 'Sales, margins & dead stock BI', icon: BarChart3, phase: 2 },
              ],
            },
            {
              category: 'Clinical, Security & Settings',
              items: [
                { id: 'compliance', label: 'Compliance & H1', desc: 'Schedule H/H1 registers & doctors', icon: ShieldCheck, badge: 'Form 20' },
                { id: 'clinical_support', label: 'Clinical AI Support', desc: 'Drug interactions & dosage checker', icon: Brain, badge: 'AI' },
                { id: 'tasks', label: 'Operational Tasks', desc: 'Daily SOP checklists & alerts', icon: CheckSquare },
                { id: 'audit_centre', label: 'Audit Centre', desc: 'Tamper-evident system logs', icon: ShieldAlert },
                { id: 'activity_centre', label: 'Activity Ledger', desc: 'Operational timeline & events', icon: Activity },
                { id: 'settings', label: 'Settings & Staff', desc: 'Branch config & role permissions', icon: Settings },
              ],
            },
          ].map((section, sIdx) => {
            const visibleItems = section.items.filter((item) => {
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
                case 'warehouses':
                  return hasPermission('warehouse.view');
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
                  return true;
              }
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-2">
                <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider px-1">
                  {section.category}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          handleSelectModule(item.id as any);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`p-3 rounded-xl border flex items-start gap-3 transition-all text-left cursor-pointer ${
                          isActive
                            ? 'border-[#0D5C63] bg-[#E6F4F1] text-[#0D5C63] shadow-xs'
                            : 'border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                            isActive
                              ? 'bg-[#0D5C63] text-white'
                              : 'bg-[#F1F5F9] text-[#475569]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs truncate ${isActive ? 'font-bold text-[#0D5C63]' : 'font-semibold text-[#0B1F33]'}`}>
                              {item.label}
                            </span>
                            {item.badge && (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                  isActive
                                    ? 'bg-[#0D5C63] text-white'
                                    : 'bg-[#E6F4F1] text-[#0D5C63]'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                            {item.phase && (
                              <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] flex-shrink-0">
                                Phase {item.phase}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#64748B] truncate mt-0.5 leading-tight">
                            {item.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Drawer>
      <ToastContainer />
    </div>
  );
}

import { ToastProvider } from './context/ToastContext';
import { ConfirmationProvider } from './context/ConfirmationContext';
import { ToastContainer } from './components/ui/ToastContainer';

export default function App() {
  return (
    <ToastProvider>
      <ConfirmationProvider>
        <AuthProvider>
          <ProtectedRoute>
            <AuthenticatedAppShell />
          </ProtectedRoute>
        </AuthProvider>
      </ConfirmationProvider>
    </ToastProvider>
  );
}

