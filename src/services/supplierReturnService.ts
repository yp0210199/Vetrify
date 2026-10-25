import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import {
  SupplierReturn,
  SupplierReturnItem,
  SupplierReturnReason,
  Supplier,
  SupplierLedgerEntry,
} from '../types/firestore';
import { PharmacyBatch } from '../types/batch';
import {
  validateSupplierReturn,
  validateSupplierLedgerEntry,
} from '../lib/firebase/validators';
import { calculateLineTaxes } from './posService';
import { logAuditEvent } from './auditService';
import { notificationService } from './notificationService';

function getSupplierReturnsRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'supplierReturns');
}

function getSupplierReturnDocRef(organizationId: string, supplierReturnId: string) {
  return doc(db, 'organizations', organizationId, 'supplierReturns', supplierReturnId);
}

function getSupplierDocRef(organizationId: string, supplierId: string) {
  return doc(db, 'organizations', organizationId, 'suppliers', supplierId);
}

function getSupplierLedgerRef(organizationId: string, supplierId: string) {
  return collection(db, 'organizations', organizationId, 'suppliers', supplierId, 'ledger');
}

function getBatchDocRef(organizationId: string, batchId: string) {
  return doc(db, 'organizations', organizationId, 'batches', batchId);
}

export function generateSupplierReturnNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SR-${dateStr}-${random}`;
}

export interface CreateSupplierReturnRequestItem {
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitPurchaseCost: number;
  gstRate: number;
  reason: SupplierReturnReason;
}

export interface CreateSupplierReturnRequest {
  storeId: string;
  supplierId: string;
  supplierName: string;
  supplierInvoiceNumber?: string;
  grnId?: string;
  grnNumber?: string;
  poId?: string;
  poNumber?: string;
  items: CreateSupplierReturnRequestItem[];
  reason: string;
}

export const supplierReturnService = {
  /**
   * Execute atomic Supplier Return transaction
   */
  async createSupplierReturn(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: CreateSupplierReturnRequest
  ): Promise<SupplierReturn> {
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Cannot process supplier return with no items.');
    }

    const supplierReturnId = `sret_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const supplierReturnNumber = generateSupplierReturnNumber();

    const returnDocRef = getSupplierReturnDocRef(organizationId, supplierReturnId);
    const supplierDocRef = getSupplierDocRef(organizationId, payload.supplierId);

    let createdSupplierReturn: SupplierReturn | null = null;

    await runTransaction(db, async (tx) => {
      // 1. Verify Supplier
      const supplierSnap = await tx.get(supplierDocRef);
      if (!supplierSnap.exists()) {
        throw new Error('Supplier record not found.');
      }
      const supplierData = supplierSnap.data() as Supplier;

      // 2. Validate items & update Batch stock (deduct return quantity)
      const processedItems: SupplierReturnItem[] = [];

      let subtotal = 0;
      let taxableTotal = 0;
      let cgstTotal = 0;
      let sgstTotal = 0;
      let totalQty = 0;

      for (const item of payload.items) {
        if (item.quantity <= 0) {
          throw new Error(`Invalid return quantity (${item.quantity}) for product ${item.productName}.`);
        }

        const batchRef = getBatchDocRef(organizationId, item.batchId);
        const batchSnap = await tx.get(batchRef);

        if (!batchSnap.exists()) {
          throw new Error(`Batch record for ${item.batchNumber} not found.`);
        }
        const batchData = batchSnap.data() as PharmacyBatch;

        if (batchData.availableQuantity < item.quantity) {
          throw new Error(
            `Supplier return quantity (${item.quantity}) exceeds available stock (${batchData.availableQuantity}) for batch ${item.batchNumber}.`
          );
        }

        // Calculate line financial values
        const lineTax = calculateLineTaxes(
          item.quantity,
          item.unitPurchaseCost,
          0, // no discount on supplier return
          item.gstRate
        );

        subtotal += lineTax.gross;
        taxableTotal += lineTax.taxableAmount;
        cgstTotal += lineTax.cgstAmount;
        sgstTotal += lineTax.sgstAmount;
        totalQty += item.quantity;

        // Deduct from batch availableQuantity and total quantity (NO double deduction)
        const newAvail = batchData.availableQuantity - item.quantity;
        const newTotal = batchData.quantity - item.quantity;
        const newStatus = newAvail <= 0 ? 'archived' : batchData.status;

        tx.update(batchRef, {
          availableQuantity: newAvail,
          quantity: newTotal,
          status: newStatus,
          updatedAt: serverTimestamp(),
          updatedByUid: caller.uid,
        });

        processedItems.push({
          productId: item.productId,
          productName: item.productName,
          batchId: item.batchId,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
          unitPurchaseCost: item.unitPurchaseCost,
          gstRate: item.gstRate,
          taxableAmount: lineTax.taxableAmount,
          cgstAmount: lineTax.cgstAmount,
          sgstAmount: lineTax.sgstAmount,
          totalAmount: lineTax.total,
          reason: item.reason,
        });
      }

      const totalTax = cgstTotal + sgstTotal;
      const rawGrandTotal = taxableTotal + totalTax;
      const grandTotal = Math.round(rawGrandTotal);
      const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

      // 3. Update Supplier Payable Balance & Ledger Entry
      const prevBalance = supplierData.currentBalance || 0;
      const newBalance = Math.max(0, Math.round((prevBalance - grandTotal) * 100) / 100);

      tx.update(supplierDocRef, {
        currentBalance: newBalance,
        updatedAt: serverTimestamp(),
      });

      // Create Supplier Ledger Entry (Debit note reduction)
      const ledgerEntryId = `sled_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const ledgerDocRef = doc(getSupplierLedgerRef(organizationId, payload.supplierId), ledgerEntryId);

      const ledgerPayload: Record<string, any> = {
        id: ledgerEntryId,
        organizationId,
        supplierId: payload.supplierId,
        type: 'return',
        referenceId: supplierReturnId,
        referenceNumber: supplierReturnNumber,
        amount: grandTotal,
        creditAmount: 0,
        debitAmount: grandTotal,
        runningBalance: newBalance,
        notes: `Supplier Return Debit Note ${supplierReturnNumber}`,
        createdByUid: caller.uid,
        createdAt: serverTimestamp(),
      };

      if (validateSupplierLedgerEntry(ledgerPayload, organizationId)) {
        tx.set(ledgerDocRef, ledgerPayload);
      }

      // 4. Construct Supplier Return Document
      const supplierReturnPayload: Record<string, any> = {
        id: supplierReturnId,
        organizationId,
        storeId: payload.storeId,
        supplierReturnNumber,
        supplierId: payload.supplierId,
        supplierName: payload.supplierName || supplierData.name,
        supplierInvoiceNumber: payload.supplierInvoiceNumber || null,
        grnId: payload.grnId || null,
        grnNumber: payload.grnNumber || null,
        poId: payload.poId || null,
        poNumber: payload.poNumber || null,
        items: processedItems,
        itemsCount: processedItems.length,
        totalQuantity: totalQty,
        subtotal: Math.round(subtotal * 100) / 100,
        taxableAmount: Math.round(taxableTotal * 100) / 100,
        cgstTotal: Math.round(cgstTotal * 100) / 100,
        sgstTotal: Math.round(sgstTotal * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        roundOff,
        grandTotal,
        reason: payload.reason,
        status: 'approved',
        createdByUid: caller.uid,
        createdByName: caller.displayName || 'Staff Member',
        approvedByUid: caller.uid,
        approvedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (!validateSupplierReturn(supplierReturnPayload, organizationId)) {
        throw new Error('Supplier return payload validation failed.');
      }

      tx.set(returnDocRef, supplierReturnPayload);

      createdSupplierReturn = {
        ...supplierReturnPayload,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        approvedAt: Timestamp.now(),
      } as SupplierReturn;
    });

    if (!createdSupplierReturn) {
      throw new Error('Failed to execute supplier return transaction.');
    }

    // Audit trail
    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'supplier_return.created' as any,
      entityType: 'supplier_return' as any,
      entityId: supplierReturnId,
      storeId: payload.storeId,
      metadata: {
        supplierReturnNumber,
        supplierId: payload.supplierId,
        grandTotal: createdSupplierReturn.grandTotal,
      },
    });

    // Notification
    await notificationService.sendSystemNotification(organizationId, {
      recipientUid: caller.uid,
      title: `Supplier Return Debit Note Created`,
      message: `Supplier Return ${supplierReturnNumber} processed for ${payload.supplierName} (Total: ₹${(
        Number(createdSupplierReturn?.grandTotal) || 0
      ).toFixed(2)}).`,
      severity: 'info',
      targetModule: 'returns',
    });

    return createdSupplierReturn;
  },

  /**
   * Fetch supplier returns
   */
  async getSupplierReturns(
    organizationId: string,
    options: {
      storeId?: string;
      supplierId?: string;
      pageSize?: number;
    } = {}
  ): Promise<SupplierReturn[]> {
    const ref = getSupplierReturnsRef(organizationId);
    const constraints: any[] = [];

    if (options.storeId) {
      constraints.push(where('storeId', '==', options.storeId));
    }
    if (options.supplierId) {
      constraints.push(where('supplierId', '==', options.supplierId));
    }

    constraints.push(limit(options.pageSize || 50));

    const q = query(ref, ...constraints);
    const snap = await getDocs(q);

    const list: SupplierReturn[] = [];
    snap.docs.forEach((d) => {
      const data = { id: d.id, ...d.data() };
      if (validateSupplierReturn(data, organizationId)) {
        list.push(data as SupplierReturn);
      }
    });

    return list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  },
};
