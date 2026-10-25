import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { Warehouse, WarehouseStock } from '../types/warehouse';
import { logAuditEvent } from './auditService';
import { handleFirestoreError, OperationType } from '../lib/firebase/error';

export function getWarehousesRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'warehouses');
}

export function getWarehouseDocRef(organizationId: string, warehouseId: string) {
  return doc(db, 'organizations', organizationId, 'warehouses', warehouseId);
}

function sanitizePayload<T extends Record<string, any>>(obj: T): T {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }
  return sanitized as T;
}

export const warehouseService = {
  async createWarehouse(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: Omit<Warehouse, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'createdByUid' | 'updatedByUid'>
  ): Promise<Warehouse> {
    const warehouseId = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newDocRef = getWarehouseDocRef(organizationId, warehouseId);

    const createPayload: Warehouse = sanitizePayload({
      ...payload,
      id: warehouseId,
      organizationId,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      createdByUid: caller.uid,
      updatedByUid: caller.uid,
    });

    try {
      await setDoc(newDocRef, createPayload);

      await logAuditEvent(organizationId, {
        actorUid: caller.uid,
        actorEmail: caller.email || null,
        actorDisplayName: caller.displayName || null,
        action: 'warehouse.created',
        entityType: 'warehouse',
        entityId: warehouseId,
        metadata: { warehouseName: payload.name },
      });

      return createPayload;
    } catch (error) {
      return handleFirestoreError(error, OperationType.CREATE, `organizations/${organizationId}/warehouses/${warehouseId}`);
    }
  },

  async getWarehouses(organizationId: string): Promise<Warehouse[]> {
    const ref = getWarehousesRef(organizationId);
    try {
      const q = query(ref);
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Warehouse));
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, `organizations/${organizationId}/warehouses`);
    }
  },

  async getWarehouse(organizationId: string, warehouseId: string): Promise<Warehouse | null> {
    const docRef = getWarehouseDocRef(organizationId, warehouseId);
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as Warehouse;
    } catch (error) {
      return handleFirestoreError(error, OperationType.GET, `organizations/${organizationId}/warehouses/${warehouseId}`);
    }
  },

  async updateWarehouse(
    organizationId: string,
    warehouseId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    updates: Partial<Omit<Warehouse, 'id' | 'organizationId' | 'createdAt' | 'createdByUid'>>
  ): Promise<void> {
    const docRef = getWarehouseDocRef(organizationId, warehouseId);
    try {
      await updateDoc(docRef, sanitizePayload({
        ...updates,
        updatedByUid: caller.uid,
        updatedAt: serverTimestamp(),
      }));

      await logAuditEvent(organizationId, {
        actorUid: caller.uid,
        actorEmail: caller.email || null,
        actorDisplayName: caller.displayName || null,
        action: 'warehouse.updated',
        entityType: 'warehouse',
        entityId: warehouseId,
        metadata: { updatedFields: Object.keys(updates) },
      });
    } catch (error) {
      return handleFirestoreError(error, OperationType.UPDATE, `organizations/${organizationId}/warehouses/${warehouseId}`);
    }
  },
};
