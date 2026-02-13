/**
 * INT-PCT-001: PCT Analytics Integration
 * INT-PCT-002: PCT Settings Integration
 *
 * Type definitions and Zod schemas for Performance Creative Testing (PCT)
 * product analytics dashboards and settings panels.
 */
import { z } from "zod";

// ===========================================================================
// INT-PCT-001: PCT Analytics Integration
// ===========================================================================

// ---------------------------------------------------------------------------
// Ad Performance Metrics
// ---------------------------------------------------------------------------

export const AdPerformanceMetricSchema = z.object({
  /** Ad identifier */
  adId: z.string(),
  /** Ad name / title */
  adName: z.string(),
  /** Campaign identifier */
  campaignId: z.string(),
  /** Platform (Meta, Google, TikTok, etc.) */
  platform: z.enum(["meta", "google", "tiktok", "linkedin", "twitter", "pinterest", "snapchat"]),
  /** Date range start */
  dateStart: z.string().datetime(),
  /** Date range end */
  dateEnd: z.string().datetime(),
  /** Impressions */
  impressions: z.number().int().nonnegative(),
  /** Clicks */
  clicks: z.number().int().nonnegative(),
  /** Click-through rate (0-1) */
  ctr: z.number().min(0).max(1),
  /** Cost per click */
  cpc: z.number().nonnegative(),
  /** Cost per mille (1000 impressions) */
  cpm: z.number().nonnegative(),
  /** Total spend */
  spend: z.number().nonnegative(),
  /** Conversions */
  conversions: z.number().int().nonnegative(),
  /** Cost per acquisition */
  cpa: z.number().nonnegative(),
  /** Return on ad spend */
  roas: z.number().nonnegative(),
  /** Revenue generated */
  revenue: z.number().nonnegative(),
  /** Engagement rate */
  engagementRate: z.number().min(0).max(1),
  /** Video views (if applicable) */
  videoViews: z.number().int().nonnegative().optional(),
  /** Video completion rate (if applicable) */
  videoCompletionRate: z.number().min(0).max(1).optional(),
}).strict();

export type AdPerformanceMetric = z.infer<typeof AdPerformanceMetricSchema>;

// ---------------------------------------------------------------------------
// Campaign Summary
// ---------------------------------------------------------------------------

export const CampaignStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
  "error",
]);
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

export const CampaignSummarySchema = z.object({
  /** Campaign identifier */
  campaignId: z.string(),
  /** Campaign name */
  name: z.string(),
  /** Campaign status */
  status: CampaignStatusSchema,
  /** Platform */
  platform: z.enum(["meta", "google", "tiktok", "linkedin", "twitter", "pinterest", "snapchat"]),
  /** Campaign objective */
  objective: z.enum([
    "awareness",
    "traffic",
    "engagement",
    "leads",
    "conversions",
    "sales",
    "app_installs",
  ]),
  /** Budget (total or daily depending on budgetType) */
  budget: z.number().nonnegative(),
  /** Budget type */
  budgetType: z.enum(["daily", "lifetime"]),
  /** Currency code */
  currency: z.string().default("USD"),
  /** Start date */
  startDate: z.string().datetime(),
  /** End date */
  endDate: z.string().datetime().optional(),
  /** Number of ad sets / ad groups */
  adSetCount: z.number().int().nonnegative(),
  /** Number of ads */
  adCount: z.number().int().nonnegative(),
  /** Total spend to date */
  totalSpend: z.number().nonnegative(),
  /** Overall ROAS */
  overallRoas: z.number().nonnegative(),
  /** Overall CTR */
  overallCtr: z.number().min(0).max(1),
  /** Overall CPA */
  overallCpa: z.number().nonnegative(),
  /** Budget utilization (0-1) */
  budgetUtilization: z.number().min(0).max(1),
  /** Last updated timestamp */
  updatedAt: z.string().datetime(),
}).strict();

export type CampaignSummary = z.infer<typeof CampaignSummarySchema>;

// ---------------------------------------------------------------------------
// Creative Scoring
// ---------------------------------------------------------------------------

export const CreativeScoreSchema = z.object({
  /** Creative identifier */
  creativeId: z.string(),
  /** Creative name */
  name: z.string(),
  /** Creative type */
  type: z.enum(["image", "video", "carousel", "story", "text"]),
  /** Thumbnail / preview URL */
  thumbnailUrl: z.string().url().optional(),
  /** Overall performance score (0-100) */
  overallScore: z.number().min(0).max(100),
  /** Click-through score (0-100) */
  clickScore: z.number().min(0).max(100),
  /** Conversion score (0-100) */
  conversionScore: z.number().min(0).max(100),
  /** Engagement score (0-100) */
  engagementScore: z.number().min(0).max(100),
  /** Cost efficiency score (0-100) */
  costScore: z.number().min(0).max(100),
  /** Audience resonance score (0-100) */
  audienceScore: z.number().min(0).max(100),
  /** AI-generated insights / recommendations */
  insights: z.array(z.string()),
  /** Rank within campaign */
  rank: z.number().int().positive(),
  /** Performance trend */
  trend: z.enum(["improving", "stable", "declining"]),
  /** Number of active campaigns using this creative */
  activeCampaigns: z.number().int().nonnegative(),
  /** Fatigue indicator (how stale the creative is) */
  fatigueLevel: z.enum(["fresh", "moderate", "high", "critical"]),
}).strict();

export type CreativeScore = z.infer<typeof CreativeScoreSchema>;

// ---------------------------------------------------------------------------
// PCT Analytics Dashboard Aggregate
// ---------------------------------------------------------------------------

export const PctAnalyticsDashboardSchema = z.object({
  /** Time range for the dashboard view */
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
    granularity: z.enum(["hour", "day", "week", "month"]),
  }),
  /** Campaign summaries */
  campaigns: z.array(CampaignSummarySchema),
  /** Top performing ads */
  topAds: z.array(AdPerformanceMetricSchema),
  /** Creative scores */
  creativeScores: z.array(CreativeScoreSchema),
  /** Aggregate metrics */
  aggregates: z.object({
    totalSpend: z.number(),
    totalRevenue: z.number(),
    averageRoas: z.number(),
    averageCtr: z.number(),
    averageCpa: z.number(),
    totalImpressions: z.number(),
    totalClicks: z.number(),
    totalConversions: z.number(),
  }),
  /** Comparison period metrics (for trend arrows) */
  comparison: z.object({
    spendChange: z.number(),
    revenueChange: z.number(),
    roasChange: z.number(),
    ctrChange: z.number(),
  }).optional(),
}).strict();

export type PctAnalyticsDashboard = z.infer<typeof PctAnalyticsDashboardSchema>;

// ===========================================================================
// INT-PCT-002: PCT Settings Integration
// ===========================================================================

// ---------------------------------------------------------------------------
// Configuration Schema
// ---------------------------------------------------------------------------

export const PctConfigurationSchema = z.object({
  /** Default currency for reporting */
  defaultCurrency: z.string().default("USD"),
  /** Default time zone */
  defaultTimezone: z.string().default("America/New_York"),
  /** Default date range (days) */
  defaultDateRange: z.number().int().positive().default(30),
  /** Attribution window (days) */
  attributionWindow: z.number().int().positive().default(7),
  /** Attribution model */
  attributionModel: z.enum([
    "last_click",
    "first_click",
    "linear",
    "time_decay",
    "position_based",
    "data_driven",
  ]).default("last_click"),
  /** Connected ad platforms */
  connectedPlatforms: z.array(z.object({
    platform: z.enum(["meta", "google", "tiktok", "linkedin", "twitter", "pinterest", "snapchat"]),
    accountId: z.string(),
    accountName: z.string(),
    connected: z.boolean(),
    lastSynced: z.string().datetime().optional(),
    syncStatus: z.enum(["synced", "syncing", "error", "disconnected"]),
  })),
  /** Budget alert thresholds */
  budgetAlerts: z.object({
    enabled: z.boolean().default(true),
    warningThreshold: z.number().min(0).max(1).default(0.8),
    criticalThreshold: z.number().min(0).max(1).default(0.95),
  }),
  /** Performance alert thresholds */
  performanceAlerts: z.object({
    enabled: z.boolean().default(true),
    roasMinimum: z.number().nonnegative().default(1.0),
    cpaMaximum: z.number().nonnegative().optional(),
    ctrMinimum: z.number().min(0).max(1).optional(),
  }),
}).strict();

export type PctConfiguration = z.infer<typeof PctConfigurationSchema>;

// ---------------------------------------------------------------------------
// Feature Toggles
// ---------------------------------------------------------------------------

export const PctFeatureTogglesSchema = z.object({
  /** Enable AI-powered creative scoring */
  aiCreativeScoring: z.boolean().default(true),
  /** Enable automated A/B testing */
  autoAbTesting: z.boolean().default(false),
  /** Enable cross-platform comparison */
  crossPlatformAnalytics: z.boolean().default(true),
  /** Enable predictive budget allocation */
  predictiveBudgeting: z.boolean().default(false),
  /** Enable creative fatigue detection */
  fatigueDetection: z.boolean().default(true),
  /** Enable audience insights */
  audienceInsights: z.boolean().default(true),
  /** Enable automated reporting */
  automatedReports: z.boolean().default(false),
  /** Enable competitor analysis */
  competitorAnalysis: z.boolean().default(false),
  /** Enable real-time bid adjustments */
  realtimeBidding: z.boolean().default(false),
}).strict();

export type PctFeatureToggles = z.infer<typeof PctFeatureTogglesSchema>;

// ---------------------------------------------------------------------------
// Notification Preferences
// ---------------------------------------------------------------------------

export const PctNotificationPreferencesSchema = z.object({
  /** Notification channels */
  channels: z.object({
    email: z.boolean().default(true),
    inApp: z.boolean().default(true),
    slack: z.boolean().default(false),
    sms: z.boolean().default(false),
  }),
  /** Notification types to subscribe to */
  subscriptions: z.object({
    budgetAlerts: z.boolean().default(true),
    performanceAlerts: z.boolean().default(true),
    campaignStatusChanges: z.boolean().default(true),
    weeklyDigest: z.boolean().default(true),
    monthlyReport: z.boolean().default(true),
    creativeScoreUpdates: z.boolean().default(false),
    syncErrors: z.boolean().default(true),
  }),
  /** Quiet hours */
  quietHours: z.object({
    enabled: z.boolean().default(false),
    start: z.string().default("22:00"),
    end: z.string().default("08:00"),
    timezone: z.string().default("America/New_York"),
  }),
  /** Digest frequency */
  digestFrequency: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
}).strict();

export type PctNotificationPreferences = z.infer<typeof PctNotificationPreferencesSchema>;

// ---------------------------------------------------------------------------
// PCT Settings Aggregate
// ---------------------------------------------------------------------------

export const PctSettingsSchema = z.object({
  configuration: PctConfigurationSchema,
  featureToggles: PctFeatureTogglesSchema,
  notificationPreferences: PctNotificationPreferencesSchema,
}).strict();

export type PctSettings = z.infer<typeof PctSettingsSchema>;
