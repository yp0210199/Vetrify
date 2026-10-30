import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { Customer, CustomerLedgerEntry, SaleInvoice } from '../types/firestore';
import {
  AgingBucketItem,
  CustomerAgingSummary,
  AgingPortfolioMetrics,
  PaymentReceiptPayload,
  StatementOfAccount,
} from '../types/collections';
import { validateCustomer, validateCustomerLedgerEntry } from '../lib/firebase/validators';
import { sanitizeFirestorePayload } from '../lib/firebase/queryUtils';
import { logAuditEvent } from './auditService';

export const collectionsService = {
  /**
   * Calculate customer receivables aging breakdown strictly using real Firestore data
   */
  async getCustomerAgingSummaries(organizationId: string): Promise<{
    summaries: CustomerAgingSummary[];
    metrics: AgingPortfolioMetrics;
  }> {
    if (!organizationId) {
      return {
        summaries: [],
        metrics: {
          totalReceivables: 0,
          totalCustomersCount: 0,
          overdueCustomersCount: 0,
          b0_30_total: 0,
          b31_60_total: 0,
          b61_90_total: 0,
          b90_plus_total: 0,
          highRiskAmount: 0,
          weightedAverageDaysOverdue: 0,
        },
      };
    }

    // 1. Fetch all customers of the organization
    const customersRef = collection(db, 'organizations', organizationId, 'customers');
    const customersSnap = await getDocs(customersRef);
    const validCustomers: Customer[] = [];

    customersSnap.docs.forEach((docSnap) => {
      const data = { id: docSnap.id, ...docSnap.data() };
      if (validateCustomer(data, organizationId)) {
        validCustomers.push(data as Customer);
      }
    });

    // 2. Fetch all credit sale invoices
    const invoicesRef = collection(db, 'organizations', organizationId, 'invoices');
    let allInvoices: SaleInvoice[] = [];
    try {
      const invoicesSnap = await getDocs(query(invoicesRef, orderBy('createdAt', 'desc')));
      invoicesSnap.docs.forEach((d) => {
        allInvoices.push({ id: d.id, ...d.data() } as SaleInvoice);
      });
    } catch {
      const invoicesSnap = await getDocs(invoicesRef);
      invoicesSnap.docs.forEach((d) => {
        allInvoices.push({ id: d.id, ...d.data() } as SaleInvoice);
      });
    }

    const now = Date.now();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    const summaries: CustomerAgingSummary[] = [];

    for (const customer of validCustomers) {
      const currentOutstanding = customer.currentOutstanding || 0;
      if (currentOutstanding <= 0) continue; // Only evaluate customers with active balance

      // Match invoices for this customer
      const customerInvoices = allInvoices
        .filter((inv) => inv.customerId === customer.id || (inv.customerName && inv.customerName.toLowerCase() === customer.name.toLowerCase()))
        .sort((a, b) => {
          const tA = (a.createdAt as any)?.toMillis?.() || new Date(a.createdAt as any || 0).getTime() || 0;
          const tB = (b.createdAt as any)?.toMillis?.() || new Date(b.createdAt as any || 0).getTime() || 0;
          return tA - tB; // Oldest first for FIFO
        });

      let remainingBalanceToBucket = currentOutstanding;
      const buckets = {
        b0_30: 0,
        b31_60: 0,
        b61_90: 0,
        b90_plus: 0,
      };

      let oldestInvoiceDays = 0;

      if (customerInvoices.length > 0) {
        // Iterate through invoices FIFO
        for (const inv of customerInvoices) {
          if (remainingBalanceToBucket <= 0) break;

          const invDateMillis =
            (inv.createdAt as any)?.toMillis?.() ||
            new Date(inv.createdAt as any || 0).getTime() ||
            now;
          const ageDays = Math.max(0, Math.floor((now - invDateMillis) / MS_PER_DAY));
          if (ageDays > oldestInvoiceDays) oldestInvoiceDays = ageDays;

          const invAmount = inv.grandTotal || 0;
          const portion = Math.min(remainingBalanceToBucket, invAmount);

          if (ageDays <= 30) {
            buckets.b0_30 += portion;
          } else if (ageDays <= 60) {
            buckets.b31_60 += portion;
          } else if (ageDays <= 90) {
            buckets.b61_90 += portion;
          } else {
            buckets.b90_plus += portion;
          }

          remainingBalanceToBucket -= portion;
        }

        // If any residual outstanding remains beyond identified invoices, allocate to oldest bucket
        if (remainingBalanceToBucket > 0) {
          buckets.b90_plus += remainingBalanceToBucket;
        }
      } else {
        // No invoice records found, treat current balance in 0-30 or oldest customer creation date
        const custDateMillis =
          (customer.createdAt as any)?.toMillis?.() ||
          new Date(customer.createdAt as any || 0).getTime() ||
          now;
        const custAgeDays = Math.max(0, Math.floor((now - custDateMillis) / MS_PER_DAY));
        oldestInvoiceDays = custAgeDays;

        if (custAgeDays <= 30) buckets.b0_30 = currentOutstanding;
        else if (custAgeDays <= 60) buckets.b31_60 = currentOutstanding;
        else if (custAgeDays <= 90) buckets.b61_90 = currentOutstanding;
        else buckets.b90_plus = currentOutstanding;
      }

      const totalOverdue = buckets.b31_60 + buckets.b61_90 + buckets.b90_plus;
      const creditLimit = customer.creditLimit || 0;
      const availableCredit = Math.max(0, creditLimit - currentOutstanding);

      summaries.push({
        customerId: customer.id,
        customerName: customer.name,
        phone: customer.phone,
        email: customer.email,
        gstin: (customer as any).gstin || null,
        siteAddress: customer.address || null,
        creditEnabled: Boolean(customer.creditEnabled),
        creditLimit,
        currentOutstanding,
        availableCredit,
        buckets,
        totalOverdue,
        oldestInvoiceDays,
        invoicesCount: customerInvoices.length,
      });
    }

    // Sort summaries by total outstanding descending
    summaries.sort((a, b) => b.currentOutstanding - a.currentOutstanding);

    // Compute portfolio metrics
    const b0_30_total = summaries.reduce((sum, s) => sum + s.buckets.b0_30, 0);
    const b31_60_total = summaries.reduce((sum, s) => sum + s.buckets.b31_60, 0);
    const b61_90_total = summaries.reduce((sum, s) => sum + s.buckets.b61_90, 0);
    const b90_plus_total = summaries.reduce((sum, s) => sum + s.buckets.b90_plus, 0);
    const totalReceivables = b0_30_total + b31_60_total + b61_90_total + b90_plus_total;
    const overdueCustomersCount = summaries.filter((s) => s.totalOverdue > 0).length;

    const weightedDaysSum = summaries.reduce(
      (sum, s) => sum + s.oldestInvoiceDays * s.currentOutstanding,
      0
    );
    const weightedAverageDaysOverdue =
      totalReceivables > 0 ? Math.round(weightedDaysSum / totalReceivables) : 0;

    return {
      summaries,
      metrics: {
        totalReceivables,
        totalCustomersCount: validCustomers.length,
        overdueCustomersCount,
        b0_30_total,
        b31_60_total,
        b61_90_total,
        b90_plus_total,
        highRiskAmount: b90_plus_total,
        weightedAverageDaysOverdue,
      },
    };
  },

  /**
   * Record Customer Payment Receipt with Ledger Entry & Cash/Bank balancing
   */
  async recordPaymentReceipt(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: PaymentReceiptPayload
  ): Promise<{ receiptNumber: string; remainingOutstanding: number }> {
    const { customerId, amount, paymentMode, referenceNumber, bankName, chequeNumber, clearingDate, notes, storeId } =
      payload;

    if (!organizationId) throw new Error('Organization ID required.');
    if (!customerId) throw new Error('Customer ID required.');
    if (amount <= 0) throw new Error('Receipt amount must be greater than zero.');

    const customerRef = doc(db, 'organizations', organizationId, 'customers', customerId);
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const receiptNumber = `RCPT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const ledgerId = `ledger_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ledgerRef = doc(db, 'organizations', organizationId, 'customers', customerId, 'ledger', ledgerId);
    const paymentDocRef = doc(db, 'organizations', organizationId, 'customerPayments', paymentId);

    let remainingOutstanding = 0;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(customerRef);
      if (!snap.exists()) throw new Error('Customer does not exist.');

      const customer = snap.data() as Customer;
      const prevOutstanding = customer.currentOutstanding || 0;
      remainingOutstanding = Math.max(0, prevOutstanding - amount);

      const noteText = notes?.trim() || `Receipt via ${paymentMode.toUpperCase()} ${referenceNumber ? `#${referenceNumber}` : ''}`;

      const paymentRecord = sanitizeFirestorePayload({
        id: paymentId,
        organizationId,
        customerId,
        customerName: customer.name,
        customerPhone: customer.phone,
        receiptNumber,
        amount,
        paymentMode,
        referenceNumber: referenceNumber?.trim() || null,
        bankName: bankName?.trim() || null,
        chequeNumber: chequeNumber?.trim() || null,
        clearingDate: clearingDate || null,
        notes: noteText,
        previousOutstanding: prevOutstanding,
        remainingOutstanding,
        storeId: storeId || null,
        createdByUid: caller.uid,
        createdByName: caller.displayName || caller.email || 'Cashier',
        createdAt: serverTimestamp(),
      });

      const ledgerEntry = sanitizeFirestorePayload({
        id: ledgerId,
        organizationId,
        customerId,
        type: 'payment_received',
        referenceId: paymentId,
        referenceNumber: receiptNumber,
        amount,
        creditAmount: 0,
        debitAmount: amount, // Payment reduces credit balance
        runningBalance: remainingOutstanding,
        notes: noteText,
        storeId: storeId || null,
        createdByUid: caller.uid,
        createdAt: serverTimestamp(),
      });

      tx.set(paymentDocRef, paymentRecord);
      tx.set(ledgerRef, ledgerEntry);
      tx.update(customerRef, {
        currentOutstanding: remainingOutstanding,
        updatedAt: serverTimestamp(),
        updatedByUid: caller.uid,
      });
    });

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'customer.payment.recorded',
      entityType: 'customer',
      entityId: customerId,
      storeId: storeId || null,
      metadata: {
        receiptNumber,
        amount,
        paymentMode,
        remainingOutstanding,
      },
    });

    return { receiptNumber, remainingOutstanding };
  },

  /**
   * Generate Statement of Account (SOA) for Customer / Builder
   */
  async generateStatementOfAccount(
    organizationId: string,
    customerId: string,
    orgMeta?: { name?: string; gstin?: string; phone?: string }
  ): Promise<StatementOfAccount | null> {
    if (!organizationId || !customerId) return null;

    const customerSnap = await getDoc(doc(db, 'organizations', organizationId, 'customers', customerId));
    if (!customerSnap.exists()) return null;
    const customer = { id: customerSnap.id, ...customerSnap.data() } as Customer;

    const ledgerRef = collection(db, 'organizations', organizationId, 'customers', customerId, 'ledger');
    let entries: CustomerLedgerEntry[] = [];

    try {
      const snap = await getDocs(query(ledgerRef, orderBy('createdAt', 'asc')));
      snap.docs.forEach((d) => {
        const item = { id: d.id, ...d.data() };
        if (validateCustomerLedgerEntry(item, organizationId)) {
          entries.push(item as CustomerLedgerEntry);
        }
      });
    } catch {
      const snap = await getDocs(ledgerRef);
      snap.docs.forEach((d) => {
        const item = { id: d.id, ...d.data() };
        if (validateCustomerLedgerEntry(item, organizationId)) {
          entries.push(item as CustomerLedgerEntry);
        }
      });
    }

    const totalDebits = entries.reduce((sum, e) => sum + (e.creditAmount || (e.type === 'credit_sale' ? e.amount : 0)), 0);
    const totalCredits = entries.reduce((sum, e) => sum + (e.debitAmount || (e.type === 'payment_received' ? e.amount : 0)), 0);
    const closingBalance = customer.currentOutstanding || (totalDebits - totalCredits);

    const firstDate = entries.length > 0 ? (entries[0].createdAt as any)?.toDate?.()?.toLocaleDateString('en-IN') || 'Beginning' : 'Beginning';
    const lastDate = new Date().toLocaleDateString('en-IN');

    return {
      organizationId,
      organizationName: orgMeta?.name || 'Vetrify Ceramic & Sanitary Showroom',
      organizationGstin: orgMeta?.gstin || '07AAAAA0000A1Z5',
      organizationPhone: orgMeta?.phone || '',
      customer,
      periodStart: firstDate,
      periodEnd: lastDate,
      openingBalance: 0,
      totalDebits,
      totalCredits,
      closingBalance,
      entries,
      generatedAt: new Date().toISOString(),
    };
  },

  /**
   * Format payment reminder message for WhatsApp & SMS with UPI pay link
   */
  generateReminderMessage(summary: CustomerAgingSummary, showroomName: string, upiId?: string): string {
    const amountStr = `₹${summary.currentOutstanding.toLocaleString('en-IN')}`;
    const overdueStr = summary.totalOverdue > 0 ? ` (Overdue: ₹${summary.totalOverdue.toLocaleString('en-IN')})` : '';

    let upiSection = '';
    if (upiId) {
      upiSection = `\n\nDirect UPI Payment Link: upi://pay?pa=${upiId}&pn=${encodeURIComponent(showroomName)}&am=${summary.currentOutstanding}&cu=INR`;
    }

    return `Dear ${summary.customerName},\n\nGreetings from ${showroomName}. This is a gentle reminder that your current outstanding ledger balance is ${amountStr}${overdueStr} for your site material supply.\n\nKindly arrange the payment at your earliest convenience to maintain continuous supply without dispatch holds.${upiSection}\n\nThank you for choosing ${showroomName}!`;
  },
};
