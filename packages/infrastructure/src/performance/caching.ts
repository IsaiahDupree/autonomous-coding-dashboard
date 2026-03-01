/**
 * AUTH-WC-046: Server-side caching
 * AUTH-WC-047: Client-side data caching
 * AUTH-WC-053: Request deduplication
 * AUTH-WC-054: Static asset caching
 *
 * Shared caching utilities for all ACD products.
 */

import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CacheConfig {
  ttl?: number; // Time to live in seconds
  staleWhileRevalidate?: number; // SWR time in seconds
  tags?: string[]; // Cache tags for invalidation
  key?: string; // Custom cache key
}

export interface CacheHeaders {
  'Cache-Control': string;
  'ETag'?: string;
  'Last-Modified'?: string;
  'Vary'?: string;
}

// ---------------------------------------------------------------------------
// Server-Side Caching (AUTH-WC-046)
// ---------------------------------------------------------------------------

/**
 * Generate cache headers for HTTP responses
 */
export function getCacheHeaders(config: CacheConfig = {}): CacheHeaders {
  const {
    ttl = 300, // Default 5 minutes
    staleWhileRevalidate = 60,
  } = config;

  const directives = [
    'public',
    `max-age=${ttl}`,
    `stale-while-revalidate=${staleWhileRevalidate}`,
  ];

  return {
    'Cache-Control': directives.join(', '),
  };
}

/**
 * Generate static asset cache headers (long-term caching)
 * AUTH-WC-054
 */
export function getStaticAssetHeaders(): CacheHeaders {
  return {
    'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
  };
}

/**
 * Generate ETag for response data
 */
export function generateETag(data: any): string {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  return createHash('md5').update(content).digest('hex');
}

/**
 * Check if request has matching ETag (304 Not Modified)
 */
export function checkETag(requestETag: string | undefined, responseData: any): boolean {
  if (!requestETag) return false;

  const currentETag = generateETag(responseData);
  return requestETag === currentETag || requestETag === `"${currentETag}"`;
}

// ---------------------------------------------------------------------------
// Client-Side Caching (AUTH-WC-047)
// ---------------------------------------------------------------------------

export interface SWRConfig {
  dedupingInterval?: number; // Deduplication interval in ms
  focusThrottleInterval?: number;
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  refreshInterval?: number;
}

/**
 * Default SWR configuration for client-side caching
 */
export const DEFAULT_SWR_CONFIG: SWRConfig = {
  dedupingInterval: 2000, // 2 seconds
  focusThrottleInterval: 5000, // 5 seconds
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  refreshInterval: 0, // Disabled by default
};

/**
 * React Query configuration
 */
export const REACT_QUERY_CONFIG = {
  queries: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  },
  mutations: {
    retry: 1,
  },
};

// ---------------------------------------------------------------------------
// Request Deduplication (AUTH-WC-053)
// ---------------------------------------------------------------------------

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

const pendingRequests = new Map<string, PendingRequest>();

/**
 * Deduplicate concurrent requests to the same endpoint
 */
export async function deduplicateRequest<T>(
  key: string,
  fn: () => Promise<T>,
  options: { timeout?: number } = {}
): Promise<T> {
  const { timeout = 5000 } = options;

  // Check for pending request
  const pending = pendingRequests.get(key);
  if (pending && Date.now() - pending.timestamp < timeout) {
    return pending.promise as Promise<T>;
  }

  // Create new request
  const promise = fn().finally(() => {
    // Clean up after request completes
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, {
    promise,
    timestamp: Date.now(),
  });

  return promise;
}

/**
 * Generate cache key for request
 */
export function getCacheKey(
  url: string,
  params?: Record<string, any>,
  headers?: Record<string, string>
): string {
  const parts = [url];

  if (params && Object.keys(params).length > 0) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    parts.push(sortedParams);
  }

  if (headers) {
    const varyHeaders = ['Authorization', 'Accept', 'Accept-Language'];
    const relevantHeaders = varyHeaders
      .filter(h => headers[h])
      .map(h => `${h}:${headers[h]}`)
      .join('|');
    if (relevantHeaders) parts.push(relevantHeaders);
  }

  return parts.join('?');
}

// ---------------------------------------------------------------------------
// Cache Invalidation
// ---------------------------------------------------------------------------

export interface CacheInvalidation {
  tags?: string[];
  keys?: string[];
  pattern?: RegExp;
}

/**
 * Invalidate cache by tags, keys, or pattern
 */
export function invalidateCache(invalidation: CacheInvalidation): void {
  const { keys, pattern } = invalidation;

  if (keys) {
    keys.forEach(key => pendingRequests.delete(key));
  }

  if (pattern) {
    for (const [key] of pendingRequests) {
      if (pattern.test(key)) {
        pendingRequests.delete(key);
      }
    }
  }
}

/**
 * Clear all cached requests
 */
export function clearCache(): void {
  pendingRequests.clear();
}

// ---------------------------------------------------------------------------
// Compression (AUTH-WC-051)
// ---------------------------------------------------------------------------

export interface CompressionConfig {
  threshold?: number; // Minimum size in bytes
  level?: number; // Compression level (1-9)
  filter?: (mimeType: string) => boolean;
}

/**
 * Default compression configuration
 */
export const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  threshold: 1024, // 1KB
  level: 6,
  filter: (mimeType: string) => {
    // Compress text-based content
    return (
      mimeType.startsWith('text/') ||
      mimeType.includes('javascript') ||
      mimeType.includes('json') ||
      mimeType.includes('xml') ||
      mimeType.includes('svg')
    );
  },
};

/**
 * Check if response should be compressed
 */
export function shouldCompress(
  contentLength: number,
  contentType: string,
  config: CompressionConfig = DEFAULT_COMPRESSION_CONFIG
): boolean {
  const { threshold = 1024, filter } = config;

  if (contentLength < threshold) return false;
  if (!filter) return true;

  return filter(contentType);
}

/**
 * Get compression encoding from Accept-Encoding header
 */
export function getCompressionEncoding(acceptEncoding: string | undefined): string | null {
  if (!acceptEncoding) return null;

  // Prefer brotli, then gzip
  if (acceptEncoding.includes('br')) return 'br';
  if (acceptEncoding.includes('gzip')) return 'gzip';
  if (acceptEncoding.includes('deflate')) return 'deflate';

  return null;
}

// ---------------------------------------------------------------------------
// Pagination (AUTH-WC-052)
// ---------------------------------------------------------------------------

export interface PaginationConfig {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  config: PaginationConfig
): PaginatedResponse<T> {
  const { page = 1, limit = 20 } = config;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Get pagination params from query string
 */
export function getPaginationParams(query: Record<string, any>): PaginationConfig {
  return {
    page: parseInt(query.page || '1', 10),
    limit: Math.min(parseInt(query.limit || '20', 10), 100), // Max 100 items
    cursor: query.cursor,
  };
}
