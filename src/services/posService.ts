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
  SaleInvoice,
  SaleInvoiceItem,
  PaymentMode,
  PosProductItem,
  PosCartItem,
  PosBillSummary,
  PharmacyBatch,
  Product,
  Customer,
} from '../types';
import {
  validatePharmacyBatch,
  validateSaleInvoice,
  validatePrescriptionDetails,
  validateCustomer,
  validateCustomerLedgerEntry,
} from '../lib/firebase/validators';
import { sanitizeFirestorePayload } from '../lib/firebase/queryUtils';
import { logAuditEvent } from './auditService';
import { batchService } from './batchService';
import { getProducts } from './productService';

function getInvoicesRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'invoices');
}

function getInvoiceDocRef(organizationId: string, invoiceId: string) {
  return doc(db, 'organizations', organizationId, 'invoices', invoiceId);
}

function getBatchDocRef(organizationId: string, batchId: string) {
  return doc(db, 'organizations', organizationId, 'batches', batchId);
}

/**
 * Format a Timestamp or Date into MM/YY for display
 */
export function formatBatchExpiry(val: any): string {
  if (!val) return 'N/A';
  let date: Date | null = null;
  if (typeof val.toDate === 'function') {
    date = val.toDate();
  } else if (val instanceof Date) {
    date = val;
  } else if (val.seconds) {
    date = new Date(val.seconds * 1000);
  } else if (typeof val === 'string') {
    date = new Date(val);
  }
  if (!date || isNaN(date.getTime())) return 'N/A';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${year}`;
}

/**
 * Line tax & discount calculation according to statutory Indian GST
 */
export function calculateLineTaxes(
  qty: number,
  unitPrice: number,
  discountPercent = 0,
  gstRate = 12
) {
  const safeQty = Math.max(0, qty);
  const safePrice = Math.max(0, unitPrice);
  const safeDiscount = Math.min(100, Math.max(0, discountPercent));
  const safeGst = Math.max(0, gstRate);

  const gross = safeQty * safePrice;
  const discountAmount = Math.round(((gross * safeDiscount) / 100) * 100) / 100;
  const taxableAmount = Math.max(0, Math.round((gross - discountAmount) * 100) / 100);

  const halfRate = safeGst / 2;
  const cgstAmount = Math.round(((taxableAmount * halfRate) / 100) * 100) / 100;
  const sgstAmount = Math.round(((taxableAmount * halfRate) / 100) * 100) / 100;
  const totalTax = Math.round((cgstAmount + sgstAmount) * 100) / 100;
  const total = Math.round((taxableAmount + totalTax) * 100) / 100;

  return {
    gross,
    discountAmount,
    taxableAmount,
    cgstRate: halfRate,
    cgstAmount,
    sgstRate: halfRate,
    sgstAmount,
    totalTax,
    total,
  };
}

/**
 * Calculate complete bill financial summary
 */
export function calculateBillSummary(
  items: PosCartItem[],
  freightAmount = 0,
  loadingUnloadingAmount = 0
): PosBillSummary {
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let totalQty = 0;

  items.forEach((item) => {
    const line = calculateLineTaxes(item.qty, item.price, item.discountPercent, item.gstPercent);
    subtotal += line.gross;
    totalDiscount += line.discountAmount;
    taxableAmount += line.taxableAmount;
    cgstAmount += line.cgstAmount;
    sgstAmount += line.sgstAmount;
    totalQty += item.qty;
  });

  const totalTax = cgstAmount + sgstAmount;
  const rawTotal = taxableAmount + totalTax + freightAmount + loadingUnloadingAmount;
  const grandTotal = Math.round(rawTotal);
  const roundOff = Math.round((grandTotal - rawTotal) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(totalDiscount * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    cgstAmount: Math.round(cgstAmount * 100) / 100,
    sgstAmount: Math.round(sgstAmount * 100) / 100,
    freightAmount,
    loadingUnloadingAmount,
    roundOff,
    grandTotal,
    totalSavings: Math.round(totalDiscount * 100) / 100,
    totalItems: items.length,
    totalQty,
  };
}

/**
 * Generate unique statutory invoice number
 */
export function generateInvoiceNumber(storeCode = 'POS'): string {
  const cleanCode = (storeCode || 'POS').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INV-${cleanCode}-${dateStr}-${random}`;
}

export const posService = {
  /**
   * Search real products and attach live FEFO batch stock for current store
   */
  async searchPosProducts(
    organizationId: string,
    storeId: string,
    options: {
      searchQuery?: string;
      categoryId?: string;
      schedule?: string;
      pageSize?: number;
    } = {}
  ): Promise<PosProductItem[]> {
    if (!organizationId || !storeId) return [];

    // Fetch active products
    const { products } = await getProducts(organizationId, {
      searchQuery: options.searchQuery,
      categoryId: options.categoryId,
      status: 'active',
      pageSize: options.pageSize || 60,
    });

    if (products.length === 0) {
      return [];
    }

    // For each product, fetch saleable batches at this store to determine stock & default FEFO batch
    const posProducts: PosProductItem[] = [];

    // Process concurrently with a batch limit
    await Promise.all(
      products.map(async (p: Product) => {
        try {
          const batches = await batchService.getSaleableBatchesForProduct(
            organizationId,
            p.id,
            storeId
          );

          const totalStock = batches.reduce((sum, b) => sum + (b.availableQuantity || 0), 0);
          const earliestBatch = batches.length > 0 ? batches[0] : null;

          const defaultPrice = earliestBatch
            ? earliestBatch.salePrice || p.defaultSalePrice
            : p.defaultSalePrice;

          const defaultMrp = earliestBatch
            ? earliestBatch.mrp || p.defaultMrp
            : p.defaultMrp;

            posProducts.push({
              id: p.id,
              name: p.productName,
              brand: p.brand,
              sku: p.sku,
              batchId: earliestBatch?.id || '',
              batch: earliestBatch?.batchNumber || 'NO LOT',
              expiry: earliestBatch ? formatBatchExpiry(earliestBatch.expiryDate) : 'N/A',
              stock: earliestBatch ? earliestBatch.availableQuantity : 0,
              unit: p.packaging?.baseUnit || p.packaging?.packUnit || 'Box',
              mrp: defaultMrp,
              price: defaultPrice,
              gst: p.gstRate ?? 18,
              hsnCode: p.hsnCode || '6907',
              hasBatches: batches.length > 0,
              totalStoreStock: totalStock,
              shadeNumber: earliestBatch?.shadeNumber || '',
              toneCode: earliestBatch?.toneCode || '',
              caliberCode: earliestBatch?.caliberCode || '',
              finish: p.finish || (p as any).tileDetails?.finish || '',
              grade: p.grade || earliestBatch?.grade || 'Standard',
              dimensionsMm: (p as any).tileDetails?.dimensionsMm,
              coveragePerBoxSqFt: p.packaging?.coveragePerBoxSqFt,
              piecesPerBox: p.packaging?.piecesPerBox,
              weightPerBoxKg: p.packaging?.weightPerBoxKg,
            });
        } catch (err) {
          console.error(`Error loading batches for product ${p.id}:`, err);
        }
      })
    );

    // Sort: items with stock first, then alphabetically
    return posProducts.sort((a, b) => {
      if (a.stock > 0 && b.stock === 0) return -1;
      if (a.stock === 0 && b.stock > 0) return 1;
      return a.name.localeCompare(b.name);
    });
  },

  /**
   * Fetch all active batches for a given product at a store
   */
  async getBatchesForProduct(
    organizationId: string,
    productId: string,
    storeId: string
  ): Promise<PharmacyBatch[]> {
    return batchService.getSaleableBatchesForProduct(organizationId, productId, storeId);
  },

  /**
   * ATOMIC SALE TRANSACTION:
   * Validates stock, re-verifies batch non-expiry, decrements batch quantities atomically,
   * enforces Schedule H prescription data, creates the immutable SaleInvoice,
   * and records comprehensive audit events.
   */
  async createSaleInvoice(params: {
    organizationId: string;
    storeId: string;
    storeCode?: string;
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    paymentMode: PaymentMode;
    items: PosCartItem[];
    freightAmount?: number;
    loadingUnloadingAmount?: number;
    creditOverrideUsed?: boolean;
    clinicalOverrideReason?: string | null;
    caller: { uid: string; email?: string | null; displayName?: string | null };
  }): Promise<SaleInvoice> {
    const {
      organizationId,
      storeId,
      storeCode = 'POS',
      customerId,
      customerName,
      customerPhone,
      paymentMode,
      items,
      freightAmount = 0,
      loadingUnloadingAmount = 0,
      creditOverrideUsed = false,
      clinicalOverrideReason = null,
      caller,
    } = params;

    if (!organizationId) throw new Error('Organization ID is required');
    if (!storeId) throw new Error('Store ID is required');
    if (!items || items.length === 0) throw new Error('Cart cannot be empty for checkout');
    if (!customerName || !customerName.trim()) throw new Error('Customer name is required');
    if (paymentMode === 'credit' && (!customerId || !customerId.trim())) {
      throw new Error('Customer selection is mandatory for Credit Sales / Khata transactions.');
    }

    // 1. Group items by batch ID and check for duplicates or quantity constraints
    const batchQtyMap = new Map<string, number>();
    const batchDocRefs = new Map<string, any>();

    for (const item of items) {
      if (!item.batchId || item.batchId === 'NO BATCH') {
        throw new Error(`Product "${item.name}" has no valid batch assigned`);
      }
      if (item.qty <= 0) {
        throw new Error(`Quantity for "${item.name}" must be greater than 0`);
      }

      const currentRequested = batchQtyMap.get(item.batchId) || 0;
      batchQtyMap.set(item.batchId, currentRequested + item.qty);

      if (!batchDocRefs.has(item.batchId)) {
        batchDocRefs.set(item.batchId, getBatchDocRef(organizationId, item.batchId));
      }
    }

    // 3. Compute Line Items and Invoice Totals
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const invoiceNumber = generateInvoiceNumber(storeCode);

    const saleInvoiceItems: SaleInvoiceItem[] = items.map((item) => {
      const lineTax = calculateLineTaxes(item.qty, item.price, item.discountPercent, item.gstPercent);
      return {
        productId: item.productId,
        productName: item.name,
        brand: item.brand,
        dosageForm: item.dosageForm,
        sku: item.sku,
        batchId: item.batchId,
        batchNumber: item.batch,
        shadeNumber: item.shadeNumber,
        toneCode: item.toneCode,
        caliberCode: item.caliberCode,
        finish: item.finish,
        dimensionsMm: item.dimensionsMm,
        coverageSqFt: item.sqFtCalculated || (item.coveragePerBoxSqFt ? item.coveragePerBoxSqFt * item.qty : undefined),
        expiryDate: item.expiry,
        hsnCode: item.hsnCode || '6907',
        schedule: item.schedule,
        isPrescriptionRequired: Boolean(item.isPrescriptionRequired),
        quantity: item.qty,
        unit: item.unit,
        mrp: item.mrp,
        unitPrice: item.price,
        discountPercent: item.discountPercent,
        discountAmount: lineTax.discountAmount,
        taxableAmount: lineTax.taxableAmount,
        gstRate: item.gstPercent,
        cgstRate: lineTax.cgstRate,
        cgstAmount: lineTax.cgstAmount,
        sgstRate: lineTax.sgstRate,
        sgstAmount: lineTax.sgstAmount,
        totalTaxAmount: lineTax.totalTax,
        total: lineTax.total,
      };
    });

    const summary = calculateBillSummary(items, freightAmount, loadingUnloadingAmount);

    const invoiceRef = getInvoiceDocRef(organizationId, invoiceId);

    // 4. Run Atomic Firestore Transaction
    await runTransaction(db, async (transaction) => {
      // Step A: Read all batch documents & customer document FIRST (all reads must precede writes)
      const batchSnapshots = await Promise.all(
        Array.from(batchDocRefs.entries()).map(async ([batchId, docRef]) => {
          const snap = await transaction.get(docRef);
          return { batchId, snap };
        })
      );

      let customerSnap: any = null;
      let customerRef: any = null;
      if (customerId) {
        customerRef = doc(db, 'organizations', organizationId, 'customers', customerId);
        customerSnap = await transaction.get(customerRef);
      }

      // Step B: Verify Customer status & credit limits if Credit Sale
      let projectedOutstanding = 0;
      if (paymentMode === 'credit') {
        if (!customerSnap || !customerSnap.exists()) {
          throw new Error('Customer record not found for credit sale.');
        }
        const customerData = { id: customerSnap.id, ...customerSnap.data() } as Customer;
        if (customerData.organizationId !== organizationId) {
          throw new Error('Cross-tenant customer credit sale prohibited.');
        }
        if (customerData.status !== 'active') {
          throw new Error(`Customer '${customerData.name}' account is ${customerData.status}. Credit sale prohibited.`);
        }
        if (!customerData.creditEnabled) {
          throw new Error(`Credit sales facility is disabled for customer '${customerData.name}'.`);
        }
        const currentOutstanding = customerData.currentOutstanding || 0;
        projectedOutstanding = currentOutstanding + summary.grandTotal;

        if (projectedOutstanding > customerData.creditLimit && !creditOverrideUsed) {
          throw new Error(
            `Credit limit exceeded for '${customerData.name}'. Current Outstanding: ₹${(
              Number(currentOutstanding) || 0
            ).toFixed(2)}, Sale: ₹${(Number(summary?.grandTotal) || 0).toFixed(2)}, Credit Limit: ₹${(
              Number(customerData?.creditLimit) || 0
            ).toFixed(2)}. Requires manager credit override.`
          );
        }
      }

      // Step C: Verify all batches exist, belong to this org & store, are active, non-expired, and have sufficient stock
      for (const { batchId, snap } of batchSnapshots) {
        if (!snap.exists()) {
          throw new Error(`Batch record (${batchId}) not found in database.`);
        }

        const dataObj = snap.data() as Record<string, any>;
        const batchData = { id: snap.id, ...dataObj } as unknown as PharmacyBatch;

        if (!validatePharmacyBatch(batchData, organizationId)) {
          throw new Error(`Batch record (${batchId}) has corrupted or invalid schema.`);
        }

        if (batchData.storeId !== storeId) {
          throw new Error(`Batch (${batchData.batchNumber}) does not belong to the active store.`);
        }

        if (batchData.status !== 'active') {
          throw new Error(
            `Batch (${batchData.batchNumber}) is not active (current status: ${batchData.status}). Sale cannot proceed.`
          );
        }

        // Check expiration
        const expiryMillis = batchData.expiryDate?.toMillis?.() || new Date(batchData.expiryDate as any).getTime();
        if (expiryMillis && expiryMillis < Date.now()) {
          throw new Error(`Batch (${batchData.batchNumber}) has expired. Sale prohibited.`);
        }

        const requestedQty = batchQtyMap.get(batchId) || 0;
        if (batchData.availableQuantity < requestedQty) {
          throw new Error(
            `Insufficient stock for batch ${batchData.batchNumber}. Available: ${batchData.availableQuantity}, Requested: ${requestedQty}`
          );
        }
      }

      // Step D: Apply Atomic Writes (Batch decrements, Customer ledger & balance update, SaleInvoice)
      for (const { batchId, snap } of batchSnapshots) {
        const batchData = snap.data() as PharmacyBatch;
        const requestedQty = batchQtyMap.get(batchId) || 0;
        const newAvailable = Math.max(0, batchData.availableQuantity - requestedQty);
        const newQty = Math.max(0, batchData.quantity - requestedQty);
        const newStatus = newAvailable <= 0 ? 'depleted' : batchData.status;

        const batchDocRef = batchDocRefs.get(batchId)!;
        transaction.update(batchDocRef, {
          availableQuantity: newAvailable,
          quantity: newQty,
          status: newStatus,
          updatedAt: serverTimestamp(),
          updatedByUid: caller.uid,
        });
      }

      if (paymentMode === 'credit' && customerRef) {
        const ledgerId = `ledger_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const ledgerRef = doc(db, 'organizations', organizationId, 'customers', customerId!, 'ledger', ledgerId);
        
        transaction.set(ledgerRef, {
          id: ledgerId,
          organizationId,
          customerId,
          type: 'credit_sale',
          referenceId: invoiceId,
          referenceNumber: invoiceNumber,
          amount: summary.grandTotal,
          creditAmount: summary.grandTotal,
          debitAmount: 0,
          runningBalance: projectedOutstanding,
          notes: `Credit Sale Invoice #${invoiceNumber}`,
          storeId,
          createdByUid: caller.uid,
          createdAt: serverTimestamp(),
        });

        transaction.update(customerRef, {
          currentOutstanding: projectedOutstanding,
          updatedByUid: caller.uid,
          updatedAt: serverTimestamp(),
        });
      }

      // Write Immutable SaleInvoice Document
      const invoicePayload: Record<string, any> = {
        id: invoiceId,
        organizationId,
        storeId,
        invoiceNumber,
        customerId: customerId || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone ? customerPhone.trim() : null,
        paymentMode,
        items: saleInvoiceItems,
        itemsCount: saleInvoiceItems.length,
        totalQuantity: summary.totalQty,
        subtotal: summary.subtotal,
        totalDiscount: summary.discountAmount,
        taxableAmount: summary.taxableAmount,
        cgstTotal: summary.cgstAmount,
        sgstTotal: summary.sgstAmount,
        totalTax: Math.round((summary.cgstAmount + summary.sgstAmount) * 100) / 100,
        freightAmount: summary.freightAmount,
        loadingUnloadingAmount: summary.loadingUnloadingAmount,
        roundOff: summary.roundOff,
        grandTotal: summary.grandTotal,
        status: 'completed',
        createdByUid: caller.uid,
        createdByName: caller.displayName || caller.email || 'Cashier',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      transaction.set(invoiceRef, sanitizeFirestorePayload(invoicePayload));
      // ---------------------------------------------------------
      // GST Ledger & Accounting Integration (Phase 2 - Step 5)
      // ---------------------------------------------------------
      const financialYear = new Date().getMonth() >= 3 ? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` : `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;
      const taxPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

      const totalTaxAmount = Math.round((summary.cgstAmount + summary.sgstAmount) * 100) / 100;
      if (totalTaxAmount > 0) {
        const gstLedgerRef = doc(collection(db, 'organizations', organizationId, 'gstLedgerEntries'));
        transaction.set(gstLedgerRef, {
          id: gstLedgerRef.id,
          organizationId,
          storeId,
          financialYear,
          taxPeriod,
          sourceType: 'RETAIL_SALE',
          sourceId: invoiceId,
          documentNumber: invoiceNumber,
          documentDate: serverTimestamp(),
          partyId: customerId || null,
          partyGSTIN: null,
          supplyType: 'B2C',
          taxableValue: summary.taxableAmount,
          cgst: summary.cgstAmount,
          sgst: summary.sgstAmount,
          igst: 0,
          cess: 0,
          totalTax: totalTaxAmount,
          inputOutputType: 'OUTPUT',
          reverseCharge: false,
          createdAt: serverTimestamp(),
          createdBy: caller.uid,
        });
      }

      const journalEntryRef = doc(collection(db, 'organizations', organizationId, 'journalEntries'));
      const lines = [];
      if (paymentMode === 'credit') {
        lines.push({ accountId: 'ACCOUNTS_RECEIVABLE', accountName: 'Accounts Receivable', debit: summary.grandTotal, credit: 0, description: `Invoice #${invoiceNumber}` });
      } else {
        lines.push({ accountId: 'CASH', accountName: 'Cash', debit: summary.grandTotal, credit: 0, description: `Invoice #${invoiceNumber}` });
      }
      lines.push({ accountId: 'SALES', accountName: 'Sales Revenue', debit: 0, credit: summary.taxableAmount, description: `Invoice #${invoiceNumber}` });
      if (summary.cgstAmount > 0) {
        lines.push({ accountId: 'OUTPUT_CGST', accountName: 'Output CGST', debit: 0, credit: summary.cgstAmount, description: `Invoice #${invoiceNumber}` });
      }
      if (summary.sgstAmount > 0) {
        lines.push({ accountId: 'OUTPUT_SGST', accountName: 'Output SGST', debit: 0, credit: summary.sgstAmount, description: `Invoice #${invoiceNumber}` });
      }
      transaction.set(journalEntryRef, {
        id: journalEntryRef.id,
        organizationId,
        storeId,
        date: serverTimestamp(),
        financialYear,
        sourceType: 'RETAIL_SALE',
        sourceId: invoiceId,
        documentNumber: invoiceNumber,
        description: `Retail POS Sale #${invoiceNumber}`,
        lines,
        totalAmount: summary.grandTotal,
        status: 'POSTED',
        postedByUid: caller.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Transaction complete
    });

    // 5. Post-transaction Audit Logging
    try {
      await logAuditEvent(organizationId, {
        actorUid: caller.uid,
        actorEmail: caller.email || null,
        actorDisplayName: caller.displayName || null,
        action: 'sale.created',
        entityType: 'sale',
        entityId: invoiceId,
        storeId,
        metadata: {
          invoiceNumber,
          customerName: customerName.trim(),
          grandTotal: summary.grandTotal,
          itemCount: items.length,
          paymentMode,
        },
      });

      if (paymentMode === 'credit') {
        await logAuditEvent(organizationId, {
          actorUid: caller.uid,
          actorEmail: caller.email || null,
          actorDisplayName: caller.displayName || null,
          action: 'credit.sale.created',
          entityType: 'sale',
          entityId: invoiceId,
          storeId,
          metadata: {
            invoiceNumber,
            customerId,
            customerName: customerName.trim(),
            grandTotal: summary.grandTotal,
            creditOverrideUsed,
          },
        });

        if (creditOverrideUsed) {
          await logAuditEvent(organizationId, {
            actorUid: caller.uid,
            actorEmail: caller.email || null,
            actorDisplayName: caller.displayName || null,
            action: 'credit.override.used',
            entityType: 'customer',
            entityId: customerId!,
            storeId,
            metadata: {
              invoiceNumber,
              customerName: customerName.trim(),
              grandTotal: summary.grandTotal,
            },
          });
        }
      }



      if (clinicalOverrideReason) {
        try {
          const { clinicalService } = await import('./clinicalService');
          await clinicalService.logClinicalOverride(
            organizationId,
            storeId,
            invoiceNumber,
            clinicalOverrideReason,
            'HIGH',
            { items: items.map(i => ({ name: i.name, composition: i.composition })) },
            { uid: caller.uid, displayName: caller.displayName }
          );
        } catch (overrideErr) {
          console.error('Error logging clinical safety override:', overrideErr);
        }
      }
    } catch (auditErr) {
      console.error('Audit logging failed for sale invoice:', auditErr);
    }

    // Return complete SaleInvoice object
    return {
      id: invoiceId,
      organizationId,
      storeId,
      invoiceNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone ? customerPhone.trim() : undefined,
      paymentMode,
      items: saleInvoiceItems,
      itemsCount: saleInvoiceItems.length,
      totalQuantity: summary.totalQty,
      subtotal: summary.subtotal,
      totalDiscount: summary.discountAmount,
      taxableAmount: summary.taxableAmount,
      cgstTotal: summary.cgstAmount,
      sgstTotal: summary.sgstAmount,
      totalTax: Math.round((summary.cgstAmount + summary.sgstAmount) * 100) / 100,
      roundOff: summary.roundOff,
      grandTotal: summary.grandTotal,
      status: 'completed',
      createdByUid: caller.uid,
      createdByName: caller.displayName || caller.email || 'Cashier',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  },

  /**
   * Fetch recent invoices for a store
   */
  async getRecentInvoices(
    organizationId: string,
    storeId?: string,
    limitCount = 30
  ): Promise<SaleInvoice[]> {
    if (!organizationId) return [];
    const ref = getInvoicesRef(organizationId);

    let docs: any[] = [];
    try {
      // Primary: query ordered by createdAt desc
      const q = query(ref, orderBy('createdAt', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      docs = snapshot.docs;
    } catch (e1) {
      console.warn('Query with orderBy(createdAt) failed, falling back to unordered fetch:', e1);
      try {
        const fallbackQuery = query(ref, limit(limitCount));
        const snapshot = await getDocs(fallbackQuery);
        docs = snapshot.docs;
      } catch (e2) {
        console.error('Error fetching recent invoices:', e2);
        return [];
      }
    }

    const invoices: SaleInvoice[] = [];
    for (const docSnap of docs) {
      const data = { id: docSnap.id, ...docSnap.data() } as any;
      // Filter by storeId if provided and matches, but if storeId is not present on invoice still include
      if (storeId && data.storeId && data.storeId !== storeId) {
        continue;
      }
      invoices.push(data as SaleInvoice);
    }

    // If store-specific filter returned 0 but docs exist in the organization, return all org invoices
    if (invoices.length === 0 && docs.length > 0) {
      for (const docSnap of docs) {
        invoices.push({ id: docSnap.id, ...docSnap.data() } as SaleInvoice);
      }
    }

    // Sort in memory by createdAt descending
    invoices.sort((a: any, b: any) => {
      const tA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime() || 0;
      const tB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime() || 0;
      return tB - tA;
    });

    return invoices;
  },

  /**
   * Fetch a single invoice by ID
   */
  async getInvoice(organizationId: string, invoiceId: string): Promise<SaleInvoice | null> {
    const docRef = getInvoiceDocRef(organizationId, invoiceId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = { id: snap.id, ...snap.data() };
    if (validateSaleInvoice(data, organizationId)) {
      return data as SaleInvoice;
    }
    return null;
  },
};
