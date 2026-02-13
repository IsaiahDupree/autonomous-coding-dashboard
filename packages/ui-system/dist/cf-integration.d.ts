/**
 * INT-CF-001: Content Factory Analytics Integration
 * INT-CF-002: Content Factory Settings Integration
 *
 * Type definitions and Zod schemas for Content Factory product
 * analytics dashboards and settings panels.
 */
import { z } from "zod";
export declare const ContentTypeSchema: z.ZodEnum<["blog_post", "social_post", "email", "landing_page", "ad_copy", "video_script", "product_description", "newsletter", "press_release", "whitepaper"]>;
export type ContentType = z.infer<typeof ContentTypeSchema>;
export declare const ContentStatusSchema: z.ZodEnum<["draft", "in_review", "approved", "published", "scheduled", "archived", "rejected"]>;
export type ContentStatus = z.infer<typeof ContentStatusSchema>;
export declare const ContentProductionMetricSchema: z.ZodObject<{
    /** Total content pieces created */
    totalCreated: z.ZodNumber;
    /** Content created by type */
    createdByType: z.ZodRecord<z.ZodEnum<["blog_post", "social_post", "email", "landing_page", "ad_copy", "video_script", "product_description", "newsletter", "press_release", "whitepaper"]>, z.ZodNumber>;
    /** Average creation time (minutes) */
    avgCreationTimeMinutes: z.ZodNumber;
    /** Content in each status */
    statusBreakdown: z.ZodRecord<z.ZodEnum<["draft", "in_review", "approved", "published", "scheduled", "archived", "rejected"]>, z.ZodNumber>;
    /** AI-assisted vs manual creation ratio */
    aiAssistedRatio: z.ZodNumber;
    /** Average revision count */
    avgRevisions: z.ZodNumber;
    /** Content quality score (0-100) */
    avgQualityScore: z.ZodNumber;
    /** Rejection rate */
    rejectionRate: z.ZodNumber;
    /** Time period */
    period: z.ZodObject<{
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
}, "strict", z.ZodTypeAny, {
    totalCreated: number;
    createdByType: Partial<Record<"blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper", number>>;
    avgCreationTimeMinutes: number;
    statusBreakdown: Partial<Record<"draft" | "in_review" | "approved" | "published" | "scheduled" | "archived" | "rejected", number>>;
    aiAssistedRatio: number;
    avgRevisions: number;
    avgQualityScore: number;
    rejectionRate: number;
    period: {
        start: string;
        end: string;
        granularity: "hour" | "day" | "week" | "month";
    };
}, {
    totalCreated: number;
    createdByType: Partial<Record<"blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper", number>>;
    avgCreationTimeMinutes: number;
    statusBreakdown: Partial<Record<"draft" | "in_review" | "approved" | "published" | "scheduled" | "archived" | "rejected", number>>;
    aiAssistedRatio: number;
    avgRevisions: number;
    avgQualityScore: number;
    rejectionRate: number;
    period: {
        start: string;
        end: string;
        granularity: "hour" | "day" | "week" | "month";
    };
}>;
export type ContentProductionMetric = z.infer<typeof ContentProductionMetricSchema>;
export declare const PublishRateMetricSchema: z.ZodObject<{
    /** Total published in period */
    totalPublished: z.ZodNumber;
    /** Published by type */
    publishedByType: z.ZodRecord<z.ZodEnum<["blog_post", "social_post", "email", "landing_page", "ad_copy", "video_script", "product_description", "newsletter", "press_release", "whitepaper"]>, z.ZodNumber>;
    /** Published by platform/channel */
    publishedByChannel: z.ZodRecord<z.ZodString, z.ZodNumber>;
    /** Average time from creation to publish (hours) */
    avgTimeToPublishHours: z.ZodNumber;
    /** Publish schedule adherence (0-1) */
    scheduleAdherence: z.ZodNumber;
    /** Daily publish rate (average) */
    dailyRate: z.ZodNumber;
    /** Weekly publish rate (average) */
    weeklyRate: z.ZodNumber;
    /** Publish rate trend */
    trend: z.ZodEnum<["increasing", "stable", "decreasing"]>;
    /** Trend percentage change */
    trendPercentage: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    totalPublished: number;
    publishedByType: Partial<Record<"blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper", number>>;
    publishedByChannel: Record<string, number>;
    avgTimeToPublishHours: number;
    scheduleAdherence: number;
    dailyRate: number;
    weeklyRate: number;
    trend: "increasing" | "stable" | "decreasing";
    trendPercentage: number;
}, {
    totalPublished: number;
    publishedByType: Partial<Record<"blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper", number>>;
    publishedByChannel: Record<string, number>;
    avgTimeToPublishHours: number;
    scheduleAdherence: number;
    dailyRate: number;
    weeklyRate: number;
    trend: "increasing" | "stable" | "decreasing";
    trendPercentage: number;
}>;
export type PublishRateMetric = z.infer<typeof PublishRateMetricSchema>;
export declare const ContentEngagementSchema: z.ZodObject<{
    /** Content identifier */
    contentId: z.ZodString;
    /** Content title */
    title: z.ZodString;
    /** Content type */
    type: z.ZodEnum<["blog_post", "social_post", "email", "landing_page", "ad_copy", "video_script", "product_description", "newsletter", "press_release", "whitepaper"]>;
    /** Published date */
    publishedAt: z.ZodString;
    /** Page views */
    views: z.ZodNumber;
    /** Unique visitors */
    uniqueVisitors: z.ZodNumber;
    /** Average time on page (seconds) */
    avgTimeOnPage: z.ZodNumber;
    /** Bounce rate */
    bounceRate: z.ZodNumber;
    /** Social shares */
    socialShares: z.ZodNumber;
    /** Comments */
    comments: z.ZodNumber;
    /** Likes / reactions */
    likes: z.ZodNumber;
    /** Click-through rate (for emails, ads) */
    ctr: z.ZodOptional<z.ZodNumber>;
    /** Open rate (for emails) */
    openRate: z.ZodOptional<z.ZodNumber>;
    /** Conversion rate */
    conversionRate: z.ZodOptional<z.ZodNumber>;
    /** SEO ranking position */
    seoRanking: z.ZodOptional<z.ZodNumber>;
    /** Engagement score (0-100) */
    engagementScore: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    type: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
    title: string;
    contentId: string;
    publishedAt: string;
    views: number;
    uniqueVisitors: number;
    avgTimeOnPage: number;
    bounceRate: number;
    socialShares: number;
    comments: number;
    likes: number;
    engagementScore: number;
    ctr?: number | undefined;
    openRate?: number | undefined;
    conversionRate?: number | undefined;
    seoRanking?: number | undefined;
}, {
    type: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
    title: string;
    contentId: string;
    publishedAt: string;
    views: number;
    uniqueVisitors: number;
    avgTimeOnPage: number;
    bounceRate: number;
    socialShares: number;
    comments: number;
    likes: number;
    engagementScore: number;
    ctr?: number | undefined;
    openRate?: number | undefined;
    conversionRate?: number | undefined;
    seoRanking?: number | undefined;
}>;
export type ContentEngagement = z.infer<typeof ContentEngagementSchema>;
export declare const CfAnalyticsDashboardSchema: z.ZodObject<{
    productionMetrics: z.ZodObject<{
        /** Total content pieces created */
        totalCreated: z.ZodNumber;
        /** Content created by type */
        createdByType: z.ZodRecord<z.ZodEnum<["blog_post", "social_post", "email", "landing_page", "ad_copy", "video_script", "product_description", "newsletter", "press_release", "whitepaper"]>, z.ZodNumber>;
        /** Average creation time (minutes) */
        avgCreationTimeMinutes: z.ZodNumber;
        /** Content in each status */
        statusBreakdown: z.ZodRecord<z.ZodEnum<["draft", "in_review", "approved", "published", "scheduled", "archived", "rejected"]>, z.ZodNumber>;
        /** AI-assisted vs manual creation ratio */
        aiAssistedRatio: z.ZodNumber;
        /** Average revision count */
        avgRevisions: z.ZodNumber;
        /** Content quality score (0-100) */
        avgQualityScore: z.ZodNumber;
        /** Rejection rate */
        rejectionRate: z.ZodNumber;
        /** Time period */
        period: z.ZodObject<{
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
    }, "strict", z.ZodTypeAny, {
        totalCreated: number;
        createdByType: Partial<Record<"blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper", number>>;
        avgCreationTimeMinutes: number;
        statusBreakdown: Partial<Record<"draft" | "in_review" | "approved" | "published" | "scheduled" | "archived" | "rejected", number>>;
        aiAssistedRatio: number;
        avgRevisions: number;
        avgQualityScore: number;
        rejectionRate: number;
        period: {
            start: string;
            end: string;
            granularity: "hour" | "day" | "week" | "month";
        };
    }, {
        totalCreated: number;
        createdByType: Partial<Record<"blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper", number>>;
        avgCreationTimeMinutes: number;
        statusBreakdown: Partial<Record<"draft" | "in_review" | "approved" | "published" | "scheduled" | "archived" | "rejected", number>>;
        aiAssistedRatio: number;
        avgRevisions: number;
        avgQualityScore: number;
        rejectionRate: number;
        period: {
            start: string;
            end: string;
            granularity: "hour" | "day" | "week" | "month";
        };
    }>;
    publishRates: z.ZodObject<{
        /** Total published in period */
        totalPublished: z.ZodNumber;
        /** Published by type */
        publishedByType: z.ZodRecord<z.ZodEnum<["blog_post", "social_post", "email", "landing_page", "ad_copy", "video_script", "product_description", "newsletter", "press_release", "whitepaper"]>, z.ZodNumber>;
        /** Published by platform/channel */
        publishedByChannel: z.ZodRecord<z.ZodString, z.ZodNumber>;
        /** Average time from creation to publish (hours) */
        avgTimeToPublishHours: z.ZodNumber;
        /** Publish schedule adherence (0-1) */
        scheduleAdherence: z.ZodNumber;
        /** Daily publish rate (average) */
        dailyRate: z.ZodNumber;
        /** Weekly publish rate (average) */
        weeklyRate: z.ZodNumber;
        /** Publish rate trend */
        trend: z.ZodEnum<["increasing", "stable", "decreasing"]>;
        /** Trend percentage change */
        trendPercentage: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        totalPublished: number;
        publishedByType: Partial<Record<"blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper", number>>;
        publishedByChannel: Record<string, number>;
        avgTimeToPublishHours: number;
        scheduleAdherence: number;
        dailyRate: number;
        weeklyRate: number;
        trend: "increasing" | "stable" | "decreasing";
        trendPercentage: number;
    }, {
        totalPublished: number;
        publishedByType: Partial<Record<"blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper", number>>;
        publishedByChannel: Record<string, number>;
        avgTimeToPublishHours: number;
        scheduleAdherence: number;
        dailyRate: number;
        weeklyRate: number;
        trend: "increasing" | "stable" | "decreasing";
        trendPercentage: number;
    }>;
    topContent: z.ZodArray<z.ZodObject<{
        /** Content identifier */
        contentId: z.ZodString;
        /** Content title */
        title: z.ZodString;
        /** Content type */
        type: z.ZodEnum<["blog_post", "social_post", "email", "landing_page", "ad_copy", "video_script", "product_description", "newsletter", "press_release", "whitepaper"]>;
        /** Published date */
        publishedAt: z.ZodString;
        /** Page views */
        views: z.ZodNumber;
        /** Unique visitors */
        uniqueVisitors: z.ZodNumber;
        /** Average time on page (seconds) */
        avgTimeOnPage: z.ZodNumber;
        /** Bounce rate */
        bounceRate: z.ZodNumber;
        /** Social shares */
        socialShares: z.ZodNumber;
        /** Comments */
        comments: z.ZodNumber;
        /** Likes / reactions */
        likes: z.ZodNumber;
        /** Click-through rate (for emails, ads) */
        ctr: z.ZodOptional<z.ZodNumber>;
        /** Open rate (for emails) */
        openRate: z.ZodOptional<z.ZodNumber>;
        /** Conversion rate */
        conversionRate: z.ZodOptional<z.ZodNumber>;
        /** SEO ranking position */
        seoRanking: z.ZodOptional<z.ZodNumber>;
        /** Engagement score (0-100) */
        engagementScore: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        type: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
        title: string;
        contentId: string;
        publishedAt: string;
        views: number;
        uniqueVisitors: number;
        avgTimeOnPage: number;
        bounceRate: number;
        socialShares: number;
        comments: number;
        likes: number;
        engagementScore: number;
        ctr?: number | undefined;
        openRate?: number | undefined;
        conversionRate?: number | undefined;
        seoRanking?: number | undefined;
    }, {
        type: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
        title: string;
        contentId: string;
        publishedAt: string;
        views: number;
        uniqueVisitors: number;
        avgTimeOnPage: number;
        bounceRate: number;
        socialShares: number;
        comments: number;
        likes: number;
        engagementScore: number;
        ctr?: number | undefined;
        openRate?: number | undefined;
        conversionRate?: number | undefined;
        seoRanking?: number | undefined;
    }>, "many">;
    /** Aggregate engagement metrics */
    engagementSummary: z.ZodObject<{
        totalViews: z.ZodNumber;
        totalShares: z.ZodNumber;
        avgEngagementScore: z.ZodNumber;
        topPerformingType: z.ZodEnum<["blog_post", "social_post", "email", "landing_page", "ad_copy", "video_script", "product_description", "newsletter", "press_release", "whitepaper"]>;
    }, "strip", z.ZodTypeAny, {
        totalViews: number;
        totalShares: number;
        avgEngagementScore: number;
        topPerformingType: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
    }, {
        totalViews: number;
        totalShares: number;
        avgEngagementScore: number;
        topPerformingType: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
    }>;
}, "strict", z.ZodTypeAny, {
    productionMetrics: {
        totalCreated: number;
        createdByType: Partial<Record<"blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper", number>>;
        avgCreationTimeMinutes: number;
        statusBreakdown: Partial<Record<"draft" | "in_review" | "approved" | "published" | "scheduled" | "archived" | "rejected", number>>;
        aiAssistedRatio: number;
        avgRevisions: number;
        avgQualityScore: number;
        rejectionRate: number;
        period: {
            start: string;
            end: string;
            granularity: "hour" | "day" | "week" | "month";
        };
    };
    publishRates: {
        totalPublished: number;
        publishedByType: Partial<Record<"blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper", number>>;
        publishedByChannel: Record<string, number>;
        avgTimeToPublishHours: number;
        scheduleAdherence: number;
        dailyRate: number;
        weeklyRate: number;
        trend: "increasing" | "stable" | "decreasing";
        trendPercentage: number;
    };
    topContent: {
        type: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
        title: string;
        contentId: string;
        publishedAt: string;
        views: number;
        uniqueVisitors: number;
        avgTimeOnPage: number;
        bounceRate: number;
        socialShares: number;
        comments: number;
        likes: number;
        engagementScore: number;
        ctr?: number | undefined;
        openRate?: number | undefined;
        conversionRate?: number | undefined;
        seoRanking?: number | undefined;
    }[];
    engagementSummary: {
        totalViews: number;
        totalShares: number;
        avgEngagementScore: number;
        topPerformingType: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
    };
}, {
    productionMetrics: {
        totalCreated: number;
        createdByType: Partial<Record<"blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper", number>>;
        avgCreationTimeMinutes: number;
        statusBreakdown: Partial<Record<"draft" | "in_review" | "approved" | "published" | "scheduled" | "archived" | "rejected", number>>;
        aiAssistedRatio: number;
        avgRevisions: number;
        avgQualityScore: number;
        rejectionRate: number;
        period: {
            start: string;
            end: string;
            granularity: "hour" | "day" | "week" | "month";
        };
    };
    publishRates: {
        totalPublished: number;
        publishedByType: Partial<Record<"blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper", number>>;
        publishedByChannel: Record<string, number>;
        avgTimeToPublishHours: number;
        scheduleAdherence: number;
        dailyRate: number;
        weeklyRate: number;
        trend: "increasing" | "stable" | "decreasing";
        trendPercentage: number;
    };
    topContent: {
        type: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
        title: string;
        contentId: string;
        publishedAt: string;
        views: number;
        uniqueVisitors: number;
        avgTimeOnPage: number;
        bounceRate: number;
        socialShares: number;
        comments: number;
        likes: number;
        engagementScore: number;
        ctr?: number | undefined;
        openRate?: number | undefined;
        conversionRate?: number | undefined;
        seoRanking?: number | undefined;
    }[];
    engagementSummary: {
        totalViews: number;
        totalShares: number;
        avgEngagementScore: number;
        topPerformingType: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
    };
}>;
export type CfAnalyticsDashboard = z.infer<typeof CfAnalyticsDashboardSchema>;
export declare const TemplatePreferencesSchema: z.ZodObject<{
    /** Default content type */
    defaultContentType: z.ZodDefault<z.ZodEnum<["blog_post", "social_post", "email", "landing_page", "ad_copy", "video_script", "product_description", "newsletter", "press_release", "whitepaper"]>>;
    /** Default tone of voice */
    defaultTone: z.ZodDefault<z.ZodEnum<["professional", "casual", "authoritative", "friendly", "humorous", "inspirational", "educational"]>>;
    /** Default language */
    defaultLanguage: z.ZodDefault<z.ZodString>;
    /** Supported languages */
    supportedLanguages: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Brand voice keywords */
    brandVoiceKeywords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Banned words / phrases */
    bannedPhrases: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Default word count targets by type */
    wordCountTargets: z.ZodOptional<z.ZodRecord<z.ZodEnum<["blog_post", "social_post", "email", "landing_page", "ad_copy", "video_script", "product_description", "newsletter", "press_release", "whitepaper"]>, z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
        target: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        min: number;
        max: number;
        target: number;
    }, {
        min: number;
        max: number;
        target: number;
    }>>>;
    /** Custom template library */
    customTemplates: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<["blog_post", "social_post", "email", "landing_page", "ad_copy", "video_script", "product_description", "newsletter", "press_release", "whitepaper"]>;
        description: z.ZodString;
        promptTemplate: z.ZodString;
        isActive: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
        id: string;
        name: string;
        description: string;
        promptTemplate: string;
        isActive: boolean;
    }, {
        type: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
        id: string;
        name: string;
        description: string;
        promptTemplate: string;
        isActive?: boolean | undefined;
    }>, "many">>;
}, "strict", z.ZodTypeAny, {
    defaultContentType: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
    defaultTone: "professional" | "casual" | "authoritative" | "friendly" | "humorous" | "inspirational" | "educational";
    defaultLanguage: string;
    supportedLanguages: string[];
    brandVoiceKeywords: string[];
    bannedPhrases: string[];
    customTemplates: {
        type: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
        id: string;
        name: string;
        description: string;
        promptTemplate: string;
        isActive: boolean;
    }[];
    wordCountTargets?: Partial<Record<"blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper", {
        min: number;
        max: number;
        target: number;
    }>> | undefined;
}, {
    defaultContentType?: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper" | undefined;
    defaultTone?: "professional" | "casual" | "authoritative" | "friendly" | "humorous" | "inspirational" | "educational" | undefined;
    defaultLanguage?: string | undefined;
    supportedLanguages?: string[] | undefined;
    brandVoiceKeywords?: string[] | undefined;
    bannedPhrases?: string[] | undefined;
    wordCountTargets?: Partial<Record<"blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper", {
        min: number;
        max: number;
        target: number;
    }>> | undefined;
    customTemplates?: {
        type: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
        id: string;
        name: string;
        description: string;
        promptTemplate: string;
        isActive?: boolean | undefined;
    }[] | undefined;
}>;
export type TemplatePreferences = z.infer<typeof TemplatePreferencesSchema>;
export declare const PublishingDefaultsSchema: z.ZodObject<{
    /** Default publish channels */
    defaultChannels: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Auto-schedule publishing */
    autoSchedule: z.ZodDefault<z.ZodBoolean>;
    /** Preferred publish times (hours in 24h format) */
    preferredPublishTimes: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    /** Preferred publish days */
    preferredPublishDays: z.ZodDefault<z.ZodArray<z.ZodEnum<["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]>, "many">>;
    /** Timezone for scheduling */
    timezone: z.ZodDefault<z.ZodString>;
    /** Require approval before publishing */
    requireApproval: z.ZodDefault<z.ZodBoolean>;
    /** Minimum approval count */
    minApprovals: z.ZodDefault<z.ZodNumber>;
    /** Auto-add SEO metadata */
    autoSeoMetadata: z.ZodDefault<z.ZodBoolean>;
    /** Auto-generate social media previews */
    autoSocialPreviews: z.ZodDefault<z.ZodBoolean>;
    /** Default content expiration (days, 0 = never) */
    contentExpirationDays: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    defaultChannels: string[];
    autoSchedule: boolean;
    preferredPublishTimes: number[];
    preferredPublishDays: ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[];
    timezone: string;
    requireApproval: boolean;
    minApprovals: number;
    autoSeoMetadata: boolean;
    autoSocialPreviews: boolean;
    contentExpirationDays: number;
}, {
    defaultChannels?: string[] | undefined;
    autoSchedule?: boolean | undefined;
    preferredPublishTimes?: number[] | undefined;
    preferredPublishDays?: ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[] | undefined;
    timezone?: string | undefined;
    requireApproval?: boolean | undefined;
    minApprovals?: number | undefined;
    autoSeoMetadata?: boolean | undefined;
    autoSocialPreviews?: boolean | undefined;
    contentExpirationDays?: number | undefined;
}>;
export type PublishingDefaults = z.infer<typeof PublishingDefaultsSchema>;
export declare const CfAiConfigSchema: z.ZodObject<{
    /** Enable AI content generation */
    enabled: z.ZodDefault<z.ZodBoolean>;
    /** AI model preference */
    model: z.ZodDefault<z.ZodEnum<["claude", "gpt-4", "gpt-3.5", "custom"]>>;
    /** Temperature (creativity level, 0-1) */
    temperature: z.ZodDefault<z.ZodNumber>;
    /** Max tokens per generation */
    maxTokens: z.ZodDefault<z.ZodNumber>;
    /** Enable AI quality review */
    aiQualityReview: z.ZodDefault<z.ZodBoolean>;
    /** Enable AI SEO optimization */
    aiSeoOptimization: z.ZodDefault<z.ZodBoolean>;
    /** Enable AI image generation */
    aiImageGeneration: z.ZodDefault<z.ZodBoolean>;
    /** Enable AI translation */
    aiTranslation: z.ZodDefault<z.ZodBoolean>;
    /** Content safety filter level */
    safetyFilterLevel: z.ZodDefault<z.ZodEnum<["strict", "moderate", "minimal"]>>;
    /** Custom system prompt */
    customSystemPrompt: z.ZodOptional<z.ZodString>;
    /** Monthly AI usage limit (tokens) */
    monthlyTokenLimit: z.ZodOptional<z.ZodNumber>;
    /** Current month token usage */
    currentMonthUsage: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    enabled: boolean;
    model: "custom" | "claude" | "gpt-4" | "gpt-3.5";
    temperature: number;
    maxTokens: number;
    aiQualityReview: boolean;
    aiSeoOptimization: boolean;
    aiImageGeneration: boolean;
    aiTranslation: boolean;
    safetyFilterLevel: "strict" | "moderate" | "minimal";
    currentMonthUsage: number;
    customSystemPrompt?: string | undefined;
    monthlyTokenLimit?: number | undefined;
}, {
    enabled?: boolean | undefined;
    model?: "custom" | "claude" | "gpt-4" | "gpt-3.5" | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
    aiQualityReview?: boolean | undefined;
    aiSeoOptimization?: boolean | undefined;
    aiImageGeneration?: boolean | undefined;
    aiTranslation?: boolean | undefined;
    safetyFilterLevel?: "strict" | "moderate" | "minimal" | undefined;
    customSystemPrompt?: string | undefined;
    monthlyTokenLimit?: number | undefined;
    currentMonthUsage?: number | undefined;
}>;
export type CfAiConfig = z.infer<typeof CfAiConfigSchema>;
export declare const CfSettingsSchema: z.ZodObject<{
    templatePreferences: z.ZodObject<{
        /** Default content type */
        defaultContentType: z.ZodDefault<z.ZodEnum<["blog_post", "social_post", "email", "landing_page", "ad_copy", "video_script", "product_description", "newsletter", "press_release", "whitepaper"]>>;
        /** Default tone of voice */
        defaultTone: z.ZodDefault<z.ZodEnum<["professional", "casual", "authoritative", "friendly", "humorous", "inspirational", "educational"]>>;
        /** Default language */
        defaultLanguage: z.ZodDefault<z.ZodString>;
        /** Supported languages */
        supportedLanguages: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Brand voice keywords */
        brandVoiceKeywords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Banned words / phrases */
        bannedPhrases: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Default word count targets by type */
        wordCountTargets: z.ZodOptional<z.ZodRecord<z.ZodEnum<["blog_post", "social_post", "email", "landing_page", "ad_copy", "video_script", "product_description", "newsletter", "press_release", "whitepaper"]>, z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
            target: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
            target: number;
        }, {
            min: number;
            max: number;
            target: number;
        }>>>;
        /** Custom template library */
        customTemplates: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodEnum<["blog_post", "social_post", "email", "landing_page", "ad_copy", "video_script", "product_description", "newsletter", "press_release", "whitepaper"]>;
            description: z.ZodString;
            promptTemplate: z.ZodString;
            isActive: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            type: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
            id: string;
            name: string;
            description: string;
            promptTemplate: string;
            isActive: boolean;
        }, {
            type: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
            id: string;
            name: string;
            description: string;
            promptTemplate: string;
            isActive?: boolean | undefined;
        }>, "many">>;
    }, "strict", z.ZodTypeAny, {
        defaultContentType: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
        defaultTone: "professional" | "casual" | "authoritative" | "friendly" | "humorous" | "inspirational" | "educational";
        defaultLanguage: string;
        supportedLanguages: string[];
        brandVoiceKeywords: string[];
        bannedPhrases: string[];
        customTemplates: {
            type: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
            id: string;
            name: string;
            description: string;
            promptTemplate: string;
            isActive: boolean;
        }[];
        wordCountTargets?: Partial<Record<"blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper", {
            min: number;
            max: number;
            target: number;
        }>> | undefined;
    }, {
        defaultContentType?: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper" | undefined;
        defaultTone?: "professional" | "casual" | "authoritative" | "friendly" | "humorous" | "inspirational" | "educational" | undefined;
        defaultLanguage?: string | undefined;
        supportedLanguages?: string[] | undefined;
        brandVoiceKeywords?: string[] | undefined;
        bannedPhrases?: string[] | undefined;
        wordCountTargets?: Partial<Record<"blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper", {
            min: number;
            max: number;
            target: number;
        }>> | undefined;
        customTemplates?: {
            type: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
            id: string;
            name: string;
            description: string;
            promptTemplate: string;
            isActive?: boolean | undefined;
        }[] | undefined;
    }>;
    publishingDefaults: z.ZodObject<{
        /** Default publish channels */
        defaultChannels: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Auto-schedule publishing */
        autoSchedule: z.ZodDefault<z.ZodBoolean>;
        /** Preferred publish times (hours in 24h format) */
        preferredPublishTimes: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        /** Preferred publish days */
        preferredPublishDays: z.ZodDefault<z.ZodArray<z.ZodEnum<["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]>, "many">>;
        /** Timezone for scheduling */
        timezone: z.ZodDefault<z.ZodString>;
        /** Require approval before publishing */
        requireApproval: z.ZodDefault<z.ZodBoolean>;
        /** Minimum approval count */
        minApprovals: z.ZodDefault<z.ZodNumber>;
        /** Auto-add SEO metadata */
        autoSeoMetadata: z.ZodDefault<z.ZodBoolean>;
        /** Auto-generate social media previews */
        autoSocialPreviews: z.ZodDefault<z.ZodBoolean>;
        /** Default content expiration (days, 0 = never) */
        contentExpirationDays: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        defaultChannels: string[];
        autoSchedule: boolean;
        preferredPublishTimes: number[];
        preferredPublishDays: ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[];
        timezone: string;
        requireApproval: boolean;
        minApprovals: number;
        autoSeoMetadata: boolean;
        autoSocialPreviews: boolean;
        contentExpirationDays: number;
    }, {
        defaultChannels?: string[] | undefined;
        autoSchedule?: boolean | undefined;
        preferredPublishTimes?: number[] | undefined;
        preferredPublishDays?: ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[] | undefined;
        timezone?: string | undefined;
        requireApproval?: boolean | undefined;
        minApprovals?: number | undefined;
        autoSeoMetadata?: boolean | undefined;
        autoSocialPreviews?: boolean | undefined;
        contentExpirationDays?: number | undefined;
    }>;
    aiConfig: z.ZodObject<{
        /** Enable AI content generation */
        enabled: z.ZodDefault<z.ZodBoolean>;
        /** AI model preference */
        model: z.ZodDefault<z.ZodEnum<["claude", "gpt-4", "gpt-3.5", "custom"]>>;
        /** Temperature (creativity level, 0-1) */
        temperature: z.ZodDefault<z.ZodNumber>;
        /** Max tokens per generation */
        maxTokens: z.ZodDefault<z.ZodNumber>;
        /** Enable AI quality review */
        aiQualityReview: z.ZodDefault<z.ZodBoolean>;
        /** Enable AI SEO optimization */
        aiSeoOptimization: z.ZodDefault<z.ZodBoolean>;
        /** Enable AI image generation */
        aiImageGeneration: z.ZodDefault<z.ZodBoolean>;
        /** Enable AI translation */
        aiTranslation: z.ZodDefault<z.ZodBoolean>;
        /** Content safety filter level */
        safetyFilterLevel: z.ZodDefault<z.ZodEnum<["strict", "moderate", "minimal"]>>;
        /** Custom system prompt */
        customSystemPrompt: z.ZodOptional<z.ZodString>;
        /** Monthly AI usage limit (tokens) */
        monthlyTokenLimit: z.ZodOptional<z.ZodNumber>;
        /** Current month token usage */
        currentMonthUsage: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        enabled: boolean;
        model: "custom" | "claude" | "gpt-4" | "gpt-3.5";
        temperature: number;
        maxTokens: number;
        aiQualityReview: boolean;
        aiSeoOptimization: boolean;
        aiImageGeneration: boolean;
        aiTranslation: boolean;
        safetyFilterLevel: "strict" | "moderate" | "minimal";
        currentMonthUsage: number;
        customSystemPrompt?: string | undefined;
        monthlyTokenLimit?: number | undefined;
    }, {
        enabled?: boolean | undefined;
        model?: "custom" | "claude" | "gpt-4" | "gpt-3.5" | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        aiQualityReview?: boolean | undefined;
        aiSeoOptimization?: boolean | undefined;
        aiImageGeneration?: boolean | undefined;
        aiTranslation?: boolean | undefined;
        safetyFilterLevel?: "strict" | "moderate" | "minimal" | undefined;
        customSystemPrompt?: string | undefined;
        monthlyTokenLimit?: number | undefined;
        currentMonthUsage?: number | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    templatePreferences: {
        defaultContentType: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
        defaultTone: "professional" | "casual" | "authoritative" | "friendly" | "humorous" | "inspirational" | "educational";
        defaultLanguage: string;
        supportedLanguages: string[];
        brandVoiceKeywords: string[];
        bannedPhrases: string[];
        customTemplates: {
            type: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
            id: string;
            name: string;
            description: string;
            promptTemplate: string;
            isActive: boolean;
        }[];
        wordCountTargets?: Partial<Record<"blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper", {
            min: number;
            max: number;
            target: number;
        }>> | undefined;
    };
    publishingDefaults: {
        defaultChannels: string[];
        autoSchedule: boolean;
        preferredPublishTimes: number[];
        preferredPublishDays: ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[];
        timezone: string;
        requireApproval: boolean;
        minApprovals: number;
        autoSeoMetadata: boolean;
        autoSocialPreviews: boolean;
        contentExpirationDays: number;
    };
    aiConfig: {
        enabled: boolean;
        model: "custom" | "claude" | "gpt-4" | "gpt-3.5";
        temperature: number;
        maxTokens: number;
        aiQualityReview: boolean;
        aiSeoOptimization: boolean;
        aiImageGeneration: boolean;
        aiTranslation: boolean;
        safetyFilterLevel: "strict" | "moderate" | "minimal";
        currentMonthUsage: number;
        customSystemPrompt?: string | undefined;
        monthlyTokenLimit?: number | undefined;
    };
}, {
    templatePreferences: {
        defaultContentType?: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper" | undefined;
        defaultTone?: "professional" | "casual" | "authoritative" | "friendly" | "humorous" | "inspirational" | "educational" | undefined;
        defaultLanguage?: string | undefined;
        supportedLanguages?: string[] | undefined;
        brandVoiceKeywords?: string[] | undefined;
        bannedPhrases?: string[] | undefined;
        wordCountTargets?: Partial<Record<"blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper", {
            min: number;
            max: number;
            target: number;
        }>> | undefined;
        customTemplates?: {
            type: "blog_post" | "social_post" | "email" | "landing_page" | "ad_copy" | "video_script" | "product_description" | "newsletter" | "press_release" | "whitepaper";
            id: string;
            name: string;
            description: string;
            promptTemplate: string;
            isActive?: boolean | undefined;
        }[] | undefined;
    };
    publishingDefaults: {
        defaultChannels?: string[] | undefined;
        autoSchedule?: boolean | undefined;
        preferredPublishTimes?: number[] | undefined;
        preferredPublishDays?: ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[] | undefined;
        timezone?: string | undefined;
        requireApproval?: boolean | undefined;
        minApprovals?: number | undefined;
        autoSeoMetadata?: boolean | undefined;
        autoSocialPreviews?: boolean | undefined;
        contentExpirationDays?: number | undefined;
    };
    aiConfig: {
        enabled?: boolean | undefined;
        model?: "custom" | "claude" | "gpt-4" | "gpt-3.5" | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        aiQualityReview?: boolean | undefined;
        aiSeoOptimization?: boolean | undefined;
        aiImageGeneration?: boolean | undefined;
        aiTranslation?: boolean | undefined;
        safetyFilterLevel?: "strict" | "moderate" | "minimal" | undefined;
        customSystemPrompt?: string | undefined;
        monthlyTokenLimit?: number | undefined;
        currentMonthUsage?: number | undefined;
    };
}>;
export type CfSettings = z.infer<typeof CfSettingsSchema>;
//# sourceMappingURL=cf-integration.d.ts.map