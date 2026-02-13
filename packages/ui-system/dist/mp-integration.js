"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MpSettingsSchema = exports.ContentRulesConfigSchema = exports.ContentRuleSchema = exports.PostingScheduleSchema = exports.PostingScheduleSlotSchema = exports.ConnectedAccountSchema = exports.MpAnalyticsDashboardSchema = exports.PlatformBreakdownSchema = exports.ScheduleAdherenceSchema = exports.PostPerformanceSchema = exports.PostFormatSchema = exports.SocialPlatformSchema = void 0;
/**
 * INT-MP-001: MediaPoster Analytics Integration
 * INT-MP-002: MediaPoster Settings Integration
 *
 * Type definitions and Zod schemas for MediaPoster product
 * analytics dashboards and settings panels.
 */
const zod_1 = require("zod");
// ===========================================================================
// INT-MP-001: MediaPoster Analytics
// ===========================================================================
// ---------------------------------------------------------------------------
// Social Platforms
// ---------------------------------------------------------------------------
exports.SocialPlatformSchema = zod_1.z.enum([
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
// ---------------------------------------------------------------------------
// Post Performance
// ---------------------------------------------------------------------------
exports.PostFormatSchema = zod_1.z.enum([
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
exports.PostPerformanceSchema = zod_1.z.object({
    /** Post identifier */
    postId: zod_1.z.string(),
    /** Post title / caption (truncated) */
    caption: zod_1.z.string(),
    /** Platform */
    platform: exports.SocialPlatformSchema,
    /** Post format */
    format: exports.PostFormatSchema,
    /** Published timestamp */
    publishedAt: zod_1.z.string().datetime(),
    /** Scheduled timestamp (if was scheduled) */
    scheduledAt: zod_1.z.string().datetime().optional(),
    /** Impressions / reach */
    impressions: zod_1.z.number().int().nonnegative(),
    /** Unique reach */
    reach: zod_1.z.number().int().nonnegative(),
    /** Likes / reactions */
    likes: zod_1.z.number().int().nonnegative(),
    /** Comments */
    comments: zod_1.z.number().int().nonnegative(),
    /** Shares / reposts */
    shares: zod_1.z.number().int().nonnegative(),
    /** Saves / bookmarks */
    saves: zod_1.z.number().int().nonnegative(),
    /** Link clicks */
    clicks: zod_1.z.number().int().nonnegative(),
    /** Profile visits from post */
    profileVisits: zod_1.z.number().int().nonnegative(),
    /** Follows gained from post */
    followsGained: zod_1.z.number().int().nonnegative(),
    /** Engagement rate */
    engagementRate: zod_1.z.number().min(0).max(1),
    /** Video views (if video content) */
    videoViews: zod_1.z.number().int().nonnegative().optional(),
    /** Average watch time in seconds (if video) */
    avgWatchTime: zod_1.z.number().nonnegative().optional(),
    /** Hashtag performance */
    hashtagPerformance: zod_1.z.array(zod_1.z.object({
        hashtag: zod_1.z.string(),
        impressionsFromHashtag: zod_1.z.number().int().nonnegative(),
    })).optional(),
    /** Best performing time-of-day bucket */
    bestTimeOfDay: zod_1.z.string().optional(),
    /** Post performance score (0-100) */
    performanceScore: zod_1.z.number().min(0).max(100),
}).strict();
// ---------------------------------------------------------------------------
// Schedule Adherence
// ---------------------------------------------------------------------------
exports.ScheduleAdherenceSchema = zod_1.z.object({
    /** Total posts scheduled in period */
    totalScheduled: zod_1.z.number().int().nonnegative(),
    /** Posts published on time */
    publishedOnTime: zod_1.z.number().int().nonnegative(),
    /** Posts published late */
    publishedLate: zod_1.z.number().int().nonnegative(),
    /** Posts missed / not published */
    missed: zod_1.z.number().int().nonnegative(),
    /** Posts rescheduled */
    rescheduled: zod_1.z.number().int().nonnegative(),
    /** Adherence rate (0-1) */
    adherenceRate: zod_1.z.number().min(0).max(1),
    /** Average delay when late (minutes) */
    avgDelayMinutes: zod_1.z.number().nonnegative(),
    /** Breakdown by platform */
    byPlatform: zod_1.z.record(exports.SocialPlatformSchema, zod_1.z.object({
        scheduled: zod_1.z.number().int().nonnegative(),
        onTime: zod_1.z.number().int().nonnegative(),
        late: zod_1.z.number().int().nonnegative(),
        missed: zod_1.z.number().int().nonnegative(),
    })),
    /** Breakdown by day of week */
    byDayOfWeek: zod_1.z.record(zod_1.z.string(), zod_1.z.number().int().nonnegative()),
    /** Period */
    period: zod_1.z.object({
        start: zod_1.z.string().datetime(),
        end: zod_1.z.string().datetime(),
    }),
}).strict();
// ---------------------------------------------------------------------------
// Platform Breakdown
// ---------------------------------------------------------------------------
exports.PlatformBreakdownSchema = zod_1.z.object({
    /** Platform */
    platform: exports.SocialPlatformSchema,
    /** Follower count */
    followers: zod_1.z.number().int().nonnegative(),
    /** Follower growth in period */
    followerGrowth: zod_1.z.number().int(),
    /** Follower growth rate */
    followerGrowthRate: zod_1.z.number(),
    /** Total posts in period */
    totalPosts: zod_1.z.number().int().nonnegative(),
    /** Average engagement rate */
    avgEngagementRate: zod_1.z.number().min(0).max(1),
    /** Total impressions */
    totalImpressions: zod_1.z.number().int().nonnegative(),
    /** Total reach */
    totalReach: zod_1.z.number().int().nonnegative(),
    /** Best performing format */
    bestFormat: exports.PostFormatSchema,
    /** Best performing day of week */
    bestDay: zod_1.z.string(),
    /** Best performing time of day */
    bestTime: zod_1.z.string(),
    /** Platform health score (0-100) */
    healthScore: zod_1.z.number().min(0).max(100),
    /** Account status */
    accountStatus: zod_1.z.enum(["active", "limited", "suspended", "disconnected"]),
}).strict();
// ---------------------------------------------------------------------------
// MediaPoster Analytics Dashboard
// ---------------------------------------------------------------------------
exports.MpAnalyticsDashboardSchema = zod_1.z.object({
    /** Time range */
    timeRange: zod_1.z.object({
        start: zod_1.z.string().datetime(),
        end: zod_1.z.string().datetime(),
        granularity: zod_1.z.enum(["hour", "day", "week", "month"]),
    }),
    /** Recent post performance */
    recentPosts: zod_1.z.array(exports.PostPerformanceSchema),
    /** Schedule adherence */
    scheduleAdherence: exports.ScheduleAdherenceSchema,
    /** Platform breakdowns */
    platformBreakdowns: zod_1.z.array(exports.PlatformBreakdownSchema),
    /** Aggregate metrics */
    aggregates: zod_1.z.object({
        totalPosts: zod_1.z.number().int().nonnegative(),
        totalImpressions: zod_1.z.number().int().nonnegative(),
        totalEngagements: zod_1.z.number().int().nonnegative(),
        avgEngagementRate: zod_1.z.number().min(0).max(1),
        totalFollowerGrowth: zod_1.z.number().int(),
        topPostId: zod_1.z.string().optional(),
    }),
}).strict();
// ===========================================================================
// INT-MP-002: MediaPoster Settings
// ===========================================================================
// ---------------------------------------------------------------------------
// Connected Accounts
// ---------------------------------------------------------------------------
exports.ConnectedAccountSchema = zod_1.z.object({
    /** Account identifier */
    id: zod_1.z.string(),
    /** Platform */
    platform: exports.SocialPlatformSchema,
    /** Account username / handle */
    username: zod_1.z.string(),
    /** Display name */
    displayName: zod_1.z.string(),
    /** Profile image URL */
    avatarUrl: zod_1.z.string().url().optional(),
    /** Connection status */
    status: zod_1.z.enum(["connected", "expired", "revoked", "error"]),
    /** Token expiry date */
    tokenExpiresAt: zod_1.z.string().datetime().optional(),
    /** Last successful sync */
    lastSyncedAt: zod_1.z.string().datetime().optional(),
    /** Permissions granted */
    permissions: zod_1.z.array(zod_1.z.string()),
    /** Is this the default account for the platform */
    isDefault: zod_1.z.boolean().default(false),
    /** Connected timestamp */
    connectedAt: zod_1.z.string().datetime(),
}).strict();
// ---------------------------------------------------------------------------
// Posting Schedule
// ---------------------------------------------------------------------------
exports.PostingScheduleSlotSchema = zod_1.z.object({
    /** Day of week */
    day: zod_1.z.enum([
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    ]),
    /** Time (HH:MM format) */
    time: zod_1.z.string().regex(/^\d{2}:\d{2}$/),
    /** Platforms for this slot */
    platforms: zod_1.z.array(exports.SocialPlatformSchema),
    /** Whether this slot is active */
    active: zod_1.z.boolean().default(true),
}).strict();
exports.PostingScheduleSchema = zod_1.z.object({
    /** Schedule slots */
    slots: zod_1.z.array(exports.PostingScheduleSlotSchema).default([]),
    /** Timezone */
    timezone: zod_1.z.string().default("America/New_York"),
    /** Enable auto-scheduling (AI picks optimal times) */
    autoSchedule: zod_1.z.boolean().default(false),
    /** Minimum gap between posts on same platform (minutes) */
    minGapMinutes: zod_1.z.number().int().nonnegative().default(60),
    /** Maximum posts per day per platform */
    maxPostsPerDayPerPlatform: zod_1.z.number().int().positive().default(3),
    /** Queue behavior when slot is full */
    overflowBehavior: zod_1.z.enum(["skip", "next_slot", "next_day"]).default("next_slot"),
}).strict();
// ---------------------------------------------------------------------------
// Content Rules
// ---------------------------------------------------------------------------
exports.ContentRuleSchema = zod_1.z.object({
    /** Rule identifier */
    id: zod_1.z.string(),
    /** Rule name */
    name: zod_1.z.string(),
    /** Rule description */
    description: zod_1.z.string(),
    /** Rule type */
    type: zod_1.z.enum([
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
    platforms: zod_1.z.array(exports.SocialPlatformSchema).default([]),
    /** Rule value */
    value: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.array(zod_1.z.string())]),
    /** Whether this rule is active */
    active: zod_1.z.boolean().default(true),
    /** Severity (error blocks publishing, warning just warns) */
    severity: zod_1.z.enum(["error", "warning"]).default("error"),
}).strict();
exports.ContentRulesConfigSchema = zod_1.z.object({
    /** Content rules */
    rules: zod_1.z.array(exports.ContentRuleSchema).default([]),
    /** Enable content rules */
    enabled: zod_1.z.boolean().default(true),
    /** Block publishing on rule violation */
    blockOnViolation: zod_1.z.boolean().default(true),
}).strict();
// ---------------------------------------------------------------------------
// MediaPoster Settings Aggregate
// ---------------------------------------------------------------------------
exports.MpSettingsSchema = zod_1.z.object({
    connectedAccounts: zod_1.z.array(exports.ConnectedAccountSchema),
    postingSchedule: exports.PostingScheduleSchema,
    contentRules: exports.ContentRulesConfigSchema,
}).strict();
//# sourceMappingURL=mp-integration.js.map