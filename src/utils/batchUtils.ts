import { PharmacyBatch } from '../types/batch';

/**
 * Calculates days remaining until the batch's expiry date (can be negative if already expired).
 * Compares date-only values (disregarding hours/minutes/seconds) for deterministic outcome.
 */
export function getDaysUntilExpiry(batch: { expiryDate?: any }): number {
  if (!batch || !batch.expiryDate) return 9999; // Items without expiry (e.g. Tiles) never expire

  let expiryMillis = 0;
  if (typeof batch.expiryDate.toMillis === 'function') {
    expiryMillis = batch.expiryDate.toMillis();
  } else if (typeof batch.expiryDate.toDate === 'function') {
    expiryMillis = batch.expiryDate.toDate().getTime();
  } else if (typeof batch.expiryDate.seconds === 'number') {
    expiryMillis = batch.expiryDate.seconds * 1000;
  } else if (batch.expiryDate instanceof Date) {
    expiryMillis = batch.expiryDate.getTime();
  } else {
    expiryMillis = new Date(batch.expiryDate).getTime();
  }

  const now = new Date();
  // Start of today (date-only)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const expDate = new Date(expiryMillis);
  // Start of expiry day (date-only)
  const exp = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate()).getTime();

  const diffTime = exp - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Checks if a batch has reached or passed its expiry date.
 */
export function isBatchExpired(batch: { expiryDate?: any }): boolean {
  if (!batch || !batch.expiryDate) return false;
  return getDaysUntilExpiry(batch) <= 0;
}

/**
 * Checks if a batch will expire within the configured threshold (default 30 days).
 */
export function isBatchExpiringSoon(batch: { expiryDate?: any }, thresholdDays = 30): boolean {
  if (!batch || !batch.expiryDate) return false;
  const days = getDaysUntilExpiry(batch);
  return days > 0 && days <= thresholdDays;
}

/**
 * Determines the categorical expiry condition state of a batch.
 */
export function getBatchExpiryState(
  batch: { expiryDate?: any },
  thresholdDays = 30
): 'expired' | 'expiring-soon' | 'valid' {
  if (!batch || !batch.expiryDate) return 'valid';
  const days = getDaysUntilExpiry(batch);
  if (days <= 0) return 'expired';
  if (days <= thresholdDays) return 'expiring-soon';
  return 'valid';
}
