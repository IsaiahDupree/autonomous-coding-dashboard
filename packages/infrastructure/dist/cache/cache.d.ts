/**
 * CACHE-001: Cache Manager
 *
 * In-memory cache with LRU eviction, TTL-based expiration,
 * namespace/prefix support, and hit/miss statistics.
 */
import { CacheEntry } from '../types';
export interface CacheManagerOptions {
    defaultTtlMs?: number;
    maxSize?: number;
    prefix?: string;
    onEvict?: <T>(entry: CacheEntry<T>) => void;
}
export interface CacheStats {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
}
export declare class CacheManager {
    private store;
    private readonly defaultTtlMs;
    private readonly maxSize;
    private readonly prefix;
    private readonly onEvict?;
    private hits;
    private misses;
    constructor(options?: CacheManagerOptions);
    /**
     * Get a cached value by key. Returns null if not found or expired.
     */
    get<T>(key: string): T | null;
    /**
     * Set a value in the cache.
     */
    set<T>(key: string, value: T, ttlMs?: number): void;
    /**
     * Delete a cached value.
     */
    delete(key: string): boolean;
    /**
     * Check if a key exists and is not expired.
     */
    has(key: string): boolean;
    /**
     * Clear all cached entries.
     */
    clear(): void;
    /**
     * Get cache statistics.
     */
    getStats(): CacheStats;
    /**
     * Get all keys (non-expired).
     */
    keys(): string[];
    private prefixKey;
    private evictLRU;
    private purgeExpired;
}
