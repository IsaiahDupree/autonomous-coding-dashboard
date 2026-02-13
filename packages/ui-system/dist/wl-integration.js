"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WlAudienceSharingDashboardSchema = exports.SyncStatusSchema = exports.AudienceSharingConfigSchema = exports.SharingDestinationSchema = exports.AudienceSegmentSchema = exports.AudienceSegmentTypeSchema = exports.AudienceSegmentTypes = exports.WaitlistTemplateSchema = exports.DefaultCampaignTypeDefinitions = exports.CampaignTypeDefinitionSchema = exports.WaitlistCampaignTypeSchema = exports.WaitlistCampaignTypes = void 0;
/**
 * INT-WL-001: WaitlistLab Campaign Templates
 * INT-WL-002: WaitlistLab Audience Sharing
 *
 * Type definitions and Zod schemas for WaitlistLab product
 * campaign templates and audience sharing features.
 */
const zod_1 = require("zod");
// ===========================================================================
// INT-WL-001: WaitlistLab Campaign Templates
// ===========================================================================
// ---------------------------------------------------------------------------
// Campaign Type Definitions
// ---------------------------------------------------------------------------
exports.WaitlistCampaignTypes = [
    "product_launch",
    "beta_access",
    "early_bird",
    "referral",
    "exclusive_content",
    "event_registration",
    "feature_vote",
    "pre_order",
];
exports.WaitlistCampaignTypeSchema = zod_1.z.enum(exports.WaitlistCampaignTypes);
exports.CampaignTypeDefinitionSchema = zod_1.z.object({
    /** Campaign type */
    type: exports.WaitlistCampaignTypeSchema,
    /** Display name */
    displayName: zod_1.z.string(),
    /** Description */
    description: zod_1.z.string(),
    /** Icon identifier */
    icon: zod_1.z.string(),
    /** Whether this type supports referral mechanics */
    supportsReferrals: zod_1.z.boolean(),
    /** Whether this type supports priority/ranking */
    supportsPriority: zod_1.z.boolean(),
    /** Whether this type supports capacity limits */
    supportsCapacity: zod_1.z.boolean(),
    /** Default settings for this type */
    defaults: zod_1.z.object({
        /** Default capacity (0 = unlimited) */
        capacity: zod_1.z.number().int().nonnegative().default(0),
        /** Default referral reward points */
        referralRewardPoints: zod_1.z.number().int().nonnegative().default(0),
        /** Whether to show position in queue */
        showQueuePosition: zod_1.z.boolean().default(true),
        /** Whether to enable social sharing */
        enableSocialSharing: zod_1.z.boolean().default(true),
        /** Default confirmation email enabled */
        sendConfirmationEmail: zod_1.z.boolean().default(true),
    }),
}).strict();
/** Default campaign type definitions */
exports.DefaultCampaignTypeDefinitions = {
    product_launch: {
        type: "product_launch",
        displayName: "Product Launch",
        description: "Build anticipation and collect signups before your product goes live",
        icon: "rocket",
        supportsReferrals: true,
        supportsPriority: true,
        supportsCapacity: false,
        defaults: { capacity: 0, referralRewardPoints: 10, showQueuePosition: true, enableSocialSharing: true, sendConfirmationEmail: true },
    },
    beta_access: {
        type: "beta_access",
        displayName: "Beta Access",
        description: "Manage beta tester signups with controlled access",
        icon: "flask",
        supportsReferrals: true,
        supportsPriority: true,
        supportsCapacity: true,
        defaults: { capacity: 500, referralRewardPoints: 5, showQueuePosition: true, enableSocialSharing: true, sendConfirmationEmail: true },
    },
    early_bird: {
        type: "early_bird",
        displayName: "Early Bird",
        description: "Offer special pricing or perks to early adopters",
        icon: "bird",
        supportsReferrals: true,
        supportsPriority: false,
        supportsCapacity: true,
        defaults: { capacity: 100, referralRewardPoints: 15, showQueuePosition: false, enableSocialSharing: true, sendConfirmationEmail: true },
    },
    referral: {
        type: "referral",
        displayName: "Referral Campaign",
        description: "Grow your list through viral referral mechanics",
        icon: "users",
        supportsReferrals: true,
        supportsPriority: true,
        supportsCapacity: false,
        defaults: { capacity: 0, referralRewardPoints: 20, showQueuePosition: true, enableSocialSharing: true, sendConfirmationEmail: true },
    },
    exclusive_content: {
        type: "exclusive_content",
        displayName: "Exclusive Content",
        description: "Gate premium content behind a waitlist signup",
        icon: "lock",
        supportsReferrals: false,
        supportsPriority: false,
        supportsCapacity: false,
        defaults: { capacity: 0, referralRewardPoints: 0, showQueuePosition: false, enableSocialSharing: true, sendConfirmationEmail: true },
    },
    event_registration: {
        type: "event_registration",
        displayName: "Event Registration",
        description: "Manage event signups with capacity control",
        icon: "calendar",
        supportsReferrals: false,
        supportsPriority: false,
        supportsCapacity: true,
        defaults: { capacity: 200, referralRewardPoints: 0, showQueuePosition: true, enableSocialSharing: true, sendConfirmationEmail: true },
    },
    feature_vote: {
        type: "feature_vote",
        displayName: "Feature Voting",
        description: "Let users vote on upcoming features",
        icon: "thumbs-up",
        supportsReferrals: false,
        supportsPriority: false,
        supportsCapacity: false,
        defaults: { capacity: 0, referralRewardPoints: 0, showQueuePosition: false, enableSocialSharing: true, sendConfirmationEmail: false },
    },
    pre_order: {
        type: "pre_order",
        displayName: "Pre-Order",
        description: "Collect pre-order interest before availability",
        icon: "shopping-cart",
        supportsReferrals: true,
        supportsPriority: true,
        supportsCapacity: true,
        defaults: { capacity: 1000, referralRewardPoints: 10, showQueuePosition: true, enableSocialSharing: true, sendConfirmationEmail: true },
    },
};
// ---------------------------------------------------------------------------
// Template Schema
// ---------------------------------------------------------------------------
exports.WaitlistTemplateSchema = zod_1.z.object({
    /** Template identifier */
    id: zod_1.z.string(),
    /** Template name */
    name: zod_1.z.string(),
    /** Template description */
    description: zod_1.z.string(),
    /** Campaign type */
    campaignType: exports.WaitlistCampaignTypeSchema,
    /** Template version */
    version: zod_1.z.string().default("1.0.0"),
    /** Whether this is a system template (vs user-created) */
    isSystem: zod_1.z.boolean().default(false),
    /** Landing page configuration */
    landingPage: zod_1.z.object({
        headline: zod_1.z.string(),
        subheadline: zod_1.z.string(),
        ctaText: zod_1.z.string().default("Join the Waitlist"),
        backgroundImage: zod_1.z.string().url().optional(),
        backgroundColor: zod_1.z.string().default("#FFFFFF"),
        primaryColor: zod_1.z.string().default("#4F46E5"),
        logoUrl: zod_1.z.string().url().optional(),
        socialProof: zod_1.z.boolean().default(true),
        socialProofText: zod_1.z.string().default("{count} people on the waitlist"),
        showCountdown: zod_1.z.boolean().default(false),
        countdownDate: zod_1.z.string().datetime().optional(),
    }),
    /** Signup form fields */
    formFields: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        label: zod_1.z.string(),
        type: zod_1.z.enum(["text", "email", "phone", "select", "checkbox"]),
        required: zod_1.z.boolean().default(false),
        placeholder: zod_1.z.string().optional(),
        options: zod_1.z.array(zod_1.z.string()).optional(),
    })),
    /** Email templates */
    emails: zod_1.z.object({
        confirmation: zod_1.z.object({
            subject: zod_1.z.string(),
            bodyTemplate: zod_1.z.string(),
            enabled: zod_1.z.boolean().default(true),
        }),
        accessGranted: zod_1.z.object({
            subject: zod_1.z.string(),
            bodyTemplate: zod_1.z.string(),
            enabled: zod_1.z.boolean().default(true),
        }),
        referralReward: zod_1.z.object({
            subject: zod_1.z.string(),
            bodyTemplate: zod_1.z.string(),
            enabled: zod_1.z.boolean().default(true),
        }).optional(),
    }),
    /** Referral settings */
    referralSettings: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        rewardType: zod_1.z.enum(["queue_skip", "points", "access", "custom"]).default("queue_skip"),
        pointsPerReferral: zod_1.z.number().int().nonnegative().default(10),
        maxReferrals: zod_1.z.number().int().nonnegative().default(0),
        shareMessage: zod_1.z.string().default("Join me on the waitlist!"),
    }).optional(),
    /** Created timestamp */
    createdAt: zod_1.z.string().datetime(),
    /** Updated timestamp */
    updatedAt: zod_1.z.string().datetime(),
}).strict();
// ===========================================================================
// INT-WL-002: WaitlistLab Audience Sharing
// ===========================================================================
// ---------------------------------------------------------------------------
// Audience Segment Types
// ---------------------------------------------------------------------------
exports.AudienceSegmentTypes = [
    "all_signups",
    "referrers",
    "high_engagement",
    "geographic",
    "source_based",
    "custom_field",
    "waitlist_position",
    "signup_date",
];
exports.AudienceSegmentTypeSchema = zod_1.z.enum(exports.AudienceSegmentTypes);
exports.AudienceSegmentSchema = zod_1.z.object({
    /** Segment identifier */
    id: zod_1.z.string(),
    /** Segment name */
    name: zod_1.z.string(),
    /** Segment description */
    description: zod_1.z.string().optional(),
    /** Segment type */
    type: exports.AudienceSegmentTypeSchema,
    /** Source campaign identifier */
    sourceCampaignId: zod_1.z.string(),
    /** Filter criteria */
    criteria: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        operator: zod_1.z.enum([
            "equals",
            "not_equals",
            "contains",
            "greater_than",
            "less_than",
            "between",
            "in",
            "not_in",
        ]),
        value: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.array(zod_1.z.string()), zod_1.z.array(zod_1.z.number())]),
        valueTo: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    })),
    /** Estimated audience size */
    estimatedSize: zod_1.z.number().int().nonnegative(),
    /** Actual audience size (after sync) */
    actualSize: zod_1.z.number().int().nonnegative().optional(),
    /** Last computed timestamp */
    lastComputedAt: zod_1.z.string().datetime().optional(),
    /** Whether this segment auto-updates */
    dynamic: zod_1.z.boolean().default(true),
    /** Created timestamp */
    createdAt: zod_1.z.string().datetime(),
}).strict();
// ---------------------------------------------------------------------------
// Sharing Config
// ---------------------------------------------------------------------------
exports.SharingDestinationSchema = zod_1.z.enum([
    "pct",
    "content_factory",
    "media_poster",
    "email_provider",
    "crm",
    "custom_webhook",
]);
exports.AudienceSharingConfigSchema = zod_1.z.object({
    /** Sharing rule identifier */
    id: zod_1.z.string(),
    /** Segment to share */
    segmentId: zod_1.z.string(),
    /** Destination product / integration */
    destination: exports.SharingDestinationSchema,
    /** Destination-specific configuration */
    destinationConfig: zod_1.z.object({
        /** Target audience/list ID in destination */
        targetId: zod_1.z.string().optional(),
        /** Target name */
        targetName: zod_1.z.string().optional(),
        /** Webhook URL (for custom_webhook) */
        webhookUrl: zod_1.z.string().url().optional(),
        /** Field mapping (source field -> destination field) */
        fieldMapping: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    }),
    /** Sync frequency */
    syncFrequency: zod_1.z.enum(["realtime", "hourly", "daily", "weekly", "manual"]).default("daily"),
    /** Whether sharing is active */
    active: zod_1.z.boolean().default(true),
    /** Include new members automatically */
    autoIncludeNew: zod_1.z.boolean().default(true),
    /** Remove members who leave the segment */
    autoRemoveLeft: zod_1.z.boolean().default(true),
    /** Created timestamp */
    createdAt: zod_1.z.string().datetime(),
    /** Updated timestamp */
    updatedAt: zod_1.z.string().datetime(),
}).strict();
// ---------------------------------------------------------------------------
// Sync Status
// ---------------------------------------------------------------------------
exports.SyncStatusSchema = zod_1.z.object({
    /** Sharing rule identifier */
    sharingConfigId: zod_1.z.string(),
    /** Current sync status */
    status: zod_1.z.enum(["idle", "syncing", "success", "error", "partial"]),
    /** Last sync timestamp */
    lastSyncAt: zod_1.z.string().datetime().optional(),
    /** Next scheduled sync */
    nextSyncAt: zod_1.z.string().datetime().optional(),
    /** Records synced in last sync */
    lastSyncCount: zod_1.z.number().int().nonnegative().optional(),
    /** Total records synced all time */
    totalSynced: zod_1.z.number().int().nonnegative().default(0),
    /** Error message (if status is error) */
    errorMessage: zod_1.z.string().optional(),
    /** Error count (consecutive) */
    consecutiveErrors: zod_1.z.number().int().nonnegative().default(0),
    /** Sync history (last N syncs) */
    recentHistory: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.string().datetime(),
        status: zod_1.z.enum(["success", "error", "partial"]),
        recordCount: zod_1.z.number().int().nonnegative(),
        durationMs: zod_1.z.number().int().nonnegative(),
        errorMessage: zod_1.z.string().optional(),
    })).default([]),
}).strict();
// ---------------------------------------------------------------------------
// WaitlistLab Audience Sharing Dashboard
// ---------------------------------------------------------------------------
exports.WlAudienceSharingDashboardSchema = zod_1.z.object({
    segments: zod_1.z.array(exports.AudienceSegmentSchema),
    sharingConfigs: zod_1.z.array(exports.AudienceSharingConfigSchema),
    syncStatuses: zod_1.z.array(exports.SyncStatusSchema),
    /** Summary stats */
    summary: zod_1.z.object({
        totalSegments: zod_1.z.number().int().nonnegative(),
        totalSharedAudience: zod_1.z.number().int().nonnegative(),
        activeSharingRules: zod_1.z.number().int().nonnegative(),
        syncErrorCount: zod_1.z.number().int().nonnegative(),
    }),
}).strict();
//# sourceMappingURL=wl-integration.js.map