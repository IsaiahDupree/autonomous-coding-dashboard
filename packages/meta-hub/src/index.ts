// @acd/meta-hub - Shared Meta Marketing API client library
// Used by WaitlistLab, PCT, and Content Factory

// ---------------------------------------------------------------------------
// Client Classes
// ---------------------------------------------------------------------------
export { MetaHubClient } from './client';
export { MetaPixelClient } from './pixel';
export { MetaRateLimiter } from './rate-limiter';

// ---------------------------------------------------------------------------
// Error Classes & Helpers
// ---------------------------------------------------------------------------
export {
  MetaApiError,
  MetaRateLimitError,
  MetaAuthError,
  MetaValidationError,
  classifyMetaError,
  isMetaApiError,
  isMetaRateLimitError,
  isMetaAuthError,
  isMetaValidationError,
} from './errors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type {
  // Config
  MetaHubConfig,
  MetaPixelConfig,

  // Core resources
  Campaign,
  AdSet,
  Ad,
  AdCreative,
  ObjectStorySpec,
  Targeting,

  // Insights
  Insight,
  InsightAction,
  InsightParams,
  DateRange,

  // Audiences
  CustomAudience,
  AudienceUser,

  // CAPI / Pixel
  CAPIEvent,
  UserData,
  HashedUserData,
  CustomData,

  // Create inputs
  CreateCampaignInput,
  CreateAdSetInput,
  CreateAdInput,
  CreateAdCreativeInput,
  AdCreativeSpec,
  CreateAudienceInput,

  // API responses
  MetaApiErrorResponse,
  MetaPaginatedResponse,
  MetaCreateResponse,
  MetaSuccessResponse,
  ImageUploadResponse,
  VideoUploadResponse,
  EventsResponse,

  // Rate limiter
  RateLimitInfo,
  RateLimitBucket,
} from './types';

export type { RateLimiterConfig } from './rate-limiter';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export {
  CampaignObjective,
  CampaignStatus,
  AdSetStatus,
  AdStatus,
  BillingEvent,
  OptimizationGoal,
  ActionSource,
  InsightLevel,
  InsightDatePreset,
  AudienceSubtype,
  DEFAULT_API_VERSION,
} from './types';

// ---------------------------------------------------------------------------
// Zod Schemas (for runtime validation)
// ---------------------------------------------------------------------------
export {
  DateRangeSchema,
  CAPIEventSchema,
  CreateCampaignInputSchema,
  CreateAdSetInputSchema,
  CreateAdInputSchema,
  InsightParamsSchema,
} from './types';
