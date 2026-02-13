/**
 * PCTWaitlistLabBridge (PCT-WL-001, PCT-WL-002, PCT-WL-003)
 *
 * Bridge between PCT (Product Campaign Tool) and WaitlistLab for Meta
 * campaign management. Translates PCT data formats to WaitlistLab/Meta
 * formats and vice versa.
 *
 * - PCT-WL-001: Campaign creation bridge
 * - PCT-WL-002: Ad creation bridge
 * - PCT-WL-003: Insights retrieval bridge
 */
/**
 * PCT campaign data format (as PCT stores/sends it).
 */
export interface PCTCampaignData {
    /** PCT internal campaign ID. */
    pctCampaignId: string;
    /** Campaign name. */
    name: string;
    /** Campaign goal (PCT-specific names mapped to Meta objectives). */
    goal: "awareness" | "traffic" | "engagement" | "leads" | "sales";
    /** Daily budget in dollars. */
    dailyBudgetDollars: number;
    /** Target audience (PCT format). */
    audience: PCTAudienceSpec;
    /** Start date (YYYY-MM-DD). */
    startDate: string;
    /** End date (YYYY-MM-DD), optional. */
    endDate?: string;
    /** Ad account ID. */
    adAccountId?: string;
}
/**
 * PCT audience specification format.
 */
export interface PCTAudienceSpec {
    /** Country codes. */
    countries: string[];
    /** Age range. */
    ageRange?: {
        min: number;
        max: number;
    };
    /** Gender targeting (all, male, female). */
    gender?: "all" | "male" | "female";
    /** Interest keywords. */
    interests?: string[];
    /** Custom audience IDs. */
    customAudienceIds?: string[];
    /** Lookalike audience IDs. */
    lookalikeAudienceIds?: string[];
    /** Platform placement. */
    platforms?: Array<"facebook" | "instagram">;
}
/**
 * PCT ad data format.
 */
export interface PCTAdData {
    /** PCT internal ad ID. */
    pctAdId: string;
    /** Ad name. */
    name: string;
    /** Associated PCT campaign ID. */
    pctCampaignId: string;
    /** Primary text (body copy). */
    primaryText: string;
    /** Headline. */
    headline: string;
    /** Call to action type. */
    callToAction: string;
    /** Destination URL. */
    destinationUrl: string;
    /** Optional link description. */
    description?: string;
}
/**
 * PCT insights format (returned to PCT).
 */
export interface PCTInsightsData {
    campaignId: string;
    pctCampaignId: string;
    dateRange: {
        since: string;
        until: string;
    };
    metrics: {
        impressions: number;
        reach: number;
        clicks: number;
        ctr: number;
        spend: number;
        conversions: number;
        costPerConversion: number;
        roas: number;
    };
}
/**
 * WaitlistLab campaign status sync result.
 */
export interface StatusSyncResult {
    pctCampaignId: string;
    wlCampaignId: string;
    metaCampaignId: string;
    status: string;
    effectiveStatus: string;
    lastSynced: string;
}
interface MetaTargeting {
    age_min?: number;
    age_max?: number;
    genders?: number[];
    geo_locations?: {
        countries?: string[];
    };
    interests?: Array<{
        id: string;
        name: string;
    }>;
    custom_audiences?: Array<{
        id: string;
    }>;
    lookalike_audiences?: Array<{
        id: string;
    }>;
    publisher_platforms?: string[];
}
interface WLCampaignResult {
    wlCampaignId: string;
    metaCampaignId: string;
    status: string;
}
interface WLAdResult {
    wlAdId: string;
    metaAdId: string;
    metaCreativeId: string;
    status: string;
}
/**
 * PCTWaitlistLabBridge translates between PCT data formats and
 * WaitlistLab/Meta formats, providing a clean interface for PCT
 * to manage Meta campaigns through WaitlistLab.
 */
export declare class PCTWaitlistLabBridge {
    private readonly wlApiUrl;
    private readonly wlApiKey;
    constructor(wlApiUrl: string, wlApiKey: string);
    /**
     * Create a Meta campaign from PCT campaign data.
     * Translates PCT goal/audience format to Meta objective/targeting.
     */
    createCampaign(pctCampaignData: PCTCampaignData): Promise<WLCampaignResult & {
        pctCampaignId: string;
    }>;
    /**
     * Create a Meta ad from PCT ad data with a creative asset URL.
     * Translates PCT ad format to WaitlistLab ad creation format.
     */
    createAd(pctAdData: PCTAdData, creativeAssetUrl: string): Promise<WLAdResult & {
        pctAdId: string;
    }>;
    /**
     * Fetch campaign insights from WaitlistLab and translate back to PCT format.
     */
    getInsights(campaignId: string, dateRange: {
        since: string;
        until: string;
    }): Promise<PCTInsightsData>;
    /**
     * Sync campaign/ad status between PCT and WaitlistLab/Meta.
     */
    syncStatus(pctCampaignId: string): Promise<StatusSyncResult>;
    /**
     * Convert PCT audience targeting format to Meta targeting format.
     */
    translateTargeting(pctTargeting: PCTAudienceSpec): MetaTargeting;
    private request;
}
export {};
//# sourceMappingURL=pct-wl.d.ts.map