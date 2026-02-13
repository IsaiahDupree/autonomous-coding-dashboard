import type { MetaApiErrorResponse } from './types';

/**
 * Base error class for all Meta API errors.
 * Wraps the structured error response from the Graph API.
 */
export class MetaApiError extends Error {
  public readonly code: number;
  public readonly type: string;
  public readonly errorSubcode?: number;
  public readonly errorUserTitle?: string;
  public readonly errorUserMsg?: string;
  public readonly fbtraceId?: string;
  public readonly isTransient: boolean;
  public readonly httpStatus: number;

  constructor(response: MetaApiErrorResponse, httpStatus: number = 400) {
    const { error } = response;
    super(error.message);
    this.name = 'MetaApiError';
    this.code = error.code;
    this.type = error.type;
    this.errorSubcode = error.error_subcode;
    this.errorUserTitle = error.error_user_title;
    this.errorUserMsg = error.error_user_msg;
    this.fbtraceId = error.fbtrace_id;
    this.isTransient = error.is_transient ?? false;
    this.httpStatus = httpStatus;

    // Preserve proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MetaApiError);
    }
  }

  /**
   * Build a structured JSON representation for logging.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      type: this.type,
      errorSubcode: this.errorSubcode,
      errorUserTitle: this.errorUserTitle,
      errorUserMsg: this.errorUserMsg,
      fbtraceId: this.fbtraceId,
      isTransient: this.isTransient,
      httpStatus: this.httpStatus,
    };
  }
}

/**
 * Thrown when the Meta API returns a 429 or an error code indicating rate
 * limiting (code 32, 4, or error_subcode 2446079).
 */
export class MetaRateLimitError extends MetaApiError {
  public readonly retryAfter: number; // seconds until the caller should retry
  public readonly usagePercent?: number;

  constructor(
    response: MetaApiErrorResponse,
    httpStatus: number = 429,
    retryAfter: number = 60,
    usagePercent?: number,
  ) {
    super(response, httpStatus);
    this.name = 'MetaRateLimitError';
    this.retryAfter = retryAfter;
    this.usagePercent = usagePercent;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MetaRateLimitError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      name: this.name,
      retryAfter: this.retryAfter,
      usagePercent: this.usagePercent,
    };
  }
}

/**
 * Thrown when the Meta API returns an authentication / authorization error
 * (code 190, or OAuthException type).
 */
export class MetaAuthError extends MetaApiError {
  constructor(response: MetaApiErrorResponse, httpStatus: number = 401) {
    super(response, httpStatus);
    this.name = 'MetaAuthError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MetaAuthError);
    }
  }
}

/**
 * Thrown when input validation fails before a request is even made, or when
 * the Meta API returns a validation-related error (code 100).
 */
export class MetaValidationError extends Error {
  public readonly field?: string;
  public readonly details: Record<string, unknown>;

  constructor(message: string, field?: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'MetaValidationError';
    this.field = field;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MetaValidationError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      field: this.field,
      details: this.details,
    };
  }
}

// ---------------------------------------------------------------------------
// Error Classification Helpers
// ---------------------------------------------------------------------------

/** Known Meta API error codes that indicate rate limiting. */
const RATE_LIMIT_CODES = new Set([4, 17, 32, 613]);
const RATE_LIMIT_SUBCODES = new Set([2446079]);

/** Known Meta API error codes that indicate auth problems. */
const AUTH_CODES = new Set([190, 102]);
const AUTH_TYPES = new Set(['OAuthException']);

/** Known Meta API error codes that indicate validation issues. */
const VALIDATION_CODES = new Set([100, 200]);

/**
 * Parses a raw Meta API error response and returns the appropriate typed
 * error subclass.  Falls back to the generic `MetaApiError` when the error
 * does not match a specific category.
 */
export function classifyMetaError(
  body: MetaApiErrorResponse,
  httpStatus: number,
  retryAfterHeader?: string,
): MetaApiError {
  const { error } = body;

  // Rate limit errors
  if (
    httpStatus === 429 ||
    RATE_LIMIT_CODES.has(error.code) ||
    (error.error_subcode !== undefined && RATE_LIMIT_SUBCODES.has(error.error_subcode))
  ) {
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60;
    return new MetaRateLimitError(body, httpStatus, isNaN(retryAfter) ? 60 : retryAfter);
  }

  // Auth errors
  if (AUTH_CODES.has(error.code) || AUTH_TYPES.has(error.type)) {
    return new MetaAuthError(body, httpStatus);
  }

  // Validation errors
  if (VALIDATION_CODES.has(error.code)) {
    return new MetaApiError(body, httpStatus);
  }

  return new MetaApiError(body, httpStatus);
}

/**
 * Type guard: returns true if the given error is any MetaApiError subclass.
 */
export function isMetaApiError(err: unknown): err is MetaApiError {
  return err instanceof MetaApiError;
}

/**
 * Type guard for rate-limit errors specifically.
 */
export function isMetaRateLimitError(err: unknown): err is MetaRateLimitError {
  return err instanceof MetaRateLimitError;
}

/**
 * Type guard for auth errors specifically.
 */
export function isMetaAuthError(err: unknown): err is MetaAuthError {
  return err instanceof MetaAuthError;
}

/**
 * Type guard for validation errors specifically.
 */
export function isMetaValidationError(err: unknown): err is MetaValidationError {
  return err instanceof MetaValidationError;
}
