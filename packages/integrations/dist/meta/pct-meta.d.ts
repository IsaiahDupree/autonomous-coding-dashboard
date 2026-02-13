/**
 * PCTMetaService (MH-002)
 *
 * PCT (Product Campaign Tool) integration with Meta Marketing API via WaitlistLab.
 * All Meta API calls are proxied through WaitlistLab's API rather than hitting
 * the Meta Graph API directly.
 */
import type { WaitlistLabMetaConfig, CampaignObjective, TargetingSpec, InsightLevel } from "./types";
export interface PCTCampaignInput {
    name: string;
    objective: CampaignObjective;
    dailyBudget: number;
    targetAudience?: TargetingSpec;
}
export interface PCTAdSetInput {
    name: string;
    targeting: TargetingSpec;
    optimizationGoal: string;
    billingEvent: string;
    dailyBudget: number;
    startTime: string;
    endTime?: string;
}
export interface PCTCreativeInput {
    name: string;
    imageUrl?: string;
    videoUrl?: string;
    primaryText: string;
    headline: string;
    callToAction: string;
    linkUrl: string;
}
export interface PCTInsightResult {
    entityId: string;
    level: InsightLevel;
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    ctr: number;
    cpc: number;
    dateRange: {
        since: string;
        until: string;
    };
}
interface MetaCampaignResponse {
    id: string;
    name: string;
    status: string;
    objective: string;
}
interface MetaAdSetResponse {
    id: string;
    name: string;
    campaignId: string;
    status: string;
}
interface MetaAdResponse {
    id: string;
    name: string;
    adSetId: string;
    creativeId: string;
    status: string;
}
/**
 * PCTMetaService provides PCT with Meta campaign management through WaitlistLab.
 *
 * All calls route through WaitlistLab as a Meta API proxy. The WaitlistLab API
 * handles token management, rate limiting, and credential storage.
 */
export declare class PCTMetaService {
    private readonly wlApiUrl;
    private readonly wlApiKey;
    private readonly adAccountId;
    constructor(config: WaitlistLabMetaConfig);
    /**
     * Create a new Meta campaign via WaitlistLab proxy.
     */
    createCampaign(input: PCTCampaignInput): Promise<MetaCampaignResponse>;
    /**
     * Create an ad set within a campaign.
     */
    createAdSet(campaignId: string, input: PCTAdSetInput): Promise<MetaAdSetResponse>;
    /**
     * Create an ad with creative within an ad set.
     */
    createAd(adSetId: string, creativeInput: PCTCreativeInput): Promise<MetaAdResponse>;
    /**
     * Fetch performance insights for a campaign, ad set, or ad.
     */
    getInsights(entityId: string, level: InsightLevel, dateRange: {
        since: string;
        until: string;
    }): Promise<PCTInsightResult>;
    /**
     * Pause a campaign.
     */
    pauseCampaign(id: string): Promise<void>;
    /**
     * Resume (activate) a campaign.
     */
    resumeCampaign(id: string): Promise<void>;
    private request;
}
export {};
//# sourceMappingURL=pct-meta.d.ts.map