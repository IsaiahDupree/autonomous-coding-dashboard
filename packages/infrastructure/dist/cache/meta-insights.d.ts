/**
 * CACHE-005: Meta Insights Cache
 *
 * Caches Meta (Facebook/Instagram) ad insights data with
 * configurable staleness thresholds and automatic refresh hints.
 */
export interface MetaInsightsData {
    accountId: string;
    campaignId?: string;
    adSetId?: string;
    adId?: string;
    dateRange: {
        start: string;
        end: string;
    };
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
export declare class MetaInsightsCache {
    private cache;
    private freshTtlMs;
    private staleTtlMs;
    private staleStore;
    constructor(options?: MetaInsightsCacheOptions);
    /**
     * Cache insights data.
     */
    set(insights: MetaInsightsData): void;
    /**
     * Get insights with freshness status.
     * Returns stale data if fresh data is expired but stale data is available.
     */
    get(accountId: string, options?: {
        campaignId?: string;
        adSetId?: string;
        adId?: string;
        dateRange?: {
            start: string;
            end: string;
        };
    }): InsightsCacheResult;
    /**
     * Invalidate insights for a specific account/campaign.
     */
    invalidate(accountId: string, options?: {
        campaignId?: string;
        adSetId?: string;
        adId?: string;
    }): void;
    /**
     * Invalidate all insights for an account.
     */
    invalidateAccount(accountId: string): number;
    /**
     * Get cache statistics.
     */
    getStats(): {
        staleEntries: number;
        size: number;
        hits: number;
        misses: number;
        hitRate: number;
    };
    /**
     * Clear all cached insights.
     */
    clear(): void;
    private buildKey;
    private buildKeyFromParams;
}
