export { MetaHubClient } from './client';
export { MetaPixelClient } from './pixel';
export { MetaRateLimiter } from './rate-limiter';
export { MetaApiError, MetaRateLimitError, MetaAuthError, MetaValidationError, classifyMetaError, isMetaApiError, isMetaRateLimitError, isMetaAuthError, isMetaValidationError, } from './errors';
export type { MetaHubConfig, MetaPixelConfig, Campaign, AdSet, Ad, AdCreative, ObjectStorySpec, Targeting, Insight, InsightAction, InsightParams, DateRange, CustomAudience, AudienceUser, CAPIEvent, UserData, HashedUserData, CustomData, CreateCampaignInput, CreateAdSetInput, CreateAdInput, CreateAdCreativeInput, AdCreativeSpec, CreateAudienceInput, MetaApiErrorResponse, MetaPaginatedResponse, MetaCreateResponse, MetaSuccessResponse, ImageUploadResponse, VideoUploadResponse, EventsResponse, RateLimitInfo, RateLimitBucket, } from './types';
export type { RateLimiterConfig } from './rate-limiter';
export { CampaignObjective, CampaignStatus, AdSetStatus, AdStatus, BillingEvent, OptimizationGoal, ActionSource, InsightLevel, InsightDatePreset, AudienceSubtype, DEFAULT_API_VERSION, } from './types';
export { DateRangeSchema, CAPIEventSchema, CreateCampaignInputSchema, CreateAdSetInputSchema, CreateAdInputSchema, InsightParamsSchema, } from './types';
//# sourceMappingURL=index.d.ts.map