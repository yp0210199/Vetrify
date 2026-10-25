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
  serverTimestamp,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { Supplier, SupplierLedgerEntry, SupplierStatus } from '../types/firestore';
import { validateSupplier, validateSupplierLedgerEntry } from '../lib/firebase/validators';
import { logAuditEvent } from './auditService';

export function getSuppliersRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'suppliers');
}

export function getSupplierDocRef(organizationId: string, supplierId: string) {
  return doc(db, 'organizations', organizationId, 'suppliers', supplierId);
}

export function getSupplierLedgerRef(organizationId: string, supplierId: string) {
  return collection(db, 'organizations', organizationId, 'suppliers', supplierId, 'ledger');
}

export const supplierService = {
  async createSupplier(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: Omit<Supplier, 'id' | 'organizationId' | 'currentBalance' | 'createdAt' | 'updatedAt' | 'createdByUid' | 'updatedByUid'>
  ): Promise<Supplier> {
    const supplierId = `sup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docRef = getSupplierDocRef(organizationId, supplierId);

    const fullPayload: Record<string, any> = {
      ...payload,
      id: supplierId,
      organizationId,
      currentBalance: 0,
      status: payload.status || 'active',
      createdByUid: caller.uid,
      updatedByUid: caller.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!validateSupplier(fullPayload, organizationId)) {
      throw new Error('Malformed supplier payload. Validation failed.');
    }

    await setDoc(docRef, fullPayload);

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'supplier.created',
      entityType: 'supplier',
      entityId: supplierId,
      metadata: {
        supplierName: payload.name,
        gstin: payload.gstin || null,
      },
    });

    return {
      ...fullPayload,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    } as Supplier;
  },

  async getSupplier(organizationId: string, supplierId: string): Promise<Supplier | null> {
    const docRef = getSupplierDocRef(organizationId, supplierId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = { id: snap.id, ...snap.data() };
    if (validateSupplier(data, organizationId)) {
      return data as Supplier;
    }
    return null;
  },

  async updateSupplier(
    organizationId: string,
    supplierId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    updates: Partial<Omit<Supplier, 'id' | 'organizationId' | 'createdAt' | 'createdByUid'>>
  ): Promise<void> {
    const docRef = getSupplierDocRef(organizationId, supplierId);
    const existing = await this.getSupplier(organizationId, supplierId);
    if (!existing) {
      throw new Error('Supplier not found.');
    }

    const merged = {
      ...existing,
      ...updates,
      updatedByUid: caller.uid,
      updatedAt: Timestamp.now(),
    };

    if (!validateSupplier(merged, organizationId)) {
      throw new Error('Malformed supplier update payload. Validation failed.');
    }

    await updateDoc(docRef, {
      ...updates,
      updatedByUid: caller.uid,
      updatedAt: serverTimestamp(),
    });

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'supplier.updated',
      entityType: 'supplier',
      entityId: supplierId,
      metadata: {
        updatedFields: Object.keys(updates),
      },
    });
  },

  async getSuppliers(
    organizationId: string,
    statusFilter?: SupplierStatus | 'all'
  ): Promise<Supplier[]> {
    const ref = getSuppliersRef(organizationId);
    let q;
    if (statusFilter && statusFilter !== 'all') {
      q = query(ref, where('status', '==', statusFilter), orderBy('name', 'asc'));
    } else {
      q = query(ref, orderBy('name', 'asc'));
    }

    const snap = await getDocs(q);
    const results: Supplier[] = [];
    snap.docs.forEach((docSnap) => {
      const data = { id: docSnap.id, ...(docSnap.data() as object) };
      if (validateSupplier(data, organizationId)) {
        results.push(data as Supplier);
      }
    });
    return results;
  },

  async getSupplierLedger(
    organizationId: string,
    supplierId: string
  ): Promise<SupplierLedgerEntry[]> {
    const ref = getSupplierLedgerRef(organizationId, supplierId);
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const entries: SupplierLedgerEntry[] = [];
    snap.docs.forEach((docSnap) => {
      const data = { id: docSnap.id, ...(docSnap.data() as object) };
      if (validateSupplierLedgerEntry(data, organizationId)) {
        entries.push(data as SupplierLedgerEntry);
      }
    });
    return entries;
  },

  recordSupplierPayment(
    organizationId: string,
    supplierId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: {
      amount: number;
      paymentMode: string;
      referenceNumber: string;
      notes?: string;
    }
  ): Promise<SupplierLedgerEntry> {
    return this.recordPayment(organizationId, supplierId, caller, payload);
  },

  async recordPayment(
    organizationId: string,
    supplierId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: {
      amount: number;
      paymentMode: string;
      referenceNumber: string;
      notes?: string;
    }
  ): Promise<SupplierLedgerEntry> {
    if (payload.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const ledgerEntryId = `led_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const supplierRef = getSupplierDocRef(organizationId, supplierId);
    const ledgerDocRef = doc(db, 'organizations', organizationId, 'suppliers', supplierId, 'ledger', ledgerEntryId);

    let createdEntry: SupplierLedgerEntry | null = null;

    await runTransaction(db, async (tx) => {
      const supSnap = await tx.get(supplierRef);
      if (!supSnap.exists()) {
        throw new Error('Supplier not found.');
      }

      const supData = supSnap.data();
      const currentBalance = supData.currentBalance || 0;
      const newBalance = currentBalance - payload.amount;

      const ledgerData: Record<string, any> = {
        id: ledgerEntryId,
        organizationId,
        supplierId,
        type: 'payment',
        referenceId: payload.referenceNumber || ledgerEntryId,
        referenceNumber: payload.referenceNumber || ledgerEntryId,
        notes: payload.notes || `Payment via ${payload.paymentMode}`,
        creditAmount: 0,
        debitAmount: payload.amount,
        runningBalance: newBalance,
        createdByUid: caller.uid,
        createdAt: serverTimestamp(),
      };

      if (!validateSupplierLedgerEntry(ledgerData, organizationId)) {
        throw new Error('Malformed ledger entry payload.');
      }

      tx.set(ledgerDocRef, ledgerData);
      tx.update(supplierRef, {
        currentBalance: newBalance,
        updatedByUid: caller.uid,
        updatedAt: serverTimestamp(),
      });

      createdEntry = {
        ...ledgerData,
        createdAt: Timestamp.now(),
      } as SupplierLedgerEntry;
    });

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'supplier.payment_recorded',
      entityType: 'supplier',
      entityId: supplierId,
      metadata: {
        amount: payload.amount,
        paymentMode: payload.paymentMode,
        referenceNumber: payload.referenceNumber,
      },
    });

    return createdEntry!;
  },
};
