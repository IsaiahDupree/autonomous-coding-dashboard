"use strict";
/**
 * FLOW-003: PCT Ad Pipeline Hook
 *
 * Hooks into the content approval workflow to automatically
 * create advertising campaigns and publish content when approved.
 *
 * Flow: Content Approved -> Create Campaign -> Create Ad -> Publish
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PCTAdPipelineHook = void 0;
class PCTAdPipelineHook {
    constructor(config, syndicationService) {
        this.campaigns = new Map();
        this.ads = new Map();
        this.nextCampaignId = 1;
        this.nextAdId = 1;
        this.config = config;
        this.syndicationService = syndicationService;
    }
    /**
     * Hook called when content is approved. Triggers the full ad pipeline:
     *   1. Create a campaign
     *   2. Create ad creatives for each target platform
     *   3. Publish content to platforms via syndication
     */
    async onContentApproved(approval) {
        // Step 1: Create campaign
        const campaign = await this.createCampaign(approval.contentId);
        // Step 2: Create ad creatives for each platform
        const adCreatives = [];
        for (const platform of this.config.targetPlatforms) {
            const ad = await this.createAd(campaign.campaignId, approval.contentId, platform);
            adCreatives.push(ad);
        }
        // Step 3: Publish to all platforms
        const syndicationResult = await this.syndicationService.publishToMultiple(approval.contentId, this.config.targetPlatforms, {
            contentId: approval.contentId,
            account: '', // Account should be resolved per-platform in production
            metadata: {
                title: `Ad - ${approval.contentId}`,
                description: '',
                tags: [],
                visibility: 'public',
            },
        });
        // Update ad creatives with publish results
        for (const ad of adCreatives) {
            const result = syndicationResult.results.get(ad.platform);
            if (result && !('error' in result)) {
                ad.publishResult = result;
                ad.status = 'active';
            }
            else {
                ad.status = 'rejected';
            }
        }
        // Activate campaign if at least one ad was published
        const hasActiveAd = adCreatives.some((a) => a.status === 'active');
        if (hasActiveAd) {
            campaign.status = 'active';
        }
        return {
            campaign,
            ads: adCreatives,
            publishResults: syndicationResult.results,
        };
    }
    /**
     * Creates a new advertising campaign for the given content.
     */
    async createCampaign(contentId) {
        const campaignId = `campaign-${this.nextCampaignId++}`;
        const campaign = {
            campaignId,
            name: `Campaign for ${contentId}`,
            contentId,
            budget: this.config.defaultBudget,
            currency: this.config.defaultCurrency,
            status: 'draft',
            createdAt: new Date().toISOString(),
        };
        this.campaigns.set(campaignId, campaign);
        return campaign;
    }
    /**
     * Creates an ad creative for a specific platform within a campaign.
     */
    async createAd(campaignId, contentId, platform) {
        const adId = `ad-${this.nextAdId++}`;
        const ad = {
            adId,
            campaignId,
            contentId,
            platform,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        this.ads.set(adId, ad);
        return ad;
    }
    /**
     * Retrieves a campaign by its ID.
     */
    async getCampaign(campaignId) {
        const campaign = this.campaigns.get(campaignId);
        if (!campaign) {
            throw new Error(`Campaign not found: ${campaignId}`);
        }
        return campaign;
    }
    /**
     * Lists all ads for a given campaign.
     */
    async getAdsForCampaign(campaignId) {
        return Array.from(this.ads.values()).filter((a) => a.campaignId === campaignId);
    }
}
exports.PCTAdPipelineHook = PCTAdPipelineHook;
//# sourceMappingURL=pct-hook.js.map