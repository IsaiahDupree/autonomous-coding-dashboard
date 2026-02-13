/**
 * JOB-004: Meta Ad Publish Job Processor
 *
 * Manages the lifecycle of publishing ads to the Meta (Facebook/Instagram)
 * Ads platform: validation -> creative upload -> campaign creation -> publish.
 */

import { Job } from '../types';
import { JobQueue } from './queue';

// ── Types ────────────────────────────────────────────────────────────────────

export interface MetaAdPublishInput {
  accountId: string;
  campaignName: string;
  adSetName: string;
  creativeAssetUrl: string;
  targetAudience: {
    ageMin: number;
    ageMax: number;
    genders: ('male' | 'female' | 'all')[];
    locations: string[];
    interests: string[];
  };
  budget: {
    dailyBudget: number;
    currency: string;
  };
  schedule: {
    startDate: string;
    endDate?: string;
  };
}

export interface MetaAdPublishResult {
  campaignId: string;
  adSetId: string;
  adId: string;
  status: 'published' | 'pending_review';
  publishedAt: Date;
}

// ── Processor ────────────────────────────────────────────────────────────────

export class MetaAdPublishJobProcessor {
  private queue: JobQueue;

  constructor(queue?: JobQueue) {
    this.queue = queue ?? new JobQueue('meta-ad-publish', {
      maxConcurrency: 3,
      maxRetries: 2,
      retryDelayMs: 10_000,
    });

    this.queue.process(this.handle.bind(this));
  }

  async submit(input: MetaAdPublishInput): Promise<Job> {
    return this.queue.add(input, { priority: 'normal' });
  }

  getQueue(): JobQueue {
    return this.queue;
  }

  // ── Handler ──────────────────────────────────────────────────────────────

  private async handle(job: Job): Promise<MetaAdPublishResult> {
    const input = job.data as MetaAdPublishInput;

    // Step 1: Validate input
    this.validateInput(input);

    // Step 2: Upload creative asset
    const _creativeId = await this.uploadCreative(input.accountId, input.creativeAssetUrl);

    // Step 3: Create campaign
    const campaignId = await this.createCampaign(input);

    // Step 4: Create ad set
    const adSetId = await this.createAdSet(campaignId, input);

    // Step 5: Create ad with creative
    const adId = await this.createAd(adSetId, _creativeId);

    return {
      campaignId,
      adSetId,
      adId,
      status: 'pending_review',
      publishedAt: new Date(),
    };
  }

  private validateInput(input: MetaAdPublishInput): void {
    if (!input.accountId) throw new Error('accountId is required');
    if (!input.campaignName) throw new Error('campaignName is required');
    if (!input.creativeAssetUrl) throw new Error('creativeAssetUrl is required');
    if (input.budget.dailyBudget <= 0) throw new Error('dailyBudget must be positive');
  }

  private async uploadCreative(_accountId: string, _assetUrl: string): Promise<string> {
    // In production: upload to Meta Marketing API
    return `creative_${Date.now()}`;
  }

  private async createCampaign(_input: MetaAdPublishInput): Promise<string> {
    // In production: POST to Meta Marketing API /campaigns
    return `campaign_${Date.now()}`;
  }

  private async createAdSet(_campaignId: string, _input: MetaAdPublishInput): Promise<string> {
    // In production: POST to Meta Marketing API /adsets
    return `adset_${Date.now()}`;
  }

  private async createAd(_adSetId: string, _creativeId: string): Promise<string> {
    // In production: POST to Meta Marketing API /ads
    return `ad_${Date.now()}`;
  }
}
