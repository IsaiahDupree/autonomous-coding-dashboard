"use strict";
/**
 * @module ad-insights
 * GAP-004: Ad Insights in ACD Dashboard.
 * Campaign performance summary, ROAS tracking, and spend monitoring.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdInsightsManager = void 0;
const types_1 = require("./types");
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
class AdInsightsManager {
    constructor() {
        this.campaigns = new Map();
    }
    /** Record or update campaign performance data. Derived metrics are auto-calculated. */
    recordCampaign(params) {
        const ctr = params.ctr ?? (params.impressions > 0 ? params.clicks / params.impressions : 0);
        const cpc = params.cpc ?? (params.clicks > 0 ? params.spend / params.clicks : 0);
        const cpa = params.cpa ?? (params.conversions > 0 ? params.spend / params.conversions : 0);
        const roas = params.roas ?? (params.spend > 0 ? params.revenue / params.spend : 0);
        const campaign = types_1.CampaignPerformanceSchema.parse({
            ...params,
            ctr: Math.round(ctr * 10000) / 10000,
            cpc: Math.round(cpc * 100) / 100,
            cpa: Math.round(cpa * 100) / 100,
            roas: Math.round(roas * 100) / 100,
            updatedAt: params.updatedAt ?? new Date().toISOString(),
        });
        const history = this.campaigns.get(params.campaignId) ?? [];
        history.push(campaign);
        this.campaigns.set(params.campaignId, history);
        return campaign;
    }
    /** Get the latest performance data for a campaign. */
    getCampaign(campaignId) {
        const history = this.campaigns.get(campaignId);
        if (!history || history.length === 0)
            return undefined;
        return history[history.length - 1];
    }
    /** Get all campaigns' latest performance. */
    getAllCampaigns() {
        const results = [];
        for (const history of this.campaigns.values()) {
            if (history.length > 0) {
                results.push(history[history.length - 1]);
            }
        }
        return results;
    }
    /** Get campaigns filtered by status. */
    getCampaignsByStatus(status) {
        return this.getAllCampaigns().filter((c) => c.status === status);
    }
    /** Get campaign performance history. */
    getCampaignHistory(campaignId) {
        return [...(this.campaigns.get(campaignId) ?? [])];
    }
    /** Generate an ad insights summary for the ACD dashboard. */
    getSummary(period, options) {
        const topN = options?.topN ?? 5;
        const allCampaigns = this.getAllCampaigns();
        // Filter campaigns whose period overlaps with the requested period
        const startTime = new Date(period.start).getTime();
        const endTime = new Date(period.end).getTime();
        const relevantCampaigns = allCampaigns.filter((c) => {
            const campStart = new Date(c.period.start).getTime();
            const campEnd = new Date(c.period.end).getTime();
            return campStart <= endTime && campEnd >= startTime;
        });
        let totalSpend = 0;
        let totalRevenue = 0;
        let activeCampaigns = 0;
        for (const campaign of relevantCampaigns) {
            totalSpend += campaign.spend;
            totalRevenue += campaign.revenue;
            if (campaign.status === 'active')
                activeCampaigns++;
        }
        const overallRoas = totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0;
        // Get top campaigns by revenue
        const topCampaigns = [...relevantCampaigns]
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, topN);
        return types_1.AdInsightsSummarySchema.parse({
            totalSpend: Math.round(totalSpend * 100) / 100,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            overallRoas,
            activeCampaigns,
            topCampaigns,
            period,
            generatedAt: new Date().toISOString(),
        });
    }
    /** Get total spend across all campaigns. */
    getTotalSpend() {
        return this.getAllCampaigns().reduce((total, c) => total + c.spend, 0);
    }
    /** Get total revenue across all campaigns. */
    getTotalRevenue() {
        return this.getAllCampaigns().reduce((total, c) => total + c.revenue, 0);
    }
    /** Get overall ROAS across all campaigns. */
    getOverallRoas() {
        const spend = this.getTotalSpend();
        const revenue = this.getTotalRevenue();
        return spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0;
    }
    /** Clear all data. */
    clear() {
        this.campaigns.clear();
    }
}
exports.AdInsightsManager = AdInsightsManager;
//# sourceMappingURL=ad-insights.js.map