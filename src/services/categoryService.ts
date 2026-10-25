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
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import {
  ProductCategory,
  ProductCategoryCreatePayload,
  ProductCategoryUpdatePayload,
} from '../types/product';
import { validateProductCategory } from '../lib/firebase/validators';
import { logAuditEvent } from './auditService';

/**
 * Get category collection reference for an organization
 */
function getCategoriesRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'categories');
}

/**
 * Get category document reference
 */
function getCategoryDocRef(organizationId: string, categoryId: string) {
  return doc(db, 'organizations', organizationId, 'categories', categoryId);
}

/**
 * Fetch all categories for an organization
 */
export async function getCategories(
  organizationId: string,
  includeInactive = false
): Promise<ProductCategory[]> {
  const ref = getCategoriesRef(organizationId);
  const q = includeInactive
    ? query(ref, orderBy('name', 'asc'))
    : query(ref, where('status', '==', 'active'), orderBy('name', 'asc'));

  const snapshot = await getDocs(q);
  const categories: ProductCategory[] = [];

  snapshot.forEach((docSnap) => {
    const data = { id: docSnap.id, ...docSnap.data() };
    if (validateProductCategory(data, organizationId)) {
      categories.push(data as ProductCategory);
    }
  });

  return categories;
}

/**
 * Create new category master record
 */
export async function createCategory(
  organizationId: string,
  caller: { uid: string; email?: string | null; displayName?: string | null },
  payload: Omit<ProductCategory, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
): Promise<ProductCategory> {
  const categoriesRef = getCategoriesRef(organizationId);
  const newDocRef = doc(categoriesRef);
  const categoryId = newDocRef.id;

  const createPayload: ProductCategoryCreatePayload = {
    id: categoryId,
    organizationId,
    name: payload.name.trim(),
    code: payload.code ? payload.code.trim().toUpperCase() : categoryId.substring(0, 8).toUpperCase(),
    parentId: payload.parentId || null,
    description: payload.description ? payload.description.trim() : '',
    status: payload.status || 'active',
    isSystem: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(newDocRef, createPayload);

  await logAuditEvent(organizationId, {
    actorUid: caller.uid,
    actorEmail: caller.email || null,
    actorDisplayName: caller.displayName || null,
    action: 'category.created',
    entityType: 'category',
    entityId: categoryId,
    storeId: null,
    metadata: {
      categoryName: payload.name,
      code: createPayload.code,
    },
  });

  return {
    ...createPayload,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } as ProductCategory;
}

/**
 * Seed default pharmacy categories if none exist
 */
export async function seedDefaultCategories(
  organizationId: string,
  caller: { uid: string; email?: string | null; displayName?: string | null }
): Promise<ProductCategory[]> {
  // Empty implementation to comply with strict production policies against automatic seeding of dummy/demo data.
  return [];
}
