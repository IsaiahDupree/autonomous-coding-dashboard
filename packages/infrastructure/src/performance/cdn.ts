/**
 * PERF-001: CDN Configuration
 *
 * CDN configuration helpers for origin setup, cache rules,
 * purge management, and edge configuration generation.
 */

import { CDNOriginConfig, CDNCacheRule } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CDNConfigOptions {
  provider: 'cloudflare' | 'cloudfront' | 'fastly' | 'custom';
  defaultTtlSeconds: number;
  defaultOrigin: CDNOriginConfig;
}

export interface CDNPurgeRequest {
  type: 'all' | 'urls' | 'tags' | 'prefixes';
  urls?: string[];
  tags?: string[];
  prefixes?: string[];
}

export interface CDNPurgeResult {
  requestId: string;
  type: CDNPurgeRequest['type'];
  itemCount: number;
  estimatedPropagationMs: number;
  requestedAt: Date;
}

export interface CDNEdgeConfig {
  origins: CDNOriginConfig[];
  cacheRules: CDNCacheRule[];
  securityHeaders: Record<string, string>;
  compressionEnabled: boolean;
  http2Enabled: boolean;
  minifyEnabled: boolean;
}

// ── CDNConfig ────────────────────────────────────────────────────────────────

export class CDNConfig {
  private provider: CDNConfigOptions['provider'];
  private defaultTtlSeconds: number;
  private origins: Map<string, CDNOriginConfig> = new Map();
  private cacheRules: CDNCacheRule[] = [];
  private purgeHistory: CDNPurgeResult[] = [];

  constructor(options: CDNConfigOptions) {
    this.provider = options.provider;
    this.defaultTtlSeconds = options.defaultTtlSeconds;
    this.origins.set('default', options.defaultOrigin);
  }

  // ── Origin Management ────────────────────────────────────────────────────

  /**
   * Add or update an origin server.
   */
  setOrigin(name: string, config: CDNOriginConfig): void {
    this.origins.set(name, config);
  }

  /**
   * Get an origin configuration.
   */
  getOrigin(name: string): CDNOriginConfig | undefined {
    return this.origins.get(name);
  }

  /**
   * Remove an origin.
   */
  removeOrigin(name: string): boolean {
    if (name === 'default') {
      throw new Error('Cannot remove default origin');
    }
    return this.origins.delete(name);
  }

  /**
   * List all origins.
   */
  listOrigins(): { name: string; config: CDNOriginConfig }[] {
    return Array.from(this.origins.entries()).map(([name, config]) => ({
      name,
      config,
    }));
  }

  // ── Cache Rules ──────────────────────────────────────────────────────────

  /**
   * Add a cache rule.
   */
  addCacheRule(rule: CDNCacheRule): void {
    // Insert sorted by path specificity (more specific first)
    const idx = this.cacheRules.findIndex(
      (r) => r.pathPattern.length < rule.pathPattern.length,
    );
    if (idx === -1) {
      this.cacheRules.push(rule);
    } else {
      this.cacheRules.splice(idx, 0, rule);
    }
  }

  /**
   * Remove cache rules matching a path pattern.
   */
  removeCacheRule(pathPattern: string): boolean {
    const idx = this.cacheRules.findIndex((r) => r.pathPattern === pathPattern);
    if (idx === -1) return false;
    this.cacheRules.splice(idx, 1);
    return true;
  }

  /**
   * Get the cache rule matching a given path.
   */
  matchCacheRule(path: string): CDNCacheRule | null {
    for (const rule of this.cacheRules) {
      if (this.matchPattern(rule.pathPattern, path)) {
        return rule;
      }
    }
    return null;
  }

  /**
   * Get all cache rules.
   */
  getCacheRules(): CDNCacheRule[] {
    return [...this.cacheRules];
  }

  // ── Purge ────────────────────────────────────────────────────────────────

  /**
   * Request a cache purge.
   */
  async purge(request: CDNPurgeRequest): Promise<CDNPurgeResult> {
    let itemCount = 0;
    switch (request.type) {
      case 'all':
        itemCount = 1; // "everything"
        break;
      case 'urls':
        itemCount = request.urls?.length ?? 0;
        break;
      case 'tags':
        itemCount = request.tags?.length ?? 0;
        break;
      case 'prefixes':
        itemCount = request.prefixes?.length ?? 0;
        break;
    }

    const result: CDNPurgeResult = {
      requestId: `purge_${Date.now()}`,
      type: request.type,
      itemCount,
      estimatedPropagationMs: this.getEstimatedPropagation(),
      requestedAt: new Date(),
    };

    this.purgeHistory.push(result);

    // In production: call CDN provider API
    // await this.callProviderPurge(request);

    return result;
  }

  /**
   * Get purge history.
   */
  getPurgeHistory(): CDNPurgeResult[] {
    return [...this.purgeHistory];
  }

  // ── Edge Config Generation ───────────────────────────────────────────────

  /**
   * Generate a complete edge configuration object.
   */
  generateEdgeConfig(): CDNEdgeConfig {
    return {
      origins: Array.from(this.origins.values()),
      cacheRules: this.getDefaultCacheRules().concat(this.cacheRules),
      securityHeaders: this.getSecurityHeaders(),
      compressionEnabled: true,
      http2Enabled: true,
      minifyEnabled: true,
    };
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private matchPattern(pattern: string, path: string): boolean {
    // Simple glob-like matching: * matches any segment, ** matches any depth
    const regexStr = pattern
      .replace(/\*\*/g, '<<<DOUBLE>>>')
      .replace(/\*/g, '[^/]*')
      .replace(/<<<DOUBLE>>>/g, '.*');
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(path);
  }

  private getEstimatedPropagation(): number {
    switch (this.provider) {
      case 'cloudflare':
        return 30_000;
      case 'cloudfront':
        return 60_000;
      case 'fastly':
        return 5_000;
      default:
        return 120_000;
    }
  }

  private getDefaultCacheRules(): CDNCacheRule[] {
    return [
      {
        pathPattern: '**/*.js',
        ttlSeconds: 86400,
        cacheControl: `public, max-age=86400, s-maxage=${this.defaultTtlSeconds}`,
      },
      {
        pathPattern: '**/*.css',
        ttlSeconds: 86400,
        cacheControl: `public, max-age=86400, s-maxage=${this.defaultTtlSeconds}`,
      },
      {
        pathPattern: '**/*.{jpg,jpeg,png,gif,webp,avif,svg}',
        ttlSeconds: 604800,
        cacheControl: 'public, max-age=604800, immutable',
      },
      {
        pathPattern: '**/*.{mp4,webm}',
        ttlSeconds: 604800,
        cacheControl: 'public, max-age=604800, immutable',
      },
      {
        pathPattern: '/api/**',
        ttlSeconds: 0,
        cacheControl: 'no-store, no-cache, must-revalidate',
      },
    ];
  }

  private getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };
  }
}
