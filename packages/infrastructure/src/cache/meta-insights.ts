/**
 * CACHE-005: Meta Insights Cache
 *
 * Caches Meta (Facebook/Instagram) ad insights data with
 * configurable staleness thresholds and automatic refresh hints.
 */

import { CacheManager } from './cache';

// ── Types ────────────────────────────────────────────────────────────────────

export interface MetaInsightsData {
  accountId: string;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  dateRange: { start: string; end: string };
  metrics: {
    impressions: number;
    reach: number;
    clicks: number;
    spend: number;
    cpc: number;
    cpm: number;
    ctr: number;
    conversions: number;
    costPerConversion: number;
    roas: number;
  };
  breakdowns?: Record<string, unknown>[];
  fetchedAt: Date;
}

export interface MetaInsightsCacheOptions {
  /** TTL for fresh data in milliseconds (default: 15 minutes) */
  freshTtlMs?: number;
  /** TTL for stale-but-usable data in milliseconds (default: 1 hour) */
  staleTtlMs?: number;
  /** Max cached insight entries (default: 5000) */
  maxEntries?: number;
}

export interface InsightsCacheResult {
  data: MetaInsightsData | null;
  status: 'fresh' | 'stale' | 'miss';
  ageMs: number;
  shouldRefresh: boolean;
}

// ── MetaInsightsCache ────────────────────────────────────────────────────────

export class MetaInsightsCache {
  private cache: CacheManager;
  private freshTtlMs: number;
  private staleTtlMs: number;

  // Secondary store for stale data (kept longer)
  private staleStore: Map<string, { data: MetaInsightsData; expiresAt: number }> = new Map();

  constructor(options: MetaInsightsCacheOptions = {}) {
    this.freshTtlMs = options.freshTtlMs ?? 900_000; // 15 minutes
    this.staleTtlMs = options.staleTtlMs ?? 3_600_000; // 1 hour

    this.cache = new CacheManager({
      defaultTtlMs: this.freshTtlMs,
      maxSize: options.maxEntries ?? 5000,
      prefix: 'meta-insights',
    });
  }

  /**
   * Cache insights data.
   */
  set(insights: MetaInsightsData): void {
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
  get(
    accountId: string,
    options?: {
      campaignId?: string;
      adSetId?: string;
      adId?: string;
      dateRange?: { start: string; end: string };
    },
  ): InsightsCacheResult {
    const key = this.buildKeyFromParams(accountId, options);

    // Try fresh cache first
    const fresh = this.cache.get<MetaInsightsData>(key);
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
  invalidate(
    accountId: string,
    options?: { campaignId?: string; adSetId?: string; adId?: string },
  ): void {
    const key = this.buildKeyFromParams(accountId, options);
    this.cache.delete(key);
    this.staleStore.delete(key);
  }

  /**
   * Invalidate all insights for an account.
   */
  invalidateAccount(accountId: string): number {
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
  clear(): void {
    this.cache.clear();
    this.staleStore.clear();
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private buildKey(insights: MetaInsightsData): string {
    return this.buildKeyFromParams(insights.accountId, {
      campaignId: insights.campaignId,
      adSetId: insights.adSetId,
      adId: insights.adId,
      dateRange: insights.dateRange,
    });
  }

  private buildKeyFromParams(
    accountId: string,
    options?: {
      campaignId?: string;
      adSetId?: string;
      adId?: string;
      dateRange?: { start: string; end: string };
    },
  ): string {
    const parts = [accountId];
    if (options?.campaignId) parts.push(`c:${options.campaignId}`);
    if (options?.adSetId) parts.push(`as:${options.adSetId}`);
    if (options?.adId) parts.push(`a:${options.adId}`);
    if (options?.dateRange) parts.push(`d:${options.dateRange.start}-${options.dateRange.end}`);
    return parts.join(':');
  }
}
