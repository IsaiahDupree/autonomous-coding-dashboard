/**
 * CACHE-003: API Response Cache
 *
 * HTTP response caching with ETag support, Cache-Control
 * header parsing, and conditional request handling.
 */
export interface CachedResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: unknown;
    etag: string;
    cachedAt: Date;
    maxAge: number;
}
export interface ApiResponseCacheOptions {
    defaultMaxAge?: number;
    maxEntries?: number;
}
export interface ConditionalResult {
    hit: boolean;
    notModified: boolean;
    response: CachedResponse | null;
}
export declare class ApiResponseCache {
    private cache;
    private defaultMaxAge;
    constructor(options?: ApiResponseCacheOptions);
    /**
     * Store an API response in the cache.
     */
    store(cacheKey: string, statusCode: number, headers: Record<string, string>, body: unknown): CachedResponse;
    /**
     * Retrieve a cached response.
     */
    retrieve(cacheKey: string): CachedResponse | null;
    /**
     * Handle conditional request (If-None-Match / ETag).
     * Returns whether the client's cached version is still valid.
     */
    conditional(cacheKey: string, ifNoneMatch?: string): ConditionalResult;
    /**
     * Build a cache key from HTTP method, URL, and optional vary headers.
     */
    buildCacheKey(method: string, url: string, varyHeaders?: Record<string, string>): string;
    /**
     * Invalidate a cached response.
     */
    invalidate(cacheKey: string): boolean;
    /**
     * Invalidate all responses matching a URL prefix.
     */
    invalidateByPrefix(urlPrefix: string): number;
    /**
     * Get cache statistics.
     */
    getStats(): import("./cache").CacheStats;
    /**
     * Clear all cached responses.
     */
    clear(): void;
    private parseMaxAge;
    private generateETag;
}
