import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  serverTimestamp, 
  orderBy, 
  runTransaction
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { 
  Account, 
  JournalEntry, 
  JournalEntryLine, 
  JournalEntrySourceType 
} from '../types/accounting';
import { logAuditEvent } from './auditService';

export const accountingService = {
  async getAccounts(orgId: string): Promise<Account[]> {
    const q = query(collection(db, 'organizations', orgId, 'accounts'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Account);
  },

  async seedDefaultAccounts(orgId: string, uid: string): Promise<void> {
    const accounts: Partial<Account>[] = [
      { name: 'Cash', type: 'ASSET', subType: 'CURRENT', systemAccount: 'CASH', balance: 0, currency: 'INR', isActive: true },
      { name: 'Bank Account', type: 'ASSET', subType: 'CURRENT', systemAccount: 'BANK', balance: 0, currency: 'INR', isActive: true },
      { name: 'Accounts Receivable', type: 'ASSET', subType: 'CURRENT', systemAccount: 'RECEIVABLES', balance: 0, currency: 'INR', isActive: true },
      { name: 'Inventory', type: 'ASSET', subType: 'CURRENT', systemAccount: 'INVENTORY', balance: 0, currency: 'INR', isActive: true },
      { name: 'Accounts Payable', type: 'LIABILITY', subType: 'CURRENT', systemAccount: 'PAYABLES', balance: 0, currency: 'INR', isActive: true },
      { name: 'Output CGST', type: 'LIABILITY', subType: 'CURRENT', systemAccount: 'OUTPUT_CGST', balance: 0, currency: 'INR', isActive: true },
      { name: 'Output SGST', type: 'LIABILITY', subType: 'CURRENT', systemAccount: 'OUTPUT_SGST', balance: 0, currency: 'INR', isActive: true },
      { name: 'Output IGST', type: 'LIABILITY', subType: 'CURRENT', systemAccount: 'OUTPUT_IGST', balance: 0, currency: 'INR', isActive: true },
      { name: 'Input CGST', type: 'ASSET', subType: 'CURRENT', systemAccount: 'INPUT_CGST', balance: 0, currency: 'INR', isActive: true },
      { name: 'Input SGST', type: 'ASSET', subType: 'CURRENT', systemAccount: 'INPUT_SGST', balance: 0, currency: 'INR', isActive: true },
      { name: 'Input IGST', type: 'ASSET', subType: 'CURRENT', systemAccount: 'INPUT_IGST', balance: 0, currency: 'INR', isActive: true },
      { name: 'Sales Revenue', type: 'REVENUE', subType: 'OPERATING', systemAccount: 'SALES', balance: 0, currency: 'INR', isActive: true },
      { name: 'Sales Returns', type: 'REVENUE', subType: 'CONTRA', systemAccount: 'SALES_RETURNS', balance: 0, currency: 'INR', isActive: true },
      { name: 'Cost of Goods Sold', type: 'EXPENSE', subType: 'DIRECT', systemAccount: 'COGS', balance: 0, currency: 'INR', isActive: true },
      { name: 'Purchase Discounts', type: 'REVENUE', subType: 'OTHER', systemAccount: 'PURCHASE_DISCOUNTS', balance: 0, currency: 'INR', isActive: true },
    ];

    for (const acc of accounts) {
      const ref = doc(collection(db, 'organizations', orgId, 'accounts'));
      await setDoc(ref, {
        ...acc,
        id: ref.id,
        organizationId: orgId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  },

  async postJournalEntry(
    orgId: string, 
    entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt' | 'status'>, 
    uid: string
  ): Promise<string> {
    const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit, 0);
    
    // Using 0.01 tolerance for floating point math
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Journal entry unbalanced. Debits: ${totalDebit}, Credits: ${totalCredit}`);
    }

    const ref = doc(collection(db, 'organizations', orgId, 'journalEntries'));
    
    await setDoc(ref, {
      ...entry,
      id: ref.id,
      organizationId: orgId,
      status: 'POSTED',
      postedByUid: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await logAuditEvent(orgId, {
      actorUid: uid,
      action: 'journal.created',
      entityType: 'journal_entry',
      entityId: ref.id,
      metadata: { details: `Posted journal entry for ${entry.sourceType} ${entry.sourceId}` }
    });

    return ref.id;
  },

  async getJournalEntries(orgId: string, financialYear?: string): Promise<JournalEntry[]> {
    const constraints = [];
    if (financialYear) constraints.push(where('financialYear', '==', financialYear));
    const q = query(collection(db, 'organizations', orgId, 'journalEntries'), ...constraints, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as JournalEntry);
  }
};
