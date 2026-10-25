import {
  doc,
  collection,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirestoreDb } from '../lib/firebase/config';
import { AuditLog, AuditAction, AuditEntityType, ExtendedAuditLog, AuditSeverity } from '../types';
import { validateAuditLog } from '../lib/firebase/validators';
import { sanitizeFirestorePayload } from '../lib/firebase/queryUtils';

export async function logAuditEvent(
  organizationId: string,
  params: {
    actorUid: string;
    actorEmail?: string | null;
    actorDisplayName?: string | null;
    action: AuditAction | string;
    entityType: AuditEntityType | string;
    entityId: string;
    storeId?: string | null;
    metadata?: Record<string, unknown>;
    // Enterprise Phase 3 extensions:
    actorRole?: string | null;
    actorType?: 'staff' | 'customer' | 'system' | 'api';
    eventType?: string;
    module?: string;
    entityLabel?: string | null;
    reason?: string | null;
    severity?: AuditSeverity;
    source?: 'web_app' | 'mobile_app' | 'api' | 'automation';
    correlationId?: string | null;
    transactionId?: string | null;
    before?: Record<string, any> | null;
    after?: Record<string, any> | null;
    changedFields?: string[] | null;
  }
): Promise<void> {
  return auditService.logAuditEvent({
    organizationId,
    ...params,
  });
}

export const auditService = {
  /**
   * Append an immutable audit event to /organizations/{orgId}/auditLogs/{logId}
   * Client-appended operational log with strict schema enforcement.
   */
  async logAuditEvent(params: {
    organizationId: string;
    storeId?: string | null;
    actorUid: string;
    actorEmail?: string | null;
    actorDisplayName?: string | null;
    action: AuditAction | string;
    entityType: AuditEntityType | string;
    entityId: string;
    metadata?: Record<string, unknown>;
    // Enterprise Phase 3 extensions:
    actorRole?: string | null;
    actorType?: 'staff' | 'customer' | 'system' | 'api';
    eventType?: string;
    module?: string;
    entityLabel?: string | null;
    reason?: string | null;
    severity?: AuditSeverity;
    source?: 'web_app' | 'mobile_app' | 'api' | 'automation';
    correlationId?: string | null;
    transactionId?: string | null;
    before?: Record<string, any> | null;
    after?: Record<string, any> | null;
    changedFields?: string[] | null;
  }): Promise<void> {
    if (!params.organizationId || !params.actorUid) return;

    try {
      const db = getFirestoreDb();
      const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const logDocRef = doc(db, 'organizations', params.organizationId, 'auditLogs', logId);

      // Clean up sensitive secrets before logging
      const sanitizedBefore = params.before ? this.sanitizeDataState(params.before) : null;
      const sanitizedAfter = params.after ? this.sanitizeDataState(params.after) : null;

      const logPayload = {
        id: logId,
        organizationId: params.organizationId,
        storeId: params.storeId ?? null,
        actorUid: params.actorUid,
        actorEmail: params.actorEmail ?? null,
        actorDisplayName: params.actorDisplayName ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata || {},
        timestamp: serverTimestamp(),
        // Extended Phase 3 properties:
        actorName: params.actorDisplayName || params.actorEmail?.split('@')[0] || 'Unknown User',
        actorRole: params.actorRole ?? 'Staff',
        actorType: params.actorType ?? 'staff',
        eventType: params.eventType ?? `${params.entityType}.${params.action.toLowerCase()}`,
        module: params.module ?? this.inferModuleFromEntity(params.entityType),
        entityLabel: params.entityLabel ?? params.entityId,
        reason: params.reason ?? null,
        severity: params.severity ?? 'INFO',
        source: params.source ?? 'web_app',
        correlationId: params.correlationId ?? null,
        transactionId: params.transactionId ?? null,
        before: sanitizedBefore,
        after: sanitizedAfter,
        changedFields: params.changedFields ?? (sanitizedBefore && sanitizedAfter ? this.calculateDiff(sanitizedBefore, sanitizedAfter) : null),
        createdAt: serverTimestamp(),
      };

      await setDoc(logDocRef, sanitizeFirestorePayload(logPayload));
    } catch (error) {
      console.warn('Audit log write error:', error);
    }
  },

  /**
   * Helper to strip passwords, secrets or payment info from data states
   */
  sanitizeDataState(data: Record<string, any>): Record<string, any> {
    const keysToStrip = ['password', 'secret', 'token', 'key', 'cvv', 'pin', 'card', 'credential'];
    const sanitized = { ...data };
    for (const key of Object.keys(sanitized)) {
      if (keysToStrip.some(k => key.toLowerCase().includes(k))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeDataState(sanitized[key]);
      }
    }
    return sanitized;
  },

  /**
   * Helper to calculate simple diff keys
   */
  calculateDiff(before: Record<string, any>, after: Record<string, any>): string[] {
    const changed: string[] = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of allKeys) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changed.push(key);
      }
    }
    return changed;
  },

  /**
   * Helper to infer module type from entity type
   */
  inferModuleFromEntity(entityType: string): string {
    const type = entityType.toLowerCase();
    if (type.includes('product') || type.includes('batch')) return 'inventory';
    if (type.includes('invoice') || type.includes('pos')) return 'pos';
    if (type.includes('purchase') || type.includes('grn')) return 'purchases';
    if (type.includes('return') || type.includes('credit')) return 'returns';
    if (type.includes('quarantine')) return 'quarantine';
    if (type.includes('destruction')) return 'destruction';
    if (type.includes('customer')) return 'customers';
    if (type.includes('supplier')) return 'suppliers';
    if (type.includes('transfer')) return 'transfers';
    if (type.includes('prescription')) return 'prescriptions';
    if (type.includes('gst') || type.includes('account') || type.includes('journal')) return 'gst_accounts';
    if (type.includes('task')) return 'tasks';
    if (type.includes('notification')) return 'notifications';
    if (type.includes('setting') || type.includes('role') || type.includes('staff')) return 'settings';
    return 'system';
  },

  /**
   * Fetch recent audit logs for an organization
   */
  async getAuditLogs(orgId: string, maxLimit = 50): Promise<ExtendedAuditLog[]> {
    if (!orgId) return [];
    try {
      const db = getFirestoreDb();
      const logsCollRef = collection(db, 'organizations', orgId, 'auditLogs');
      const q = query(logsCollRef, orderBy('timestamp', 'desc'), limit(maxLimit));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const rawLog: any = {
          id: docSnap.id,
          organizationId: orgId,
          storeId: data.storeId ?? null,
          actorUid: data.actorUid,
          actorEmail: data.actorEmail ?? null,
          actorDisplayName: data.actorDisplayName ?? null,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          metadata: data.metadata || {},
          timestamp: data.timestamp,
        };

        if (!validateAuditLog(rawLog, orgId)) {
          console.warn(`Audit log validation warning for ID: ${docSnap.id}`);
        }

        // Map and normalize to ExtendedAuditLog
        return {
          ...rawLog,
          actorName: data.actorName || data.actorDisplayName || data.actorEmail?.split('@')[0] || 'Staff User',
          actorRole: data.actorRole || 'Staff',
          actorType: data.actorType || 'staff',
          eventType: data.eventType || `${data.entityType}.${data.action.toLowerCase()}`,
          module: data.module || this.inferModuleFromEntity(data.entityType),
          entityLabel: data.entityLabel || data.entityId,
          reason: data.reason || null,
          severity: data.severity || 'INFO',
          source: data.source || 'web_app',
          correlationId: data.correlationId || null,
          transactionId: data.transactionId || null,
          before: data.before || null,
          after: data.after || null,
          changedFields: data.changedFields || null,
          createdAt: data.createdAt || data.timestamp,
        } as ExtendedAuditLog;
      });
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
      return [];
    }
  },

  /**
   * Filter and query audit logs with advanced constraints
   */
  async getFilteredAuditLogs(
    orgId: string,
    filters: {
      storeId?: string | null;
      module?: string;
      severity?: AuditSeverity;
      actorUid?: string;
      entityType?: string;
      startDate?: Date;
      endDate?: Date;
      searchTerm?: string;
    },
    maxLimit = 100
  ): Promise<ExtendedAuditLog[]> {
    // Since complex combination queries in Firestore require compound indexes,
    // we query recent logs and filter on client to guarantee zero unindexed crashes,
    // while providing perfect filtering experience for standard workspace volume.
    const allRecent = await this.getAuditLogs(orgId, 500);
    
    return allRecent.filter(log => {
      if (filters.storeId !== undefined && log.storeId !== filters.storeId) return false;
      if (filters.module && log.module !== filters.module) return false;
      if (filters.severity && log.severity !== filters.severity) return false;
      if (filters.actorUid && log.actorUid !== filters.actorUid) return false;
      if (filters.entityType && log.entityType !== filters.entityType) return false;
      
      if (filters.startDate || filters.endDate) {
        const tDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
        if (filters.startDate && tDate < filters.startDate) return false;
        if (filters.endDate && tDate > filters.endDate) return false;
      }

      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const match =
          log.actorName?.toLowerCase().includes(term) ||
          log.action?.toLowerCase().includes(term) ||
          log.entityType?.toLowerCase().includes(term) ||
          log.entityId?.toLowerCase().includes(term) ||
          log.entityLabel?.toLowerCase().includes(term) ||
          log.reason?.toLowerCase().includes(term);
        if (!match) return false;
      }

      return true;
    }).slice(0, maxLimit);
  }
};
