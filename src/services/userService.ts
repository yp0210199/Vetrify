import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { getFirestoreDb } from '../lib/firebase/config';
import { FirestoreUser } from '../types/firestore';
import { validateFirestoreUser } from '../lib/firebase/validators';

/**
 * Normalizes a Firestore User document snapshot into a FirestoreUser
 */
function fromFirestoreDoc(snapshot: DocumentSnapshot): FirestoreUser | null {
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  const user: FirestoreUser = {
    uid: snapshot.id,
    email: data.email ?? null,
    displayName: data.displayName ?? null,
    photoURL: data.photoURL ?? null,
    phoneNumber: data.phoneNumber ?? null,
    primaryOrganizationId: data.primaryOrganizationId ?? null,
    status: data.status || 'active',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    lastLoginAt: data.lastLoginAt ?? null,
  };

  if (!validateFirestoreUser(user)) {
    console.warn(`User document validation failed for UID: ${snapshot.id}`);
  }
  return user;
}

export const userService = {
  /**
   * Fetch user profile from /users/{uid}
   */
  async getUserProfile(uid: string): Promise<FirestoreUser | null> {
    if (!uid) return null;
    const db = getFirestoreDb();
    const userDocRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userDocRef);
    return fromFirestoreDoc(snapshot);
  },

  /**
   * Create or initialize a user profile at /users/{uid}
   * Zero authorization authority. primaryOrganizationId is purely a UI workspace preference.
   */
  async createUserProfile(
    uid: string,
    data: {
      email?: string | null;
      displayName?: string | null;
      photoURL?: string | null;
      primaryOrganizationId?: string | null;
    }
  ): Promise<FirestoreUser> {
    const db = getFirestoreDb();
    const userDocRef = doc(db, 'users', uid);

    const profileData: any = {
      uid,
      email: data.email ?? null,
      displayName: data.displayName ?? null,
      photoURL: data.photoURL ?? null,
      status: 'active',
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };

    if (data.primaryOrganizationId !== undefined) {
      profileData.primaryOrganizationId = data.primaryOrganizationId;
    }

    try {
      await setDoc(userDocRef, profileData, { merge: true });
      const snapshot = await getDoc(userDocRef);
      const profile = fromFirestoreDoc(snapshot);
      if (profile) return profile;
    } catch (e) {
      console.warn('Profile initialization note:', e);
    }

    return {
      uid,
      email: data.email ?? null,
      displayName: data.displayName ?? null,
      photoURL: data.photoURL ?? null,
      primaryOrganizationId: data.primaryOrganizationId ?? null,
      status: 'active',
    };
  },

  /**
   * Update user profile editable fields
   */
  async updateUserProfile(
    uid: string,
    data: {
      displayName?: string | null;
      photoURL?: string | null;
      phoneNumber?: string | null;
      primaryOrganizationId?: string | null;
    }
  ): Promise<void> {
    const db = getFirestoreDb();
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },
};
