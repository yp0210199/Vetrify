import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { TaxSlab, HsnRecord } from '../types/product';
import { validateTaxSlab, validateHsnRecord } from '../lib/firebase/validators';
import { logAuditEvent } from './auditService';

function getTaxesRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'taxes');
}

function getHsnRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'hsnCodes');
}

/**
 * Get all tax slabs for organization
 */
export async function getTaxSlabs(
  organizationId: string
): Promise<TaxSlab[]> {
  const ref = getTaxesRef(organizationId);
  const q = query(ref, orderBy('gstRate', 'asc'));
  const snapshot = await getDocs(q);
  const slabs: TaxSlab[] = [];

  snapshot.forEach((docSnap) => {
    const data = { id: docSnap.id, ...docSnap.data() };
    if (validateTaxSlab(data, organizationId)) {
      slabs.push(data as TaxSlab);
    }
  });

  if (slabs.length === 0) {
    return [
      { id: 'gst_0', organizationId, name: 'Exempt (0%)', gstRate: 0, cgstRate: 0, sgstRate: 0, igstRate: 0, status: 'active', isSystem: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
      { id: 'gst_5', organizationId, name: 'GST 5%', gstRate: 5, cgstRate: 2.5, sgstRate: 2.5, igstRate: 5, status: 'active', isSystem: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
      { id: 'gst_12', organizationId, name: 'GST 12% (Tile Adhesives & Grouts)', gstRate: 12, cgstRate: 6, sgstRate: 6, igstRate: 12, status: 'active', isSystem: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
      { id: 'gst_18', organizationId, name: 'GST 18% (Tiles, Sanitaryware & Faucets)', gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18, status: 'active', isSystem: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
      { id: 'gst_28', organizationId, name: 'GST 28% (Luxury Slabs & Fittings)', gstRate: 28, cgstRate: 14, sgstRate: 14, igstRate: 28, status: 'active', isSystem: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
    ];
  }

  return slabs;
}

/**
 * Seed default GST Slabs
 */
export async function seedDefaultTaxSlabs(
  organizationId: string,
  caller: { uid: string; email?: string | null; displayName?: string | null }
): Promise<TaxSlab[]> {
  // Empty implementation to comply with strict production policies against automatic seeding of dummy/demo data.
  return [];
}

/**
 * Get HSN Records
 */
export async function getHsnRecords(
  organizationId: string
): Promise<HsnRecord[]> {
  const ref = getHsnRef(organizationId);
  const snapshot = await getDocs(ref);
  const records: HsnRecord[] = [];

  snapshot.forEach((docSnap) => {
    const data = { id: docSnap.id, ...docSnap.data() };
    if (validateHsnRecord(data, organizationId)) {
      records.push(data as HsnRecord);
    }
  });

  if (records.length === 0) {
    return [
      { id: 'hsn_30049019', organizationId, code: '30049019', description: 'Medicaments consisting of mixed or unmixed products for therapeutic uses', defaultGstRate: 12, status: 'active', isSystem: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
      { id: 'hsn_30041010', organizationId, code: '30041010', description: 'Penicillins or derivatives (Amoxicillin, Ampicillin)', defaultGstRate: 12, status: 'active', isSystem: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
      { id: 'hsn_30042099', organizationId, code: '30042099', description: 'Other Antibiotics (Azithromycin, Ciprofloxacin, Erythromycin)', defaultGstRate: 12, status: 'active', isSystem: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
      { id: 'hsn_30043110', organizationId, code: '30043110', description: 'Insulin and derivatives for diabetic treatment', defaultGstRate: 5, status: 'active', isSystem: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
      { id: 'hsn_30061010', organizationId, code: '30061010', description: 'Sterile surgical catgut and sutures', defaultGstRate: 12, status: 'active', isSystem: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
      { id: 'hsn_90183100', organizationId, code: '90183100', description: 'Syringes, needles with or without needles', defaultGstRate: 12, status: 'active', isSystem: true, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
    ];
  }

  return records;
}
