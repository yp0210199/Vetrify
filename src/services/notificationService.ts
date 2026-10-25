import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { getFirestoreDb } from '../lib/firebase/config';
import {
  Notification,
  NotificationCreatePayload,
  NotificationUpdatePayload,
} from '../types/firestore';
import { validateNotification } from '../lib/firebase/validators';
import { parseFirestoreTimestamp } from '../lib/formatting/formatters';

export const notificationService = {
  /**
   * Get collection reference for organization notifications
   */
  getNotificationsRef(orgId: string) {
    const db = getFirestoreDb();
    return collection(db, 'organizations', orgId, 'notifications');
  },

  /**
   * Create a single tenant-scoped notification
   */
  async createNotification(
    orgId: string,
    payload: Omit<NotificationCreatePayload, 'id' | 'organizationId' | 'createdAt' | 'read' | 'readAt'> & { id?: string }
  ): Promise<Notification> {
    const db = getFirestoreDb();
    const notifRef = doc(collection(db, 'organizations', orgId, 'notifications'));

    const notifData: NotificationCreatePayload = {
      ...payload,
      id: notifRef.id,
      organizationId: orgId,
      read: false,
      createdAt: serverTimestamp(),
      readAt: null,
    };

    await setDoc(notifRef, notifData);

    const createdSnap = await getDoc(notifRef);
    return {
      id: notifRef.id,
      ...createdSnap.data(),
    } as Notification;
  },

  /**
   * Create a batch of notifications (e.g. broadcast to multiple staff)
   */
  async createNotificationsBatch(
    orgId: string,
    payloads: Array<Omit<NotificationCreatePayload, 'organizationId' | 'createdAt' | 'read' | 'readAt'>>
  ): Promise<void> {
    const db = getFirestoreDb();
    const batch = writeBatch(db);

    for (const p of payloads) {
      const notifRef = doc(collection(db, 'organizations', orgId, 'notifications'));
      const notifData: NotificationCreatePayload = {
        ...p,
        id: notifRef.id,
        organizationId: orgId,
        read: false,
        createdAt: serverTimestamp(),
        readAt: null,
      };
      batch.set(notifRef, notifData);
    }

    await batch.commit();
  },

  /**
   * Fetch recent notifications for a specific user within an organization
   */
  async getUserNotifications(
    orgId: string,
    uid: string,
    limitCount: number = 30
  ): Promise<Notification[]> {
    const notifsRef = this.getNotificationsRef(orgId);
    const q = query(
      notifsRef,
      where('recipientUid', 'in', [uid, 'all']),
      limit(limitCount * 2)
    );

    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Record<string, any>),
    })) as Notification[];

    return list
      .sort((a, b) => {
        const timeA = parseFirestoreTimestamp(a.createdAt)?.getTime() || 0;
        const timeB = parseFirestoreTimestamp(b.createdAt)?.getTime() || 0;
        return timeB - timeA;
      })
      .slice(0, limitCount);
  },

  /**
   * Subscribe to real-time notification stream for a specific user
   */
  subscribeUserNotifications(
    orgId: string,
    uid: string,
    onNext: (notifications: Notification[]) => void,
    onError?: (error: Error) => void,
    limitCount: number = 30
  ): () => void {
    const notifsRef = this.getNotificationsRef(orgId);
    const q = query(
      notifsRef,
      where('recipientUid', 'in', [uid, 'all']),
      limit(limitCount * 2)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Record<string, any>),
        })) as Notification[];
        const sorted = list
          .sort((a, b) => {
            const timeA = parseFirestoreTimestamp(a.createdAt)?.getTime() || 0;
            const timeB = parseFirestoreTimestamp(b.createdAt)?.getTime() || 0;
            return timeB - timeA;
          })
          .slice(0, limitCount);
        onNext(sorted);
      },
      (err) => {
        console.error(`Error subscribing to notifications for org ${orgId}:`, err);
        if (onError) onError(err);
      }
    );
  },

  /**
   * Mark a single notification as read
   */
  async markNotificationAsRead(orgId: string, notificationId: string): Promise<void> {
    const db = getFirestoreDb();
    const notifRef = doc(db, 'organizations', orgId, 'notifications', notificationId);
    await updateDoc(notifRef, {
      read: true,
      readAt: serverTimestamp(),
    });
  },

  /**
   * Mark all unread notifications as read for a user
   */
  async markAllNotificationsAsRead(orgId: string, uid: string): Promise<void> {
    const db = getFirestoreDb();
    const notifsRef = this.getNotificationsRef(orgId);
    const q = query(
      notifsRef,
      where('recipientUid', 'in', [uid, 'all'])
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    let count = 0;
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as Notification;
      if (!data.read) {
        batch.update(docSnap.ref, {
          read: true,
          readAt: serverTimestamp(),
        });
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
  },

  /**
   * Delete a notification document
   */
  async deleteNotification(orgId: string, notificationId: string): Promise<void> {
    const db = getFirestoreDb();
    const notifRef = doc(db, 'organizations', orgId, 'notifications', notificationId);
    await deleteDoc(notifRef);
  },

  /**
   * Delete all read notifications for a user
   */
  async clearAllReadNotifications(orgId: string, uid: string): Promise<void> {
    const db = getFirestoreDb();
    const notifsRef = this.getNotificationsRef(orgId);
    const q = query(
      notifsRef,
      where('recipientUid', 'in', [uid, 'all'])
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    let count = 0;
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as Notification;
      if (data.read) {
        batch.delete(docSnap.ref);
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
  },

  /**
   * Get total unread count for user in an organization
   */
  async getUnreadNotificationCount(orgId: string, uid: string): Promise<number> {
    const notifsRef = this.getNotificationsRef(orgId);
    const q = query(
      notifsRef,
      where('recipientUid', 'in', [uid, 'all'])
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((docSnap) => docSnap.data() as Notification);
    return list.filter((n) => !n.read).length;
  },

  /**
   * Alias for createNotification for system alerts
   */
  async sendSystemNotification(
    orgId: string,
    params: {
      recipientUid: string;
      title: string;
      message: string;
      severity: 'info' | 'warning' | 'error' | 'success';
      type?: string;
      targetModule?: string;
    }
  ): Promise<Notification> {
    return this.createNotification(orgId, {
      recipientUid: params.recipientUid,
      title: params.title,
      message: params.message,
      severity: params.severity,
      type: params.type || 'system',
      targetModule: params.targetModule,
    });
  },
};
