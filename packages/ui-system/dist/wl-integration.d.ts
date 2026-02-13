/**
 * INT-WL-001: WaitlistLab Campaign Templates
 * INT-WL-002: WaitlistLab Audience Sharing
 *
 * Type definitions and Zod schemas for WaitlistLab product
 * campaign templates and audience sharing features.
 */
import { z } from "zod";
export declare const WaitlistCampaignTypes: readonly ["product_launch", "beta_access", "early_bird", "referral", "exclusive_content", "event_registration", "feature_vote", "pre_order"];
export type WaitlistCampaignType = (typeof WaitlistCampaignTypes)[number];
export declare const WaitlistCampaignTypeSchema: z.ZodEnum<["product_launch", "beta_access", "early_bird", "referral", "exclusive_content", "event_registration", "feature_vote", "pre_order"]>;
export declare const CampaignTypeDefinitionSchema: z.ZodObject<{
    /** Campaign type */
    type: z.ZodEnum<["product_launch", "beta_access", "early_bird", "referral", "exclusive_content", "event_registration", "feature_vote", "pre_order"]>;
    /** Display name */
    displayName: z.ZodString;
    /** Description */
    description: z.ZodString;
    /** Icon identifier */
    icon: z.ZodString;
    /** Whether this type supports referral mechanics */
    supportsReferrals: z.ZodBoolean;
    /** Whether this type supports priority/ranking */
    supportsPriority: z.ZodBoolean;
    /** Whether this type supports capacity limits */
    supportsCapacity: z.ZodBoolean;
    /** Default settings for this type */
    defaults: z.ZodObject<{
        /** Default capacity (0 = unlimited) */
        capacity: z.ZodDefault<z.ZodNumber>;
        /** Default referral reward points */
        referralRewardPoints: z.ZodDefault<z.ZodNumber>;
        /** Whether to show position in queue */
        showQueuePosition: z.ZodDefault<z.ZodBoolean>;
        /** Whether to enable social sharing */
        enableSocialSharing: z.ZodDefault<z.ZodBoolean>;
        /** Default confirmation email enabled */
        sendConfirmationEmail: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        capacity: number;
        referralRewardPoints: number;
        showQueuePosition: boolean;
        enableSocialSharing: boolean;
        sendConfirmationEmail: boolean;
    }, {
        capacity?: number | undefined;
        referralRewardPoints?: number | undefined;
        showQueuePosition?: boolean | undefined;
        enableSocialSharing?: boolean | undefined;
        sendConfirmationEmail?: boolean | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    type: "product_launch" | "beta_access" | "early_bird" | "referral" | "exclusive_content" | "event_registration" | "feature_vote" | "pre_order";
    icon: string;
    description: string;
    displayName: string;
    supportsReferrals: boolean;
    supportsPriority: boolean;
    supportsCapacity: boolean;
    defaults: {
        capacity: number;
        referralRewardPoints: number;
        showQueuePosition: boolean;
        enableSocialSharing: boolean;
        sendConfirmationEmail: boolean;
    };
}, {
    type: "product_launch" | "beta_access" | "early_bird" | "referral" | "exclusive_content" | "event_registration" | "feature_vote" | "pre_order";
    icon: string;
    description: string;
    displayName: string;
    supportsReferrals: boolean;
    supportsPriority: boolean;
    supportsCapacity: boolean;
    defaults: {
        capacity?: number | undefined;
        referralRewardPoints?: number | undefined;
        showQueuePosition?: boolean | undefined;
        enableSocialSharing?: boolean | undefined;
        sendConfirmationEmail?: boolean | undefined;
    };
}>;
export type CampaignTypeDefinition = z.infer<typeof CampaignTypeDefinitionSchema>;
/** Default campaign type definitions */
export declare const DefaultCampaignTypeDefinitions: Record<WaitlistCampaignType, CampaignTypeDefinition>;
export declare const WaitlistTemplateSchema: z.ZodObject<{
    /** Template identifier */
    id: z.ZodString;
    /** Template name */
    name: z.ZodString;
    /** Template description */
    description: z.ZodString;
    /** Campaign type */
    campaignType: z.ZodEnum<["product_launch", "beta_access", "early_bird", "referral", "exclusive_content", "event_registration", "feature_vote", "pre_order"]>;
    /** Template version */
    version: z.ZodDefault<z.ZodString>;
    /** Whether this is a system template (vs user-created) */
    isSystem: z.ZodDefault<z.ZodBoolean>;
    /** Landing page configuration */
    landingPage: z.ZodObject<{
        headline: z.ZodString;
        subheadline: z.ZodString;
        ctaText: z.ZodDefault<z.ZodString>;
        backgroundImage: z.ZodOptional<z.ZodString>;
        backgroundColor: z.ZodDefault<z.ZodString>;
        primaryColor: z.ZodDefault<z.ZodString>;
        logoUrl: z.ZodOptional<z.ZodString>;
        socialProof: z.ZodDefault<z.ZodBoolean>;
        socialProofText: z.ZodDefault<z.ZodString>;
        showCountdown: z.ZodDefault<z.ZodBoolean>;
        countdownDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        backgroundColor: string;
        headline: string;
        subheadline: string;
        ctaText: string;
        primaryColor: string;
        socialProof: boolean;
        socialProofText: string;
        showCountdown: boolean;
        backgroundImage?: string | undefined;
        logoUrl?: string | undefined;
        countdownDate?: string | undefined;
    }, {
        headline: string;
        subheadline: string;
        backgroundColor?: string | undefined;
        ctaText?: string | undefined;
        backgroundImage?: string | undefined;
        primaryColor?: string | undefined;
        logoUrl?: string | undefined;
        socialProof?: boolean | undefined;
        socialProofText?: string | undefined;
        showCountdown?: boolean | undefined;
        countdownDate?: string | undefined;
    }>;
    /** Signup form fields */
    formFields: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        label: z.ZodString;
        type: z.ZodEnum<["text", "email", "phone", "select", "checkbox"]>;
        required: z.ZodDefault<z.ZodBoolean>;
        placeholder: z.ZodOptional<z.ZodString>;
        options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "email" | "text" | "select" | "phone" | "checkbox";
        label: string;
        required: boolean;
        name: string;
        options?: string[] | undefined;
        placeholder?: string | undefined;
    }, {
        type: "email" | "text" | "select" | "phone" | "checkbox";
        label: string;
        name: string;
        options?: string[] | undefined;
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }>, "many">;
    /** Email templates */
    emails: z.ZodObject<{
        confirmation: z.ZodObject<{
            subject: z.ZodString;
            bodyTemplate: z.ZodString;
            enabled: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            subject: string;
            bodyTemplate: string;
        }, {
            subject: string;
            bodyTemplate: string;
            enabled?: boolean | undefined;
        }>;
        accessGranted: z.ZodObject<{
            subject: z.ZodString;
            bodyTemplate: z.ZodString;
            enabled: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            subject: string;
            bodyTemplate: string;
        }, {
            subject: string;
            bodyTemplate: string;
            enabled?: boolean | undefined;
        }>;
        referralReward: z.ZodOptional<z.ZodObject<{
            subject: z.ZodString;
            bodyTemplate: z.ZodString;
            enabled: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            subject: string;
            bodyTemplate: string;
        }, {
            subject: string;
            bodyTemplate: string;
            enabled?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        confirmation: {
            enabled: boolean;
            subject: string;
            bodyTemplate: string;
        };
        accessGranted: {
            enabled: boolean;
            subject: string;
            bodyTemplate: string;
        };
        referralReward?: {
            enabled: boolean;
            subject: string;
            bodyTemplate: string;
        } | undefined;
    }, {
        confirmation: {
            subject: string;
            bodyTemplate: string;
            enabled?: boolean | undefined;
        };
        accessGranted: {
            subject: string;
            bodyTemplate: string;
            enabled?: boolean | undefined;
        };
        referralReward?: {
            subject: string;
            bodyTemplate: string;
            enabled?: boolean | undefined;
        } | undefined;
    }>;
    /** Referral settings */
    referralSettings: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        rewardType: z.ZodDefault<z.ZodEnum<["queue_skip", "points", "access", "custom"]>>;
        pointsPerReferral: z.ZodDefault<z.ZodNumber>;
        maxReferrals: z.ZodDefault<z.ZodNumber>;
        shareMessage: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        rewardType: "custom" | "queue_skip" | "points" | "access";
        pointsPerReferral: number;
        maxReferrals: number;
        shareMessage: string;
    }, {
        enabled?: boolean | undefined;
        rewardType?: "custom" | "queue_skip" | "points" | "access" | undefined;
        pointsPerReferral?: number | undefined;
        maxReferrals?: number | undefined;
        shareMessage?: string | undefined;
    }>>;
    /** Created timestamp */
    createdAt: z.ZodString;
    /** Updated timestamp */
    updatedAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    campaignType: "product_launch" | "beta_access" | "early_bird" | "referral" | "exclusive_content" | "event_registration" | "feature_vote" | "pre_order";
    version: string;
    isSystem: boolean;
    landingPage: {
        backgroundColor: string;
        headline: string;
        subheadline: string;
        ctaText: string;
        primaryColor: string;
        socialProof: boolean;
        socialProofText: string;
        showCountdown: boolean;
        backgroundImage?: string | undefined;
        logoUrl?: string | undefined;
        countdownDate?: string | undefined;
    };
    formFields: {
        type: "email" | "text" | "select" | "phone" | "checkbox";
        label: string;
        required: boolean;
        name: string;
        options?: string[] | undefined;
        placeholder?: string | undefined;
    }[];
    emails: {
        confirmation: {
            enabled: boolean;
            subject: string;
            bodyTemplate: string;
        };
        accessGranted: {
            enabled: boolean;
            subject: string;
            bodyTemplate: string;
        };
        referralReward?: {
            enabled: boolean;
            subject: string;
            bodyTemplate: string;
        } | undefined;
    };
    referralSettings?: {
        enabled: boolean;
        rewardType: "custom" | "queue_skip" | "points" | "access";
        pointsPerReferral: number;
        maxReferrals: number;
        shareMessage: string;
    } | undefined;
}, {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    campaignType: "product_launch" | "beta_access" | "early_bird" | "referral" | "exclusive_content" | "event_registration" | "feature_vote" | "pre_order";
    landingPage: {
        headline: string;
        subheadline: string;
        backgroundColor?: string | undefined;
        ctaText?: string | undefined;
        backgroundImage?: string | undefined;
        primaryColor?: string | undefined;
        logoUrl?: string | undefined;
        socialProof?: boolean | undefined;
        socialProofText?: string | undefined;
        showCountdown?: boolean | undefined;
        countdownDate?: string | undefined;
    };
    formFields: {
        type: "email" | "text" | "select" | "phone" | "checkbox";
        label: string;
        name: string;
        options?: string[] | undefined;
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }[];
    emails: {
        confirmation: {
            subject: string;
            bodyTemplate: string;
            enabled?: boolean | undefined;
        };
        accessGranted: {
            subject: string;
            bodyTemplate: string;
            enabled?: boolean | undefined;
        };
        referralReward?: {
            subject: string;
            bodyTemplate: string;
            enabled?: boolean | undefined;
        } | undefined;
    };
    version?: string | undefined;
    isSystem?: boolean | undefined;
    referralSettings?: {
        enabled?: boolean | undefined;
        rewardType?: "custom" | "queue_skip" | "points" | "access" | undefined;
        pointsPerReferral?: number | undefined;
        maxReferrals?: number | undefined;
        shareMessage?: string | undefined;
    } | undefined;
}>;
export type WaitlistTemplate = z.infer<typeof WaitlistTemplateSchema>;
export declare const AudienceSegmentTypes: readonly ["all_signups", "referrers", "high_engagement", "geographic", "source_based", "custom_field", "waitlist_position", "signup_date"];
export type AudienceSegmentType = (typeof AudienceSegmentTypes)[number];
export declare const AudienceSegmentTypeSchema: z.ZodEnum<["all_signups", "referrers", "high_engagement", "geographic", "source_based", "custom_field", "waitlist_position", "signup_date"]>;
export declare const AudienceSegmentSchema: z.ZodObject<{
    /** Segment identifier */
    id: z.ZodString;
    /** Segment name */
    name: z.ZodString;
    /** Segment description */
    description: z.ZodOptional<z.ZodString>;
    /** Segment type */
    type: z.ZodEnum<["all_signups", "referrers", "high_engagement", "geographic", "source_based", "custom_field", "waitlist_position", "signup_date"]>;
    /** Source campaign identifier */
    sourceCampaignId: z.ZodString;
    /** Filter criteria */
    criteria: z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        operator: z.ZodEnum<["equals", "not_equals", "contains", "greater_than", "less_than", "between", "in", "not_in"]>;
        value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString, "many">, z.ZodArray<z.ZodNumber, "many">]>;
        valueTo: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    }, "strip", z.ZodTypeAny, {
        value: string | number | string[] | number[];
        operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "between" | "in" | "not_in";
        field: string;
        valueTo?: string | number | undefined;
    }, {
        value: string | number | string[] | number[];
        operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "between" | "in" | "not_in";
        field: string;
        valueTo?: string | number | undefined;
    }>, "many">;
    /** Estimated audience size */
    estimatedSize: z.ZodNumber;
    /** Actual audience size (after sync) */
    actualSize: z.ZodOptional<z.ZodNumber>;
    /** Last computed timestamp */
    lastComputedAt: z.ZodOptional<z.ZodString>;
    /** Whether this segment auto-updates */
    dynamic: z.ZodDefault<z.ZodBoolean>;
    /** Created timestamp */
    createdAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    type: "all_signups" | "referrers" | "high_engagement" | "geographic" | "source_based" | "custom_field" | "waitlist_position" | "signup_date";
    id: string;
    name: string;
    createdAt: string;
    sourceCampaignId: string;
    criteria: {
        value: string | number | string[] | number[];
        operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "between" | "in" | "not_in";
        field: string;
        valueTo?: string | number | undefined;
    }[];
    estimatedSize: number;
    dynamic: boolean;
    description?: string | undefined;
    actualSize?: number | undefined;
    lastComputedAt?: string | undefined;
}, {
    type: "all_signups" | "referrers" | "high_engagement" | "geographic" | "source_based" | "custom_field" | "waitlist_position" | "signup_date";
    id: string;
    name: string;
    createdAt: string;
    sourceCampaignId: string;
    criteria: {
        value: string | number | string[] | number[];
        operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "between" | "in" | "not_in";
        field: string;
        valueTo?: string | number | undefined;
    }[];
    estimatedSize: number;
    description?: string | undefined;
    actualSize?: number | undefined;
    lastComputedAt?: string | undefined;
    dynamic?: boolean | undefined;
}>;
export type AudienceSegment = z.infer<typeof AudienceSegmentSchema>;
export declare const SharingDestinationSchema: z.ZodEnum<["pct", "content_factory", "media_poster", "email_provider", "crm", "custom_webhook"]>;
export type SharingDestination = z.infer<typeof SharingDestinationSchema>;
export declare const AudienceSharingConfigSchema: z.ZodObject<{
    /** Sharing rule identifier */
    id: z.ZodString;
    /** Segment to share */
    segmentId: z.ZodString;
    /** Destination product / integration */
    destination: z.ZodEnum<["pct", "content_factory", "media_poster", "email_provider", "crm", "custom_webhook"]>;
    /** Destination-specific configuration */
    destinationConfig: z.ZodObject<{
        /** Target audience/list ID in destination */
        targetId: z.ZodOptional<z.ZodString>;
        /** Target name */
        targetName: z.ZodOptional<z.ZodString>;
        /** Webhook URL (for custom_webhook) */
        webhookUrl: z.ZodOptional<z.ZodString>;
        /** Field mapping (source field -> destination field) */
        fieldMapping: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        targetId?: string | undefined;
        targetName?: string | undefined;
        webhookUrl?: string | undefined;
        fieldMapping?: Record<string, string> | undefined;
    }, {
        targetId?: string | undefined;
        targetName?: string | undefined;
        webhookUrl?: string | undefined;
        fieldMapping?: Record<string, string> | undefined;
    }>;
    /** Sync frequency */
    syncFrequency: z.ZodDefault<z.ZodEnum<["realtime", "hourly", "daily", "weekly", "manual"]>>;
    /** Whether sharing is active */
    active: z.ZodDefault<z.ZodBoolean>;
    /** Include new members automatically */
    autoIncludeNew: z.ZodDefault<z.ZodBoolean>;
    /** Remove members who leave the segment */
    autoRemoveLeft: z.ZodDefault<z.ZodBoolean>;
    /** Created timestamp */
    createdAt: z.ZodString;
    /** Updated timestamp */
    updatedAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    active: boolean;
    id: string;
    createdAt: string;
    updatedAt: string;
    segmentId: string;
    destination: "pct" | "content_factory" | "media_poster" | "email_provider" | "crm" | "custom_webhook";
    destinationConfig: {
        targetId?: string | undefined;
        targetName?: string | undefined;
        webhookUrl?: string | undefined;
        fieldMapping?: Record<string, string> | undefined;
    };
    syncFrequency: "daily" | "weekly" | "realtime" | "hourly" | "manual";
    autoIncludeNew: boolean;
    autoRemoveLeft: boolean;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    segmentId: string;
    destination: "pct" | "content_factory" | "media_poster" | "email_provider" | "crm" | "custom_webhook";
    destinationConfig: {
        targetId?: string | undefined;
        targetName?: string | undefined;
        webhookUrl?: string | undefined;
        fieldMapping?: Record<string, string> | undefined;
    };
    active?: boolean | undefined;
    syncFrequency?: "daily" | "weekly" | "realtime" | "hourly" | "manual" | undefined;
    autoIncludeNew?: boolean | undefined;
    autoRemoveLeft?: boolean | undefined;
}>;
export type AudienceSharingConfig = z.infer<typeof AudienceSharingConfigSchema>;
export declare const SyncStatusSchema: z.ZodObject<{
    /** Sharing rule identifier */
    sharingConfigId: z.ZodString;
    /** Current sync status */
    status: z.ZodEnum<["idle", "syncing", "success", "error", "partial"]>;
    /** Last sync timestamp */
    lastSyncAt: z.ZodOptional<z.ZodString>;
    /** Next scheduled sync */
    nextSyncAt: z.ZodOptional<z.ZodString>;
    /** Records synced in last sync */
    lastSyncCount: z.ZodOptional<z.ZodNumber>;
    /** Total records synced all time */
    totalSynced: z.ZodDefault<z.ZodNumber>;
    /** Error message (if status is error) */
    errorMessage: z.ZodOptional<z.ZodString>;
    /** Error count (consecutive) */
    consecutiveErrors: z.ZodDefault<z.ZodNumber>;
    /** Sync history (last N syncs) */
    recentHistory: z.ZodDefault<z.ZodArray<z.ZodObject<{
        timestamp: z.ZodString;
        status: z.ZodEnum<["success", "error", "partial"]>;
        recordCount: z.ZodNumber;
        durationMs: z.ZodNumber;
        errorMessage: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "partial" | "success" | "error";
        durationMs: number;
        timestamp: string;
        recordCount: number;
        errorMessage?: string | undefined;
    }, {
        status: "partial" | "success" | "error";
        durationMs: number;
        timestamp: string;
        recordCount: number;
        errorMessage?: string | undefined;
    }>, "many">>;
}, "strict", z.ZodTypeAny, {
    status: "partial" | "idle" | "success" | "error" | "syncing";
    sharingConfigId: string;
    totalSynced: number;
    consecutiveErrors: number;
    recentHistory: {
        status: "partial" | "success" | "error";
        durationMs: number;
        timestamp: string;
        recordCount: number;
        errorMessage?: string | undefined;
    }[];
    lastSyncAt?: string | undefined;
    nextSyncAt?: string | undefined;
    lastSyncCount?: number | undefined;
    errorMessage?: string | undefined;
}, {
    status: "partial" | "idle" | "success" | "error" | "syncing";
    sharingConfigId: string;
    lastSyncAt?: string | undefined;
    nextSyncAt?: string | undefined;
    lastSyncCount?: number | undefined;
    totalSynced?: number | undefined;
    errorMessage?: string | undefined;
    consecutiveErrors?: number | undefined;
    recentHistory?: {
        status: "partial" | "success" | "error";
        durationMs: number;
        timestamp: string;
        recordCount: number;
        errorMessage?: string | undefined;
    }[] | undefined;
}>;
export type SyncStatus = z.infer<typeof SyncStatusSchema>;
export declare const WlAudienceSharingDashboardSchema: z.ZodObject<{
    segments: z.ZodArray<z.ZodObject<{
        /** Segment identifier */
        id: z.ZodString;
        /** Segment name */
        name: z.ZodString;
        /** Segment description */
        description: z.ZodOptional<z.ZodString>;
        /** Segment type */
        type: z.ZodEnum<["all_signups", "referrers", "high_engagement", "geographic", "source_based", "custom_field", "waitlist_position", "signup_date"]>;
        /** Source campaign identifier */
        sourceCampaignId: z.ZodString;
        /** Filter criteria */
        criteria: z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            operator: z.ZodEnum<["equals", "not_equals", "contains", "greater_than", "less_than", "between", "in", "not_in"]>;
            value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString, "many">, z.ZodArray<z.ZodNumber, "many">]>;
            valueTo: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        }, "strip", z.ZodTypeAny, {
            value: string | number | string[] | number[];
            operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "between" | "in" | "not_in";
            field: string;
            valueTo?: string | number | undefined;
        }, {
            value: string | number | string[] | number[];
            operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "between" | "in" | "not_in";
            field: string;
            valueTo?: string | number | undefined;
        }>, "many">;
        /** Estimated audience size */
        estimatedSize: z.ZodNumber;
        /** Actual audience size (after sync) */
        actualSize: z.ZodOptional<z.ZodNumber>;
        /** Last computed timestamp */
        lastComputedAt: z.ZodOptional<z.ZodString>;
        /** Whether this segment auto-updates */
        dynamic: z.ZodDefault<z.ZodBoolean>;
        /** Created timestamp */
        createdAt: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        type: "all_signups" | "referrers" | "high_engagement" | "geographic" | "source_based" | "custom_field" | "waitlist_position" | "signup_date";
        id: string;
        name: string;
        createdAt: string;
        sourceCampaignId: string;
        criteria: {
            value: string | number | string[] | number[];
            operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "between" | "in" | "not_in";
            field: string;
            valueTo?: string | number | undefined;
        }[];
        estimatedSize: number;
        dynamic: boolean;
        description?: string | undefined;
        actualSize?: number | undefined;
        lastComputedAt?: string | undefined;
    }, {
        type: "all_signups" | "referrers" | "high_engagement" | "geographic" | "source_based" | "custom_field" | "waitlist_position" | "signup_date";
        id: string;
        name: string;
        createdAt: string;
        sourceCampaignId: string;
        criteria: {
            value: string | number | string[] | number[];
            operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "between" | "in" | "not_in";
            field: string;
            valueTo?: string | number | undefined;
        }[];
        estimatedSize: number;
        description?: string | undefined;
        actualSize?: number | undefined;
        lastComputedAt?: string | undefined;
        dynamic?: boolean | undefined;
    }>, "many">;
    sharingConfigs: z.ZodArray<z.ZodObject<{
        /** Sharing rule identifier */
        id: z.ZodString;
        /** Segment to share */
        segmentId: z.ZodString;
        /** Destination product / integration */
        destination: z.ZodEnum<["pct", "content_factory", "media_poster", "email_provider", "crm", "custom_webhook"]>;
        /** Destination-specific configuration */
        destinationConfig: z.ZodObject<{
            /** Target audience/list ID in destination */
            targetId: z.ZodOptional<z.ZodString>;
            /** Target name */
            targetName: z.ZodOptional<z.ZodString>;
            /** Webhook URL (for custom_webhook) */
            webhookUrl: z.ZodOptional<z.ZodString>;
            /** Field mapping (source field -> destination field) */
            fieldMapping: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            targetId?: string | undefined;
            targetName?: string | undefined;
            webhookUrl?: string | undefined;
            fieldMapping?: Record<string, string> | undefined;
        }, {
            targetId?: string | undefined;
            targetName?: string | undefined;
            webhookUrl?: string | undefined;
            fieldMapping?: Record<string, string> | undefined;
        }>;
        /** Sync frequency */
        syncFrequency: z.ZodDefault<z.ZodEnum<["realtime", "hourly", "daily", "weekly", "manual"]>>;
        /** Whether sharing is active */
        active: z.ZodDefault<z.ZodBoolean>;
        /** Include new members automatically */
        autoIncludeNew: z.ZodDefault<z.ZodBoolean>;
        /** Remove members who leave the segment */
        autoRemoveLeft: z.ZodDefault<z.ZodBoolean>;
        /** Created timestamp */
        createdAt: z.ZodString;
        /** Updated timestamp */
        updatedAt: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        active: boolean;
        id: string;
        createdAt: string;
        updatedAt: string;
        segmentId: string;
        destination: "pct" | "content_factory" | "media_poster" | "email_provider" | "crm" | "custom_webhook";
        destinationConfig: {
            targetId?: string | undefined;
            targetName?: string | undefined;
            webhookUrl?: string | undefined;
            fieldMapping?: Record<string, string> | undefined;
        };
        syncFrequency: "daily" | "weekly" | "realtime" | "hourly" | "manual";
        autoIncludeNew: boolean;
        autoRemoveLeft: boolean;
    }, {
        id: string;
        createdAt: string;
        updatedAt: string;
        segmentId: string;
        destination: "pct" | "content_factory" | "media_poster" | "email_provider" | "crm" | "custom_webhook";
        destinationConfig: {
            targetId?: string | undefined;
            targetName?: string | undefined;
            webhookUrl?: string | undefined;
            fieldMapping?: Record<string, string> | undefined;
        };
        active?: boolean | undefined;
        syncFrequency?: "daily" | "weekly" | "realtime" | "hourly" | "manual" | undefined;
        autoIncludeNew?: boolean | undefined;
        autoRemoveLeft?: boolean | undefined;
    }>, "many">;
    syncStatuses: z.ZodArray<z.ZodObject<{
        /** Sharing rule identifier */
        sharingConfigId: z.ZodString;
        /** Current sync status */
        status: z.ZodEnum<["idle", "syncing", "success", "error", "partial"]>;
        /** Last sync timestamp */
        lastSyncAt: z.ZodOptional<z.ZodString>;
        /** Next scheduled sync */
        nextSyncAt: z.ZodOptional<z.ZodString>;
        /** Records synced in last sync */
        lastSyncCount: z.ZodOptional<z.ZodNumber>;
        /** Total records synced all time */
        totalSynced: z.ZodDefault<z.ZodNumber>;
        /** Error message (if status is error) */
        errorMessage: z.ZodOptional<z.ZodString>;
        /** Error count (consecutive) */
        consecutiveErrors: z.ZodDefault<z.ZodNumber>;
        /** Sync history (last N syncs) */
        recentHistory: z.ZodDefault<z.ZodArray<z.ZodObject<{
            timestamp: z.ZodString;
            status: z.ZodEnum<["success", "error", "partial"]>;
            recordCount: z.ZodNumber;
            durationMs: z.ZodNumber;
            errorMessage: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: "partial" | "success" | "error";
            durationMs: number;
            timestamp: string;
            recordCount: number;
            errorMessage?: string | undefined;
        }, {
            status: "partial" | "success" | "error";
            durationMs: number;
            timestamp: string;
            recordCount: number;
            errorMessage?: string | undefined;
        }>, "many">>;
    }, "strict", z.ZodTypeAny, {
        status: "partial" | "idle" | "success" | "error" | "syncing";
        sharingConfigId: string;
        totalSynced: number;
        consecutiveErrors: number;
        recentHistory: {
            status: "partial" | "success" | "error";
            durationMs: number;
            timestamp: string;
            recordCount: number;
            errorMessage?: string | undefined;
        }[];
        lastSyncAt?: string | undefined;
        nextSyncAt?: string | undefined;
        lastSyncCount?: number | undefined;
        errorMessage?: string | undefined;
    }, {
        status: "partial" | "idle" | "success" | "error" | "syncing";
        sharingConfigId: string;
        lastSyncAt?: string | undefined;
        nextSyncAt?: string | undefined;
        lastSyncCount?: number | undefined;
        totalSynced?: number | undefined;
        errorMessage?: string | undefined;
        consecutiveErrors?: number | undefined;
        recentHistory?: {
            status: "partial" | "success" | "error";
            durationMs: number;
            timestamp: string;
            recordCount: number;
            errorMessage?: string | undefined;
        }[] | undefined;
    }>, "many">;
    /** Summary stats */
    summary: z.ZodObject<{
        totalSegments: z.ZodNumber;
        totalSharedAudience: z.ZodNumber;
        activeSharingRules: z.ZodNumber;
        syncErrorCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalSegments: number;
        totalSharedAudience: number;
        activeSharingRules: number;
        syncErrorCount: number;
    }, {
        totalSegments: number;
        totalSharedAudience: number;
        activeSharingRules: number;
        syncErrorCount: number;
    }>;
}, "strict", z.ZodTypeAny, {
    segments: {
        type: "all_signups" | "referrers" | "high_engagement" | "geographic" | "source_based" | "custom_field" | "waitlist_position" | "signup_date";
        id: string;
        name: string;
        createdAt: string;
        sourceCampaignId: string;
        criteria: {
            value: string | number | string[] | number[];
            operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "between" | "in" | "not_in";
            field: string;
            valueTo?: string | number | undefined;
        }[];
        estimatedSize: number;
        dynamic: boolean;
        description?: string | undefined;
        actualSize?: number | undefined;
        lastComputedAt?: string | undefined;
    }[];
    sharingConfigs: {
        active: boolean;
        id: string;
        createdAt: string;
        updatedAt: string;
        segmentId: string;
        destination: "pct" | "content_factory" | "media_poster" | "email_provider" | "crm" | "custom_webhook";
        destinationConfig: {
            targetId?: string | undefined;
            targetName?: string | undefined;
            webhookUrl?: string | undefined;
            fieldMapping?: Record<string, string> | undefined;
        };
        syncFrequency: "daily" | "weekly" | "realtime" | "hourly" | "manual";
        autoIncludeNew: boolean;
        autoRemoveLeft: boolean;
    }[];
    syncStatuses: {
        status: "partial" | "idle" | "success" | "error" | "syncing";
        sharingConfigId: string;
        totalSynced: number;
        consecutiveErrors: number;
        recentHistory: {
            status: "partial" | "success" | "error";
            durationMs: number;
            timestamp: string;
            recordCount: number;
            errorMessage?: string | undefined;
        }[];
        lastSyncAt?: string | undefined;
        nextSyncAt?: string | undefined;
        lastSyncCount?: number | undefined;
        errorMessage?: string | undefined;
    }[];
    summary: {
        totalSegments: number;
        totalSharedAudience: number;
        activeSharingRules: number;
        syncErrorCount: number;
    };
}, {
    segments: {
        type: "all_signups" | "referrers" | "high_engagement" | "geographic" | "source_based" | "custom_field" | "waitlist_position" | "signup_date";
        id: string;
        name: string;
        createdAt: string;
        sourceCampaignId: string;
        criteria: {
            value: string | number | string[] | number[];
            operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "between" | "in" | "not_in";
            field: string;
            valueTo?: string | number | undefined;
        }[];
        estimatedSize: number;
        description?: string | undefined;
        actualSize?: number | undefined;
        lastComputedAt?: string | undefined;
        dynamic?: boolean | undefined;
    }[];
    sharingConfigs: {
        id: string;
        createdAt: string;
        updatedAt: string;
        segmentId: string;
        destination: "pct" | "content_factory" | "media_poster" | "email_provider" | "crm" | "custom_webhook";
        destinationConfig: {
            targetId?: string | undefined;
            targetName?: string | undefined;
            webhookUrl?: string | undefined;
            fieldMapping?: Record<string, string> | undefined;
        };
        active?: boolean | undefined;
        syncFrequency?: "daily" | "weekly" | "realtime" | "hourly" | "manual" | undefined;
        autoIncludeNew?: boolean | undefined;
        autoRemoveLeft?: boolean | undefined;
    }[];
    syncStatuses: {
        status: "partial" | "idle" | "success" | "error" | "syncing";
        sharingConfigId: string;
        lastSyncAt?: string | undefined;
        nextSyncAt?: string | undefined;
        lastSyncCount?: number | undefined;
        totalSynced?: number | undefined;
        errorMessage?: string | undefined;
        consecutiveErrors?: number | undefined;
        recentHistory?: {
            status: "partial" | "success" | "error";
            durationMs: number;
            timestamp: string;
            recordCount: number;
            errorMessage?: string | undefined;
        }[] | undefined;
    }[];
    summary: {
        totalSegments: number;
        totalSharedAudience: number;
        activeSharingRules: number;
        syncErrorCount: number;
    };
}>;
export type WlAudienceSharingDashboard = z.infer<typeof WlAudienceSharingDashboardSchema>;
//# sourceMappingURL=wl-integration.d.ts.map