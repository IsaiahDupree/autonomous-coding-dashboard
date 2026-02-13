/**
 * Custom error classes for the Remotion API client.
 *
 * Provides structured error types so consumers can catch and handle
 * specific failure modes (API errors, timeouts, rate limits, circuit breaker).
 */
export interface RemotionApiErrorDetails {
    /** HTTP status code returned by the API. */
    status: number;
    /** Machine-readable error code (e.g. "INVALID_INPUT"). */
    code: string;
    /** Additional details or context from the API response. */
    details?: Record<string, unknown>;
    /** The request ID, if the server returned one. */
    requestId?: string;
}
/**
 * Represents an error response from the Remotion API.
 */
export declare class RemotionApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly details: Record<string, unknown> | undefined;
    readonly requestId: string | undefined;
    constructor(message: string, opts: RemotionApiErrorDetails);
    /** True when the error represents a client-side mistake (4xx). */
    get isClientError(): boolean;
    /** True when the error represents a server-side issue (5xx). */
    get isServerError(): boolean;
    /** True when the request could potentially succeed on retry. */
    get isRetryable(): boolean;
    toJSON(): Record<string, unknown>;
}
/**
 * Thrown when a request exceeds its configured timeout.
 */
export declare class RemotionTimeoutError extends Error {
    /** The timeout duration that was exceeded (milliseconds). */
    readonly timeoutMs: number;
    constructor(message: string, timeoutMs: number);
}
/**
 * Thrown when the API returns a 429 Too Many Requests response.
 * Includes `retryAfterMs` so callers know how long to wait.
 */
export declare class RemotionRateLimitError extends RemotionApiError {
    /** Milliseconds until the caller should retry, per the Retry-After header. */
    readonly retryAfterMs: number;
    constructor(message: string, opts: RemotionApiErrorDetails & {
        retryAfterMs: number;
    });
    toJSON(): Record<string, unknown>;
}
/**
 * Thrown when the circuit breaker is in the "open" state and refuses to
 * execute the request.
 */
export declare class CircuitBreakerOpenError extends Error {
    /** Estimated time (ms) until the circuit breaker transitions to half-open. */
    readonly retryAfterMs: number;
    constructor(message: string, retryAfterMs: number);
}
//# sourceMappingURL=errors.d.ts.map