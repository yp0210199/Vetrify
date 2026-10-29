import { Timestamp } from 'firebase/firestore';

export type ScheduleType = 'H' | 'H1' | 'X' | 'G' | 'OTC' | string;

export type PrescriptionStatus = 'pending' | 'verified' | 'rejected' | 'dispensed';

export interface PrescriptionMedicineItem {
  medicineName: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
  schedule?: ScheduleType;
}

export interface Prescription {
  id: string;
  organizationId: string;
  storeId: string;
  patientName: string;
  patientAge?: number | string;
  patientGender?: 'male' | 'female' | 'other' | string;
  patientPhone?: string;
  doctorName: string;
  doctorRegNo: string;
  hospitalClinic?: string;
  prescriptionDate: string;
  originalFilename?: string;
  secureUrl: string;
  medicines?: PrescriptionMedicineItem[];
  status: PrescriptionStatus;
  verificationNotes?: string;
  verifiedByUid?: string;
  verifiedByName?: string;
  verifiedAt?: Timestamp | string | null;
  createdByUid: string;
  createdByName: string;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

export type CreatePrescriptionPayload = Omit<
  Prescription,
  'id' | 'organizationId' | 'storeId' | 'createdAt' | 'updatedAt'
>;

export interface ScheduleH1RegisterItem {
  productId: string;
  productName: string;
  schedule: ScheduleType;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
}

export interface ScheduleH1RegisterEntry {
  id: string;
  organizationId: string;
  storeId?: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate?: string;
  patientName: string;
  patientAge: number | string;
  patientGender: 'male' | 'female' | 'other' | string;
  patientPhone?: string;
  patientAddress?: string;
  doctorName: string;
  doctorRegNo: string;
  hospitalClinic?: string;
  prescriptionUrl?: string;
  prescriptionDate?: string;
  createdByName?: string;
  createdByUid?: string;
  items: ScheduleH1RegisterItem[];
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}
