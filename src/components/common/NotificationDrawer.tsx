import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  Package,
  Calendar,
  Clock,
  CheckCheck,
  Trash2,
  ArrowRight,
  Info,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Drawer } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../auth/AuthProvider';
import { notificationService } from '../../services/notificationService';
import { Notification, NotificationType } from '../../types/firestore';
import { formatRelativeTime } from '../../lib/formatting/formatters';
import { EmptyState } from './EmptyState';
import { ListSkeleton } from '../loading/Skeletons';
import { useToast } from '../../context/ToastContext';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToModule?: (moduleId: string) => void;
  onRefreshUnreadCount?: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateToModule,
  onRefreshUnreadCount,
}) => {
  const { organization } = useWorkspace();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'all' | NotificationType>('all');

  useEffect(() => {
    if (!isOpen || !organization?.id || !user?.uid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    let isSubscribed = true;

    // Direct fetch on drawer open to explicitly validate unread state & sync badge
    const fetchAndValidateOnOpen = async () => {
      try {
        const fetchedList = await notificationService.getUserNotifications(organization.id, user.uid);
        if (isSubscribed) {
          setNotifications(fetchedList);
          setIsLoading(false);
          onRefreshUnreadCount?.();
        }
      } catch (err) {
        console.error('Failed to validate notifications on drawer open:', err);
        if (isSubscribed) setIsLoading(false);
      }
    };

    fetchAndValidateOnOpen();

    // Live subscription while drawer remains open
    const unsubscribe = notificationService.subscribeUserNotifications(
      organization.id,
      user.uid,
      (list) => {
        if (isSubscribed) {
          setNotifications(list);
          setIsLoading(false);
          onRefreshUnreadCount?.();
        }
      },
      (err) => {
        console.error('Failed to subscribe notifications stream:', err);
        if (isSubscribed) setIsLoading(false);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [isOpen, organization?.id, user?.uid, onRefreshUnreadCount]);

  const handleMarkAsRead = async (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!organization?.id) return;
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true, readAt: new Date() as any } : n))
      );
      await notificationService.markNotificationAsRead(organization.id, notifId);
      onRefreshUnreadCount?.();
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!organization?.id || !user?.uid) return;
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date() as any })));
      await notificationService.markAllNotificationsAsRead(organization.id, user.uid);
      success('All notifications marked as read');
      onRefreshUnreadCount?.();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      error('Failed to mark all notifications as read');
    }
  };

  const handleDelete = async (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!organization?.id) return;
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      await notificationService.deleteNotification(organization.id, notifId);
      success('Notification deleted');
      onRefreshUnreadCount?.();
    } catch (err) {
      console.error('Failed to delete notification:', err);
      error('Failed to delete notification');
    }
  };

  const handleClearAllRead = async () => {
    if (!organization?.id || !user?.uid) return;
    try {
      setNotifications((prev) => prev.filter((n) => !n.read));
      await notificationService.clearAllReadNotifications(organization.id, user.uid);
      success('Cleared read notifications');
      onRefreshUnreadCount?.();
    } catch (err) {
      console.error('Failed to clear read notifications:', err);
      error('Failed to clear read notifications');
    }
  };

  const filtered =
    activeFilter === 'all'
      ? notifications
      : notifications.filter((n) => n.type === activeFilter);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.filter((n) => n.read).length;

  const getSeverityBadge = (severity: Notification['severity']) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-[#2FA36A] flex-shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-[#38BDF8] flex-shrink-0" />;
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Pharmacy Notifications"
      subtitle="Operational alerts, expiry thresholds, and staff reminders"
      width="lg"
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={CheckCheck}
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              Mark All as Read ({unreadCount})
            </Button>
            {readCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={handleClearAllRead}
                className="text-[#64748B] hover:text-[#EF4444]"
              >
                Clear Read ({readCount})
              </Button>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'All Alerts', count: notifications.length },
            { id: 'inventory', label: 'Inventory', count: notifications.filter((n) => n.type === 'inventory').length },
            { id: 'staff', label: 'Staff', count: notifications.filter((n) => n.type === 'staff').length },
            { id: 'security', label: 'Security', count: notifications.filter((n) => n.type === 'security').length },
            { id: 'compliance', label: 'Compliance', count: notifications.filter((n) => n.type === 'compliance').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-colors cursor-pointer border ${
                activeFilter === tab.id
                  ? 'bg-[#0D5C63] text-white border-[#0D5C63]'
                  : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#CBD5E1]'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Content Body */}
        {isLoading ? (
          <ListSkeleton items={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            type="notifications"
            title={activeFilter === 'all' ? 'All caught up!' : `No ${activeFilter} notifications`}
            description="You have no unread operational alerts or task reminders."
          />
        ) : (
          <div className="divide-y divide-[#F1F5F9] space-y-2">
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  !item.read ? 'bg-[#F8FAFC] border-[#CBD5E1] shadow-2xs' : 'bg-white border-[#E2E8F0]'
                } hover:border-[#0D5C63] cursor-pointer group relative`}
                onClick={async () => {
                  if (!item.read && organization?.id) {
                    setNotifications((prev) =>
                      prev.map((n) => (n.id === item.id ? { ...n, read: true, readAt: new Date() as any } : n))
                    );
                    await notificationService.markNotificationAsRead(organization.id, item.id);
                    onRefreshUnreadCount?.();
                  }
                  if (item.targetModule) {
                    onNavigateToModule?.(item.targetModule);
                    onClose();
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(item.severity)}
                    <h5 className="text-xs font-bold text-[#0B1F33] group-hover:text-[#0D5C63] transition-colors">
                      {item.title}
                    </h5>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] text-[#64748B] whitespace-nowrap">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                    {!item.read && (
                      <button
                        title="Mark as read"
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        className="p-1 text-[#0D5C63] hover:bg-[#E6F4F1] rounded transition-colors cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      title="Delete notification"
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1 text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded transition-colors cursor-pointer sm:opacity-0 sm:group-hover:opacity-100 opacity-90"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed pl-6">{item.message}</p>

                <div className="flex items-center justify-between mt-3 pl-6 pt-2 border-t border-[#F1F5F9]">
                  {item.targetModule ? (
                    <span className="text-[11px] font-semibold text-[#0D5C63] group-hover:underline inline-flex items-center gap-1">
                      View in {item.targetModule} <ArrowRight className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">
                      {item.type}
                    </span>
                  )}
                  <span className="text-[10px] text-[#94A3B8] capitalize font-medium">
                    {item.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
};
