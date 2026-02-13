/**
 * Meta integration types for ACD product integrations.
 *
 * These types are used by PCTMetaService, ContentFactoryMetaService,
 * SharedPixelCAPIService, and other Meta-related integration modules.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Configuration for direct Meta Graph API access.
 */
export interface MetaIntegrationConfig {
  /** Long-lived access token for Meta API. */
  accessToken: string;

  /** Meta Ad Account ID (e.g., "act_123456789"). */
  adAccountId: string;

  /** Meta Pixel ID for conversion tracking. */
  pixelId?: string;

  /** Meta App ID (for app-level authentication). */
  appId?: string;

  /** Meta App Secret (for server-to-server calls). */
  appSecret?: string;
}

/**
 * Configuration for WaitlistLab-proxied Meta API access.
 */
export interface WaitlistLabMetaConfig {
  /** WaitlistLab API base URL. */
  wlApiUrl: string;

  /** WaitlistLab API key. */
  wlApiKey: string;

  /** Meta Ad Account ID (passed through to Meta). */
  adAccountId: string;
}

// ---------------------------------------------------------------------------
// Campaign
// ---------------------------------------------------------------------------

/** Campaign objective values. */
export type CampaignObjective =
  | "OUTCOME_AWARENESS"
  | "OUTCOME_ENGAGEMENT"
  | "OUTCOME_LEADS"
  | "OUTCOME_SALES"
  | "OUTCOME_TRAFFIC"
  | "OUTCOME_APP_PROMOTION";

/** Campaign status values. */
export type CampaignStatusValue = "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";

/** Bid strategy values. */
export type BidStrategy =
  | "LOWEST_COST_WITHOUT_CAP"
  | "LOWEST_COST_WITH_BID_CAP"
  | "COST_CAP"
  | "MINIMUM_ROAS";

/**
 * Request body for creating a campaign via Meta API.
 */
export interface CampaignCreateRequest {
  /** Campaign name. */
  name: string;

  /** Campaign objective. */
  objective: CampaignObjective;

  /** Campaign status. */
  status: CampaignStatusValue;

  /** Budget configuration. */
  budget: {
    /** Budget type. */
    type: "daily" | "lifetime";

    /** Amount in cents. */
    amountCents: number;
  };

  /** Optional bid strategy. */
  bidStrategy?: BidStrategy;
}

// ---------------------------------------------------------------------------
// Ad Set
// ---------------------------------------------------------------------------

/** Optimization goal values. */
export type OptimizationGoal =
  | "REACH"
  | "IMPRESSIONS"
  | "LINK_CLICKS"
  | "LANDING_PAGE_VIEWS"
  | "LEAD_GENERATION"
  | "CONVERSIONS"
  | "VALUE"
  | "APP_INSTALLS"
  | "OFFSITE_CONVERSIONS";

/** Billing event values. */
export type BillingEventValue = "IMPRESSIONS" | "LINK_CLICKS" | "THRUPLAY";

/**
 * Targeting specification for ad sets.
 */
export interface TargetingSpec {
  ageMin?: number;
  ageMax?: number;
  genders?: number[];
  geoLocations?: {
    countries?: string[];
    regions?: Array<{ key: string }>;
    cities?: Array<{ key: string; radius?: number; distanceUnit?: string }>;
  };
  interests?: Array<{ id: string; name: string }>;
  behaviors?: Array<{ id: string; name: string }>;
  customAudiences?: Array<{ id: string }>;
  excludedCustomAudiences?: Array<{ id: string }>;
  publisherPlatforms?: Array<"facebook" | "instagram" | "audience_network" | "messenger">;
  devicePlatforms?: Array<"mobile" | "desktop">;
}

/**
 * Request body for creating an ad set.
 */
export interface AdSetCreateRequest {
  /** Parent campaign ID. */
  campaignId: string;

  /** Ad set name. */
  name: string;

  /** Targeting specification. */
  targeting: TargetingSpec;

  /** Optimization goal. */
  optimization: OptimizationGoal;

  /** Billing event. */
  billingEvent: BillingEventValue;

  /** Budget configuration. */
  budget: {
    type: "daily" | "lifetime";
    amountCents: number;
  };

  /** Schedule (ISO 8601 timestamps). */
  schedule: {
    startTime: string;
    endTime?: string;
  };
}

// ---------------------------------------------------------------------------
// Ad
// ---------------------------------------------------------------------------

/**
 * Request body for creating an ad.
 */
export interface AdCreateRequest {
  /** Parent ad set ID. */
  adSetId: string;

  /** Creative ID to use. */
  creativeId: string;

  /** Ad name. */
  name: string;

  /** Ad status. */
  status: CampaignStatusValue;
}

// ---------------------------------------------------------------------------
// Insights / Reporting
// ---------------------------------------------------------------------------

/** Insight query level. */
export type InsightLevel = "campaign" | "adset" | "ad";

/** Date presets for insight queries. */
export type DatePreset =
  | "today"
  | "yesterday"
  | "this_month"
  | "last_month"
  | "last_7d"
  | "last_14d"
  | "last_28d"
  | "last_30d"
  | "last_90d";

/**
 * Query parameters for fetching insights.
 */
export interface InsightQuery {
  /** Level at which to retrieve insights. */
  level: InsightLevel;

  /** Predefined date range. */
  datePreset?: DatePreset;

  /** Custom time range (ISO 8601 dates). */
  timeRange?: {
    since: string;
    until: string;
  };

  /** Fields to retrieve. */
  fields: string[];

  /** Breakdown dimensions. */
  breakdowns?: string[];
}

// ---------------------------------------------------------------------------
// CAPI / Pixel types
// ---------------------------------------------------------------------------

/**
 * User data for Meta Conversions API (hashed PII).
 */
export interface CAPIUserData {
  em?: string[];
  ph?: string[];
  fn?: string[];
  ln?: string[];
  db?: string[];
  ge?: string[];
  ct?: string[];
  st?: string[];
  zp?: string[];
  country?: string[];
  externalId?: string[];
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
  subscriptionId?: string;
  leadId?: string;
}

/**
 * Custom data payload for CAPI events.
 */
export interface CAPICustomData {
  value?: number;
  currency?: string;
  contentName?: string;
  contentCategory?: string;
  contentIds?: string[];
  contentType?: string;
  contents?: Array<{
    id: string;
    quantity: number;
    itemPrice?: number;
  }>;
  numItems?: number;
  orderId?: string;
  searchString?: string;
  status?: string;
  predictedLtv?: number;
}

/**
 * A single CAPI event to send to Meta.
 */
export interface CAPIEventPayload {
  eventName: string;
  eventTime: number;
  actionSource: "website" | "app" | "phone_call" | "chat" | "email" | "physical_store" | "system_generated" | "other";
  eventSourceUrl?: string;
  eventId?: string;
  userData: CAPIUserData;
  customData?: CAPICustomData;
  dataProcessingOptions?: string[];
  dataProcessingOptionsCountry?: number;
  dataProcessingOptionsState?: number;
}

// ---------------------------------------------------------------------------
// Attribution
// ---------------------------------------------------------------------------

/**
 * A single touchpoint in a user's cross-product journey.
 */
export interface Touchpoint {
  id: string;
  userId: string;
  product: string;
  eventType: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Attribution model types.
 */
export type AttributionModel = "first_touch" | "last_touch" | "linear";

/**
 * Weighted attribution result per touchpoint.
 */
export interface AttributionWeight {
  touchpointId: string;
  product: string;
  eventType: string;
  weight: number;
}

/**
 * Full attribution result for a conversion event.
 */
export interface AttributionResult {
  userId: string;
  conversionEvent: string;
  models: Record<AttributionModel, AttributionWeight[]>;
}

// ---------------------------------------------------------------------------
// Rate limit pool
// ---------------------------------------------------------------------------

/**
 * An account entry in the rate limit pool.
 */
export interface PoolAccount {
  adAccountId: string;
  accessToken: string;
}

/**
 * Per-account usage stats from the rate limit pool.
 */
export interface AccountUsage {
  adAccountId: string;
  activeSlots: number;
  totalCalls: number;
}

/**
 * A rate-limited slot acquired from the pool.
 */
export interface RateLimitSlot {
  slotId: string;
  adAccountId: string;
  accessToken: string;
  acquiredAt: number;
}

// ---------------------------------------------------------------------------
// WaitlistLab API response envelope
// ---------------------------------------------------------------------------

/**
 * Generic response from WaitlistLab proxy API.
 */
export interface WLApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ---------------------------------------------------------------------------
// Content Factory types
// ---------------------------------------------------------------------------

/**
 * Creative upload result from Content Factory.
 */
export interface CreativeUploadResult {
  creativeId: string;
  metaCreativeId?: string;
  imageHash?: string;
  status: "uploaded" | "processing" | "ready" | "failed";
}

/**
 * Creative performance data.
 */
export interface CreativePerformance {
  creativeId: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  conversions: number;
  roas: number;
  dateRange: { since: string; until: string };
}
