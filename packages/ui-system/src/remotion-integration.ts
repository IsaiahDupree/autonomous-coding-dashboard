/**
 * INT-REM-001: Remotion Template Marketplace Types
 * INT-REM-002: Remotion Render History Types
 * INT-REM-003: Remotion Asset Library Types
 *
 * Type definitions and Zod schemas for Remotion product integrations
 * covering the template marketplace, render history, and asset library.
 */
import { z } from "zod";

// ===========================================================================
// INT-REM-001: Remotion Template Marketplace Types
// ===========================================================================

// ---------------------------------------------------------------------------
// Template Categories
// ---------------------------------------------------------------------------

export const RemotionTemplateCategorySchema = z.enum([
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
export type RemotionTemplateCategory = z.infer<typeof RemotionTemplateCategorySchema>;

// ---------------------------------------------------------------------------
// Template Listing
// ---------------------------------------------------------------------------

export const RemotionTemplateListingSchema = z.object({
  /** Template identifier */
  id: z.string(),
  /** Template name */
  name: z.string(),
  /** Template description */
  description: z.string(),
  /** Short description (for cards) */
  shortDescription: z.string().max(160).optional(),
  /** Category */
  category: RemotionTemplateCategorySchema,
  /** Tags */
  tags: z.array(z.string()).default([]),
  /** Author / creator identifier */
  authorId: z.string(),
  /** Author display name */
  authorName: z.string(),
  /** Author avatar URL */
  authorAvatar: z.string().url().optional(),
  /** Whether author is verified */
  authorVerified: z.boolean().default(false),
  /** Preview thumbnail URL */
  thumbnailUrl: z.string().url(),
  /** Preview video URL */
  previewVideoUrl: z.string().url().optional(),
  /** Additional preview images */
  previewImages: z.array(z.string().url()).default([]),
  /** Template version */
  version: z.string().default("1.0.0"),
  /** Aspect ratios supported */
  aspectRatios: z.array(z.enum(["16:9", "9:16", "1:1", "4:5", "4:3"])).default(["16:9"]),
  /** Default duration (seconds) */
  defaultDuration: z.number().positive(),
  /** Minimum duration (seconds) */
  minDuration: z.number().positive().optional(),
  /** Maximum duration (seconds) */
  maxDuration: z.number().positive().optional(),
  /** Default FPS */
  fps: z.number().int().positive().default(30),
  /** Customizable properties count */
  customizableProperties: z.number().int().nonnegative(),
  /** Required input types */
  requiredInputs: z.array(z.enum(["text", "image", "video", "audio", "color", "logo"])).default([]),
  /** Created timestamp */
  createdAt: z.string().datetime(),
  /** Updated timestamp */
  updatedAt: z.string().datetime(),
}).strict();

export type RemotionTemplateListing = z.infer<typeof RemotionTemplateListingSchema>;

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export const RemotionPricingModelSchema = z.enum(["free", "one_time", "subscription", "per_render"]);
export type RemotionPricingModel = z.infer<typeof RemotionPricingModelSchema>;

export const RemotionTemplatePricingSchema = z.object({
  /** Template identifier */
  templateId: z.string(),
  /** Pricing model */
  model: RemotionPricingModelSchema,
  /** Price amount (0 for free) */
  price: z.number().nonnegative().default(0),
  /** Currency code */
  currency: z.string().default("USD"),
  /** Subscription billing period (if subscription) */
  billingPeriod: z.enum(["monthly", "yearly"]).optional(),
  /** Per-render price (if per_render) */
  perRenderPrice: z.number().nonnegative().optional(),
  /** Volume discount tiers (if per_render) */
  volumeDiscounts: z.array(z.object({
    minRenders: z.number().int().positive(),
    pricePerRender: z.number().nonnegative(),
  })).optional(),
  /** Free trial renders (if paid) */
  freeTrialRenders: z.number().int().nonnegative().default(0),
  /** License type */
  licenseType: z.enum(["personal", "commercial", "extended"]).default("commercial"),
  /** Whether resale is permitted */
  resalePermitted: z.boolean().default(false),
}).strict();

export type RemotionTemplatePricing = z.infer<typeof RemotionTemplatePricingSchema>;

// ---------------------------------------------------------------------------
// Rating
// ---------------------------------------------------------------------------

export const RemotionTemplateRatingSchema = z.object({
  /** Template identifier */
  templateId: z.string(),
  /** Average rating (0-5) */
  averageRating: z.number().min(0).max(5),
  /** Total number of ratings */
  totalRatings: z.number().int().nonnegative(),
  /** Rating distribution */
  distribution: z.object({
    1: z.number().int().nonnegative(),
    2: z.number().int().nonnegative(),
    3: z.number().int().nonnegative(),
    4: z.number().int().nonnegative(),
    5: z.number().int().nonnegative(),
  }),
  /** Total downloads / uses */
  totalDownloads: z.number().int().nonnegative(),
  /** Total renders using this template */
  totalRenders: z.number().int().nonnegative(),
  /** Recent reviews */
  recentReviews: z.array(z.object({
    reviewerName: z.string(),
    rating: z.number().min(1).max(5),
    comment: z.string().optional(),
    createdAt: z.string().datetime(),
  })).default([]),
}).strict();

export type RemotionTemplateRating = z.infer<typeof RemotionTemplateRatingSchema>;

// ---------------------------------------------------------------------------
// Template Marketplace Search/Filter
// ---------------------------------------------------------------------------

export const TemplateMarketplaceFilterSchema = z.object({
  /** Search query */
  query: z.string().optional(),
  /** Category filter */
  categories: z.array(RemotionTemplateCategorySchema).optional(),
  /** Tag filter */
  tags: z.array(z.string()).optional(),
  /** Pricing model filter */
  pricingModels: z.array(RemotionPricingModelSchema).optional(),
  /** Max price */
  maxPrice: z.number().nonnegative().optional(),
  /** Min rating */
  minRating: z.number().min(0).max(5).optional(),
  /** Aspect ratio filter */
  aspectRatios: z.array(z.string()).optional(),
  /** Sort by */
  sortBy: z.enum(["relevance", "newest", "popular", "rating", "price_low", "price_high"]).default("relevance"),
  /** Pagination */
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(24),
}).strict();

export type TemplateMarketplaceFilter = z.infer<typeof TemplateMarketplaceFilterSchema>;

// ===========================================================================
// INT-REM-002: Remotion Render History Types
// ===========================================================================

// ---------------------------------------------------------------------------
// Render Job Schema
// ---------------------------------------------------------------------------

export const RenderStatusSchema = z.enum([
  "queued",
  "rendering",
  "compositing",
  "encoding",
  "uploading",
  "completed",
  "failed",
  "cancelled",
]);
export type RenderStatus = z.infer<typeof RenderStatusSchema>;

export const RenderJobSchema = z.object({
  /** Render job identifier */
  id: z.string(),
  /** Template identifier used */
  templateId: z.string(),
  /** Template name */
  templateName: z.string(),
  /** User / project identifier */
  userId: z.string(),
  /** Project identifier */
  projectId: z.string().optional(),
  /** Render status */
  status: RenderStatusSchema,
  /** Progress (0-100) */
  progress: z.number().min(0).max(100).default(0),
  /** Current render step description */
  currentStep: z.string().optional(),
  /** Output configuration */
  outputConfig: z.object({
    /** Output format */
    format: z.enum(["mp4", "webm", "gif", "png_sequence", "mov"]),
    /** Output resolution */
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    /** Frame rate */
    fps: z.number().int().positive().default(30),
    /** Quality (1-100) */
    quality: z.number().int().min(1).max(100).default(80),
    /** Codec */
    codec: z.enum(["h264", "h265", "vp8", "vp9", "prores", "gif"]).optional(),
    /** Duration (seconds) */
    duration: z.number().positive(),
  }),
  /** Input parameters used */
  inputParams: z.record(z.string(), z.unknown()).optional(),
  /** Output file URL (when completed) */
  outputUrl: z.string().url().optional(),
  /** Output file size (bytes) */
  outputSizeBytes: z.number().int().nonnegative().optional(),
  /** Render start timestamp */
  startedAt: z.string().datetime().optional(),
  /** Render completion timestamp */
  completedAt: z.string().datetime().optional(),
  /** Render duration (ms) */
  renderDurationMs: z.number().int().nonnegative().optional(),
  /** Error message (if failed) */
  errorMessage: z.string().optional(),
  /** Error code */
  errorCode: z.string().optional(),
  /** Retry count */
  retryCount: z.number().int().nonnegative().default(0),
  /** Max retries */
  maxRetries: z.number().int().nonnegative().default(3),
  /** Created timestamp */
  createdAt: z.string().datetime(),
  /** Lambda function used */
  lambdaFunction: z.string().optional(),
  /** AWS region used */
  region: z.string().optional(),
}).strict();

export type RenderJob = z.infer<typeof RenderJobSchema>;

// ---------------------------------------------------------------------------
// Status Tracking
// ---------------------------------------------------------------------------

export const RenderStatusHistoryEntrySchema = z.object({
  /** Status */
  status: RenderStatusSchema,
  /** Timestamp */
  timestamp: z.string().datetime(),
  /** Progress at this point */
  progress: z.number().min(0).max(100),
  /** Additional details */
  details: z.string().optional(),
}).strict();

export type RenderStatusHistoryEntry = z.infer<typeof RenderStatusHistoryEntrySchema>;

export const RenderStatusTrackingSchema = z.object({
  /** Render job identifier */
  jobId: z.string(),
  /** Current status */
  currentStatus: RenderStatusSchema,
  /** Status history */
  history: z.array(RenderStatusHistoryEntrySchema),
  /** Estimated time remaining (ms) */
  estimatedTimeRemainingMs: z.number().int().nonnegative().optional(),
  /** Current progress */
  progress: z.number().min(0).max(100),
}).strict();

export type RenderStatusTracking = z.infer<typeof RenderStatusTrackingSchema>;

// ---------------------------------------------------------------------------
// Cost Per Render
// ---------------------------------------------------------------------------

export const RenderCostSchema = z.object({
  /** Render job identifier */
  jobId: z.string(),
  /** Template cost (if paid template) */
  templateCost: z.number().nonnegative().default(0),
  /** Compute cost (Lambda / server) */
  computeCost: z.number().nonnegative(),
  /** Storage cost */
  storageCost: z.number().nonnegative().default(0),
  /** Bandwidth / transfer cost */
  transferCost: z.number().nonnegative().default(0),
  /** Total cost */
  totalCost: z.number().nonnegative(),
  /** Currency */
  currency: z.string().default("USD"),
  /** Compute duration billed (ms) */
  billedDurationMs: z.number().int().nonnegative(),
  /** Memory allocated (MB) */
  memoryAllocatedMb: z.number().int().positive(),
  /** Whether this was covered by plan / credits */
  coveredByPlan: z.boolean().default(false),
  /** Credits used */
  creditsUsed: z.number().nonnegative().default(0),
}).strict();

export type RenderCost = z.infer<typeof RenderCostSchema>;

// ---------------------------------------------------------------------------
// Render History Dashboard
// ---------------------------------------------------------------------------

export const RenderHistoryDashboardSchema = z.object({
  /** Render jobs (paginated) */
  jobs: z.array(RenderJobSchema),
  /** Pagination */
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalJobs: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
  /** Summary stats */
  summary: z.object({
    totalRenders: z.number().int().nonnegative(),
    completedRenders: z.number().int().nonnegative(),
    failedRenders: z.number().int().nonnegative(),
    avgRenderDurationMs: z.number().nonnegative(),
    totalCost: z.number().nonnegative(),
    avgCostPerRender: z.number().nonnegative(),
    mostUsedTemplate: z.string().optional(),
  }),
  /** Cost breakdown for period */
  costBreakdown: z.object({
    compute: z.number().nonnegative(),
    storage: z.number().nonnegative(),
    transfer: z.number().nonnegative(),
    templates: z.number().nonnegative(),
    total: z.number().nonnegative(),
  }),
  /** Filter/sort applied */
  filters: z.object({
    status: z.array(RenderStatusSchema).optional(),
    templateId: z.string().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    sortBy: z.enum(["newest", "oldest", "cost", "duration"]).default("newest"),
  }).optional(),
}).strict();

export type RenderHistoryDashboard = z.infer<typeof RenderHistoryDashboardSchema>;

// ===========================================================================
// INT-REM-003: Remotion Asset Library Types
// ===========================================================================

// ---------------------------------------------------------------------------
// Asset Categories
// ---------------------------------------------------------------------------

export const AssetCategorySchema = z.enum([
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
export type AssetCategory = z.infer<typeof AssetCategorySchema>;

// ---------------------------------------------------------------------------
// Usage Rights
// ---------------------------------------------------------------------------

export const UsageRightsSchema = z.object({
  /** License type */
  license: z.enum([
    "royalty_free",
    "editorial",
    "creative_commons",
    "proprietary",
    "public_domain",
    "custom",
  ]),
  /** Creative Commons variant (if applicable) */
  ccVariant: z.enum(["CC0", "CC-BY", "CC-BY-SA", "CC-BY-NC", "CC-BY-NC-SA", "CC-BY-ND", "CC-BY-NC-ND"]).optional(),
  /** Allow commercial use */
  commercialUse: z.boolean(),
  /** Allow modification */
  allowModification: z.boolean(),
  /** Require attribution */
  requireAttribution: z.boolean(),
  /** Attribution text (if required) */
  attributionText: z.string().optional(),
  /** Usage limit (renders, 0 = unlimited) */
  usageLimit: z.number().int().nonnegative().default(0),
  /** Geographic restrictions */
  geographicRestrictions: z.array(z.string()).default([]),
  /** Expiration date (if time-limited) */
  expiresAt: z.string().datetime().optional(),
  /** Source / provider */
  source: z.string().optional(),
}).strict();

export type UsageRights = z.infer<typeof UsageRightsSchema>;

// ---------------------------------------------------------------------------
// Asset Entry
// ---------------------------------------------------------------------------

export const AssetEntrySchema = z.object({
  /** Asset identifier */
  id: z.string(),
  /** Asset name */
  name: z.string(),
  /** Asset description */
  description: z.string().optional(),
  /** Category */
  category: AssetCategorySchema,
  /** Tags */
  tags: z.array(z.string()).default([]),
  /** File type / MIME type */
  mimeType: z.string(),
  /** File extension */
  extension: z.string(),
  /** File size (bytes) */
  fileSizeBytes: z.number().int().nonnegative(),
  /** Preview URL (thumbnail, waveform, etc.) */
  previewUrl: z.string().url(),
  /** Full asset URL */
  assetUrl: z.string().url(),
  /** Additional preview URLs (e.g., multiple resolutions) */
  additionalPreviews: z.array(z.object({
    url: z.string().url(),
    label: z.string(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })).default([]),
  /** Dimensions (for images/videos) */
  dimensions: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }).optional(),
  /** Duration in seconds (for audio/video) */
  duration: z.number().positive().optional(),
  /** Frame rate (for video) */
  fps: z.number().int().positive().optional(),
  /** Has alpha / transparency */
  hasAlpha: z.boolean().optional(),
  /** Color profile */
  colorProfile: z.string().optional(),
  /** Usage rights */
  usageRights: UsageRightsSchema,
  /** Usage count (how many times used in renders) */
  usageCount: z.number().int().nonnegative().default(0),
  /** Last used timestamp */
  lastUsedAt: z.string().datetime().optional(),
  /** Uploaded by user identifier */
  uploadedBy: z.string(),
  /** Whether this is a user upload or system/stock asset */
  isUserUpload: z.boolean().default(true),
  /** Is favorite / starred */
  isFavorite: z.boolean().default(false),
  /** Created timestamp */
  createdAt: z.string().datetime(),
  /** Updated timestamp */
  updatedAt: z.string().datetime(),
}).strict();

export type AssetEntry = z.infer<typeof AssetEntrySchema>;

// ---------------------------------------------------------------------------
// Asset Library Dashboard
// ---------------------------------------------------------------------------

export const AssetLibraryFilterSchema = z.object({
  /** Search query */
  query: z.string().optional(),
  /** Category filter */
  categories: z.array(AssetCategorySchema).optional(),
  /** Tag filter */
  tags: z.array(z.string()).optional(),
  /** License type filter */
  licenseTypes: z.array(z.string()).optional(),
  /** Only user uploads */
  userUploadsOnly: z.boolean().optional(),
  /** Only favorites */
  favoritesOnly: z.boolean().optional(),
  /** File type filter */
  mimeTypes: z.array(z.string()).optional(),
  /** Sort by */
  sortBy: z.enum(["newest", "oldest", "name", "size", "most_used", "recently_used"]).default("newest"),
  /** Pagination */
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(48),
}).strict();

export type AssetLibraryFilter = z.infer<typeof AssetLibraryFilterSchema>;

export const AssetLibraryDashboardSchema = z.object({
  /** Assets (paginated) */
  assets: z.array(AssetEntrySchema),
  /** Pagination */
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalAssets: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
  /** Storage summary */
  storageSummary: z.object({
    totalAssets: z.number().int().nonnegative(),
    totalSizeBytes: z.number().int().nonnegative(),
    storageLimitBytes: z.number().int().positive(),
    usagePercentage: z.number().min(0).max(100),
    byCategory: z.record(AssetCategorySchema, z.object({
      count: z.number().int().nonnegative(),
      sizeBytes: z.number().int().nonnegative(),
    })),
  }),
  /** Active filter */
  appliedFilter: AssetLibraryFilterSchema.optional(),
}).strict();

export type AssetLibraryDashboard = z.infer<typeof AssetLibraryDashboardSchema>;
