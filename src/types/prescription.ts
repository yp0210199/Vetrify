import { Timestamp } from 'firebase/firestore';

export interface PrescribedMedicine {
  name: string;
  strength?: string;
  dosage?: string;
  duration?: string;
  matchedProductId?: string | null;
  matchScore?: number; // 0 to 100
}

export interface Prescription {
  id: string;
  organizationId: string;
  storeId: string;
  status: 'pending' | 'verified' | 'rejected';
  
  // Link to ImageKit uploaded asset
  mediaId?: string;
  secureUrl?: string;
  originalFilename?: string;
  
  // OCR Extracted & Verified details
  patientName: string;
  patientAge: number;
  patientGender: 'male' | 'female' | 'other';
  patientPhone?: string;
  
  doctorName: string;
  doctorRegNo: string;
  hospitalClinic?: string;
  prescriptionDate: string; // YYYY-MM-DD
  
  medicines: PrescribedMedicine[];
  notes?: string;
  
  // Audit details
  createdByUid: string;
  createdByName?: string;
  createdAt: Timestamp;
  verifiedByUid?: string;
  verifiedByName?: string;
  verifiedAt?: Timestamp | null;
}

export interface ScheduleH1RegisterEntryItem {
  productId: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  manufacturerName?: string;
  schedule: 'H' | 'H1' | 'X';
}

export interface ScheduleH1RegisterEntry {
  id: string;
  organizationId: string;
  storeId: string;
  invoiceId: string;
  invoiceNumber: string;
  
  // Patient Details
  patientName: string;
  patientAge: number;
  patientGender: 'male' | 'female' | 'other';
  patientPhone?: string;
  
  // Doctor Details
  doctorName: string;
  doctorRegNo: string;
  hospitalClinic?: string;
  
  // Prescribed restricted drugs sold
  items: ScheduleH1RegisterEntryItem[];
  
  // Timestamp and UID of verifying pharmacist
  createdByUid: string;
  createdByName?: string;
  createdAt: Timestamp;
  
  // Link to uploaded prescription (ImageKit URL)
  prescriptionUrl?: string;
}
