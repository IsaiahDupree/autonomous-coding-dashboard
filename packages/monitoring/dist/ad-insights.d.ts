/**
 * @module ad-insights
 * GAP-004: Ad Insights in ACD Dashboard.
 * Campaign performance summary, ROAS tracking, and spend monitoring.
 */
import { CampaignPerformance, AdInsightsSummary } from './types';
/**
 * Ad Insights Manager.
 * Tracks campaign performance and produces summary insights for the ACD dashboard.
 *
 * @example
 * ```ts
 * const insights = new AdInsightsManager();
 *
 * insights.recordCampaign({
 *   campaignId: 'camp-1',
 *   campaignName: 'Summer Sale',
 *   status: 'active',
 *   impressions: 500000,
 *   clicks: 15000,
 *   conversions: 800,
 *   spend: 5000,
 *   revenue: 24000,
 *   period: { start: '2024-06-01', end: '2024-06-30' },
 * });
 *
 * const summary = insights.getSummary({ start: '2024-06-01', end: '2024-06-30' });
 * console.log(`ROAS: ${summary.overallRoas}x`);
 * ```
 */
export declare class AdInsightsManager {
    private readonly campaigns;
    /** Record or update campaign performance data. Derived metrics are auto-calculated. */
    recordCampaign(params: Omit<CampaignPerformance, 'roas' | 'ctr' | 'cpc' | 'cpa' | 'updatedAt'> & {
        roas?: number;
        ctr?: number;
        cpc?: number;
        cpa?: number;
        updatedAt?: string;
    }): CampaignPerformance;
    /** Get the latest performance data for a campaign. */
    getCampaign(campaignId: string): CampaignPerformance | undefined;
    /** Get all campaigns' latest performance. */
    getAllCampaigns(): CampaignPerformance[];
    /** Get campaigns filtered by status. */
    getCampaignsByStatus(status: CampaignPerformance['status']): CampaignPerformance[];
    /** Get campaign performance history. */
    getCampaignHistory(campaignId: string): CampaignPerformance[];
    /** Generate an ad insights summary for the ACD dashboard. */
    getSummary(period: {
        start: string;
        end: string;
    }, options?: {
        topN?: number;
    }): AdInsightsSummary;
    /** Get total spend across all campaigns. */
    getTotalSpend(): number;
    /** Get total revenue across all campaigns. */
    getTotalRevenue(): number;
    /** Get overall ROAS across all campaigns. */
    getOverallRoas(): number;
    /** Clear all data. */
    clear(): void;
}
//# sourceMappingURL=ad-insights.d.ts.map