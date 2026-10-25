import { Timestamp, FieldValue } from 'firebase/firestore';

/**
 * ============================================================================
 * Phase 2 — Core Pharmacy Product & Master Data Foundation
 * ============================================================================
 */

export type ScheduleCategory = 'OTC' | 'H' | 'H1' | 'X' | 'G' | 'K' | 'Narcotic' | 'Controlled';

export type ProductType =
  | 'Allopathy'
  | 'Ayurvedic'
  | 'Homeopathy'
  | 'Surgicals'
  | 'FMCG'
  | 'Nutraceuticals'
  | 'Cosmetics'
  | 'General';

export type DosageForm =
  | 'Tablet'
  | 'Capsule'
  | 'Syrup'
  | 'Suspension'
  | 'Injection'
  | 'Ointment'
  | 'Cream'
  | 'Gel'
  | 'Drops'
  | 'Inhaler'
  | 'Respules'
  | 'Sachet'
  | 'Powder'
  | 'Lotion'
  | 'Spray'
  | 'Suppository'
  | 'Patch'
  | 'Kit'
  | 'Device'
  | 'Other';

export type ProductStatus = 'active' | 'inactive' | 'archived';

/**
 * Packaging & Unit Conversion Model
 */
export interface UnitPackaging {
  packUnit: string;        // e.g., 'Strip', 'Box', 'Bottle', 'Vial', 'Jar'
  baseUnit: string;        // e.g., 'Tablet', 'Capsule', 'ml', 'gm', 'Piece'
  conversionFactor: number; // e.g., 10 tablets per strip (must be > 0)
}

/**
 * Drug Classification / Schedule Metadata
 */
export interface DrugClassification {
  id: string;
  organizationId: string;
  code: string;              // e.g., 'SCH_H1'
  name: string;              // e.g., 'Schedule H1 Prescription Register Required'
  scheduleCategory: ScheduleCategory;
  requiresPrescription: boolean;
  requiresDoctorLicense: boolean;
  requiresPatientIdentity: boolean;
  requiresRegisterLogging: boolean;
  description?: string;
  isSystem?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type DrugClassificationCreatePayload = Omit<
  DrugClassification,
  'createdAt' | 'updatedAt'
> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

/**
 * Product Category (/organizations/{orgId}/categories/{categoryId})
 */
export interface ProductCategory {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  parentId: string | null;   // Nullable for top-level categories
  description?: string;
  isSystem?: boolean;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ProductCategoryCreatePayload = Omit<
  ProductCategory,
  'createdAt' | 'updatedAt'
> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

export type ProductCategoryUpdatePayload = Partial<
  Omit<ProductCategory, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
> & {
  updatedAt: FieldValue;
};

/**
 * Manufacturer Master (/organizations/{orgId}/manufacturers/{manufacturerId})
 */
export interface Manufacturer {
  id: string;
  organizationId: string;
  name: string;               // e.g. "GlaxoSmithKline Pharmaceuticals Ltd"
  normalizedName: string;     // e.g. "glaxosmithkline pharmaceuticals ltd" (for deduplication)
  code?: string;
  shortName?: string;         // e.g. "GSK"
  contactPerson?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  drugLicenseNumber?: string;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ManufacturerCreatePayload = Omit<
  Manufacturer,
  'createdAt' | 'updatedAt'
> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

export type ManufacturerUpdatePayload = Partial<
  Omit<Manufacturer, 'id' | 'organizationId' | 'normalizedName' | 'createdAt' | 'updatedAt'>
> & {
  updatedAt: FieldValue;
};

/**
 * Tax Slab Record (/organizations/{orgId}/taxes/{taxId})
 */
export interface TaxSlab {
  id: string;
  organizationId: string;
  name: string;               // e.g., "GST 12%"
  gstRate: number;            // e.g., 12 (0, 5, 12, 18, 28)
  cgstRate: number;           // e.g., 6
  sgstRate: number;           // e.g., 6
  igstRate: number;           // e.g., 12
  cessRate?: number;          // e.g., 0
  isSystem?: boolean;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * HSN Code Record (/organizations/{orgId}/hsnCodes/{hsnId})
 */
export interface HsnRecord {
  id: string;
  organizationId: string;
  code: string;               // e.g. "30049019"
  description: string;
  defaultGstRate: number;     // e.g. 12
  isSystem?: boolean;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Unit Definition Record (/organizations/{orgId}/units/{unitId})
 */
export interface UnitDefinition {
  id: string;
  organizationId: string;
  name: string;               // e.g., "Strip"
  code: string;               // e.g., "STRIP"
  isBaseUnit: boolean;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Product Master Record (/organizations/{orgId}/products/{productId})
 * Clean, canonical, fully typed pharmaceutical product master document.
 */
export interface Product {
  id: string;
  organizationId: string;
  sku: string;                     // e.g., "PRD-2026-0001" or unique store SKU
  barcode?: string;                // EAN-13, UPC, GS1 DataMatrix
  productName: string;             // Commercial name, e.g. "Crocin 500 Advance"
  normalizedProductName: string;   // Normalized string for duplicate checking
  brand: string;                   // Trade name/Brand, e.g. "Crocin"
  composition: string;             // Generic Salt / Active Ingredients, e.g. "Paracetamol 500mg"
  normalizedComposition: string;   // For composition search & duplicate check
  productType: ProductType;
  dosageForm: DosageForm;
  strength: string;                // e.g., "500mg", "100 IU/ml"
  routeOfAdministration?: string;  // e.g., "Oral", "Intravenous", "Topical"
  
  categoryId: string;              // Ref to ProductCategory
  categoryName?: string;
  manufacturerId: string;          // Ref to Manufacturer
  manufacturerName?: string;
  
  schedule: ScheduleCategory;
  classificationId?: string;       // Ref to DrugClassification
  requiresPrescription: boolean;
  isColdChain: boolean;            // Storage temperature requirement (2°C - 8°C)
  isNarcotic: boolean;
  isBanned: boolean;
  
  packaging: UnitPackaging;
  
  hsnCode: string;                 // e.g., "30049019"
  gstRate: number;                 // e.g., 12
  taxInclusive: boolean;
  
  defaultMrp: number;              // Standard Default MRP
  defaultPurchaseCost: number;     // Standard Landed Cost
  defaultSalePrice: number;        // Counter Sale Price
  minMarginPercent: number;        // Margin percentage target
  
  rackLocation?: string;           // Primary storage rack/shelf
  minStockLevel?: number;          // Low stock alert threshold
  maxStockLevel?: number;          // Maximum reorder limit
  reorderPoint?: number;
  
  mediaAssetId?: string | null;    // Ref to MediaAsset ID in Firestore
  mediaPublicId?: string | null;   // ImageKit fileId / publicId
  mediaFileId?: string | null;     // ImageKit fileId
  mediaUrl?: string | null;        // ImageKit secure URL
  
  status: ProductStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdByUid: string;
  updatedByUid?: string;
}

export type ProductCreatePayload = Omit<
  Product,
  'createdAt' | 'updatedAt'
> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

export type ProductUpdatePayload = Partial<
  Omit<Product, 'id' | 'organizationId' | 'sku' | 'createdAt' | 'updatedAt'>
> & {
  updatedAt: FieldValue;
  updatedByUid: string;
};

/**
 * Filter & Search options for productService.getProducts
 */
export interface ProductFilterOptions {
  searchQuery?: string;
  categoryId?: string;
  manufacturerId?: string;
  productType?: ProductType;
  schedule?: ScheduleCategory;
  isColdChain?: boolean;
  requiresPrescription?: boolean;
  status?: ProductStatus | 'all';
  pageSize?: number;
  lastDoc?: unknown;
}

/**
 * CSV Import Validation Preview Item
 */
export interface ProductImportRow {
  rowNumber: number;
  productName: string;
  brand: string;
  composition: string;
  dosageForm: string;
  strength: string;
  manufacturer: string;
  category: string;
  hsnCode: string;
  gstRate: number;
  mrp: number;
  purchaseCost: number;
  salePrice: number;
  packUnit: string;
  baseUnit: string;
  conversionFactor: number;
  schedule: string;
  rackLocation: string;
  isValid: boolean;
  errors: string[];
}

export interface ProductImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  parsedProducts: ProductImportRow[];
}
