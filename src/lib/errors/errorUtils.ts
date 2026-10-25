import { ErrorCategory, AppErrorOptions } from '../../types/foundation';

export class AppError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly category: ErrorCategory;
  public readonly retryable: boolean;
  public readonly originalError?: unknown;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.category = options.category || 'unknown';
    this.userMessage = options.userMessage || options.message;
    this.retryable = options.retryable ?? false;
    this.originalError = options.originalError;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Converts any unknown error (Firebase Error, JS Error, string, network error)
 * into a standardized AppError without leaking internal database structure.
 */
export function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }

  const rawMsg = err && typeof err === 'object' && 'message' in err ? String((err as any).message) : String(err);
  const code = err && typeof err === 'object' && 'code' in err ? String((err as any).code) : 'ERR_UNKNOWN';

  // 1. Firebase / Security Permission Denied
  if (code === 'permission-denied' || rawMsg.includes('permission-denied') || rawMsg.includes('PERMISSION_DENIED')) {
    return new AppError({
      code: 'PERMISSION_DENIED',
      message: 'Access denied due to insufficient permissions.',
      userMessage: 'You do not have permission to perform this action. Please contact your organization administrator.',
      category: 'permission-denied',
      retryable: false,
      originalError: err,
    });
  }

  // 2. Resource Not Found
  if (code === 'not-found' || rawMsg.includes('not-found') || rawMsg.includes('NOT_FOUND')) {
    return new AppError({
      code: 'NOT_FOUND',
      message: 'Requested record was not found.',
      userMessage: 'The requested record or resource could not be found.',
      category: 'not-found',
      retryable: false,
      originalError: err,
    });
  }

  // 3. Resource Already Exists / Conflict
  if (code === 'already-exists' || rawMsg.includes('already-exists') || rawMsg.includes('ALREADY_EXISTS')) {
    return new AppError({
      code: 'ALREADY_EXISTS',
      message: 'Resource already exists.',
      userMessage: 'A record with this identifier or email already exists.',
      category: 'already-exists',
      retryable: false,
      originalError: err,
    });
  }

  // 4. Network / Connection Error
  if (
    code === 'unavailable' ||
    code === 'failed-precondition' ||
    rawMsg.includes('network') ||
    rawMsg.includes('Failed to fetch') ||
    rawMsg.includes('offline')
  ) {
    return new AppError({
      code: 'NETWORK_ERROR',
      message: 'Network connection issue.',
      userMessage: 'Network error or connection lost. Please check your internet connection and try again.',
      category: 'network',
      retryable: true,
      originalError: err,
    });
  }

  // 5. Validation Error
  if (rawMsg.includes('validation') || rawMsg.includes('invalid-argument') || code === 'invalid-argument') {
    return new AppError({
      code: 'VALIDATION_ERROR',
      message: rawMsg || 'Invalid input parameter.',
      userMessage: rawMsg || 'Please verify your form inputs and try again.',
      category: 'validation',
      retryable: false,
      originalError: err,
    });
  }

  // 6. Generic Fallback
  return new AppError({
    code: code !== 'ERR_UNKNOWN' ? code : 'APP_ERROR',
    message: rawMsg || 'An unexpected application error occurred.',
    userMessage: 'An error occurred while processing your request. Please try again.',
    category: 'unknown',
    retryable: true,
    originalError: err,
  });
}

/**
 * Gets a clean, safe, user-friendly message for UI display.
 */
export function getUserFriendlyErrorMessage(err: unknown): string {
  const normalized = normalizeError(err);
  return normalized.userMessage;
}
