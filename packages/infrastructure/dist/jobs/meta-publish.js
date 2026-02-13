"use strict";
/**
 * JOB-004: Meta Ad Publish Job Processor
 *
 * Manages the lifecycle of publishing ads to the Meta (Facebook/Instagram)
 * Ads platform: validation -> creative upload -> campaign creation -> publish.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaAdPublishJobProcessor = void 0;
const queue_1 = require("./queue");
// ── Processor ────────────────────────────────────────────────────────────────
class MetaAdPublishJobProcessor {
    constructor(queue) {
        this.queue = queue ?? new queue_1.JobQueue('meta-ad-publish', {
            maxConcurrency: 3,
            maxRetries: 2,
            retryDelayMs: 10000,
        });
        this.queue.process(this.handle.bind(this));
    }
    async submit(input) {
        return this.queue.add(input, { priority: 'normal' });
    }
    getQueue() {
        return this.queue;
    }
    // ── Handler ──────────────────────────────────────────────────────────────
    async handle(job) {
        const input = job.data;
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
    validateInput(input) {
        if (!input.accountId)
            throw new Error('accountId is required');
        if (!input.campaignName)
            throw new Error('campaignName is required');
        if (!input.creativeAssetUrl)
            throw new Error('creativeAssetUrl is required');
        if (input.budget.dailyBudget <= 0)
            throw new Error('dailyBudget must be positive');
    }
    async uploadCreative(_accountId, _assetUrl) {
        // In production: upload to Meta Marketing API
        return `creative_${Date.now()}`;
    }
    async createCampaign(_input) {
        // In production: POST to Meta Marketing API /campaigns
        return `campaign_${Date.now()}`;
    }
    async createAdSet(_campaignId, _input) {
        // In production: POST to Meta Marketing API /adsets
        return `adset_${Date.now()}`;
    }
    async createAd(_adSetId, _creativeId) {
        // In production: POST to Meta Marketing API /ads
        return `ad_${Date.now()}`;
    }
}
exports.MetaAdPublishJobProcessor = MetaAdPublishJobProcessor;
