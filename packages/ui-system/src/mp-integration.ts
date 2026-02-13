/**
 * INT-MP-001: MediaPoster Analytics Integration
 * INT-MP-002: MediaPoster Settings Integration
 *
 * Type definitions and Zod schemas for MediaPoster product
 * analytics dashboards and settings panels.
 */
import { z } from "zod";

// ===========================================================================
// INT-MP-001: MediaPoster Analytics
// ===========================================================================

// ---------------------------------------------------------------------------
// Social Platforms
// ---------------------------------------------------------------------------

export const SocialPlatformSchema = z.enum([
  "instagram",
  "facebook",
  "twitter",
  "linkedin",
  "tiktok",
  "youtube",
  "pinterest",
  "threads",
  "bluesky",
  "mastodon",
]);
export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;

// ---------------------------------------------------------------------------
// Post Performance
// ---------------------------------------------------------------------------

export const PostFormatSchema = z.enum([
  "image",
  "video",
  "carousel",
  "text",
  "story",
  "reel",
  "poll",
  "link",
  "thread",
]);
export type PostFormat = z.infer<typeof PostFormatSchema>;

export const PostPerformanceSchema = z.object({
  /** Post identifier */
  postId: z.string(),
  /** Post title / caption (truncated) */
  caption: z.string(),
  /** Platform */
  platform: SocialPlatformSchema,
  /** Post format */
  format: PostFormatSchema,
  /** Published timestamp */
  publishedAt: z.string().datetime(),
  /** Scheduled timestamp (if was scheduled) */
  scheduledAt: z.string().datetime().optional(),
  /** Impressions / reach */
  impressions: z.number().int().nonnegative(),
  /** Unique reach */
  reach: z.number().int().nonnegative(),
  /** Likes / reactions */
  likes: z.number().int().nonnegative(),
  /** Comments */
  comments: z.number().int().nonnegative(),
  /** Shares / reposts */
  shares: z.number().int().nonnegative(),
  /** Saves / bookmarks */
  saves: z.number().int().nonnegative(),
  /** Link clicks */
  clicks: z.number().int().nonnegative(),
  /** Profile visits from post */
  profileVisits: z.number().int().nonnegative(),
  /** Follows gained from post */
  followsGained: z.number().int().nonnegative(),
  /** Engagement rate */
  engagementRate: z.number().min(0).max(1),
  /** Video views (if video content) */
  videoViews: z.number().int().nonnegative().optional(),
  /** Average watch time in seconds (if video) */
  avgWatchTime: z.number().nonnegative().optional(),
  /** Hashtag performance */
  hashtagPerformance: z.array(z.object({
    hashtag: z.string(),
    impressionsFromHashtag: z.number().int().nonnegative(),
  })).optional(),
  /** Best performing time-of-day bucket */
  bestTimeOfDay: z.string().optional(),
  /** Post performance score (0-100) */
  performanceScore: z.number().min(0).max(100),
}).strict();

export type PostPerformance = z.infer<typeof PostPerformanceSchema>;

// ---------------------------------------------------------------------------
// Schedule Adherence
// ---------------------------------------------------------------------------

export const ScheduleAdherenceSchema = z.object({
  /** Total posts scheduled in period */
  totalScheduled: z.number().int().nonnegative(),
  /** Posts published on time */
  publishedOnTime: z.number().int().nonnegative(),
  /** Posts published late */
  publishedLate: z.number().int().nonnegative(),
  /** Posts missed / not published */
  missed: z.number().int().nonnegative(),
  /** Posts rescheduled */
  rescheduled: z.number().int().nonnegative(),
  /** Adherence rate (0-1) */
  adherenceRate: z.number().min(0).max(1),
  /** Average delay when late (minutes) */
  avgDelayMinutes: z.number().nonnegative(),
  /** Breakdown by platform */
  byPlatform: z.record(SocialPlatformSchema, z.object({
    scheduled: z.number().int().nonnegative(),
    onTime: z.number().int().nonnegative(),
    late: z.number().int().nonnegative(),
    missed: z.number().int().nonnegative(),
  })),
  /** Breakdown by day of week */
  byDayOfWeek: z.record(z.string(), z.number().int().nonnegative()),
  /** Period */
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
}).strict();

export type ScheduleAdherence = z.infer<typeof ScheduleAdherenceSchema>;

// ---------------------------------------------------------------------------
// Platform Breakdown
// ---------------------------------------------------------------------------

export const PlatformBreakdownSchema = z.object({
  /** Platform */
  platform: SocialPlatformSchema,
  /** Follower count */
  followers: z.number().int().nonnegative(),
  /** Follower growth in period */
  followerGrowth: z.number().int(),
  /** Follower growth rate */
  followerGrowthRate: z.number(),
  /** Total posts in period */
  totalPosts: z.number().int().nonnegative(),
  /** Average engagement rate */
  avgEngagementRate: z.number().min(0).max(1),
  /** Total impressions */
  totalImpressions: z.number().int().nonnegative(),
  /** Total reach */
  totalReach: z.number().int().nonnegative(),
  /** Best performing format */
  bestFormat: PostFormatSchema,
  /** Best performing day of week */
  bestDay: z.string(),
  /** Best performing time of day */
  bestTime: z.string(),
  /** Platform health score (0-100) */
  healthScore: z.number().min(0).max(100),
  /** Account status */
  accountStatus: z.enum(["active", "limited", "suspended", "disconnected"]),
}).strict();

export type PlatformBreakdown = z.infer<typeof PlatformBreakdownSchema>;

// ---------------------------------------------------------------------------
// MediaPoster Analytics Dashboard
// ---------------------------------------------------------------------------

export const MpAnalyticsDashboardSchema = z.object({
  /** Time range */
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
    granularity: z.enum(["hour", "day", "week", "month"]),
  }),
  /** Recent post performance */
  recentPosts: z.array(PostPerformanceSchema),
  /** Schedule adherence */
  scheduleAdherence: ScheduleAdherenceSchema,
  /** Platform breakdowns */
  platformBreakdowns: z.array(PlatformBreakdownSchema),
  /** Aggregate metrics */
  aggregates: z.object({
    totalPosts: z.number().int().nonnegative(),
    totalImpressions: z.number().int().nonnegative(),
    totalEngagements: z.number().int().nonnegative(),
    avgEngagementRate: z.number().min(0).max(1),
    totalFollowerGrowth: z.number().int(),
    topPostId: z.string().optional(),
  }),
}).strict();

export type MpAnalyticsDashboard = z.infer<typeof MpAnalyticsDashboardSchema>;

// ===========================================================================
// INT-MP-002: MediaPoster Settings
// ===========================================================================

// ---------------------------------------------------------------------------
// Connected Accounts
// ---------------------------------------------------------------------------

export const ConnectedAccountSchema = z.object({
  /** Account identifier */
  id: z.string(),
  /** Platform */
  platform: SocialPlatformSchema,
  /** Account username / handle */
  username: z.string(),
  /** Display name */
  displayName: z.string(),
  /** Profile image URL */
  avatarUrl: z.string().url().optional(),
  /** Connection status */
  status: z.enum(["connected", "expired", "revoked", "error"]),
  /** Token expiry date */
  tokenExpiresAt: z.string().datetime().optional(),
  /** Last successful sync */
  lastSyncedAt: z.string().datetime().optional(),
  /** Permissions granted */
  permissions: z.array(z.string()),
  /** Is this the default account for the platform */
  isDefault: z.boolean().default(false),
  /** Connected timestamp */
  connectedAt: z.string().datetime(),
}).strict();

export type ConnectedAccount = z.infer<typeof ConnectedAccountSchema>;

// ---------------------------------------------------------------------------
// Posting Schedule
// ---------------------------------------------------------------------------

export const PostingScheduleSlotSchema = z.object({
  /** Day of week */
  day: z.enum([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]),
  /** Time (HH:MM format) */
  time: z.string().regex(/^\d{2}:\d{2}$/),
  /** Platforms for this slot */
  platforms: z.array(SocialPlatformSchema),
  /** Whether this slot is active */
  active: z.boolean().default(true),
}).strict();

export type PostingScheduleSlot = z.infer<typeof PostingScheduleSlotSchema>;

export const PostingScheduleSchema = z.object({
  /** Schedule slots */
  slots: z.array(PostingScheduleSlotSchema).default([]),
  /** Timezone */
  timezone: z.string().default("America/New_York"),
  /** Enable auto-scheduling (AI picks optimal times) */
  autoSchedule: z.boolean().default(false),
  /** Minimum gap between posts on same platform (minutes) */
  minGapMinutes: z.number().int().nonnegative().default(60),
  /** Maximum posts per day per platform */
  maxPostsPerDayPerPlatform: z.number().int().positive().default(3),
  /** Queue behavior when slot is full */
  overflowBehavior: z.enum(["skip", "next_slot", "next_day"]).default("next_slot"),
}).strict();

export type PostingSchedule = z.infer<typeof PostingScheduleSchema>;

// ---------------------------------------------------------------------------
// Content Rules
// ---------------------------------------------------------------------------

export const ContentRuleSchema = z.object({
  /** Rule identifier */
  id: z.string(),
  /** Rule name */
  name: z.string(),
  /** Rule description */
  description: z.string(),
  /** Rule type */
  type: z.enum([
    "hashtag_limit",
    "mention_limit",
    "character_limit",
    "required_hashtags",
    "banned_words",
    "image_required",
    "link_required",
    "approval_required",
    "platform_specific",
    "custom",
  ]),
  /** Platforms this rule applies to (empty = all) */
  platforms: z.array(SocialPlatformSchema).default([]),
  /** Rule value */
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  /** Whether this rule is active */
  active: z.boolean().default(true),
  /** Severity (error blocks publishing, warning just warns) */
  severity: z.enum(["error", "warning"]).default("error"),
}).strict();

export type ContentRule = z.infer<typeof ContentRuleSchema>;

export const ContentRulesConfigSchema = z.object({
  /** Content rules */
  rules: z.array(ContentRuleSchema).default([]),
  /** Enable content rules */
  enabled: z.boolean().default(true),
  /** Block publishing on rule violation */
  blockOnViolation: z.boolean().default(true),
}).strict();

export type ContentRulesConfig = z.infer<typeof ContentRulesConfigSchema>;

// ---------------------------------------------------------------------------
// MediaPoster Settings Aggregate
// ---------------------------------------------------------------------------

export const MpSettingsSchema = z.object({
  connectedAccounts: z.array(ConnectedAccountSchema),
  postingSchedule: PostingScheduleSchema,
  contentRules: ContentRulesConfigSchema,
}).strict();

export type MpSettings = z.infer<typeof MpSettingsSchema>;
