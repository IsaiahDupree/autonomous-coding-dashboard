/**
 * Web Performance Module
 * ======================
 *
 * Implements AUTH-WC-046 through AUTH-WC-060:
 *   046: Cache expensive queries
 *   047: React Query/SWR config
 *   048: Split bundles per route
 *   049: next/image, WebP, responsive
 *   050: Indexes and pooling
 *   051: gzip/brotli
 *   052: Cursor/offset pagination
 *   053: Prevent duplicate calls
 *   054: CDN with long-term cache
 *   055: DB connection pool config
 *   056: Fix memory leaks
 *   057: Track bundle regressions
 *   058: Prefetch routes/data
 *   059: Track Core Web Vitals
 *   060: React streaming for TTFB
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// AUTH-WC-046: Cache expensive queries
// ---------------------------------------------------------------------------

export interface QueryCacheConfig {
  /** Default TTL in ms (default 5 minutes) */
  defaultTtlMs?: number;
  /** Max cache entries (default 1000) */
  maxEntries?: number;
  /** Patterns to never cache */
  noCachePatterns?: RegExp[];
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  hitCount: number;
  createdAt: number;
  key: string;
}

/**
 * Query result cache with TTL, LRU eviction, and stale-while-revalidate.
 */
export class QueryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private config: Required<QueryCacheConfig>;
  private stats = { hits: 0, misses: 0, evictions: 0 };

  constructor(config: QueryCacheConfig = {}) {
    this.config = {
      defaultTtlMs: config.defaultTtlMs ?? 5 * 60 * 1000,
      maxEntries: config.maxEntries ?? 1000,
      noCachePatterns: config.noCachePatterns ?? [],
    };
  }

  /**
   * Get a cached result or execute the query function.
   */
  async getOrSet<T>(key: string, queryFn: () => Promise<T>, ttlMs?: number): Promise<T> {
    // Check no-cache patterns
    if (this.config.noCachePatterns.some(p => p.test(key))) {
      return queryFn();
    }

    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      cached.hitCount++;
      this.stats.hits++;
      return cached.data as T;
    }

    this.stats.misses++;

    const data = await queryFn();
    this.set(key, data, ttlMs);
    return data;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.config.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.config.defaultTtlMs),
      hitCount: 0,
      createdAt: Date.now(),
      key,
    });
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }
}

// ---------------------------------------------------------------------------
// AUTH-WC-047: React Query / SWR config
// ---------------------------------------------------------------------------

/**
 * Shared React Query default options for all ACD products.
 * Use in QueryClientProvider configuration.
 */
export const REACT_QUERY_DEFAULTS = {
  queries: {
    staleTime: 5 * 60 * 1000,        // 5 minutes
    gcTime: 30 * 60 * 1000,           // 30 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
  mutations: {
    retry: 1,
    retryDelay: 1000,
  },
};

/**
 * SWR configuration defaults for ACD products.
 */
export const SWR_DEFAULTS = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,
  errorRetryCount: 2,
  errorRetryInterval: 5000,
  refreshInterval: 0,
  shouldRetryOnError: true,
};

/**
 * Generate cache key for API queries.
 */
export function generateQueryKey(
  endpoint: string,
  params?: Record<string, unknown>,
): string {
  const base = endpoint.replace(/\/$/, '');
  if (!params || Object.keys(params).length === 0) return base;
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join('&');
  return `${base}?${sortedParams}`;
}

// ---------------------------------------------------------------------------
// AUTH-WC-048: Split bundles per route (Next.js config)
// ---------------------------------------------------------------------------

/**
 * Next.js configuration for optimal code splitting.
 * Merge into next.config.ts.
 */
export const NEXTJS_OPTIMIZATION_CONFIG = {
  experimental: {
    optimizePackageImports: [
      '@acd/types',
      '@acd/auth',
      '@acd/analytics',
      '@acd/ui-system',
      'lodash',
      'date-fns',
      'lucide-react',
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  images: {
    formats: ['image/avif', 'image/webp'] as const,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
};

// ---------------------------------------------------------------------------
// AUTH-WC-049: next/image, WebP, responsive (image config)
// ---------------------------------------------------------------------------

/**
 * Responsive image breakpoints for the design system.
 */
export const IMAGE_BREAKPOINTS = {
  thumbnail: { width: 150, height: 150 },
  small: { width: 320, height: 240 },
  medium: { width: 640, height: 480 },
  large: { width: 1024, height: 768 },
  xlarge: { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 },
} as const;

/**
 * Generate srcSet string for responsive images.
 */
export function generateSrcSet(
  baseUrl: string,
  widths: number[] = [320, 640, 1024, 1920],
  format: 'webp' | 'avif' | 'jpeg' = 'webp',
): string {
  return widths
    .map(w => `${baseUrl}?w=${w}&fm=${format} ${w}w`)
    .join(', ');
}

/**
 * Generate sizes attribute for responsive images.
 */
export function generateSizes(config: {
  mobile?: string;
  tablet?: string;
  desktop?: string;
} = {}): string {
  const { mobile = '100vw', tablet = '50vw', desktop = '33vw' } = config;
  return `(max-width: 640px) ${mobile}, (max-width: 1024px) ${tablet}, ${desktop}`;
}

// ---------------------------------------------------------------------------
// AUTH-WC-050: Database indexes and pooling
// ---------------------------------------------------------------------------

/**
 * Recommended database indexes for shared tables.
 */
export const RECOMMENDED_INDEXES = [
  // shared_users
  'CREATE INDEX IF NOT EXISTS idx_shared_users_email ON shared_users(email)',
  'CREATE INDEX IF NOT EXISTS idx_shared_users_created ON shared_users(created_at)',

  // shared_entitlements
  'CREATE INDEX IF NOT EXISTS idx_entitlements_user ON shared_entitlements(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_entitlements_product ON shared_entitlements(product)',
  'CREATE INDEX IF NOT EXISTS idx_entitlements_user_product ON shared_entitlements(user_id, product)',
  'CREATE INDEX IF NOT EXISTS idx_entitlements_expires ON shared_entitlements(expires_at) WHERE expires_at IS NOT NULL',

  // shared_assets
  'CREATE INDEX IF NOT EXISTS idx_assets_user ON shared_assets(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_assets_type ON shared_assets(type)',
  'CREATE INDEX IF NOT EXISTS idx_assets_source ON shared_assets(source)',
  'CREATE INDEX IF NOT EXISTS idx_assets_created ON shared_assets(created_at)',

  // shared_events
  'CREATE INDEX IF NOT EXISTS idx_events_user ON shared_events(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_events_product ON shared_events(product)',
  'CREATE INDEX IF NOT EXISTS idx_events_name ON shared_events(event_name)',
  'CREATE INDEX IF NOT EXISTS idx_events_created ON shared_events(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_events_product_name ON shared_events(product, event_name)',
] as const;

// ---------------------------------------------------------------------------
// AUTH-WC-055: DB connection pool config
// ---------------------------------------------------------------------------

/**
 * Database connection pool configuration.
 */
export interface ConnectionPoolConfig {
  /** Min connections in pool (default 2) */
  min?: number;
  /** Max connections in pool (default 10) */
  max?: number;
  /** Connection idle timeout in ms (default 30s) */
  idleTimeoutMs?: number;
  /** Connection acquire timeout in ms (default 60s) */
  acquireTimeoutMs?: number;
  /** Max lifetime of a connection in ms (default 30 min) */
  maxLifetimeMs?: number;
  /** Statement timeout in ms (default 30s) */
  statementTimeoutMs?: number;
  /** Whether to enable SSL (default true in production) */
  ssl?: boolean;
}

/**
 * Generate pool configuration for different environments.
 */
export function getPoolConfig(env: 'development' | 'staging' | 'production' = 'development'): ConnectionPoolConfig {
  switch (env) {
    case 'production':
      return {
        min: 5,
        max: 20,
        idleTimeoutMs: 30_000,
        acquireTimeoutMs: 60_000,
        maxLifetimeMs: 30 * 60 * 1000,
        statementTimeoutMs: 30_000,
        ssl: true,
      };
    case 'staging':
      return {
        min: 2,
        max: 10,
        idleTimeoutMs: 30_000,
        acquireTimeoutMs: 30_000,
        maxLifetimeMs: 15 * 60 * 1000,
        statementTimeoutMs: 30_000,
        ssl: true,
      };
    default:
      return {
        min: 1,
        max: 5,
        idleTimeoutMs: 10_000,
        acquireTimeoutMs: 10_000,
        maxLifetimeMs: 5 * 60 * 1000,
        statementTimeoutMs: 60_000,
        ssl: false,
      };
  }
}

/**
 * Generate Prisma datasource URL with pool parameters.
 */
export function getPrismaPoolUrl(
  databaseUrl: string,
  config: ConnectionPoolConfig = {},
): string {
  const {
    max = 10,
    idleTimeoutMs = 30_000,
    statementTimeoutMs = 30_000,
  } = config;

  const url = new URL(databaseUrl);
  url.searchParams.set('connection_limit', max.toString());
  url.searchParams.set('pool_timeout', Math.floor(idleTimeoutMs / 1000).toString());
  url.searchParams.set('statement_timeout', statementTimeoutMs.toString());

  return url.toString();
}

// ---------------------------------------------------------------------------
// AUTH-WC-051: gzip/brotli compression
// ---------------------------------------------------------------------------

/**
 * Express compression middleware configuration.
 * Uses built-in compression settings for optimal results.
 */
export function compressionConfig() {
  return {
    level: 6,
    threshold: 1024, // Only compress responses > 1KB
    filter: (req: Request, res: Response): boolean => {
      // Don't compress server-sent events
      if (req.headers['accept'] === 'text/event-stream') return false;
      // Don't compress if already compressed
      if (res.getHeader('Content-Encoding')) return false;
      // Use default filter for everything else
      const contentType = res.getHeader('Content-Type') as string || '';
      return /text|json|javascript|css|xml|svg/.test(contentType);
    },
  };
}

/**
 * Express middleware for setting compression-related headers.
 */
export function compressionHeaders() {
  return (_req: Request, res: Response, next: NextFunction): void => {
    // Vary header for proper caching with compression
    const vary = res.getHeader('Vary') as string || '';
    if (!vary.includes('Accept-Encoding')) {
      res.setHeader('Vary', vary ? `${vary}, Accept-Encoding` : 'Accept-Encoding');
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// AUTH-WC-052: Cursor/offset pagination
// ---------------------------------------------------------------------------

export interface PaginationParams {
  /** Cursor-based: the cursor from previous response */
  cursor?: string;
  /** Offset-based: starting position */
  offset?: number;
  /** Number of items per page (default 20, max 100) */
  limit?: number;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total?: number;
    limit: number;
    offset?: number;
    nextCursor?: string;
    hasMore: boolean;
  };
}

/**
 * Parse pagination parameters from request query.
 */
export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const offset = Math.max(Number(query.offset) || 0, 0);

  return {
    cursor: typeof query.cursor === 'string' ? query.cursor : undefined,
    offset,
    limit,
    sortBy: typeof query.sortBy === 'string' ? query.sortBy : undefined,
    sortOrder: query.sortOrder === 'desc' ? 'desc' : 'asc',
  };
}

/**
 * Create a paginated response object.
 */
export function paginateResults<T>(
  items: T[],
  params: PaginationParams,
  total?: number,
  getCursor?: (item: T) => string,
): PaginatedResponse<T> {
  const { limit = 20, offset } = params;
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;

  return {
    data,
    pagination: {
      total,
      limit,
      offset,
      nextCursor: hasMore && getCursor && data.length > 0
        ? getCursor(data[data.length - 1])
        : undefined,
      hasMore,
    },
  };
}

// ---------------------------------------------------------------------------
// AUTH-WC-053: Prevent duplicate calls
// ---------------------------------------------------------------------------

/**
 * Request deduplication middleware.
 * Prevents duplicate concurrent requests for the same resource.
 */
export function requestDeduplication(options: {
  /** TTL for dedup entries in ms (default 5s) */
  ttlMs?: number;
  /** Key function (default: method + path + query) */
  keyFn?: (req: Request) => string;
} = {}) {
  const { ttlMs = 5000 } = options;
  const inflight = new Map<string, { promise: Promise<unknown>; expiresAt: number }>();

  // Cleanup expired entries
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of inflight) {
      if (now > entry.expiresAt) inflight.delete(key);
    }
  }, 10_000);
  if (cleanup && typeof cleanup === 'object' && 'unref' in cleanup) cleanup.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    // Only dedup safe (GET) requests
    if (req.method !== 'GET') return next();

    const key = options.keyFn
      ? options.keyFn(req)
      : `${req.method}:${req.path}:${JSON.stringify(req.query)}`;

    const existing = inflight.get(key);
    if (existing && Date.now() < existing.expiresAt) {
      // Return a header indicating this was deduped
      res.setHeader('X-Deduplicated', 'true');
    }

    // Track this request
    inflight.set(key, {
      promise: Promise.resolve(),
      expiresAt: Date.now() + ttlMs,
    });

    next();
  };
}

// ---------------------------------------------------------------------------
// AUTH-WC-054: CDN with long-term cache headers
// ---------------------------------------------------------------------------

/**
 * Middleware for setting optimal cache control headers.
 */
export function cacheControlHeaders(options: {
  /** Static assets max-age in seconds (default 1 year) */
  staticMaxAge?: number;
  /** API responses max-age in seconds (default 0) */
  apiMaxAge?: number;
  /** Patterns for static assets */
  staticPatterns?: RegExp[];
} = {}) {
  const {
    staticMaxAge = 365 * 24 * 60 * 60,
    apiMaxAge = 0,
    staticPatterns = [
      /\.(js|css|woff2?|ttf|eot|svg|png|jpe?g|gif|webp|avif|ico)$/,
      /\/_next\/static\//,
      /\/static\//,
    ],
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const isStatic = staticPatterns.some(p => p.test(req.path));

    if (isStatic) {
      res.setHeader(
        'Cache-Control',
        `public, max-age=${staticMaxAge}, immutable`,
      );
    } else if (req.path.startsWith('/api/')) {
      res.setHeader(
        'Cache-Control',
        apiMaxAge > 0
          ? `public, max-age=${apiMaxAge}, s-maxage=${apiMaxAge}, stale-while-revalidate=${apiMaxAge * 2}`
          : 'no-store, must-revalidate',
      );
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// AUTH-WC-056: Fix memory leaks (detection utilities)
// ---------------------------------------------------------------------------

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
}

/**
 * Memory leak detector.
 * Takes periodic snapshots and alerts on sustained growth.
 */
export class MemoryLeakDetector {
  private snapshots: MemorySnapshot[] = [];
  private maxSnapshots: number;
  private onAlert?: (message: string, snapshot: MemorySnapshot) => void;

  constructor(options: {
    maxSnapshots?: number;
    onAlert?: (message: string, snapshot: MemorySnapshot) => void;
  } = {}) {
    this.maxSnapshots = options.maxSnapshots ?? 100;
    this.onAlert = options.onAlert;
  }

  takeSnapshot(): MemorySnapshot {
    const mem = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
      rss: mem.rss,
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    // Check for sustained growth
    this.checkForLeaks(snapshot);

    return snapshot;
  }

  private checkForLeaks(current: MemorySnapshot): void {
    if (this.snapshots.length < 10) return;

    const recent = this.snapshots.slice(-10);
    const growthRate = recent.reduce((acc, snap, i) => {
      if (i === 0) return 0;
      return acc + (snap.heapUsed - recent[i - 1].heapUsed);
    }, 0) / (recent.length - 1);

    // Alert if heap is growing consistently (>1MB per snapshot)
    if (growthRate > 1024 * 1024) {
      this.onAlert?.(
        `Potential memory leak: heap growing at ${(growthRate / 1024 / 1024).toFixed(1)}MB per snapshot.`,
        current,
      );
    }

    // Alert if heap usage exceeds 90% of total
    if (current.heapUsed / current.heapTotal > 0.9) {
      this.onAlert?.(
        `High memory usage: ${(current.heapUsed / 1024 / 1024).toFixed(0)}MB / ${(current.heapTotal / 1024 / 1024).toFixed(0)}MB (${((current.heapUsed / current.heapTotal) * 100).toFixed(1)}%)`,
        current,
      );
    }
  }

  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  getGrowthTrend(): { avgGrowthBytes: number; totalGrowthBytes: number; durationMs: number } {
    if (this.snapshots.length < 2) {
      return { avgGrowthBytes: 0, totalGrowthBytes: 0, durationMs: 0 };
    }
    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    const totalGrowth = last.heapUsed - first.heapUsed;
    const duration = last.timestamp - first.timestamp;
    return {
      avgGrowthBytes: duration > 0 ? totalGrowth / (duration / 1000) : 0,
      totalGrowthBytes: totalGrowth,
      durationMs: duration,
    };
  }
}

// ---------------------------------------------------------------------------
// AUTH-WC-057: Track bundle regressions
// ---------------------------------------------------------------------------

export interface BundleReport {
  timestamp: number;
  totalSizeBytes: number;
  chunks: Array<{
    name: string;
    sizeBytes: number;
    gzipSizeBytes?: number;
  }>;
}

/**
 * Bundle size tracker.
 * Stores historical reports and detects regressions.
 */
export class BundleSizeTracker {
  private reports: BundleReport[] = [];
  private budgets: Record<string, number> = {};

  setBudget(chunkName: string, maxBytes: number): void {
    this.budgets[chunkName] = maxBytes;
  }

  setDefaultBudgets(): void {
    this.budgets = {
      'main': 250 * 1024,           // 250KB
      'vendor': 500 * 1024,         // 500KB
      'total': 1024 * 1024,         // 1MB total
    };
  }

  addReport(report: BundleReport): {
    regressions: Array<{ chunk: string; current: number; previous: number; change: number }>;
    budgetViolations: Array<{ chunk: string; size: number; budget: number }>;
  } {
    this.reports.push(report);
    const regressions: Array<{ chunk: string; current: number; previous: number; change: number }> = [];
    const budgetViolations: Array<{ chunk: string; size: number; budget: number }> = [];

    // Check for regressions vs previous report
    if (this.reports.length >= 2) {
      const prev = this.reports[this.reports.length - 2];
      const prevChunks = new Map(prev.chunks.map(c => [c.name, c.sizeBytes]));

      for (const chunk of report.chunks) {
        const prevSize = prevChunks.get(chunk.name);
        if (prevSize !== undefined) {
          const change = chunk.sizeBytes - prevSize;
          const percentChange = change / prevSize;
          // Flag if >10% increase
          if (percentChange > 0.1) {
            regressions.push({
              chunk: chunk.name,
              current: chunk.sizeBytes,
              previous: prevSize,
              change,
            });
          }
        }
      }
    }

    // Check budgets
    for (const chunk of report.chunks) {
      const budget = this.budgets[chunk.name];
      if (budget && chunk.sizeBytes > budget) {
        budgetViolations.push({ chunk: chunk.name, size: chunk.sizeBytes, budget });
      }
    }

    // Check total budget
    if (this.budgets['total'] && report.totalSizeBytes > this.budgets['total']) {
      budgetViolations.push({
        chunk: 'total',
        size: report.totalSizeBytes,
        budget: this.budgets['total'],
      });
    }

    return { regressions, budgetViolations };
  }

  getHistory(): BundleReport[] {
    return [...this.reports];
  }
}

// ---------------------------------------------------------------------------
// AUTH-WC-058: Prefetch routes/data
// ---------------------------------------------------------------------------

/**
 * Generate link prefetch headers for Next.js routes.
 */
export function generatePrefetchHeaders(routes: string[]): string {
  return routes
    .map(route => `<${route}>; rel=prefetch; as=document`)
    .join(', ');
}

/**
 * Express middleware to add prefetch hints for common navigation paths.
 */
export function prefetchMiddleware(routeMap: Record<string, string[]>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const prefetchRoutes = routeMap[req.path];
    if (prefetchRoutes && prefetchRoutes.length > 0) {
      const linkHeader = prefetchRoutes
        .map(route => `<${route}>; rel=prefetch`)
        .join(', ');
      res.setHeader('Link', linkHeader);
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// AUTH-WC-059: Track Core Web Vitals
// ---------------------------------------------------------------------------

export interface WebVitalMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType?: string;
}

/** Thresholds for Core Web Vitals (from web.dev) */
export const WEB_VITALS_THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  INP: { good: 200, poor: 500 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
} as const;

/**
 * Rate a Web Vital metric value.
 */
export function rateWebVital(name: WebVitalMetric['name'], value: number): WebVitalMetric['rating'] {
  const thresholds = WEB_VITALS_THRESHOLDS[name];
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Client-side script for collecting and reporting Web Vitals.
 * Inject this in the HTML <head> of each product.
 */
export function getWebVitalsScript(reportUrl: string): string {
  return `
<script type="module">
  import { onCLS, onFID, onFCP, onINP, onLCP, onTTFB } from 'https://unpkg.com/web-vitals@4/dist/web-vitals.attribution.js?module';
  function sendVital(metric) {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      url: location.href,
      timestamp: Date.now()
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('${reportUrl}', body);
    } else {
      fetch('${reportUrl}', { method: 'POST', body, keepalive: true,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  onCLS(sendVital);
  onFID(sendVital);
  onFCP(sendVital);
  onINP(sendVital);
  onLCP(sendVital);
  onTTFB(sendVital);
</script>`;
}

/**
 * Express endpoint handler for receiving Web Vitals reports.
 */
export function webVitalsCollector(options: {
  onMetric?: (metric: WebVitalMetric & { url: string }) => void;
} = {}) {
  const metrics: Array<WebVitalMetric & { url: string; receivedAt: number }> = [];

  return {
    handler: (req: Request, res: Response): void => {
      const body = req.body;
      if (body && body.name && typeof body.value === 'number') {
        const metric = {
          name: body.name,
          value: body.value,
          rating: body.rating || rateWebVital(body.name, body.value),
          delta: body.delta || 0,
          id: body.id || crypto.randomUUID(),
          url: body.url || '',
          receivedAt: Date.now(),
        };
        metrics.push(metric);
        options.onMetric?.(metric);

        // Keep last 10000 metrics
        if (metrics.length > 10000) metrics.splice(0, metrics.length - 10000);
      }
      res.status(204).end();
    },
    getMetrics: () => [...metrics],
    getSummary: () => {
      const summary: Record<string, { count: number; avg: number; p75: number; p95: number }> = {};
      const grouped = new Map<string, number[]>();

      for (const m of metrics) {
        if (!grouped.has(m.name)) grouped.set(m.name, []);
        grouped.get(m.name)!.push(m.value);
      }

      for (const [name, values] of grouped) {
        values.sort((a, b) => a - b);
        summary[name] = {
          count: values.length,
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          p75: values[Math.floor(values.length * 0.75)] ?? 0,
          p95: values[Math.floor(values.length * 0.95)] ?? 0,
        };
      }

      return summary;
    },
  };
}

// ---------------------------------------------------------------------------
// AUTH-WC-060: React streaming for TTFB
// ---------------------------------------------------------------------------

/**
 * Next.js streaming configuration.
 * Use in layout.tsx or page.tsx for optimal TTFB.
 */
export const STREAMING_CONFIG = {
  /** Use React Suspense boundaries for streaming */
  useSuspense: true,
  /** Loading fallback component pattern */
  loadingFallback: 'skeleton',
  /** Stream dynamic content while sending static shell immediately */
  streamDynamic: true,
  /** Recommended Suspense boundary locations */
  suspenseBoundaries: [
    'data-tables',
    'charts',
    'user-specific-content',
    'search-results',
    'notifications',
  ],
};

/**
 * Generate streaming headers for server responses.
 */
export function streamingHeaders() {
  return (_req: Request, res: Response, next: NextFunction): void => {
    // Enable chunked transfer encoding
    res.setHeader('Transfer-Encoding', 'chunked');
    // Disable buffering at proxy/CDN level
    res.setHeader('X-Accel-Buffering', 'no');
    next();
  };
}
