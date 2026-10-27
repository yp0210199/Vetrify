import { Timestamp, FieldValue } from 'firebase/firestore';

/**
 * ============================================================================
 * Core Tiles, Sanitaryware, Faucets, Chemicals & Pipes Product Foundation
 * ============================================================================
 */

export type CategoryType = 'tiles' | 'sanitaryware' | 'faucets' | 'adhesives' | 'pipes' | 'other' | 'general';

export type ProductType =
  | 'Vitrified Tiles'
  | 'Ceramic Tiles'
  | 'Wall Tiles'
  | 'Floor Tiles'
  | 'Parking Tiles'
  | 'Marble & Granite Slabs'
  | 'Sanitaryware'
  | 'Faucets & Fittings'
  | 'Tile Adhesive & Grout'
  | 'Pipes & Plumbing'
  | 'Tools & Accessories'
  | 'General';

export type TileFinish =
  | 'Glossy'
  | 'High Gloss'
  | 'Matt'
  | 'Carving'
  | 'Sugar'
  | 'Rustic'
  | 'Satin'
  | 'Bookmatch'
  | 'Polished'
  | 'Unpolished'
  | 'Super White'
  | 'Metallic'
  | 'Wood Finish'
  | 'Other';

export type TileBodyType =
  | 'Full Body'
  | 'Double Charge'
  | 'Glazed Vitrified (GVT)'
  | 'Polished Vitrified (PVT)'
  | 'Soluble Salt'
  | 'Ceramic Body'
  | 'Porcelain'
  | 'Natural Stone'
  | 'Quartz'
  | 'N/A';

export type TileGrade = 'Premium' | 'Standard' | 'Commercial' | 'Seconds / Economy';

export type ProductStatus = 'active' | 'inactive' | 'archived';

/**
 * Dual Unit & Packaging Conversion Model
 */
export interface UnitPackaging {
  packUnit: string;             // e.g., 'Box', 'Slab', 'Piece', 'Bag', 'Set', 'Length'
  baseUnit: string;             // e.g., 'Sq. Ft', 'Sq. Mtr', 'Piece', 'Kg', 'Feet'
  conversionFactor: number;     // e.g., 15.5 Sq. Ft per Box, or 1 Piece per Box
  coveragePerBoxSqFt?: number;  // e.g., 15.5
  coveragePerBoxSqMtr?: number; // e.g., 1.44
  piecesPerBox?: number;        // e.g., 4
  weightPerBoxKg?: number;      // e.g., 28.5 kg
  thicknessMm?: number;         // e.g., 9mm, 12mm, 18mm
}

/**
 * Category Specific Technical Specifications
 */
export interface TileTechnicalSpecs {
  dimensions?: string;          // e.g., "600x600 mm", "2x4 ft", "800x1600 mm", "12x18 inch"
  finish?: TileFinish;
  bodyType?: TileBodyType;
  grade?: TileGrade;
  waterAbsorptionPercent?: number;
  skidResistance?: string;      // e.g., "R9", "R10", "Anti-Skid"
  thicknessMm?: number;
  colorPattern?: string;
}

export type ScheduleCategory = 'General' | 'Premium' | 'Commercial';
export type DosageForm = string;

/**
 * Product Category (/organizations/{orgId}/categories/{categoryId})
 */
export interface ProductCategory {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  categoryType?: CategoryType;
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
 * Brand / Manufacturer Master (/organizations/{orgId}/manufacturers/{manufacturerId})
 */
export interface Manufacturer {
  id: string;
  organizationId: string;
  name: string;               // e.g. "Kajaria Ceramics", "Jaquar & Company", "Supreme Pipes"
  normalizedName: string;     // e.g. "kajaria ceramics" (for deduplication)
  code?: string;
  shortName?: string;         // e.g. "Kajaria", "Jaquar"
  contactPerson?: string;
  email?: string;
  phone?: string;
  gstin?: string;
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
  name: string;               // e.g., "GST 18%"
  gstRate: number;            // e.g., 18 (0, 5, 12, 18, 28)
  cgstRate: number;           // e.g., 9
  sgstRate: number;           // e.g., 9
  igstRate: number;           // e.g., 18
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
  code: string;               // e.g. "6907" (Tiles), "6910" (Sanitaryware), "8481" (Faucets), "3506" (Adhesives)
  description: string;
  defaultGstRate: number;     // e.g. 18
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
  name: string;               // e.g., "Box", "Sq. Ft", "Piece", "Slab", "Bag", "Length"
  code: string;               // e.g., "BOX", "SQFT", "PCS", "SLAB", "BAG", "LEN"
  isBaseUnit: boolean;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Product Master Record (/organizations/{orgId}/products/{productId})
 * Extensible Multi-Category Product Master Document for Tiles, Sanitaryware, Faucets & Construction Materials.
 */
export interface Product {
  id: string;
  organizationId: string;
  sku: string;                     // e.g., "TIL-600X1200-001", "SAN-WASHBASIN-002"
  barcode?: string;                // EAN-13, UPC, Code-128
  productName: string;             // Commercial name
  normalizedProductName: string;   // Normalized string for duplicate checking
  brand: string;                   // Brand / Vendor name, e.g. "Kajaria", "Hindware", "Jaquar"
  categoryType?: CategoryType;      // 'tiles' | 'sanitaryware' | 'faucets' | 'adhesives' | 'other' | 'general'
  productType: ProductType;
  
  // 1. Tiles & Slabs Attributes
  tileDimensions?: string;         // e.g., "600x1200 mm (2x4 ft)", "800x1600 mm"
  surfaceFinish?: TileFinish;      // e.g., "Glossy", "Matt", "High Gloss"
  finish?: TileFinish;             // Alias for surfaceFinish
  tileBodyType?: TileBodyType;     // e.g., "GVT", "Double Charge", "Full Body"
  tileGrade?: TileGrade;           // e.g., "Premium", "Standard"
  grade?: TileGrade;               // Alias for tileGrade
  coveragePerBoxSqFt?: number;     // e.g., 15.5
  piecesPerBox?: number;           // e.g., 4
  weightPerBoxKg?: number;         // e.g., 28.5 kg
  thicknessMm?: number;            // e.g., 9mm, 12mm

  // 2. Sanitaryware Attributes
  sanitaryType?: string;           // Wash Basin, Wall-Hung WC, One-Piece WC, Countertop Basin, Urinal, Cistern
  mountingType?: string;           // Wall-Hung, Floor Mounted, Countertop, Table Top, Pedestal
  trapType?: string;               // S-Trap 220mm, S-Trap 300mm, P-Trap 180mm, Universal
  colorFinish?: string;            // Glossy White, Matt Black, Ivory, Dual Tone, Rose Gold
  flushingType?: string;           // Dual Flush 3/6L, Tornado Flush, Washdown, Rimless

  // 3. Faucets, Showers & CP Fittings Attributes
  fittingType?: string;            // Single Lever Diverter, Pillar Cock, Bib Cock, Overhead Shower, Hand Shower
  materialFinish?: string;         // Chrome Plated Brass, Matt Black PVD, Rose Gold, Stainless Steel 304
  cartridgeType?: string;          // Ceramic Disc Cartridge, Brass Valve
  warrantyYears?: number;          // e.g., 10 Years Warranty

  // 4. Tile Adhesives, Epoxy Grout & Chemicals
  chemicalType?: string;           // Type 1 Tile Adhesive, Type 2 Heavy Duty GVT, Type 3 Outdoor, Epoxy Grout
  packSizeKg?: number;             // e.g. 20 Kg Bag, 5 Kg Bucket, 1 Kg Pouch
  coverageSqFtPerBag?: number;     // e.g. 55 Sq. Ft per 20kg Bag @ 3mm bed

  specs?: TileTechnicalSpecs;
  // 5. Pipes & Plumbing Attributes
  pipeType?: string;               // CPVC Pipe, UPVC Pipe, PVC Drain Pipe
  outerDiameter?: string;          // e.g. 1/2 in (15mm), 3/4 in (20mm)
  lengthFt?: number;
  pressureRating?: string;

  classificationId?: string;
  
  categoryId: string;              // Ref to ProductCategory
  categoryName?: string;
  manufacturerId: string;          // Ref to Manufacturer / Brand
  manufacturerName?: string;
  
  packaging: UnitPackaging;
  
  hsnCode: string;                 // e.g., "6907" (Tiles), "6910" (Sanitaryware), "8481" (Faucets), "3506" (Adhesives)
  gstRate: number;                 // e.g., 18
  taxInclusive: boolean;
  
  defaultMrp: number;              // Standard Default MRP per Unit
  defaultPurchaseCost: number;     // Standard Landed Cost per Unit
  defaultSalePrice: number;        // Selling Price per Unit
  defaultPricePerSqFt?: number;    // Selling Price per Sq. Ft (for tiles/slabs)
  minMarginPercent: number;        // Margin percentage target
  
  rackLocation?: string;           // Godown / Aisle / Yard slot location
  minStockLevel?: number;          // Low stock alert threshold
  maxStockLevel?: number;          // Maximum reorder limit
  reorderPoint?: number;
  
  mediaAssetId?: string | null;    // Ref to MediaAsset ID in Firestore
  mediaPublicId?: string | null;   // ImageKit fileId / publicId
  mediaFileId?: string | null;     // ImageKit fileId
  mediaUrl?: string | null;        // ImageKit secure URL
  imageUrl?: string | null;
  
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

export interface ProductFilterOptions {
  searchQuery?: string;
  categoryId?: string;
  manufacturerId?: string;
  productType?: ProductType;
  categoryType?: CategoryType;
  finish?: TileFinish;
  dimensions?: string;
  grade?: TileGrade;
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
  categoryType?: CategoryType;
  productType?: string;
  dimensions?: string;
  finish?: string;
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
  coveragePerBoxSqFt?: number;
  piecesPerBox?: number;
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
