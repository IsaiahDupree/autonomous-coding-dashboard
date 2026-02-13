import { z } from "zod";

// ---------------------------------------------------------------------------
// Campaign
// ---------------------------------------------------------------------------

/**
 * Campaign objective (Meta Marketing API objectives).
 */
export const CampaignObjectiveSchema = z.enum([
  "OUTCOME_AWARENESS",
  "OUTCOME_ENGAGEMENT",
  "OUTCOME_LEADS",
  "OUTCOME_SALES",
  "OUTCOME_TRAFFIC",
  "OUTCOME_APP_PROMOTION",
]);
export type CampaignObjective = z.infer<typeof CampaignObjectiveSchema>;

/**
 * Campaign status.
 */
export const CampaignStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
  "DELETED",
  "ARCHIVED",
]);
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

/**
 * Campaign buying type.
 */
export const BuyingTypeSchema = z.enum(["AUCTION", "RESERVED"]);
export type BuyingType = z.infer<typeof BuyingTypeSchema>;

/**
 * Budget type.
 */
export const BudgetTypeSchema = z.enum(["DAILY", "LIFETIME"]);
export type BudgetType = z.infer<typeof BudgetTypeSchema>;

/**
 * Campaign - A Meta advertising campaign.
 */
export const CampaignSchema = z.object({
  /** Unique campaign identifier (UUID v4 in ACD, maps to Meta campaign ID). */
  id: z.string().uuid(),

  /** Meta campaign ID. */
  metaCampaignId: z.string().min(1),

  /** Meta Ad Account ID. */
  adAccountId: z.string().min(1),

  /** Campaign name. */
  name: z.string().min(1).max(512),

  /** Campaign objective. */
  objective: CampaignObjectiveSchema,

  /** Campaign status. */
  status: CampaignStatusSchema.default("PAUSED"),

  /** Effective status (computed by Meta). */
  effectiveStatus: z.string().optional(),

  /** Buying type. */
  buyingType: BuyingTypeSchema.default("AUCTION"),

  /** Budget type. */
  budgetType: BudgetTypeSchema.optional(),

  /** Daily budget in cents. */
  dailyBudgetCents: z.number().int().nonnegative().optional(),

  /** Lifetime budget in cents. */
  lifetimeBudgetCents: z.number().int().nonnegative().optional(),

  /** Spend cap in cents. */
  spendCapCents: z.number().int().nonnegative().optional(),

  /** Bid strategy. */
  bidStrategy: z.enum(["LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_BID_CAP", "COST_CAP", "MINIMUM_ROAS"]).optional(),

  /** Campaign budget optimization enabled. */
  cboEnabled: z.boolean().default(false),

  /** Special ad categories. */
  specialAdCategories: z.array(z.enum(["CREDIT", "EMPLOYMENT", "HOUSING", "SOCIAL_ISSUES_ELECTIONS_POLITICS", "NONE"])).default([]),

  /** ISO 8601 start time. */
  startTime: z.string().datetime().optional(),

  /** ISO 8601 end time. */
  endTime: z.string().datetime().optional(),

  /** ISO 8601 timestamp of creation. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last update. */
  updatedAt: z.string().datetime(),
});

export type Campaign = z.infer<typeof CampaignSchema>;

// ---------------------------------------------------------------------------
// Ad Set
// ---------------------------------------------------------------------------

/**
 * Optimization goal for ad delivery.
 */
export const OptimizationGoalSchema = z.enum([
  "REACH",
  "IMPRESSIONS",
  "LINK_CLICKS",
  "LANDING_PAGE_VIEWS",
  "LEAD_GENERATION",
  "CONVERSIONS",
  "VALUE",
  "APP_INSTALLS",
  "OFFSITE_CONVERSIONS",
  "POST_ENGAGEMENT",
  "VIDEO_VIEWS",
  "THRUPLAY",
]);
export type OptimizationGoal = z.infer<typeof OptimizationGoalSchema>;

/**
 * Billing event.
 */
export const BillingEventSchema = z.enum(["IMPRESSIONS", "LINK_CLICKS", "THRUPLAY"]);
export type BillingEvent = z.infer<typeof BillingEventSchema>;

/**
 * Targeting specification (simplified).
 */
export const TargetingSchema = z.object({
  /** Age minimum (13-65). */
  ageMin: z.number().int().min(13).max(65).optional(),

  /** Age maximum (13-65). */
  ageMax: z.number().int().min(13).max(65).optional(),

  /** Genders (1=male, 2=female). */
  genders: z.array(z.number().int().min(1).max(2)).optional(),

  /** Geographic locations. */
  geoLocations: z
    .object({
      countries: z.array(z.string().length(2)).optional(),
      regions: z.array(z.object({ key: z.string() })).optional(),
      cities: z.array(z.object({ key: z.string(), radius: z.number().optional(), distanceUnit: z.string().optional() })).optional(),
      zips: z.array(z.object({ key: z.string() })).optional(),
    })
    .optional(),

  /** Excluded geographic locations. */
  excludedGeoLocations: z
    .object({
      countries: z.array(z.string().length(2)).optional(),
      regions: z.array(z.object({ key: z.string() })).optional(),
    })
    .optional(),

  /** Locales (language targeting). */
  locales: z.array(z.number().int()).optional(),

  /** Interest targeting. */
  interests: z.array(z.object({ id: z.string(), name: z.string() })).optional(),

  /** Behavior targeting. */
  behaviors: z.array(z.object({ id: z.string(), name: z.string() })).optional(),

  /** Custom audiences (IDs). */
  customAudiences: z.array(z.object({ id: z.string() })).optional(),

  /** Excluded custom audiences. */
  excludedCustomAudiences: z.array(z.object({ id: z.string() })).optional(),

  /** Lookalike audiences. */
  lookalikeAudiences: z.array(z.object({ id: z.string() })).optional(),

  /** Publisher platforms. */
  publisherPlatforms: z.array(z.enum(["facebook", "instagram", "audience_network", "messenger"])).optional(),

  /** Facebook positions. */
  facebookPositions: z.array(z.string()).optional(),

  /** Instagram positions. */
  instagramPositions: z.array(z.string()).optional(),

  /** Device platforms. */
  devicePlatforms: z.array(z.enum(["mobile", "desktop"])).optional(),
});

export type Targeting = z.infer<typeof TargetingSchema>;

/**
 * AdSet - A Meta ad set within a campaign.
 */
export const AdSetSchema = z.object({
  /** Unique ad set identifier (UUID v4). */
  id: z.string().uuid(),

  /** Meta ad set ID. */
  metaAdSetId: z.string().min(1),

  /** Parent campaign ID (ACD UUID). */
  campaignId: z.string().uuid(),

  /** Meta campaign ID. */
  metaCampaignId: z.string().min(1),

  /** Ad Account ID. */
  adAccountId: z.string().min(1),

  /** Ad set name. */
  name: z.string().min(1).max(512),

  /** Ad set status. */
  status: CampaignStatusSchema.default("PAUSED"),

  /** Effective status. */
  effectiveStatus: z.string().optional(),

  /** Optimization goal. */
  optimizationGoal: OptimizationGoalSchema,

  /** Billing event. */
  billingEvent: BillingEventSchema.default("IMPRESSIONS"),

  /** Daily budget in cents. */
  dailyBudgetCents: z.number().int().nonnegative().optional(),

  /** Lifetime budget in cents. */
  lifetimeBudgetCents: z.number().int().nonnegative().optional(),

  /** Bid amount in cents. */
  bidAmountCents: z.number().int().nonnegative().optional(),

  /** Targeting specification. */
  targeting: TargetingSchema.optional(),

  /** Conversion event (pixel event name). */
  conversionEvent: z.string().max(256).optional(),

  /** Meta Pixel ID for conversion tracking. */
  pixelId: z.string().optional(),

  /** Attribution window. */
  attributionSpec: z
    .array(
      z.object({
        eventType: z.string(),
        window: z.string(),
      })
    )
    .optional(),

  /** Schedule start time (ISO 8601). */
  startTime: z.string().datetime().optional(),

  /** Schedule end time (ISO 8601). */
  endTime: z.string().datetime().optional(),

  /** ISO 8601 timestamp of creation. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last update. */
  updatedAt: z.string().datetime(),
});

export type AdSet = z.infer<typeof AdSetSchema>;

// ---------------------------------------------------------------------------
// Ad Creative
// ---------------------------------------------------------------------------

/**
 * Creative format.
 */
export const CreativeFormatSchema = z.enum([
  "SINGLE_IMAGE",
  "SINGLE_VIDEO",
  "CAROUSEL",
  "COLLECTION",
  "INSTANT_EXPERIENCE",
  "DYNAMIC",
]);
export type CreativeFormat = z.infer<typeof CreativeFormatSchema>;

/**
 * Call to action type.
 */
export const CallToActionSchema = z.enum([
  "LEARN_MORE",
  "SHOP_NOW",
  "SIGN_UP",
  "SUBSCRIBE",
  "CONTACT_US",
  "DOWNLOAD",
  "GET_OFFER",
  "BOOK_NOW",
  "APPLY_NOW",
  "WATCH_MORE",
  "GET_QUOTE",
  "NO_BUTTON",
]);
export type CallToAction = z.infer<typeof CallToActionSchema>;

/**
 * AdCreative - Creative content for an ad.
 */
export const AdCreativeSchema = z.object({
  /** Unique creative identifier (UUID v4). */
  id: z.string().uuid(),

  /** Meta creative ID. */
  metaCreativeId: z.string().min(1).optional(),

  /** Ad Account ID. */
  adAccountId: z.string().min(1),

  /** Creative name. */
  name: z.string().min(1).max(512),

  /** Creative format. */
  format: CreativeFormatSchema,

  /** Primary text (body copy). */
  primaryText: z.string().max(2200).optional(),

  /** Headline. */
  headline: z.string().max(255).optional(),

  /** Description / link description. */
  description: z.string().max(255).optional(),

  /** Call to action. */
  callToAction: CallToActionSchema.optional(),

  /** Destination URL. */
  linkUrl: z.string().url().optional(),

  /** Display link (vanity URL shown in ad). */
  displayLink: z.string().max(256).optional(),

  /** Image URL. */
  imageUrl: z.string().url().optional(),

  /** Image hash (Meta image hash). */
  imageHash: z.string().optional(),

  /** Video URL. */
  videoUrl: z.string().url().optional(),

  /** Video ID (Meta video ID). */
  videoId: z.string().optional(),

  /** Thumbnail URL for video. */
  thumbnailUrl: z.string().url().optional(),

  /** Carousel cards. */
  carouselCards: z
    .array(
      z.object({
        headline: z.string().max(255).optional(),
        description: z.string().max(255).optional(),
        imageUrl: z.string().url().optional(),
        imageHash: z.string().optional(),
        videoUrl: z.string().url().optional(),
        videoId: z.string().optional(),
        linkUrl: z.string().url().optional(),
        callToAction: CallToActionSchema.optional(),
      })
    )
    .optional(),

  /** URL tags for tracking. */
  urlTags: z.string().max(2048).optional(),

  /** Instagram account ID. */
  instagramAccountId: z.string().optional(),

  /** Facebook page ID. */
  pageId: z.string().optional(),

  /** ISO 8601 timestamp of creation. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last update. */
  updatedAt: z.string().datetime(),
});

export type AdCreative = z.infer<typeof AdCreativeSchema>;

// ---------------------------------------------------------------------------
// Ad
// ---------------------------------------------------------------------------

/**
 * Ad - An individual Meta ad within an ad set.
 */
export const AdSchema = z.object({
  /** Unique ad identifier (UUID v4). */
  id: z.string().uuid(),

  /** Meta ad ID. */
  metaAdId: z.string().min(1),

  /** Parent ad set ID (ACD UUID). */
  adSetId: z.string().uuid(),

  /** Meta ad set ID. */
  metaAdSetId: z.string().min(1),

  /** Parent campaign ID (ACD UUID). */
  campaignId: z.string().uuid(),

  /** Ad Account ID. */
  adAccountId: z.string().min(1),

  /** Ad name. */
  name: z.string().min(1).max(512),

  /** Ad status. */
  status: CampaignStatusSchema.default("PAUSED"),

  /** Effective status. */
  effectiveStatus: z.string().optional(),

  /** Creative ID (ACD UUID). */
  creativeId: z.string().uuid(),

  /** Meta creative ID. */
  metaCreativeId: z.string().optional(),

  /** Tracking specs. */
  trackingSpecs: z.record(z.string(), z.unknown()).optional(),

  /** Conversion tracking Pixel ID. */
  pixelId: z.string().optional(),

  /** ISO 8601 timestamp of creation. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last update. */
  updatedAt: z.string().datetime(),
});

export type Ad = z.infer<typeof AdSchema>;

// ---------------------------------------------------------------------------
// Insight (Reporting)
// ---------------------------------------------------------------------------

/**
 * Insight - Performance metrics for a campaign, ad set, or ad.
 */
export const InsightSchema = z.object({
  /** Unique insight record identifier (UUID v4). */
  id: z.string().uuid(),

  /** The entity this insight belongs to. */
  entityId: z.string().min(1),

  /** Entity type. */
  entityType: z.enum(["campaign", "adset", "ad", "account"]),

  /** Ad Account ID. */
  adAccountId: z.string().min(1),

  /** Date range start (YYYY-MM-DD). */
  dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  /** Date range end (YYYY-MM-DD). */
  dateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  /** Number of impressions. */
  impressions: z.number().int().nonnegative().default(0),

  /** Reach (unique people). */
  reach: z.number().int().nonnegative().default(0),

  /** Frequency (avg impressions per person). */
  frequency: z.number().nonnegative().default(0),

  /** Number of link clicks. */
  clicks: z.number().int().nonnegative().default(0),

  /** Unique link clicks. */
  uniqueClicks: z.number().int().nonnegative().default(0),

  /** Click-through rate (%). */
  ctr: z.number().nonnegative().default(0),

  /** Cost per click in cents. */
  cpcCents: z.number().nonnegative().default(0),

  /** Cost per mille (1000 impressions) in cents. */
  cpmCents: z.number().nonnegative().default(0),

  /** Total spend in cents. */
  spendCents: z.number().int().nonnegative().default(0),

  /** Number of conversions. */
  conversions: z.number().int().nonnegative().default(0),

  /** Conversion value in cents. */
  conversionValueCents: z.number().int().nonnegative().default(0),

  /** Cost per conversion in cents. */
  costPerConversionCents: z.number().nonnegative().default(0),

  /** Return on ad spend. */
  roas: z.number().nonnegative().default(0),

  /** Video views (3-second). */
  videoViews: z.number().int().nonnegative().optional(),

  /** ThruPlay (15-second or complete views). */
  thruplay: z.number().int().nonnegative().optional(),

  /** Video average watch time in seconds. */
  videoAvgWatchTimeSec: z.number().nonnegative().optional(),

  /** Leads generated. */
  leads: z.number().int().nonnegative().optional(),

  /** Cost per lead in cents. */
  costPerLeadCents: z.number().nonnegative().optional(),

  /** Post engagement (reactions, comments, shares). */
  postEngagement: z.number().int().nonnegative().optional(),

  /** Page likes. */
  pageLikes: z.number().int().nonnegative().optional(),

  /** Breakdown dimensions. */
  breakdowns: z.record(z.string(), z.string()).optional(),

  /** ISO 8601 timestamp of when this insight was fetched. */
  fetchedAt: z.string().datetime(),

  /** ISO 8601 timestamp of creation. */
  createdAt: z.string().datetime(),
});

export type Insight = z.infer<typeof InsightSchema>;

// ---------------------------------------------------------------------------
// Pixel Event
// ---------------------------------------------------------------------------

/**
 * Standard Meta Pixel events.
 */
export const StandardPixelEventSchema = z.enum([
  "PageView",
  "ViewContent",
  "Search",
  "AddToCart",
  "AddToWishlist",
  "InitiateCheckout",
  "AddPaymentInfo",
  "Purchase",
  "Lead",
  "CompleteRegistration",
  "Contact",
  "CustomizeProduct",
  "Donate",
  "FindLocation",
  "Schedule",
  "StartTrial",
  "SubmitApplication",
  "Subscribe",
]);
export type StandardPixelEvent = z.infer<typeof StandardPixelEventSchema>;

/**
 * PixelEvent - A Meta Pixel event tracked in the browser.
 */
export const PixelEventSchema = z.object({
  /** Unique event identifier (UUID v4). */
  id: z.string().uuid(),

  /** Meta Pixel ID. */
  pixelId: z.string().min(1),

  /** Event name (standard or custom). */
  eventName: z.string().min(1).max(256),

  /** Whether this is a standard event. */
  isStandard: z.boolean().default(false),

  /** Event parameters. */
  parameters: z
    .object({
      value: z.number().optional(),
      currency: z.string().length(3).optional(),
      contentName: z.string().optional(),
      contentCategory: z.string().optional(),
      contentIds: z.array(z.string()).optional(),
      contentType: z.string().optional(),
      numItems: z.number().int().optional(),
      searchString: z.string().optional(),
      status: z.string().optional(),
    })
    .passthrough()
    .optional(),

  /** User data for advanced matching. */
  userData: z
    .object({
      em: z.string().optional(), // Hashed email
      ph: z.string().optional(), // Hashed phone
      fn: z.string().optional(), // Hashed first name
      ln: z.string().optional(), // Hashed last name
      ge: z.string().optional(), // Gender
      db: z.string().optional(), // Date of birth
      ct: z.string().optional(), // City
      st: z.string().optional(), // State
      zp: z.string().optional(), // Zip
      country: z.string().optional(), // Country
      externalId: z.string().optional(), // External ID
      fbp: z.string().optional(), // Facebook browser pixel cookie
      fbc: z.string().optional(), // Facebook click ID cookie
    })
    .optional(),

  /** Page URL where event fired. */
  sourceUrl: z.string().url().optional(),

  /** Event source (browser, server, app). */
  eventSource: z.enum(["website", "app", "physical_store", "system_generated", "other"]).default("website"),

  /** ISO 8601 timestamp of when the event occurred. */
  eventTime: z.string().datetime(),

  /** ISO 8601 timestamp of creation in ACD. */
  createdAt: z.string().datetime(),
});

export type PixelEvent = z.infer<typeof PixelEventSchema>;

// ---------------------------------------------------------------------------
// CAPI Event (Conversions API / Server-Side)
// ---------------------------------------------------------------------------

/**
 * CAPI action source.
 */
export const CAPIActionSourceSchema = z.enum([
  "website",
  "app",
  "phone_call",
  "chat",
  "email",
  "physical_store",
  "system_generated",
  "other",
]);
export type CAPIActionSource = z.infer<typeof CAPIActionSourceSchema>;

/**
 * CAPIEvent - A server-side Conversions API event sent to Meta.
 */
export const CAPIEventSchema = z.object({
  /** Unique event identifier (UUID v4). */
  id: z.string().uuid(),

  /** Meta Pixel ID / dataset ID. */
  pixelId: z.string().min(1),

  /** Event name (standard or custom). */
  eventName: z.string().min(1).max(256),

  /** Unix timestamp of the event. */
  eventTime: z.number().int().positive(),

  /** ISO 8601 timestamp of the event. */
  eventTimeIso: z.string().datetime(),

  /** Action source. */
  actionSource: CAPIActionSourceSchema,

  /** Event source URL. */
  eventSourceUrl: z.string().url().optional(),

  /** Event ID for deduplication with browser pixel. */
  eventId: z.string().max(256).optional(),

  /** Whether this event has been deduplicated. */
  deduplicated: z.boolean().default(false),

  /** User data for matching. */
  userData: z.object({
    /** Hashed emails. */
    em: z.array(z.string()).optional(),

    /** Hashed phone numbers. */
    ph: z.array(z.string()).optional(),

    /** Hashed first name. */
    fn: z.array(z.string()).optional(),

    /** Hashed last name. */
    ln: z.array(z.string()).optional(),

    /** Hashed date of birth. */
    db: z.array(z.string()).optional(),

    /** Gender. */
    ge: z.array(z.string()).optional(),

    /** Hashed city. */
    ct: z.array(z.string()).optional(),

    /** Hashed state. */
    st: z.array(z.string()).optional(),

    /** Hashed zip code. */
    zp: z.array(z.string()).optional(),

    /** Country code. */
    country: z.array(z.string()).optional(),

    /** External ID. */
    externalId: z.array(z.string()).optional(),

    /** Client IP address. */
    clientIpAddress: z.string().ip().optional(),

    /** Client user agent. */
    clientUserAgent: z.string().max(2048).optional(),

    /** Facebook click ID. */
    fbc: z.string().optional(),

    /** Facebook browser ID. */
    fbp: z.string().optional(),

    /** Subscription ID. */
    subscriptionId: z.string().optional(),

    /** Lead ID. */
    leadId: z.string().optional(),
  }),

  /** Custom data / event parameters. */
  customData: z
    .object({
      value: z.number().optional(),
      currency: z.string().length(3).optional(),
      contentName: z.string().optional(),
      contentCategory: z.string().optional(),
      contentIds: z.array(z.string()).optional(),
      contentType: z.string().optional(),
      contents: z
        .array(
          z.object({
            id: z.string(),
            quantity: z.number().int().positive(),
            itemPrice: z.number().optional(),
            deliveryCategory: z.string().optional(),
          })
        )
        .optional(),
      numItems: z.number().int().optional(),
      orderId: z.string().optional(),
      searchString: z.string().optional(),
      status: z.string().optional(),
      predictedLtv: z.number().optional(),
    })
    .passthrough()
    .optional(),

  /** Data processing options. */
  dataProcessingOptions: z.array(z.string()).optional(),

  /** Data processing options country. */
  dataProcessingOptionsCountry: z.number().int().optional(),

  /** Data processing options state. */
  dataProcessingOptionsState: z.number().int().optional(),

  /** Whether this event was successfully sent to Meta. */
  sentToMeta: z.boolean().default(false),

  /** Meta API response (for debugging). */
  metaResponse: z.record(z.string(), z.unknown()).optional(),

  /** Number of send attempts. */
  sendAttempts: z.number().int().nonnegative().default(0),

  /** ISO 8601 timestamp of creation. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last update. */
  updatedAt: z.string().datetime(),
});

export type CAPIEvent = z.infer<typeof CAPIEventSchema>;
