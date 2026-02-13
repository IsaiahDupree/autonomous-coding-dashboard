/**
 * @module tiktok-metrics
 * AN-005: TikTok Metrics Integration.
 * View counts, engagement rates, and shop conversion tracking.
 */
import { TikTokVideoMetrics, TikTokShopMetrics, TikTokCombinedMetrics } from './types';
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
export declare class TikTokMetricsTracker {
    private readonly videoMetrics;
    private readonly shopMetrics;
    private dataFetcher;
    /** Set an external data fetcher for live TikTok API integration. */
    setDataFetcher(fetcher: TikTokDataFetcher): void;
    /** Record video performance metrics. Engagement rate is auto-calculated if not provided. */
    recordVideoMetrics(params: Omit<TikTokVideoMetrics, 'engagementRate' | 'timestamp'> & {
        engagementRate?: number;
        timestamp?: string;
    }): TikTokVideoMetrics;
    /** Record shop/commerce metrics for a video. Derived metrics are auto-calculated. */
    recordShopMetrics(params: Omit<TikTokShopMetrics, 'conversionRate' | 'avgOrderValue' | 'timestamp'> & {
        conversionRate?: number;
        avgOrderValue?: number;
        timestamp?: string;
    }): TikTokShopMetrics;
    /** Get the latest video metrics for a video. */
    getVideoMetrics(videoId: string): TikTokVideoMetrics | undefined;
    /** Get the latest shop metrics for a video. */
    getShopMetrics(videoId: string): TikTokShopMetrics | undefined;
    /** Get combined video + shop metrics. */
    getCombinedMetrics(videoId: string): TikTokCombinedMetrics | undefined;
    /** Fetch and record metrics from an external data source (if configured). */
    fetchAndRecord(videoId: string): Promise<TikTokCombinedMetrics | null>;
    /** Get all tracked video IDs. */
    getTrackedVideos(): string[];
    /** Get video metrics history. */
    getVideoHistory(videoId: string): TikTokVideoMetrics[];
    /** Get shop metrics history. */
    getShopHistory(videoId: string): TikTokShopMetrics[];
    /** Get top videos by engagement rate. */
    getTopByEngagement(limit?: number): TikTokVideoMetrics[];
    /** Get top videos by shop conversion rate. */
    getTopByConversion(limit?: number): TikTokShopMetrics[];
    /** Clear all recorded metrics. */
    clear(): void;
}
//# sourceMappingURL=tiktok-metrics.d.ts.map