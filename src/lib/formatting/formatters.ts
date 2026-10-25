import { Timestamp } from 'firebase/firestore';
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from '../constants';

/**
 * Safely parses any date input (Firestore Timestamp, ISO string, JS Date, number) into a JS Date object.
 */
export function parseFirestoreTimestamp(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (val instanceof Timestamp) return val.toDate();
  if (typeof (val as any)?.toDate === 'function') {
    try {
      const d = (val as any).toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d;
    } catch {
      // fallback
    }
  }
  if (typeof val === 'object' && val !== null) {
    const s = (val as any).seconds ?? (val as any)._seconds;
    if (typeof s === 'number') {
      return new Date(s * 1000);
    }
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    // If it is MM/YY format (e.g. "05/26")
    const mmYyMatch = val.match(/^(\d{1,2})\/(\d{2}|\d{4})$/);
    if (mmYyMatch) {
      const month = parseInt(mmYyMatch[1], 10) - 1;
      let year = parseInt(mmYyMatch[2], 10);
      if (year < 100) year += 2000;
      return new Date(year, month, 1);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Formats a batch expiry date into MM/YY format (or localized string) safely
 */
export function formatBatchExpiryDate(val: unknown): string {
  if (!val) return '—';
  if (typeof val === 'string' && /^\d{1,2}\/\d{2,4}$/.test(val.trim())) {
    return val.trim();
  }
  const date = parseFirestoreTimestamp(val);
  if (!date) return typeof val === 'string' ? val : '—';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${year}`;
}

/**
 * Safely formats any number or unknown value with toFixed, preventing undefined/null crashes.
 */
export function safeToFixed(value: unknown, decimals: number = 2): string {
  const num = Number(value);
  if (isNaN(num) || value === null || value === undefined) {
    return (0).toFixed(decimals);
  }
  return num.toFixed(decimals);
}

/**
 * Formats a numeric amount to standard localized currency format.
 * Default: INR (₹) with Indian number grouping (e.g., ₹1,50,000.00)
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
  showDecimals: boolean = true
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }

  const locale = currency === 'INR' ? 'en-IN' : 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0,
    }).format(amount);
  } catch {
    return `${currency === 'INR' ? '₹' : ''}${safeToFixed(amount, showDecimals ? 2 : 0)}`;
  }
}

/**
 * Formats a date into localized string format.
 */
export function formatDate(
  val: unknown,
  timeZone: string = DEFAULT_TIMEZONE,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseFirestoreTimestamp(val);
  if (!date) return '—';

  const defaultOpts: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone,
    ...options,
  };

  try {
    return new Intl.DateTimeFormat('en-IN', defaultOpts).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

export const formatDisplayDate = formatDate;

/**
 * Formats a date + time into localized string format.
 */
export function formatDateTime(
  val: unknown,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  const date = parseFirestoreTimestamp(val);
  if (!date) return '—';

  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/**
 * Formats time only into 12-hour format with AM/PM.
 */
export function formatTime(
  val: unknown,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  const date = parseFirestoreTimestamp(val);
  if (!date) return '—';

  try {
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone,
    }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
}

/**
 * Formats a date into a human-readable relative time string (e.g. "5 mins ago", "2 hours ago").
 */
export function formatRelativeTime(val: unknown): string {
  const date = parseFirestoreTimestamp(val);
  if (!date) return '—';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 30) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return formatDate(date);
}
