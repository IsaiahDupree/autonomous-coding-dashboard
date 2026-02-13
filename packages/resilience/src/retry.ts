import { RetryConfig, RetryConfigSchema } from './types';
import { CircuitBreaker } from './circuit-breaker';

/**
 * Error that carries HTTP status and optional Retry-After header.
 */
export interface RetryableError extends Error {
  status?: number;
  retryAfter?: number | string;
}

/**
 * Default predicate: retry on 429, 5xx, and network errors.
 */
function defaultRetryableErrors(error: unknown): boolean {
  if (error instanceof Error) {
    const retryable = error as RetryableError;
    // Retry on rate limits and server errors
    if (retryable.status !== undefined) {
      return [429, 500, 502, 503, 504].includes(retryable.status);
    }
    // Retry on common network error messages
    const msg = retryable.message.toLowerCase();
    return (
      msg.includes('econnrefused') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('enotfound') ||
      msg.includes('network') ||
      msg.includes('socket hang up') ||
      msg.includes('fetch failed')
    );
  }
  return false;
}

/**
 * Calculate delay with exponential backoff and full jitter.
 */
function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number,
  jitterFactor: number,
): number {
  const exponentialDelay = baseDelayMs * Math.pow(backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  // Full jitter: random value between (1 - jitterFactor) * delay and (1 + jitterFactor) * delay
  const jitterMin = cappedDelay * (1 - jitterFactor);
  const jitterMax = cappedDelay * (1 + jitterFactor);
  return jitterMin + Math.random() * (jitterMax - jitterMin);
}

/**
 * Parse a Retry-After header value into milliseconds.
 */
function parseRetryAfter(retryAfter: number | string | undefined): number | null {
  if (retryAfter === undefined) return null;

  if (typeof retryAfter === 'number') {
    return retryAfter * 1000; // Retry-After in seconds -> ms
  }

  // Try parsing as seconds
  const seconds = Number(retryAfter);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // Try parsing as HTTP date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return null;
}

/**
 * Sleep for the given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * RES-002: Retry with exponential backoff and jitter.
 *
 * @param fn - The async function to retry.
 * @param config - Optional retry configuration.
 * @returns The result of the function call.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>,
): Promise<T> {
  const parsed = RetryConfigSchema.parse(config ?? {});
  const {
    maxRetries,
    baseDelayMs,
    maxDelayMs,
    backoffMultiplier,
    jitterFactor,
    retryableErrors,
  } = parsed;

  const shouldRetry = retryableErrors ?? defaultRetryableErrors;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts
      if (attempt >= maxRetries) {
        break;
      }

      // Don't retry if error is not retryable
      if (!shouldRetry(error)) {
        break;
      }

      // Check for Retry-After header
      const retryableErr = error as RetryableError;
      const retryAfterMs = parseRetryAfter(retryableErr.retryAfter);

      const delay =
        retryAfterMs ??
        calculateDelay(
          attempt,
          baseDelayMs,
          maxDelayMs,
          backoffMultiplier,
          jitterFactor,
        );

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Combines retry with a circuit breaker: the circuit breaker wraps each
 * attempt so that persistent failures trip the breaker.
 */
export async function retryWithCircuitBreaker<T>(
  fn: () => Promise<T>,
  retryConfig: Partial<RetryConfig> | undefined,
  breaker: CircuitBreaker<T>,
): Promise<T> {
  return retry(() => breaker.execute(fn), retryConfig);
}

/**
 * Pre-configured retry for Meta (Facebook) API.
 * Respects rate limits, retries on specific Meta error codes.
 */
export function createMetaRetryConfig(): Partial<RetryConfig> {
  return {
    maxRetries: 5,
    baseDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    jitterFactor: 0.2,
    retryableErrors: (error: unknown): boolean => {
      if (!(error instanceof Error)) return false;
      const err = error as RetryableError;

      // Rate limits
      if (err.status === 429) return true;

      // Server errors
      if (err.status !== undefined && err.status >= 500 && err.status < 600) {
        return true;
      }

      // Meta-specific error codes in messages
      const msg = err.message.toLowerCase();
      return (
        msg.includes('temporarily unavailable') ||
        msg.includes('rate limit') ||
        msg.includes('too many calls') ||
        msg.includes('oauthexception') ||
        msg.includes('unknown error')
      );
    },
  };
}

/**
 * Pre-configured retry for Remotion rendering API.
 */
export function createRemotionRetryConfig(): Partial<RetryConfig> {
  return {
    maxRetries: 3,
    baseDelayMs: 5000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    jitterFactor: 0.15,
    retryableErrors: (error: unknown): boolean => {
      if (!(error instanceof Error)) return false;
      const err = error as RetryableError;

      // Server errors
      if (err.status !== undefined && err.status >= 500 && err.status < 600) {
        return true;
      }

      // Rate limits
      if (err.status === 429) return true;

      // Remotion-specific transient errors
      const msg = err.message.toLowerCase();
      return (
        msg.includes('render timed out') ||
        msg.includes('browser disconnected') ||
        msg.includes('out of memory') ||
        msg.includes('network') ||
        msg.includes('econnreset')
      );
    },
  };
}
