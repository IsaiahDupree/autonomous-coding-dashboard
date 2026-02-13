"use strict";
/**
 * CACHE-005: Meta Insights Cache
 *
 * Caches Meta (Facebook/Instagram) ad insights data with
 * configurable staleness thresholds and automatic refresh hints.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaInsightsCache = void 0;
const cache_1 = require("./cache");
// ── MetaInsightsCache ────────────────────────────────────────────────────────
class MetaInsightsCache {
    constructor(options = {}) {
        // Secondary store for stale data (kept longer)
        this.staleStore = new Map();
        this.freshTtlMs = options.freshTtlMs ?? 900000; // 15 minutes
        this.staleTtlMs = options.staleTtlMs ?? 3600000; // 1 hour
        this.cache = new cache_1.CacheManager({
            defaultTtlMs: this.freshTtlMs,
            maxSize: options.maxEntries ?? 5000,
            prefix: 'meta-insights',
        });
    }
    /**
     * Cache insights data.
     */
    set(insights) {
        const key = this.buildKey(insights);
        this.cache.set(key, insights, this.freshTtlMs);
        // Also store in stale store with longer TTL
        this.staleStore.set(key, {
            data: insights,
            expiresAt: Date.now() + this.staleTtlMs,
        });
    }
    /**
     * Get insights with freshness status.
     * Returns stale data if fresh data is expired but stale data is available.
     */
    get(accountId, options) {
        const key = this.buildKeyFromParams(accountId, options);
        // Try fresh cache first
        const fresh = this.cache.get(key);
        if (fresh) {
            return {
                data: fresh,
                status: 'fresh',
                ageMs: Date.now() - fresh.fetchedAt.getTime(),
                shouldRefresh: false,
            };
        }
        // Try stale store
        const stale = this.staleStore.get(key);
        if (stale && stale.expiresAt > Date.now()) {
            return {
                data: stale.data,
                status: 'stale',
                ageMs: Date.now() - stale.data.fetchedAt.getTime(),
                shouldRefresh: true,
            };
        }
        // Clean up expired stale entry
        if (stale) {
            this.staleStore.delete(key);
        }
        return {
            data: null,
            status: 'miss',
            ageMs: 0,
            shouldRefresh: true,
        };
    }
    /**
     * Invalidate insights for a specific account/campaign.
     */
    invalidate(accountId, options) {
        const key = this.buildKeyFromParams(accountId, options);
        this.cache.delete(key);
        this.staleStore.delete(key);
    }
    /**
     * Invalidate all insights for an account.
     */
    invalidateAccount(accountId) {
        let count = 0;
        const prefix = `meta-insights:${accountId}`;
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
                count++;
            }
        }
        for (const key of this.staleStore.keys()) {
            if (key.startsWith(prefix)) {
                this.staleStore.delete(key);
            }
        }
        return count;
    }
    /**
     * Get cache statistics.
     */
    getStats() {
        const cacheStats = this.cache.getStats();
        return {
            ...cacheStats,
            staleEntries: this.staleStore.size,
        };
    }
    /**
     * Clear all cached insights.
     */
    clear() {
        this.cache.clear();
        this.staleStore.clear();
    }
    // ── Internal ─────────────────────────────────────────────────────────────
    buildKey(insights) {
        return this.buildKeyFromParams(insights.accountId, {
            campaignId: insights.campaignId,
            adSetId: insights.adSetId,
            adId: insights.adId,
            dateRange: insights.dateRange,
        });
    }
    buildKeyFromParams(accountId, options) {
        const parts = [accountId];
        if (options?.campaignId)
            parts.push(`c:${options.campaignId}`);
        if (options?.adSetId)
            parts.push(`as:${options.adSetId}`);
        if (options?.adId)
            parts.push(`a:${options.adId}`);
        if (options?.dateRange)
            parts.push(`d:${options.dateRange.start}-${options.dateRange.end}`);
        return parts.join(':');
    }
}
exports.MetaInsightsCache = MetaInsightsCache;
