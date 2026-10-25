import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import {
  DestructionRecord,
  DestructionMethod,
  QuarantineRecord,
} from '../types/firestore';
import { PharmacyBatch } from '../types/batch';
import { validateDestructionRecord } from '../lib/firebase/validators';
import { logAuditEvent } from './auditService';
import { notificationService } from './notificationService';

function getDestructionRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'destructionRecords');
}

function getDestructionDocRef(organizationId: string, destructionId: string) {
  return doc(db, 'organizations', organizationId, 'destructionRecords', destructionId);
}

function getBatchDocRef(organizationId: string, batchId: string) {
  return doc(db, 'organizations', organizationId, 'batches', batchId);
}

function getQuarantineDocRef(organizationId: string, quarantineId: string) {
  return doc(db, 'organizations', organizationId, 'quarantineRecords', quarantineId);
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
  supplierId?: string;
  supplierName?: string;
  reason: string;
  destructionMethod: DestructionMethod;
  destructionDate: string;
  witnessedByName?: string;
  witnessedByDesignation?: string;
  notes?: string;
}

export const destructionService = {
  /**
   * Submit statutory drug destruction request
   */
  async requestDestruction(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: RequestDestructionPayload
  ): Promise<DestructionRecord> {
    const destructionId = `des_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const destructionNumber = generateDestructionNumber();
    const certificateNumber = generateCertificateNumber();

    const docRef = getDestructionDocRef(organizationId, destructionId);
    const totalValuation = Math.round(payload.quantity * payload.purchasePrice * 100) / 100;

    const recordPayload: Record<string, any> = {
      id: destructionId,
      organizationId,
      storeId: payload.storeId,
      destructionNumber,
      certificateNumber,
      quarantineId: payload.quarantineId || null,
      productId: payload.productId,
      productName: payload.productName,
      batchId: payload.batchId,
      batchNumber: payload.batchNumber,
      expiryDate: payload.expiryDate,
      quantity: payload.quantity,
      mrp: payload.mrp,
      purchasePrice: payload.purchasePrice,
      totalValuation,
      supplierId: payload.supplierId || null,
      supplierName: payload.supplierName || null,
      reason: payload.reason,
      destructionMethod: payload.destructionMethod,
      destructionDate: payload.destructionDate,
      requestedByUid: caller.uid,
      requestedByName: caller.displayName || 'Staff Member',
      approvedByUid: null,
      approvedByName: null,
      witnessedByName: payload.witnessedByName || null,
      witnessedByDesignation: payload.witnessedByDesignation || null,
      notes: payload.notes || null,
      status: 'destruction_pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!validateDestructionRecord(recordPayload, organizationId)) {
      throw new Error('Destruction record validation failed.');
    }

    await runTransaction(db, async (tx) => {
      tx.set(docRef, recordPayload);

      // If linked to quarantine, update quarantine status
      if (payload.quarantineId) {
        const qRef = getQuarantineDocRef(organizationId, payload.quarantineId);
        const qSnap = await tx.get(qRef);
        if (qSnap.exists()) {
          tx.update(qRef, {
            status: 'moved_to_destruction',
            updatedAt: serverTimestamp(),
          });
        }
      }
    });

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'destruction.requested' as any,
      entityType: 'destruction' as any,
      entityId: destructionId,
      storeId: payload.storeId,
      metadata: {
        destructionNumber,
        batchNumber: payload.batchNumber,
        quantity: payload.quantity,
        totalValuation,
      },
    });

    return {
      ...recordPayload,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    } as DestructionRecord;
  },

  /**
   * Approve destruction request (Manager/Admin/Owner)
   */
  async approveDestruction(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    destructionId: string
  ): Promise<void> {
    const docRef = getDestructionDocRef(organizationId, destructionId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      throw new Error('Destruction record not found.');
    }
    const data = snap.data() as DestructionRecord;

    await updateDoc(docRef, {
      status: 'approved_for_destruction',
      approvedByUid: caller.uid,
      approvedByName: caller.displayName || 'Manager',
      updatedAt: serverTimestamp(),
    });

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'destruction.approved' as any,
      entityType: 'destruction' as any,
      entityId: destructionId,
      storeId: data.storeId,
      metadata: {
        destructionNumber: data.destructionNumber,
        approvedByUid: caller.uid,
      },
    });
  },

  /**
   * Complete statutory destruction and issue certificate
   */
  async completeDestruction(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    destructionId: string
  ): Promise<void> {
    const docRef = getDestructionDocRef(organizationId, destructionId);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists()) {
        throw new Error('Destruction record not found.');
      }
      const data = snap.data() as DestructionRecord;

      if (data.status !== 'approved_for_destruction' && data.status !== 'destruction_pending') {
        throw new Error(`Cannot complete destruction in status ${data.status}.`);
      }

      // Ensure batch status is updated to destroyed
      const batchRef = getBatchDocRef(organizationId, data.batchId);
      const batchSnap = await tx.get(batchRef);
      if (batchSnap.exists()) {
        tx.update(batchRef, {
          status: 'destroyed',
          availableQuantity: 0,
          quantity: 0,
          updatedAt: serverTimestamp(),
          updatedByUid: caller.uid,
        });
      }

      tx.update(docRef, {
        status: 'destroyed',
        updatedAt: serverTimestamp(),
      });
    });

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'destruction.completed' as any,
      entityType: 'destruction' as any,
      entityId: destructionId,
      metadata: {
        completedByUid: caller.uid,
      },
    });
  },

  /**
   * Fetch destruction records
   */
  async getDestructionRecords(
    organizationId: string,
    options: {
      storeId?: string;
      status?: string;
      pageSize?: number;
    } = {}
  ): Promise<DestructionRecord[]> {
    const ref = getDestructionRef(organizationId);
    const constraints: any[] = [];

    if (options.storeId) {
      constraints.push(where('storeId', '==', options.storeId));
    }
    if (options.status && options.status !== 'all') {
      constraints.push(where('status', '==', options.status));
    }

    constraints.push(limit(options.pageSize || 50));

    const q = query(ref, ...constraints);
    const snap = await getDocs(q);

    const list: DestructionRecord[] = [];
    snap.docs.forEach((d) => {
      const data = { id: d.id, ...d.data() };
      if (validateDestructionRecord(data, organizationId)) {
        list.push(data as DestructionRecord);
      }
    });

    return list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  },
};
