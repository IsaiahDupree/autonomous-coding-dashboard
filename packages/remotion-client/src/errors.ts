/**
 * Custom error classes for the Remotion API client.
 *
 * Provides structured error types so consumers can catch and handle
 * specific failure modes (API errors, timeouts, rate limits, circuit breaker).
 */

// ---------------------------------------------------------------------------
// RemotionApiError
// ---------------------------------------------------------------------------

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
export class RemotionApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: Record<string, unknown> | undefined;
  public readonly requestId: string | undefined;

  constructor(message: string, opts: RemotionApiErrorDetails) {
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
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /** True when the error represents a server-side issue (5xx). */
  get isServerError(): boolean {
    return this.status >= 500 && this.status < 600;
  }

  /** True when the request could potentially succeed on retry. */
  get isRetryable(): boolean {
    return (
      this.status === 429 ||
      this.status === 502 ||
      this.status === 503 ||
      this.status === 504
    );
  }

  toJSON(): Record<string, unknown> {
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

// ---------------------------------------------------------------------------
// RemotionTimeoutError
// ---------------------------------------------------------------------------

/**
 * Thrown when a request exceeds its configured timeout.
 */
export class RemotionTimeoutError extends Error {
  /** The timeout duration that was exceeded (milliseconds). */
  public readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message);
    this.name = "RemotionTimeoutError";
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, RemotionTimeoutError.prototype);
  }
}

// ---------------------------------------------------------------------------
// RemotionRateLimitError
// ---------------------------------------------------------------------------

/**
 * Thrown when the API returns a 429 Too Many Requests response.
 * Includes `retryAfterMs` so callers know how long to wait.
 */
export class RemotionRateLimitError extends RemotionApiError {
  /** Milliseconds until the caller should retry, per the Retry-After header. */
  public readonly retryAfterMs: number;

  constructor(
    message: string,
    opts: RemotionApiErrorDetails & { retryAfterMs: number },
  ) {
    super(message, opts);
    this.name = "RemotionRateLimitError";
    this.retryAfterMs = opts.retryAfterMs;
    Object.setPrototypeOf(this, RemotionRateLimitError.prototype);
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      retryAfterMs: this.retryAfterMs,
    };
  }
}

// ---------------------------------------------------------------------------
// CircuitBreakerOpenError
// ---------------------------------------------------------------------------

/**
 * Thrown when the circuit breaker is in the "open" state and refuses to
 * execute the request.
 */
export class CircuitBreakerOpenError extends Error {
  /** Estimated time (ms) until the circuit breaker transitions to half-open. */
  public readonly retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = "CircuitBreakerOpenError";
    this.retryAfterMs = retryAfterMs;
    Object.setPrototypeOf(this, CircuitBreakerOpenError.prototype);
  }
}
