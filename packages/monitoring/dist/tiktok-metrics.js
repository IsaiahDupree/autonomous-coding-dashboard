"use strict";
/**
 * @module tiktok-metrics
 * AN-005: TikTok Metrics Integration.
 * View counts, engagement rates, and shop conversion tracking.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokMetricsTracker = void 0;
const types_1 = require("./types");
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
class TikTokMetricsTracker {
    constructor() {
        this.videoMetrics = new Map();
        this.shopMetrics = new Map();
        this.dataFetcher = null;
    }
    /** Set an external data fetcher for live TikTok API integration. */
    setDataFetcher(fetcher) {
        this.dataFetcher = fetcher;
    }
    /** Record video performance metrics. Engagement rate is auto-calculated if not provided. */
    recordVideoMetrics(params) {
        const engagementRate = params.engagementRate ??
            (params.viewCount > 0
                ? (params.likeCount + params.commentCount + params.shareCount + params.saveCount) /
                    params.viewCount
                : 0);
        const metrics = types_1.TikTokVideoMetricsSchema.parse({
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
    recordShopMetrics(params) {
        const conversionRate = params.conversionRate ??
            (params.productClicks > 0
                ? params.purchaseCount / params.productClicks
                : 0);
        const avgOrderValue = params.avgOrderValue ??
            (params.purchaseCount > 0
                ? params.revenue / params.purchaseCount
                : 0);
        const metrics = types_1.TikTokShopMetricsSchema.parse({
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
    getVideoMetrics(videoId) {
        const history = this.videoMetrics.get(videoId);
        if (!history || history.length === 0)
            return undefined;
        return history[history.length - 1];
    }
    /** Get the latest shop metrics for a video. */
    getShopMetrics(videoId) {
        const history = this.shopMetrics.get(videoId);
        if (!history || history.length === 0)
            return undefined;
        return history[history.length - 1];
    }
    /** Get combined video + shop metrics. */
    getCombinedMetrics(videoId) {
        const video = this.getVideoMetrics(videoId);
        if (!video)
            return undefined;
        const shop = this.getShopMetrics(videoId);
        return types_1.TikTokCombinedMetricsSchema.parse({
            videoId,
            video,
            shop: shop ?? undefined,
            fetchedAt: new Date().toISOString(),
        });
    }
    /** Fetch and record metrics from an external data source (if configured). */
    async fetchAndRecord(videoId) {
        if (!this.dataFetcher)
            return null;
        try {
            const videoData = await this.dataFetcher.fetchVideoMetrics(videoId);
            this.recordVideoMetrics(videoData);
            const shopData = await this.dataFetcher.fetchShopMetrics(videoId);
            if (shopData) {
                this.recordShopMetrics(shopData);
            }
            return this.getCombinedMetrics(videoId) ?? null;
        }
        catch {
            return null;
        }
    }
    /** Get all tracked video IDs. */
    getTrackedVideos() {
        return Array.from(new Set([
            ...this.videoMetrics.keys(),
            ...this.shopMetrics.keys(),
        ]));
    }
    /** Get video metrics history. */
    getVideoHistory(videoId) {
        return [...(this.videoMetrics.get(videoId) ?? [])];
    }
    /** Get shop metrics history. */
    getShopHistory(videoId) {
        return [...(this.shopMetrics.get(videoId) ?? [])];
    }
    /** Get top videos by engagement rate. */
    getTopByEngagement(limit = 10) {
        const latest = [];
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
    getTopByConversion(limit = 10) {
        const latest = [];
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
    clear() {
        this.videoMetrics.clear();
        this.shopMetrics.clear();
    }
}
exports.TikTokMetricsTracker = TikTokMetricsTracker;
//# sourceMappingURL=tiktok-metrics.js.map