"use strict";
/**
 * PCTMetaService (MH-002)
 *
 * PCT (Product Campaign Tool) integration with Meta Marketing API via WaitlistLab.
 * All Meta API calls are proxied through WaitlistLab's API rather than hitting
 * the Meta Graph API directly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PCTMetaService = void 0;
// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
/**
 * PCTMetaService provides PCT with Meta campaign management through WaitlistLab.
 *
 * All calls route through WaitlistLab as a Meta API proxy. The WaitlistLab API
 * handles token management, rate limiting, and credential storage.
 */
class PCTMetaService {
    constructor(config) {
        this.wlApiUrl = config.wlApiUrl.replace(/\/+$/, "");
        this.wlApiKey = config.wlApiKey;
        this.adAccountId = config.adAccountId;
    }
    // -------------------------------------------------------------------------
    // Campaign management
    // -------------------------------------------------------------------------
    /**
     * Create a new Meta campaign via WaitlistLab proxy.
     */
    async createCampaign(input) {
        const body = {
            adAccountId: this.adAccountId,
            name: input.name,
            objective: input.objective,
            status: "PAUSED",
            dailyBudgetCents: Math.round(input.dailyBudget * 100),
            targeting: input.targetAudience ?? null,
        };
        const response = await this.request("/meta/campaigns", "POST", body);
        return response;
    }
    /**
     * Create an ad set within a campaign.
     */
    async createAdSet(campaignId, input) {
        const body = {
            adAccountId: this.adAccountId,
            campaignId,
            name: input.name,
            targeting: input.targeting,
            optimizationGoal: input.optimizationGoal,
            billingEvent: input.billingEvent,
            dailyBudgetCents: Math.round(input.dailyBudget * 100),
            startTime: input.startTime,
            endTime: input.endTime ?? null,
        };
        const response = await this.request("/meta/adsets", "POST", body);
        return response;
    }
    /**
     * Create an ad with creative within an ad set.
     */
    async createAd(adSetId, creativeInput) {
        const body = {
            adAccountId: this.adAccountId,
            adSetId,
            name: creativeInput.name,
            creative: {
                primaryText: creativeInput.primaryText,
                headline: creativeInput.headline,
                callToAction: creativeInput.callToAction,
                linkUrl: creativeInput.linkUrl,
                imageUrl: creativeInput.imageUrl ?? null,
                videoUrl: creativeInput.videoUrl ?? null,
            },
            status: "PAUSED",
        };
        const response = await this.request("/meta/ads", "POST", body);
        return response;
    }
    // -------------------------------------------------------------------------
    // Insights
    // -------------------------------------------------------------------------
    /**
     * Fetch performance insights for a campaign, ad set, or ad.
     */
    async getInsights(entityId, level, dateRange) {
        const params = new URLSearchParams({
            adAccountId: this.adAccountId,
            entityId,
            level,
            since: dateRange.since,
            until: dateRange.until,
            fields: "impressions,clicks,spend,conversions,ctr,cpc",
        });
        const response = await this.request(`/meta/insights?${params.toString()}`, "GET");
        return response;
    }
    // -------------------------------------------------------------------------
    // Status toggles
    // -------------------------------------------------------------------------
    /**
     * Pause a campaign.
     */
    async pauseCampaign(id) {
        await this.request(`/meta/campaigns/${encodeURIComponent(id)}/status`, "POST", { adAccountId: this.adAccountId, status: "PAUSED" });
    }
    /**
     * Resume (activate) a campaign.
     */
    async resumeCampaign(id) {
        await this.request(`/meta/campaigns/${encodeURIComponent(id)}/status`, "POST", { adAccountId: this.adAccountId, status: "ACTIVE" });
    }
    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------
    async request(path, method, body) {
        const url = `${this.wlApiUrl}${path}`;
        const headers = {
            "Authorization": `Bearer ${this.wlApiKey}`,
            "Content-Type": "application/json",
            "X-Ad-Account-Id": this.adAccountId,
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
exports.PCTMetaService = PCTMetaService;
//# sourceMappingURL=pct-meta.js.map