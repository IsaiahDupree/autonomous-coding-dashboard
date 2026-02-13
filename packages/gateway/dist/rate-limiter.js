"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayRateLimiter = exports.InMemoryRateLimitStore = void 0;
// ─── In-Memory Rate Limit Store ──────────────────────────────────────────────
class InMemoryRateLimitStore {
    constructor(cleanupIntervalMs = 60000) {
        this.windows = new Map();
        this.cleanupInterval = null;
        // Periodically clean up expired entries
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, cleanupIntervalMs);
        // Allow the process to exit even if the interval is still active
        if (this.cleanupInterval && typeof this.cleanupInterval === 'object' && 'unref' in this.cleanupInterval) {
            this.cleanupInterval.unref();
        }
    }
    increment(key, windowMs) {
        const now = Date.now();
        const entries = this.getValidEntries(key, windowMs, now);
        entries.push({ timestamp: now });
        this.windows.set(key, entries);
        return entries.length;
    }
    getCount(key, windowMs) {
        const now = Date.now();
        const entries = this.getValidEntries(key, windowMs, now);
        return entries.length;
    }
    reset(key) {
        this.windows.delete(key);
    }
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.windows.clear();
    }
    getValidEntries(key, windowMs, now) {
        const entries = this.windows.get(key) ?? [];
        const windowStart = now - windowMs;
        return entries.filter((entry) => entry.timestamp > windowStart);
    }
    cleanup() {
        const now = Date.now();
        // Remove entries older than 10 minutes (conservative default)
        const maxAge = 10 * 60 * 1000;
        for (const [key, entries] of this.windows.entries()) {
            const valid = entries.filter((e) => now - e.timestamp < maxAge);
            if (valid.length === 0) {
                this.windows.delete(key);
            }
            else {
                this.windows.set(key, valid);
            }
        }
    }
}
exports.InMemoryRateLimitStore = InMemoryRateLimitStore;
// ─── Gateway Rate Limiter ────────────────────────────────────────────────────
class GatewayRateLimiter {
    constructor(defaultConfig, store) {
        this.defaultConfig = defaultConfig;
        this.store = store ?? new InMemoryRateLimitStore();
    }
    /**
     * Check the current rate limit status for a key without consuming a request.
     */
    check(key, config) {
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
    consume(key, config) {
        const cfg = config ?? this.defaultConfig;
        const prefixedKey = this.buildKey(key, cfg);
        const count = this.store.getCount(prefixedKey, cfg.windowMs);
        if (count >= cfg.maxRequests) {
            const info = {
                limit: cfg.maxRequests,
                remaining: 0,
                resetAt: new Date(Date.now() + cfg.windowMs),
            };
            return { allowed: false, info };
        }
        const newCount = this.store.increment(prefixedKey, cfg.windowMs);
        const remaining = Math.max(0, cfg.maxRequests - newCount);
        const resetAt = new Date(Date.now() + cfg.windowMs);
        const info = {
            limit: cfg.maxRequests,
            remaining,
            resetAt,
        };
        return { allowed: true, info };
    }
    /**
     * Reset the rate limit counter for a key.
     */
    reset(key) {
        this.store.reset(key);
        // Also reset with potential prefixes
        if (this.defaultConfig.keyPrefix) {
            this.store.reset(`${this.defaultConfig.keyPrefix}:${key}`);
        }
    }
    /**
     * Generate standard rate limit HTTP headers from a RateLimitInfo.
     */
    getRateLimitHeaders(info) {
        return {
            'X-RateLimit-Limit': String(info.limit),
            'X-RateLimit-Remaining': String(info.remaining),
            'X-RateLimit-Reset': String(Math.ceil(info.resetAt.getTime() / 1000)),
        };
    }
    /**
     * Build the internal store key with optional prefix.
     */
    buildKey(key, config) {
        if (config.keyPrefix) {
            return `${config.keyPrefix}:${key}`;
        }
        return key;
    }
}
exports.GatewayRateLimiter = GatewayRateLimiter;
//# sourceMappingURL=rate-limiter.js.map