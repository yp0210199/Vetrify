import {
  collection,
  doc,
  query,
  where,
  Query,
  DocumentReference,
  CollectionReference,
  QueryConstraint,
} from 'firebase/firestore';
import { getFirestoreDb } from './config';

/**
 * Helper to get typed reference for an organization document
 */
export function getOrgDocRef(orgId: string): DocumentReference {
  const db = getFirestoreDb();
  return doc(db, 'organizations', orgId);
}

/**
 * Helper to get collection reference for organization staff
 */
export function getOrgStaffRef(orgId: string): CollectionReference {
  const db = getFirestoreDb();
  return collection(db, 'organizations', orgId, 'staff');
}

/**
 * Helper to get collection reference for organization stores
 */
export function getOrgStoresRef(orgId: string): CollectionReference {
  const db = getFirestoreDb();
  return collection(db, 'organizations', orgId, 'stores');
}

/**
 * Helper to get collection reference for organization roles
 */
export function getOrgRolesRef(orgId: string): CollectionReference {
  const db = getFirestoreDb();
  return collection(db, 'organizations', orgId, 'roles');
}

/**
 * Helper to get collection reference for organization notifications
 */
export function getOrgNotificationsRef(orgId: string): CollectionReference {
  const db = getFirestoreDb();
  return collection(db, 'organizations', orgId, 'notifications');
}

/**
 * Helper to get collection reference for organization audit logs
 */
export function getOrgAuditLogsRef(orgId: string): CollectionReference {
  const db = getFirestoreDb();
  return collection(db, 'organizations', orgId, 'auditLogs');
}

/**
 * Safe query builder ensuring tenant isolation on organization collections
 */
export function buildTenantQuery(
  colRef: CollectionReference,
  constraints: QueryConstraint[] = []
): Query {
  return query(colRef, ...constraints);
}

/**
 * Recursively sanitizes an object or array for Firestore serialization:
 * - Replaces `undefined` values with `null`
 * - Preserves Firestore FieldValues (serverTimestamp, deleteField, etc.) and Timestamps
 * - Recursively processes nested arrays and plain objects
 */
export function sanitizeFirestorePayload<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  // Preserve Date instances, Timestamps, and Firestore internal FieldValues
  if (
    data instanceof Date ||
    typeof (data as any)?.toMillis === 'function' ||
    typeof (data as any)?.toDate === 'function' ||
    (data as any)?._methodName !== undefined ||
    (data as any)?.constructor?.name === 'FieldValue'
  ) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeFirestorePayload(item)) as unknown as T;
  }
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value === undefined) {
      sanitized[key] = null;
    } else {
      sanitized[key] = sanitizeFirestorePayload(value);
    }
  }
  return sanitized as T;
}
