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

function getCategoriesRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'categories');
}

function getCategoryDocRef(organizationId: string, categoryId: string) {
  return doc(db, 'organizations', organizationId, 'categories', categoryId);
}

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

export async function createCategory(
  organizationId: string,
  caller: { uid: string; email?: string | null; displayName?: string | null },
  payload: Omit<ProductCategory, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
): Promise<ProductCategory> {
  const ref = getCategoriesRef(organizationId);
  const newDocRef = doc(ref);
  const categoryId = newDocRef.id;

  const createPayload: ProductCategoryCreatePayload = {
    id: categoryId,
    organizationId,
    name: payload.name.trim(),
    code: payload.code.trim().toUpperCase(),
    description: payload.description ? payload.description.trim() : '',
    parentId: payload.parentId || null,
    categoryType: payload.categoryType || 'tiles',
    status: payload.status || 'active',
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
      categoryCode: payload.code,
    },
  });

  return {
    ...createPayload,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } as ProductCategory;
}

export async function deleteCategory(
  organizationId: string,
  categoryId: string
): Promise<void> {
  const docRef = getCategoryDocRef(organizationId, categoryId);
  await deleteDoc(docRef);
}
