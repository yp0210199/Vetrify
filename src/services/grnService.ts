import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { GRN, GRNItem, PurchaseOrder, SupplierLedgerEntry } from '../types/firestore';
import { validateGRN, validatePharmacyBatch, validateSupplierLedgerEntry } from '../lib/firebase/validators';
import { logAuditEvent } from './auditService';
import { normalizeBatchNumber } from './batchService';
import { notificationService } from './notificationService';

export function getGRNsRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'grns');
}

export function getGRNDocRef(organizationId: string, grnId: string) {
  return doc(db, 'organizations', organizationId, 'grns', grnId);
}

export function generateGRNNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
  return `GRN-${dateStr}-${randomStr}`;
}

export const grnService = {
  /**
   * Finalize Goods Receipt Note (GRN) and perform Atomic Stock Inwarding:
   * - Create GRN doc
   * - Create Batch doc for each item
   * - Update PO received quantities and status
   * - Update Supplier balance and create ledger entry
   */
  async createAndCompleteGRN(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: {
      storeId: string;
      poId: string;
      supplierInvoiceNumber: string;
      supplierInvoiceDate?: string;
      items: {
        productId: string;
        productName: string;
        sku?: string;
        batchNumber: string;
        mfgDate?: string;
        expiryDate: string; // ISO string YYYY-MM-DD
        receivedQuantity: number;
        freeQuantity?: number;
        unitPurchaseCost: number;
        unitMrp: number;
        unitSalePrice: number;
        gstRate: number;
      }[];
      notes?: string;
    }
  ): Promise<GRN> {
    const grnId = `grn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const grnNumber = generateGRNNumber();

    const poRef = doc(db, 'organizations', organizationId, 'purchaseOrders', payload.poId);
    const poSnap = await getDoc(poRef);
    if (!poSnap.exists()) {
      throw new Error('Purchase Order not found.');
    }
    const po = { id: poSnap.id, ...poSnap.data() } as PurchaseOrder;

    if (po.status !== 'approved' && po.status !== 'partially_fulfilled') {
      throw new Error(`Cannot process GRN for Purchase Order with status '${po.status}'. Must be approved or partially_fulfilled.`);
    }

    const supplierRef = doc(db, 'organizations', organizationId, 'suppliers', po.supplierId);
    const supplierSnap = await getDoc(supplierRef);
    if (!supplierSnap.exists()) {
      throw new Error('Supplier not found.');
    }
    const supplierData = supplierSnap.data();

    const formattedItems: GRNItem[] = payload.items.map((it) => {
      const orderedQty = (it as any).orderedQuantity || it.receivedQuantity || 0;
      const freeQty = (it as any).freeQuantity || 0;
      const discPct = (it as any).discountPercent || 0;
      const gstRate = (it as any).gstRate || (it as any).taxRate || 0;
      const lineTaxable = (it.receivedQuantity || 0) * (it.unitPurchaseCost || 0);
      const lineTax = (lineTaxable * gstRate) / 100;
      const cgst = lineTax / 2;
      const sgst = lineTax / 2;
      const lineTotal = lineTaxable + lineTax;

      return {
        productId: it.productId,
        productName: it.productName,
        sku: it.sku || '',
        batchNumber: it.batchNumber.trim().toUpperCase(),
        manufacturingDate: (it as any).mfgDate || (it as any).manufacturingDate || undefined,
        expiryDate: it.expiryDate,
        orderedQuantity: orderedQty,
        receivedQuantity: Number(it.receivedQuantity) || 0,
        freeQuantity: Number(freeQty) || 0,
        unitPurchaseCost: Number(it.unitPurchaseCost) || 0,
        unitMrp: Number(it.unitMrp) || 0,
        unitSalePrice: Number(it.unitSalePrice) || 0,
        discountPercent: Number(discPct) || 0,
        gstRate: Number(gstRate) || 0,
        taxableAmount: Number(lineTaxable.toFixed(2)),
        cgstAmount: Number(cgst.toFixed(2)),
        sgstAmount: Number(sgst.toFixed(2)),
        totalTaxAmount: Number(lineTax.toFixed(2)),
        totalAmount: Number(lineTotal.toFixed(2)),
      };
    });

    const totalReceivedQty = formattedItems.reduce((acc, item) => acc + item.receivedQuantity, 0);
    const taxableAmount = formattedItems.reduce((acc, item) => acc + (item.receivedQuantity * item.unitPurchaseCost), 0);
    const taxTotal = formattedItems.reduce((acc, item) => acc + item.totalTaxAmount, 0);
    const grandTotal = taxableAmount + taxTotal;

    const grnDocRef = doc(db, 'organizations', organizationId, 'grns', grnId);

    const cgstAmount = formattedItems.reduce((acc, item) => acc + (item.cgstAmount || 0), 0);
    const sgstAmount = formattedItems.reduce((acc, item) => acc + (item.sgstAmount || 0), 0);
    const igstAmount = formattedItems.reduce((acc, item) => acc + (item.igstAmount || 0), 0);
    const totalTax = taxTotal;

    const fullGrnPayload: Record<string, any> = {
      id: grnId,
      organizationId,
      storeId: payload.storeId,
      poId: payload.poId,
      poNumber: po.poNumber,
      grnNumber,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      supplierInvoiceNumber: payload.supplierInvoiceNumber,
      supplierInvoiceDate: payload.supplierInvoiceDate || null,
      items: formattedItems,
      itemsCount: formattedItems.length,
      totalReceivedQty,
      subtotal: Number(taxableAmount.toFixed(2)),
      taxableAmount: Number(taxableAmount.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      status: 'completed',
      notes: payload.notes || '',
      receivedByUid: caller.uid,
      receivedByName: caller.displayName || caller.email || 'Staff',
      receivedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!validateGRN(fullGrnPayload, organizationId)) {
      throw new Error('Malformed GRN payload. Validation failed.');
    }

    // Ledger entry doc ref
    const ledgerEntryId = `led_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ledgerDocRef = doc(db, 'organizations', organizationId, 'suppliers', po.supplierId, 'ledger', ledgerEntryId);

    // Run Atomic Transaction
    await runTransaction(db, async (tx) => {
      // 1. Write GRN Doc
      tx.set(grnDocRef, fullGrnPayload);

      // 2. Create Batch Docs for each received item
      formattedItems.forEach((item) => {
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const batchDocRef = doc(db, 'organizations', organizationId, 'batches', batchId);

        const expDate = new Date(item.expiryDate);
        const mfgDate = item.manufacturingDate ? new Date(item.manufacturingDate) : new Date();

        const totalQty = item.receivedQuantity + (item.freeQuantity || 0);

        const batchPayload: Record<string, any> = {
          id: batchId,
          organizationId,
          storeId: payload.storeId,
          productId: item.productId,
          productName: item.productName,
          batchNumber: item.batchNumber,
          normalizedBatchNumber: normalizeBatchNumber(item.batchNumber),
          manufacturingDate: Timestamp.fromDate(mfgDate),
          expiryDate: Timestamp.fromDate(expDate),
          purchasePrice: item.unitPurchaseCost,
          mrp: item.unitMrp,
          salePrice: item.unitSalePrice,
          quantity: totalQty,
          reservedQuantity: 0,
          availableQuantity: totalQty,
          supplierId: po.supplierId,
          grnId,
          status: 'active',
          createdByUid: caller.uid,
          updatedByUid: caller.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (!validatePharmacyBatch(batchPayload, organizationId)) {
          throw new Error(`Batch payload validation failed for batch '${item.batchNumber}'.`);
        }

        tx.set(batchDocRef, batchPayload);
      });

      // 3. Update PO items & Status
      const updatedPOItems = po.items.map((pItem) => {
        const receivedInThisGrn = formattedItems
          .filter((gItem) => gItem.productId === pItem.productId)
          .reduce((acc, curr) => acc + curr.receivedQuantity, 0);
        return {
          ...pItem,
          receivedQuantity: (pItem.receivedQuantity || 0) + receivedInThisGrn,
        };
      });

      const newTotalReceivedQty = updatedPOItems.reduce((acc, item) => acc + item.receivedQuantity, 0);
      const isFullyFulfilled = updatedPOItems.every((item) => item.receivedQuantity >= item.orderedQuantity);
      const newPOStatus = isFullyFulfilled ? 'fulfilled' : 'partially_fulfilled';

      tx.update(poRef, {
        items: updatedPOItems,
        totalReceivedQty: newTotalReceivedQty,
        status: newPOStatus,
        updatedAt: serverTimestamp(),
      });

      // 4. Update Supplier balance & write ledger entry
      const currentSupplierBalance = supplierData.currentBalance || 0;
      const newSupplierBalance = currentSupplierBalance + grandTotal;

      const ledgerData: Record<string, any> = {
        id: ledgerEntryId,
        organizationId,
        supplierId: po.supplierId,
        type: 'grn',
        referenceId: grnId,
        referenceNumber: grnNumber,
        notes: `Inward GRN against Invoice #${payload.supplierInvoiceNumber}`,
        creditAmount: grandTotal,
        debitAmount: 0,
        runningBalance: newSupplierBalance,
        createdByUid: caller.uid,
        createdAt: serverTimestamp(),
      };

      if (!validateSupplierLedgerEntry(ledgerData, organizationId)) {
        throw new Error('Malformed supplier ledger entry for GRN.');
      }

      tx.set(ledgerDocRef, ledgerData);
      // ---------------------------------------------------------
      // GST Ledger & Accounting Integration (Phase 2 - Step 5)
      // ---------------------------------------------------------
      const financialYear = new Date().getMonth() >= 3 ? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` : `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;
      const taxPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

      if (totalTax > 0) {
        const gstLedgerRef = doc(collection(db, 'organizations', organizationId, 'gstLedgerEntries'));
        tx.set(gstLedgerRef, {
          id: gstLedgerRef.id,
          organizationId,
          storeId: payload.storeId,
          financialYear,
          taxPeriod,
          sourceType: 'PURCHASE',
          sourceId: grnId,
          documentNumber: payload.supplierInvoiceNumber,
          documentDate: Timestamp.fromDate(new Date(payload.supplierInvoiceDate)),
          partyId: po.supplierId,
          partyGSTIN: supplierData.gstin || null,
          supplyType: 'B2B',
          taxableValue: taxableAmount,
          cgst: cgstAmount,
          sgst: sgstAmount,
          igst: igstAmount || 0,
          cess: 0,
          totalTax: totalTax,
          inputOutputType: 'INPUT',
          reverseCharge: false,
          createdAt: serverTimestamp(),
          createdBy: caller.uid,
        });
      }

      const journalEntryRef = doc(collection(db, 'organizations', organizationId, 'journalEntries'));
      const lines = [];
      lines.push({ accountId: 'INVENTORY', accountName: 'Inventory', debit: taxableAmount, credit: 0, description: `GRN #${grnNumber}` });
      if (cgstAmount > 0) {
        lines.push({ accountId: 'INPUT_CGST', accountName: 'Input CGST', debit: cgstAmount, credit: 0, description: `GRN #${grnNumber}` });
      }
      if (sgstAmount > 0) {
        lines.push({ accountId: 'INPUT_SGST', accountName: 'Input SGST', debit: sgstAmount, credit: 0, description: `GRN #${grnNumber}` });
      }
      if (igstAmount && igstAmount > 0) {
        lines.push({ accountId: 'INPUT_IGST', accountName: 'Input IGST', debit: igstAmount, credit: 0, description: `GRN #${grnNumber}` });
      }
      lines.push({ accountId: 'PAYABLES', accountName: 'Accounts Payable', debit: 0, credit: grandTotal, description: `Supplier Inv #${payload.supplierInvoiceNumber}` });
      tx.set(journalEntryRef, {
        id: journalEntryRef.id,
        organizationId,
        storeId: payload.storeId,
        date: serverTimestamp(),
        financialYear,
        sourceType: 'PURCHASE',
        sourceId: grnId,
        documentNumber: grnNumber,
        description: `Goods Receipt Note #${grnNumber}`,
        lines,
        totalAmount: grandTotal,
        status: 'POSTED',
        postedByUid: caller.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      tx.update(supplierRef, {
        currentBalance: newSupplierBalance,
        updatedByUid: caller.uid,
        updatedAt: serverTimestamp(),
      });
    });

    // Audit Logging
    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'grn.completed',
      entityType: 'grn',
      entityId: grnId,
      storeId: payload.storeId,
      metadata: {
        grnNumber,
        poId: payload.poId,
        poNumber: po.poNumber,
        supplierId: po.supplierId,
        supplierInvoiceNumber: payload.supplierInvoiceNumber,
        grandTotal,
        totalReceivedQty,
      },
    });

    // Notify Manager/Admin
    await notificationService.sendSystemNotification(organizationId, {
      recipientUid: 'all',
      title: 'New Stock Inwarded (GRN)',
      message: `GRN ${grnNumber} completed for ${po.supplierName}. Total Qty: ${totalReceivedQty}, Value: ₹${grandTotal.toFixed(2)}`,
      severity: 'success',
      targetModule: 'inventory',
    });

    return {
      ...fullGrnPayload,
      receivedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    } as GRN;
  },

  completeGRNAndInwardBatches(
    organizationId: string,
    storeId: string,
    payload: {
      poId: string;
      poNumber: string;
      supplierId: string;
      supplierName: string;
      supplierInvoiceNumber: string;
      supplierInvoiceDate: Date;
      items: any[];
      remarks?: string;
    },
    caller: { uid: string; email?: string | null; displayName?: string | null } = { uid: 'system', email: 'system@vetrify.internal' }
  ): Promise<GRN> {
    return this.createAndCompleteGRN(organizationId, caller, {
      storeId,
      poId: payload.poId,
      supplierInvoiceNumber: payload.supplierInvoiceNumber,
      supplierInvoiceDate: payload.supplierInvoiceDate.toISOString().split('T')[0],
      items: payload.items,
      notes: payload.remarks,
    });
  },

  async getGRN(organizationId: string, grnId: string): Promise<GRN | null> {
    const docRef = getGRNDocRef(organizationId, grnId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = { id: snap.id, ...(snap.data() as object) };
    if (validateGRN(data, organizationId)) {
      return data as GRN;
    }
    return null;
  },

  async getGRNs(
    organizationId: string,
    optionsOrStoreId?: string | {
      storeId?: string;
      supplierId?: string;
      poId?: string;
    }
  ): Promise<GRN[]> {
    const options = typeof optionsOrStoreId === 'string' ? { storeId: optionsOrStoreId } : (optionsOrStoreId || {});
    const ref = getGRNsRef(organizationId);
    const constraints: any[] = [];

    if (options.storeId) {
      constraints.push(where('storeId', '==', options.storeId));
    }
    if (options.supplierId) {
      constraints.push(where('supplierId', '==', options.supplierId));
    }
    if (options.poId) {
      constraints.push(where('poId', '==', options.poId));
    }

    constraints.push(orderBy('createdAt', 'desc'));

    const q = query(ref, ...constraints);
    const snap = await getDocs(q);
    const results: GRN[] = [];
    snap.docs.forEach((docSnap) => {
      const data = { id: docSnap.id, ...(docSnap.data() as object) };
      if (validateGRN(data, organizationId)) {
        results.push(data as GRN);
      }
    });
    return results;
  },
};
