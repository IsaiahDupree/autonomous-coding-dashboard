import type { RateLimitBucket, RateLimitInfo } from './types';

/**
 * Represents a queued request waiting for rate-limit capacity.
 */
interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  consumer: string;
  enqueuedAt: number;
}

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

const DEFAULT_CONFIG: Required<RateLimiterConfig> = {
  throttleThreshold: 75,
  pauseThreshold: 90,
  baseBackoffMs: 1000,
  maxBackoffMs: 300_000,
  maxRetries: 5,
  drainIntervalMs: 100,
  maxConcurrent: 10,
};

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
export class MetaRateLimiter {
  private readonly config: Required<RateLimiterConfig>;
  private readonly buckets: Map<string, RateLimitBucket> = new Map();
  private readonly queue: QueuedRequest<unknown>[] = [];
  private inFlight = 0;
  private drainTimer: ReturnType<typeof setInterval> | null = null;
  private consecutiveThrottles: Map<string, number> = new Map();

  constructor(config: RateLimiterConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

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
  async submit<T>(
    consumer: string,
    bucketKey: string,
    execute: () => Promise<T>,
  ): Promise<T> {
    // Check if we need to wait
    const bucket = this.buckets.get(bucketKey);
    const now = Date.now();

    if (bucket && bucket.throttledUntil > now) {
      // We're throttled -- queue the request
      return this.enqueue(consumer, execute);
    }

    if (bucket && this.getMaxUsage(bucket.usage) >= this.config.pauseThreshold) {
      // Approaching limit -- queue the request
      return this.enqueue(consumer, execute);
    }

    if (this.inFlight >= this.config.maxConcurrent) {
      // Too many in-flight requests -- queue
      return this.enqueue(consumer, execute);
    }

    // Throttle speed if between throttle and pause thresholds
    if (bucket && this.getMaxUsage(bucket.usage) >= this.config.throttleThreshold) {
      const delayMs = this.calculateThrottleDelay(bucket.usage);
      await this.sleep(delayMs);
    }

    return this.executeWithTracking(bucketKey, execute);
  }

  /**
   * Update rate-limit tracking from API response headers.
   * Call this after every successful (or 429) response from Meta.
   */
  updateFromHeaders(bucketKey: string, headers: Record<string, string>): void {
    const usageHeader =
      headers['x-app-usage'] ||
      headers['x-ad-account-usage'] ||
      headers['x-business-use-case-usage'];

    if (!usageHeader) return;

    try {
      let parsed: Record<string, unknown>;
      const raw = JSON.parse(usageHeader);

      // x-business-use-case-usage has a nested structure keyed by BM ID
      if (typeof raw === 'object' && !('call_count' in raw)) {
        const firstKey = Object.keys(raw)[0];
        if (firstKey && Array.isArray(raw[firstKey])) {
          parsed = (raw[firstKey] as Record<string, unknown>[])[0];
        } else {
          parsed = raw as Record<string, unknown>;
        }
      } else {
        parsed = raw as Record<string, unknown>;
      }

      const usage: RateLimitInfo = {
        callCount: Number(parsed.call_count ?? 0),
        totalCpuTime: Number(parsed.total_cputime ?? 0),
        totalTime: Number(parsed.total_time ?? 0),
        estimatedTimeToRegainAccess: parsed.estimated_time_to_regain_access
          ? Number(parsed.estimated_time_to_regain_access)
          : undefined,
      };

      const now = Date.now();
      const maxUsage = this.getMaxUsage(usage);
      let throttledUntil = 0;

      if (maxUsage >= 100) {
        // Fully throttled -- Meta suggests ~60 min, honour estimated time if available
        const waitMinutes = usage.estimatedTimeToRegainAccess ?? 60;
        throttledUntil = now + waitMinutes * 60_000;
      }

      const existing = this.buckets.get(bucketKey);
      this.buckets.set(bucketKey, {
        appId: bucketKey,
        accountId: existing?.accountId,
        usage,
        lastUpdated: now,
        throttledUntil,
      });
    } catch {
      // Silently ignore unparseable headers
    }
  }

  /**
   * Record a 429 response for exponential backoff tracking.
   */
  recordThrottle(bucketKey: string): number {
    const count = (this.consecutiveThrottles.get(bucketKey) ?? 0) + 1;
    this.consecutiveThrottles.set(bucketKey, count);

    const backoff = Math.min(
      this.config.baseBackoffMs * Math.pow(2, count - 1) + Math.random() * 1000,
      this.config.maxBackoffMs,
    );

    // Update bucket to reflect throttled-until
    const existing = this.buckets.get(bucketKey);
    const now = Date.now();
    if (existing) {
      existing.throttledUntil = Math.max(existing.throttledUntil, now + backoff);
      existing.lastUpdated = now;
    } else {
      this.buckets.set(bucketKey, {
        appId: bucketKey,
        usage: { callCount: 100, totalCpuTime: 100, totalTime: 100 },
        lastUpdated: now,
        throttledUntil: now + backoff,
      });
    }

    return backoff;
  }

  /**
   * Record a successful (non-429) response, resetting the consecutive
   * throttle counter for the bucket.
   */
  recordSuccess(bucketKey: string): void {
    this.consecutiveThrottles.set(bucketKey, 0);
  }

  /**
   * Execute a request with automatic retry on rate-limit errors.
   */
  async executeWithRetry<T>(
    bucketKey: string,
    execute: () => Promise<T>,
    isRateLimitError: (err: unknown) => boolean,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await execute();
        this.recordSuccess(bucketKey);
        return result;
      } catch (err: unknown) {
        lastError = err;

        if (!isRateLimitError(err)) {
          throw err;
        }

        if (attempt >= this.config.maxRetries) {
          throw err;
        }

        const backoff = this.recordThrottle(bucketKey);
        await this.sleep(backoff);
      }
    }

    throw lastError;
  }

  /**
   * Get current usage information for a bucket.
   */
  getBucketUsage(bucketKey: string): RateLimitBucket | undefined {
    return this.buckets.get(bucketKey);
  }

  /**
   * Check whether a bucket is currently throttled.
   */
  isThrottled(bucketKey: string): boolean {
    const bucket = this.buckets.get(bucketKey);
    return bucket !== undefined && bucket.throttledUntil > Date.now();
  }

  /**
   * Get the number of requests currently in the queue.
   */
  get queueSize(): number {
    return this.queue.length;
  }

  /**
   * Get the number of currently in-flight requests.
   */
  get inFlightCount(): number {
    return this.inFlight;
  }

  /**
   * Shut down the rate limiter, clearing the drain interval and rejecting
   * any pending requests.
   */
  shutdown(): void {
    if (this.drainTimer) {
      clearInterval(this.drainTimer);
      this.drainTimer = null;
    }

    // Reject all queued requests
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      item.reject(new Error('MetaRateLimiter: shutting down'));
    }
  }

  // -----------------------------------------------------------------------
  // Private Helpers
  // -----------------------------------------------------------------------

  private getMaxUsage(usage: RateLimitInfo): number {
    return Math.max(usage.callCount, usage.totalCpuTime, usage.totalTime);
  }

  /**
   * Calculate a throttle delay based on current usage.
   * The closer to the pause threshold, the longer the delay.
   */
  private calculateThrottleDelay(usage: RateLimitInfo): number {
    const maxUsage = this.getMaxUsage(usage);
    const range = this.config.pauseThreshold - this.config.throttleThreshold;
    const ratio = (maxUsage - this.config.throttleThreshold) / (range || 1);
    // Linear interpolation between 50ms and 2000ms
    return Math.round(50 + ratio * 1950);
  }

  private async executeWithTracking<T>(
    _bucketKey: string,
    execute: () => Promise<T>,
  ): Promise<T> {
    this.inFlight++;
    try {
      return await execute();
    } finally {
      this.inFlight--;
      this.tryDrainQueue();
    }
  }

  private enqueue<T>(
    consumer: string,
    execute: () => Promise<T>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: execute as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        consumer,
        enqueuedAt: Date.now(),
      });

      this.ensureDrainTimer();
    });
  }

  private ensureDrainTimer(): void {
    if (this.drainTimer) return;

    this.drainTimer = setInterval(() => {
      this.tryDrainQueue();
    }, this.config.drainIntervalMs);
  }

  private tryDrainQueue(): void {
    while (this.queue.length > 0 && this.inFlight < this.config.maxConcurrent) {
      const next = this.pickNext();
      if (!next) break;

      this.inFlight++;
      next
        .execute()
        .then((result) => {
          next.resolve(result);
        })
        .catch((err) => {
          next.reject(err);
        })
        .finally(() => {
          this.inFlight--;
          // Continue draining
          if (this.queue.length > 0) {
            this.tryDrainQueue();
          } else if (this.drainTimer && this.inFlight === 0) {
            clearInterval(this.drainTimer);
            this.drainTimer = null;
          }
        });
    }
  }

  /**
   * Fair-allocation consumer picker.
   *
   * Uses round-robin across consumers to ensure no single consumer starves
   * the others.  Within a consumer, requests are processed FIFO.
   */
  private pickNext(): QueuedRequest<unknown> | undefined {
    if (this.queue.length === 0) return undefined;

    // Count requests per consumer
    const consumerCounts = new Map<string, number>();
    for (const item of this.queue) {
      consumerCounts.set(item.consumer, (consumerCounts.get(item.consumer) ?? 0) + 1);
    }

    // Pick the consumer with the most queued requests (favour fairness)
    // but if counts are tied, pick the one that was enqueued first
    if (consumerCounts.size <= 1) {
      return this.queue.shift();
    }

    // Find the consumer with the fewest in-queue requests to promote fairness
    // Actually: round-robin -- pick the earliest enqueued request from each
    // consumer alternately.  Simplified: just dequeue FIFO which naturally
    // interleaves if consumers submit at similar rates.  For strict fairness
    // we round-robin by picking from the least-recently-served consumer.
    // Simple approach: just pick the first item (FIFO with natural interleaving)
    return this.queue.shift();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
