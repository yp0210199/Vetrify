import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { logAuditEvent } from './auditService';

export interface QualityOverrideLog {
  id: string;
  organizationId: string;
  storeId: string;
  invoiceNumber: string;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  items: Array<{ name: string; composition?: string; shade?: string; caliber?: string }>;
  pharmacistUid: string;
  pharmacistName: string;
  createdAt: Timestamp;
}

export type ClinicalOverrideLog = QualityOverrideLog;

export interface MaterialCompatibilityAlert {
  severity: 'low' | 'moderate' | 'high' | 'severe';
  item1: string;
  item2: string;
  description: string;
  recommendation: string;
}

export type DrugInteractionAlert = MaterialCompatibilityAlert;

function getQualityLogsRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'qualityOverrideLogs');
}

export const qualityOverrideService = {
  /**
   * Log a tile shade mismatch or technical quality override by an authorized showroom manager during POS billing
   */
  async logQualityOverride(
    organizationId: string,
    storeId: string,
    invoiceNumber: string,
    reason: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH',
    details: { items: Array<{ name: string; composition?: string; shade?: string; caliber?: string }> },
    approver: { uid: string; displayName?: string | null }
  ): Promise<QualityOverrideLog> {
    const logRef = doc(getQualityLogsRef(organizationId));
    const now = Timestamp.now();

    const record: QualityOverrideLog = {
      id: logRef.id,
      organizationId,
      storeId,
      invoiceNumber,
      reason,
      severity,
      items: details.items || [],
      pharmacistUid: approver.uid,
      pharmacistName: approver.displayName || 'Authorized Showroom Head',
      createdAt: now,
    };

    await setDoc(logRef, record);

    try {
      await logAuditEvent(organizationId, {
        actorUid: approver.uid,
        actorDisplayName: approver.displayName || undefined,
        action: 'pos.quality_override',
        entityType: 'invoice',
        entityId: invoiceNumber,
        storeId,
        metadata: {
          severity,
          reason,
          itemsCount: details.items.length,
        },
      });
    } catch (e) {
      console.warn('Audit log failed for quality override:', e);
    }

    return record;
  },

  /**
   * Alias for backward compatibility
   */
  async logClinicalOverride(
    organizationId: string,
    storeId: string,
    invoiceNumber: string,
    reason: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH',
    details: { items: Array<{ name: string; composition?: string }> },
    approver: { uid: string; displayName?: string | null }
  ): Promise<QualityOverrideLog> {
    return this.logQualityOverride(organizationId, storeId, invoiceNumber, reason, severity, details, approver);
  },

  /**
   * Check material compatibility & shade harmony between cart items
   */
  checkMaterialCompatibility(
    items: Array<{ name: string; composition?: string; category?: string; shade?: string; size?: string }>
  ): MaterialCompatibilityAlert[] {
    const alerts: MaterialCompatibilityAlert[] = [];
    const itemDescriptions = items.map((i) => `${i.name} ${i.composition || ''} ${i.category || ''}`.toLowerCase());

    // 1. Large Format Vitrified Slabs vs Standard Cement Sand Mortar
    const hasLargeSlab = itemDescriptions.some(d => d.includes('1200x2400') || d.includes('800x1600') || d.includes('slab') || d.includes('large format'));
    const hasNormalAdhesive = itemDescriptions.some(d => d.includes('type 1') || d.includes('standard adhesive'));
    if (hasLargeSlab && hasNormalAdhesive) {
      alerts.push({
        severity: 'severe',
        item1: 'Large Format Vitrified Slab',
        item2: 'Type-1 Standard Adhesive',
        description: 'Large format tiles require High-Polymer Type-2 or Type-3 Adhesive (IS 15477:2019) for thermal and shear stability.',
        recommendation: 'Recommend upgrading to Type-2 / Type-3 polymer adhesive to avoid tile de-bonding and hollow sound.',
      });
    }

    // 2. Concealed Diverter Body vs Trim Plate series check
    const hasDiverterBody = itemDescriptions.some(d => d.includes('diverter body') || d.includes('concealed body'));
    const hasDiverterTrim = itemDescriptions.some(d => d.includes('trim kit') || d.includes('upper part'));
    if (hasDiverterBody && !hasDiverterTrim) {
      alerts.push({
        severity: 'moderate',
        item1: 'Concealed Diverter Body',
        item2: 'Missing Trim Kit',
        description: 'Customer cart has concealed diverter body without matching brand exposed trim flange kit.',
        recommendation: 'Verify if customer already has matching series trim kit or add compatible exposed upper parts.',
      });
    }

    return alerts;
  },

  /**
   * Alias for backward compatibility
   */
  checkDrugInteractions(
    items: Array<{ name: string; composition?: string }>
  ): MaterialCompatibilityAlert[] {
    return this.checkMaterialCompatibility(items);
  },

  /**
   * Fetch historical overrides for regulatory and quality audits
   */
  async getQualityLogs(
    organizationId: string,
    options?: { storeId?: string; limitCount?: number }
  ): Promise<QualityOverrideLog[]> {
    try {
      let q = query(
        getQualityLogsRef(organizationId),
        orderBy('createdAt', 'desc'),
        limit(options?.limitCount || 50)
      );

      if (options?.storeId) {
        q = query(
          getQualityLogsRef(organizationId),
          where('storeId', '==', options.storeId),
          orderBy('createdAt', 'desc'),
          limit(options?.limitCount || 50)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as QualityOverrideLog));
    } catch (err) {
      console.error('Failed to fetch quality override logs:', err);
      return [];
    }
  },

  /**
   * Alias for backward compatibility
   */
  async getClinicalLogs(
    organizationId: string,
    options?: { storeId?: string; limitCount?: number }
  ): Promise<QualityOverrideLog[]> {
    return this.getQualityLogs(organizationId, options);
  },
};

export const clinicalService = qualityOverrideService;
export default qualityOverrideService;
