"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetLibraryDashboardSchema = exports.AssetLibraryFilterSchema = exports.AssetEntrySchema = exports.UsageRightsSchema = exports.AssetCategorySchema = exports.RenderHistoryDashboardSchema = exports.RenderCostSchema = exports.RenderStatusTrackingSchema = exports.RenderStatusHistoryEntrySchema = exports.RenderJobSchema = exports.RenderStatusSchema = exports.TemplateMarketplaceFilterSchema = exports.RemotionTemplateRatingSchema = exports.RemotionTemplatePricingSchema = exports.RemotionPricingModelSchema = exports.RemotionTemplateListingSchema = exports.RemotionTemplateCategorySchema = void 0;
/**
 * INT-REM-001: Remotion Template Marketplace Types
 * INT-REM-002: Remotion Render History Types
 * INT-REM-003: Remotion Asset Library Types
 *
 * Type definitions and Zod schemas for Remotion product integrations
 * covering the template marketplace, render history, and asset library.
 */
const zod_1 = require("zod");
// ===========================================================================
// INT-REM-001: Remotion Template Marketplace Types
// ===========================================================================
// ---------------------------------------------------------------------------
// Template Categories
// ---------------------------------------------------------------------------
exports.RemotionTemplateCategorySchema = zod_1.z.enum([
    "social_media",
    "ads",
    "presentations",
    "intros_outros",
    "lower_thirds",
    "transitions",
    "text_animations",
    "infographics",
    "product_demos",
    "testimonials",
    "music_visualizers",
    "explainer",
    "custom",
]);
// ---------------------------------------------------------------------------
// Template Listing
// ---------------------------------------------------------------------------
exports.RemotionTemplateListingSchema = zod_1.z.object({
    /** Template identifier */
    id: zod_1.z.string(),
    /** Template name */
    name: zod_1.z.string(),
    /** Template description */
    description: zod_1.z.string(),
    /** Short description (for cards) */
    shortDescription: zod_1.z.string().max(160).optional(),
    /** Category */
    category: exports.RemotionTemplateCategorySchema,
    /** Tags */
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    /** Author / creator identifier */
    authorId: zod_1.z.string(),
    /** Author display name */
    authorName: zod_1.z.string(),
    /** Author avatar URL */
    authorAvatar: zod_1.z.string().url().optional(),
    /** Whether author is verified */
    authorVerified: zod_1.z.boolean().default(false),
    /** Preview thumbnail URL */
    thumbnailUrl: zod_1.z.string().url(),
    /** Preview video URL */
    previewVideoUrl: zod_1.z.string().url().optional(),
    /** Additional preview images */
    previewImages: zod_1.z.array(zod_1.z.string().url()).default([]),
    /** Template version */
    version: zod_1.z.string().default("1.0.0"),
    /** Aspect ratios supported */
    aspectRatios: zod_1.z.array(zod_1.z.enum(["16:9", "9:16", "1:1", "4:5", "4:3"])).default(["16:9"]),
    /** Default duration (seconds) */
    defaultDuration: zod_1.z.number().positive(),
    /** Minimum duration (seconds) */
    minDuration: zod_1.z.number().positive().optional(),
    /** Maximum duration (seconds) */
    maxDuration: zod_1.z.number().positive().optional(),
    /** Default FPS */
    fps: zod_1.z.number().int().positive().default(30),
    /** Customizable properties count */
    customizableProperties: zod_1.z.number().int().nonnegative(),
    /** Required input types */
    requiredInputs: zod_1.z.array(zod_1.z.enum(["text", "image", "video", "audio", "color", "logo"])).default([]),
    /** Created timestamp */
    createdAt: zod_1.z.string().datetime(),
    /** Updated timestamp */
    updatedAt: zod_1.z.string().datetime(),
}).strict();
// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------
exports.RemotionPricingModelSchema = zod_1.z.enum(["free", "one_time", "subscription", "per_render"]);
exports.RemotionTemplatePricingSchema = zod_1.z.object({
    /** Template identifier */
    templateId: zod_1.z.string(),
    /** Pricing model */
    model: exports.RemotionPricingModelSchema,
    /** Price amount (0 for free) */
    price: zod_1.z.number().nonnegative().default(0),
    /** Currency code */
    currency: zod_1.z.string().default("USD"),
    /** Subscription billing period (if subscription) */
    billingPeriod: zod_1.z.enum(["monthly", "yearly"]).optional(),
    /** Per-render price (if per_render) */
    perRenderPrice: zod_1.z.number().nonnegative().optional(),
    /** Volume discount tiers (if per_render) */
    volumeDiscounts: zod_1.z.array(zod_1.z.object({
        minRenders: zod_1.z.number().int().positive(),
        pricePerRender: zod_1.z.number().nonnegative(),
    })).optional(),
    /** Free trial renders (if paid) */
    freeTrialRenders: zod_1.z.number().int().nonnegative().default(0),
    /** License type */
    licenseType: zod_1.z.enum(["personal", "commercial", "extended"]).default("commercial"),
    /** Whether resale is permitted */
    resalePermitted: zod_1.z.boolean().default(false),
}).strict();
// ---------------------------------------------------------------------------
// Rating
// ---------------------------------------------------------------------------
exports.RemotionTemplateRatingSchema = zod_1.z.object({
    /** Template identifier */
    templateId: zod_1.z.string(),
    /** Average rating (0-5) */
    averageRating: zod_1.z.number().min(0).max(5),
    /** Total number of ratings */
    totalRatings: zod_1.z.number().int().nonnegative(),
    /** Rating distribution */
    distribution: zod_1.z.object({
        1: zod_1.z.number().int().nonnegative(),
        2: zod_1.z.number().int().nonnegative(),
        3: zod_1.z.number().int().nonnegative(),
        4: zod_1.z.number().int().nonnegative(),
        5: zod_1.z.number().int().nonnegative(),
    }),
    /** Total downloads / uses */
    totalDownloads: zod_1.z.number().int().nonnegative(),
    /** Total renders using this template */
    totalRenders: zod_1.z.number().int().nonnegative(),
    /** Recent reviews */
    recentReviews: zod_1.z.array(zod_1.z.object({
        reviewerName: zod_1.z.string(),
        rating: zod_1.z.number().min(1).max(5),
        comment: zod_1.z.string().optional(),
        createdAt: zod_1.z.string().datetime(),
    })).default([]),
}).strict();
// ---------------------------------------------------------------------------
// Template Marketplace Search/Filter
// ---------------------------------------------------------------------------
exports.TemplateMarketplaceFilterSchema = zod_1.z.object({
    /** Search query */
    query: zod_1.z.string().optional(),
    /** Category filter */
    categories: zod_1.z.array(exports.RemotionTemplateCategorySchema).optional(),
    /** Tag filter */
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    /** Pricing model filter */
    pricingModels: zod_1.z.array(exports.RemotionPricingModelSchema).optional(),
    /** Max price */
    maxPrice: zod_1.z.number().nonnegative().optional(),
    /** Min rating */
    minRating: zod_1.z.number().min(0).max(5).optional(),
    /** Aspect ratio filter */
    aspectRatios: zod_1.z.array(zod_1.z.string()).optional(),
    /** Sort by */
    sortBy: zod_1.z.enum(["relevance", "newest", "popular", "rating", "price_low", "price_high"]).default("relevance"),
    /** Pagination */
    page: zod_1.z.number().int().positive().default(1),
    pageSize: zod_1.z.number().int().positive().default(24),
}).strict();
// ===========================================================================
// INT-REM-002: Remotion Render History Types
// ===========================================================================
// ---------------------------------------------------------------------------
// Render Job Schema
// ---------------------------------------------------------------------------
exports.RenderStatusSchema = zod_1.z.enum([
    "queued",
    "rendering",
    "compositing",
    "encoding",
    "uploading",
    "completed",
    "failed",
    "cancelled",
]);
exports.RenderJobSchema = zod_1.z.object({
    /** Render job identifier */
    id: zod_1.z.string(),
    /** Template identifier used */
    templateId: zod_1.z.string(),
    /** Template name */
    templateName: zod_1.z.string(),
    /** User / project identifier */
    userId: zod_1.z.string(),
    /** Project identifier */
    projectId: zod_1.z.string().optional(),
    /** Render status */
    status: exports.RenderStatusSchema,
    /** Progress (0-100) */
    progress: zod_1.z.number().min(0).max(100).default(0),
    /** Current render step description */
    currentStep: zod_1.z.string().optional(),
    /** Output configuration */
    outputConfig: zod_1.z.object({
        /** Output format */
        format: zod_1.z.enum(["mp4", "webm", "gif", "png_sequence", "mov"]),
        /** Output resolution */
        width: zod_1.z.number().int().positive(),
        height: zod_1.z.number().int().positive(),
        /** Frame rate */
        fps: zod_1.z.number().int().positive().default(30),
        /** Quality (1-100) */
        quality: zod_1.z.number().int().min(1).max(100).default(80),
        /** Codec */
        codec: zod_1.z.enum(["h264", "h265", "vp8", "vp9", "prores", "gif"]).optional(),
        /** Duration (seconds) */
        duration: zod_1.z.number().positive(),
    }),
    /** Input parameters used */
    inputParams: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    /** Output file URL (when completed) */
    outputUrl: zod_1.z.string().url().optional(),
    /** Output file size (bytes) */
    outputSizeBytes: zod_1.z.number().int().nonnegative().optional(),
    /** Render start timestamp */
    startedAt: zod_1.z.string().datetime().optional(),
    /** Render completion timestamp */
    completedAt: zod_1.z.string().datetime().optional(),
    /** Render duration (ms) */
    renderDurationMs: zod_1.z.number().int().nonnegative().optional(),
    /** Error message (if failed) */
    errorMessage: zod_1.z.string().optional(),
    /** Error code */
    errorCode: zod_1.z.string().optional(),
    /** Retry count */
    retryCount: zod_1.z.number().int().nonnegative().default(0),
    /** Max retries */
    maxRetries: zod_1.z.number().int().nonnegative().default(3),
    /** Created timestamp */
    createdAt: zod_1.z.string().datetime(),
    /** Lambda function used */
    lambdaFunction: zod_1.z.string().optional(),
    /** AWS region used */
    region: zod_1.z.string().optional(),
}).strict();
// ---------------------------------------------------------------------------
// Status Tracking
// ---------------------------------------------------------------------------
exports.RenderStatusHistoryEntrySchema = zod_1.z.object({
    /** Status */
    status: exports.RenderStatusSchema,
    /** Timestamp */
    timestamp: zod_1.z.string().datetime(),
    /** Progress at this point */
    progress: zod_1.z.number().min(0).max(100),
    /** Additional details */
    details: zod_1.z.string().optional(),
}).strict();
exports.RenderStatusTrackingSchema = zod_1.z.object({
    /** Render job identifier */
    jobId: zod_1.z.string(),
    /** Current status */
    currentStatus: exports.RenderStatusSchema,
    /** Status history */
    history: zod_1.z.array(exports.RenderStatusHistoryEntrySchema),
    /** Estimated time remaining (ms) */
    estimatedTimeRemainingMs: zod_1.z.number().int().nonnegative().optional(),
    /** Current progress */
    progress: zod_1.z.number().min(0).max(100),
}).strict();
// ---------------------------------------------------------------------------
// Cost Per Render
// ---------------------------------------------------------------------------
exports.RenderCostSchema = zod_1.z.object({
    /** Render job identifier */
    jobId: zod_1.z.string(),
    /** Template cost (if paid template) */
    templateCost: zod_1.z.number().nonnegative().default(0),
    /** Compute cost (Lambda / server) */
    computeCost: zod_1.z.number().nonnegative(),
    /** Storage cost */
    storageCost: zod_1.z.number().nonnegative().default(0),
    /** Bandwidth / transfer cost */
    transferCost: zod_1.z.number().nonnegative().default(0),
    /** Total cost */
    totalCost: zod_1.z.number().nonnegative(),
    /** Currency */
    currency: zod_1.z.string().default("USD"),
    /** Compute duration billed (ms) */
    billedDurationMs: zod_1.z.number().int().nonnegative(),
    /** Memory allocated (MB) */
    memoryAllocatedMb: zod_1.z.number().int().positive(),
    /** Whether this was covered by plan / credits */
    coveredByPlan: zod_1.z.boolean().default(false),
    /** Credits used */
    creditsUsed: zod_1.z.number().nonnegative().default(0),
}).strict();
// ---------------------------------------------------------------------------
// Render History Dashboard
// ---------------------------------------------------------------------------
exports.RenderHistoryDashboardSchema = zod_1.z.object({
    /** Render jobs (paginated) */
    jobs: zod_1.z.array(exports.RenderJobSchema),
    /** Pagination */
    pagination: zod_1.z.object({
        page: zod_1.z.number().int().positive(),
        pageSize: zod_1.z.number().int().positive(),
        totalJobs: zod_1.z.number().int().nonnegative(),
        totalPages: zod_1.z.number().int().nonnegative(),
    }),
    /** Summary stats */
    summary: zod_1.z.object({
        totalRenders: zod_1.z.number().int().nonnegative(),
        completedRenders: zod_1.z.number().int().nonnegative(),
        failedRenders: zod_1.z.number().int().nonnegative(),
        avgRenderDurationMs: zod_1.z.number().nonnegative(),
        totalCost: zod_1.z.number().nonnegative(),
        avgCostPerRender: zod_1.z.number().nonnegative(),
        mostUsedTemplate: zod_1.z.string().optional(),
    }),
    /** Cost breakdown for period */
    costBreakdown: zod_1.z.object({
        compute: zod_1.z.number().nonnegative(),
        storage: zod_1.z.number().nonnegative(),
        transfer: zod_1.z.number().nonnegative(),
        templates: zod_1.z.number().nonnegative(),
        total: zod_1.z.number().nonnegative(),
    }),
    /** Filter/sort applied */
    filters: zod_1.z.object({
        status: zod_1.z.array(exports.RenderStatusSchema).optional(),
        templateId: zod_1.z.string().optional(),
        dateFrom: zod_1.z.string().datetime().optional(),
        dateTo: zod_1.z.string().datetime().optional(),
        sortBy: zod_1.z.enum(["newest", "oldest", "cost", "duration"]).default("newest"),
    }).optional(),
}).strict();
// ===========================================================================
// INT-REM-003: Remotion Asset Library Types
// ===========================================================================
// ---------------------------------------------------------------------------
// Asset Categories
// ---------------------------------------------------------------------------
exports.AssetCategorySchema = zod_1.z.enum([
    "images",
    "videos",
    "audio",
    "fonts",
    "lottie_animations",
    "3d_models",
    "icons",
    "backgrounds",
    "overlays",
    "transitions",
    "color_palettes",
    "brand_kits",
]);
// ---------------------------------------------------------------------------
// Usage Rights
// ---------------------------------------------------------------------------
exports.UsageRightsSchema = zod_1.z.object({
    /** License type */
    license: zod_1.z.enum([
        "royalty_free",
        "editorial",
        "creative_commons",
        "proprietary",
        "public_domain",
        "custom",
    ]),
    /** Creative Commons variant (if applicable) */
    ccVariant: zod_1.z.enum(["CC0", "CC-BY", "CC-BY-SA", "CC-BY-NC", "CC-BY-NC-SA", "CC-BY-ND", "CC-BY-NC-ND"]).optional(),
    /** Allow commercial use */
    commercialUse: zod_1.z.boolean(),
    /** Allow modification */
    allowModification: zod_1.z.boolean(),
    /** Require attribution */
    requireAttribution: zod_1.z.boolean(),
    /** Attribution text (if required) */
    attributionText: zod_1.z.string().optional(),
    /** Usage limit (renders, 0 = unlimited) */
    usageLimit: zod_1.z.number().int().nonnegative().default(0),
    /** Geographic restrictions */
    geographicRestrictions: zod_1.z.array(zod_1.z.string()).default([]),
    /** Expiration date (if time-limited) */
    expiresAt: zod_1.z.string().datetime().optional(),
    /** Source / provider */
    source: zod_1.z.string().optional(),
}).strict();
// ---------------------------------------------------------------------------
// Asset Entry
// ---------------------------------------------------------------------------
exports.AssetEntrySchema = zod_1.z.object({
    /** Asset identifier */
    id: zod_1.z.string(),
    /** Asset name */
    name: zod_1.z.string(),
    /** Asset description */
    description: zod_1.z.string().optional(),
    /** Category */
    category: exports.AssetCategorySchema,
    /** Tags */
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    /** File type / MIME type */
    mimeType: zod_1.z.string(),
    /** File extension */
    extension: zod_1.z.string(),
    /** File size (bytes) */
    fileSizeBytes: zod_1.z.number().int().nonnegative(),
    /** Preview URL (thumbnail, waveform, etc.) */
    previewUrl: zod_1.z.string().url(),
    /** Full asset URL */
    assetUrl: zod_1.z.string().url(),
    /** Additional preview URLs (e.g., multiple resolutions) */
    additionalPreviews: zod_1.z.array(zod_1.z.object({
        url: zod_1.z.string().url(),
        label: zod_1.z.string(),
        width: zod_1.z.number().int().positive().optional(),
        height: zod_1.z.number().int().positive().optional(),
    })).default([]),
    /** Dimensions (for images/videos) */
    dimensions: zod_1.z.object({
        width: zod_1.z.number().int().positive(),
        height: zod_1.z.number().int().positive(),
    }).optional(),
    /** Duration in seconds (for audio/video) */
    duration: zod_1.z.number().positive().optional(),
    /** Frame rate (for video) */
    fps: zod_1.z.number().int().positive().optional(),
    /** Has alpha / transparency */
    hasAlpha: zod_1.z.boolean().optional(),
    /** Color profile */
    colorProfile: zod_1.z.string().optional(),
    /** Usage rights */
    usageRights: exports.UsageRightsSchema,
    /** Usage count (how many times used in renders) */
    usageCount: zod_1.z.number().int().nonnegative().default(0),
    /** Last used timestamp */
    lastUsedAt: zod_1.z.string().datetime().optional(),
    /** Uploaded by user identifier */
    uploadedBy: zod_1.z.string(),
    /** Whether this is a user upload or system/stock asset */
    isUserUpload: zod_1.z.boolean().default(true),
    /** Is favorite / starred */
    isFavorite: zod_1.z.boolean().default(false),
    /** Created timestamp */
    createdAt: zod_1.z.string().datetime(),
    /** Updated timestamp */
    updatedAt: zod_1.z.string().datetime(),
}).strict();
// ---------------------------------------------------------------------------
// Asset Library Dashboard
// ---------------------------------------------------------------------------
exports.AssetLibraryFilterSchema = zod_1.z.object({
    /** Search query */
    query: zod_1.z.string().optional(),
    /** Category filter */
    categories: zod_1.z.array(exports.AssetCategorySchema).optional(),
    /** Tag filter */
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    /** License type filter */
    licenseTypes: zod_1.z.array(zod_1.z.string()).optional(),
    /** Only user uploads */
    userUploadsOnly: zod_1.z.boolean().optional(),
    /** Only favorites */
    favoritesOnly: zod_1.z.boolean().optional(),
    /** File type filter */
    mimeTypes: zod_1.z.array(zod_1.z.string()).optional(),
    /** Sort by */
    sortBy: zod_1.z.enum(["newest", "oldest", "name", "size", "most_used", "recently_used"]).default("newest"),
    /** Pagination */
    page: zod_1.z.number().int().positive().default(1),
    pageSize: zod_1.z.number().int().positive().default(48),
}).strict();
exports.AssetLibraryDashboardSchema = zod_1.z.object({
    /** Assets (paginated) */
    assets: zod_1.z.array(exports.AssetEntrySchema),
    /** Pagination */
    pagination: zod_1.z.object({
        page: zod_1.z.number().int().positive(),
        pageSize: zod_1.z.number().int().positive(),
        totalAssets: zod_1.z.number().int().nonnegative(),
        totalPages: zod_1.z.number().int().nonnegative(),
    }),
    /** Storage summary */
    storageSummary: zod_1.z.object({
        totalAssets: zod_1.z.number().int().nonnegative(),
        totalSizeBytes: zod_1.z.number().int().nonnegative(),
        storageLimitBytes: zod_1.z.number().int().positive(),
        usagePercentage: zod_1.z.number().min(0).max(100),
        byCategory: zod_1.z.record(exports.AssetCategorySchema, zod_1.z.object({
            count: zod_1.z.number().int().nonnegative(),
            sizeBytes: zod_1.z.number().int().nonnegative(),
        })),
    }),
    /** Active filter */
    appliedFilter: exports.AssetLibraryFilterSchema.optional(),
}).strict();
//# sourceMappingURL=remotion-integration.js.map