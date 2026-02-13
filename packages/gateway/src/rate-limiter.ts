import { RateLimitConfig, RateLimitInfo } from './types';

// ─── Rate Limit Store Interface ──────────────────────────────────────────────

export interface RateLimitStore {
  increment(key: string, windowMs: number): number;
  getCount(key: string, windowMs: number): number;
  reset(key: string): void;
}

// ─── Sliding Window Entry ────────────────────────────────────────────────────

interface WindowEntry {
  timestamp: number;
}

// ─── In-Memory Rate Limit Store ──────────────────────────────────────────────

export class InMemoryRateLimitStore implements RateLimitStore {
  private windows: Map<string, WindowEntry[]> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(cleanupIntervalMs: number = 60_000) {
    // Periodically clean up expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);

    // Allow the process to exit even if the interval is still active
    if (this.cleanupInterval && typeof this.cleanupInterval === 'object' && 'unref' in this.cleanupInterval) {
      this.cleanupInterval.unref();
    }
  }

  increment(key: string, windowMs: number): number {
    const now = Date.now();
    const entries = this.getValidEntries(key, windowMs, now);
    entries.push({ timestamp: now });
    this.windows.set(key, entries);
    return entries.length;
  }

  getCount(key: string, windowMs: number): number {
    const now = Date.now();
    const entries = this.getValidEntries(key, windowMs, now);
    return entries.length;
  }

  reset(key: string): void {
    this.windows.delete(key);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.windows.clear();
  }

  private getValidEntries(key: string, windowMs: number, now: number): WindowEntry[] {
    const entries = this.windows.get(key) ?? [];
    const windowStart = now - windowMs;
    return entries.filter((entry) => entry.timestamp > windowStart);
  }

  private cleanup(): void {
    const now = Date.now();
    // Remove entries older than 10 minutes (conservative default)
    const maxAge = 10 * 60 * 1000;
    for (const [key, entries] of this.windows.entries()) {
      const valid = entries.filter((e) => now - e.timestamp < maxAge);
      if (valid.length === 0) {
        this.windows.delete(key);
      } else {
        this.windows.set(key, valid);
      }
    }
  }
}

// ─── Gateway Rate Limiter ────────────────────────────────────────────────────

export class GatewayRateLimiter {
  private readonly defaultConfig: RateLimitConfig;
  private readonly store: RateLimitStore;

  constructor(defaultConfig: RateLimitConfig, store?: RateLimitStore) {
    this.defaultConfig = defaultConfig;
    this.store = store ?? new InMemoryRateLimitStore();
  }

  /**
   * Check the current rate limit status for a key without consuming a request.
   */
  check(key: string, config?: RateLimitConfig): RateLimitInfo {
    const cfg = config ?? this.defaultConfig;
    const prefixedKey = this.buildKey(key, cfg);
    const count = this.store.getCount(prefixedKey, cfg.windowMs);
    const remaining = Math.max(0, cfg.maxRequests - count);
    const resetAt = new Date(Date.now() + cfg.windowMs);

    return {
      limit: cfg.maxRequests,
      remaining,
      resetAt,
    };
  }

  /**
   * Consume a request against the rate limit for a key.
   * Returns whether the request is allowed and the current rate limit info.
   */
  consume(key: string, config?: RateLimitConfig): { allowed: boolean; info: RateLimitInfo } {
    const cfg = config ?? this.defaultConfig;
    const prefixedKey = this.buildKey(key, cfg);
    const count = this.store.getCount(prefixedKey, cfg.windowMs);

    if (count >= cfg.maxRequests) {
      const info: RateLimitInfo = {
        limit: cfg.maxRequests,
        remaining: 0,
        resetAt: new Date(Date.now() + cfg.windowMs),
      };
      return { allowed: false, info };
    }

    const newCount = this.store.increment(prefixedKey, cfg.windowMs);
    const remaining = Math.max(0, cfg.maxRequests - newCount);
    const resetAt = new Date(Date.now() + cfg.windowMs);

    const info: RateLimitInfo = {
      limit: cfg.maxRequests,
      remaining,
      resetAt,
    };

    return { allowed: true, info };
  }

  /**
   * Reset the rate limit counter for a key.
   */
  reset(key: string): void {
    this.store.reset(key);
    // Also reset with potential prefixes
    if (this.defaultConfig.keyPrefix) {
      this.store.reset(`${this.defaultConfig.keyPrefix}:${key}`);
    }
  }

  /**
   * Generate standard rate limit HTTP headers from a RateLimitInfo.
   */
  getRateLimitHeaders(info: RateLimitInfo): Record<string, string> {
    return {
      'X-RateLimit-Limit': String(info.limit),
      'X-RateLimit-Remaining': String(info.remaining),
      'X-RateLimit-Reset': String(Math.ceil(info.resetAt.getTime() / 1000)),
    };
  }

  /**
   * Build the internal store key with optional prefix.
   */
  private buildKey(key: string, config: RateLimitConfig): string {
    if (config.keyPrefix) {
      return `${config.keyPrefix}:${key}`;
    }
    return key;
  }
}
