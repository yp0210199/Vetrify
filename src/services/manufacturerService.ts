import {
  collection,
  doc,
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
  Manufacturer,
  ManufacturerCreatePayload,
  ManufacturerUpdatePayload,
} from '../types/product';
import { validateManufacturer } from '../lib/firebase/validators';
import { logAuditEvent } from './auditService';

function getManufacturersRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'manufacturers');
}

/**
 * Normalizes manufacturer name for duplicate prevention
 */
export function normalizeManufacturerName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Fetch manufacturers
 */
export async function getManufacturers(
  organizationId: string,
  includeInactive = false
): Promise<Manufacturer[]> {
  const ref = getManufacturersRef(organizationId);
  const q = includeInactive
    ? query(ref, orderBy('name', 'asc'))
    : query(ref, where('status', '==', 'active'), orderBy('name', 'asc'));

  const snapshot = await getDocs(q);
  const manufacturers: Manufacturer[] = [];

  snapshot.forEach((docSnap) => {
    const data = { id: docSnap.id, ...docSnap.data() };
    if (validateManufacturer(data, organizationId)) {
      manufacturers.push(data as Manufacturer);
    }
  });

  return manufacturers;
}

/**
 * Check if manufacturer already exists (deduplication check)
 */
export async function checkManufacturerExists(
  organizationId: string,
  name: string
): Promise<Manufacturer | null> {
  const normalized = normalizeManufacturerName(name);
  if (!normalized) return null;

  const ref = getManufacturersRef(organizationId);
  const q = query(ref, where('normalizedName', '==', normalized));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    const data = { id: docSnap.id, ...docSnap.data() };
    if (validateManufacturer(data, organizationId)) {
      return data as Manufacturer;
    }
  }

  return null;
}

/**
 * Create manufacturer master
 */
export async function createManufacturer(
  organizationId: string,
  caller: { uid: string; email?: string | null; displayName?: string | null },
  payload: Omit<Manufacturer, 'id' | 'organizationId' | 'normalizedName' | 'createdAt' | 'updatedAt'>
): Promise<Manufacturer> {
  const normalized = normalizeManufacturerName(payload.name);
  const existing = await checkManufacturerExists(organizationId, payload.name);

  if (existing) {
    return existing; // Reuse existing manufacturer record
  }

  const ref = getManufacturersRef(organizationId);
  const newDocRef = doc(ref);
  const mfrId = newDocRef.id;

  const createPayload: ManufacturerCreatePayload = {
    id: mfrId,
    organizationId,
    name: payload.name.trim(),
    normalizedName: normalized,
    shortName: payload.shortName ? payload.shortName.trim() : '',
    code: payload.code ? payload.code.trim().toUpperCase() : '',
    contactPerson: payload.contactPerson ? payload.contactPerson.trim() : '',
    email: payload.email ? payload.email.trim() : '',
    phone: payload.phone ? payload.phone.trim() : '',
    gstin: payload.gstin ? payload.gstin.trim().toUpperCase() : '',
    status: payload.status || 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(newDocRef, createPayload);

  await logAuditEvent(organizationId, {
    actorUid: caller.uid,
    actorEmail: caller.email || null,
    actorDisplayName: caller.displayName || null,
    action: 'manufacturer.created',
    entityType: 'manufacturer',
    entityId: mfrId,
    storeId: null,
    metadata: {
      manufacturerName: payload.name,
      normalizedName: normalized,
    },
  });

  return {
    ...createPayload,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } as Manufacturer;
}

/**
 * Delete a manufacturer master
 */
export async function deleteManufacturer(
  organizationId: string,
  manufacturerId: string
): Promise<void> {
  const ref = doc(db, 'organizations', organizationId, 'manufacturers', manufacturerId);
  await deleteDoc(ref);
}

/**
 * Seed default manufacturers
 */
export async function seedDefaultManufacturers(
  organizationId: string,
  caller: { uid: string; email?: string | null; displayName?: string | null }
): Promise<Manufacturer[]> {
  return [];
}
