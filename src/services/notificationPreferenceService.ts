import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirestoreDb } from '../lib/firebase/config';
import { handleFirestoreError, OperationType } from '../lib/firebase/error';
import { UserNotificationPreferences } from '../types/firestore';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../lib/constants';

export const notificationPreferenceService = {
  /**
   * Get user notification delivery preferences for a given organization
   */
  async getUserPreferences(uid: string, orgId: string): Promise<UserNotificationPreferences> {
    if (!uid || !orgId) {
      return {
        uid: uid || '',
        organizationId: orgId || '',
        categories: DEFAULT_NOTIFICATION_PREFERENCES as any,
        updatedAt: null as any,
      };
    }

    const db = getFirestoreDb();
    const prefPath = `users/${uid}/notificationPreferences/${orgId}`;
    const prefRef = doc(db, 'users', uid, 'notificationPreferences', orgId);

    try {
      const snap = await getDoc(prefRef);
      if (snap.exists()) {
        const data = snap.data() as UserNotificationPreferences;
        return {
          ...data,
          categories: {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ...(data.categories || {}),
          } as any,
        };
      }

      // Default fallback preferences if not explicitly set yet
      return {
        uid,
        organizationId: orgId,
        categories: DEFAULT_NOTIFICATION_PREFERENCES as any,
        updatedAt: null as any,
      };
    } catch (error) {
      console.warn(`[notificationPreferenceService] Could not fetch preferences for ${prefPath}:`, error);
      // Return safe defaults so UI doesn't crash, but throw if it's not a permission fallback
      return {
        uid,
        organizationId: orgId,
        categories: DEFAULT_NOTIFICATION_PREFERENCES as any,
        updatedAt: null as any,
      };
    }
  },

  /**
   * Save user notification delivery preferences
   */
  async updateUserPreferences(
    uid: string,
    orgId: string,
    categories: UserNotificationPreferences['categories']
  ): Promise<void> {
    if (!uid || !orgId) return;

    const db = getFirestoreDb();
    const prefPath = `users/${uid}/notificationPreferences/${orgId}`;
    const prefRef = doc(db, 'users', uid, 'notificationPreferences', orgId);

    try {
      await setDoc(
        prefRef,
        {
          uid,
          organizationId: orgId,
          categories,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, prefPath);
    }
  },
};
