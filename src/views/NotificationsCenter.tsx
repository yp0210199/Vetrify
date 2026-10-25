import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  CheckCheck,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { Notification } from '../types/firestore';
import { notificationService } from '../services/notificationService';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../context/ToastContext';
import { formatDateTime } from '../lib/formatting/formatters';

interface NotificationsCenterProps {
  onNavigateToModule?: (moduleId: string) => void;
}

export const NotificationsCenter: React.FC<NotificationsCenterProps> = ({ onNavigateToModule }) => {
  const { organization } = useWorkspace();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'critical'>('all');

  const fetchNotifications = async () => {
    if (!organization || !user) return;
    try {
      setIsLoading(true);
      const list = await notificationService.getUserNotifications(organization.id, user.uid, 50);
      setNotifications(list);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      error(err?.message || 'Failed to load notifications.', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (organization && user) {
      fetchNotifications();
      const unsubscribe = notificationService.subscribeUserNotifications(
        organization.id,
        user.uid,
        (list) => setNotifications(list),
        (err) => console.error(err),
        50
      );
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [organization?.id, user?.uid]);

  const handleMarkAsRead = async (notifId: string) => {
    if (!organization) return;
    try {
      await notificationService.markNotificationAsRead(organization.id, notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
      );
    } catch (err: any) {
      error(err?.message || 'Failed to update notification status.', 'Error');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!organization || !user) return;
    try {
      await notificationService.markAllNotificationsAsRead(organization.id, user.uid);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      success('All notifications marked as read.', 'Success');
    } catch (err: any) {
      error(err?.message || 'Failed to mark all as read.', 'Error');
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterTab === 'unread') return !n.read;
    if (filterTab === 'critical') return n.severity === 'error' || n.severity === 'warning';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-sky-500 flex-shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications Center"
        subtitle="Real-time alerts, inventory warnings, purchase approvals, and system audit logs"
        badge={unreadCount > 0 ? `${unreadCount} Unread` : undefined}
        badgeVariant="warning"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={fetchNotifications}
            >
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="primary"
                size="sm"
                icon={CheckCheck}
                onClick={handleMarkAllAsRead}
              >
                Mark All as Read
              </Button>
            )}
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterTab === 'all'
              ? 'bg-[#0D5C63] text-white shadow-sm'
              : 'bg-white border border-[#CBD5E1] text-[#64748B] hover:bg-[#F8FAFC]'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilterTab('unread')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterTab === 'unread'
              ? 'bg-[#0D5C63] text-white shadow-sm'
              : 'bg-white border border-[#CBD5E1] text-[#64748B] hover:bg-[#F8FAFC]'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilterTab('critical')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterTab === 'critical'
              ? 'bg-[#0D5C63] text-white shadow-sm'
              : 'bg-white border border-[#CBD5E1] text-[#64748B] hover:bg-[#F8FAFC]'
          }`}
        >
          Critical / Warnings
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} columns={3} />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={Bell}
              title="No Notifications Found"
              description="You have no notifications matching the selected filter criteria."
            />
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {filteredNotifications.map((notif) => {
              const timeString = formatDateTime(notif.createdAt) || 'Just now';

              return (
                <div
                  key={notif.id}
                  className={`p-4 sm:p-5 flex items-start gap-4 transition-colors ${
                    !notif.read ? 'bg-[#F0FDF4]/50 font-medium' : 'bg-white hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="mt-0.5">{getSeverityIcon(notif.severity)}</div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#0B1F33]">{notif.title}</h4>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-[#64748B]">{timeString}</span>
                    </div>

                    <p className="text-xs text-[#475569] leading-relaxed">{notif.message}</p>

                    <div className="flex items-center gap-3 pt-2">
                      {notif.targetModule && onNavigateToModule && (
                        <button
                          onClick={() => onNavigateToModule(notif.targetModule!)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D5C63] hover:underline cursor-pointer"
                        >
                          <span>View {notif.targetModule.toUpperCase()}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {!notif.read && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="text-xs font-semibold text-[#64748B] hover:text-[#0B1F33] cursor-pointer"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
