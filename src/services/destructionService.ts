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
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import {
  DestructionRecord,
  DestructionMethod,
  DestructionStatus,
} from '../types/firestore';
import { validateDestructionRecord } from '../lib/firebase/validators';
import { logAuditEvent } from './auditService';
import { notificationService } from './notificationService';

function getDestructionRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'destructionRecords');
}

function getDestructionDocRef(organizationId: string, destructionId: string) {
  return doc(db, 'organizations', organizationId, 'destructionRecords', destructionId);
}

export function generateDestructionNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `DES-${dateStr}-${random}`;
}

export function generateCertificateNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CERT-DES-${dateStr}-${random}`;
}

export interface RequestDestructionPayload {
  storeId: string;
  quarantineId?: string;
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  mrp: number;
  purchasePrice: number;
  reason: string;
  destructionMethod: DestructionMethod;
  destructionDate: string;
  witnessedByName?: string;
  witnessedByDesignation?: string;
  supplierId?: string;
  supplierName?: string;
  notes?: string;
}

export const destructionService = {
  /**
   * Fetch destruction records for an organization with optional store filter
   */
  async getDestructionRecords(
    organizationId: string,
    filter?: { storeId?: string }
  ): Promise<DestructionRecord[]> {
    if (!organizationId) return [];

    try {
      const colRef = getDestructionRef(organizationId);
      const constraints: any[] = [];

      if (filter?.storeId) {
        constraints.push(where('storeId', '==', filter.storeId));
      }

      const q = query(colRef, ...constraints);
      const snap = await getDocs(q);

      const records: DestructionRecord[] = [];
      snap.forEach((d) => {
        const data = { id: d.id, ...d.data() } as DestructionRecord;
        if (validateDestructionRecord(data, organizationId)) {
          records.push(data);
        }
      });

      return records;
    } catch (err) {
      console.error('Error fetching destruction records:', err);
      return [];
    }
  },

  /**
   * Request a statutory pharmaceutical / inventory destruction write-off
   */
  async requestDestruction(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: RequestDestructionPayload
  ): Promise<DestructionRecord> {
    const desRef = doc(getDestructionRef(organizationId));
    const now = Timestamp.now();
    const destructionNumber = generateDestructionNumber();
    const certificateNumber = generateCertificateNumber();
    const totalValuation = Math.round(payload.quantity * payload.purchasePrice * 100) / 100;

    const record: DestructionRecord = {
      id: desRef.id,
      organizationId,
      storeId: payload.storeId,
      destructionNumber,
      certificateNumber,
      quarantineId: payload.quarantineId,
      productId: payload.productId,
      productName: payload.productName,
      batchId: payload.batchId,
      batchNumber: payload.batchNumber,
      expiryDate: payload.expiryDate,
      quantity: payload.quantity,
      mrp: payload.mrp,
      purchasePrice: payload.purchasePrice,
      totalValuation,
      supplierId: payload.supplierId,
      supplierName: payload.supplierName,
      reason: payload.reason,
      destructionMethod: payload.destructionMethod,
      destructionDate: payload.destructionDate,
      requestedByUid: caller.uid,
      requestedByName: caller.displayName || caller.email || 'Pharmacist',
      approvedByUid: null,
      approvedByName: null,
      witnessedByName: payload.witnessedByName,
      witnessedByDesignation: payload.witnessedByDesignation,
      notes: payload.notes,
      status: 'destruction_pending',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(desRef, record);

    try {
      await logAuditEvent(organizationId, {
        actorUid: caller.uid,
        actorEmail: caller.email || undefined,
        actorDisplayName: caller.displayName || undefined,
        action: 'destruction.requested',
        entityType: 'destruction_record',
        entityId: desRef.id,
        storeId: payload.storeId,
        metadata: {
          batchNumber: payload.batchNumber,
          destructionNumber,
          totalValuation,
        },
      });

      await notificationService.createNotification(organizationId, {
        recipientUid: 'all',
        type: 'destruction_request',
        title: 'Stock Destruction Request Pending',
        message: `Destruction requested for batch ${payload.batchNumber} of ${payload.productName} (${payload.quantity} units).`,
        severity: 'warning',
        targetModule: 'sales_returns',
      });
    } catch (e) {
      console.warn('Destruction request side-effects warning:', e);
    }

    return record;
  },

  /**
   * Approve a pending destruction request by authorized manager/owner
   */
  async approveDestruction(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    destructionId: string
  ): Promise<DestructionRecord> {
    const desRef = getDestructionDocRef(organizationId, destructionId);
    const snap = await getDoc(desRef);
    if (!snap.exists()) {
      throw new Error('Destruction record not found');
    }

    const updates = {
      status: 'approved_for_destruction' as DestructionStatus,
      approvedByUid: caller.uid,
      approvedByName: caller.displayName || caller.email || 'Manager',
      updatedAt: Timestamp.now(),
    };

    await updateDoc(desRef, updates);

    return {
      id: snap.id,
      ...snap.data(),
      ...updates,
    } as DestructionRecord;
  },

  /**
   * Complete and certify destruction procedure
   */
  async completeDestruction(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    destructionId: string
  ): Promise<DestructionRecord> {
    const desRef = getDestructionDocRef(organizationId, destructionId);
    const snap = await getDoc(desRef);
    if (!snap.exists()) {
      throw new Error('Destruction record not found');
    }

    const updates = {
      status: 'destroyed' as DestructionStatus,
      updatedAt: Timestamp.now(),
    };

    await updateDoc(desRef, updates);

    try {
      await logAuditEvent(organizationId, {
        actorUid: caller.uid,
        actorEmail: caller.email || undefined,
        actorDisplayName: caller.displayName || undefined,
        action: 'destruction.completed',
        entityType: 'destruction_record',
        entityId: destructionId,
        metadata: {
          destructionNumber: snap.data().destructionNumber,
        },
      });
    } catch (e) {
      console.warn('Audit error:', e);
    }

    return {
      id: snap.id,
      ...snap.data(),
      ...updates,
    } as DestructionRecord;
  },
};

export default destructionService;
