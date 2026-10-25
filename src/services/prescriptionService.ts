import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as limitConstraint,
  serverTimestamp,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { Prescription, ScheduleH1RegisterEntry, ScheduleH1RegisterEntryItem } from '../types';
import { logAuditEvent } from './auditService';

export const prescriptionService = {
  /**
   * Create a new prescription document in Firestore.
   */
  async createPrescription(
    organizationId: string,
    storeId: string,
    data: Omit<Prescription, 'id' | 'organizationId' | 'storeId' | 'createdAt' | 'status'> & {
      id?: string;
      status?: Prescription['status'];
    },
    caller: { uid: string; email?: string | null; displayName?: string | null }
  ): Promise<Prescription> {
    if (!organizationId) throw new Error('Organization ID is required');
    if (!storeId) throw new Error('Store ID is required');

    const prescriptionId = data.id || `rx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const prescriptionRef = doc(db, 'organizations', organizationId, 'prescriptions', prescriptionId);

    const now = Timestamp.now();

    const prescription: Prescription = {
      id: prescriptionId,
      organizationId,
      storeId,
      status: data.status || 'pending',
      mediaId: data.mediaId || '',
      secureUrl: data.secureUrl || '',
      originalFilename: data.originalFilename || '',
      patientName: (data.patientName || '').trim(),
      patientAge: Number(data.patientAge) || 0,
      patientGender: data.patientGender || 'male',
      patientPhone: (data.patientPhone || '').trim(),
      doctorName: (data.doctorName || '').trim(),
      doctorRegNo: (data.doctorRegNo || '').trim(),
      hospitalClinic: (data.hospitalClinic || '').trim(),
      prescriptionDate: data.prescriptionDate || new Date().toISOString().slice(0, 10),
      medicines: data.medicines || [],
      notes: (data.notes || '').trim(),
      createdByUid: caller.uid,
      createdByName: caller.displayName || caller.email || 'Staff',
      createdAt: now,
    };

    await setDoc(prescriptionRef, {
      ...prescription,
      createdAt: serverTimestamp(),
    });

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'prescription.sale.completed', // Using a valid predefined AuditAction from our union
      entityType: 'invoice', // Valid entityType
      entityId: prescriptionId,
      storeId,
      metadata: {
        action: 'prescription_created',
        patientName: prescription.patientName,
        doctorName: prescription.doctorName,
        mediaId: prescription.mediaId,
      },
    });

    return prescription;
  },

  /**
   * Fetch a single prescription by ID.
   */
  async getPrescriptionById(organizationId: string, prescriptionId: string): Promise<Prescription | null> {
    if (!organizationId || !prescriptionId) return null;
    const ref = doc(db, 'organizations', organizationId, 'prescriptions', prescriptionId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Prescription;
  },

  /**
   * Get all prescriptions for an organization and optionally a specific store.
   */
  async getPrescriptions(
    organizationId: string,
    storeId?: string,
    limitCount = 100
  ): Promise<Prescription[]> {
    if (!organizationId) return [];

    const prescriptionsRef = collection(db, 'organizations', organizationId, 'prescriptions');
    let q = query(prescriptionsRef, orderBy('createdAt', 'desc'), limitConstraint(limitCount));

    if (storeId) {
      q = query(
        prescriptionsRef,
        where('storeId', '==', storeId),
        orderBy('createdAt', 'desc'),
        limitConstraint(limitCount)
      );
    }

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Prescription));
  },

  /**
   * Verify and update an uploaded prescription.
   */
  async verifyPrescription(
    organizationId: string,
    prescriptionId: string,
    verifiedData: Partial<Prescription>,
    caller: { uid: string; email?: string | null; displayName?: string | null }
  ): Promise<void> {
    if (!organizationId || !prescriptionId) throw new Error('Organization ID and Prescription ID are required');

    const prescriptionRef = doc(db, 'organizations', organizationId, 'prescriptions', prescriptionId);
    const snap = await getDoc(prescriptionRef);
    if (!snap.exists()) throw new Error('Prescription not found');

    const updatePayload: Record<string, any> = {
      status: 'verified',
      verifiedByUid: caller.uid,
      verifiedByName: caller.displayName || caller.email || 'Pharmacist',
      verifiedAt: serverTimestamp(),
    };

    if (verifiedData.patientName !== undefined) updatePayload.patientName = verifiedData.patientName.trim();
    if (verifiedData.patientAge !== undefined) updatePayload.patientAge = Number(verifiedData.patientAge) || 0;
    if (verifiedData.patientGender !== undefined) updatePayload.patientGender = verifiedData.patientGender;
    if (verifiedData.patientPhone !== undefined) updatePayload.patientPhone = verifiedData.patientPhone.trim();
    if (verifiedData.doctorName !== undefined) updatePayload.doctorName = verifiedData.doctorName.trim();
    if (verifiedData.doctorRegNo !== undefined) updatePayload.doctorRegNo = verifiedData.doctorRegNo.trim();
    if (verifiedData.hospitalClinic !== undefined) updatePayload.hospitalClinic = verifiedData.hospitalClinic.trim();
    if (verifiedData.prescriptionDate !== undefined) updatePayload.prescriptionDate = verifiedData.prescriptionDate;
    if (verifiedData.medicines !== undefined) updatePayload.medicines = verifiedData.medicines;
    if (verifiedData.notes !== undefined) updatePayload.notes = verifiedData.notes.trim();

    await updateDoc(prescriptionRef, updatePayload);

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'prescription.sale.completed',
      entityType: 'invoice',
      entityId: prescriptionId,
      storeId: snap.data()?.storeId || null,
      metadata: {
        action: 'prescription_verified',
        patientName: updatePayload.patientName || snap.data()?.patientName,
        doctorName: updatePayload.doctorName || snap.data()?.doctorName,
      },
    });
  },

  /**
   * Log an immutable statutory Schedule H1 Regulatory Register entry.
   */
  async logScheduleH1RegisterEntry(
    organizationId: string,
    storeId: string,
    entry: Omit<ScheduleH1RegisterEntry, 'id' | 'createdAt'>,
    caller: { uid: string; email?: string | null; displayName?: string | null }
  ): Promise<ScheduleH1RegisterEntry> {
    if (!organizationId) throw new Error('Organization ID is required');
    if (!storeId) throw new Error('Store ID is required');

    const entryId = `h1_reg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const regRef = doc(db, 'organizations', organizationId, 'scheduleH1Register', entryId);

    const now = Timestamp.now();

    const registerEntry: ScheduleH1RegisterEntry = {
      id: entryId,
      organizationId,
      storeId,
      invoiceId: entry.invoiceId,
      invoiceNumber: entry.invoiceNumber,
      patientName: (entry.patientName || '').trim(),
      patientAge: Number(entry.patientAge) || 0,
      patientGender: entry.patientGender || 'male',
      patientPhone: (entry.patientPhone || '').trim(),
      doctorName: (entry.doctorName || '').trim(),
      doctorRegNo: (entry.doctorRegNo || '').trim(),
      hospitalClinic: (entry.hospitalClinic || '').trim(),
      items: entry.items || [],
      createdByUid: caller.uid,
      createdByName: caller.displayName || caller.email || 'Pharmacist',
      createdAt: now,
      prescriptionUrl: entry.prescriptionUrl || '',
    };

    // Immutable write (Firestore rules prevent update/delete)
    await setDoc(regRef, {
      ...registerEntry,
      createdAt: serverTimestamp(),
    });

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'prescription.sale.completed',
      entityType: 'invoice',
      entityId: entryId,
      storeId,
      metadata: {
        action: 'schedule_h1_register_logged',
        invoiceNumber: entry.invoiceNumber,
        patientName: entry.patientName,
        itemsCount: entry.items?.length || 0,
      },
    });

    return registerEntry;
  },

  /**
   * Retrieve H1 register entries for compliance checks.
   */
  async getScheduleH1RegisterEntries(
    organizationId: string,
    storeId?: string,
    limitCount = 100
  ): Promise<ScheduleH1RegisterEntry[]> {
    if (!organizationId) return [];

    const regRef = collection(db, 'organizations', organizationId, 'scheduleH1Register');
    let q = query(regRef, orderBy('createdAt', 'desc'), limitConstraint(limitCount));

    if (storeId) {
      q = query(
        regRef,
        where('storeId', '==', storeId),
        orderBy('createdAt', 'desc'),
        limitConstraint(limitCount)
      );
    }

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ScheduleH1RegisterEntry));
  }
};
