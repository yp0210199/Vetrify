import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirestoreDb } from '../lib/firebase/config';
import { PharmacyStore } from '../types/firestore';
import { validatePharmacyStore } from '../lib/firebase/validators';

export const storeService = {
  /**
   * Fetch a single store by ID
   */
  async getStore(orgId: string, storeId: string): Promise<PharmacyStore | null> {
    if (!orgId || !storeId) return null;
    const db = getFirestoreDb();
    const storeDocRef = doc(db, 'organizations', orgId, 'stores', storeId);
    const snapshot = await getDoc(storeDocRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    const store: PharmacyStore = {
      id: snapshot.id,
      organizationId: orgId,
      name: data.name,
      code: data.code,
      address: data.address,
      phone: data.phone,
      email: data.email,
      gstin: data.gstin,
      isMainBranch: data.isMainBranch ?? false,
      status: data.status || 'active',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
    if (!validatePharmacyStore(store, orgId)) {
      console.warn(`Store validation failed for ID: ${storeId}`);
    }
    return store;
  },

  /**
   * Fetch all stores for an organization
   */
  async getStores(orgId: string): Promise<PharmacyStore[]> {
    if (!orgId) return [];
    const db = getFirestoreDb();
    const collRef = collection(db, 'organizations', orgId, 'stores');
    const snapshot = await getDocs(collRef);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        organizationId: orgId,
        name: data.name,
        code: data.code,
        address: data.address,
        phone: data.phone,
        email: data.email,
        gstin: data.gstin,
        isMainBranch: data.isMainBranch ?? false,
        status: data.status || 'active',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });
  },

  /**
   * Create a new store branch under an organization
   */
  async createStore(
    orgId: string,
    params: {
      name: string;
      code: string;
      address?: {
        street?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country: string;
      };
      phone?: string;
      email?: string;
      gstin?: string;
      isMainBranch?: boolean;
    },
    actor?: { uid: string; email?: string | null; displayName?: string | null }
  ): Promise<PharmacyStore> {
    const db = getFirestoreDb();
    const storeId = `str_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const storeDocRef = doc(db, 'organizations', orgId, 'stores', storeId);

    const storeData = {
      id: storeId,
      organizationId: orgId,
      name: params.name.trim(),
      code: params.code.trim().toUpperCase(),
      address: params.address,
      phone: params.phone?.trim(),
      email: params.email?.trim(),
      gstin: params.gstin?.trim(),
      isMainBranch: params.isMainBranch ?? false,
      status: 'active' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!validatePharmacyStore(storeData as any, orgId)) {
      throw new Error('Invalid pharmacy store payload parameters');
    }

    // If marked as main branch, demote any previous main branches
    if (params.isMainBranch) {
      const existingStores = await storeService.getStores(orgId);
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      for (const s of existingStores) {
        if (s.isMainBranch) {
          batch.update(doc(db, 'organizations', orgId, 'stores', s.id), {
            isMainBranch: false,
            updatedAt: serverTimestamp(),
          });
        }
      }
      batch.set(storeDocRef, storeData);
      await batch.commit();
    } else {
      await setDoc(storeDocRef, storeData);
    }

    // Audit event logging
    if (actor) {
      const { logAuditEvent } = await import('./auditService');
      await logAuditEvent(orgId, {
        storeId,
        actorUid: actor.uid,
        actorEmail: actor.email || null,
        actorDisplayName: actor.displayName || null,
        action: 'store.created',
        entityType: 'store',
        entityId: storeId,
        metadata: {
          storeName: storeData.name,
          storeCode: storeData.code,
          isMainBranch: storeData.isMainBranch,
        },
      });
    }

    return { ...storeData, createdAt: undefined, updatedAt: undefined } as any;
  },

  /**
   * Update store branch details
   */
  async updateStore(
    orgId: string,
    storeId: string,
    params: Partial<Omit<PharmacyStore, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>>,
    actor?: { uid: string; email?: string | null; displayName?: string | null }
  ): Promise<void> {
    const db = getFirestoreDb();
    const storeDocRef = doc(db, 'organizations', orgId, 'stores', storeId);

    // If marked as main branch, demote other branches
    if (params.isMainBranch) {
      const existingStores = await storeService.getStores(orgId);
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      for (const s of existingStores) {
        if (s.id !== storeId && s.isMainBranch) {
          batch.update(doc(db, 'organizations', orgId, 'stores', s.id), {
            isMainBranch: false,
            updatedAt: serverTimestamp(),
          });
        }
      }
      batch.update(storeDocRef, {
        ...params,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } else {
      await updateDoc(storeDocRef, {
        ...params,
        updatedAt: serverTimestamp(),
      });
    }

    // Audit event logging
    if (actor) {
      const { logAuditEvent } = await import('./auditService');
      await logAuditEvent(orgId, {
        storeId,
        actorUid: actor.uid,
        actorEmail: actor.email || null,
        actorDisplayName: actor.displayName || null,
        action: 'store.updated',
        entityType: 'store',
        entityId: storeId,
        metadata: {
          updatedFields: Object.keys(params),
        },
      });
    }
  },

  /**
   * Set a specific branch as the organization main branch
   */
  async setMainBranch(
    orgId: string,
    storeId: string,
    actor?: { uid: string; email?: string | null; displayName?: string | null }
  ): Promise<void> {
    await storeService.updateStore(orgId, storeId, { isMainBranch: true }, actor);
  },

  /**
   * Toggle store branch status (active / inactive)
   */
  async toggleStoreStatus(
    orgId: string,
    storeId: string,
    currentStatus: 'active' | 'inactive',
    actor?: { uid: string; email?: string | null; displayName?: string | null }
  ): Promise<void> {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await storeService.updateStore(orgId, storeId, { status: newStatus }, actor);
  },
};
