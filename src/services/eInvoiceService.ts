import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc,
  query, 
  where, 
  serverTimestamp, 
  orderBy, 
  runTransaction
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { EInvoiceRecord } from '../types/gst';
import { logAuditEvent } from './auditService';
import { gstService } from './gstService';

export const eInvoiceService = {
  async getInvoiceRecords(orgId: string, storeId?: string): Promise<EInvoiceRecord[]> {
    const constraints = [];
    if (storeId) constraints.push(where('storeId', '==', storeId));
    const q = query(collection(db, 'organizations', orgId, 'eInvoiceRecords'), ...constraints, orderBy('documentDate', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as EInvoiceRecord);
  },
  
  async getRecordForDocument(orgId: string, documentNumber: string): Promise<EInvoiceRecord | null> {
    const q = query(collection(db, 'organizations', orgId, 'eInvoiceRecords'), where('documentNumber', '==', documentNumber));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as EInvoiceRecord;
  },

  async generateIRN(orgId: string, storeId: string, sourceId: string, sourceType: string, documentNumber: string, documentDate: string, payload: any, uid: string): Promise<string> {
    const config = await gstService.getEInvoiceConfig(orgId);
    
    if (!config) {
      throw new Error('E-Invoice Configuration not found.');
    }
    
    if (!config.enableEInvoiceGeneration) {
      throw new Error('E-Invoice Generation is not enabled for this organization.');
    }
    
    const existing = await this.getRecordForDocument(orgId, documentNumber);
    if (existing && existing.status !== 'FAILED') {
      throw new Error(`IRN already generated or in progress for document ${documentNumber}.`);
    }

    const ref = existing ? doc(db, 'organizations', orgId, 'eInvoiceRecords', existing.id) : doc(collection(db, 'organizations', orgId, 'eInvoiceRecords'));
    
    await setDoc(ref, {
      id: ref.id,
      organizationId: orgId,
      storeId,
      sourceId,
      sourceType,
      documentNumber,
      documentDate,
      status: 'VALIDATING',
      attemptedAt: serverTimestamp(),
      provider: config.defaultIRPProvider,
      createdAt: existing ? existing.createdAt : serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    await logAuditEvent(orgId, {
      actorUid: uid,
      action: 'einvoice.validation.started',
      entityType: 'einvoice_record',
      entityId: ref.id,
      metadata: { documentNumber }
    });

    return ref.id;
  },
  
  // This will be called by background function/worker after IRP responds
  async recordIRNSuccess(orgId: string, recordId: string, irn: string, ackNo: string, ackDate: string, signedInvoice: string, signedQRCode: string, uid: string) {
    const ref = doc(db, 'organizations', orgId, 'eInvoiceRecords', recordId);
    await updateDoc(ref, {
      status: 'GENERATED',
      irn,
      acknowledgementNumber: ackNo,
      acknowledgementDate: ackDate,
      signedInvoice,
      signedQRCode,
      generatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    await logAuditEvent(orgId, {
      actorUid: uid,
      action: 'einvoice.generated',
      entityType: 'einvoice_record',
      entityId: recordId,
      metadata: { irn, ackNo }
    });
  }
};
