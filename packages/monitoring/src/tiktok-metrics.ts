/**
 * @module tiktok-metrics
 * AN-005: TikTok Metrics Integration.
 * View counts, engagement rates, and shop conversion tracking.
 */

import {
  TikTokVideoMetrics,
  TikTokVideoMetricsSchema,
  TikTokShopMetrics,
  TikTokShopMetricsSchema,
  TikTokCombinedMetrics,
  TikTokCombinedMetricsSchema,
} from './types';

/** External data fetcher interface for TikTok API integration. */
export interface TikTokDataFetcher {
  fetchVideoMetrics(videoId: string): Promise<TikTokVideoMetrics>;
  fetchShopMetrics(videoId: string): Promise<TikTokShopMetrics | null>;
}

/**
 * TikTok Metrics Tracker.
 * Aggregates video performance and shop conversion metrics for TikTok content.
 *
 * @example
 * ```ts
 * const tracker = new TikTokMetricsTracker();
 *
 * tracker.recordVideoMetrics({
 *   videoId: 'v1',
 *   viewCount: 150000,
 *   likeCount: 12000,
 *   commentCount: 350,
 *   shareCount: 800,
 *   saveCount: 2100,
 *   avgWatchTimeSeconds: 18.5,
 *   completionRate: 0.45,
 * });
 *
 * tracker.recordShopMetrics({
 *   videoId: 'v1',
 *   productClicks: 3200,
 *   addToCartCount: 450,
 *   purchaseCount: 120,
 *   revenue: 5400,
 * });
 *
 * const combined = tracker.getCombinedMetrics('v1');
 * console.log(combined?.video.engagementRate);
 * ```
 */
export class TikTokMetricsTracker {
  private readonly videoMetrics: Map<string, TikTokVideoMetrics[]> = new Map();
  private readonly shopMetrics: Map<string, TikTokShopMetrics[]> = new Map();
  private dataFetcher: TikTokDataFetcher | null = null;

  /** Set an external data fetcher for live TikTok API integration. */
  setDataFetcher(fetcher: TikTokDataFetcher): void {
    this.dataFetcher = fetcher;
  }

  /** Record video performance metrics. Engagement rate is auto-calculated if not provided. */
  recordVideoMetrics(
    params: Omit<TikTokVideoMetrics, 'engagementRate' | 'timestamp'> & {
      engagementRate?: number;
      timestamp?: string;
    }
  ): TikTokVideoMetrics {
    const engagementRate =
      params.engagementRate ??
      (params.viewCount > 0
        ? (params.likeCount + params.commentCount + params.shareCount + params.saveCount) /
          params.viewCount
        : 0);

    const metrics = TikTokVideoMetricsSchema.parse({
      ...params,
      engagementRate: Math.round(engagementRate * 10000) / 10000,
      timestamp: params.timestamp ?? new Date().toISOString(),
    });

    const history = this.videoMetrics.get(params.videoId) ?? [];
    history.push(metrics);
    this.videoMetrics.set(params.videoId, history);

    return metrics;
  }

  /** Record shop/commerce metrics for a video. Derived metrics are auto-calculated. */
  recordShopMetrics(
    params: Omit<TikTokShopMetrics, 'conversionRate' | 'avgOrderValue' | 'timestamp'> & {
      conversionRate?: number;
      avgOrderValue?: number;
      timestamp?: string;
    }
  ): TikTokShopMetrics {
    const conversionRate =
      params.conversionRate ??
      (params.productClicks > 0
        ? params.purchaseCount / params.productClicks
        : 0);

    const avgOrderValue =
      params.avgOrderValue ??
      (params.purchaseCount > 0
        ? params.revenue / params.purchaseCount
        : 0);

    const metrics = TikTokShopMetricsSchema.parse({
      ...params,
      conversionRate: Math.round(conversionRate * 10000) / 10000,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      timestamp: params.timestamp ?? new Date().toISOString(),
    });

    const history = this.shopMetrics.get(params.videoId) ?? [];
    history.push(metrics);
    this.shopMetrics.set(params.videoId, history);

    return metrics;
  }

  /** Get the latest video metrics for a video. */
  getVideoMetrics(videoId: string): TikTokVideoMetrics | undefined {
    const history = this.videoMetrics.get(videoId);
    if (!history || history.length === 0) return undefined;
    return history[history.length - 1];
  }

  /** Get the latest shop metrics for a video. */
  getShopMetrics(videoId: string): TikTokShopMetrics | undefined {
    const history = this.shopMetrics.get(videoId);
    if (!history || history.length === 0) return undefined;
    return history[history.length - 1];
  }

  /** Get combined video + shop metrics. */
  getCombinedMetrics(videoId: string): TikTokCombinedMetrics | undefined {
    const video = this.getVideoMetrics(videoId);
    if (!video) return undefined;

    const shop = this.getShopMetrics(videoId);

    return TikTokCombinedMetricsSchema.parse({
      videoId,
      video,
      shop: shop ?? undefined,
      fetchedAt: new Date().toISOString(),
    });
  }

  /** Fetch and record metrics from an external data source (if configured). */
  async fetchAndRecord(videoId: string): Promise<TikTokCombinedMetrics | null> {
    if (!this.dataFetcher) return null;

    try {
      const videoData = await this.dataFetcher.fetchVideoMetrics(videoId);
      this.recordVideoMetrics(videoData);

      const shopData = await this.dataFetcher.fetchShopMetrics(videoId);
      if (shopData) {
        this.recordShopMetrics(shopData);
      }

      return this.getCombinedMetrics(videoId) ?? null;
    } catch {
      return null;
    }
  }

  /** Get all tracked video IDs. */
  getTrackedVideos(): string[] {
    return Array.from(
      new Set([
        ...this.videoMetrics.keys(),
        ...this.shopMetrics.keys(),
      ])
    );
  }

  /** Get video metrics history. */
  getVideoHistory(videoId: string): TikTokVideoMetrics[] {
    return [...(this.videoMetrics.get(videoId) ?? [])];
  }

  /** Get shop metrics history. */
  getShopHistory(videoId: string): TikTokShopMetrics[] {
    return [...(this.shopMetrics.get(videoId) ?? [])];
  }

  /** Get top videos by engagement rate. */
  getTopByEngagement(limit: number = 10): TikTokVideoMetrics[] {
    const latest: TikTokVideoMetrics[] = [];

    for (const history of this.videoMetrics.values()) {
      if (history.length > 0) {
        latest.push(history[history.length - 1]);
      }
    }

    return latest
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, limit);
  }

  /** Get top videos by shop conversion rate. */
  getTopByConversion(limit: number = 10): TikTokShopMetrics[] {
    const latest: TikTokShopMetrics[] = [];

    for (const history of this.shopMetrics.values()) {
      if (history.length > 0) {
        latest.push(history[history.length - 1]);
      }
    }

    return latest
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, limit);
  }

  /** Clear all recorded metrics. */
  clear(): void {
    this.videoMetrics.clear();
    this.shopMetrics.clear();
  }
}
