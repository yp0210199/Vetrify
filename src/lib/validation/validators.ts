export * from '../firebase/validators';

/**
 * Validates non-empty required string or value
 */
export function validateRequired(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  return true;
}

/**
 * Validates positive number (> 0 or >= 0)
 */
export function validatePositiveNumber(val: unknown, allowZero = true): boolean {
  if (typeof val !== 'number' || isNaN(val)) return false;
  return allowZero ? val >= 0 : val > 0;
}

/**
 * Validates identifier string (letters, numbers, hyphens, underscores)
 */
export function validateId(val: unknown): boolean {
  if (typeof val !== 'string' || !val.trim()) return false;
  return /^[a-zA-Z0-9_\-]+$/.test(val.trim());
}

/**
 * Validates value belongs to an array of allowed enum values
 */
export function validateEnum<T extends string>(val: unknown, allowedValues: readonly T[]): val is T {
  if (typeof val !== 'string') return false;
  return allowedValues.includes(val as T);
}
