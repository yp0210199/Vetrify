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
  SalesReturn,
  SalesReturnItem,
  CreditNote,
  CreditNoteItem,
  SaleInvoice,
  Customer,
  QuarantineRecord,
  CustomerLedgerEntry,
} from '../types/firestore';
import { PharmacyBatch } from '../types/batch';
import {
  validateSalesReturn,
  validateCreditNote,
  validateQuarantineRecord,
  validateCustomerLedgerEntry,
} from '../lib/firebase/validators';
import { sanitizeFirestorePayload } from '../lib/firebase/queryUtils';
import { calculateLineTaxes } from './posService';
import { logAuditEvent } from './auditService';
import { notificationService } from './notificationService';

function getReturnsRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'returns');
}

function getReturnDocRef(organizationId: string, returnId: string) {
  return doc(db, 'organizations', organizationId, 'returns', returnId);
}

function getCreditNotesRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'creditNotes');
}

function getCreditNoteDocRef(organizationId: string, creditNoteId: string) {
  return doc(db, 'organizations', organizationId, 'creditNotes', creditNoteId);
}

function getInvoicesRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'invoices');
}

function getInvoiceDocRef(organizationId: string, invoiceId: string) {
  return doc(db, 'organizations', organizationId, 'invoices', invoiceId);
}

function getBatchDocRef(organizationId: string, batchId: string) {
  return doc(db, 'organizations', organizationId, 'batches', batchId);
}

function getCustomerDocRef(organizationId: string, customerId: string) {
  return doc(db, 'organizations', organizationId, 'customers', customerId);
}

function getCustomerLedgerRef(organizationId: string, customerId: string) {
  return collection(db, 'organizations', organizationId, 'customers', customerId, 'ledger');
}

function getQuarantineRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'quarantineRecords');
}

export function generateReturnNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RET-${dateStr}-${random}`;
}

export function generateCreditNoteNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CN-${dateStr}-${random}`;
}

export function generateQuarantineNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `QRN-${dateStr}-${random}`;
}

export interface CreateReturnRequestItem {
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  originallySoldQty: number;
  returnQty: number;
  unitPrice: number;
  mrp: number;
  discountPercent: number;
  gstRate: number;
  condition: SalesReturnItem['condition'];
}

export interface CreateReturnRequest {
  storeId: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: CreateReturnRequestItem[];
  reason: string;
  refundMethod: SalesReturn['refundMethod'];
  isManagerOverride?: boolean;
  overrideManagerUid?: string;
  overrideReason?: string;
}

export const returnsService = {
  /**
   * Search sale invoices by invoice number, customer name, phone
   */
  async searchInvoices(
    organizationId: string,
    storeId: string,
    queryStr: string
  ): Promise<SaleInvoice[]> {
    if (!organizationId || !storeId) return [];

    const ref = getInvoicesRef(organizationId);
    const q = query(ref, where('storeId', '==', storeId), limit(50));
    const snap = await getDocs(q);

    const invoices: SaleInvoice[] = [];
    const term = (queryStr || '').trim().toLowerCase();

    snap.docs.forEach((d) => {
      const data = { id: d.id, ...d.data() } as SaleInvoice;
      if (!term) {
        invoices.push(data);
        return;
      }

      const matchNumber = data.invoiceNumber?.toLowerCase().includes(term);
      const matchCustomer = data.customerName?.toLowerCase().includes(term);
      const matchPhone = data.customerPhone?.toLowerCase().includes(term);

      if (matchNumber || matchCustomer || matchPhone) {
        invoices.push(data);
      }
    });

    return invoices.sort((a, b) => {
      const tA = a.createdAt?.seconds || 0;
      const tB = b.createdAt?.seconds || 0;
      return tB - tA;
    });
  },

  /**
   * Get invoice details and previous returns summary
   */
  async getInvoiceForReturn(
    organizationId: string,
    invoiceId: string
  ): Promise<{ invoice: SaleInvoice; previousReturns: SalesReturn[] }> {
    const invRef = getInvoiceDocRef(organizationId, invoiceId);
    const invSnap = await getDoc(invRef);
    if (!invSnap.exists()) {
      throw new Error('Original sale invoice not found.');
    }
    const invoice = { id: invSnap.id, ...invSnap.data() } as SaleInvoice;

    // Fetch all existing non-cancelled returns for this invoice
    const retRef = getReturnsRef(organizationId);
    const q = query(
      retRef,
      where('originalInvoiceId', '==', invoiceId),
      where('status', 'in', ['approved', 'processed', 'completed', 'submitted', 'draft'])
    );
    const retSnap = await getDocs(q);
    const previousReturns: SalesReturn[] = [];
    retSnap.docs.forEach((d) => {
      previousReturns.push({ id: d.id, ...d.data() } as SalesReturn);
    });

    return { invoice, previousReturns };
  },

  /**
   * Execute atomic Sales Return and Credit Note creation transaction
   */
  async createSalesReturn(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: CreateReturnRequest
  ): Promise<{ returnRecord: SalesReturn; creditNote: CreditNote }> {
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Cannot process sales return with no items.');
    }

    const returnId = `ret_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const creditNoteId = `cn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const returnNumber = generateReturnNumber();
    const creditNoteNumber = generateCreditNoteNumber();

    const returnDocRef = getReturnDocRef(organizationId, returnId);
    const creditNoteDocRef = getCreditNoteDocRef(organizationId, creditNoteId);
    const originalInvoiceRef = getInvoiceDocRef(organizationId, payload.originalInvoiceId);

    let createdReturnRecord: SalesReturn | null = null;
    let createdCreditNoteRecord: CreditNote | null = null;

    await runTransaction(db, async (tx) => {
      // 1. Verify Original Invoice
      const invSnap = await tx.get(originalInvoiceRef);
      if (!invSnap.exists()) {
        throw new Error('Original sale invoice does not exist.');
      }
      const invoiceData = invSnap.data() as SaleInvoice;
      if (invoiceData.organizationId !== organizationId) {
        throw new Error('Invoice organization mismatch.');
      }
      if (invoiceData.storeId !== payload.storeId) {
        throw new Error('Invoice store mismatch.');
      }

      // 2. Fetch all previous returns for this invoice to verify remaining returnable quantities
      const retRef = getReturnsRef(organizationId);
      const prevReturnsQuery = query(
        retRef,
        where('originalInvoiceId', '==', payload.originalInvoiceId),
        where('status', 'in', ['approved', 'processed', 'completed', 'submitted', 'draft'])
      );
      const prevReturnsSnap = await getDocs(prevReturnsQuery);

      const returnedQtyByBatch: Record<string, number> = {};
      prevReturnsSnap.docs.forEach((docSnap) => {
        const retData = docSnap.data() as SalesReturn;
        if (retData.items && Array.isArray(retData.items)) {
          retData.items.forEach((item) => {
            const key = `${item.productId}_${item.batchId}`;
            returnedQtyByBatch[key] = (returnedQtyByBatch[key] || 0) + item.returnQty;
          });
        }
      });

      // 3. Process each return item
      const processedReturnItems: SalesReturnItem[] = [];
      const creditNoteItems: CreditNoteItem[] = [];

      let subtotal = 0;
      let totalDiscount = 0;
      let taxableAmountTotal = 0;
      let cgstTotal = 0;
      let sgstTotal = 0;
      let totalReturnQty = 0;

      for (const item of payload.items) {
        if (item.returnQty <= 0) {
          throw new Error(`Invalid return quantity (${item.returnQty}) for product ${item.productName}.`);
        }

        const batchKey = `${item.productId}_${item.batchId}`;
        const previouslyReturned = returnedQtyByBatch[batchKey] || 0;

        // Find sold item line on original invoice
        const invoiceLine = invoiceData.items.find(
          (line) => line.productId === item.productId && (line.batchId === item.batchId || line.batchNumber === item.batchNumber)
        );

        const originallySold = invoiceLine ? invoiceLine.quantity : item.originallySoldQty;
        const availableReturnable = Math.max(0, originallySold - previouslyReturned);

        if (item.returnQty > availableReturnable) {
          throw new Error(
            `Return quantity (${item.returnQty}) exceeds maximum returnable quantity (${availableReturnable}) for product ${item.productName}.`
          );
        }

        // Calculate item financial values using canonical line tax calculator
        const taxCalc = calculateLineTaxes(
          item.returnQty,
          item.unitPrice,
          item.discountPercent,
          item.gstRate
        );

        subtotal += taxCalc.gross;
        totalDiscount += taxCalc.discountAmount;
        taxableAmountTotal += taxCalc.taxableAmount;
        cgstTotal += taxCalc.cgstAmount;
        sgstTotal += taxCalc.sgstAmount;
        totalReturnQty += item.returnQty;

        const isRestockable = item.condition === 'sealed_resalable';
        let quarantineId: string | undefined = undefined;

        // Handle batch updates or quarantine routing
        const batchRef = getBatchDocRef(organizationId, item.batchId);
        const batchSnap = await tx.get(batchRef);

        if (batchSnap.exists()) {
          const batchData = batchSnap.data() as PharmacyBatch;
          if (isRestockable) {
            // Restore batch quantity for saleable inventory
            const newAvail = (batchData.availableQuantity || 0) + item.returnQty;
            const newTotal = (batchData.quantity || 0) + item.returnQty;
            tx.update(batchRef, {
              availableQuantity: newAvail,
              quantity: newTotal,
              updatedAt: serverTimestamp(),
              updatedByUid: caller.uid,
            });
          } else {
            // Route non-resalable item to quarantine
            quarantineId = `qrn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const quarantineDocRef = doc(getQuarantineRef(organizationId), quarantineId);
            const quarantineNumber = generateQuarantineNumber();

            const quarantineRecord: Record<string, any> = {
              id: quarantineId,
              organizationId,
              storeId: payload.storeId,
              quarantineNumber,
              productId: item.productId,
              productName: item.productName,
              batchId: item.batchId,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate,
              quantity: item.returnQty,
              source: 'sales_return',
              sourceReferenceId: returnId,
              sourceReferenceNumber: returnNumber,
              reason: payload.reason || 'Sales return non-resalable condition',
              condition: item.condition,
              status: 'quarantined',
              quarantinedByUid: caller.uid,
              quarantinedByName: caller.displayName || 'Staff Member',
              quarantinedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };

            if (validateQuarantineRecord(quarantineRecord, organizationId)) {
              tx.set(quarantineDocRef, sanitizeFirestorePayload(quarantineRecord));
            }
          }
        }

        processedReturnItems.push({
          productId: item.productId,
          productName: item.productName,
          batchId: item.batchId,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          originallySoldQty: originallySold,
          previouslyReturnedQty: previouslyReturned,
          returnQty: item.returnQty,
          unitPrice: item.unitPrice,
          mrp: item.mrp,
          discountPercent: item.discountPercent,
          discountAmount: taxCalc.discountAmount,
          taxableAmount: taxCalc.taxableAmount,
          gstRate: item.gstRate,
          cgstAmount: taxCalc.cgstAmount,
          sgstAmount: taxCalc.sgstAmount,
          totalTaxAmount: taxCalc.totalTax,
          totalAmount: taxCalc.total,
          condition: item.condition,
          restocked: isRestockable,
          quarantineId,
        });

        creditNoteItems.push({
          productId: item.productId,
          productName: item.productName,
          batchNumber: item.batchNumber,
          quantity: item.returnQty,
          unitPrice: item.unitPrice,
          taxableAmount: taxCalc.taxableAmount,
          gstRate: item.gstRate,
          cgstAmount: taxCalc.cgstAmount,
          sgstAmount: taxCalc.sgstAmount,
          totalAmount: taxCalc.total,
        });
      }

      const totalTax = cgstTotal + sgstTotal;
      const rawGrandTotal = taxableAmountTotal + totalTax;
      const grandTotal = Math.round(rawGrandTotal);
      const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

      // 4. Customer Khata / Balance Reduction if Credit Sale
      if (
        payload.customerId &&
        (payload.refundMethod === 'khata_credit' || invoiceData.paymentMode === 'credit')
      ) {
        const custRef = getCustomerDocRef(organizationId, payload.customerId);
        const custSnap = await tx.get(custRef);

        if (custSnap.exists()) {
          const custData = custSnap.data() as Customer;
          const prevOutstanding = custData.currentOutstanding || 0;
          const newOutstanding = Math.max(0, Math.round((prevOutstanding - grandTotal) * 100) / 100);

          tx.update(custRef, {
            currentOutstanding: newOutstanding,
            updatedAt: serverTimestamp(),
          });

          // Create Customer Ledger Entry
          const ledgerId = `cled_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const ledgerRef = doc(getCustomerLedgerRef(organizationId, payload.customerId), ledgerId);

          const ledgerPayload: Record<string, any> = {
            id: ledgerId,
            organizationId,
            customerId: payload.customerId,
            type: 'sales_return',
            referenceId: returnId,
            referenceNumber: returnNumber,
            amount: grandTotal,
            creditAmount: 0,
            debitAmount: grandTotal,
            runningBalance: newOutstanding,
            notes: `Sales Return ${returnNumber} for Invoice ${payload.originalInvoiceNumber}`,
            storeId: payload.storeId,
            createdByUid: caller.uid,
            createdAt: serverTimestamp(),
          };

          if (validateCustomerLedgerEntry(ledgerPayload, organizationId)) {
            tx.set(ledgerRef, sanitizeFirestorePayload(ledgerPayload));
          }
        }
      }

      // 5. Construct Sales Return Record
      const returnRecordPayload: Record<string, any> = {
        id: returnId,
        organizationId,
        storeId: payload.storeId,
        returnNumber,
        originalInvoiceId: payload.originalInvoiceId,
        originalInvoiceNumber: payload.originalInvoiceNumber,
        customerId: payload.customerId || invoiceData.customerId || null,
        customerName: payload.customerName || invoiceData.customerName || null,
        customerPhone: payload.customerPhone || invoiceData.customerPhone || null,
        items: processedReturnItems,
        itemsCount: processedReturnItems.length,
        totalReturnQty,
        subtotal: Math.round(subtotal * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        taxableAmount: Math.round(taxableAmountTotal * 100) / 100,
        cgstTotal: Math.round(cgstTotal * 100) / 100,
        sgstTotal: Math.round(sgstTotal * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        roundOff,
        grandTotal,
        reason: payload.reason,
        creditNoteId,
        refundMethod: payload.refundMethod,
        refundStatus: payload.refundMethod === 'khata_credit' ? 'processed' : 'processed',
        isManagerOverride: payload.isManagerOverride || false,
        overrideManagerUid: payload.overrideManagerUid || null,
        overrideReason: payload.overrideReason || null,
        status: 'completed',
        createdByUid: caller.uid,
        createdByName: caller.displayName || 'Staff Member',
        approvedByUid: caller.uid,
        approvedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // 6. Construct Credit Note Record
      const todayIso = new Date().toISOString().split('T')[0];
      const creditNotePayload: Record<string, any> = {
        id: creditNoteId,
        organizationId,
        storeId: payload.storeId,
        creditNoteNumber,
        returnId,
        originalInvoiceId: payload.originalInvoiceId,
        originalInvoiceNumber: payload.originalInvoiceNumber,
        customerId: payload.customerId || invoiceData.customerId || null,
        customerName: payload.customerName || invoiceData.customerName || null,
        customerPhone: payload.customerPhone || invoiceData.customerPhone || null,
        issueDate: todayIso,
        reason: payload.reason,
        items: creditNoteItems,
        taxableAmount: Math.round(taxableAmountTotal * 100) / 100,
        cgstTotal: Math.round(cgstTotal * 100) / 100,
        sgstTotal: Math.round(sgstTotal * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        roundOff,
        totalCreditAmount: grandTotal,
        refundMethod: payload.refundMethod,
        status: 'issued',
        createdByUid: caller.uid,
        createdByName: caller.displayName || 'Staff Member',
        approvedByUid: caller.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (!validateSalesReturn(returnRecordPayload, organizationId)) {
        throw new Error('Sales return payload validation failed.');
      }
      if (!validateCreditNote(creditNotePayload, organizationId)) {
        throw new Error('Credit note payload validation failed.');
      }

      tx.set(returnDocRef, sanitizeFirestorePayload(returnRecordPayload));
      tx.set(creditNoteDocRef, sanitizeFirestorePayload(creditNotePayload));

      createdReturnRecord = {
        ...returnRecordPayload,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        approvedAt: Timestamp.now(),
      } as SalesReturn;

      createdCreditNoteRecord = {
        ...creditNotePayload,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      } as CreditNote;
    });

    if (!createdReturnRecord || !createdCreditNoteRecord) {
      throw new Error('Transaction failed to create sales return and credit note.');
    }

    // Audit trails
    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'return.created' as any,
      entityType: 'sales_return' as any,
      entityId: returnId,
      storeId: payload.storeId,
      metadata: {
        returnNumber,
        originalInvoiceId: payload.originalInvoiceId,
        grandTotal: createdReturnRecord.grandTotal,
        creditNoteId,
        isManagerOverride: payload.isManagerOverride || false,
      },
    });

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'credit_note.created' as any,
      entityType: 'credit_note' as any,
      entityId: creditNoteId,
      storeId: payload.storeId,
      metadata: {
        creditNoteNumber,
        returnId,
        totalCreditAmount: createdCreditNoteRecord.totalCreditAmount,
      },
    });

    if (payload.isManagerOverride) {
      await logAuditEvent(organizationId, {
        actorUid: caller.uid,
        actorEmail: caller.email || null,
        actorDisplayName: caller.displayName || null,
        action: 'return.override.used' as any,
        entityType: 'sales_return' as any,
        entityId: returnId,
        storeId: payload.storeId,
        metadata: {
          overrideManagerUid: payload.overrideManagerUid,
          overrideReason: payload.overrideReason,
        },
      });
    }

    // Notification
    await notificationService.sendSystemNotification(organizationId, {
      recipientUid: caller.uid,
      title: `Sales Return & Credit Note Processed`,
      message: `Return ${returnNumber} processed successfully. Credit Note ${creditNoteNumber} issued for ₹${(
        Number(createdReturnRecord?.grandTotal) || 0
      ).toFixed(2)}.`,
      severity: 'success',
      targetModule: 'returns',
    });

    return {
      returnRecord: createdReturnRecord,
      creditNote: createdCreditNoteRecord,
    };
  },

  /**
   * Fetch Sales Returns list with filtering & pagination
   */
  async getSalesReturns(
    organizationId: string,
    options: {
      storeId?: string;
      status?: string;
      pageSize?: number;
    } = {}
  ): Promise<SalesReturn[]> {
    const ref = getReturnsRef(organizationId);
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

    const list: SalesReturn[] = [];
    snap.docs.forEach((d) => {
      const data = { id: d.id, ...d.data() };
      if (validateSalesReturn(data, organizationId)) {
        list.push(data as SalesReturn);
      }
    });

    return list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  },

  /**
   * Fetch Credit Notes list with filtering
   */
  async getCreditNotes(
    organizationId: string,
    options: {
      storeId?: string;
      pageSize?: number;
    } = {}
  ): Promise<CreditNote[]> {
    const ref = getCreditNotesRef(organizationId);
    const constraints: any[] = [];

    if (options.storeId) {
      constraints.push(where('storeId', '==', options.storeId));
    }

    constraints.push(limit(options.pageSize || 50));

    const q = query(ref, ...constraints);
    const snap = await getDocs(q);

    const list: CreditNote[] = [];
    snap.docs.forEach((d) => {
      const data = { id: d.id, ...d.data() };
      if (validateCreditNote(data, organizationId)) {
        list.push(data as CreditNote);
      }
    });

    return list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  },
};
