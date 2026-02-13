import { RetryConfig } from './types';
import { CircuitBreaker } from './circuit-breaker';
/**
 * Error that carries HTTP status and optional Retry-After header.
 */
export interface RetryableError extends Error {
    status?: number;
    retryAfter?: number | string;
}
/**
 * RES-002: Retry with exponential backoff and jitter.
 *
 * @param fn - The async function to retry.
 * @param config - Optional retry configuration.
 * @returns The result of the function call.
 */
export declare function retry<T>(fn: () => Promise<T>, config?: Partial<RetryConfig>): Promise<T>;
/**
 * Combines retry with a circuit breaker: the circuit breaker wraps each
 * attempt so that persistent failures trip the breaker.
 */
export declare function retryWithCircuitBreaker<T>(fn: () => Promise<T>, retryConfig: Partial<RetryConfig> | undefined, breaker: CircuitBreaker<T>): Promise<T>;
/**
 * Pre-configured retry for Meta (Facebook) API.
 * Respects rate limits, retries on specific Meta error codes.
 */
export declare function createMetaRetryConfig(): Partial<RetryConfig>;
/**
 * Pre-configured retry for Remotion rendering API.
 */
export declare function createRemotionRetryConfig(): Partial<RetryConfig>;
//# sourceMappingURL=retry.d.ts.map