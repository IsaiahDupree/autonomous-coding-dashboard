/**
 * INT-MP-001: MediaPoster Analytics Integration
 * INT-MP-002: MediaPoster Settings Integration
 *
 * Type definitions and Zod schemas for MediaPoster product
 * analytics dashboards and settings panels.
 */
import { z } from "zod";
export declare const SocialPlatformSchema: z.ZodEnum<["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "pinterest", "threads", "bluesky", "mastodon"]>;
export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;
export declare const PostFormatSchema: z.ZodEnum<["image", "video", "carousel", "text", "story", "reel", "poll", "link", "thread"]>;
export type PostFormat = z.infer<typeof PostFormatSchema>;
export declare const PostPerformanceSchema: z.ZodObject<{
    /** Post identifier */
    postId: z.ZodString;
    /** Post title / caption (truncated) */
    caption: z.ZodString;
    /** Platform */
    platform: z.ZodEnum<["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "pinterest", "threads", "bluesky", "mastodon"]>;
    /** Post format */
    format: z.ZodEnum<["image", "video", "carousel", "text", "story", "reel", "poll", "link", "thread"]>;
    /** Published timestamp */
    publishedAt: z.ZodString;
    /** Scheduled timestamp (if was scheduled) */
    scheduledAt: z.ZodOptional<z.ZodString>;
    /** Impressions / reach */
    impressions: z.ZodNumber;
    /** Unique reach */
    reach: z.ZodNumber;
    /** Likes / reactions */
    likes: z.ZodNumber;
    /** Comments */
    comments: z.ZodNumber;
    /** Shares / reposts */
    shares: z.ZodNumber;
    /** Saves / bookmarks */
    saves: z.ZodNumber;
    /** Link clicks */
    clicks: z.ZodNumber;
    /** Profile visits from post */
    profileVisits: z.ZodNumber;
    /** Follows gained from post */
    followsGained: z.ZodNumber;
    /** Engagement rate */
    engagementRate: z.ZodNumber;
    /** Video views (if video content) */
    videoViews: z.ZodOptional<z.ZodNumber>;
    /** Average watch time in seconds (if video) */
    avgWatchTime: z.ZodOptional<z.ZodNumber>;
    /** Hashtag performance */
    hashtagPerformance: z.ZodOptional<z.ZodArray<z.ZodObject<{
        hashtag: z.ZodString;
        impressionsFromHashtag: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        hashtag: string;
        impressionsFromHashtag: number;
    }, {
        hashtag: string;
        impressionsFromHashtag: number;
    }>, "many">>;
    /** Best performing time-of-day bucket */
    bestTimeOfDay: z.ZodOptional<z.ZodString>;
    /** Post performance score (0-100) */
    performanceScore: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    publishedAt: string;
    comments: number;
    likes: number;
    format: "text" | "image" | "video" | "carousel" | "story" | "reel" | "poll" | "link" | "thread";
    platform: "tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon";
    impressions: number;
    clicks: number;
    engagementRate: number;
    postId: string;
    caption: string;
    reach: number;
    shares: number;
    saves: number;
    profileVisits: number;
    followsGained: number;
    performanceScore: number;
    videoViews?: number | undefined;
    scheduledAt?: string | undefined;
    avgWatchTime?: number | undefined;
    hashtagPerformance?: {
        hashtag: string;
        impressionsFromHashtag: number;
    }[] | undefined;
    bestTimeOfDay?: string | undefined;
}, {
    publishedAt: string;
    comments: number;
    likes: number;
    format: "text" | "image" | "video" | "carousel" | "story" | "reel" | "poll" | "link" | "thread";
    platform: "tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon";
    impressions: number;
    clicks: number;
    engagementRate: number;
    postId: string;
    caption: string;
    reach: number;
    shares: number;
    saves: number;
    profileVisits: number;
    followsGained: number;
    performanceScore: number;
    videoViews?: number | undefined;
    scheduledAt?: string | undefined;
    avgWatchTime?: number | undefined;
    hashtagPerformance?: {
        hashtag: string;
        impressionsFromHashtag: number;
    }[] | undefined;
    bestTimeOfDay?: string | undefined;
}>;
export type PostPerformance = z.infer<typeof PostPerformanceSchema>;
export declare const ScheduleAdherenceSchema: z.ZodObject<{
    /** Total posts scheduled in period */
    totalScheduled: z.ZodNumber;
    /** Posts published on time */
    publishedOnTime: z.ZodNumber;
    /** Posts published late */
    publishedLate: z.ZodNumber;
    /** Posts missed / not published */
    missed: z.ZodNumber;
    /** Posts rescheduled */
    rescheduled: z.ZodNumber;
    /** Adherence rate (0-1) */
    adherenceRate: z.ZodNumber;
    /** Average delay when late (minutes) */
    avgDelayMinutes: z.ZodNumber;
    /** Breakdown by platform */
    byPlatform: z.ZodRecord<z.ZodEnum<["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "pinterest", "threads", "bluesky", "mastodon"]>, z.ZodObject<{
        scheduled: z.ZodNumber;
        onTime: z.ZodNumber;
        late: z.ZodNumber;
        missed: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        scheduled: number;
        missed: number;
        onTime: number;
        late: number;
    }, {
        scheduled: number;
        missed: number;
        onTime: number;
        late: number;
    }>>;
    /** Breakdown by day of week */
    byDayOfWeek: z.ZodRecord<z.ZodString, z.ZodNumber>;
    /** Period */
    period: z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>;
}, "strict", z.ZodTypeAny, {
    period: {
        start: string;
        end: string;
    };
    totalScheduled: number;
    publishedOnTime: number;
    publishedLate: number;
    missed: number;
    rescheduled: number;
    adherenceRate: number;
    avgDelayMinutes: number;
    byPlatform: Partial<Record<"tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon", {
        scheduled: number;
        missed: number;
        onTime: number;
        late: number;
    }>>;
    byDayOfWeek: Record<string, number>;
}, {
    period: {
        start: string;
        end: string;
    };
    totalScheduled: number;
    publishedOnTime: number;
    publishedLate: number;
    missed: number;
    rescheduled: number;
    adherenceRate: number;
    avgDelayMinutes: number;
    byPlatform: Partial<Record<"tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon", {
        scheduled: number;
        missed: number;
        onTime: number;
        late: number;
    }>>;
    byDayOfWeek: Record<string, number>;
}>;
export type ScheduleAdherence = z.infer<typeof ScheduleAdherenceSchema>;
export declare const PlatformBreakdownSchema: z.ZodObject<{
    /** Platform */
    platform: z.ZodEnum<["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "pinterest", "threads", "bluesky", "mastodon"]>;
    /** Follower count */
    followers: z.ZodNumber;
    /** Follower growth in period */
    followerGrowth: z.ZodNumber;
    /** Follower growth rate */
    followerGrowthRate: z.ZodNumber;
    /** Total posts in period */
    totalPosts: z.ZodNumber;
    /** Average engagement rate */
    avgEngagementRate: z.ZodNumber;
    /** Total impressions */
    totalImpressions: z.ZodNumber;
    /** Total reach */
    totalReach: z.ZodNumber;
    /** Best performing format */
    bestFormat: z.ZodEnum<["image", "video", "carousel", "text", "story", "reel", "poll", "link", "thread"]>;
    /** Best performing day of week */
    bestDay: z.ZodString;
    /** Best performing time of day */
    bestTime: z.ZodString;
    /** Platform health score (0-100) */
    healthScore: z.ZodNumber;
    /** Account status */
    accountStatus: z.ZodEnum<["active", "limited", "suspended", "disconnected"]>;
}, "strict", z.ZodTypeAny, {
    platform: "tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon";
    totalImpressions: number;
    followers: number;
    followerGrowth: number;
    followerGrowthRate: number;
    totalPosts: number;
    avgEngagementRate: number;
    totalReach: number;
    bestFormat: "text" | "image" | "video" | "carousel" | "story" | "reel" | "poll" | "link" | "thread";
    bestDay: string;
    bestTime: string;
    healthScore: number;
    accountStatus: "active" | "disconnected" | "limited" | "suspended";
}, {
    platform: "tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon";
    totalImpressions: number;
    followers: number;
    followerGrowth: number;
    followerGrowthRate: number;
    totalPosts: number;
    avgEngagementRate: number;
    totalReach: number;
    bestFormat: "text" | "image" | "video" | "carousel" | "story" | "reel" | "poll" | "link" | "thread";
    bestDay: string;
    bestTime: string;
    healthScore: number;
    accountStatus: "active" | "disconnected" | "limited" | "suspended";
}>;
export type PlatformBreakdown = z.infer<typeof PlatformBreakdownSchema>;
export declare const MpAnalyticsDashboardSchema: z.ZodObject<{
    /** Time range */
    timeRange: z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
        granularity: z.ZodEnum<["hour", "day", "week", "month"]>;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
        granularity: "hour" | "day" | "week" | "month";
    }, {
        start: string;
        end: string;
        granularity: "hour" | "day" | "week" | "month";
    }>;
    /** Recent post performance */
    recentPosts: z.ZodArray<z.ZodObject<{
        /** Post identifier */
        postId: z.ZodString;
        /** Post title / caption (truncated) */
        caption: z.ZodString;
        /** Platform */
        platform: z.ZodEnum<["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "pinterest", "threads", "bluesky", "mastodon"]>;
        /** Post format */
        format: z.ZodEnum<["image", "video", "carousel", "text", "story", "reel", "poll", "link", "thread"]>;
        /** Published timestamp */
        publishedAt: z.ZodString;
        /** Scheduled timestamp (if was scheduled) */
        scheduledAt: z.ZodOptional<z.ZodString>;
        /** Impressions / reach */
        impressions: z.ZodNumber;
        /** Unique reach */
        reach: z.ZodNumber;
        /** Likes / reactions */
        likes: z.ZodNumber;
        /** Comments */
        comments: z.ZodNumber;
        /** Shares / reposts */
        shares: z.ZodNumber;
        /** Saves / bookmarks */
        saves: z.ZodNumber;
        /** Link clicks */
        clicks: z.ZodNumber;
        /** Profile visits from post */
        profileVisits: z.ZodNumber;
        /** Follows gained from post */
        followsGained: z.ZodNumber;
        /** Engagement rate */
        engagementRate: z.ZodNumber;
        /** Video views (if video content) */
        videoViews: z.ZodOptional<z.ZodNumber>;
        /** Average watch time in seconds (if video) */
        avgWatchTime: z.ZodOptional<z.ZodNumber>;
        /** Hashtag performance */
        hashtagPerformance: z.ZodOptional<z.ZodArray<z.ZodObject<{
            hashtag: z.ZodString;
            impressionsFromHashtag: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            hashtag: string;
            impressionsFromHashtag: number;
        }, {
            hashtag: string;
            impressionsFromHashtag: number;
        }>, "many">>;
        /** Best performing time-of-day bucket */
        bestTimeOfDay: z.ZodOptional<z.ZodString>;
        /** Post performance score (0-100) */
        performanceScore: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        publishedAt: string;
        comments: number;
        likes: number;
        format: "text" | "image" | "video" | "carousel" | "story" | "reel" | "poll" | "link" | "thread";
        platform: "tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon";
        impressions: number;
        clicks: number;
        engagementRate: number;
        postId: string;
        caption: string;
        reach: number;
        shares: number;
        saves: number;
        profileVisits: number;
        followsGained: number;
        performanceScore: number;
        videoViews?: number | undefined;
        scheduledAt?: string | undefined;
        avgWatchTime?: number | undefined;
        hashtagPerformance?: {
            hashtag: string;
            impressionsFromHashtag: number;
        }[] | undefined;
        bestTimeOfDay?: string | undefined;
    }, {
        publishedAt: string;
        comments: number;
        likes: number;
        format: "text" | "image" | "video" | "carousel" | "story" | "reel" | "poll" | "link" | "thread";
        platform: "tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon";
        impressions: number;
        clicks: number;
        engagementRate: number;
        postId: string;
        caption: string;
        reach: number;
        shares: number;
        saves: number;
        profileVisits: number;
        followsGained: number;
        performanceScore: number;
        videoViews?: number | undefined;
        scheduledAt?: string | undefined;
        avgWatchTime?: number | undefined;
        hashtagPerformance?: {
            hashtag: string;
            impressionsFromHashtag: number;
        }[] | undefined;
        bestTimeOfDay?: string | undefined;
    }>, "many">;
    /** Schedule adherence */
    scheduleAdherence: z.ZodObject<{
        /** Total posts scheduled in period */
        totalScheduled: z.ZodNumber;
        /** Posts published on time */
        publishedOnTime: z.ZodNumber;
        /** Posts published late */
        publishedLate: z.ZodNumber;
        /** Posts missed / not published */
        missed: z.ZodNumber;
        /** Posts rescheduled */
        rescheduled: z.ZodNumber;
        /** Adherence rate (0-1) */
        adherenceRate: z.ZodNumber;
        /** Average delay when late (minutes) */
        avgDelayMinutes: z.ZodNumber;
        /** Breakdown by platform */
        byPlatform: z.ZodRecord<z.ZodEnum<["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "pinterest", "threads", "bluesky", "mastodon"]>, z.ZodObject<{
            scheduled: z.ZodNumber;
            onTime: z.ZodNumber;
            late: z.ZodNumber;
            missed: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            scheduled: number;
            missed: number;
            onTime: number;
            late: number;
        }, {
            scheduled: number;
            missed: number;
            onTime: number;
            late: number;
        }>>;
        /** Breakdown by day of week */
        byDayOfWeek: z.ZodRecord<z.ZodString, z.ZodNumber>;
        /** Period */
        period: z.ZodObject<{
            start: z.ZodString;
            end: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            start: string;
            end: string;
        }, {
            start: string;
            end: string;
        }>;
    }, "strict", z.ZodTypeAny, {
        period: {
            start: string;
            end: string;
        };
        totalScheduled: number;
        publishedOnTime: number;
        publishedLate: number;
        missed: number;
        rescheduled: number;
        adherenceRate: number;
        avgDelayMinutes: number;
        byPlatform: Partial<Record<"tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon", {
            scheduled: number;
            missed: number;
            onTime: number;
            late: number;
        }>>;
        byDayOfWeek: Record<string, number>;
    }, {
        period: {
            start: string;
            end: string;
        };
        totalScheduled: number;
        publishedOnTime: number;
        publishedLate: number;
        missed: number;
        rescheduled: number;
        adherenceRate: number;
        avgDelayMinutes: number;
        byPlatform: Partial<Record<"tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon", {
            scheduled: number;
            missed: number;
            onTime: number;
            late: number;
        }>>;
        byDayOfWeek: Record<string, number>;
    }>;
    /** Platform breakdowns */
    platformBreakdowns: z.ZodArray<z.ZodObject<{
        /** Platform */
        platform: z.ZodEnum<["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "pinterest", "threads", "bluesky", "mastodon"]>;
        /** Follower count */
        followers: z.ZodNumber;
        /** Follower growth in period */
        followerGrowth: z.ZodNumber;
        /** Follower growth rate */
        followerGrowthRate: z.ZodNumber;
        /** Total posts in period */
        totalPosts: z.ZodNumber;
        /** Average engagement rate */
        avgEngagementRate: z.ZodNumber;
        /** Total impressions */
        totalImpressions: z.ZodNumber;
        /** Total reach */
        totalReach: z.ZodNumber;
        /** Best performing format */
        bestFormat: z.ZodEnum<["image", "video", "carousel", "text", "story", "reel", "poll", "link", "thread"]>;
        /** Best performing day of week */
        bestDay: z.ZodString;
        /** Best performing time of day */
        bestTime: z.ZodString;
        /** Platform health score (0-100) */
        healthScore: z.ZodNumber;
        /** Account status */
        accountStatus: z.ZodEnum<["active", "limited", "suspended", "disconnected"]>;
    }, "strict", z.ZodTypeAny, {
        platform: "tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon";
        totalImpressions: number;
        followers: number;
        followerGrowth: number;
        followerGrowthRate: number;
        totalPosts: number;
        avgEngagementRate: number;
        totalReach: number;
        bestFormat: "text" | "image" | "video" | "carousel" | "story" | "reel" | "poll" | "link" | "thread";
        bestDay: string;
        bestTime: string;
        healthScore: number;
        accountStatus: "active" | "disconnected" | "limited" | "suspended";
    }, {
        platform: "tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon";
        totalImpressions: number;
        followers: number;
        followerGrowth: number;
        followerGrowthRate: number;
        totalPosts: number;
        avgEngagementRate: number;
        totalReach: number;
        bestFormat: "text" | "image" | "video" | "carousel" | "story" | "reel" | "poll" | "link" | "thread";
        bestDay: string;
        bestTime: string;
        healthScore: number;
        accountStatus: "active" | "disconnected" | "limited" | "suspended";
    }>, "many">;
    /** Aggregate metrics */
    aggregates: z.ZodObject<{
        totalPosts: z.ZodNumber;
        totalImpressions: z.ZodNumber;
        totalEngagements: z.ZodNumber;
        avgEngagementRate: z.ZodNumber;
        totalFollowerGrowth: z.ZodNumber;
        topPostId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        totalImpressions: number;
        totalPosts: number;
        avgEngagementRate: number;
        totalEngagements: number;
        totalFollowerGrowth: number;
        topPostId?: string | undefined;
    }, {
        totalImpressions: number;
        totalPosts: number;
        avgEngagementRate: number;
        totalEngagements: number;
        totalFollowerGrowth: number;
        topPostId?: string | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    scheduleAdherence: {
        period: {
            start: string;
            end: string;
        };
        totalScheduled: number;
        publishedOnTime: number;
        publishedLate: number;
        missed: number;
        rescheduled: number;
        adherenceRate: number;
        avgDelayMinutes: number;
        byPlatform: Partial<Record<"tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon", {
            scheduled: number;
            missed: number;
            onTime: number;
            late: number;
        }>>;
        byDayOfWeek: Record<string, number>;
    };
    timeRange: {
        start: string;
        end: string;
        granularity: "hour" | "day" | "week" | "month";
    };
    aggregates: {
        totalImpressions: number;
        totalPosts: number;
        avgEngagementRate: number;
        totalEngagements: number;
        totalFollowerGrowth: number;
        topPostId?: string | undefined;
    };
    recentPosts: {
        publishedAt: string;
        comments: number;
        likes: number;
        format: "text" | "image" | "video" | "carousel" | "story" | "reel" | "poll" | "link" | "thread";
        platform: "tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon";
        impressions: number;
        clicks: number;
        engagementRate: number;
        postId: string;
        caption: string;
        reach: number;
        shares: number;
        saves: number;
        profileVisits: number;
        followsGained: number;
        performanceScore: number;
        videoViews?: number | undefined;
        scheduledAt?: string | undefined;
        avgWatchTime?: number | undefined;
        hashtagPerformance?: {
            hashtag: string;
            impressionsFromHashtag: number;
        }[] | undefined;
        bestTimeOfDay?: string | undefined;
    }[];
    platformBreakdowns: {
        platform: "tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon";
        totalImpressions: number;
        followers: number;
        followerGrowth: number;
        followerGrowthRate: number;
        totalPosts: number;
        avgEngagementRate: number;
        totalReach: number;
        bestFormat: "text" | "image" | "video" | "carousel" | "story" | "reel" | "poll" | "link" | "thread";
        bestDay: string;
        bestTime: string;
        healthScore: number;
        accountStatus: "active" | "disconnected" | "limited" | "suspended";
    }[];
}, {
    scheduleAdherence: {
        period: {
            start: string;
            end: string;
        };
        totalScheduled: number;
        publishedOnTime: number;
        publishedLate: number;
        missed: number;
        rescheduled: number;
        adherenceRate: number;
        avgDelayMinutes: number;
        byPlatform: Partial<Record<"tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon", {
            scheduled: number;
            missed: number;
            onTime: number;
            late: number;
        }>>;
        byDayOfWeek: Record<string, number>;
    };
    timeRange: {
        start: string;
        end: string;
        granularity: "hour" | "day" | "week" | "month";
    };
    aggregates: {
        totalImpressions: number;
        totalPosts: number;
        avgEngagementRate: number;
        totalEngagements: number;
        totalFollowerGrowth: number;
        topPostId?: string | undefined;
    };
    recentPosts: {
        publishedAt: string;
        comments: number;
        likes: number;
        format: "text" | "image" | "video" | "carousel" | "story" | "reel" | "poll" | "link" | "thread";
        platform: "tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon";
        impressions: number;
        clicks: number;
        engagementRate: number;
        postId: string;
        caption: string;
        reach: number;
        shares: number;
        saves: number;
        profileVisits: number;
        followsGained: number;
        performanceScore: number;
        videoViews?: number | undefined;
        scheduledAt?: string | undefined;
        avgWatchTime?: number | undefined;
        hashtagPerformance?: {
            hashtag: string;
            impressionsFromHashtag: number;
        }[] | undefined;
        bestTimeOfDay?: string | undefined;
    }[];
    platformBreakdowns: {
        platform: "tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon";
        totalImpressions: number;
        followers: number;
        followerGrowth: number;
        followerGrowthRate: number;
        totalPosts: number;
        avgEngagementRate: number;
        totalReach: number;
        bestFormat: "text" | "image" | "video" | "carousel" | "story" | "reel" | "poll" | "link" | "thread";
        bestDay: string;
        bestTime: string;
        healthScore: number;
        accountStatus: "active" | "disconnected" | "limited" | "suspended";
    }[];
}>;
export type MpAnalyticsDashboard = z.infer<typeof MpAnalyticsDashboardSchema>;
export declare const ConnectedAccountSchema: z.ZodObject<{
    /** Account identifier */
    id: z.ZodString;
    /** Platform */
    platform: z.ZodEnum<["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "pinterest", "threads", "bluesky", "mastodon"]>;
    /** Account username / handle */
    username: z.ZodString;
    /** Display name */
    displayName: z.ZodString;
    /** Profile image URL */
    avatarUrl: z.ZodOptional<z.ZodString>;
    /** Connection status */
    status: z.ZodEnum<["connected", "expired", "revoked", "error"]>;
    /** Token expiry date */
    tokenExpiresAt: z.ZodOptional<z.ZodString>;
    /** Last successful sync */
    lastSyncedAt: z.ZodOptional<z.ZodString>;
    /** Permissions granted */
    permissions: z.ZodArray<z.ZodString, "many">;
    /** Is this the default account for the platform */
    isDefault: z.ZodDefault<z.ZodBoolean>;
    /** Connected timestamp */
    connectedAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    status: "error" | "connected" | "expired" | "revoked";
    id: string;
    platform: "tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon";
    username: string;
    displayName: string;
    permissions: string[];
    isDefault: boolean;
    connectedAt: string;
    avatarUrl?: string | undefined;
    tokenExpiresAt?: string | undefined;
    lastSyncedAt?: string | undefined;
}, {
    status: "error" | "connected" | "expired" | "revoked";
    id: string;
    platform: "tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon";
    username: string;
    displayName: string;
    permissions: string[];
    connectedAt: string;
    avatarUrl?: string | undefined;
    tokenExpiresAt?: string | undefined;
    lastSyncedAt?: string | undefined;
    isDefault?: boolean | undefined;
}>;
export type ConnectedAccount = z.infer<typeof ConnectedAccountSchema>;
export declare const PostingScheduleSlotSchema: z.ZodObject<{
    /** Day of week */
    day: z.ZodEnum<["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]>;
    /** Time (HH:MM format) */
    time: z.ZodString;
    /** Platforms for this slot */
    platforms: z.ZodArray<z.ZodEnum<["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "pinterest", "threads", "bluesky", "mastodon"]>, "many">;
    /** Whether this slot is active */
    active: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    active: boolean;
    day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
    time: string;
    platforms: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[];
}, {
    day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
    time: string;
    platforms: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[];
    active?: boolean | undefined;
}>;
export type PostingScheduleSlot = z.infer<typeof PostingScheduleSlotSchema>;
export declare const PostingScheduleSchema: z.ZodObject<{
    /** Schedule slots */
    slots: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** Day of week */
        day: z.ZodEnum<["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]>;
        /** Time (HH:MM format) */
        time: z.ZodString;
        /** Platforms for this slot */
        platforms: z.ZodArray<z.ZodEnum<["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "pinterest", "threads", "bluesky", "mastodon"]>, "many">;
        /** Whether this slot is active */
        active: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        active: boolean;
        day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
        time: string;
        platforms: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[];
    }, {
        day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
        time: string;
        platforms: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[];
        active?: boolean | undefined;
    }>, "many">>;
    /** Timezone */
    timezone: z.ZodDefault<z.ZodString>;
    /** Enable auto-scheduling (AI picks optimal times) */
    autoSchedule: z.ZodDefault<z.ZodBoolean>;
    /** Minimum gap between posts on same platform (minutes) */
    minGapMinutes: z.ZodDefault<z.ZodNumber>;
    /** Maximum posts per day per platform */
    maxPostsPerDayPerPlatform: z.ZodDefault<z.ZodNumber>;
    /** Queue behavior when slot is full */
    overflowBehavior: z.ZodDefault<z.ZodEnum<["skip", "next_slot", "next_day"]>>;
}, "strict", z.ZodTypeAny, {
    autoSchedule: boolean;
    timezone: string;
    slots: {
        active: boolean;
        day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
        time: string;
        platforms: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[];
    }[];
    minGapMinutes: number;
    maxPostsPerDayPerPlatform: number;
    overflowBehavior: "skip" | "next_slot" | "next_day";
}, {
    autoSchedule?: boolean | undefined;
    timezone?: string | undefined;
    slots?: {
        day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
        time: string;
        platforms: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[];
        active?: boolean | undefined;
    }[] | undefined;
    minGapMinutes?: number | undefined;
    maxPostsPerDayPerPlatform?: number | undefined;
    overflowBehavior?: "skip" | "next_slot" | "next_day" | undefined;
}>;
export type PostingSchedule = z.infer<typeof PostingScheduleSchema>;
export declare const ContentRuleSchema: z.ZodObject<{
    /** Rule identifier */
    id: z.ZodString;
    /** Rule name */
    name: z.ZodString;
    /** Rule description */
    description: z.ZodString;
    /** Rule type */
    type: z.ZodEnum<["hashtag_limit", "mention_limit", "character_limit", "required_hashtags", "banned_words", "image_required", "link_required", "approval_required", "platform_specific", "custom"]>;
    /** Platforms this rule applies to (empty = all) */
    platforms: z.ZodDefault<z.ZodArray<z.ZodEnum<["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "pinterest", "threads", "bluesky", "mastodon"]>, "many">>;
    /** Rule value */
    value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodString, "many">]>;
    /** Whether this rule is active */
    active: z.ZodDefault<z.ZodBoolean>;
    /** Severity (error blocks publishing, warning just warns) */
    severity: z.ZodDefault<z.ZodEnum<["error", "warning"]>>;
}, "strict", z.ZodTypeAny, {
    active: boolean;
    type: "custom" | "hashtag_limit" | "mention_limit" | "character_limit" | "required_hashtags" | "banned_words" | "image_required" | "link_required" | "approval_required" | "platform_specific";
    value: string | number | boolean | string[];
    id: string;
    name: string;
    description: string;
    platforms: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[];
    severity: "warning" | "error";
}, {
    type: "custom" | "hashtag_limit" | "mention_limit" | "character_limit" | "required_hashtags" | "banned_words" | "image_required" | "link_required" | "approval_required" | "platform_specific";
    value: string | number | boolean | string[];
    id: string;
    name: string;
    description: string;
    active?: boolean | undefined;
    platforms?: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[] | undefined;
    severity?: "warning" | "error" | undefined;
}>;
export type ContentRule = z.infer<typeof ContentRuleSchema>;
export declare const ContentRulesConfigSchema: z.ZodObject<{
    /** Content rules */
    rules: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** Rule identifier */
        id: z.ZodString;
        /** Rule name */
        name: z.ZodString;
        /** Rule description */
        description: z.ZodString;
        /** Rule type */
        type: z.ZodEnum<["hashtag_limit", "mention_limit", "character_limit", "required_hashtags", "banned_words", "image_required", "link_required", "approval_required", "platform_specific", "custom"]>;
        /** Platforms this rule applies to (empty = all) */
        platforms: z.ZodDefault<z.ZodArray<z.ZodEnum<["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "pinterest", "threads", "bluesky", "mastodon"]>, "many">>;
        /** Rule value */
        value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodString, "many">]>;
        /** Whether this rule is active */
        active: z.ZodDefault<z.ZodBoolean>;
        /** Severity (error blocks publishing, warning just warns) */
        severity: z.ZodDefault<z.ZodEnum<["error", "warning"]>>;
    }, "strict", z.ZodTypeAny, {
        active: boolean;
        type: "custom" | "hashtag_limit" | "mention_limit" | "character_limit" | "required_hashtags" | "banned_words" | "image_required" | "link_required" | "approval_required" | "platform_specific";
        value: string | number | boolean | string[];
        id: string;
        name: string;
        description: string;
        platforms: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[];
        severity: "warning" | "error";
    }, {
        type: "custom" | "hashtag_limit" | "mention_limit" | "character_limit" | "required_hashtags" | "banned_words" | "image_required" | "link_required" | "approval_required" | "platform_specific";
        value: string | number | boolean | string[];
        id: string;
        name: string;
        description: string;
        active?: boolean | undefined;
        platforms?: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[] | undefined;
        severity?: "warning" | "error" | undefined;
    }>, "many">>;
    /** Enable content rules */
    enabled: z.ZodDefault<z.ZodBoolean>;
    /** Block publishing on rule violation */
    blockOnViolation: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    enabled: boolean;
    rules: {
        active: boolean;
        type: "custom" | "hashtag_limit" | "mention_limit" | "character_limit" | "required_hashtags" | "banned_words" | "image_required" | "link_required" | "approval_required" | "platform_specific";
        value: string | number | boolean | string[];
        id: string;
        name: string;
        description: string;
        platforms: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[];
        severity: "warning" | "error";
    }[];
    blockOnViolation: boolean;
}, {
    enabled?: boolean | undefined;
    rules?: {
        type: "custom" | "hashtag_limit" | "mention_limit" | "character_limit" | "required_hashtags" | "banned_words" | "image_required" | "link_required" | "approval_required" | "platform_specific";
        value: string | number | boolean | string[];
        id: string;
        name: string;
        description: string;
        active?: boolean | undefined;
        platforms?: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[] | undefined;
        severity?: "warning" | "error" | undefined;
    }[] | undefined;
    blockOnViolation?: boolean | undefined;
}>;
export type ContentRulesConfig = z.infer<typeof ContentRulesConfigSchema>;
export declare const MpSettingsSchema: z.ZodObject<{
    connectedAccounts: z.ZodArray<z.ZodObject<{
        /** Account identifier */
        id: z.ZodString;
        /** Platform */
        platform: z.ZodEnum<["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "pinterest", "threads", "bluesky", "mastodon"]>;
        /** Account username / handle */
        username: z.ZodString;
        /** Display name */
        displayName: z.ZodString;
        /** Profile image URL */
        avatarUrl: z.ZodOptional<z.ZodString>;
        /** Connection status */
        status: z.ZodEnum<["connected", "expired", "revoked", "error"]>;
        /** Token expiry date */
        tokenExpiresAt: z.ZodOptional<z.ZodString>;
        /** Last successful sync */
        lastSyncedAt: z.ZodOptional<z.ZodString>;
        /** Permissions granted */
        permissions: z.ZodArray<z.ZodString, "many">;
        /** Is this the default account for the platform */
        isDefault: z.ZodDefault<z.ZodBoolean>;
        /** Connected timestamp */
        connectedAt: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        status: "error" | "connected" | "expired" | "revoked";
        id: string;
        platform: "tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon";
        username: string;
        displayName: string;
        permissions: string[];
        isDefault: boolean;
        connectedAt: string;
        avatarUrl?: string | undefined;
        tokenExpiresAt?: string | undefined;
        lastSyncedAt?: string | undefined;
    }, {
        status: "error" | "connected" | "expired" | "revoked";
        id: string;
        platform: "tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon";
        username: string;
        displayName: string;
        permissions: string[];
        connectedAt: string;
        avatarUrl?: string | undefined;
        tokenExpiresAt?: string | undefined;
        lastSyncedAt?: string | undefined;
        isDefault?: boolean | undefined;
    }>, "many">;
    postingSchedule: z.ZodObject<{
        /** Schedule slots */
        slots: z.ZodDefault<z.ZodArray<z.ZodObject<{
            /** Day of week */
            day: z.ZodEnum<["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]>;
            /** Time (HH:MM format) */
            time: z.ZodString;
            /** Platforms for this slot */
            platforms: z.ZodArray<z.ZodEnum<["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "pinterest", "threads", "bluesky", "mastodon"]>, "many">;
            /** Whether this slot is active */
            active: z.ZodDefault<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            active: boolean;
            day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
            time: string;
            platforms: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[];
        }, {
            day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
            time: string;
            platforms: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[];
            active?: boolean | undefined;
        }>, "many">>;
        /** Timezone */
        timezone: z.ZodDefault<z.ZodString>;
        /** Enable auto-scheduling (AI picks optimal times) */
        autoSchedule: z.ZodDefault<z.ZodBoolean>;
        /** Minimum gap between posts on same platform (minutes) */
        minGapMinutes: z.ZodDefault<z.ZodNumber>;
        /** Maximum posts per day per platform */
        maxPostsPerDayPerPlatform: z.ZodDefault<z.ZodNumber>;
        /** Queue behavior when slot is full */
        overflowBehavior: z.ZodDefault<z.ZodEnum<["skip", "next_slot", "next_day"]>>;
    }, "strict", z.ZodTypeAny, {
        autoSchedule: boolean;
        timezone: string;
        slots: {
            active: boolean;
            day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
            time: string;
            platforms: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[];
        }[];
        minGapMinutes: number;
        maxPostsPerDayPerPlatform: number;
        overflowBehavior: "skip" | "next_slot" | "next_day";
    }, {
        autoSchedule?: boolean | undefined;
        timezone?: string | undefined;
        slots?: {
            day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
            time: string;
            platforms: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[];
            active?: boolean | undefined;
        }[] | undefined;
        minGapMinutes?: number | undefined;
        maxPostsPerDayPerPlatform?: number | undefined;
        overflowBehavior?: "skip" | "next_slot" | "next_day" | undefined;
    }>;
    contentRules: z.ZodObject<{
        /** Content rules */
        rules: z.ZodDefault<z.ZodArray<z.ZodObject<{
            /** Rule identifier */
            id: z.ZodString;
            /** Rule name */
            name: z.ZodString;
            /** Rule description */
            description: z.ZodString;
            /** Rule type */
            type: z.ZodEnum<["hashtag_limit", "mention_limit", "character_limit", "required_hashtags", "banned_words", "image_required", "link_required", "approval_required", "platform_specific", "custom"]>;
            /** Platforms this rule applies to (empty = all) */
            platforms: z.ZodDefault<z.ZodArray<z.ZodEnum<["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "pinterest", "threads", "bluesky", "mastodon"]>, "many">>;
            /** Rule value */
            value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodString, "many">]>;
            /** Whether this rule is active */
            active: z.ZodDefault<z.ZodBoolean>;
            /** Severity (error blocks publishing, warning just warns) */
            severity: z.ZodDefault<z.ZodEnum<["error", "warning"]>>;
        }, "strict", z.ZodTypeAny, {
            active: boolean;
            type: "custom" | "hashtag_limit" | "mention_limit" | "character_limit" | "required_hashtags" | "banned_words" | "image_required" | "link_required" | "approval_required" | "platform_specific";
            value: string | number | boolean | string[];
            id: string;
            name: string;
            description: string;
            platforms: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[];
            severity: "warning" | "error";
        }, {
            type: "custom" | "hashtag_limit" | "mention_limit" | "character_limit" | "required_hashtags" | "banned_words" | "image_required" | "link_required" | "approval_required" | "platform_specific";
            value: string | number | boolean | string[];
            id: string;
            name: string;
            description: string;
            active?: boolean | undefined;
            platforms?: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[] | undefined;
            severity?: "warning" | "error" | undefined;
        }>, "many">>;
        /** Enable content rules */
        enabled: z.ZodDefault<z.ZodBoolean>;
        /** Block publishing on rule violation */
        blockOnViolation: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        enabled: boolean;
        rules: {
            active: boolean;
            type: "custom" | "hashtag_limit" | "mention_limit" | "character_limit" | "required_hashtags" | "banned_words" | "image_required" | "link_required" | "approval_required" | "platform_specific";
            value: string | number | boolean | string[];
            id: string;
            name: string;
            description: string;
            platforms: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[];
            severity: "warning" | "error";
        }[];
        blockOnViolation: boolean;
    }, {
        enabled?: boolean | undefined;
        rules?: {
            type: "custom" | "hashtag_limit" | "mention_limit" | "character_limit" | "required_hashtags" | "banned_words" | "image_required" | "link_required" | "approval_required" | "platform_specific";
            value: string | number | boolean | string[];
            id: string;
            name: string;
            description: string;
            active?: boolean | undefined;
            platforms?: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[] | undefined;
            severity?: "warning" | "error" | undefined;
        }[] | undefined;
        blockOnViolation?: boolean | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    connectedAccounts: {
        status: "error" | "connected" | "expired" | "revoked";
        id: string;
        platform: "tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon";
        username: string;
        displayName: string;
        permissions: string[];
        isDefault: boolean;
        connectedAt: string;
        avatarUrl?: string | undefined;
        tokenExpiresAt?: string | undefined;
        lastSyncedAt?: string | undefined;
    }[];
    postingSchedule: {
        autoSchedule: boolean;
        timezone: string;
        slots: {
            active: boolean;
            day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
            time: string;
            platforms: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[];
        }[];
        minGapMinutes: number;
        maxPostsPerDayPerPlatform: number;
        overflowBehavior: "skip" | "next_slot" | "next_day";
    };
    contentRules: {
        enabled: boolean;
        rules: {
            active: boolean;
            type: "custom" | "hashtag_limit" | "mention_limit" | "character_limit" | "required_hashtags" | "banned_words" | "image_required" | "link_required" | "approval_required" | "platform_specific";
            value: string | number | boolean | string[];
            id: string;
            name: string;
            description: string;
            platforms: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[];
            severity: "warning" | "error";
        }[];
        blockOnViolation: boolean;
    };
}, {
    connectedAccounts: {
        status: "error" | "connected" | "expired" | "revoked";
        id: string;
        platform: "tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon";
        username: string;
        displayName: string;
        permissions: string[];
        connectedAt: string;
        avatarUrl?: string | undefined;
        tokenExpiresAt?: string | undefined;
        lastSyncedAt?: string | undefined;
        isDefault?: boolean | undefined;
    }[];
    postingSchedule: {
        autoSchedule?: boolean | undefined;
        timezone?: string | undefined;
        slots?: {
            day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
            time: string;
            platforms: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[];
            active?: boolean | undefined;
        }[] | undefined;
        minGapMinutes?: number | undefined;
        maxPostsPerDayPerPlatform?: number | undefined;
        overflowBehavior?: "skip" | "next_slot" | "next_day" | undefined;
    };
    contentRules: {
        enabled?: boolean | undefined;
        rules?: {
            type: "custom" | "hashtag_limit" | "mention_limit" | "character_limit" | "required_hashtags" | "banned_words" | "image_required" | "link_required" | "approval_required" | "platform_specific";
            value: string | number | boolean | string[];
            id: string;
            name: string;
            description: string;
            active?: boolean | undefined;
            platforms?: ("tiktok" | "linkedin" | "twitter" | "pinterest" | "instagram" | "facebook" | "youtube" | "threads" | "bluesky" | "mastodon")[] | undefined;
            severity?: "warning" | "error" | undefined;
        }[] | undefined;
        blockOnViolation?: boolean | undefined;
    };
}>;
export type MpSettings = z.infer<typeof MpSettingsSchema>;
//# sourceMappingURL=mp-integration.d.ts.map