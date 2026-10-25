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
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import {
  QuarantineRecord,
  QuarantineSource,
} from '../types/firestore';
import { PharmacyBatch } from '../types/batch';
import { validateQuarantineRecord } from '../lib/firebase/validators';
import { logAuditEvent } from './auditService';
import { notificationService } from './notificationService';

function getQuarantineRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'quarantineRecords');
}

function getQuarantineDocRef(organizationId: string, quarantineId: string) {
  return doc(db, 'organizations', organizationId, 'quarantineRecords', quarantineId);
}

function getBatchDocRef(organizationId: string, batchId: string) {
  return doc(db, 'organizations', organizationId, 'batches', batchId);
}

export function generateQuarantineNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `QRN-${dateStr}-${random}`;
}

export interface QuarantineBatchRequest {
  storeId: string;
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  source: QuarantineSource;
  sourceReferenceId?: string;
  sourceReferenceNumber?: string;
  reason: string;
  condition: string;
}

export const quarantineService = {
  /**
   * Move batch stock into quarantine atomically
   */
  async quarantineBatch(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: QuarantineBatchRequest
  ): Promise<QuarantineRecord> {
    const quarantineId = `qrn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const quarantineNumber = generateQuarantineNumber();

    const quarantineDocRef = getQuarantineDocRef(organizationId, quarantineId);
    const batchDocRef = getBatchDocRef(organizationId, payload.batchId);

    let createdRecord: QuarantineRecord | null = null;

    await runTransaction(db, async (tx) => {
      const batchSnap = await tx.get(batchDocRef);
      if (!batchSnap.exists()) {
        throw new Error('Batch document not found.');
      }
      const batchData = batchSnap.data() as PharmacyBatch;

      if (batchData.availableQuantity < payload.quantity) {
        throw new Error(
          `Quarantine quantity (${payload.quantity}) exceeds available stock (${batchData.availableQuantity}).`
        );
      }

      // Update batch status or reduce saleable stock
      const newAvail = Math.max(0, batchData.availableQuantity - payload.quantity);
      const newStatus = newAvail === 0 ? 'quarantined' : batchData.status;

      tx.update(batchDocRef, {
        availableQuantity: newAvail,
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedByUid: caller.uid,
      });

      // Construct Quarantine Record
      const quarantineRecordPayload: Record<string, any> = {
        id: quarantineId,
        organizationId,
        storeId: payload.storeId,
        quarantineNumber,
        productId: payload.productId,
        productName: payload.productName,
        batchId: payload.batchId,
        batchNumber: payload.batchNumber,
        expiryDate: payload.expiryDate,
        quantity: payload.quantity,
        source: payload.source,
        sourceReferenceId: payload.sourceReferenceId || null,
        sourceReferenceNumber: payload.sourceReferenceNumber || null,
        reason: payload.reason,
        condition: payload.condition,
        status: 'quarantined',
        quarantinedByUid: caller.uid,
        quarantinedByName: caller.displayName || 'Staff Member',
        quarantinedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (!validateQuarantineRecord(quarantineRecordPayload, organizationId)) {
        throw new Error('Quarantine payload validation failed.');
      }

      tx.set(quarantineDocRef, quarantineRecordPayload);

      createdRecord = {
        ...quarantineRecordPayload,
        quarantinedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      } as QuarantineRecord;
    });

    if (!createdRecord) {
      throw new Error('Failed to quarantine batch.');
    }

    // Audit event
    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'batch.quarantined',
      entityType: 'quarantine',
      entityId: quarantineId,
      storeId: payload.storeId,
      metadata: {
        quarantineNumber,
        batchId: payload.batchId,
        batchNumber: payload.batchNumber,
        quantity: payload.quantity,
        source: payload.source,
      },
    });

    return createdRecord;
  },

  /**
   * Fetch quarantine records
   */
  async getQuarantineRecords(
    organizationId: string,
    options: {
      storeId?: string;
      status?: string;
      pageSize?: number;
    } = {}
  ): Promise<QuarantineRecord[]> {
    const ref = getQuarantineRef(organizationId);
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

    const list: QuarantineRecord[] = [];
    snap.docs.forEach((d) => {
      const data = { id: d.id, ...d.data() };
      if (validateQuarantineRecord(data, organizationId)) {
        list.push(data as QuarantineRecord);
      }
    });

    return list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  },
};
