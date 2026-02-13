"use strict";
/**
 * Custom error classes for the Remotion API client.
 *
 * Provides structured error types so consumers can catch and handle
 * specific failure modes (API errors, timeouts, rate limits, circuit breaker).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerOpenError = exports.RemotionRateLimitError = exports.RemotionTimeoutError = exports.RemotionApiError = void 0;
/**
 * Represents an error response from the Remotion API.
 */
class RemotionApiError extends Error {
    status;
    code;
    details;
    requestId;
    constructor(message, opts) {
        super(message);
        this.name = "RemotionApiError";
        this.status = opts.status;
        this.code = opts.code;
        this.details = opts.details;
        this.requestId = opts.requestId;
        // Maintain proper prototype chain for instanceof checks.
        Object.setPrototypeOf(this, RemotionApiError.prototype);
    }
    /** True when the error represents a client-side mistake (4xx). */
    get isClientError() {
        return this.status >= 400 && this.status < 500;
    }
    /** True when the error represents a server-side issue (5xx). */
    get isServerError() {
        return this.status >= 500 && this.status < 600;
    }
    /** True when the request could potentially succeed on retry. */
    get isRetryable() {
        return (this.status === 429 ||
            this.status === 502 ||
            this.status === 503 ||
            this.status === 504);
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            status: this.status,
            code: this.code,
            details: this.details,
            requestId: this.requestId,
        };
    }
}
exports.RemotionApiError = RemotionApiError;
// ---------------------------------------------------------------------------
// RemotionTimeoutError
// ---------------------------------------------------------------------------
/**
 * Thrown when a request exceeds its configured timeout.
 */
class RemotionTimeoutError extends Error {
    /** The timeout duration that was exceeded (milliseconds). */
    timeoutMs;
    constructor(message, timeoutMs) {
        super(message);
        this.name = "RemotionTimeoutError";
        this.timeoutMs = timeoutMs;
        Object.setPrototypeOf(this, RemotionTimeoutError.prototype);
    }
}
exports.RemotionTimeoutError = RemotionTimeoutError;
// ---------------------------------------------------------------------------
// RemotionRateLimitError
// ---------------------------------------------------------------------------
/**
 * Thrown when the API returns a 429 Too Many Requests response.
 * Includes `retryAfterMs` so callers know how long to wait.
 */
class RemotionRateLimitError extends RemotionApiError {
    /** Milliseconds until the caller should retry, per the Retry-After header. */
    retryAfterMs;
    constructor(message, opts) {
        super(message, opts);
        this.name = "RemotionRateLimitError";
        this.retryAfterMs = opts.retryAfterMs;
        Object.setPrototypeOf(this, RemotionRateLimitError.prototype);
    }
    toJSON() {
        return {
            ...super.toJSON(),
            retryAfterMs: this.retryAfterMs,
        };
    }
}
exports.RemotionRateLimitError = RemotionRateLimitError;
// ---------------------------------------------------------------------------
// CircuitBreakerOpenError
// ---------------------------------------------------------------------------
/**
 * Thrown when the circuit breaker is in the "open" state and refuses to
 * execute the request.
 */
class CircuitBreakerOpenError extends Error {
    /** Estimated time (ms) until the circuit breaker transitions to half-open. */
    retryAfterMs;
    constructor(message, retryAfterMs) {
        super(message);
        this.name = "CircuitBreakerOpenError";
        this.retryAfterMs = retryAfterMs;
        Object.setPrototypeOf(this, CircuitBreakerOpenError.prototype);
    }
}
exports.CircuitBreakerOpenError = CircuitBreakerOpenError;
//# sourceMappingURL=errors.js.map