import React, { useState, useEffect } from 'react';
import {
  Shield,
  Bell,
  Key,
  CheckCircle2,
  AlertCircle,
  Mail,
  Smartphone,
  MessageSquare,
  Save,
  Lock,
  UserCheck,
  Building,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../context/ToastContext';
import { notificationPreferenceService } from '../../services/notificationPreferenceService';
import { UserNotificationPreferences, NotificationType } from '../../types/firestore';

export const SecurityComplianceTab: React.FC = () => {
  const { organization, currentStaff, resolvedRole, stores } = useWorkspace();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [preferences, setPreferences] = useState<UserNotificationPreferences['categories']>({
    security: { inApp: true, email: true, sms: true, whatsapp: false },
    staff: { inApp: true, email: true, sms: false, whatsapp: false },
    inventory: { inApp: true, email: true, sms: false, whatsapp: false },
    purchases: { inApp: true, email: false, sms: false, whatsapp: false },
    pos: { inApp: true, email: false, sms: false, whatsapp: false },
    compliance: { inApp: true, email: true, sms: false, whatsapp: false },
    system: { inApp: true, email: false, sms: false, whatsapp: false },
    announcements: { inApp: true, email: false, sms: false, whatsapp: false },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.uid || !organization?.id) return;
      setIsLoading(true);
      try {
        const pref = await notificationPreferenceService.getUserPreferences(user.uid, organization.id);
        if (pref.categories) {
          setPreferences(pref.categories);
        }
      } catch (err) {
        console.error('Failed to load user preferences:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadPreferences();
  }, [user?.uid, organization?.id]);

  const handleChannelToggle = (
    category: NotificationType,
    channel: 'inApp' | 'email' | 'sms' | 'whatsapp'
  ) => {
    setPreferences((prev) => {
      const currentCat = prev[category] || { inApp: true, email: false, sms: false, whatsapp: false };
      return {
        ...prev,
        [category]: {
          ...currentCat,
          [channel]: !currentCat[channel],
        },
      };
    });
  };

  const handleSavePreferences = async () => {
    if (!user?.uid || !organization?.id) return;
    setIsSaving(true);
    try {
      await notificationPreferenceService.updateUserPreferences(user.uid, organization.id, preferences);
      success('Notification delivery channels updated successfully');
    } catch (err: any) {
      console.error('Failed to save preferences:', err);
      error(err?.message || 'Failed to save delivery preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const categoryLabels: Record<NotificationType, { title: string; desc: string }> = {
    inventory: {
      title: 'Inventory & Low Stock Alerts',
      desc: 'Notifications when batch stock levels reach minimum reorder limits or expire.',
    },
    purchases: {
      title: 'Procurement & GRN Receipts',
      desc: 'Goods received notes, purchase orders, and supplier delivery confirmations.',
    },
    staff: {
      title: 'Staff, RBAC & Role Management',
      desc: 'Staff invitations, role promotions, suspensions, and access modifications.',
    },
    compliance: {
      title: 'Statutory Compliance & Schedule H',
      desc: 'Schedule H/H1/X compliance register events and drug inspection audit logs.',
    },
    pos: {
      title: 'POS Billing & Retail Shifts',
      desc: 'Daily shift reconciliations, return authorizations, and high-value sales.',
    },
    security: {
      title: 'Security & Session Integrity',
      desc: 'Password changes, abnormal logins, terminal sessions, and token alerts.',
    },
    system: {
      title: 'System & Maintenance Updates',
      desc: 'Platform announcements, schema upgrades, and scheduled maintenance notices.',
    },
    announcements: {
      title: 'Broadcasts & Announcements',
      desc: 'Organization-wide broadcast notices from management and central office.',
    },
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <h2 className="text-lg font-bold text-[#0B1F33] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#0D5C63]" />
            Security, Session & Notification Delivery
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configure multi-channel alerts and review active cryptographic session permissions.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSavePreferences}
          isLoading={isSaving}
          icon={isSaving ? undefined : Save}
        >
          Save Preferences
        </Button>
      </div>

      {/* Staff Identity & Cryptographic Security Info */}
      <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-[#E2E8F0] space-y-4">
        <h3 className="text-sm font-bold text-[#0B1F33] flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#0D5C63]" /> Active Authenticated Identity & Permissions
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] space-y-1">
            <span className="text-[11px] text-[#64748B] font-semibold">User Principal</span>
            <div className="text-xs font-bold text-[#0B1F33] truncate">
              {user?.displayName || currentStaff?.displayName || 'Active Staff'}
            </div>
            <div className="text-[11px] text-[#64748B] font-mono truncate">{user?.email}</div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] space-y-1">
            <span className="text-[11px] text-[#64748B] font-semibold">Assigned System Role</span>
            <div className="text-xs font-bold text-[#0D5C63] uppercase">
              {currentStaff?.roleId || 'Staff'} (Rank {resolvedRole?.roleRank || 1})
            </div>
            <div className="text-[11px] text-[#15803D] font-semibold">
              {resolvedRole?.roleId === 'owner' ? 'Apex Organization Authority' : 'Role-Scoped Authorization'}
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] space-y-1">
            <span className="text-[11px] text-[#64748B] font-semibold">Store Access Scope</span>
            <div className="text-xs font-bold text-[#0B1F33]">
              {currentStaff?.allStoresAccess
                ? 'All Branches (Unrestricted)'
                : `${currentStaff?.storeIds?.length || 0} Assigned Branches`}
            </div>
            <div className="text-[11px] text-[#64748B]">
              {stores.length} total branches registered
            </div>
          </div>
        </div>
      </div>

      {/* Notification Delivery Channels Matrix */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0B1F33] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0D5C63]" /> Multi-Channel Alert Preferences
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Select which channels receive alerts for each operational category.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSavePreferences}
            disabled={isSaving || isLoading}
            icon={isSaving ? undefined : Save}
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>

        {/* Matrix Table */}
        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                <tr>
                  <th className="p-3.5 w-1/2">Event Category</th>
                  <th className="p-3.5 text-center">In-App Banner</th>
                  <th className="p-3.5 text-center">Email</th>
                  <th className="p-3.5 text-center">SMS Alert</th>
                  <th className="p-3.5 text-center">WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {(Object.keys(categoryLabels) as NotificationType[]).map((catKey) => {
                  const cat = categoryLabels[catKey];
                  const currentChannel = preferences[catKey] || {
                    inApp: true,
                    email: false,
                    sms: false,
                    whatsapp: false,
                  };

                  return (
                    <tr key={catKey} className="hover:bg-[#F8FAFC]/60 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-[#0B1F33]">{cat.title}</div>
                        <div className="text-[11px] text-[#64748B] mt-0.5">{cat.desc}</div>
                      </td>

                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={currentChannel.inApp}
                          onChange={() => handleChannelToggle(catKey, 'inApp')}
                          className="w-4 h-4 rounded border-[#CBD5E1] text-[#0D5C63] focus:ring-[#0D5C63]"
                        />
                      </td>

                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={currentChannel.email}
                          onChange={() => handleChannelToggle(catKey, 'email')}
                          className="w-4 h-4 rounded border-[#CBD5E1] text-[#0D5C63] focus:ring-[#0D5C63]"
                        />
                      </td>

                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={currentChannel.sms}
                          onChange={() => handleChannelToggle(catKey, 'sms')}
                          className="w-4 h-4 rounded border-[#CBD5E1] text-[#0D5C63] focus:ring-[#0D5C63]"
                        />
                      </td>

                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={currentChannel.whatsapp}
                          onChange={() => handleChannelToggle(catKey, 'whatsapp')}
                          className="w-4 h-4 rounded border-[#CBD5E1] text-[#0D5C63] focus:ring-[#0D5C63]"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
