"use strict";
/**
 * CACHE-001: Cache Manager
 *
 * In-memory cache with LRU eviction, TTL-based expiration,
 * namespace/prefix support, and hit/miss statistics.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
// ── CacheManager ─────────────────────────────────────────────────────────────
class CacheManager {
    constructor(options = {}) {
        this.store = new Map();
        this.hits = 0;
        this.misses = 0;
        this.defaultTtlMs = options.defaultTtlMs ?? 300000; // 5 minutes default
        this.maxSize = options.maxSize ?? 1000;
        this.prefix = options.prefix ?? '';
        this.onEvict = options.onEvict;
    }
    /**
     * Get a cached value by key. Returns null if not found or expired.
     */
    get(key) {
        const fullKey = this.prefixKey(key);
        const entry = this.store.get(fullKey);
        if (!entry) {
            this.misses++;
            return null;
        }
        // Check expiration
        if (entry.expiresAt.getTime() < Date.now()) {
            this.store.delete(fullKey);
            this.misses++;
            return null;
        }
        // Update access count and move to end (most recently used)
        entry.accessCount++;
        this.store.delete(fullKey);
        this.store.set(fullKey, entry);
        this.hits++;
        return entry.value;
    }
    /**
     * Set a value in the cache.
     */
    set(key, value, ttlMs) {
        const fullKey = this.prefixKey(key);
        const ttl = ttlMs ?? this.defaultTtlMs;
        const now = new Date();
        // If key already exists, delete it first (to update position in Map)
        if (this.store.has(fullKey)) {
            this.store.delete(fullKey);
        }
        // Evict if at capacity
        while (this.store.size >= this.maxSize) {
            this.evictLRU();
        }
        const entry = {
            key: fullKey,
            value,
            expiresAt: new Date(now.getTime() + ttl),
            createdAt: now,
            accessCount: 0,
        };
        this.store.set(fullKey, entry);
    }
    /**
     * Delete a cached value.
     */
    delete(key) {
        return this.store.delete(this.prefixKey(key));
    }
    /**
     * Check if a key exists and is not expired.
     */
    has(key) {
        const fullKey = this.prefixKey(key);
        const entry = this.store.get(fullKey);
        if (!entry)
            return false;
        if (entry.expiresAt.getTime() < Date.now()) {
            this.store.delete(fullKey);
            return false;
        }
        return true;
    }
    /**
     * Clear all cached entries.
     */
    clear() {
        this.store.clear();
        this.hits = 0;
        this.misses = 0;
    }
    /**
     * Get cache statistics.
     */
    getStats() {
        // Clean up expired entries before reporting
        this.purgeExpired();
        const total = this.hits + this.misses;
        return {
            size: this.store.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? this.hits / total : 0,
        };
    }
    /**
     * Get all keys (non-expired).
     */
    keys() {
        this.purgeExpired();
        return Array.from(this.store.keys());
    }
    // ── Internal ─────────────────────────────────────────────────────────────
    prefixKey(key) {
        return this.prefix ? `${this.prefix}:${key}` : key;
    }
    evictLRU() {
        // Map iteration order is insertion order; first entry is the LRU
        const firstKey = this.store.keys().next().value;
        if (firstKey !== undefined) {
            const entry = this.store.get(firstKey);
            this.store.delete(firstKey);
            if (entry && this.onEvict) {
                this.onEvict(entry);
            }
        }
    }
    purgeExpired() {
        const now = Date.now();
        for (const [key, entry] of this.store) {
            if (entry.expiresAt.getTime() < now) {
                this.store.delete(key);
            }
        }
    }
}
exports.CacheManager = CacheManager;
