"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaValidationError = exports.MetaAuthError = exports.MetaRateLimitError = exports.MetaApiError = void 0;
exports.classifyMetaError = classifyMetaError;
exports.isMetaApiError = isMetaApiError;
exports.isMetaRateLimitError = isMetaRateLimitError;
exports.isMetaAuthError = isMetaAuthError;
exports.isMetaValidationError = isMetaValidationError;
/**
 * Base error class for all Meta API errors.
 * Wraps the structured error response from the Graph API.
 */
class MetaApiError extends Error {
    constructor(response, httpStatus = 400) {
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
    toJSON() {
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
exports.MetaApiError = MetaApiError;
/**
 * Thrown when the Meta API returns a 429 or an error code indicating rate
 * limiting (code 32, 4, or error_subcode 2446079).
 */
class MetaRateLimitError extends MetaApiError {
    constructor(response, httpStatus = 429, retryAfter = 60, usagePercent) {
        super(response, httpStatus);
        this.name = 'MetaRateLimitError';
        this.retryAfter = retryAfter;
        this.usagePercent = usagePercent;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, MetaRateLimitError);
        }
    }
    toJSON() {
        return {
            ...super.toJSON(),
            name: this.name,
            retryAfter: this.retryAfter,
            usagePercent: this.usagePercent,
        };
    }
}
exports.MetaRateLimitError = MetaRateLimitError;
/**
 * Thrown when the Meta API returns an authentication / authorization error
 * (code 190, or OAuthException type).
 */
class MetaAuthError extends MetaApiError {
    constructor(response, httpStatus = 401) {
        super(response, httpStatus);
        this.name = 'MetaAuthError';
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, MetaAuthError);
        }
    }
}
exports.MetaAuthError = MetaAuthError;
/**
 * Thrown when input validation fails before a request is even made, or when
 * the Meta API returns a validation-related error (code 100).
 */
class MetaValidationError extends Error {
    constructor(message, field, details = {}) {
        super(message);
        this.name = 'MetaValidationError';
        this.field = field;
        this.details = details;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, MetaValidationError);
        }
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            field: this.field,
            details: this.details,
        };
    }
}
exports.MetaValidationError = MetaValidationError;
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
function classifyMetaError(body, httpStatus, retryAfterHeader) {
    const { error } = body;
    // Rate limit errors
    if (httpStatus === 429 ||
        RATE_LIMIT_CODES.has(error.code) ||
        (error.error_subcode !== undefined && RATE_LIMIT_SUBCODES.has(error.error_subcode))) {
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
function isMetaApiError(err) {
    return err instanceof MetaApiError;
}
/**
 * Type guard for rate-limit errors specifically.
 */
function isMetaRateLimitError(err) {
    return err instanceof MetaRateLimitError;
}
/**
 * Type guard for auth errors specifically.
 */
function isMetaAuthError(err) {
    return err instanceof MetaAuthError;
}
/**
 * Type guard for validation errors specifically.
 */
function isMetaValidationError(err) {
    return err instanceof MetaValidationError;
}
//# sourceMappingURL=errors.js.map