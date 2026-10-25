import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import {
  Product,
  ProductCreatePayload,
  ProductUpdatePayload,
  ProductFilterOptions,
  ProductImportRow,
  ProductImportSummary,
} from '../types/product';
import { validateProduct } from '../lib/firebase/validators';
import { logAuditEvent } from './auditService';

function getProductsRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'products');
}

function getProductDocRef(organizationId: string, productId: string) {
  return doc(db, 'organizations', organizationId, 'products', productId);
}

/**
 * Normalize string for search and deduplication
 */
export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Auto-generate unique product SKU
 */
export function generateProductSku(productName: string): string {
  const prefix = productName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `SKU-${prefix}-${timestamp}${random}`;
}

/**
 * Fetch products list with filters & pagination
 */
export async function getProducts(
  organizationId: string,
  options: ProductFilterOptions = {}
): Promise<{ products: Product[]; lastDoc: unknown; hasMore: boolean }> {
  const {
    searchQuery,
    categoryId,
    manufacturerId,
    productType,
    schedule,
    isColdChain,
    status = 'active',
    pageSize = 50,
    lastDoc,
  } = options;

  const ref = getProductsRef(organizationId);

  let rawDocs: any[] = [];
  const docMap = new Map<string, any>();
  try {
    const constraints: any[] = [];

    if (status !== 'all') {
      constraints.push(where('status', '==', status));
    }

    if (categoryId) {
      constraints.push(where('categoryId', '==', categoryId));
    }

    if (manufacturerId) {
      constraints.push(where('manufacturerId', '==', manufacturerId));
    }

    if (productType) {
      constraints.push(where('productType', '==', productType));
    }

    if (schedule) {
      constraints.push(where('schedule', '==', schedule));
    }

    if (typeof isColdChain === 'boolean') {
      constraints.push(where('isColdChain', '==', isColdChain));
    }

    constraints.push(orderBy('productName', 'asc'));
    constraints.push(limit(pageSize + 1));

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(ref, ...constraints);
    const snapshot = await getDocs(q);
    snapshot.docs.forEach(docSnap => docMap.set(docSnap.id, docSnap));
    rawDocs = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  } catch (err) {
    console.warn('Compound index query failed, falling back to all-product fetch:', err);
    try {
      const fallbackSnapshot = await getDocs(ref);
      fallbackSnapshot.docs.forEach(docSnap => docMap.set(docSnap.id, docSnap));
      rawDocs = fallbackSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
    } catch (fallbackErr) {
      console.error('Fallback product fetch failed:', fallbackErr);
      return { products: [], lastDoc: null, hasMore: false };
    }
  }

  let products: Product[] = [];
  rawDocs.forEach((data) => {
    if (validateProduct(data, organizationId)) {
      products.push(data as Product);
    }
  });

  // Client-side filtering for status, category, manufacturer, schedule, isColdChain if fallback was used
  if (status !== 'all') {
    products = products.filter((p) => p.status === status);
  }
  if (categoryId) {
    products = products.filter((p) => p.categoryId === categoryId);
  }
  if (manufacturerId) {
    products = products.filter((p) => p.manufacturerId === manufacturerId);
  }
  if (productType) {
    products = products.filter((p) => p.productType === productType);
  }
  if (schedule) {
    products = products.filter((p) => p.schedule === schedule);
  }
  if (typeof isColdChain === 'boolean') {
    products = products.filter((p) => p.isColdChain === isColdChain);
  }

  // Client-side search filtering (brand, composition, barcode, SKU, productName, manufacturerName) if searchQuery is present
  if (searchQuery && searchQuery.trim()) {
    const qLower = searchQuery.trim().toLowerCase();
    products = products.filter((p) => {
      return (
        (p.productName || '').toLowerCase().includes(qLower) ||
        (p.brand || '').toLowerCase().includes(qLower) ||
        (p.composition || '').toLowerCase().includes(qLower) ||
        (p.sku || '').toLowerCase().includes(qLower) ||
        (p.barcode || '').toLowerCase().includes(qLower) ||
        (p.rackLocation || '').toLowerCase().includes(qLower) ||
        (p.manufacturerName || '').toLowerCase().includes(qLower)
      );
    });
  }

  // Sort alphabetically by productName
  products.sort((a, b) => (a.productName || '').localeCompare(b.productName || ''));

  const hasMore = products.length > pageSize;
  const slicedProducts = products.slice(0, pageSize);
  const lastProduct = slicedProducts.length > 0 ? slicedProducts[slicedProducts.length - 1] : null;
  const newLastDoc = lastProduct ? docMap.get(lastProduct.id) || null : null;

  return {
    products: slicedProducts,
    lastDoc: newLastDoc,
    hasMore,
  };
}

/**
 * Fetch a single product by ID
 */
export async function getProductById(
  organizationId: string,
  productId: string
): Promise<Product | null> {
  const docRef = getProductDocRef(organizationId, productId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) return null;

  const data = { id: snap.id, ...snap.data() };
  if (validateProduct(data, organizationId)) {
    return data as Product;
  }
  return null;
}

/**
 * Check if a product with matching brand, composition, strength, and dosage form already exists
 */
export async function checkDuplicateProduct(
  organizationId: string,
  brand: string,
  composition: string,
  strength: string,
  dosageForm: string
): Promise<Product | null> {
  const normBrand = normalizeString(brand);
  const normComp = normalizeString(composition);

  if (!normBrand || !normComp) return null;

  const ref = getProductsRef(organizationId);
  const q = query(ref, where('status', '==', 'active'));
  const snapshot = await getDocs(q);

  for (const docSnap of snapshot.docs) {
    const data = { id: docSnap.id, ...docSnap.data() } as Product;
    if (
      normalizeString(data.brand) === normBrand &&
      normalizeString(data.composition) === normComp &&
      normalizeString(data.strength) === normalizeString(strength) &&
      data.dosageForm === dosageForm
    ) {
      return data;
    }
  }

  return null;
}

/**
 * Create a new Product master record in Firestore
 */
export async function createProduct(
  organizationId: string,
  caller: { uid: string; email?: string | null; displayName?: string | null },
  payload: Omit<
    Product,
    | 'id'
    | 'organizationId'
    | 'sku'
    | 'normalizedProductName'
    | 'normalizedComposition'
    | 'createdAt'
    | 'updatedAt'
    | 'createdByUid'
  > & { sku?: string }
): Promise<Product> {
  const ref = getProductsRef(organizationId);
  const newDocRef = doc(ref);
  const productId = newDocRef.id;

  const sku = payload.sku?.trim() || generateProductSku(payload.productName);
  const normName = normalizeString(payload.productName);
  const normComp = normalizeString(payload.composition);

  const createPayload: ProductCreatePayload = {
    id: productId,
    organizationId,
    sku,
    barcode: payload.barcode ? payload.barcode.trim() : '',
    productName: payload.productName.trim(),
    normalizedProductName: normName,
    brand: payload.brand.trim(),
    composition: payload.composition.trim(),
    normalizedComposition: normComp,
    productType: payload.productType || 'Allopathy',
    dosageForm: payload.dosageForm || 'Tablet',
    strength: payload.strength ? payload.strength.trim() : '',
    routeOfAdministration: payload.routeOfAdministration || 'Oral',
    categoryId: payload.categoryId || 'uncategorized',
    categoryName: payload.categoryName || 'General',
    manufacturerId: payload.manufacturerId || 'unassigned',
    manufacturerName: payload.manufacturerName || 'Generic Manufacturer',
    schedule: payload.schedule || 'OTC',
    classificationId: payload.classificationId || '',
    requiresPrescription: payload.requiresPrescription ?? (payload.schedule !== 'OTC'),
    isColdChain: payload.isColdChain ?? false,
    isNarcotic: payload.isNarcotic ?? (payload.schedule === 'X' || payload.schedule === 'Narcotic'),
    isBanned: payload.isBanned ?? false,
    packaging: payload.packaging || { packUnit: 'Strip', baseUnit: 'Tablet', conversionFactor: 10 },
    hsnCode: payload.hsnCode || '30049019',
    gstRate: typeof payload.gstRate === 'number' ? payload.gstRate : 12,
    taxInclusive: payload.taxInclusive ?? false,
    defaultMrp: Number(payload.defaultMrp) || 0,
    defaultPurchaseCost: Number(payload.defaultPurchaseCost) || 0,
    defaultSalePrice: Number(payload.defaultSalePrice) || 0,
    minMarginPercent: payload.minMarginPercent || 0,
    rackLocation: payload.rackLocation ? payload.rackLocation.trim() : '',
    minStockLevel: payload.minStockLevel || 10,
    maxStockLevel: payload.maxStockLevel || 500,
    reorderPoint: payload.reorderPoint || 20,
    mediaAssetId: payload.mediaAssetId || null,
    mediaPublicId: payload.mediaPublicId || null,
    mediaUrl: payload.mediaUrl || null,
    status: payload.status || 'active',
    createdByUid: caller.uid,
    updatedByUid: caller.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(newDocRef, createPayload);

  await logAuditEvent(organizationId, {
    actorUid: caller.uid,
    actorEmail: caller.email || null,
    actorDisplayName: caller.displayName || null,
    action: 'product.created',
    entityType: 'product',
    entityId: productId,
    storeId: null,
    metadata: {
      productName: payload.productName,
      brand: payload.brand,
      sku,
      schedule: payload.schedule,
    },
  });

  return {
    ...createPayload,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } as Product;
}

/**
 * Update an existing Product master record
 */
export async function updateProduct(
  organizationId: string,
  productId: string,
  caller: { uid: string; email?: string | null; displayName?: string | null },
  updates: Partial<Omit<Product, 'id' | 'organizationId' | 'sku' | 'createdAt' | 'createdByUid'>>
): Promise<void> {
  const docRef = getProductDocRef(organizationId, productId);

  const { _docSnap, id, organizationId: _orgId, createdAt, createdByUid, ...cleanUpdates } = updates as any;

  const updatePayload: Record<string, any> = {
    ...cleanUpdates,
    updatedByUid: caller.uid,
    updatedAt: serverTimestamp(),
  };

  if (updates.productName) {
    updatePayload.normalizedProductName = normalizeString(updates.productName);
  }
  if (updates.composition) {
    updatePayload.normalizedComposition = normalizeString(updates.composition);
  }

  await updateDoc(docRef, updatePayload);

  await logAuditEvent(organizationId, {
    actorUid: caller.uid,
    actorEmail: caller.email || null,
    actorDisplayName: caller.displayName || null,
    action: 'product.updated',
    entityType: 'product',
    entityId: productId,
    storeId: null,
    metadata: {
      updatedFields: Object.keys(updates),
    },
  });
}

/**
 * Archive (soft-delete) or restore product
 */
export async function setProductStatus(
  organizationId: string,
  productId: string,
  caller: { uid: string; email?: string | null; displayName?: string | null },
  status: 'active' | 'inactive' | 'archived'
): Promise<void> {
  const docRef = getProductDocRef(organizationId, productId);
  await updateDoc(docRef, {
    status,
    updatedByUid: caller.uid,
    updatedAt: serverTimestamp(),
  });

  await logAuditEvent(organizationId, {
    actorUid: caller.uid,
    actorEmail: caller.email || null,
    actorDisplayName: caller.displayName || null,
    action: status === 'archived' ? 'product.archived' : 'product.restored',
    entityType: 'product',
    entityId: productId,
    storeId: null,
    metadata: { newStatus: status },
  });
}

/**
 * Bulk CSV parser and import batch processor
 */
export function parseProductsCsvContent(csvContent: string): ProductImportSummary {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) {
    return { totalRows: 0, validRows: 0, invalidRows: 0, parsedProducts: [] };
  }

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1);
  const parsedProducts: ProductImportRow[] = [];

  rows.forEach((line, index) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 3) return;

    const rowNum = index + 2;
    const errors: string[] = [];

    const getCol = (names: string[]) => {
      for (const name of names) {
        const idx = header.findIndex((h) => h.includes(name));
        if (idx !== -1 && cols[idx] !== undefined) return cols[idx];
      }
      return '';
    };

    const productName = getCol(['product', 'medicine', 'name']);
    const brand = getCol(['brand', 'trade']);
    const composition = getCol(['composition', 'salt', 'generic']);
    const dosageForm = getCol(['form', 'dosage']) || 'Tablet';
    const strength = getCol(['strength', 'mg']) || '500mg';
    const manufacturer = getCol(['manufacturer', 'mfr', 'company']) || 'Generic Pharma';
    const category = getCol(['category', 'cat']) || 'Medicines & Pharmaceuticals';
    const hsnCode = getCol(['hsn', 'code']) || '30049019';
    const gstRate = parseFloat(getCol(['gst', 'tax'])) || 12;
    const mrp = parseFloat(getCol(['mrp', 'price'])) || 0;
    const purchaseCost = parseFloat(getCol(['cost', 'purchase'])) || 0;
    const salePrice = parseFloat(getCol(['sale', 'rate'])) || mrp || 0;
    const packUnit = getCol(['pack', 'packunit']) || 'Strip';
    const baseUnit = getCol(['base', 'baseunit']) || 'Tablet';
    const conversionFactor = parseInt(getCol(['conversion', 'factor', 'ratio'])) || 10;
    const schedule = getCol(['schedule', 'sch']) || 'OTC';
    const rackLocation = getCol(['rack', 'shelf']) || 'Unassigned';

    if (!productName) errors.push('Product name is required');
    if (!brand) errors.push('Brand name is required');
    if (!composition) errors.push('Composition salt is required');
    if (mrp <= 0) errors.push('MRP must be greater than 0');

    parsedProducts.push({
      rowNumber: rowNum,
      productName,
      brand,
      composition,
      dosageForm,
      strength,
      manufacturer,
      category,
      hsnCode,
      gstRate,
      mrp,
      purchaseCost,
      salePrice,
      packUnit,
      baseUnit,
      conversionFactor,
      schedule,
      rackLocation,
      isValid: errors.length === 0,
      errors,
    });
  });

  const validRows = parsedProducts.filter((p) => p.isValid).length;
  const invalidRows = parsedProducts.length - validRows;

  return {
    totalRows: parsedProducts.length,
    validRows,
    invalidRows,
    parsedProducts,
  };
}

/**
 * Execute batch creation of valid imported CSV products
 */
export async function batchImportProducts(
  organizationId: string,
  caller: { uid: string; email?: string | null; displayName?: string | null },
  validImportRows: ProductImportRow[]
): Promise<number> {
  let importedCount = 0;

  for (const row of validImportRows) {
    if (!row.isValid) continue;

    await createProduct(organizationId, caller, {
      productName: row.productName,
      brand: row.brand,
      composition: row.composition,
      dosageForm: row.dosageForm as any,
      strength: row.strength,
      manufacturerName: row.manufacturer,
      manufacturerId: 'mfr_imported',
      categoryName: row.category,
      categoryId: 'cat_imported',
      hsnCode: row.hsnCode,
      gstRate: row.gstRate,
      defaultMrp: row.mrp,
      defaultPurchaseCost: row.purchaseCost,
      defaultSalePrice: row.salePrice,
      packaging: {
        packUnit: row.packUnit,
        baseUnit: row.baseUnit,
        conversionFactor: row.conversionFactor,
      },
      schedule: row.schedule.toUpperCase() as any,
      rackLocation: row.rackLocation,
      productType: 'Allopathy',
      requiresPrescription: row.schedule.toUpperCase() !== 'OTC',
      isColdChain: false,
      isNarcotic: false,
      isBanned: false,
      taxInclusive: false,
      minMarginPercent: 20,
      status: 'active',
    });

    importedCount++;
  }

  await logAuditEvent(organizationId, {
    actorUid: caller.uid,
    actorEmail: caller.email || null,
    actorDisplayName: caller.displayName || null,
    action: 'product.imported',
    entityType: 'product',
    entityId: 'batch_import',
    storeId: null,
    metadata: { importedCount },
  });

  return importedCount;
}

/**
 * Seed canonical baseline pharmaceutical products for new organizations
 */
export async function seedDefaultProducts(
  organizationId: string,
  caller: { uid: string; email?: string | null; displayName?: string | null }
): Promise<Product[]> {
  // Empty implementation to comply with strict production policies against automatic seeding of dummy/demo medicines.
  return [];
}

/**
 * Toggle pin status of a product for fast POS access
 */
export async function togglePinProduct(
  organizationId: string,
  productId: string,
  isPinned: boolean,
  caller: { uid: string; email?: string | null; displayName?: string | null }
): Promise<void> {
  const docRef = getProductDocRef(organizationId, productId);
  await updateDoc(docRef, {
    isPinned,
    updatedAt: serverTimestamp(),
    updatedByUid: caller.uid,
  });

  await logAuditEvent(organizationId, {
    actorUid: caller.uid,
    actorEmail: caller.email || null,
    actorDisplayName: caller.displayName || null,
    action: 'product.updated',
    entityType: 'product',
    entityId: productId,
    storeId: null,
    metadata: { isPinned, actionType: isPinned ? 'pinned' : 'unpinned' },
  });
}

/**
 * Check if a product has active batches or other dependencies
 */
export async function hasProductDependencies(
  organizationId: string,
  productId: string
): Promise<boolean> {
  const batchesRef = collection(db, 'organizations', organizationId, 'batches');
  const q = query(batchesRef, where('productId', '==', productId), limit(1));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Permanently delete a Product master record
 */
export async function deleteProduct(
  organizationId: string,
  productId: string,
  caller: { uid: string; email?: string | null; displayName?: string | null }
): Promise<void> {
  const hasDeps = await hasProductDependencies(organizationId, productId);
  if (hasDeps) {
    throw new Error('Cannot delete product: Product has associated inventory batches.');
  }
  
  const docRef = getProductDocRef(organizationId, productId);
  await deleteDoc(docRef);

  await logAuditEvent(organizationId, {
    actorUid: caller.uid,
    actorEmail: caller.email || null,
    actorDisplayName: caller.displayName || null,
    action: 'product.deleted',
    entityType: 'product',
    entityId: productId,
    storeId: null,
    metadata: {},
  });
}

export const productService = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  togglePinProduct,
  deleteProduct,
  hasProductDependencies,
};
