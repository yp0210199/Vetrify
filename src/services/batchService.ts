import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { PharmacyBatch, BatchStatus } from '../types/batch';
import { validatePharmacyBatch } from '../lib/firebase/validators';
import { logAuditEvent } from './auditService';
import { isBatchExpired } from '../utils/batchUtils';

/**
 * Collection Reference for Batches
 */
export function getBatchesRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'batches');
}

/**
 * Document Reference for a Batch
 */
export function getBatchDocRef(organizationId: string, batchId: string) {
  return doc(db, 'organizations', organizationId, 'batches', batchId);
}

/**
 * Normalize batch number for matching and safety (trim + upper case)
 */
export function normalizeBatchNumber(batchNumber: string): string {
  if (!batchNumber) return '';
  return batchNumber.trim().toUpperCase();
}

/**
 * Search for duplicate batch: orgId + storeId + productId + normalizedBatchNumber
 */
export async function findDuplicateBatch(
  organizationId: string,
  storeId: string,
  productId: string,
  normalizedBatchNumber: string
): Promise<PharmacyBatch | null> {
  const ref = getBatchesRef(organizationId);
  const q = query(
    ref,
    where('storeId', '==', storeId),
    where('productId', '==', productId),
    where('normalizedBatchNumber', '==', normalizedBatchNumber)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as PharmacyBatch;
}

/**
 * Operations for Batches
 */
export const batchService = {
  /**
   * Create a new Pharmacy Batch
   */
  async createBatch(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: Omit<PharmacyBatch, 'id' | 'organizationId' | 'normalizedBatchNumber' | 'createdAt' | 'updatedAt' | 'createdByUid' | 'updatedByUid'>
  ): Promise<PharmacyBatch> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newDocRef = getBatchDocRef(organizationId, batchId);

    const normalizedBatchNumber = normalizeBatchNumber(payload.batchNumber);
    if (!normalizedBatchNumber) {
      throw new Error('Batch number cannot be empty or whitespace-only.');
    }

    // Check duplicate
    const duplicate = await findDuplicateBatch(
      organizationId,
      payload.storeId,
      payload.productId,
      normalizedBatchNumber
    );
    if (duplicate) {
      throw new Error('A batch with this number already exists for this product at this store.');
    }

    // Prepare complete payload
    const createPayload: Record<string, any> = {
      ...payload,
      id: batchId,
      organizationId,
      normalizedBatchNumber,
      purchasePrice: Number(payload.purchasePrice) || 0,
      mrp: Number(payload.mrp) || 0,
      salePrice: Number(payload.salePrice) || 0,
      quantity: Number(payload.quantity) || 0,
      reservedQuantity: Number(payload.reservedQuantity) || 0,
      availableQuantity: Number(payload.availableQuantity) ?? Number(payload.quantity) ?? 0,
      status: payload.status || 'active',
      createdByUid: caller.uid,
      updatedByUid: caller.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Runtime payload check
    if (!validatePharmacyBatch(createPayload, organizationId)) {
      throw new Error('Malformed batch payload. Validation failed.');
    }

    await setDoc(newDocRef, createPayload);

    // Audit trail
    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'batch.created',
      entityType: 'batch',
      entityId: batchId,
      storeId: payload.storeId,
      metadata: {
        batchNumber: payload.batchNumber,
        productId: payload.productId,
        productName: payload.productName || null,
        quantity: payload.quantity,
      },
    });

    return {
      ...createPayload,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    } as PharmacyBatch;
  },

  /**
   * Fetch a single Batch by ID
   */
  async getBatch(organizationId: string, batchId: string): Promise<PharmacyBatch | null> {
    const docRef = getBatchDocRef(organizationId, batchId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return null;

    const data = { id: snap.id, ...snap.data() };
    if (validatePharmacyBatch(data, organizationId)) {
      return data as PharmacyBatch;
    }
    return null;
  },

  /**
   * Update an existing Batch record
   */
  async updateBatch(
    organizationId: string,
    batchId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    updates: Partial<Omit<PharmacyBatch, 'id' | 'organizationId' | 'storeId' | 'productId' | 'createdAt' | 'createdByUid'>>
  ): Promise<void> {
    const docRef = getBatchDocRef(organizationId, batchId);

    // Fetch existing batch to merge and validate
    const existing = await this.getBatch(organizationId, batchId);
    if (!existing) {
      throw new Error('Batch not found');
    }

    const merged = {
      ...existing,
      ...updates,
      updatedByUid: caller.uid,
      updatedAt: Timestamp.now(), // simulate update for local validation
    };

    if (updates.batchNumber) {
      merged.normalizedBatchNumber = normalizeBatchNumber(updates.batchNumber);
    }

    if (!validatePharmacyBatch(merged, organizationId)) {
      throw new Error('Malformed batch update payload. Validation failed.');
    }

    const updatePayload: Record<string, any> = {
      ...updates,
      updatedByUid: caller.uid,
      updatedAt: serverTimestamp(),
    };

    if (updates.batchNumber) {
      updatePayload.normalizedBatchNumber = normalizeBatchNumber(updates.batchNumber);
    }

    await updateDoc(docRef, updatePayload);

    // Audit trail
    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'batch.updated',
      entityType: 'batch',
      entityId: batchId,
      storeId: existing.storeId,
      metadata: {
        updatedFields: Object.keys(updates),
      },
    });
  },

  /**
   * Archive a batch (soft-delete status)
   */
  async archiveBatch(
    organizationId: string,
    batchId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null }
  ): Promise<void> {
    await this.updateBatch(organizationId, batchId, caller, { status: 'archived' });

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'batch.archived',
      entityType: 'batch',
      entityId: batchId,
      metadata: {
        archived: true,
      },
    });
  },

  /**
   * Fetch all batches for an organization with cursor-based pagination
   */
  async getBatches(
    organizationId: string,
    options: {
      storeId?: string;
      productId?: string;
      status?: BatchStatus | 'all';
      pageSize?: number;
      lastDoc?: unknown;
    } = {}
  ): Promise<{ batches: PharmacyBatch[]; lastDoc: unknown; hasMore: boolean }> {
    const { storeId, productId, status = 'all', pageSize = 50, lastDoc } = options;

    const ref = getBatchesRef(organizationId);
    const constraints: any[] = [];

    if (status !== 'all') {
      constraints.push(where('status', '==', status));
    }

    if (storeId) {
      constraints.push(where('storeId', '==', storeId));
    }

    if (productId) {
      constraints.push(where('productId', '==', productId));
    }

    constraints.push(orderBy('expiryDate', 'asc'));
    constraints.push(limit(pageSize + 1));

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(ref, ...constraints);
    const snapshot = await getDocs(q);

    const rawDocs = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    const batches: PharmacyBatch[] = [];
    rawDocs.forEach((data) => {
      if (validatePharmacyBatch(data, organizationId)) {
        batches.push(data as PharmacyBatch);
      }
    });

    const hasMore = batches.length > pageSize;
    if (hasMore) {
      batches.pop();
    }

    const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

    return {
      batches,
      lastDoc: newLastDoc,
      hasMore,
    };
  },

  /**
   * Fetch saleable batches for a product ordered by FEFO (earliest expiry date first)
   */
  async getSaleableBatchesForProduct(
    organizationId: string,
    productId: string,
    storeId?: string
  ): Promise<PharmacyBatch[]> {
    const ref = getBatchesRef(organizationId);
    const constraints: any[] = [
      where('productId', '==', productId),
      where('status', '==', 'active'),
    ];

    if (storeId) {
      constraints.push(where('storeId', '==', storeId));
    }

    constraints.push(orderBy('expiryDate', 'asc'));

    const q = query(ref, ...constraints);
    const snapshot = await getDocs(q);

    const batches: PharmacyBatch[] = [];
    snapshot.docs.forEach((docSnap) => {
      const data = { id: docSnap.id, ...docSnap.data() };
      if (validatePharmacyBatch(data, organizationId)) {
        const batch = data as PharmacyBatch;
        // Exclude expired batches or items with zero available quantity
        if (!isBatchExpired(batch) && batch.availableQuantity > 0) {
          batches.push(batch);
        }
      }
    });

    return batches;
  },

  /**
   * Near-expiry alerts lookup: active batches with expiry approaching threshold
   */
  async getExpiringBatches(
    organizationId: string,
    thresholdDays = 30,
    storeId?: string
  ): Promise<PharmacyBatch[]> {
    const { batches } = await this.getBatches(organizationId, {
      storeId,
      status: 'active',
      pageSize: 1000,
    });

    return batches.filter((b) => {
      const days = Math.ceil(
        (b.expiryDate.toMillis() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return days > 0 && days <= thresholdDays;
    });
  },

  /**
   * Expired active batches lookup
   */
  async getExpiredBatches(organizationId: string, storeId?: string): Promise<PharmacyBatch[]> {
    const { batches } = await this.getBatches(organizationId, {
      storeId,
      status: 'active',
      pageSize: 1000,
    });

    return batches.filter((b) => isBatchExpired(b));
  },
};
