/**
 * INT-PCT-001: PCT Analytics Integration
 * INT-PCT-002: PCT Settings Integration
 *
 * Type definitions and Zod schemas for Performance Creative Testing (PCT)
 * product analytics dashboards and settings panels.
 */
import { z } from "zod";
export declare const AdPerformanceMetricSchema: z.ZodObject<{
    /** Ad identifier */
    adId: z.ZodString;
    /** Ad name / title */
    adName: z.ZodString;
    /** Campaign identifier */
    campaignId: z.ZodString;
    /** Platform (Meta, Google, TikTok, etc.) */
    platform: z.ZodEnum<["meta", "google", "tiktok", "linkedin", "twitter", "pinterest", "snapchat"]>;
    /** Date range start */
    dateStart: z.ZodString;
    /** Date range end */
    dateEnd: z.ZodString;
    /** Impressions */
    impressions: z.ZodNumber;
    /** Clicks */
    clicks: z.ZodNumber;
    /** Click-through rate (0-1) */
    ctr: z.ZodNumber;
    /** Cost per click */
    cpc: z.ZodNumber;
    /** Cost per mille (1000 impressions) */
    cpm: z.ZodNumber;
    /** Total spend */
    spend: z.ZodNumber;
    /** Conversions */
    conversions: z.ZodNumber;
    /** Cost per acquisition */
    cpa: z.ZodNumber;
    /** Return on ad spend */
    roas: z.ZodNumber;
    /** Revenue generated */
    revenue: z.ZodNumber;
    /** Engagement rate */
    engagementRate: z.ZodNumber;
    /** Video views (if applicable) */
    videoViews: z.ZodOptional<z.ZodNumber>;
    /** Video completion rate (if applicable) */
    videoCompletionRate: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    ctr: number;
    adId: string;
    adName: string;
    campaignId: string;
    platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
    dateStart: string;
    dateEnd: string;
    impressions: number;
    clicks: number;
    cpc: number;
    cpm: number;
    spend: number;
    conversions: number;
    cpa: number;
    roas: number;
    revenue: number;
    engagementRate: number;
    videoViews?: number | undefined;
    videoCompletionRate?: number | undefined;
}, {
    ctr: number;
    adId: string;
    adName: string;
    campaignId: string;
    platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
    dateStart: string;
    dateEnd: string;
    impressions: number;
    clicks: number;
    cpc: number;
    cpm: number;
    spend: number;
    conversions: number;
    cpa: number;
    roas: number;
    revenue: number;
    engagementRate: number;
    videoViews?: number | undefined;
    videoCompletionRate?: number | undefined;
}>;
export type AdPerformanceMetric = z.infer<typeof AdPerformanceMetricSchema>;
export declare const CampaignStatusSchema: z.ZodEnum<["draft", "active", "paused", "completed", "archived", "error"]>;
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;
export declare const CampaignSummarySchema: z.ZodObject<{
    /** Campaign identifier */
    campaignId: z.ZodString;
    /** Campaign name */
    name: z.ZodString;
    /** Campaign status */
    status: z.ZodEnum<["draft", "active", "paused", "completed", "archived", "error"]>;
    /** Platform */
    platform: z.ZodEnum<["meta", "google", "tiktok", "linkedin", "twitter", "pinterest", "snapchat"]>;
    /** Campaign objective */
    objective: z.ZodEnum<["awareness", "traffic", "engagement", "leads", "conversions", "sales", "app_installs"]>;
    /** Budget (total or daily depending on budgetType) */
    budget: z.ZodNumber;
    /** Budget type */
    budgetType: z.ZodEnum<["daily", "lifetime"]>;
    /** Currency code */
    currency: z.ZodDefault<z.ZodString>;
    /** Start date */
    startDate: z.ZodString;
    /** End date */
    endDate: z.ZodOptional<z.ZodString>;
    /** Number of ad sets / ad groups */
    adSetCount: z.ZodNumber;
    /** Number of ads */
    adCount: z.ZodNumber;
    /** Total spend to date */
    totalSpend: z.ZodNumber;
    /** Overall ROAS */
    overallRoas: z.ZodNumber;
    /** Overall CTR */
    overallCtr: z.ZodNumber;
    /** Overall CPA */
    overallCpa: z.ZodNumber;
    /** Budget utilization (0-1) */
    budgetUtilization: z.ZodNumber;
    /** Last updated timestamp */
    updatedAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    status: "active" | "draft" | "archived" | "error" | "paused" | "completed";
    name: string;
    currency: string;
    campaignId: string;
    platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
    objective: "conversions" | "awareness" | "traffic" | "engagement" | "leads" | "sales" | "app_installs";
    budget: number;
    budgetType: "daily" | "lifetime";
    startDate: string;
    adSetCount: number;
    adCount: number;
    totalSpend: number;
    overallRoas: number;
    overallCtr: number;
    overallCpa: number;
    budgetUtilization: number;
    updatedAt: string;
    endDate?: string | undefined;
}, {
    status: "active" | "draft" | "archived" | "error" | "paused" | "completed";
    name: string;
    campaignId: string;
    platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
    objective: "conversions" | "awareness" | "traffic" | "engagement" | "leads" | "sales" | "app_installs";
    budget: number;
    budgetType: "daily" | "lifetime";
    startDate: string;
    adSetCount: number;
    adCount: number;
    totalSpend: number;
    overallRoas: number;
    overallCtr: number;
    overallCpa: number;
    budgetUtilization: number;
    updatedAt: string;
    currency?: string | undefined;
    endDate?: string | undefined;
}>;
export type CampaignSummary = z.infer<typeof CampaignSummarySchema>;
export declare const CreativeScoreSchema: z.ZodObject<{
    /** Creative identifier */
    creativeId: z.ZodString;
    /** Creative name */
    name: z.ZodString;
    /** Creative type */
    type: z.ZodEnum<["image", "video", "carousel", "story", "text"]>;
    /** Thumbnail / preview URL */
    thumbnailUrl: z.ZodOptional<z.ZodString>;
    /** Overall performance score (0-100) */
    overallScore: z.ZodNumber;
    /** Click-through score (0-100) */
    clickScore: z.ZodNumber;
    /** Conversion score (0-100) */
    conversionScore: z.ZodNumber;
    /** Engagement score (0-100) */
    engagementScore: z.ZodNumber;
    /** Cost efficiency score (0-100) */
    costScore: z.ZodNumber;
    /** Audience resonance score (0-100) */
    audienceScore: z.ZodNumber;
    /** AI-generated insights / recommendations */
    insights: z.ZodArray<z.ZodString, "many">;
    /** Rank within campaign */
    rank: z.ZodNumber;
    /** Performance trend */
    trend: z.ZodEnum<["improving", "stable", "declining"]>;
    /** Number of active campaigns using this creative */
    activeCampaigns: z.ZodNumber;
    /** Fatigue indicator (how stale the creative is) */
    fatigueLevel: z.ZodEnum<["fresh", "moderate", "high", "critical"]>;
}, "strict", z.ZodTypeAny, {
    type: "text" | "image" | "video" | "carousel" | "story";
    trend: "stable" | "improving" | "declining";
    engagementScore: number;
    name: string;
    creativeId: string;
    overallScore: number;
    clickScore: number;
    conversionScore: number;
    costScore: number;
    audienceScore: number;
    insights: string[];
    rank: number;
    activeCampaigns: number;
    fatigueLevel: "moderate" | "fresh" | "high" | "critical";
    thumbnailUrl?: string | undefined;
}, {
    type: "text" | "image" | "video" | "carousel" | "story";
    trend: "stable" | "improving" | "declining";
    engagementScore: number;
    name: string;
    creativeId: string;
    overallScore: number;
    clickScore: number;
    conversionScore: number;
    costScore: number;
    audienceScore: number;
    insights: string[];
    rank: number;
    activeCampaigns: number;
    fatigueLevel: "moderate" | "fresh" | "high" | "critical";
    thumbnailUrl?: string | undefined;
}>;
export type CreativeScore = z.infer<typeof CreativeScoreSchema>;
export declare const PctAnalyticsDashboardSchema: z.ZodObject<{
    /** Time range for the dashboard view */
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
    /** Campaign summaries */
    campaigns: z.ZodArray<z.ZodObject<{
        /** Campaign identifier */
        campaignId: z.ZodString;
        /** Campaign name */
        name: z.ZodString;
        /** Campaign status */
        status: z.ZodEnum<["draft", "active", "paused", "completed", "archived", "error"]>;
        /** Platform */
        platform: z.ZodEnum<["meta", "google", "tiktok", "linkedin", "twitter", "pinterest", "snapchat"]>;
        /** Campaign objective */
        objective: z.ZodEnum<["awareness", "traffic", "engagement", "leads", "conversions", "sales", "app_installs"]>;
        /** Budget (total or daily depending on budgetType) */
        budget: z.ZodNumber;
        /** Budget type */
        budgetType: z.ZodEnum<["daily", "lifetime"]>;
        /** Currency code */
        currency: z.ZodDefault<z.ZodString>;
        /** Start date */
        startDate: z.ZodString;
        /** End date */
        endDate: z.ZodOptional<z.ZodString>;
        /** Number of ad sets / ad groups */
        adSetCount: z.ZodNumber;
        /** Number of ads */
        adCount: z.ZodNumber;
        /** Total spend to date */
        totalSpend: z.ZodNumber;
        /** Overall ROAS */
        overallRoas: z.ZodNumber;
        /** Overall CTR */
        overallCtr: z.ZodNumber;
        /** Overall CPA */
        overallCpa: z.ZodNumber;
        /** Budget utilization (0-1) */
        budgetUtilization: z.ZodNumber;
        /** Last updated timestamp */
        updatedAt: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        status: "active" | "draft" | "archived" | "error" | "paused" | "completed";
        name: string;
        currency: string;
        campaignId: string;
        platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
        objective: "conversions" | "awareness" | "traffic" | "engagement" | "leads" | "sales" | "app_installs";
        budget: number;
        budgetType: "daily" | "lifetime";
        startDate: string;
        adSetCount: number;
        adCount: number;
        totalSpend: number;
        overallRoas: number;
        overallCtr: number;
        overallCpa: number;
        budgetUtilization: number;
        updatedAt: string;
        endDate?: string | undefined;
    }, {
        status: "active" | "draft" | "archived" | "error" | "paused" | "completed";
        name: string;
        campaignId: string;
        platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
        objective: "conversions" | "awareness" | "traffic" | "engagement" | "leads" | "sales" | "app_installs";
        budget: number;
        budgetType: "daily" | "lifetime";
        startDate: string;
        adSetCount: number;
        adCount: number;
        totalSpend: number;
        overallRoas: number;
        overallCtr: number;
        overallCpa: number;
        budgetUtilization: number;
        updatedAt: string;
        currency?: string | undefined;
        endDate?: string | undefined;
    }>, "many">;
    /** Top performing ads */
    topAds: z.ZodArray<z.ZodObject<{
        /** Ad identifier */
        adId: z.ZodString;
        /** Ad name / title */
        adName: z.ZodString;
        /** Campaign identifier */
        campaignId: z.ZodString;
        /** Platform (Meta, Google, TikTok, etc.) */
        platform: z.ZodEnum<["meta", "google", "tiktok", "linkedin", "twitter", "pinterest", "snapchat"]>;
        /** Date range start */
        dateStart: z.ZodString;
        /** Date range end */
        dateEnd: z.ZodString;
        /** Impressions */
        impressions: z.ZodNumber;
        /** Clicks */
        clicks: z.ZodNumber;
        /** Click-through rate (0-1) */
        ctr: z.ZodNumber;
        /** Cost per click */
        cpc: z.ZodNumber;
        /** Cost per mille (1000 impressions) */
        cpm: z.ZodNumber;
        /** Total spend */
        spend: z.ZodNumber;
        /** Conversions */
        conversions: z.ZodNumber;
        /** Cost per acquisition */
        cpa: z.ZodNumber;
        /** Return on ad spend */
        roas: z.ZodNumber;
        /** Revenue generated */
        revenue: z.ZodNumber;
        /** Engagement rate */
        engagementRate: z.ZodNumber;
        /** Video views (if applicable) */
        videoViews: z.ZodOptional<z.ZodNumber>;
        /** Video completion rate (if applicable) */
        videoCompletionRate: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        ctr: number;
        adId: string;
        adName: string;
        campaignId: string;
        platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
        dateStart: string;
        dateEnd: string;
        impressions: number;
        clicks: number;
        cpc: number;
        cpm: number;
        spend: number;
        conversions: number;
        cpa: number;
        roas: number;
        revenue: number;
        engagementRate: number;
        videoViews?: number | undefined;
        videoCompletionRate?: number | undefined;
    }, {
        ctr: number;
        adId: string;
        adName: string;
        campaignId: string;
        platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
        dateStart: string;
        dateEnd: string;
        impressions: number;
        clicks: number;
        cpc: number;
        cpm: number;
        spend: number;
        conversions: number;
        cpa: number;
        roas: number;
        revenue: number;
        engagementRate: number;
        videoViews?: number | undefined;
        videoCompletionRate?: number | undefined;
    }>, "many">;
    /** Creative scores */
    creativeScores: z.ZodArray<z.ZodObject<{
        /** Creative identifier */
        creativeId: z.ZodString;
        /** Creative name */
        name: z.ZodString;
        /** Creative type */
        type: z.ZodEnum<["image", "video", "carousel", "story", "text"]>;
        /** Thumbnail / preview URL */
        thumbnailUrl: z.ZodOptional<z.ZodString>;
        /** Overall performance score (0-100) */
        overallScore: z.ZodNumber;
        /** Click-through score (0-100) */
        clickScore: z.ZodNumber;
        /** Conversion score (0-100) */
        conversionScore: z.ZodNumber;
        /** Engagement score (0-100) */
        engagementScore: z.ZodNumber;
        /** Cost efficiency score (0-100) */
        costScore: z.ZodNumber;
        /** Audience resonance score (0-100) */
        audienceScore: z.ZodNumber;
        /** AI-generated insights / recommendations */
        insights: z.ZodArray<z.ZodString, "many">;
        /** Rank within campaign */
        rank: z.ZodNumber;
        /** Performance trend */
        trend: z.ZodEnum<["improving", "stable", "declining"]>;
        /** Number of active campaigns using this creative */
        activeCampaigns: z.ZodNumber;
        /** Fatigue indicator (how stale the creative is) */
        fatigueLevel: z.ZodEnum<["fresh", "moderate", "high", "critical"]>;
    }, "strict", z.ZodTypeAny, {
        type: "text" | "image" | "video" | "carousel" | "story";
        trend: "stable" | "improving" | "declining";
        engagementScore: number;
        name: string;
        creativeId: string;
        overallScore: number;
        clickScore: number;
        conversionScore: number;
        costScore: number;
        audienceScore: number;
        insights: string[];
        rank: number;
        activeCampaigns: number;
        fatigueLevel: "moderate" | "fresh" | "high" | "critical";
        thumbnailUrl?: string | undefined;
    }, {
        type: "text" | "image" | "video" | "carousel" | "story";
        trend: "stable" | "improving" | "declining";
        engagementScore: number;
        name: string;
        creativeId: string;
        overallScore: number;
        clickScore: number;
        conversionScore: number;
        costScore: number;
        audienceScore: number;
        insights: string[];
        rank: number;
        activeCampaigns: number;
        fatigueLevel: "moderate" | "fresh" | "high" | "critical";
        thumbnailUrl?: string | undefined;
    }>, "many">;
    /** Aggregate metrics */
    aggregates: z.ZodObject<{
        totalSpend: z.ZodNumber;
        totalRevenue: z.ZodNumber;
        averageRoas: z.ZodNumber;
        averageCtr: z.ZodNumber;
        averageCpa: z.ZodNumber;
        totalImpressions: z.ZodNumber;
        totalClicks: z.ZodNumber;
        totalConversions: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalSpend: number;
        totalRevenue: number;
        averageRoas: number;
        averageCtr: number;
        averageCpa: number;
        totalImpressions: number;
        totalClicks: number;
        totalConversions: number;
    }, {
        totalSpend: number;
        totalRevenue: number;
        averageRoas: number;
        averageCtr: number;
        averageCpa: number;
        totalImpressions: number;
        totalClicks: number;
        totalConversions: number;
    }>;
    /** Comparison period metrics (for trend arrows) */
    comparison: z.ZodOptional<z.ZodObject<{
        spendChange: z.ZodNumber;
        revenueChange: z.ZodNumber;
        roasChange: z.ZodNumber;
        ctrChange: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        spendChange: number;
        revenueChange: number;
        roasChange: number;
        ctrChange: number;
    }, {
        spendChange: number;
        revenueChange: number;
        roasChange: number;
        ctrChange: number;
    }>>;
}, "strict", z.ZodTypeAny, {
    timeRange: {
        start: string;
        end: string;
        granularity: "hour" | "day" | "week" | "month";
    };
    campaigns: {
        status: "active" | "draft" | "archived" | "error" | "paused" | "completed";
        name: string;
        currency: string;
        campaignId: string;
        platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
        objective: "conversions" | "awareness" | "traffic" | "engagement" | "leads" | "sales" | "app_installs";
        budget: number;
        budgetType: "daily" | "lifetime";
        startDate: string;
        adSetCount: number;
        adCount: number;
        totalSpend: number;
        overallRoas: number;
        overallCtr: number;
        overallCpa: number;
        budgetUtilization: number;
        updatedAt: string;
        endDate?: string | undefined;
    }[];
    topAds: {
        ctr: number;
        adId: string;
        adName: string;
        campaignId: string;
        platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
        dateStart: string;
        dateEnd: string;
        impressions: number;
        clicks: number;
        cpc: number;
        cpm: number;
        spend: number;
        conversions: number;
        cpa: number;
        roas: number;
        revenue: number;
        engagementRate: number;
        videoViews?: number | undefined;
        videoCompletionRate?: number | undefined;
    }[];
    creativeScores: {
        type: "text" | "image" | "video" | "carousel" | "story";
        trend: "stable" | "improving" | "declining";
        engagementScore: number;
        name: string;
        creativeId: string;
        overallScore: number;
        clickScore: number;
        conversionScore: number;
        costScore: number;
        audienceScore: number;
        insights: string[];
        rank: number;
        activeCampaigns: number;
        fatigueLevel: "moderate" | "fresh" | "high" | "critical";
        thumbnailUrl?: string | undefined;
    }[];
    aggregates: {
        totalSpend: number;
        totalRevenue: number;
        averageRoas: number;
        averageCtr: number;
        averageCpa: number;
        totalImpressions: number;
        totalClicks: number;
        totalConversions: number;
    };
    comparison?: {
        spendChange: number;
        revenueChange: number;
        roasChange: number;
        ctrChange: number;
    } | undefined;
}, {
    timeRange: {
        start: string;
        end: string;
        granularity: "hour" | "day" | "week" | "month";
    };
    campaigns: {
        status: "active" | "draft" | "archived" | "error" | "paused" | "completed";
        name: string;
        campaignId: string;
        platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
        objective: "conversions" | "awareness" | "traffic" | "engagement" | "leads" | "sales" | "app_installs";
        budget: number;
        budgetType: "daily" | "lifetime";
        startDate: string;
        adSetCount: number;
        adCount: number;
        totalSpend: number;
        overallRoas: number;
        overallCtr: number;
        overallCpa: number;
        budgetUtilization: number;
        updatedAt: string;
        currency?: string | undefined;
        endDate?: string | undefined;
    }[];
    topAds: {
        ctr: number;
        adId: string;
        adName: string;
        campaignId: string;
        platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
        dateStart: string;
        dateEnd: string;
        impressions: number;
        clicks: number;
        cpc: number;
        cpm: number;
        spend: number;
        conversions: number;
        cpa: number;
        roas: number;
        revenue: number;
        engagementRate: number;
        videoViews?: number | undefined;
        videoCompletionRate?: number | undefined;
    }[];
    creativeScores: {
        type: "text" | "image" | "video" | "carousel" | "story";
        trend: "stable" | "improving" | "declining";
        engagementScore: number;
        name: string;
        creativeId: string;
        overallScore: number;
        clickScore: number;
        conversionScore: number;
        costScore: number;
        audienceScore: number;
        insights: string[];
        rank: number;
        activeCampaigns: number;
        fatigueLevel: "moderate" | "fresh" | "high" | "critical";
        thumbnailUrl?: string | undefined;
    }[];
    aggregates: {
        totalSpend: number;
        totalRevenue: number;
        averageRoas: number;
        averageCtr: number;
        averageCpa: number;
        totalImpressions: number;
        totalClicks: number;
        totalConversions: number;
    };
    comparison?: {
        spendChange: number;
        revenueChange: number;
        roasChange: number;
        ctrChange: number;
    } | undefined;
}>;
export type PctAnalyticsDashboard = z.infer<typeof PctAnalyticsDashboardSchema>;
export declare const PctConfigurationSchema: z.ZodObject<{
    /** Default currency for reporting */
    defaultCurrency: z.ZodDefault<z.ZodString>;
    /** Default time zone */
    defaultTimezone: z.ZodDefault<z.ZodString>;
    /** Default date range (days) */
    defaultDateRange: z.ZodDefault<z.ZodNumber>;
    /** Attribution window (days) */
    attributionWindow: z.ZodDefault<z.ZodNumber>;
    /** Attribution model */
    attributionModel: z.ZodDefault<z.ZodEnum<["last_click", "first_click", "linear", "time_decay", "position_based", "data_driven"]>>;
    /** Connected ad platforms */
    connectedPlatforms: z.ZodArray<z.ZodObject<{
        platform: z.ZodEnum<["meta", "google", "tiktok", "linkedin", "twitter", "pinterest", "snapchat"]>;
        accountId: z.ZodString;
        accountName: z.ZodString;
        connected: z.ZodBoolean;
        lastSynced: z.ZodOptional<z.ZodString>;
        syncStatus: z.ZodEnum<["synced", "syncing", "error", "disconnected"]>;
    }, "strip", z.ZodTypeAny, {
        platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
        accountId: string;
        accountName: string;
        connected: boolean;
        syncStatus: "error" | "synced" | "syncing" | "disconnected";
        lastSynced?: string | undefined;
    }, {
        platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
        accountId: string;
        accountName: string;
        connected: boolean;
        syncStatus: "error" | "synced" | "syncing" | "disconnected";
        lastSynced?: string | undefined;
    }>, "many">;
    /** Budget alert thresholds */
    budgetAlerts: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        warningThreshold: z.ZodDefault<z.ZodNumber>;
        criticalThreshold: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        warningThreshold: number;
        criticalThreshold: number;
    }, {
        enabled?: boolean | undefined;
        warningThreshold?: number | undefined;
        criticalThreshold?: number | undefined;
    }>;
    /** Performance alert thresholds */
    performanceAlerts: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        roasMinimum: z.ZodDefault<z.ZodNumber>;
        cpaMaximum: z.ZodOptional<z.ZodNumber>;
        ctrMinimum: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        roasMinimum: number;
        cpaMaximum?: number | undefined;
        ctrMinimum?: number | undefined;
    }, {
        enabled?: boolean | undefined;
        roasMinimum?: number | undefined;
        cpaMaximum?: number | undefined;
        ctrMinimum?: number | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    defaultCurrency: string;
    defaultTimezone: string;
    defaultDateRange: number;
    attributionWindow: number;
    attributionModel: "linear" | "last_click" | "first_click" | "time_decay" | "position_based" | "data_driven";
    connectedPlatforms: {
        platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
        accountId: string;
        accountName: string;
        connected: boolean;
        syncStatus: "error" | "synced" | "syncing" | "disconnected";
        lastSynced?: string | undefined;
    }[];
    budgetAlerts: {
        enabled: boolean;
        warningThreshold: number;
        criticalThreshold: number;
    };
    performanceAlerts: {
        enabled: boolean;
        roasMinimum: number;
        cpaMaximum?: number | undefined;
        ctrMinimum?: number | undefined;
    };
}, {
    connectedPlatforms: {
        platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
        accountId: string;
        accountName: string;
        connected: boolean;
        syncStatus: "error" | "synced" | "syncing" | "disconnected";
        lastSynced?: string | undefined;
    }[];
    budgetAlerts: {
        enabled?: boolean | undefined;
        warningThreshold?: number | undefined;
        criticalThreshold?: number | undefined;
    };
    performanceAlerts: {
        enabled?: boolean | undefined;
        roasMinimum?: number | undefined;
        cpaMaximum?: number | undefined;
        ctrMinimum?: number | undefined;
    };
    defaultCurrency?: string | undefined;
    defaultTimezone?: string | undefined;
    defaultDateRange?: number | undefined;
    attributionWindow?: number | undefined;
    attributionModel?: "linear" | "last_click" | "first_click" | "time_decay" | "position_based" | "data_driven" | undefined;
}>;
export type PctConfiguration = z.infer<typeof PctConfigurationSchema>;
export declare const PctFeatureTogglesSchema: z.ZodObject<{
    /** Enable AI-powered creative scoring */
    aiCreativeScoring: z.ZodDefault<z.ZodBoolean>;
    /** Enable automated A/B testing */
    autoAbTesting: z.ZodDefault<z.ZodBoolean>;
    /** Enable cross-platform comparison */
    crossPlatformAnalytics: z.ZodDefault<z.ZodBoolean>;
    /** Enable predictive budget allocation */
    predictiveBudgeting: z.ZodDefault<z.ZodBoolean>;
    /** Enable creative fatigue detection */
    fatigueDetection: z.ZodDefault<z.ZodBoolean>;
    /** Enable audience insights */
    audienceInsights: z.ZodDefault<z.ZodBoolean>;
    /** Enable automated reporting */
    automatedReports: z.ZodDefault<z.ZodBoolean>;
    /** Enable competitor analysis */
    competitorAnalysis: z.ZodDefault<z.ZodBoolean>;
    /** Enable real-time bid adjustments */
    realtimeBidding: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    aiCreativeScoring: boolean;
    autoAbTesting: boolean;
    crossPlatformAnalytics: boolean;
    predictiveBudgeting: boolean;
    fatigueDetection: boolean;
    audienceInsights: boolean;
    automatedReports: boolean;
    competitorAnalysis: boolean;
    realtimeBidding: boolean;
}, {
    aiCreativeScoring?: boolean | undefined;
    autoAbTesting?: boolean | undefined;
    crossPlatformAnalytics?: boolean | undefined;
    predictiveBudgeting?: boolean | undefined;
    fatigueDetection?: boolean | undefined;
    audienceInsights?: boolean | undefined;
    automatedReports?: boolean | undefined;
    competitorAnalysis?: boolean | undefined;
    realtimeBidding?: boolean | undefined;
}>;
export type PctFeatureToggles = z.infer<typeof PctFeatureTogglesSchema>;
export declare const PctNotificationPreferencesSchema: z.ZodObject<{
    /** Notification channels */
    channels: z.ZodObject<{
        email: z.ZodDefault<z.ZodBoolean>;
        inApp: z.ZodDefault<z.ZodBoolean>;
        slack: z.ZodDefault<z.ZodBoolean>;
        sms: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        email: boolean;
        inApp: boolean;
        slack: boolean;
        sms: boolean;
    }, {
        email?: boolean | undefined;
        inApp?: boolean | undefined;
        slack?: boolean | undefined;
        sms?: boolean | undefined;
    }>;
    /** Notification types to subscribe to */
    subscriptions: z.ZodObject<{
        budgetAlerts: z.ZodDefault<z.ZodBoolean>;
        performanceAlerts: z.ZodDefault<z.ZodBoolean>;
        campaignStatusChanges: z.ZodDefault<z.ZodBoolean>;
        weeklyDigest: z.ZodDefault<z.ZodBoolean>;
        monthlyReport: z.ZodDefault<z.ZodBoolean>;
        creativeScoreUpdates: z.ZodDefault<z.ZodBoolean>;
        syncErrors: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        budgetAlerts: boolean;
        performanceAlerts: boolean;
        campaignStatusChanges: boolean;
        weeklyDigest: boolean;
        monthlyReport: boolean;
        creativeScoreUpdates: boolean;
        syncErrors: boolean;
    }, {
        budgetAlerts?: boolean | undefined;
        performanceAlerts?: boolean | undefined;
        campaignStatusChanges?: boolean | undefined;
        weeklyDigest?: boolean | undefined;
        monthlyReport?: boolean | undefined;
        creativeScoreUpdates?: boolean | undefined;
        syncErrors?: boolean | undefined;
    }>;
    /** Quiet hours */
    quietHours: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        start: z.ZodDefault<z.ZodString>;
        end: z.ZodDefault<z.ZodString>;
        timezone: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
        timezone: string;
        enabled: boolean;
    }, {
        start?: string | undefined;
        end?: string | undefined;
        timezone?: string | undefined;
        enabled?: boolean | undefined;
    }>;
    /** Digest frequency */
    digestFrequency: z.ZodDefault<z.ZodEnum<["daily", "weekly", "monthly"]>>;
}, "strict", z.ZodTypeAny, {
    channels: {
        email: boolean;
        inApp: boolean;
        slack: boolean;
        sms: boolean;
    };
    subscriptions: {
        budgetAlerts: boolean;
        performanceAlerts: boolean;
        campaignStatusChanges: boolean;
        weeklyDigest: boolean;
        monthlyReport: boolean;
        creativeScoreUpdates: boolean;
        syncErrors: boolean;
    };
    quietHours: {
        start: string;
        end: string;
        timezone: string;
        enabled: boolean;
    };
    digestFrequency: "daily" | "weekly" | "monthly";
}, {
    channels: {
        email?: boolean | undefined;
        inApp?: boolean | undefined;
        slack?: boolean | undefined;
        sms?: boolean | undefined;
    };
    subscriptions: {
        budgetAlerts?: boolean | undefined;
        performanceAlerts?: boolean | undefined;
        campaignStatusChanges?: boolean | undefined;
        weeklyDigest?: boolean | undefined;
        monthlyReport?: boolean | undefined;
        creativeScoreUpdates?: boolean | undefined;
        syncErrors?: boolean | undefined;
    };
    quietHours: {
        start?: string | undefined;
        end?: string | undefined;
        timezone?: string | undefined;
        enabled?: boolean | undefined;
    };
    digestFrequency?: "daily" | "weekly" | "monthly" | undefined;
}>;
export type PctNotificationPreferences = z.infer<typeof PctNotificationPreferencesSchema>;
export declare const PctSettingsSchema: z.ZodObject<{
    configuration: z.ZodObject<{
        /** Default currency for reporting */
        defaultCurrency: z.ZodDefault<z.ZodString>;
        /** Default time zone */
        defaultTimezone: z.ZodDefault<z.ZodString>;
        /** Default date range (days) */
        defaultDateRange: z.ZodDefault<z.ZodNumber>;
        /** Attribution window (days) */
        attributionWindow: z.ZodDefault<z.ZodNumber>;
        /** Attribution model */
        attributionModel: z.ZodDefault<z.ZodEnum<["last_click", "first_click", "linear", "time_decay", "position_based", "data_driven"]>>;
        /** Connected ad platforms */
        connectedPlatforms: z.ZodArray<z.ZodObject<{
            platform: z.ZodEnum<["meta", "google", "tiktok", "linkedin", "twitter", "pinterest", "snapchat"]>;
            accountId: z.ZodString;
            accountName: z.ZodString;
            connected: z.ZodBoolean;
            lastSynced: z.ZodOptional<z.ZodString>;
            syncStatus: z.ZodEnum<["synced", "syncing", "error", "disconnected"]>;
        }, "strip", z.ZodTypeAny, {
            platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
            accountId: string;
            accountName: string;
            connected: boolean;
            syncStatus: "error" | "synced" | "syncing" | "disconnected";
            lastSynced?: string | undefined;
        }, {
            platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
            accountId: string;
            accountName: string;
            connected: boolean;
            syncStatus: "error" | "synced" | "syncing" | "disconnected";
            lastSynced?: string | undefined;
        }>, "many">;
        /** Budget alert thresholds */
        budgetAlerts: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            warningThreshold: z.ZodDefault<z.ZodNumber>;
            criticalThreshold: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            warningThreshold: number;
            criticalThreshold: number;
        }, {
            enabled?: boolean | undefined;
            warningThreshold?: number | undefined;
            criticalThreshold?: number | undefined;
        }>;
        /** Performance alert thresholds */
        performanceAlerts: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            roasMinimum: z.ZodDefault<z.ZodNumber>;
            cpaMaximum: z.ZodOptional<z.ZodNumber>;
            ctrMinimum: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            roasMinimum: number;
            cpaMaximum?: number | undefined;
            ctrMinimum?: number | undefined;
        }, {
            enabled?: boolean | undefined;
            roasMinimum?: number | undefined;
            cpaMaximum?: number | undefined;
            ctrMinimum?: number | undefined;
        }>;
    }, "strict", z.ZodTypeAny, {
        defaultCurrency: string;
        defaultTimezone: string;
        defaultDateRange: number;
        attributionWindow: number;
        attributionModel: "linear" | "last_click" | "first_click" | "time_decay" | "position_based" | "data_driven";
        connectedPlatforms: {
            platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
            accountId: string;
            accountName: string;
            connected: boolean;
            syncStatus: "error" | "synced" | "syncing" | "disconnected";
            lastSynced?: string | undefined;
        }[];
        budgetAlerts: {
            enabled: boolean;
            warningThreshold: number;
            criticalThreshold: number;
        };
        performanceAlerts: {
            enabled: boolean;
            roasMinimum: number;
            cpaMaximum?: number | undefined;
            ctrMinimum?: number | undefined;
        };
    }, {
        connectedPlatforms: {
            platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
            accountId: string;
            accountName: string;
            connected: boolean;
            syncStatus: "error" | "synced" | "syncing" | "disconnected";
            lastSynced?: string | undefined;
        }[];
        budgetAlerts: {
            enabled?: boolean | undefined;
            warningThreshold?: number | undefined;
            criticalThreshold?: number | undefined;
        };
        performanceAlerts: {
            enabled?: boolean | undefined;
            roasMinimum?: number | undefined;
            cpaMaximum?: number | undefined;
            ctrMinimum?: number | undefined;
        };
        defaultCurrency?: string | undefined;
        defaultTimezone?: string | undefined;
        defaultDateRange?: number | undefined;
        attributionWindow?: number | undefined;
        attributionModel?: "linear" | "last_click" | "first_click" | "time_decay" | "position_based" | "data_driven" | undefined;
    }>;
    featureToggles: z.ZodObject<{
        /** Enable AI-powered creative scoring */
        aiCreativeScoring: z.ZodDefault<z.ZodBoolean>;
        /** Enable automated A/B testing */
        autoAbTesting: z.ZodDefault<z.ZodBoolean>;
        /** Enable cross-platform comparison */
        crossPlatformAnalytics: z.ZodDefault<z.ZodBoolean>;
        /** Enable predictive budget allocation */
        predictiveBudgeting: z.ZodDefault<z.ZodBoolean>;
        /** Enable creative fatigue detection */
        fatigueDetection: z.ZodDefault<z.ZodBoolean>;
        /** Enable audience insights */
        audienceInsights: z.ZodDefault<z.ZodBoolean>;
        /** Enable automated reporting */
        automatedReports: z.ZodDefault<z.ZodBoolean>;
        /** Enable competitor analysis */
        competitorAnalysis: z.ZodDefault<z.ZodBoolean>;
        /** Enable real-time bid adjustments */
        realtimeBidding: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        aiCreativeScoring: boolean;
        autoAbTesting: boolean;
        crossPlatformAnalytics: boolean;
        predictiveBudgeting: boolean;
        fatigueDetection: boolean;
        audienceInsights: boolean;
        automatedReports: boolean;
        competitorAnalysis: boolean;
        realtimeBidding: boolean;
    }, {
        aiCreativeScoring?: boolean | undefined;
        autoAbTesting?: boolean | undefined;
        crossPlatformAnalytics?: boolean | undefined;
        predictiveBudgeting?: boolean | undefined;
        fatigueDetection?: boolean | undefined;
        audienceInsights?: boolean | undefined;
        automatedReports?: boolean | undefined;
        competitorAnalysis?: boolean | undefined;
        realtimeBidding?: boolean | undefined;
    }>;
    notificationPreferences: z.ZodObject<{
        /** Notification channels */
        channels: z.ZodObject<{
            email: z.ZodDefault<z.ZodBoolean>;
            inApp: z.ZodDefault<z.ZodBoolean>;
            slack: z.ZodDefault<z.ZodBoolean>;
            sms: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            email: boolean;
            inApp: boolean;
            slack: boolean;
            sms: boolean;
        }, {
            email?: boolean | undefined;
            inApp?: boolean | undefined;
            slack?: boolean | undefined;
            sms?: boolean | undefined;
        }>;
        /** Notification types to subscribe to */
        subscriptions: z.ZodObject<{
            budgetAlerts: z.ZodDefault<z.ZodBoolean>;
            performanceAlerts: z.ZodDefault<z.ZodBoolean>;
            campaignStatusChanges: z.ZodDefault<z.ZodBoolean>;
            weeklyDigest: z.ZodDefault<z.ZodBoolean>;
            monthlyReport: z.ZodDefault<z.ZodBoolean>;
            creativeScoreUpdates: z.ZodDefault<z.ZodBoolean>;
            syncErrors: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            budgetAlerts: boolean;
            performanceAlerts: boolean;
            campaignStatusChanges: boolean;
            weeklyDigest: boolean;
            monthlyReport: boolean;
            creativeScoreUpdates: boolean;
            syncErrors: boolean;
        }, {
            budgetAlerts?: boolean | undefined;
            performanceAlerts?: boolean | undefined;
            campaignStatusChanges?: boolean | undefined;
            weeklyDigest?: boolean | undefined;
            monthlyReport?: boolean | undefined;
            creativeScoreUpdates?: boolean | undefined;
            syncErrors?: boolean | undefined;
        }>;
        /** Quiet hours */
        quietHours: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            start: z.ZodDefault<z.ZodString>;
            end: z.ZodDefault<z.ZodString>;
            timezone: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            start: string;
            end: string;
            timezone: string;
            enabled: boolean;
        }, {
            start?: string | undefined;
            end?: string | undefined;
            timezone?: string | undefined;
            enabled?: boolean | undefined;
        }>;
        /** Digest frequency */
        digestFrequency: z.ZodDefault<z.ZodEnum<["daily", "weekly", "monthly"]>>;
    }, "strict", z.ZodTypeAny, {
        channels: {
            email: boolean;
            inApp: boolean;
            slack: boolean;
            sms: boolean;
        };
        subscriptions: {
            budgetAlerts: boolean;
            performanceAlerts: boolean;
            campaignStatusChanges: boolean;
            weeklyDigest: boolean;
            monthlyReport: boolean;
            creativeScoreUpdates: boolean;
            syncErrors: boolean;
        };
        quietHours: {
            start: string;
            end: string;
            timezone: string;
            enabled: boolean;
        };
        digestFrequency: "daily" | "weekly" | "monthly";
    }, {
        channels: {
            email?: boolean | undefined;
            inApp?: boolean | undefined;
            slack?: boolean | undefined;
            sms?: boolean | undefined;
        };
        subscriptions: {
            budgetAlerts?: boolean | undefined;
            performanceAlerts?: boolean | undefined;
            campaignStatusChanges?: boolean | undefined;
            weeklyDigest?: boolean | undefined;
            monthlyReport?: boolean | undefined;
            creativeScoreUpdates?: boolean | undefined;
            syncErrors?: boolean | undefined;
        };
        quietHours: {
            start?: string | undefined;
            end?: string | undefined;
            timezone?: string | undefined;
            enabled?: boolean | undefined;
        };
        digestFrequency?: "daily" | "weekly" | "monthly" | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    configuration: {
        defaultCurrency: string;
        defaultTimezone: string;
        defaultDateRange: number;
        attributionWindow: number;
        attributionModel: "linear" | "last_click" | "first_click" | "time_decay" | "position_based" | "data_driven";
        connectedPlatforms: {
            platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
            accountId: string;
            accountName: string;
            connected: boolean;
            syncStatus: "error" | "synced" | "syncing" | "disconnected";
            lastSynced?: string | undefined;
        }[];
        budgetAlerts: {
            enabled: boolean;
            warningThreshold: number;
            criticalThreshold: number;
        };
        performanceAlerts: {
            enabled: boolean;
            roasMinimum: number;
            cpaMaximum?: number | undefined;
            ctrMinimum?: number | undefined;
        };
    };
    featureToggles: {
        aiCreativeScoring: boolean;
        autoAbTesting: boolean;
        crossPlatformAnalytics: boolean;
        predictiveBudgeting: boolean;
        fatigueDetection: boolean;
        audienceInsights: boolean;
        automatedReports: boolean;
        competitorAnalysis: boolean;
        realtimeBidding: boolean;
    };
    notificationPreferences: {
        channels: {
            email: boolean;
            inApp: boolean;
            slack: boolean;
            sms: boolean;
        };
        subscriptions: {
            budgetAlerts: boolean;
            performanceAlerts: boolean;
            campaignStatusChanges: boolean;
            weeklyDigest: boolean;
            monthlyReport: boolean;
            creativeScoreUpdates: boolean;
            syncErrors: boolean;
        };
        quietHours: {
            start: string;
            end: string;
            timezone: string;
            enabled: boolean;
        };
        digestFrequency: "daily" | "weekly" | "monthly";
    };
}, {
    configuration: {
        connectedPlatforms: {
            platform: "meta" | "google" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "snapchat";
            accountId: string;
            accountName: string;
            connected: boolean;
            syncStatus: "error" | "synced" | "syncing" | "disconnected";
            lastSynced?: string | undefined;
        }[];
        budgetAlerts: {
            enabled?: boolean | undefined;
            warningThreshold?: number | undefined;
            criticalThreshold?: number | undefined;
        };
        performanceAlerts: {
            enabled?: boolean | undefined;
            roasMinimum?: number | undefined;
            cpaMaximum?: number | undefined;
            ctrMinimum?: number | undefined;
        };
        defaultCurrency?: string | undefined;
        defaultTimezone?: string | undefined;
        defaultDateRange?: number | undefined;
        attributionWindow?: number | undefined;
        attributionModel?: "linear" | "last_click" | "first_click" | "time_decay" | "position_based" | "data_driven" | undefined;
    };
    featureToggles: {
        aiCreativeScoring?: boolean | undefined;
        autoAbTesting?: boolean | undefined;
        crossPlatformAnalytics?: boolean | undefined;
        predictiveBudgeting?: boolean | undefined;
        fatigueDetection?: boolean | undefined;
        audienceInsights?: boolean | undefined;
        automatedReports?: boolean | undefined;
        competitorAnalysis?: boolean | undefined;
        realtimeBidding?: boolean | undefined;
    };
    notificationPreferences: {
        channels: {
            email?: boolean | undefined;
            inApp?: boolean | undefined;
            slack?: boolean | undefined;
            sms?: boolean | undefined;
        };
        subscriptions: {
            budgetAlerts?: boolean | undefined;
            performanceAlerts?: boolean | undefined;
            campaignStatusChanges?: boolean | undefined;
            weeklyDigest?: boolean | undefined;
            monthlyReport?: boolean | undefined;
            creativeScoreUpdates?: boolean | undefined;
            syncErrors?: boolean | undefined;
        };
        quietHours: {
            start?: string | undefined;
            end?: string | undefined;
            timezone?: string | undefined;
            enabled?: boolean | undefined;
        };
        digestFrequency?: "daily" | "weekly" | "monthly" | undefined;
    };
}>;
export type PctSettings = z.infer<typeof PctSettingsSchema>;
//# sourceMappingURL=pct-integration.d.ts.map