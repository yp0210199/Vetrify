import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp, 
  Timestamp, 
  orderBy, 
  runTransaction
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { 
  GSTLedgerEntry, 
  EInvoiceConfiguration, 
  EInvoiceRecord, 
  GSTFilingPeriod, 
  HSNSummary,
  GSTSupplyType
} from '../types/gst';
import { logAuditEvent } from './auditService';
import { notificationService } from './notificationService';

export const gstService = {
  // Ledger
  async createLedgerEntry(orgId: string, entry: Omit<GSTLedgerEntry, 'id' | 'createdAt'>): Promise<string> {
    const ref = doc(collection(db, 'organizations', orgId, 'gstLedgerEntries'));
    const now = serverTimestamp();
    await setDoc(ref, {
      ...entry,
      id: ref.id,
      organizationId: orgId,
      createdAt: now
    });
    return ref.id;
  },

  async getLedgerEntries(orgId: string, storeId?: string, taxPeriod?: string): Promise<GSTLedgerEntry[]> {
    const constraints = [];
    if (storeId) constraints.push(where('storeId', '==', storeId));
    if (taxPeriod) constraints.push(where('taxPeriod', '==', taxPeriod));
    const q = query(collection(db, 'organizations', orgId, 'gstLedgerEntries'), ...constraints, orderBy('documentDate', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as GSTLedgerEntry);
  },

  // E-Invoice Configuration
  async getEInvoiceConfig(orgId: string): Promise<EInvoiceConfiguration | null> {
    const snap = await getDocs(query(collection(db, 'organizations', orgId, 'eInvoiceConfiguration')));
    if (snap.empty) return null;
    return snap.docs[0].data() as EInvoiceConfiguration;
  },

  async saveEInvoiceConfig(orgId: string, payload: Partial<EInvoiceConfiguration>, uid: string) {
    const snap = await getDocs(query(collection(db, 'organizations', orgId, 'eInvoiceConfiguration')));
    let ref;
    let action: any = 'gst.configuration.updated';
    if (snap.empty) {
      ref = doc(collection(db, 'organizations', orgId, 'eInvoiceConfiguration'));
    } else {
      ref = doc(db, 'organizations', orgId, 'eInvoiceConfiguration', snap.docs[0].id);
    }
    
    await setDoc(ref, {
      ...payload,
      id: ref.id,
      organizationId: orgId,
      updatedAt: serverTimestamp(),
      updatedBy: uid
    }, { merge: true });

    await logAuditEvent(orgId, {
      actorUid: uid,
      action: action,
      entityType: 'einvoice_configuration',
      entityId: ref.id,
      metadata: { details: 'E-Invoice Configuration updated' }
    });
  },

  // Periods
  async getFilingPeriods(orgId: string, financialYear?: string): Promise<GSTFilingPeriod[]> {
    const constraints = [];
    if (financialYear) constraints.push(where('financialYear', '==', financialYear));
    const q = query(collection(db, 'organizations', orgId, 'gstFilingPeriods'), ...constraints, orderBy('periodStart', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as GSTFilingPeriod);
  },
  
  // Tax Math
  calculateTaxes(taxableValue: number, gstRate: number, supplierGstin: string, recipientGstin?: string) {
    if (!taxableValue) taxableValue = 0;
    if (!gstRate) gstRate = 0;
    
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    
    const isInterState = recipientGstin && supplierGstin && recipientGstin.substring(0, 2) !== supplierGstin.substring(0, 2);
    
    if (isInterState) {
      igst = (taxableValue * gstRate) / 100;
    } else {
      cgst = (taxableValue * (gstRate / 2)) / 100;
      sgst = (taxableValue * (gstRate / 2)) / 100;
    }
    
    const totalTax = cgst + sgst + igst;
    
    return {
      taxableValue: Number(taxableValue.toFixed(2)),
      cgst: Number(cgst.toFixed(2)),
      sgst: Number(sgst.toFixed(2)),
      igst: Number(igst.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      isInterState: !!isInterState
    };
  }
};
