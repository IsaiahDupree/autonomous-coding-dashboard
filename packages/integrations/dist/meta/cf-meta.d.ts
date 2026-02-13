/**
 * ContentFactoryMetaService (MH-003)
 *
 * Integrates Content Factory rendered assets with Meta Ads. Allows publishing
 * CF-rendered content (images/videos) as Meta ad creatives and tracking
 * creative-level performance.
 */
import type { WaitlistLabMetaConfig, CreativeUploadResult, CreativePerformance, TargetingSpec } from "./types";
interface AdFromContentResult {
    adId: string;
    creativeId: string;
    campaignId: string;
    status: string;
}
interface ContentStatusSync {
    contentId: string;
    adId: string;
    adStatus: string;
    deliveryStatus: string;
    lastUpdated: string;
}
/**
 * ContentFactoryMetaService connects CF (Content Factory) rendered outputs
 * to Meta advertising. It publishes creative assets, creates ads from content,
 * and tracks creative-level performance.
 *
 * All calls go through WaitlistLab as a Meta API proxy.
 */
export declare class ContentFactoryMetaService {
    private readonly wlApiUrl;
    private readonly wlApiKey;
    private readonly adAccountId;
    constructor(config: WaitlistLabMetaConfig);
    /**
     * Upload a rendered Content Factory asset as a Meta ad creative.
     *
     * @param renderedAssetUrl - URL of the rendered image or video from CF.
     * @param adCopy - Primary text for the ad.
     * @param headline - Headline text.
     * @param cta - Call to action (e.g., "LEARN_MORE", "SHOP_NOW").
     */
    publishCreative(renderedAssetUrl: string, adCopy: string, headline: string, cta: string): Promise<CreativeUploadResult>;
    /**
     * Create a Meta ad directly from Content Factory content.
     *
     * @param contentId - Content Factory content ID.
     * @param campaignId - Target campaign for the ad.
     * @param targeting - Targeting specification for the ad set.
     */
    createAdFromContent(contentId: string, campaignId: string, targeting: TargetingSpec): Promise<AdFromContentResult>;
    /**
     * Fetch creative-level performance insights.
     *
     * @param creativeId - Meta creative ID.
     * @param dateRange - Date range for the insights query.
     */
    getCreativePerformance(creativeId: string, dateRange: {
        since: string;
        until: string;
    }): Promise<CreativePerformance>;
    /**
     * Sync ad delivery status back to Content Factory.
     * Returns the current status of the ad associated with a CF content item.
     *
     * @param contentId - Content Factory content ID.
     */
    syncContentStatus(contentId: string): Promise<ContentStatusSync>;
    private request;
}
export {};
//# sourceMappingURL=cf-meta.d.ts.map