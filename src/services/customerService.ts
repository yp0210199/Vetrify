import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as limitConstraint,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import {
  Customer,
  CustomerLedgerEntry,
  CustomerPayment,
  PaymentMethod,
  CustomerStatus,
} from '../types/firestore';
import {
  validateCustomer,
  validateCustomerLedgerEntry,
  validateCustomerPayment,
} from '../lib/firebase/validators';
import { logAuditEvent } from './auditService';

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  dateOfBirth?: string;
  gender?: string;
  notes?: string;
  creditEnabled?: boolean;
  creditLimit?: number;
}

export interface RecordCustomerPaymentPayload {
  customerId: string;
  amount: number;
  paymentMode: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  storeId?: string;
}

function getCustomersRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'customers');
}

function getCustomerDocRef(organizationId: string, customerId: string) {
  return doc(db, 'organizations', organizationId, 'customers', customerId);
}

function getCustomerLedgerRef(organizationId: string, customerId: string) {
  return collection(db, 'organizations', organizationId, 'customers', customerId, 'ledger');
}

function getCustomerPaymentsRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'customerPayments');
}

export const customerService = {
  /**
   * Create a new customer record
   */
  async createCustomer(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: CreateCustomerPayload
  ): Promise<Customer> {
    if (!organizationId) throw new Error('Organization ID is required');
    if (!payload.name || !payload.name.trim()) throw new Error('Customer name is required');
    if (!payload.phone || !payload.phone.trim()) throw new Error('Customer phone is required');

    const customerId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const customerRef = getCustomerDocRef(organizationId, customerId);

    const customerData: Record<string, any> = {
      id: customerId,
      organizationId,
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      alternatePhone: payload.alternatePhone?.trim() || null,
      email: payload.email?.trim() || null,
      address: payload.address?.trim() || null,
      city: payload.city?.trim() || null,
      state: payload.state?.trim() || null,
      pincode: payload.pincode?.trim() || null,
      dateOfBirth: payload.dateOfBirth || null,
      gender: payload.gender || null,
      notes: payload.notes?.trim() || null,
      creditEnabled: payload.creditEnabled ?? false,
      creditLimit: payload.creditLimit ?? 0,
      currentOutstanding: 0,
      status: 'active',
      createdByUid: caller.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!validateCustomer(customerData, organizationId)) {
      throw new Error('Customer payload validation failed.');
    }

    await setDoc(customerRef, customerData);

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'customer.created',
      entityType: 'customer',
      entityId: customerId,
      storeId: null,
      metadata: {
        name: payload.name,
        phone: payload.phone,
        creditEnabled: payload.creditEnabled,
        creditLimit: payload.creditLimit,
      },
    });

    return {
      ...customerData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    } as Customer;
  },

  /**
   * Update an existing customer record
   */
  async updateCustomer(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    customerId: string,
    updates: Partial<CreateCustomerPayload> & { status?: CustomerStatus }
  ): Promise<void> {
    if (!organizationId) throw new Error('Organization ID is required');
    if (!customerId) throw new Error('Customer ID is required');

    const customerRef = getCustomerDocRef(organizationId, customerId);
    const snap = await getDoc(customerRef);
    if (!snap.exists()) {
      throw new Error('Customer record not found');
    }

    const existing = snap.data() as Customer;
    const isCreditLimitChanged =
      updates.creditLimit !== undefined && updates.creditLimit !== existing.creditLimit;

    const updateData: Record<string, any> = {
      updatedAt: serverTimestamp(),
      updatedByUid: caller.uid,
    };

    if (updates.name !== undefined) updateData.name = updates.name.trim();
    if (updates.phone !== undefined) updateData.phone = updates.phone.trim();
    if (updates.alternatePhone !== undefined) updateData.alternatePhone = updates.alternatePhone.trim() || null;
    if (updates.email !== undefined) updateData.email = updates.email.trim() || null;
    if (updates.address !== undefined) updateData.address = updates.address.trim() || null;
    if (updates.city !== undefined) updateData.city = updates.city.trim() || null;
    if (updates.state !== undefined) updateData.state = updates.state.trim() || null;
    if (updates.pincode !== undefined) updateData.pincode = updates.pincode.trim() || null;
    if (updates.notes !== undefined) updateData.notes = updates.notes.trim() || null;
    if (updates.creditEnabled !== undefined) updateData.creditEnabled = updates.creditEnabled;
    if (updates.creditLimit !== undefined) updateData.creditLimit = updates.creditLimit;
    if (updates.status !== undefined) updateData.status = updates.status;

    await updateDoc(customerRef, updateData);

    if (isCreditLimitChanged) {
      await logAuditEvent(organizationId, {
        actorUid: caller.uid,
        actorEmail: caller.email || null,
        actorDisplayName: caller.displayName || null,
        action: 'credit.limit.changed',
        entityType: 'customer',
        entityId: customerId,
        storeId: null,
        metadata: {
          previousLimit: existing.creditLimit,
          newLimit: updates.creditLimit,
          customerName: existing.name,
        },
      });
    }

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'customer.updated',
      entityType: 'customer',
      entityId: customerId,
      storeId: null,
      metadata: updates,
    });
  },

  /**
   * Get single customer by ID
   */
  async getCustomer(organizationId: string, customerId: string): Promise<Customer | null> {
    if (!organizationId || !customerId) return null;
    const snap = await getDoc(getCustomerDocRef(organizationId, customerId));
    if (!snap.exists()) return null;
    const data = { id: snap.id, ...snap.data() };
    if (validateCustomer(data, organizationId)) {
      return data as Customer;
    }
    return null;
  },

  /**
   * Search / List Customers for an Organization
   */
  async getCustomers(
    organizationId: string,
    options: {
      searchQuery?: string;
      status?: CustomerStatus;
      hasOutstandingOnly?: boolean;
      limitCount?: number;
    } = {}
  ): Promise<Customer[]> {
    if (!organizationId) return [];

    const ref = getCustomersRef(organizationId);
    let q = query(ref, orderBy('createdAt', 'desc'), limitConstraint(options.limitCount || 100));

    try {
      const snapshot = await getDocs(q);
      let customers: Customer[] = [];

      snapshot.docs.forEach((docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() };
        if (validateCustomer(data, organizationId)) {
          customers.push(data as Customer);
        }
      });

      // Filter in memory for search query or outstanding filter
      if (options.searchQuery && options.searchQuery.trim()) {
        const queryLower = options.searchQuery.trim().toLowerCase();
        customers = customers.filter(
          (c) =>
            c.name.toLowerCase().includes(queryLower) ||
            c.phone.includes(queryLower) ||
            c.id.toLowerCase().includes(queryLower)
        );
      }

      if (options.status) {
        customers = customers.filter((c) => c.status === options.status);
      }

      if (options.hasOutstandingOnly) {
        customers = customers.filter((c) => c.currentOutstanding > 0);
      }

      return customers;
    } catch (err) {
      console.error('Error fetching customers:', err);
      return [];
    }
  },

  /**
   * Fetch Customer Ledger Entries
   */
  async getCustomerLedger(organizationId: string, customerId: string): Promise<CustomerLedgerEntry[]> {
    if (!organizationId || !customerId) return [];

    const ref = getCustomerLedgerRef(organizationId, customerId);
    const q = query(ref, orderBy('createdAt', 'desc'), limitConstraint(200));

    try {
      const snapshot = await getDocs(q);
      const entries: CustomerLedgerEntry[] = [];
      snapshot.docs.forEach((docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() };
        if (validateCustomerLedgerEntry(data, organizationId)) {
          entries.push(data as CustomerLedgerEntry);
        }
      });
      return entries;
    } catch (err) {
      console.error('Error fetching customer ledger:', err);
      return [];
    }
  },

  /**
   * Record Customer Payment against outstanding balance atomically
   */
  async recordCustomerPayment(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: RecordCustomerPaymentPayload
  ): Promise<CustomerPayment> {
    const { customerId, amount, paymentMode, referenceNumber, notes, storeId } = payload;

    if (!organizationId) throw new Error('Organization ID is required');
    if (!customerId) throw new Error('Customer ID is required');
    if (amount <= 0) throw new Error('Payment amount must be greater than zero');

    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const receiptNumber = `RCPT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const customerRef = getCustomerDocRef(organizationId, customerId);
    const paymentRef = doc(db, 'organizations', organizationId, 'customerPayments', paymentId);
    const ledgerId = `ledger_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const ledgerRef = doc(db, 'organizations', organizationId, 'customers', customerId, 'ledger', ledgerId);

    let createdPayment: CustomerPayment | null = null;

    await runTransaction(db, async (tx) => {
      const customerSnap = await tx.get(customerRef);
      if (!customerSnap.exists()) {
        throw new Error('Customer not found');
      }

      const customer = { id: customerSnap.id, ...customerSnap.data() } as Customer;
      if (customer.organizationId !== organizationId) {
        throw new Error('Cross-tenant customer payment access prohibited');
      }

      const previousOutstanding = customer.currentOutstanding || 0;
      const remainingOutstanding = Math.max(0, previousOutstanding - amount);

      const paymentData: Record<string, any> = {
        id: paymentId,
        organizationId,
        customerId,
        customerName: customer.name,
        customerPhone: customer.phone || null,
        receiptNumber,
        amount,
        paymentMode,
        referenceNumber: referenceNumber?.trim() || null,
        notes: notes?.trim() || null,
        previousOutstanding,
        remainingOutstanding,
        storeId: storeId || null,
        createdByUid: caller.uid,
        createdByName: caller.displayName || caller.email || 'Staff',
        createdAt: serverTimestamp(),
      };

      if (!validateCustomerPayment(paymentData, organizationId)) {
        throw new Error('Malformed customer payment receipt.');
      }

      const ledgerData: Record<string, any> = {
        id: ledgerId,
        organizationId,
        customerId,
        type: 'payment_received',
        referenceId: paymentId,
        referenceNumber: receiptNumber,
        amount,
        creditAmount: 0,
        debitAmount: amount,
        runningBalance: remainingOutstanding,
        notes: notes?.trim() || `Payment received via ${paymentMode.toUpperCase()}`,
        storeId: storeId || null,
        createdByUid: caller.uid,
        createdAt: serverTimestamp(),
      };

      if (!validateCustomerLedgerEntry(ledgerData, organizationId)) {
        throw new Error('Malformed customer ledger entry.');
      }

      tx.set(paymentRef, paymentData);
      tx.set(ledgerRef, ledgerData);
      tx.update(customerRef, {
        currentOutstanding: remainingOutstanding,
        updatedByUid: caller.uid,
        updatedAt: serverTimestamp(),
      });

      createdPayment = {
        ...paymentData,
        createdAt: Timestamp.now(),
      } as CustomerPayment;
    });

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'credit.payment.received',
      entityType: 'customer_payment',
      entityId: paymentId,
      storeId: storeId || null,
      metadata: {
        customerId,
        receiptNumber,
        amount,
        paymentMode,
        previousOutstanding: createdPayment?.previousOutstanding,
        remainingOutstanding: createdPayment?.remainingOutstanding,
      },
    });

    return createdPayment!;
  },
  recordPayment: async (
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    customerId: string,
    payload: { amount: number; paymentMethod?: PaymentMethod; paymentMode?: PaymentMethod; referenceNumber?: string; notes?: string; storeId?: string }
  ) => {
    return customerService.recordCustomerPayment(organizationId, caller, {
      customerId,
      amount: payload.amount,
      paymentMode: payload.paymentMethod || payload.paymentMode || 'cash',
      referenceNumber: payload.referenceNumber,
      notes: payload.notes,
      storeId: payload.storeId,
    });
  },
};
