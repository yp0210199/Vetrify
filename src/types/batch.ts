import { Timestamp, FieldValue } from 'firebase/firestore';

export type BatchStatus = 'active' | 'depleted' | 'damaged' | 'reserved' | 'quarantined' | 'recalled' | 'archived';

/**
 * Primary Lot & Shade Tracking Document for Tiles & Sanitaryware
 */
export interface ProductLot {
  id: string;
  organizationId: string;
  storeId: string;
  productId: string;
  productName?: string;             // De-normalized for display
  productSku?: string;              // De-normalized for display
  
  // Lot & Shade Tracking for Tiles & Sanitaryware
  batchNumber: string;              // Lot / Batch Number e.g. "LOT-2026-04" or "SHADE-A12"
  shadeNumber?: string;             // Tile Shade Code e.g. "SHADE-A12" or "S-104"
  toneCode?: string;                // Tone Code e.g. "T-04"
  caliberCode?: string;             // Calibration Code e.g. "CAL-0"
  grade?: string;                   // Grade e.g. "Premium", "Standard"
  normalizedBatchNumber: string;
  
  manufacturingDate?: Timestamp;
  expiryDate?: Timestamp;           // Optional for adhesives/epoxy grout
  
  purchasePrice: number;            // Purchase Price per Box/Unit
  mrp: number;                      // MRP per Box/Unit
  salePrice: number;                // Sale Price per Box/Unit
  salePricePerSqFt?: number;        // Sale Price per Sq. Ft
  
  quantity: number;                 // Stock in Boxes/Units
  reservedQuantity: number;         // Reserved in Boxes/Units
  availableQuantity: number;        // Available in Boxes/Units
  totalSqFtAvailable?: number;      // Derived total Sq. Ft available
  
  supplierId?: string;
  supplierName?: string;
  status: BatchStatus;
  storageLocation?: string;         // Yard / Aisle / Rack e.g. "Godown A - Yard Slot 3"
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdByUid: string;
  updatedByUid: string;
}

export type TileLotBatch = ProductLot;
export type StockBatch = ProductLot;
export type PharmacyBatch = ProductLot; // Alias for backwards compatibility

export type ProductLotCreatePayload = Omit<
  ProductLot,
  'createdAt' | 'updatedAt'
> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

export type PharmacyBatchCreatePayload = ProductLotCreatePayload;

export type ProductLotUpdatePayload = Partial<
  Omit<ProductLot, 'id' | 'organizationId' | 'productId' | 'storeId' | 'createdAt' | 'createdByUid'>
> & {
  updatedAt: FieldValue;
  updatedByUid: string;
};

export type PharmacyBatchUpdatePayload = ProductLotUpdatePayload;
