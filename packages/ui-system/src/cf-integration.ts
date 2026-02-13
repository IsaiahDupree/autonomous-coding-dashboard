/**
 * INT-CF-001: Content Factory Analytics Integration
 * INT-CF-002: Content Factory Settings Integration
 *
 * Type definitions and Zod schemas for Content Factory product
 * analytics dashboards and settings panels.
 */
import { z } from "zod";

// ===========================================================================
// INT-CF-001: Content Factory Analytics
// ===========================================================================

// ---------------------------------------------------------------------------
// Content Production Metrics
// ---------------------------------------------------------------------------

export const ContentTypeSchema = z.enum([
  "blog_post",
  "social_post",
  "email",
  "landing_page",
  "ad_copy",
  "video_script",
  "product_description",
  "newsletter",
  "press_release",
  "whitepaper",
]);
export type ContentType = z.infer<typeof ContentTypeSchema>;

export const ContentStatusSchema = z.enum([
  "draft",
  "in_review",
  "approved",
  "published",
  "scheduled",
  "archived",
  "rejected",
]);
export type ContentStatus = z.infer<typeof ContentStatusSchema>;

export const ContentProductionMetricSchema = z.object({
  /** Total content pieces created */
  totalCreated: z.number().int().nonnegative(),
  /** Content created by type */
  createdByType: z.record(ContentTypeSchema, z.number().int().nonnegative()),
  /** Average creation time (minutes) */
  avgCreationTimeMinutes: z.number().nonnegative(),
  /** Content in each status */
  statusBreakdown: z.record(ContentStatusSchema, z.number().int().nonnegative()),
  /** AI-assisted vs manual creation ratio */
  aiAssistedRatio: z.number().min(0).max(1),
  /** Average revision count */
  avgRevisions: z.number().nonnegative(),
  /** Content quality score (0-100) */
  avgQualityScore: z.number().min(0).max(100),
  /** Rejection rate */
  rejectionRate: z.number().min(0).max(1),
  /** Time period */
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
    granularity: z.enum(["hour", "day", "week", "month"]),
  }),
}).strict();

export type ContentProductionMetric = z.infer<typeof ContentProductionMetricSchema>;

// ---------------------------------------------------------------------------
// Publish Rates
// ---------------------------------------------------------------------------

export const PublishRateMetricSchema = z.object({
  /** Total published in period */
  totalPublished: z.number().int().nonnegative(),
  /** Published by type */
  publishedByType: z.record(ContentTypeSchema, z.number().int().nonnegative()),
  /** Published by platform/channel */
  publishedByChannel: z.record(z.string(), z.number().int().nonnegative()),
  /** Average time from creation to publish (hours) */
  avgTimeToPublishHours: z.number().nonnegative(),
  /** Publish schedule adherence (0-1) */
  scheduleAdherence: z.number().min(0).max(1),
  /** Daily publish rate (average) */
  dailyRate: z.number().nonnegative(),
  /** Weekly publish rate (average) */
  weeklyRate: z.number().nonnegative(),
  /** Publish rate trend */
  trend: z.enum(["increasing", "stable", "decreasing"]),
  /** Trend percentage change */
  trendPercentage: z.number(),
}).strict();

export type PublishRateMetric = z.infer<typeof PublishRateMetricSchema>;

// ---------------------------------------------------------------------------
// Engagement Tracking
// ---------------------------------------------------------------------------

export const ContentEngagementSchema = z.object({
  /** Content identifier */
  contentId: z.string(),
  /** Content title */
  title: z.string(),
  /** Content type */
  type: ContentTypeSchema,
  /** Published date */
  publishedAt: z.string().datetime(),
  /** Page views */
  views: z.number().int().nonnegative(),
  /** Unique visitors */
  uniqueVisitors: z.number().int().nonnegative(),
  /** Average time on page (seconds) */
  avgTimeOnPage: z.number().nonnegative(),
  /** Bounce rate */
  bounceRate: z.number().min(0).max(1),
  /** Social shares */
  socialShares: z.number().int().nonnegative(),
  /** Comments */
  comments: z.number().int().nonnegative(),
  /** Likes / reactions */
  likes: z.number().int().nonnegative(),
  /** Click-through rate (for emails, ads) */
  ctr: z.number().min(0).max(1).optional(),
  /** Open rate (for emails) */
  openRate: z.number().min(0).max(1).optional(),
  /** Conversion rate */
  conversionRate: z.number().min(0).max(1).optional(),
  /** SEO ranking position */
  seoRanking: z.number().int().positive().optional(),
  /** Engagement score (0-100) */
  engagementScore: z.number().min(0).max(100),
}).strict();

export type ContentEngagement = z.infer<typeof ContentEngagementSchema>;

// ---------------------------------------------------------------------------
// Content Factory Analytics Dashboard
// ---------------------------------------------------------------------------

export const CfAnalyticsDashboardSchema = z.object({
  productionMetrics: ContentProductionMetricSchema,
  publishRates: PublishRateMetricSchema,
  topContent: z.array(ContentEngagementSchema),
  /** Aggregate engagement metrics */
  engagementSummary: z.object({
    totalViews: z.number().int().nonnegative(),
    totalShares: z.number().int().nonnegative(),
    avgEngagementScore: z.number().min(0).max(100),
    topPerformingType: ContentTypeSchema,
  }),
}).strict();

export type CfAnalyticsDashboard = z.infer<typeof CfAnalyticsDashboardSchema>;

// ===========================================================================
// INT-CF-002: Content Factory Settings
// ===========================================================================

// ---------------------------------------------------------------------------
// Template Preferences
// ---------------------------------------------------------------------------

export const TemplatePreferencesSchema = z.object({
  /** Default content type */
  defaultContentType: ContentTypeSchema.default("blog_post"),
  /** Default tone of voice */
  defaultTone: z.enum([
    "professional",
    "casual",
    "authoritative",
    "friendly",
    "humorous",
    "inspirational",
    "educational",
  ]).default("professional"),
  /** Default language */
  defaultLanguage: z.string().default("en"),
  /** Supported languages */
  supportedLanguages: z.array(z.string()).default(["en"]),
  /** Brand voice keywords */
  brandVoiceKeywords: z.array(z.string()).default([]),
  /** Banned words / phrases */
  bannedPhrases: z.array(z.string()).default([]),
  /** Default word count targets by type */
  wordCountTargets: z.record(ContentTypeSchema, z.object({
    min: z.number().int().nonnegative(),
    max: z.number().int().positive(),
    target: z.number().int().positive(),
  })).optional(),
  /** Custom template library */
  customTemplates: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: ContentTypeSchema,
    description: z.string(),
    promptTemplate: z.string(),
    isActive: z.boolean().default(true),
  })).default([]),
}).strict();

export type TemplatePreferences = z.infer<typeof TemplatePreferencesSchema>;

// ---------------------------------------------------------------------------
// Publishing Defaults
// ---------------------------------------------------------------------------

export const PublishingDefaultsSchema = z.object({
  /** Default publish channels */
  defaultChannels: z.array(z.string()).default([]),
  /** Auto-schedule publishing */
  autoSchedule: z.boolean().default(false),
  /** Preferred publish times (hours in 24h format) */
  preferredPublishTimes: z.array(z.number().int().min(0).max(23)).default([9, 12, 17]),
  /** Preferred publish days */
  preferredPublishDays: z.array(z.enum([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ])).default(["monday", "wednesday", "friday"]),
  /** Timezone for scheduling */
  timezone: z.string().default("America/New_York"),
  /** Require approval before publishing */
  requireApproval: z.boolean().default(true),
  /** Minimum approval count */
  minApprovals: z.number().int().positive().default(1),
  /** Auto-add SEO metadata */
  autoSeoMetadata: z.boolean().default(true),
  /** Auto-generate social media previews */
  autoSocialPreviews: z.boolean().default(true),
  /** Default content expiration (days, 0 = never) */
  contentExpirationDays: z.number().int().nonnegative().default(0),
}).strict();

export type PublishingDefaults = z.infer<typeof PublishingDefaultsSchema>;

// ---------------------------------------------------------------------------
// AI Configuration
// ---------------------------------------------------------------------------

export const CfAiConfigSchema = z.object({
  /** Enable AI content generation */
  enabled: z.boolean().default(true),
  /** AI model preference */
  model: z.enum(["claude", "gpt-4", "gpt-3.5", "custom"]).default("claude"),
  /** Temperature (creativity level, 0-1) */
  temperature: z.number().min(0).max(1).default(0.7),
  /** Max tokens per generation */
  maxTokens: z.number().int().positive().default(4000),
  /** Enable AI quality review */
  aiQualityReview: z.boolean().default(true),
  /** Enable AI SEO optimization */
  aiSeoOptimization: z.boolean().default(true),
  /** Enable AI image generation */
  aiImageGeneration: z.boolean().default(false),
  /** Enable AI translation */
  aiTranslation: z.boolean().default(false),
  /** Content safety filter level */
  safetyFilterLevel: z.enum(["strict", "moderate", "minimal"]).default("moderate"),
  /** Custom system prompt */
  customSystemPrompt: z.string().optional(),
  /** Monthly AI usage limit (tokens) */
  monthlyTokenLimit: z.number().int().positive().optional(),
  /** Current month token usage */
  currentMonthUsage: z.number().int().nonnegative().default(0),
}).strict();

export type CfAiConfig = z.infer<typeof CfAiConfigSchema>;

// ---------------------------------------------------------------------------
// Content Factory Settings Aggregate
// ---------------------------------------------------------------------------

export const CfSettingsSchema = z.object({
  templatePreferences: TemplatePreferencesSchema,
  publishingDefaults: PublishingDefaultsSchema,
  aiConfig: CfAiConfigSchema,
}).strict();

export type CfSettings = z.infer<typeof CfSettingsSchema>;
