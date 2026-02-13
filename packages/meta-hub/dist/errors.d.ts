import type { MetaApiErrorResponse } from './types';
/**
 * Base error class for all Meta API errors.
 * Wraps the structured error response from the Graph API.
 */
export declare class MetaApiError extends Error {
    readonly code: number;
    readonly type: string;
    readonly errorSubcode?: number;
    readonly errorUserTitle?: string;
    readonly errorUserMsg?: string;
    readonly fbtraceId?: string;
    readonly isTransient: boolean;
    readonly httpStatus: number;
    constructor(response: MetaApiErrorResponse, httpStatus?: number);
    /**
     * Build a structured JSON representation for logging.
     */
    toJSON(): Record<string, unknown>;
}
/**
 * Thrown when the Meta API returns a 429 or an error code indicating rate
 * limiting (code 32, 4, or error_subcode 2446079).
 */
export declare class MetaRateLimitError extends MetaApiError {
    readonly retryAfter: number;
    readonly usagePercent?: number;
    constructor(response: MetaApiErrorResponse, httpStatus?: number, retryAfter?: number, usagePercent?: number);
    toJSON(): Record<string, unknown>;
}
/**
 * Thrown when the Meta API returns an authentication / authorization error
 * (code 190, or OAuthException type).
 */
export declare class MetaAuthError extends MetaApiError {
    constructor(response: MetaApiErrorResponse, httpStatus?: number);
}
/**
 * Thrown when input validation fails before a request is even made, or when
 * the Meta API returns a validation-related error (code 100).
 */
export declare class MetaValidationError extends Error {
    readonly field?: string;
    readonly details: Record<string, unknown>;
    constructor(message: string, field?: string, details?: Record<string, unknown>);
    toJSON(): Record<string, unknown>;
}
/**
 * Parses a raw Meta API error response and returns the appropriate typed
 * error subclass.  Falls back to the generic `MetaApiError` when the error
 * does not match a specific category.
 */
export declare function classifyMetaError(body: MetaApiErrorResponse, httpStatus: number, retryAfterHeader?: string): MetaApiError;
/**
 * Type guard: returns true if the given error is any MetaApiError subclass.
 */
export declare function isMetaApiError(err: unknown): err is MetaApiError;
/**
 * Type guard for rate-limit errors specifically.
 */
export declare function isMetaRateLimitError(err: unknown): err is MetaRateLimitError;
/**
 * Type guard for auth errors specifically.
 */
export declare function isMetaAuthError(err: unknown): err is MetaAuthError;
/**
 * Type guard for validation errors specifically.
 */
export declare function isMetaValidationError(err: unknown): err is MetaValidationError;
//# sourceMappingURL=errors.d.ts.map