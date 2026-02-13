/**
 * CACHE-003: API Response Cache
 *
 * HTTP response caching with ETag support, Cache-Control
 * header parsing, and conditional request handling.
 */

import { CacheManager } from './cache';

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── ApiResponseCache ─────────────────────────────────────────────────────────

export class ApiResponseCache {
  private cache: CacheManager;
  private defaultMaxAge: number;

  constructor(options: ApiResponseCacheOptions = {}) {
    this.defaultMaxAge = options.defaultMaxAge ?? 300; // 5 minutes in seconds
    this.cache = new CacheManager({
      defaultTtlMs: this.defaultMaxAge * 1000,
      maxSize: options.maxEntries ?? 5000,
      prefix: 'api',
    });
  }

  /**
   * Store an API response in the cache.
   */
  store(
    cacheKey: string,
    statusCode: number,
    headers: Record<string, string>,
    body: unknown,
  ): CachedResponse {
    const maxAge = this.parseMaxAge(headers['cache-control']) ?? this.defaultMaxAge;
    const etag = headers['etag'] ?? this.generateETag(body);

    const cached: CachedResponse = {
      statusCode,
      headers,
      body,
      etag,
      cachedAt: new Date(),
      maxAge,
    };

    this.cache.set(cacheKey, cached, maxAge * 1000);
    return cached;
  }

  /**
   * Retrieve a cached response.
   */
  retrieve(cacheKey: string): CachedResponse | null {
    return this.cache.get<CachedResponse>(cacheKey);
  }

  /**
   * Handle conditional request (If-None-Match / ETag).
   * Returns whether the client's cached version is still valid.
   */
  conditional(cacheKey: string, ifNoneMatch?: string): ConditionalResult {
    const cached = this.retrieve(cacheKey);

    if (!cached) {
      return { hit: false, notModified: false, response: null };
    }

    if (ifNoneMatch && ifNoneMatch === cached.etag) {
      return { hit: true, notModified: true, response: cached };
    }

    return { hit: true, notModified: false, response: cached };
  }

  /**
   * Build a cache key from HTTP method, URL, and optional vary headers.
   */
  buildCacheKey(
    method: string,
    url: string,
    varyHeaders?: Record<string, string>,
  ): string {
    let key = `${method.toUpperCase()}:${url}`;
    if (varyHeaders) {
      const sortedKeys = Object.keys(varyHeaders).sort();
      const varyPart = sortedKeys.map((k) => `${k}=${varyHeaders[k]}`).join('&');
      key += `?vary=${varyPart}`;
    }
    return key;
  }

  /**
   * Invalidate a cached response.
   */
  invalidate(cacheKey: string): boolean {
    return this.cache.delete(cacheKey);
  }

  /**
   * Invalidate all responses matching a URL prefix.
   */
  invalidateByPrefix(urlPrefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(urlPrefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Get cache statistics.
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Clear all cached responses.
   */
  clear(): void {
    this.cache.clear();
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private parseMaxAge(cacheControl?: string): number | null {
    if (!cacheControl) return null;
    const match = cacheControl.match(/max-age=(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  private generateETag(body: unknown): string {
    // Simple hash-like ETag based on JSON string length and char sum
    const str = JSON.stringify(body);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return `W/"${Math.abs(hash).toString(36)}"`;
  }
}
