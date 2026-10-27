import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { UnitDefinition } from '../types/product';

function getUnitsRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'units');
}

function getUnitDocRef(organizationId: string, unitId: string) {
  return doc(db, 'organizations', organizationId, 'units', unitId);
}

// Default standard units if database is initially empty
export const DEFAULT_UNITS: UnitDefinition[] = [
  { id: 'unit_box', organizationId: '', name: 'Box', code: 'BOX', isBaseUnit: false, status: 'active', createdAt: null as any, updatedAt: null as any },
  { id: 'unit_sqft', organizationId: '', name: 'Sq. Ft', code: 'SQFT', isBaseUnit: true, status: 'active', createdAt: null as any, updatedAt: null as any },
  { id: 'unit_pcs', organizationId: '', name: 'Piece', code: 'PCS', isBaseUnit: true, status: 'active', createdAt: null as any, updatedAt: null as any },
  { id: 'unit_bag', organizationId: '', name: 'Bag (20kg)', code: 'BAG', isBaseUnit: false, status: 'active', createdAt: null as any, updatedAt: null as any },
  { id: 'unit_set', organizationId: '', name: 'Set', code: 'SET', isBaseUnit: false, status: 'active', createdAt: null as any, updatedAt: null as any },
  { id: 'unit_slab', organizationId: '', name: 'Slab', code: 'SLAB', isBaseUnit: false, status: 'active', createdAt: null as any, updatedAt: null as any },
  { id: 'unit_meter', organizationId: '', name: 'Meter / Length', code: 'LEN', isBaseUnit: true, status: 'active', createdAt: null as any, updatedAt: null as any },
  { id: 'unit_kg', organizationId: '', name: 'Kg', code: 'KG', isBaseUnit: true, status: 'active', createdAt: null as any, updatedAt: null as any },
];

/**
 * Fetch all units for an organization
 */
export async function getUnits(
  organizationId: string,
  includeInactive = false
): Promise<UnitDefinition[]> {
  try {
    const ref = getUnitsRef(organizationId);
    const q = includeInactive
      ? query(ref, orderBy('name', 'asc'))
      : query(ref, where('status', '==', 'active'), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return DEFAULT_UNITS;
    }

    const units: UnitDefinition[] = [];
    snapshot.forEach((docSnap) => {
      units.push({ id: docSnap.id, ...docSnap.data() } as UnitDefinition);
    });

    return units;
  } catch (err) {
    console.warn('Error reading custom units, returning default units list:', err);
    return DEFAULT_UNITS;
  }
}

/**
 * Create a new Unit definition
 */
export async function createUnit(
  organizationId: string,
  caller: { uid: string; email?: string | null; displayName?: string | null },
  payload: { name: string; code?: string; isBaseUnit?: boolean }
): Promise<UnitDefinition> {
  const unitId = `unit_${Date.now()}`;
  const docRef = getUnitDocRef(organizationId, unitId);

  const unitData: any = {
    id: unitId,
    organizationId,
    name: payload.name.trim(),
    code: (payload.code || payload.name.substring(0, 4)).toUpperCase().trim(),
    isBaseUnit: payload.isBaseUnit || false,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, unitData);
  return { ...unitData, id: unitId };
}

/**
 * Delete a custom Unit definition
 */
export async function deleteUnit(
  organizationId: string,
  unitId: string
): Promise<void> {
  const docRef = getUnitDocRef(organizationId, unitId);
  await deleteDoc(docRef);
}
