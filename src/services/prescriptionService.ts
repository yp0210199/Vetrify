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
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import {
  Prescription,
  CreatePrescriptionPayload,
  ScheduleH1RegisterEntry,
} from '../types/prescription';
import { logAuditEvent } from './auditService';

function getPrescriptionsRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'prescriptions');
}

function getPrescriptionDocRef(organizationId: string, prescriptionId: string) {
  return doc(db, 'organizations', organizationId, 'prescriptions', prescriptionId);
}

function getScheduleH1Ref(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'scheduleH1Register');
}

export const prescriptionService = {
  /**
   * Create and upload a digital prescription record
   */
  async createPrescription(
    organizationId: string,
    storeId: string,
    payload: CreatePrescriptionPayload,
    caller?: { uid: string; displayName?: string | null }
  ): Promise<Prescription> {
    const rxRef = doc(getPrescriptionsRef(organizationId));
    const now = Timestamp.now();

    const prescription: Prescription = {
      id: rxRef.id,
      organizationId,
      storeId,
      patientName: payload.patientName || 'Customer',
      patientAge: payload.patientAge || 0,
      patientGender: payload.patientGender || 'other',
      patientPhone: payload.patientPhone || '',
      doctorName: payload.doctorName || 'Prescribing Doctor',
      doctorRegNo: payload.doctorRegNo || 'N/A',
      hospitalClinic: payload.hospitalClinic || '',
      prescriptionDate: payload.prescriptionDate || new Date().toISOString().slice(0, 10),
      originalFilename: payload.originalFilename || 'prescription.pdf',
      secureUrl: payload.secureUrl,
      medicines: payload.medicines || [],
      status: payload.status || 'pending',
      createdByUid: caller?.uid || payload.createdByUid || 'unknown',
      createdByName: caller?.displayName || payload.createdByName || 'Customer',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(rxRef, prescription);

    try {
      await logAuditEvent(organizationId, {
        actorUid: caller?.uid || 'system',
        actorDisplayName: caller?.displayName || 'Customer',
        action: 'prescription.uploaded',
        entityType: 'prescription',
        entityId: rxRef.id,
        storeId,
        metadata: {
          doctorName: payload.doctorName,
          filename: payload.originalFilename,
        },
      });
    } catch (e) {
      console.warn('Audit log failed for prescription creation:', e);
    }

    return prescription;
  },

  /**
   * Get all prescriptions with optional filtering
   */
  async getPrescriptions(
    organizationId: string,
    filter?: { storeId?: string; status?: string; customerId?: string }
  ): Promise<Prescription[]> {
    if (!organizationId) return [];

    try {
      const colRef = getPrescriptionsRef(organizationId);
      const constraints: any[] = [];

      if (filter?.storeId) {
        constraints.push(where('storeId', '==', filter.storeId));
      }
      if (filter?.status) {
        constraints.push(where('status', '==', filter.status));
      }
      if (filter?.customerId) {
        constraints.push(where('createdByUid', '==', filter.customerId));
      }

      const q = query(colRef, ...constraints);
      const snap = await getDocs(q);

      const items: Prescription[] = [];
      snap.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as Prescription);
      });

      return items;
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
      return [];
    }
  },

  /**
   * Get a single prescription by ID
   */
  async getPrescription(organizationId: string, prescriptionId: string): Promise<Prescription | null> {
    if (!organizationId || !prescriptionId) return null;

    try {
      const snap = await getDoc(getPrescriptionDocRef(organizationId, prescriptionId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as Prescription;
    } catch (err) {
      console.error('Error fetching prescription:', err);
      return null;
    }
  },

  /**
   * Verify or reject a prescription by a registered pharmacist
   */
  async verifyPrescription(
    organizationId: string,
    prescriptionId: string,
    caller: { uid: string; displayName?: string },
    approved: boolean,
    notes?: string
  ): Promise<void> {
    const rxRef = getPrescriptionDocRef(organizationId, prescriptionId);
    await updateDoc(rxRef, {
      status: approved ? 'verified' : 'rejected',
      verificationNotes: notes || '',
      verifiedByUid: caller.uid,
      verifiedByName: caller.displayName || 'Pharmacist',
      verifiedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  },

  /**
   * Get Schedule H / H1 / X statutory compliance register entries
   */
  async getScheduleH1RegisterEntries(
    organizationId: string,
    storeId?: string
  ): Promise<ScheduleH1RegisterEntry[]> {
    if (!organizationId) return [];

    try {
      const colRef = getScheduleH1Ref(organizationId);
      const constraints: any[] = [];

      if (storeId) {
        constraints.push(where('storeId', '==', storeId));
      }

      const q = query(colRef, ...constraints);
      const snap = await getDocs(q);

      const entries: ScheduleH1RegisterEntry[] = [];
      snap.forEach((d) => {
        entries.push({ id: d.id, ...d.data() } as ScheduleH1RegisterEntry);
      });

      return entries;
    } catch (err) {
      console.error('Error fetching Schedule H1 register entries:', err);
      return [];
    }
  },

  /**
   * Record entry into statutory Schedule H1 register
   */
  async recordScheduleH1Entry(
    organizationId: string,
    entry: Omit<ScheduleH1RegisterEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const entryRef = doc(getScheduleH1Ref(organizationId));
    const now = Timestamp.now();

    const fullRecord: ScheduleH1RegisterEntry = {
      ...entry,
      id: entryRef.id,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(entryRef, fullRecord);
    return entryRef.id;
  },
};

export default prescriptionService;
