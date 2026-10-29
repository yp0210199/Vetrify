import React, { useState } from 'react';
import { StaffManagementView } from './StaffManagementView';
import { BranchesManagementTab } from '../../components/settings/BranchesManagementTab';
import { OrganizationSettingsTab } from '../../components/settings/OrganizationSettingsTab';
import { SecurityComplianceTab } from '../../components/settings/SecurityComplianceTab';
import { AuditLogViewerTab } from '../../components/settings/AuditLogViewerTab';
import { PageHeader } from '../../components/common/PageHeader';
import { KpiCard } from '../../components/ui/KpiCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  Store,
  Building2,
  Shield,
  ShieldCheck,
  RefreshCw,
  Sliders,
  CheckCircle2,
  FileText,
  Lock,
} from 'lucide-react';

type SettingsTab = 'staff' | 'branches' | 'organization' | 'security' | 'audit';

interface TabConfig {
  id: SettingsTab;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}

export const SettingsView: React.FC = () => {
  const { organization, stores, allStores, currentStore, currentStaff, resolvedRole, refreshWorkspace } = useWorkspace();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('staff');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshWorkspace();
      success('Platform configuration and role permissions refreshed.', 'Settings Synchronized');
    } catch (err: any) {
      error(err?.message || 'Failed to refresh platform configuration.', 'Sync Failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const totalBranchesCount = allStores.length || stores.length || 1;
  const activeStaffRole = currentStaff?.roleId ? currentStaff.roleId.toUpperCase() : 'ADMIN';
  const permissionsCount = resolvedRole?.permissions?.length || 24;

  const tabList: TabConfig[] = [
    {
      id: 'staff',
      label: 'Staff & Roles',
      subtitle: 'Employee provisioning, RBAC roles, and invite links',
      icon: Users,
    },
    {
      id: 'branches',
      label: 'Showrooms & Branches',
      subtitle: 'Showrooms, godown yards, stock depots, and billing points',
      icon: Store,
      badgeCount: totalBranchesCount,
    },
    {
      id: 'organization',
      label: 'Organization Profile',
      subtitle: 'Legal entity details, GSTIN, and statutory operational rules',
      icon: Building2,
    },
    {
      id: 'security',
      label: 'Security & Alerts',
      subtitle: 'Multi-channel notifications, session guards, and credentials',
      icon: Shield,
    },
    {
      id: 'audit',
      label: 'Audit Ledger',
      subtitle: 'Immutable statutory compliance logs and event tracking',
      icon: ShieldCheck,
    },
  ];

  const currentTabMeta = tabList.find((t) => t.id === activeTab) || tabList[0];
  const CurrentIcon = currentTabMeta.icon;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Platform Settings & Configuration"
        subtitle="Manage your showroom workspaces, godown branches, role-based staff access, and GST billing configurations"
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0066FF] text-xs font-bold border border-blue-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            Enterprise Control
          </span>
        }
        primaryAction={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync Config
          </Button>
        }
      />

      {/* KPI Overview Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Business Entity"
          value={organization?.name || 'Vetrify Enterprise'}
          subtitle={
            organization?.gstin
              ? `GST: ${organization.gstin}`
              : 'Enterprise Multi-Tenant'
          }
          icon={<Building2 className="w-5 h-5 text-[#0D5C63]" />}
        />
        <KpiCard
          title="Dispensary Branches"
          value={`${totalBranchesCount} Active`}
          subtitle={`Current: ${currentStore?.name || 'Main Branch'}`}
          icon={<Store className="w-5 h-5 text-indigo-600" />}
        />
        <KpiCard
          title="Active Operator Role"
          value={activeStaffRole}
          subtitle={`${permissionsCount} Assigned Privileges`}
          icon={<Shield className="w-5 h-5 text-emerald-600" />}
        />
        <KpiCard
          title="Statutory Compliance"
          value={organization?.settings?.fefoStrictEnforcement ? 'FIFO/Lot Strict' : 'Standard'}
          subtitle={
            organization?.gstin
              ? `GSTIN: ${organization.gstin}`
              : 'GST Compliant'
          }
          icon={<ShieldCheck className="w-5 h-5 text-amber-600" />}
        />
      </div>

      {/* Tab Navigation & Content Container */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {/* Modern Segmented Navigation Tabs */}
        <div className="p-2 sm:p-3 bg-[#F8FAFC] border-b border-[#E2E8F0] overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 min-w-max">
            {tabList.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all select-none cursor-pointer ${
                    isActive
                      ? 'bg-[#0D5C63] text-white shadow-xs font-bold'
                      : 'text-[#475569] hover:text-[#0B1F33] hover:bg-[#E2E8F0]/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
                  <span>{tab.label}</span>
                  {tab.badgeCount !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-[#E2E8F0] text-[#475569]'
                      }`}
                    >
                      {tab.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-6 sm:p-8 min-h-[540px]">
          {activeTab === 'staff' && <StaffManagementView />}
          {activeTab === 'branches' && <BranchesManagementTab />}
          {activeTab === 'organization' && <OrganizationSettingsTab />}
          {activeTab === 'security' && <SecurityComplianceTab />}
          {activeTab === 'audit' && <AuditLogViewerTab />}
        </div>
      </div>
    </div>
  );
};


