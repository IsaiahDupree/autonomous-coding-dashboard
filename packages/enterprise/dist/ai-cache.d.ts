/**
 * AI Response Caching (AI-003)
 * Cache key from prompt hash, TTL, invalidation.
 */
import { AIRequest, AIResponse } from './types';
export interface AICacheOptions {
    /** Default TTL in milliseconds. Default: 1 hour */
    defaultTtlMs?: number;
    /** Maximum number of cache entries. Default: 10000 */
    maxEntries?: number;
}
/**
 * In-memory cache for AI responses.
 * Uses prompt hashing for cache keys, with TTL-based expiration.
 */
export declare class AIResponseCache {
    private cache;
    private defaultTtlMs;
    private maxEntries;
    constructor(options?: AICacheOptions);
    /**
     * Generate a cache key from an AI request.
     * Hashes the prompt, system prompt, and key parameters for consistent lookups.
     */
    generateCacheKey(request: AIRequest, modelId?: string): string;
    /**
     * Get a cached response if it exists and hasn't expired.
     */
    get(key: string): AIResponse | undefined;
    /**
     * Store a response in the cache.
     */
    set(key: string, response: AIResponse, ttlMs?: number): void;
    /**
     * Try to get from cache; if miss, execute the provider function and cache the result.
     */
    getOrCompute(request: AIRequest, modelId: string, compute: () => Promise<AIResponse>, ttlMs?: number): Promise<AIResponse>;
    /**
     * Invalidate a specific cache entry.
     */
    invalidate(key: string): boolean;
    /**
     * Invalidate all cache entries matching a pattern (prefix match).
     */
    invalidateByPrefix(prefix: string): number;
    /**
     * Clear all cache entries.
     */
    clear(): void;
    /**
     * Get cache statistics.
     */
    getStats(): {
        totalEntries: number;
        totalHits: number;
        expiredEntries: number;
        memoryEstimateBytes: number;
    };
    /** Remove all expired entries */
    private evictExpired;
    /** Remove the oldest cache entry */
    private evictOldest;
}
//# sourceMappingURL=ai-cache.d.ts.map