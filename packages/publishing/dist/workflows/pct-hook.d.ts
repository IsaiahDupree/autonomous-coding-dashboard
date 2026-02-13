/**
 * FLOW-003: PCT Ad Pipeline Hook
 *
 * Hooks into the content approval workflow to automatically
 * create advertising campaigns and publish content when approved.
 *
 * Flow: Content Approved -> Create Campaign -> Create Ad -> Publish
 */
import type { ApprovalRequest, Platform, PublishResult } from '../types';
import type { SyndicationService } from '../publishers/syndication';
export interface AdCampaign {
    campaignId: string;
    name: string;
    contentId: string;
    budget: number;
    currency: string;
    status: 'draft' | 'active' | 'paused' | 'completed';
    createdAt: string;
}
export interface AdCreative {
    adId: string;
    campaignId: string;
    contentId: string;
    platform: Platform;
    publishResult?: PublishResult;
    status: 'pending' | 'active' | 'rejected' | 'completed';
    createdAt: string;
}
export interface PCTAdPipelineConfig {
    defaultBudget: number;
    defaultCurrency: string;
    targetPlatforms: Platform[];
}
export declare class PCTAdPipelineHook {
    private readonly config;
    private readonly syndicationService;
    private readonly campaigns;
    private readonly ads;
    private nextCampaignId;
    private nextAdId;
    constructor(config: PCTAdPipelineConfig, syndicationService: SyndicationService);
    /**
     * Hook called when content is approved. Triggers the full ad pipeline:
     *   1. Create a campaign
     *   2. Create ad creatives for each target platform
     *   3. Publish content to platforms via syndication
     */
    onContentApproved(approval: ApprovalRequest): Promise<{
        campaign: AdCampaign;
        ads: AdCreative[];
        publishResults: Map<Platform, PublishResult | {
            error: string;
        }>;
    }>;
    /**
     * Creates a new advertising campaign for the given content.
     */
    createCampaign(contentId: string): Promise<AdCampaign>;
    /**
     * Creates an ad creative for a specific platform within a campaign.
     */
    createAd(campaignId: string, contentId: string, platform: Platform): Promise<AdCreative>;
    /**
     * Retrieves a campaign by its ID.
     */
    getCampaign(campaignId: string): Promise<AdCampaign>;
    /**
     * Lists all ads for a given campaign.
     */
    getAdsForCampaign(campaignId: string): Promise<AdCreative[]>;
}
//# sourceMappingURL=pct-hook.d.ts.map