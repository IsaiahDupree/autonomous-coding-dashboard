"use strict";
/**
 * ContentFactoryMetaService (MH-003)
 *
 * Integrates Content Factory rendered assets with Meta Ads. Allows publishing
 * CF-rendered content (images/videos) as Meta ad creatives and tracking
 * creative-level performance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentFactoryMetaService = void 0;
// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
/**
 * ContentFactoryMetaService connects CF (Content Factory) rendered outputs
 * to Meta advertising. It publishes creative assets, creates ads from content,
 * and tracks creative-level performance.
 *
 * All calls go through WaitlistLab as a Meta API proxy.
 */
class ContentFactoryMetaService {
    constructor(config) {
        this.wlApiUrl = config.wlApiUrl.replace(/\/+$/, "");
        this.wlApiKey = config.wlApiKey;
        this.adAccountId = config.adAccountId;
    }
    /**
     * Upload a rendered Content Factory asset as a Meta ad creative.
     *
     * @param renderedAssetUrl - URL of the rendered image or video from CF.
     * @param adCopy - Primary text for the ad.
     * @param headline - Headline text.
     * @param cta - Call to action (e.g., "LEARN_MORE", "SHOP_NOW").
     */
    async publishCreative(renderedAssetUrl, adCopy, headline, cta) {
        const body = {
            adAccountId: this.adAccountId,
            assetUrl: renderedAssetUrl,
            primaryText: adCopy,
            headline,
            callToAction: cta,
        };
        const result = await this.request("/meta/creatives", "POST", body);
        return result;
    }
    /**
     * Create a Meta ad directly from Content Factory content.
     *
     * @param contentId - Content Factory content ID.
     * @param campaignId - Target campaign for the ad.
     * @param targeting - Targeting specification for the ad set.
     */
    async createAdFromContent(contentId, campaignId, targeting) {
        const body = {
            adAccountId: this.adAccountId,
            contentId,
            campaignId,
            targeting,
        };
        const result = await this.request("/meta/ads/from-content", "POST", body);
        return result;
    }
    /**
     * Fetch creative-level performance insights.
     *
     * @param creativeId - Meta creative ID.
     * @param dateRange - Date range for the insights query.
     */
    async getCreativePerformance(creativeId, dateRange) {
        const params = new URLSearchParams({
            adAccountId: this.adAccountId,
            creativeId,
            since: dateRange.since,
            until: dateRange.until,
        });
        const result = await this.request(`/meta/creatives/performance?${params.toString()}`, "GET");
        return result;
    }
    /**
     * Sync ad delivery status back to Content Factory.
     * Returns the current status of the ad associated with a CF content item.
     *
     * @param contentId - Content Factory content ID.
     */
    async syncContentStatus(contentId) {
        const params = new URLSearchParams({
            adAccountId: this.adAccountId,
            contentId,
        });
        const result = await this.request(`/meta/content-sync?${params.toString()}`, "GET");
        return result;
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
exports.ContentFactoryMetaService = ContentFactoryMetaService;
//# sourceMappingURL=cf-meta.js.map