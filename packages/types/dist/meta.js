"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAPIEventSchema = exports.CAPIActionSourceSchema = exports.PixelEventSchema = exports.StandardPixelEventSchema = exports.InsightSchema = exports.AdSchema = exports.AdCreativeSchema = exports.CallToActionSchema = exports.CreativeFormatSchema = exports.AdSetSchema = exports.TargetingSchema = exports.BillingEventSchema = exports.OptimizationGoalSchema = exports.CampaignSchema = exports.BudgetTypeSchema = exports.BuyingTypeSchema = exports.CampaignStatusSchema = exports.CampaignObjectiveSchema = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Campaign
// ---------------------------------------------------------------------------
/**
 * Campaign objective (Meta Marketing API objectives).
 */
exports.CampaignObjectiveSchema = zod_1.z.enum([
    "OUTCOME_AWARENESS",
    "OUTCOME_ENGAGEMENT",
    "OUTCOME_LEADS",
    "OUTCOME_SALES",
    "OUTCOME_TRAFFIC",
    "OUTCOME_APP_PROMOTION",
]);
/**
 * Campaign status.
 */
exports.CampaignStatusSchema = zod_1.z.enum([
    "ACTIVE",
    "PAUSED",
    "DELETED",
    "ARCHIVED",
]);
/**
 * Campaign buying type.
 */
exports.BuyingTypeSchema = zod_1.z.enum(["AUCTION", "RESERVED"]);
/**
 * Budget type.
 */
exports.BudgetTypeSchema = zod_1.z.enum(["DAILY", "LIFETIME"]);
/**
 * Campaign - A Meta advertising campaign.
 */
exports.CampaignSchema = zod_1.z.object({
    /** Unique campaign identifier (UUID v4 in ACD, maps to Meta campaign ID). */
    id: zod_1.z.string().uuid(),
    /** Meta campaign ID. */
    metaCampaignId: zod_1.z.string().min(1),
    /** Meta Ad Account ID. */
    adAccountId: zod_1.z.string().min(1),
    /** Campaign name. */
    name: zod_1.z.string().min(1).max(512),
    /** Campaign objective. */
    objective: exports.CampaignObjectiveSchema,
    /** Campaign status. */
    status: exports.CampaignStatusSchema.default("PAUSED"),
    /** Effective status (computed by Meta). */
    effectiveStatus: zod_1.z.string().optional(),
    /** Buying type. */
    buyingType: exports.BuyingTypeSchema.default("AUCTION"),
    /** Budget type. */
    budgetType: exports.BudgetTypeSchema.optional(),
    /** Daily budget in cents. */
    dailyBudgetCents: zod_1.z.number().int().nonnegative().optional(),
    /** Lifetime budget in cents. */
    lifetimeBudgetCents: zod_1.z.number().int().nonnegative().optional(),
    /** Spend cap in cents. */
    spendCapCents: zod_1.z.number().int().nonnegative().optional(),
    /** Bid strategy. */
    bidStrategy: zod_1.z.enum(["LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_BID_CAP", "COST_CAP", "MINIMUM_ROAS"]).optional(),
    /** Campaign budget optimization enabled. */
    cboEnabled: zod_1.z.boolean().default(false),
    /** Special ad categories. */
    specialAdCategories: zod_1.z.array(zod_1.z.enum(["CREDIT", "EMPLOYMENT", "HOUSING", "SOCIAL_ISSUES_ELECTIONS_POLITICS", "NONE"])).default([]),
    /** ISO 8601 start time. */
    startTime: zod_1.z.string().datetime().optional(),
    /** ISO 8601 end time. */
    endTime: zod_1.z.string().datetime().optional(),
    /** ISO 8601 timestamp of creation. */
    createdAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last update. */
    updatedAt: zod_1.z.string().datetime(),
});
// ---------------------------------------------------------------------------
// Ad Set
// ---------------------------------------------------------------------------
/**
 * Optimization goal for ad delivery.
 */
exports.OptimizationGoalSchema = zod_1.z.enum([
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
/**
 * Billing event.
 */
exports.BillingEventSchema = zod_1.z.enum(["IMPRESSIONS", "LINK_CLICKS", "THRUPLAY"]);
/**
 * Targeting specification (simplified).
 */
exports.TargetingSchema = zod_1.z.object({
    /** Age minimum (13-65). */
    ageMin: zod_1.z.number().int().min(13).max(65).optional(),
    /** Age maximum (13-65). */
    ageMax: zod_1.z.number().int().min(13).max(65).optional(),
    /** Genders (1=male, 2=female). */
    genders: zod_1.z.array(zod_1.z.number().int().min(1).max(2)).optional(),
    /** Geographic locations. */
    geoLocations: zod_1.z
        .object({
        countries: zod_1.z.array(zod_1.z.string().length(2)).optional(),
        regions: zod_1.z.array(zod_1.z.object({ key: zod_1.z.string() })).optional(),
        cities: zod_1.z.array(zod_1.z.object({ key: zod_1.z.string(), radius: zod_1.z.number().optional(), distanceUnit: zod_1.z.string().optional() })).optional(),
        zips: zod_1.z.array(zod_1.z.object({ key: zod_1.z.string() })).optional(),
    })
        .optional(),
    /** Excluded geographic locations. */
    excludedGeoLocations: zod_1.z
        .object({
        countries: zod_1.z.array(zod_1.z.string().length(2)).optional(),
        regions: zod_1.z.array(zod_1.z.object({ key: zod_1.z.string() })).optional(),
    })
        .optional(),
    /** Locales (language targeting). */
    locales: zod_1.z.array(zod_1.z.number().int()).optional(),
    /** Interest targeting. */
    interests: zod_1.z.array(zod_1.z.object({ id: zod_1.z.string(), name: zod_1.z.string() })).optional(),
    /** Behavior targeting. */
    behaviors: zod_1.z.array(zod_1.z.object({ id: zod_1.z.string(), name: zod_1.z.string() })).optional(),
    /** Custom audiences (IDs). */
    customAudiences: zod_1.z.array(zod_1.z.object({ id: zod_1.z.string() })).optional(),
    /** Excluded custom audiences. */
    excludedCustomAudiences: zod_1.z.array(zod_1.z.object({ id: zod_1.z.string() })).optional(),
    /** Lookalike audiences. */
    lookalikeAudiences: zod_1.z.array(zod_1.z.object({ id: zod_1.z.string() })).optional(),
    /** Publisher platforms. */
    publisherPlatforms: zod_1.z.array(zod_1.z.enum(["facebook", "instagram", "audience_network", "messenger"])).optional(),
    /** Facebook positions. */
    facebookPositions: zod_1.z.array(zod_1.z.string()).optional(),
    /** Instagram positions. */
    instagramPositions: zod_1.z.array(zod_1.z.string()).optional(),
    /** Device platforms. */
    devicePlatforms: zod_1.z.array(zod_1.z.enum(["mobile", "desktop"])).optional(),
});
/**
 * AdSet - A Meta ad set within a campaign.
 */
exports.AdSetSchema = zod_1.z.object({
    /** Unique ad set identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** Meta ad set ID. */
    metaAdSetId: zod_1.z.string().min(1),
    /** Parent campaign ID (ACD UUID). */
    campaignId: zod_1.z.string().uuid(),
    /** Meta campaign ID. */
    metaCampaignId: zod_1.z.string().min(1),
    /** Ad Account ID. */
    adAccountId: zod_1.z.string().min(1),
    /** Ad set name. */
    name: zod_1.z.string().min(1).max(512),
    /** Ad set status. */
    status: exports.CampaignStatusSchema.default("PAUSED"),
    /** Effective status. */
    effectiveStatus: zod_1.z.string().optional(),
    /** Optimization goal. */
    optimizationGoal: exports.OptimizationGoalSchema,
    /** Billing event. */
    billingEvent: exports.BillingEventSchema.default("IMPRESSIONS"),
    /** Daily budget in cents. */
    dailyBudgetCents: zod_1.z.number().int().nonnegative().optional(),
    /** Lifetime budget in cents. */
    lifetimeBudgetCents: zod_1.z.number().int().nonnegative().optional(),
    /** Bid amount in cents. */
    bidAmountCents: zod_1.z.number().int().nonnegative().optional(),
    /** Targeting specification. */
    targeting: exports.TargetingSchema.optional(),
    /** Conversion event (pixel event name). */
    conversionEvent: zod_1.z.string().max(256).optional(),
    /** Meta Pixel ID for conversion tracking. */
    pixelId: zod_1.z.string().optional(),
    /** Attribution window. */
    attributionSpec: zod_1.z
        .array(zod_1.z.object({
        eventType: zod_1.z.string(),
        window: zod_1.z.string(),
    }))
        .optional(),
    /** Schedule start time (ISO 8601). */
    startTime: zod_1.z.string().datetime().optional(),
    /** Schedule end time (ISO 8601). */
    endTime: zod_1.z.string().datetime().optional(),
    /** ISO 8601 timestamp of creation. */
    createdAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last update. */
    updatedAt: zod_1.z.string().datetime(),
});
// ---------------------------------------------------------------------------
// Ad Creative
// ---------------------------------------------------------------------------
/**
 * Creative format.
 */
exports.CreativeFormatSchema = zod_1.z.enum([
    "SINGLE_IMAGE",
    "SINGLE_VIDEO",
    "CAROUSEL",
    "COLLECTION",
    "INSTANT_EXPERIENCE",
    "DYNAMIC",
]);
/**
 * Call to action type.
 */
exports.CallToActionSchema = zod_1.z.enum([
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
/**
 * AdCreative - Creative content for an ad.
 */
exports.AdCreativeSchema = zod_1.z.object({
    /** Unique creative identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** Meta creative ID. */
    metaCreativeId: zod_1.z.string().min(1).optional(),
    /** Ad Account ID. */
    adAccountId: zod_1.z.string().min(1),
    /** Creative name. */
    name: zod_1.z.string().min(1).max(512),
    /** Creative format. */
    format: exports.CreativeFormatSchema,
    /** Primary text (body copy). */
    primaryText: zod_1.z.string().max(2200).optional(),
    /** Headline. */
    headline: zod_1.z.string().max(255).optional(),
    /** Description / link description. */
    description: zod_1.z.string().max(255).optional(),
    /** Call to action. */
    callToAction: exports.CallToActionSchema.optional(),
    /** Destination URL. */
    linkUrl: zod_1.z.string().url().optional(),
    /** Display link (vanity URL shown in ad). */
    displayLink: zod_1.z.string().max(256).optional(),
    /** Image URL. */
    imageUrl: zod_1.z.string().url().optional(),
    /** Image hash (Meta image hash). */
    imageHash: zod_1.z.string().optional(),
    /** Video URL. */
    videoUrl: zod_1.z.string().url().optional(),
    /** Video ID (Meta video ID). */
    videoId: zod_1.z.string().optional(),
    /** Thumbnail URL for video. */
    thumbnailUrl: zod_1.z.string().url().optional(),
    /** Carousel cards. */
    carouselCards: zod_1.z
        .array(zod_1.z.object({
        headline: zod_1.z.string().max(255).optional(),
        description: zod_1.z.string().max(255).optional(),
        imageUrl: zod_1.z.string().url().optional(),
        imageHash: zod_1.z.string().optional(),
        videoUrl: zod_1.z.string().url().optional(),
        videoId: zod_1.z.string().optional(),
        linkUrl: zod_1.z.string().url().optional(),
        callToAction: exports.CallToActionSchema.optional(),
    }))
        .optional(),
    /** URL tags for tracking. */
    urlTags: zod_1.z.string().max(2048).optional(),
    /** Instagram account ID. */
    instagramAccountId: zod_1.z.string().optional(),
    /** Facebook page ID. */
    pageId: zod_1.z.string().optional(),
    /** ISO 8601 timestamp of creation. */
    createdAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last update. */
    updatedAt: zod_1.z.string().datetime(),
});
// ---------------------------------------------------------------------------
// Ad
// ---------------------------------------------------------------------------
/**
 * Ad - An individual Meta ad within an ad set.
 */
exports.AdSchema = zod_1.z.object({
    /** Unique ad identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** Meta ad ID. */
    metaAdId: zod_1.z.string().min(1),
    /** Parent ad set ID (ACD UUID). */
    adSetId: zod_1.z.string().uuid(),
    /** Meta ad set ID. */
    metaAdSetId: zod_1.z.string().min(1),
    /** Parent campaign ID (ACD UUID). */
    campaignId: zod_1.z.string().uuid(),
    /** Ad Account ID. */
    adAccountId: zod_1.z.string().min(1),
    /** Ad name. */
    name: zod_1.z.string().min(1).max(512),
    /** Ad status. */
    status: exports.CampaignStatusSchema.default("PAUSED"),
    /** Effective status. */
    effectiveStatus: zod_1.z.string().optional(),
    /** Creative ID (ACD UUID). */
    creativeId: zod_1.z.string().uuid(),
    /** Meta creative ID. */
    metaCreativeId: zod_1.z.string().optional(),
    /** Tracking specs. */
    trackingSpecs: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    /** Conversion tracking Pixel ID. */
    pixelId: zod_1.z.string().optional(),
    /** ISO 8601 timestamp of creation. */
    createdAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last update. */
    updatedAt: zod_1.z.string().datetime(),
});
// ---------------------------------------------------------------------------
// Insight (Reporting)
// ---------------------------------------------------------------------------
/**
 * Insight - Performance metrics for a campaign, ad set, or ad.
 */
exports.InsightSchema = zod_1.z.object({
    /** Unique insight record identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** The entity this insight belongs to. */
    entityId: zod_1.z.string().min(1),
    /** Entity type. */
    entityType: zod_1.z.enum(["campaign", "adset", "ad", "account"]),
    /** Ad Account ID. */
    adAccountId: zod_1.z.string().min(1),
    /** Date range start (YYYY-MM-DD). */
    dateStart: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Date range end (YYYY-MM-DD). */
    dateEnd: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Number of impressions. */
    impressions: zod_1.z.number().int().nonnegative().default(0),
    /** Reach (unique people). */
    reach: zod_1.z.number().int().nonnegative().default(0),
    /** Frequency (avg impressions per person). */
    frequency: zod_1.z.number().nonnegative().default(0),
    /** Number of link clicks. */
    clicks: zod_1.z.number().int().nonnegative().default(0),
    /** Unique link clicks. */
    uniqueClicks: zod_1.z.number().int().nonnegative().default(0),
    /** Click-through rate (%). */
    ctr: zod_1.z.number().nonnegative().default(0),
    /** Cost per click in cents. */
    cpcCents: zod_1.z.number().nonnegative().default(0),
    /** Cost per mille (1000 impressions) in cents. */
    cpmCents: zod_1.z.number().nonnegative().default(0),
    /** Total spend in cents. */
    spendCents: zod_1.z.number().int().nonnegative().default(0),
    /** Number of conversions. */
    conversions: zod_1.z.number().int().nonnegative().default(0),
    /** Conversion value in cents. */
    conversionValueCents: zod_1.z.number().int().nonnegative().default(0),
    /** Cost per conversion in cents. */
    costPerConversionCents: zod_1.z.number().nonnegative().default(0),
    /** Return on ad spend. */
    roas: zod_1.z.number().nonnegative().default(0),
    /** Video views (3-second). */
    videoViews: zod_1.z.number().int().nonnegative().optional(),
    /** ThruPlay (15-second or complete views). */
    thruplay: zod_1.z.number().int().nonnegative().optional(),
    /** Video average watch time in seconds. */
    videoAvgWatchTimeSec: zod_1.z.number().nonnegative().optional(),
    /** Leads generated. */
    leads: zod_1.z.number().int().nonnegative().optional(),
    /** Cost per lead in cents. */
    costPerLeadCents: zod_1.z.number().nonnegative().optional(),
    /** Post engagement (reactions, comments, shares). */
    postEngagement: zod_1.z.number().int().nonnegative().optional(),
    /** Page likes. */
    pageLikes: zod_1.z.number().int().nonnegative().optional(),
    /** Breakdown dimensions. */
    breakdowns: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    /** ISO 8601 timestamp of when this insight was fetched. */
    fetchedAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of creation. */
    createdAt: zod_1.z.string().datetime(),
});
// ---------------------------------------------------------------------------
// Pixel Event
// ---------------------------------------------------------------------------
/**
 * Standard Meta Pixel events.
 */
exports.StandardPixelEventSchema = zod_1.z.enum([
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
/**
 * PixelEvent - A Meta Pixel event tracked in the browser.
 */
exports.PixelEventSchema = zod_1.z.object({
    /** Unique event identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** Meta Pixel ID. */
    pixelId: zod_1.z.string().min(1),
    /** Event name (standard or custom). */
    eventName: zod_1.z.string().min(1).max(256),
    /** Whether this is a standard event. */
    isStandard: zod_1.z.boolean().default(false),
    /** Event parameters. */
    parameters: zod_1.z
        .object({
        value: zod_1.z.number().optional(),
        currency: zod_1.z.string().length(3).optional(),
        contentName: zod_1.z.string().optional(),
        contentCategory: zod_1.z.string().optional(),
        contentIds: zod_1.z.array(zod_1.z.string()).optional(),
        contentType: zod_1.z.string().optional(),
        numItems: zod_1.z.number().int().optional(),
        searchString: zod_1.z.string().optional(),
        status: zod_1.z.string().optional(),
    })
        .passthrough()
        .optional(),
    /** User data for advanced matching. */
    userData: zod_1.z
        .object({
        em: zod_1.z.string().optional(), // Hashed email
        ph: zod_1.z.string().optional(), // Hashed phone
        fn: zod_1.z.string().optional(), // Hashed first name
        ln: zod_1.z.string().optional(), // Hashed last name
        ge: zod_1.z.string().optional(), // Gender
        db: zod_1.z.string().optional(), // Date of birth
        ct: zod_1.z.string().optional(), // City
        st: zod_1.z.string().optional(), // State
        zp: zod_1.z.string().optional(), // Zip
        country: zod_1.z.string().optional(), // Country
        externalId: zod_1.z.string().optional(), // External ID
        fbp: zod_1.z.string().optional(), // Facebook browser pixel cookie
        fbc: zod_1.z.string().optional(), // Facebook click ID cookie
    })
        .optional(),
    /** Page URL where event fired. */
    sourceUrl: zod_1.z.string().url().optional(),
    /** Event source (browser, server, app). */
    eventSource: zod_1.z.enum(["website", "app", "physical_store", "system_generated", "other"]).default("website"),
    /** ISO 8601 timestamp of when the event occurred. */
    eventTime: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of creation in ACD. */
    createdAt: zod_1.z.string().datetime(),
});
// ---------------------------------------------------------------------------
// CAPI Event (Conversions API / Server-Side)
// ---------------------------------------------------------------------------
/**
 * CAPI action source.
 */
exports.CAPIActionSourceSchema = zod_1.z.enum([
    "website",
    "app",
    "phone_call",
    "chat",
    "email",
    "physical_store",
    "system_generated",
    "other",
]);
/**
 * CAPIEvent - A server-side Conversions API event sent to Meta.
 */
exports.CAPIEventSchema = zod_1.z.object({
    /** Unique event identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** Meta Pixel ID / dataset ID. */
    pixelId: zod_1.z.string().min(1),
    /** Event name (standard or custom). */
    eventName: zod_1.z.string().min(1).max(256),
    /** Unix timestamp of the event. */
    eventTime: zod_1.z.number().int().positive(),
    /** ISO 8601 timestamp of the event. */
    eventTimeIso: zod_1.z.string().datetime(),
    /** Action source. */
    actionSource: exports.CAPIActionSourceSchema,
    /** Event source URL. */
    eventSourceUrl: zod_1.z.string().url().optional(),
    /** Event ID for deduplication with browser pixel. */
    eventId: zod_1.z.string().max(256).optional(),
    /** Whether this event has been deduplicated. */
    deduplicated: zod_1.z.boolean().default(false),
    /** User data for matching. */
    userData: zod_1.z.object({
        /** Hashed emails. */
        em: zod_1.z.array(zod_1.z.string()).optional(),
        /** Hashed phone numbers. */
        ph: zod_1.z.array(zod_1.z.string()).optional(),
        /** Hashed first name. */
        fn: zod_1.z.array(zod_1.z.string()).optional(),
        /** Hashed last name. */
        ln: zod_1.z.array(zod_1.z.string()).optional(),
        /** Hashed date of birth. */
        db: zod_1.z.array(zod_1.z.string()).optional(),
        /** Gender. */
        ge: zod_1.z.array(zod_1.z.string()).optional(),
        /** Hashed city. */
        ct: zod_1.z.array(zod_1.z.string()).optional(),
        /** Hashed state. */
        st: zod_1.z.array(zod_1.z.string()).optional(),
        /** Hashed zip code. */
        zp: zod_1.z.array(zod_1.z.string()).optional(),
        /** Country code. */
        country: zod_1.z.array(zod_1.z.string()).optional(),
        /** External ID. */
        externalId: zod_1.z.array(zod_1.z.string()).optional(),
        /** Client IP address. */
        clientIpAddress: zod_1.z.string().ip().optional(),
        /** Client user agent. */
        clientUserAgent: zod_1.z.string().max(2048).optional(),
        /** Facebook click ID. */
        fbc: zod_1.z.string().optional(),
        /** Facebook browser ID. */
        fbp: zod_1.z.string().optional(),
        /** Subscription ID. */
        subscriptionId: zod_1.z.string().optional(),
        /** Lead ID. */
        leadId: zod_1.z.string().optional(),
    }),
    /** Custom data / event parameters. */
    customData: zod_1.z
        .object({
        value: zod_1.z.number().optional(),
        currency: zod_1.z.string().length(3).optional(),
        contentName: zod_1.z.string().optional(),
        contentCategory: zod_1.z.string().optional(),
        contentIds: zod_1.z.array(zod_1.z.string()).optional(),
        contentType: zod_1.z.string().optional(),
        contents: zod_1.z
            .array(zod_1.z.object({
            id: zod_1.z.string(),
            quantity: zod_1.z.number().int().positive(),
            itemPrice: zod_1.z.number().optional(),
            deliveryCategory: zod_1.z.string().optional(),
        }))
            .optional(),
        numItems: zod_1.z.number().int().optional(),
        orderId: zod_1.z.string().optional(),
        searchString: zod_1.z.string().optional(),
        status: zod_1.z.string().optional(),
        predictedLtv: zod_1.z.number().optional(),
    })
        .passthrough()
        .optional(),
    /** Data processing options. */
    dataProcessingOptions: zod_1.z.array(zod_1.z.string()).optional(),
    /** Data processing options country. */
    dataProcessingOptionsCountry: zod_1.z.number().int().optional(),
    /** Data processing options state. */
    dataProcessingOptionsState: zod_1.z.number().int().optional(),
    /** Whether this event was successfully sent to Meta. */
    sentToMeta: zod_1.z.boolean().default(false),
    /** Meta API response (for debugging). */
    metaResponse: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    /** Number of send attempts. */
    sendAttempts: zod_1.z.number().int().nonnegative().default(0),
    /** ISO 8601 timestamp of creation. */
    createdAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last update. */
    updatedAt: zod_1.z.string().datetime(),
});
//# sourceMappingURL=meta.js.map