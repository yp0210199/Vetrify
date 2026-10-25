import { Timestamp, FieldValue } from 'firebase/firestore';

export type BatchStatus = 'active' | 'depleted' | 'expired' | 'quarantined' | 'recalled' | 'archived';

export interface PharmacyBatch {
  id: string;
  organizationId: string;
  storeId: string;
  productId: string;
  productName?: string;             // De-normalized for display
  productSku?: string;              // De-normalized for display
  batchNumber: string;
  normalizedBatchNumber: string;
  manufacturingDate: Timestamp;
  expiryDate: Timestamp;
  purchasePrice: number;
  mrp: number;
  salePrice: number;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  supplierId?: string;
  supplierName?: string;
  status: BatchStatus;
  storageLocation?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdByUid: string;
  updatedByUid: string;
}

export type PharmacyBatchCreatePayload = Omit<
  PharmacyBatch,
  'createdAt' | 'updatedAt'
> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

export type PharmacyBatchUpdatePayload = Partial<
  Omit<PharmacyBatch, 'id' | 'organizationId' | 'productId' | 'storeId' | 'createdAt' | 'createdByUid'>
> & {
  updatedAt: FieldValue;
  updatedByUid: string;
};
