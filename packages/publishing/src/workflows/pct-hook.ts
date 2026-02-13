/**
 * FLOW-003: PCT Ad Pipeline Hook
 *
 * Hooks into the content approval workflow to automatically
 * create advertising campaigns and publish content when approved.
 *
 * Flow: Content Approved -> Create Campaign -> Create Ad -> Publish
 */

import type { ApprovalRequest, Platform, PublishRequest, PublishResult } from '../types';
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

export class PCTAdPipelineHook {
  private readonly config: PCTAdPipelineConfig;
  private readonly syndicationService: SyndicationService;
  private readonly campaigns = new Map<string, AdCampaign>();
  private readonly ads = new Map<string, AdCreative>();
  private nextCampaignId = 1;
  private nextAdId = 1;

  constructor(config: PCTAdPipelineConfig, syndicationService: SyndicationService) {
    this.config = config;
    this.syndicationService = syndicationService;
  }

  /**
   * Hook called when content is approved. Triggers the full ad pipeline:
   *   1. Create a campaign
   *   2. Create ad creatives for each target platform
   *   3. Publish content to platforms via syndication
   */
  async onContentApproved(approval: ApprovalRequest): Promise<{
    campaign: AdCampaign;
    ads: AdCreative[];
    publishResults: Map<Platform, PublishResult | { error: string }>;
  }> {
    // Step 1: Create campaign
    const campaign = await this.createCampaign(approval.contentId);

    // Step 2: Create ad creatives for each platform
    const adCreatives: AdCreative[] = [];
    for (const platform of this.config.targetPlatforms) {
      const ad = await this.createAd(campaign.campaignId, approval.contentId, platform);
      adCreatives.push(ad);
    }

    // Step 3: Publish to all platforms
    const syndicationResult = await this.syndicationService.publishToMultiple(
      approval.contentId,
      this.config.targetPlatforms,
      {
        contentId: approval.contentId,
        account: '', // Account should be resolved per-platform in production
        metadata: {
          title: `Ad - ${approval.contentId}`,
          description: '',
          tags: [],
          visibility: 'public',
        },
      },
    );

    // Update ad creatives with publish results
    for (const ad of adCreatives) {
      const result = syndicationResult.results.get(ad.platform);
      if (result && !('error' in result)) {
        ad.publishResult = result;
        ad.status = 'active';
      } else {
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
  async createCampaign(contentId: string): Promise<AdCampaign> {
    const campaignId = `campaign-${this.nextCampaignId++}`;
    const campaign: AdCampaign = {
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
  async createAd(campaignId: string, contentId: string, platform: Platform): Promise<AdCreative> {
    const adId = `ad-${this.nextAdId++}`;
    const ad: AdCreative = {
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
  async getCampaign(campaignId: string): Promise<AdCampaign> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }
    return campaign;
  }

  /**
   * Lists all ads for a given campaign.
   */
  async getAdsForCampaign(campaignId: string): Promise<AdCreative[]> {
    return Array.from(this.ads.values()).filter((a) => a.campaignId === campaignId);
  }
}
