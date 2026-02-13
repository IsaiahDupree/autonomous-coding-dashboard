import type { RateLimitBucket } from './types';
/**
 * Configuration for the MetaRateLimiter.
 */
export interface RateLimiterConfig {
    /** Maximum usage percentage (0-100) before throttling begins. Default: 75 */
    throttleThreshold?: number;
    /** Maximum usage percentage (0-100) before requests are queued. Default: 90 */
    pauseThreshold?: number;
    /** Base delay in ms for exponential backoff on 429 responses. Default: 1000 */
    baseBackoffMs?: number;
    /** Maximum backoff delay in ms. Default: 300000 (5 minutes) */
    maxBackoffMs?: number;
    /** Maximum number of retry attempts for rate-limited requests. Default: 5 */
    maxRetries?: number;
    /** Interval in ms at which the queue is drained. Default: 100 */
    drainIntervalMs?: number;
    /** Maximum concurrent in-flight requests. Default: 10 */
    maxConcurrent?: number;
}
/**
 * Meta API rate limit manager.
 *
 * Tracks usage per app/account combination, queues requests when approaching
 * limits, implements exponential backoff on 429 responses, and fairly
 * allocates capacity across consumers.
 *
 * Meta uses three headers to communicate rate-limit status:
 *   - x-app-usage          (app-level)
 *   - x-business-use-case-usage  (BM-level)
 *   - x-ad-account-usage   (ad-account-level)
 *
 * Each header contains JSON with call_count, total_cputime, and total_time as
 * percentages (0-100).  When any value exceeds 100 the app is throttled for
 * ~60 minutes.
 */
export declare class MetaRateLimiter {
    private readonly config;
    private readonly buckets;
    private readonly queue;
    private inFlight;
    private drainTimer;
    private consecutiveThrottles;
    constructor(config?: RateLimiterConfig);
    /**
     * Submit a request through the rate limiter.  The request will be executed
     * immediately if capacity is available, or queued if usage is too high.
     *
     * @param consumer  Identifier for the calling service (e.g. "waitlistlab",
     *                  "pct", "content-factory").  Used for fair allocation.
     * @param bucketKey Key identifying the rate-limit bucket (e.g. app ID or
     *                  "app:accountId").
     * @param execute   Async function that actually performs the HTTP request.
     */
    submit<T>(consumer: string, bucketKey: string, execute: () => Promise<T>): Promise<T>;
    /**
     * Update rate-limit tracking from API response headers.
     * Call this after every successful (or 429) response from Meta.
     */
    updateFromHeaders(bucketKey: string, headers: Record<string, string>): void;
    /**
     * Record a 429 response for exponential backoff tracking.
     */
    recordThrottle(bucketKey: string): number;
    /**
     * Record a successful (non-429) response, resetting the consecutive
     * throttle counter for the bucket.
     */
    recordSuccess(bucketKey: string): void;
    /**
     * Execute a request with automatic retry on rate-limit errors.
     */
    executeWithRetry<T>(bucketKey: string, execute: () => Promise<T>, isRateLimitError: (err: unknown) => boolean): Promise<T>;
    /**
     * Get current usage information for a bucket.
     */
    getBucketUsage(bucketKey: string): RateLimitBucket | undefined;
    /**
     * Check whether a bucket is currently throttled.
     */
    isThrottled(bucketKey: string): boolean;
    /**
     * Get the number of requests currently in the queue.
     */
    get queueSize(): number;
    /**
     * Get the number of currently in-flight requests.
     */
    get inFlightCount(): number;
    /**
     * Shut down the rate limiter, clearing the drain interval and rejecting
     * any pending requests.
     */
    shutdown(): void;
    private getMaxUsage;
    /**
     * Calculate a throttle delay based on current usage.
     * The closer to the pause threshold, the longer the delay.
     */
    private calculateThrottleDelay;
    private executeWithTracking;
    private enqueue;
    private ensureDrainTimer;
    private tryDrainQueue;
    /**
     * Fair-allocation consumer picker.
     *
     * Uses round-robin across consumers to ensure no single consumer starves
     * the others.  Within a consumer, requests are processed FIFO.
     */
    private pickNext;
    private sleep;
}
//# sourceMappingURL=rate-limiter.d.ts.map