"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CfSettingsSchema = exports.CfAiConfigSchema = exports.PublishingDefaultsSchema = exports.TemplatePreferencesSchema = exports.CfAnalyticsDashboardSchema = exports.ContentEngagementSchema = exports.PublishRateMetricSchema = exports.ContentProductionMetricSchema = exports.ContentStatusSchema = exports.ContentTypeSchema = void 0;
/**
 * INT-CF-001: Content Factory Analytics Integration
 * INT-CF-002: Content Factory Settings Integration
 *
 * Type definitions and Zod schemas for Content Factory product
 * analytics dashboards and settings panels.
 */
const zod_1 = require("zod");
// ===========================================================================
// INT-CF-001: Content Factory Analytics
// ===========================================================================
// ---------------------------------------------------------------------------
// Content Production Metrics
// ---------------------------------------------------------------------------
exports.ContentTypeSchema = zod_1.z.enum([
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
exports.ContentStatusSchema = zod_1.z.enum([
    "draft",
    "in_review",
    "approved",
    "published",
    "scheduled",
    "archived",
    "rejected",
]);
exports.ContentProductionMetricSchema = zod_1.z.object({
    /** Total content pieces created */
    totalCreated: zod_1.z.number().int().nonnegative(),
    /** Content created by type */
    createdByType: zod_1.z.record(exports.ContentTypeSchema, zod_1.z.number().int().nonnegative()),
    /** Average creation time (minutes) */
    avgCreationTimeMinutes: zod_1.z.number().nonnegative(),
    /** Content in each status */
    statusBreakdown: zod_1.z.record(exports.ContentStatusSchema, zod_1.z.number().int().nonnegative()),
    /** AI-assisted vs manual creation ratio */
    aiAssistedRatio: zod_1.z.number().min(0).max(1),
    /** Average revision count */
    avgRevisions: zod_1.z.number().nonnegative(),
    /** Content quality score (0-100) */
    avgQualityScore: zod_1.z.number().min(0).max(100),
    /** Rejection rate */
    rejectionRate: zod_1.z.number().min(0).max(1),
    /** Time period */
    period: zod_1.z.object({
        start: zod_1.z.string().datetime(),
        end: zod_1.z.string().datetime(),
        granularity: zod_1.z.enum(["hour", "day", "week", "month"]),
    }),
}).strict();
// ---------------------------------------------------------------------------
// Publish Rates
// ---------------------------------------------------------------------------
exports.PublishRateMetricSchema = zod_1.z.object({
    /** Total published in period */
    totalPublished: zod_1.z.number().int().nonnegative(),
    /** Published by type */
    publishedByType: zod_1.z.record(exports.ContentTypeSchema, zod_1.z.number().int().nonnegative()),
    /** Published by platform/channel */
    publishedByChannel: zod_1.z.record(zod_1.z.string(), zod_1.z.number().int().nonnegative()),
    /** Average time from creation to publish (hours) */
    avgTimeToPublishHours: zod_1.z.number().nonnegative(),
    /** Publish schedule adherence (0-1) */
    scheduleAdherence: zod_1.z.number().min(0).max(1),
    /** Daily publish rate (average) */
    dailyRate: zod_1.z.number().nonnegative(),
    /** Weekly publish rate (average) */
    weeklyRate: zod_1.z.number().nonnegative(),
    /** Publish rate trend */
    trend: zod_1.z.enum(["increasing", "stable", "decreasing"]),
    /** Trend percentage change */
    trendPercentage: zod_1.z.number(),
}).strict();
// ---------------------------------------------------------------------------
// Engagement Tracking
// ---------------------------------------------------------------------------
exports.ContentEngagementSchema = zod_1.z.object({
    /** Content identifier */
    contentId: zod_1.z.string(),
    /** Content title */
    title: zod_1.z.string(),
    /** Content type */
    type: exports.ContentTypeSchema,
    /** Published date */
    publishedAt: zod_1.z.string().datetime(),
    /** Page views */
    views: zod_1.z.number().int().nonnegative(),
    /** Unique visitors */
    uniqueVisitors: zod_1.z.number().int().nonnegative(),
    /** Average time on page (seconds) */
    avgTimeOnPage: zod_1.z.number().nonnegative(),
    /** Bounce rate */
    bounceRate: zod_1.z.number().min(0).max(1),
    /** Social shares */
    socialShares: zod_1.z.number().int().nonnegative(),
    /** Comments */
    comments: zod_1.z.number().int().nonnegative(),
    /** Likes / reactions */
    likes: zod_1.z.number().int().nonnegative(),
    /** Click-through rate (for emails, ads) */
    ctr: zod_1.z.number().min(0).max(1).optional(),
    /** Open rate (for emails) */
    openRate: zod_1.z.number().min(0).max(1).optional(),
    /** Conversion rate */
    conversionRate: zod_1.z.number().min(0).max(1).optional(),
    /** SEO ranking position */
    seoRanking: zod_1.z.number().int().positive().optional(),
    /** Engagement score (0-100) */
    engagementScore: zod_1.z.number().min(0).max(100),
}).strict();
// ---------------------------------------------------------------------------
// Content Factory Analytics Dashboard
// ---------------------------------------------------------------------------
exports.CfAnalyticsDashboardSchema = zod_1.z.object({
    productionMetrics: exports.ContentProductionMetricSchema,
    publishRates: exports.PublishRateMetricSchema,
    topContent: zod_1.z.array(exports.ContentEngagementSchema),
    /** Aggregate engagement metrics */
    engagementSummary: zod_1.z.object({
        totalViews: zod_1.z.number().int().nonnegative(),
        totalShares: zod_1.z.number().int().nonnegative(),
        avgEngagementScore: zod_1.z.number().min(0).max(100),
        topPerformingType: exports.ContentTypeSchema,
    }),
}).strict();
// ===========================================================================
// INT-CF-002: Content Factory Settings
// ===========================================================================
// ---------------------------------------------------------------------------
// Template Preferences
// ---------------------------------------------------------------------------
exports.TemplatePreferencesSchema = zod_1.z.object({
    /** Default content type */
    defaultContentType: exports.ContentTypeSchema.default("blog_post"),
    /** Default tone of voice */
    defaultTone: zod_1.z.enum([
        "professional",
        "casual",
        "authoritative",
        "friendly",
        "humorous",
        "inspirational",
        "educational",
    ]).default("professional"),
    /** Default language */
    defaultLanguage: zod_1.z.string().default("en"),
    /** Supported languages */
    supportedLanguages: zod_1.z.array(zod_1.z.string()).default(["en"]),
    /** Brand voice keywords */
    brandVoiceKeywords: zod_1.z.array(zod_1.z.string()).default([]),
    /** Banned words / phrases */
    bannedPhrases: zod_1.z.array(zod_1.z.string()).default([]),
    /** Default word count targets by type */
    wordCountTargets: zod_1.z.record(exports.ContentTypeSchema, zod_1.z.object({
        min: zod_1.z.number().int().nonnegative(),
        max: zod_1.z.number().int().positive(),
        target: zod_1.z.number().int().positive(),
    })).optional(),
    /** Custom template library */
    customTemplates: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        type: exports.ContentTypeSchema,
        description: zod_1.z.string(),
        promptTemplate: zod_1.z.string(),
        isActive: zod_1.z.boolean().default(true),
    })).default([]),
}).strict();
// ---------------------------------------------------------------------------
// Publishing Defaults
// ---------------------------------------------------------------------------
exports.PublishingDefaultsSchema = zod_1.z.object({
    /** Default publish channels */
    defaultChannels: zod_1.z.array(zod_1.z.string()).default([]),
    /** Auto-schedule publishing */
    autoSchedule: zod_1.z.boolean().default(false),
    /** Preferred publish times (hours in 24h format) */
    preferredPublishTimes: zod_1.z.array(zod_1.z.number().int().min(0).max(23)).default([9, 12, 17]),
    /** Preferred publish days */
    preferredPublishDays: zod_1.z.array(zod_1.z.enum([
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    ])).default(["monday", "wednesday", "friday"]),
    /** Timezone for scheduling */
    timezone: zod_1.z.string().default("America/New_York"),
    /** Require approval before publishing */
    requireApproval: zod_1.z.boolean().default(true),
    /** Minimum approval count */
    minApprovals: zod_1.z.number().int().positive().default(1),
    /** Auto-add SEO metadata */
    autoSeoMetadata: zod_1.z.boolean().default(true),
    /** Auto-generate social media previews */
    autoSocialPreviews: zod_1.z.boolean().default(true),
    /** Default content expiration (days, 0 = never) */
    contentExpirationDays: zod_1.z.number().int().nonnegative().default(0),
}).strict();
// ---------------------------------------------------------------------------
// AI Configuration
// ---------------------------------------------------------------------------
exports.CfAiConfigSchema = zod_1.z.object({
    /** Enable AI content generation */
    enabled: zod_1.z.boolean().default(true),
    /** AI model preference */
    model: zod_1.z.enum(["claude", "gpt-4", "gpt-3.5", "custom"]).default("claude"),
    /** Temperature (creativity level, 0-1) */
    temperature: zod_1.z.number().min(0).max(1).default(0.7),
    /** Max tokens per generation */
    maxTokens: zod_1.z.number().int().positive().default(4000),
    /** Enable AI quality review */
    aiQualityReview: zod_1.z.boolean().default(true),
    /** Enable AI SEO optimization */
    aiSeoOptimization: zod_1.z.boolean().default(true),
    /** Enable AI image generation */
    aiImageGeneration: zod_1.z.boolean().default(false),
    /** Enable AI translation */
    aiTranslation: zod_1.z.boolean().default(false),
    /** Content safety filter level */
    safetyFilterLevel: zod_1.z.enum(["strict", "moderate", "minimal"]).default("moderate"),
    /** Custom system prompt */
    customSystemPrompt: zod_1.z.string().optional(),
    /** Monthly AI usage limit (tokens) */
    monthlyTokenLimit: zod_1.z.number().int().positive().optional(),
    /** Current month token usage */
    currentMonthUsage: zod_1.z.number().int().nonnegative().default(0),
}).strict();
// ---------------------------------------------------------------------------
// Content Factory Settings Aggregate
// ---------------------------------------------------------------------------
exports.CfSettingsSchema = zod_1.z.object({
    templatePreferences: exports.TemplatePreferencesSchema,
    publishingDefaults: exports.PublishingDefaultsSchema,
    aiConfig: exports.CfAiConfigSchema,
}).strict();
//# sourceMappingURL=cf-integration.js.map