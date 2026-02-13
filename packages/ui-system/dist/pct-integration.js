"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PctSettingsSchema = exports.PctNotificationPreferencesSchema = exports.PctFeatureTogglesSchema = exports.PctConfigurationSchema = exports.PctAnalyticsDashboardSchema = exports.CreativeScoreSchema = exports.CampaignSummarySchema = exports.CampaignStatusSchema = exports.AdPerformanceMetricSchema = void 0;
/**
 * INT-PCT-001: PCT Analytics Integration
 * INT-PCT-002: PCT Settings Integration
 *
 * Type definitions and Zod schemas for Performance Creative Testing (PCT)
 * product analytics dashboards and settings panels.
 */
const zod_1 = require("zod");
// ===========================================================================
// INT-PCT-001: PCT Analytics Integration
// ===========================================================================
// ---------------------------------------------------------------------------
// Ad Performance Metrics
// ---------------------------------------------------------------------------
exports.AdPerformanceMetricSchema = zod_1.z.object({
    /** Ad identifier */
    adId: zod_1.z.string(),
    /** Ad name / title */
    adName: zod_1.z.string(),
    /** Campaign identifier */
    campaignId: zod_1.z.string(),
    /** Platform (Meta, Google, TikTok, etc.) */
    platform: zod_1.z.enum(["meta", "google", "tiktok", "linkedin", "twitter", "pinterest", "snapchat"]),
    /** Date range start */
    dateStart: zod_1.z.string().datetime(),
    /** Date range end */
    dateEnd: zod_1.z.string().datetime(),
    /** Impressions */
    impressions: zod_1.z.number().int().nonnegative(),
    /** Clicks */
    clicks: zod_1.z.number().int().nonnegative(),
    /** Click-through rate (0-1) */
    ctr: zod_1.z.number().min(0).max(1),
    /** Cost per click */
    cpc: zod_1.z.number().nonnegative(),
    /** Cost per mille (1000 impressions) */
    cpm: zod_1.z.number().nonnegative(),
    /** Total spend */
    spend: zod_1.z.number().nonnegative(),
    /** Conversions */
    conversions: zod_1.z.number().int().nonnegative(),
    /** Cost per acquisition */
    cpa: zod_1.z.number().nonnegative(),
    /** Return on ad spend */
    roas: zod_1.z.number().nonnegative(),
    /** Revenue generated */
    revenue: zod_1.z.number().nonnegative(),
    /** Engagement rate */
    engagementRate: zod_1.z.number().min(0).max(1),
    /** Video views (if applicable) */
    videoViews: zod_1.z.number().int().nonnegative().optional(),
    /** Video completion rate (if applicable) */
    videoCompletionRate: zod_1.z.number().min(0).max(1).optional(),
}).strict();
// ---------------------------------------------------------------------------
// Campaign Summary
// ---------------------------------------------------------------------------
exports.CampaignStatusSchema = zod_1.z.enum([
    "draft",
    "active",
    "paused",
    "completed",
    "archived",
    "error",
]);
exports.CampaignSummarySchema = zod_1.z.object({
    /** Campaign identifier */
    campaignId: zod_1.z.string(),
    /** Campaign name */
    name: zod_1.z.string(),
    /** Campaign status */
    status: exports.CampaignStatusSchema,
    /** Platform */
    platform: zod_1.z.enum(["meta", "google", "tiktok", "linkedin", "twitter", "pinterest", "snapchat"]),
    /** Campaign objective */
    objective: zod_1.z.enum([
        "awareness",
        "traffic",
        "engagement",
        "leads",
        "conversions",
        "sales",
        "app_installs",
    ]),
    /** Budget (total or daily depending on budgetType) */
    budget: zod_1.z.number().nonnegative(),
    /** Budget type */
    budgetType: zod_1.z.enum(["daily", "lifetime"]),
    /** Currency code */
    currency: zod_1.z.string().default("USD"),
    /** Start date */
    startDate: zod_1.z.string().datetime(),
    /** End date */
    endDate: zod_1.z.string().datetime().optional(),
    /** Number of ad sets / ad groups */
    adSetCount: zod_1.z.number().int().nonnegative(),
    /** Number of ads */
    adCount: zod_1.z.number().int().nonnegative(),
    /** Total spend to date */
    totalSpend: zod_1.z.number().nonnegative(),
    /** Overall ROAS */
    overallRoas: zod_1.z.number().nonnegative(),
    /** Overall CTR */
    overallCtr: zod_1.z.number().min(0).max(1),
    /** Overall CPA */
    overallCpa: zod_1.z.number().nonnegative(),
    /** Budget utilization (0-1) */
    budgetUtilization: zod_1.z.number().min(0).max(1),
    /** Last updated timestamp */
    updatedAt: zod_1.z.string().datetime(),
}).strict();
// ---------------------------------------------------------------------------
// Creative Scoring
// ---------------------------------------------------------------------------
exports.CreativeScoreSchema = zod_1.z.object({
    /** Creative identifier */
    creativeId: zod_1.z.string(),
    /** Creative name */
    name: zod_1.z.string(),
    /** Creative type */
    type: zod_1.z.enum(["image", "video", "carousel", "story", "text"]),
    /** Thumbnail / preview URL */
    thumbnailUrl: zod_1.z.string().url().optional(),
    /** Overall performance score (0-100) */
    overallScore: zod_1.z.number().min(0).max(100),
    /** Click-through score (0-100) */
    clickScore: zod_1.z.number().min(0).max(100),
    /** Conversion score (0-100) */
    conversionScore: zod_1.z.number().min(0).max(100),
    /** Engagement score (0-100) */
    engagementScore: zod_1.z.number().min(0).max(100),
    /** Cost efficiency score (0-100) */
    costScore: zod_1.z.number().min(0).max(100),
    /** Audience resonance score (0-100) */
    audienceScore: zod_1.z.number().min(0).max(100),
    /** AI-generated insights / recommendations */
    insights: zod_1.z.array(zod_1.z.string()),
    /** Rank within campaign */
    rank: zod_1.z.number().int().positive(),
    /** Performance trend */
    trend: zod_1.z.enum(["improving", "stable", "declining"]),
    /** Number of active campaigns using this creative */
    activeCampaigns: zod_1.z.number().int().nonnegative(),
    /** Fatigue indicator (how stale the creative is) */
    fatigueLevel: zod_1.z.enum(["fresh", "moderate", "high", "critical"]),
}).strict();
// ---------------------------------------------------------------------------
// PCT Analytics Dashboard Aggregate
// ---------------------------------------------------------------------------
exports.PctAnalyticsDashboardSchema = zod_1.z.object({
    /** Time range for the dashboard view */
    timeRange: zod_1.z.object({
        start: zod_1.z.string().datetime(),
        end: zod_1.z.string().datetime(),
        granularity: zod_1.z.enum(["hour", "day", "week", "month"]),
    }),
    /** Campaign summaries */
    campaigns: zod_1.z.array(exports.CampaignSummarySchema),
    /** Top performing ads */
    topAds: zod_1.z.array(exports.AdPerformanceMetricSchema),
    /** Creative scores */
    creativeScores: zod_1.z.array(exports.CreativeScoreSchema),
    /** Aggregate metrics */
    aggregates: zod_1.z.object({
        totalSpend: zod_1.z.number(),
        totalRevenue: zod_1.z.number(),
        averageRoas: zod_1.z.number(),
        averageCtr: zod_1.z.number(),
        averageCpa: zod_1.z.number(),
        totalImpressions: zod_1.z.number(),
        totalClicks: zod_1.z.number(),
        totalConversions: zod_1.z.number(),
    }),
    /** Comparison period metrics (for trend arrows) */
    comparison: zod_1.z.object({
        spendChange: zod_1.z.number(),
        revenueChange: zod_1.z.number(),
        roasChange: zod_1.z.number(),
        ctrChange: zod_1.z.number(),
    }).optional(),
}).strict();
// ===========================================================================
// INT-PCT-002: PCT Settings Integration
// ===========================================================================
// ---------------------------------------------------------------------------
// Configuration Schema
// ---------------------------------------------------------------------------
exports.PctConfigurationSchema = zod_1.z.object({
    /** Default currency for reporting */
    defaultCurrency: zod_1.z.string().default("USD"),
    /** Default time zone */
    defaultTimezone: zod_1.z.string().default("America/New_York"),
    /** Default date range (days) */
    defaultDateRange: zod_1.z.number().int().positive().default(30),
    /** Attribution window (days) */
    attributionWindow: zod_1.z.number().int().positive().default(7),
    /** Attribution model */
    attributionModel: zod_1.z.enum([
        "last_click",
        "first_click",
        "linear",
        "time_decay",
        "position_based",
        "data_driven",
    ]).default("last_click"),
    /** Connected ad platforms */
    connectedPlatforms: zod_1.z.array(zod_1.z.object({
        platform: zod_1.z.enum(["meta", "google", "tiktok", "linkedin", "twitter", "pinterest", "snapchat"]),
        accountId: zod_1.z.string(),
        accountName: zod_1.z.string(),
        connected: zod_1.z.boolean(),
        lastSynced: zod_1.z.string().datetime().optional(),
        syncStatus: zod_1.z.enum(["synced", "syncing", "error", "disconnected"]),
    })),
    /** Budget alert thresholds */
    budgetAlerts: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        warningThreshold: zod_1.z.number().min(0).max(1).default(0.8),
        criticalThreshold: zod_1.z.number().min(0).max(1).default(0.95),
    }),
    /** Performance alert thresholds */
    performanceAlerts: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        roasMinimum: zod_1.z.number().nonnegative().default(1.0),
        cpaMaximum: zod_1.z.number().nonnegative().optional(),
        ctrMinimum: zod_1.z.number().min(0).max(1).optional(),
    }),
}).strict();
// ---------------------------------------------------------------------------
// Feature Toggles
// ---------------------------------------------------------------------------
exports.PctFeatureTogglesSchema = zod_1.z.object({
    /** Enable AI-powered creative scoring */
    aiCreativeScoring: zod_1.z.boolean().default(true),
    /** Enable automated A/B testing */
    autoAbTesting: zod_1.z.boolean().default(false),
    /** Enable cross-platform comparison */
    crossPlatformAnalytics: zod_1.z.boolean().default(true),
    /** Enable predictive budget allocation */
    predictiveBudgeting: zod_1.z.boolean().default(false),
    /** Enable creative fatigue detection */
    fatigueDetection: zod_1.z.boolean().default(true),
    /** Enable audience insights */
    audienceInsights: zod_1.z.boolean().default(true),
    /** Enable automated reporting */
    automatedReports: zod_1.z.boolean().default(false),
    /** Enable competitor analysis */
    competitorAnalysis: zod_1.z.boolean().default(false),
    /** Enable real-time bid adjustments */
    realtimeBidding: zod_1.z.boolean().default(false),
}).strict();
// ---------------------------------------------------------------------------
// Notification Preferences
// ---------------------------------------------------------------------------
exports.PctNotificationPreferencesSchema = zod_1.z.object({
    /** Notification channels */
    channels: zod_1.z.object({
        email: zod_1.z.boolean().default(true),
        inApp: zod_1.z.boolean().default(true),
        slack: zod_1.z.boolean().default(false),
        sms: zod_1.z.boolean().default(false),
    }),
    /** Notification types to subscribe to */
    subscriptions: zod_1.z.object({
        budgetAlerts: zod_1.z.boolean().default(true),
        performanceAlerts: zod_1.z.boolean().default(true),
        campaignStatusChanges: zod_1.z.boolean().default(true),
        weeklyDigest: zod_1.z.boolean().default(true),
        monthlyReport: zod_1.z.boolean().default(true),
        creativeScoreUpdates: zod_1.z.boolean().default(false),
        syncErrors: zod_1.z.boolean().default(true),
    }),
    /** Quiet hours */
    quietHours: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        start: zod_1.z.string().default("22:00"),
        end: zod_1.z.string().default("08:00"),
        timezone: zod_1.z.string().default("America/New_York"),
    }),
    /** Digest frequency */
    digestFrequency: zod_1.z.enum(["daily", "weekly", "monthly"]).default("weekly"),
}).strict();
// ---------------------------------------------------------------------------
// PCT Settings Aggregate
// ---------------------------------------------------------------------------
exports.PctSettingsSchema = zod_1.z.object({
    configuration: exports.PctConfigurationSchema,
    featureToggles: exports.PctFeatureTogglesSchema,
    notificationPreferences: exports.PctNotificationPreferencesSchema,
}).strict();
//# sourceMappingURL=pct-integration.js.map