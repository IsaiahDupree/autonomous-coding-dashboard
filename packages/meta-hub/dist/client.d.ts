import { MetaRateLimiter, type RateLimiterConfig } from './rate-limiter';
import { type MetaHubConfig, type Campaign, type AdSet, type Ad, type AdCreative, type Insight, type CustomAudience, type AudienceUser, type CreateCampaignInput, type CreateAdSetInput, type CreateAdInput, type CreateAdCreativeInput, type CreateAudienceInput, type InsightParams, type DateRange, type ImageUploadResponse } from './types';
/**
 * Full-featured client for the Meta Marketing API (Graph API).
 *
 * Covers campaigns, ad sets, ads, creatives, insights, and custom audiences.
 * Includes built-in rate-limit management via {@link MetaRateLimiter}.
 */
export declare class MetaHubClient {
    private readonly accessToken;
    private readonly apiVersion;
    private readonly appSecret?;
    private readonly baseUrl;
    private readonly rateLimiter;
    private readonly consumer;
    constructor(config: MetaHubConfig, rateLimiterConfig?: RateLimiterConfig, consumer?: string);
    createCampaign(accountId: string, input: CreateCampaignInput): Promise<Campaign>;
    getCampaign(campaignId: string): Promise<Campaign>;
    updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign>;
    deleteCampaign(campaignId: string): Promise<void>;
    createAdSet(campaignId: string, input: CreateAdSetInput): Promise<AdSet>;
    getAdSet(adSetId: string): Promise<AdSet>;
    updateAdSet(adSetId: string, updates: Partial<AdSet>): Promise<AdSet>;
    createAd(adSetId: string, input: CreateAdInput): Promise<Ad>;
    getAd(adId: string): Promise<Ad>;
    updateAd(adId: string, updates: Partial<Ad>): Promise<Ad>;
    createAdCreative(accountId: string, input: CreateAdCreativeInput): Promise<AdCreative>;
    uploadImage(accountId: string, imageUrl: string): Promise<ImageUploadResponse>;
    uploadVideo(accountId: string, videoUrl: string): Promise<{
        videoId: string;
    }>;
    getInsights(objectId: string, params: InsightParams): Promise<Insight[]>;
    getCampaignInsights(campaignId: string, dateRange: DateRange): Promise<Insight[]>;
    getAdSetInsights(adSetId: string, dateRange: DateRange): Promise<Insight[]>;
    getAdInsights(adId: string, dateRange: DateRange): Promise<Insight[]>;
    createCustomAudience(accountId: string, input: CreateAudienceInput): Promise<CustomAudience>;
    addUsersToAudience(audienceId: string, users: AudienceUser[]): Promise<void>;
    removeUsersFromAudience(audienceId: string, users: AudienceUser[]): Promise<void>;
    createLookalikeAudience(sourceAudienceId: string, country: string, ratio: number): Promise<CustomAudience>;
    /**
     * Expose the underlying rate limiter for advanced use cases.
     */
    getRateLimiter(): MetaRateLimiter;
    /**
     * Gracefully shut down the client, draining rate-limiter queues.
     */
    shutdown(): void;
    private get;
    private post;
    private delete;
    private buildUrl;
    private request;
    /**
     * Build the schema array for custom audience user uploads.
     * Returns the field names in the order the data arrays will be constructed.
     */
    private buildAudienceSchema;
    /**
     * Hash a single audience user's PII fields using SHA-256 (as required by Meta).
     * Returns an array of values in the same order as the schema.
     */
    private hashAudienceUser;
    private sha256;
    private stripActPrefix;
}
//# sourceMappingURL=client.d.ts.map