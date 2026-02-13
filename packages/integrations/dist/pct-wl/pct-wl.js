"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PCTWaitlistLabBridge = void 0;
// ---------------------------------------------------------------------------
// Goal to Meta objective mapping
// ---------------------------------------------------------------------------
const GOAL_TO_OBJECTIVE = {
    awareness: "OUTCOME_AWARENESS",
    traffic: "OUTCOME_TRAFFIC",
    engagement: "OUTCOME_ENGAGEMENT",
    leads: "OUTCOME_LEADS",
    sales: "OUTCOME_SALES",
};
// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
/**
 * PCTWaitlistLabBridge translates between PCT data formats and
 * WaitlistLab/Meta formats, providing a clean interface for PCT
 * to manage Meta campaigns through WaitlistLab.
 */
class PCTWaitlistLabBridge {
    constructor(wlApiUrl, wlApiKey) {
        this.wlApiUrl = wlApiUrl.replace(/\/+$/, "");
        this.wlApiKey = wlApiKey;
    }
    // -------------------------------------------------------------------------
    // PCT-WL-001: Campaign creation
    // -------------------------------------------------------------------------
    /**
     * Create a Meta campaign from PCT campaign data.
     * Translates PCT goal/audience format to Meta objective/targeting.
     */
    async createCampaign(pctCampaignData) {
        const targeting = this.translateTargeting(pctCampaignData.audience);
        const body = {
            adAccountId: pctCampaignData.adAccountId,
            name: pctCampaignData.name,
            objective: GOAL_TO_OBJECTIVE[pctCampaignData.goal],
            status: "PAUSED",
            dailyBudgetCents: Math.round(pctCampaignData.dailyBudgetDollars * 100),
            targeting,
            startTime: `${pctCampaignData.startDate}T00:00:00Z`,
            endTime: pctCampaignData.endDate
                ? `${pctCampaignData.endDate}T23:59:59Z`
                : undefined,
            metadata: {
                pctCampaignId: pctCampaignData.pctCampaignId,
            },
        };
        const result = await this.request("/campaigns", "POST", body);
        return {
            ...result,
            pctCampaignId: pctCampaignData.pctCampaignId,
        };
    }
    // -------------------------------------------------------------------------
    // PCT-WL-002: Ad creation
    // -------------------------------------------------------------------------
    /**
     * Create a Meta ad from PCT ad data with a creative asset URL.
     * Translates PCT ad format to WaitlistLab ad creation format.
     */
    async createAd(pctAdData, creativeAssetUrl) {
        const body = {
            campaignId: pctAdData.pctCampaignId,
            name: pctAdData.name,
            creative: {
                assetUrl: creativeAssetUrl,
                primaryText: pctAdData.primaryText,
                headline: pctAdData.headline,
                callToAction: pctAdData.callToAction,
                linkUrl: pctAdData.destinationUrl,
                description: pctAdData.description ?? null,
            },
            status: "PAUSED",
            metadata: {
                pctAdId: pctAdData.pctAdId,
                pctCampaignId: pctAdData.pctCampaignId,
            },
        };
        const result = await this.request("/ads", "POST", body);
        return {
            ...result,
            pctAdId: pctAdData.pctAdId,
        };
    }
    // -------------------------------------------------------------------------
    // PCT-WL-003: Insights retrieval
    // -------------------------------------------------------------------------
    /**
     * Fetch campaign insights from WaitlistLab and translate back to PCT format.
     */
    async getInsights(campaignId, dateRange) {
        const params = new URLSearchParams({
            campaignId,
            since: dateRange.since,
            until: dateRange.until,
            fields: "impressions,reach,clicks,ctr,spend,conversions,costPerConversion,roas",
        });
        const result = await this.request(`/insights?${params.toString()}`, "GET");
        // Translate WaitlistLab response back to PCT format
        return {
            campaignId: result.campaignId,
            pctCampaignId: campaignId,
            dateRange,
            metrics: {
                impressions: result.impressions,
                reach: result.reach,
                clicks: result.clicks,
                ctr: result.ctr,
                spend: result.spend,
                conversions: result.conversions,
                costPerConversion: result.costPerConversion,
                roas: result.roas,
            },
        };
    }
    // -------------------------------------------------------------------------
    // Status sync
    // -------------------------------------------------------------------------
    /**
     * Sync campaign/ad status between PCT and WaitlistLab/Meta.
     */
    async syncStatus(pctCampaignId) {
        const result = await this.request(`/campaigns/${encodeURIComponent(pctCampaignId)}/status`, "GET");
        return {
            pctCampaignId,
            wlCampaignId: result.wlCampaignId,
            metaCampaignId: result.metaCampaignId,
            status: result.status,
            effectiveStatus: result.effectiveStatus,
            lastSynced: new Date().toISOString(),
        };
    }
    // -------------------------------------------------------------------------
    // Targeting translation
    // -------------------------------------------------------------------------
    /**
     * Convert PCT audience targeting format to Meta targeting format.
     */
    translateTargeting(pctTargeting) {
        const targeting = {};
        // Age range
        if (pctTargeting.ageRange) {
            targeting.age_min = pctTargeting.ageRange.min;
            targeting.age_max = pctTargeting.ageRange.max;
        }
        // Gender (Meta: 1=male, 2=female; omit for all)
        if (pctTargeting.gender && pctTargeting.gender !== "all") {
            targeting.genders = pctTargeting.gender === "male" ? [1] : [2];
        }
        // Geo locations
        if (pctTargeting.countries.length > 0) {
            targeting.geo_locations = {
                countries: pctTargeting.countries,
            };
        }
        // Interests (PCT sends keywords, map to id/name format)
        if (pctTargeting.interests && pctTargeting.interests.length > 0) {
            targeting.interests = pctTargeting.interests.map((interest) => ({
                id: interest,
                name: interest,
            }));
        }
        // Custom audiences
        if (pctTargeting.customAudienceIds && pctTargeting.customAudienceIds.length > 0) {
            targeting.custom_audiences = pctTargeting.customAudienceIds.map((id) => ({
                id,
            }));
        }
        // Lookalike audiences
        if (pctTargeting.lookalikeAudienceIds && pctTargeting.lookalikeAudienceIds.length > 0) {
            targeting.lookalike_audiences = pctTargeting.lookalikeAudienceIds.map((id) => ({ id }));
        }
        // Platforms
        if (pctTargeting.platforms && pctTargeting.platforms.length > 0) {
            targeting.publisher_platforms = pctTargeting.platforms;
        }
        return targeting;
    }
    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------
    async request(path, method, body) {
        const url = `${this.wlApiUrl}${path}`;
        const headers = {
            "Authorization": `Bearer ${this.wlApiKey}`,
            "Content-Type": "application/json",
        };
        const init = { method, headers };
        if (body !== undefined && method !== "GET") {
            init.body = JSON.stringify(body);
        }
        const res = await fetch(url, init);
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`WaitlistLab API error ${res.status}: ${text}`);
        }
        const json = (await res.json());
        if (!json.success || json.data === undefined) {
            throw new Error(`WaitlistLab API failure: ${json.error?.message ?? "Unknown error"}`);
        }
        return json.data;
    }
}
exports.PCTWaitlistLabBridge = PCTWaitlistLabBridge;
//# sourceMappingURL=pct-wl.js.map