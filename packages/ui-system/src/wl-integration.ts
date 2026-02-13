/**
 * INT-WL-001: WaitlistLab Campaign Templates
 * INT-WL-002: WaitlistLab Audience Sharing
 *
 * Type definitions and Zod schemas for WaitlistLab product
 * campaign templates and audience sharing features.
 */
import { z } from "zod";

// ===========================================================================
// INT-WL-001: WaitlistLab Campaign Templates
// ===========================================================================

// ---------------------------------------------------------------------------
// Campaign Type Definitions
// ---------------------------------------------------------------------------

export const WaitlistCampaignTypes = [
  "product_launch",
  "beta_access",
  "early_bird",
  "referral",
  "exclusive_content",
  "event_registration",
  "feature_vote",
  "pre_order",
] as const;
export type WaitlistCampaignType = (typeof WaitlistCampaignTypes)[number];

export const WaitlistCampaignTypeSchema = z.enum(WaitlistCampaignTypes);

export const CampaignTypeDefinitionSchema = z.object({
  /** Campaign type */
  type: WaitlistCampaignTypeSchema,
  /** Display name */
  displayName: z.string(),
  /** Description */
  description: z.string(),
  /** Icon identifier */
  icon: z.string(),
  /** Whether this type supports referral mechanics */
  supportsReferrals: z.boolean(),
  /** Whether this type supports priority/ranking */
  supportsPriority: z.boolean(),
  /** Whether this type supports capacity limits */
  supportsCapacity: z.boolean(),
  /** Default settings for this type */
  defaults: z.object({
    /** Default capacity (0 = unlimited) */
    capacity: z.number().int().nonnegative().default(0),
    /** Default referral reward points */
    referralRewardPoints: z.number().int().nonnegative().default(0),
    /** Whether to show position in queue */
    showQueuePosition: z.boolean().default(true),
    /** Whether to enable social sharing */
    enableSocialSharing: z.boolean().default(true),
    /** Default confirmation email enabled */
    sendConfirmationEmail: z.boolean().default(true),
  }),
}).strict();

export type CampaignTypeDefinition = z.infer<typeof CampaignTypeDefinitionSchema>;

/** Default campaign type definitions */
export const DefaultCampaignTypeDefinitions: Record<WaitlistCampaignType, CampaignTypeDefinition> = {
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

export const WaitlistTemplateSchema = z.object({
  /** Template identifier */
  id: z.string(),
  /** Template name */
  name: z.string(),
  /** Template description */
  description: z.string(),
  /** Campaign type */
  campaignType: WaitlistCampaignTypeSchema,
  /** Template version */
  version: z.string().default("1.0.0"),
  /** Whether this is a system template (vs user-created) */
  isSystem: z.boolean().default(false),
  /** Landing page configuration */
  landingPage: z.object({
    headline: z.string(),
    subheadline: z.string(),
    ctaText: z.string().default("Join the Waitlist"),
    backgroundImage: z.string().url().optional(),
    backgroundColor: z.string().default("#FFFFFF"),
    primaryColor: z.string().default("#4F46E5"),
    logoUrl: z.string().url().optional(),
    socialProof: z.boolean().default(true),
    socialProofText: z.string().default("{count} people on the waitlist"),
    showCountdown: z.boolean().default(false),
    countdownDate: z.string().datetime().optional(),
  }),
  /** Signup form fields */
  formFields: z.array(z.object({
    name: z.string(),
    label: z.string(),
    type: z.enum(["text", "email", "phone", "select", "checkbox"]),
    required: z.boolean().default(false),
    placeholder: z.string().optional(),
    options: z.array(z.string()).optional(),
  })),
  /** Email templates */
  emails: z.object({
    confirmation: z.object({
      subject: z.string(),
      bodyTemplate: z.string(),
      enabled: z.boolean().default(true),
    }),
    accessGranted: z.object({
      subject: z.string(),
      bodyTemplate: z.string(),
      enabled: z.boolean().default(true),
    }),
    referralReward: z.object({
      subject: z.string(),
      bodyTemplate: z.string(),
      enabled: z.boolean().default(true),
    }).optional(),
  }),
  /** Referral settings */
  referralSettings: z.object({
    enabled: z.boolean().default(false),
    rewardType: z.enum(["queue_skip", "points", "access", "custom"]).default("queue_skip"),
    pointsPerReferral: z.number().int().nonnegative().default(10),
    maxReferrals: z.number().int().nonnegative().default(0),
    shareMessage: z.string().default("Join me on the waitlist!"),
  }).optional(),
  /** Created timestamp */
  createdAt: z.string().datetime(),
  /** Updated timestamp */
  updatedAt: z.string().datetime(),
}).strict();

export type WaitlistTemplate = z.infer<typeof WaitlistTemplateSchema>;

// ===========================================================================
// INT-WL-002: WaitlistLab Audience Sharing
// ===========================================================================

// ---------------------------------------------------------------------------
// Audience Segment Types
// ---------------------------------------------------------------------------

export const AudienceSegmentTypes = [
  "all_signups",
  "referrers",
  "high_engagement",
  "geographic",
  "source_based",
  "custom_field",
  "waitlist_position",
  "signup_date",
] as const;
export type AudienceSegmentType = (typeof AudienceSegmentTypes)[number];

export const AudienceSegmentTypeSchema = z.enum(AudienceSegmentTypes);

export const AudienceSegmentSchema = z.object({
  /** Segment identifier */
  id: z.string(),
  /** Segment name */
  name: z.string(),
  /** Segment description */
  description: z.string().optional(),
  /** Segment type */
  type: AudienceSegmentTypeSchema,
  /** Source campaign identifier */
  sourceCampaignId: z.string(),
  /** Filter criteria */
  criteria: z.array(z.object({
    field: z.string(),
    operator: z.enum([
      "equals",
      "not_equals",
      "contains",
      "greater_than",
      "less_than",
      "between",
      "in",
      "not_in",
    ]),
    value: z.union([z.string(), z.number(), z.array(z.string()), z.array(z.number())]),
    valueTo: z.union([z.string(), z.number()]).optional(),
  })),
  /** Estimated audience size */
  estimatedSize: z.number().int().nonnegative(),
  /** Actual audience size (after sync) */
  actualSize: z.number().int().nonnegative().optional(),
  /** Last computed timestamp */
  lastComputedAt: z.string().datetime().optional(),
  /** Whether this segment auto-updates */
  dynamic: z.boolean().default(true),
  /** Created timestamp */
  createdAt: z.string().datetime(),
}).strict();

export type AudienceSegment = z.infer<typeof AudienceSegmentSchema>;

// ---------------------------------------------------------------------------
// Sharing Config
// ---------------------------------------------------------------------------

export const SharingDestinationSchema = z.enum([
  "pct",
  "content_factory",
  "media_poster",
  "email_provider",
  "crm",
  "custom_webhook",
]);
export type SharingDestination = z.infer<typeof SharingDestinationSchema>;

export const AudienceSharingConfigSchema = z.object({
  /** Sharing rule identifier */
  id: z.string(),
  /** Segment to share */
  segmentId: z.string(),
  /** Destination product / integration */
  destination: SharingDestinationSchema,
  /** Destination-specific configuration */
  destinationConfig: z.object({
    /** Target audience/list ID in destination */
    targetId: z.string().optional(),
    /** Target name */
    targetName: z.string().optional(),
    /** Webhook URL (for custom_webhook) */
    webhookUrl: z.string().url().optional(),
    /** Field mapping (source field -> destination field) */
    fieldMapping: z.record(z.string(), z.string()).optional(),
  }),
  /** Sync frequency */
  syncFrequency: z.enum(["realtime", "hourly", "daily", "weekly", "manual"]).default("daily"),
  /** Whether sharing is active */
  active: z.boolean().default(true),
  /** Include new members automatically */
  autoIncludeNew: z.boolean().default(true),
  /** Remove members who leave the segment */
  autoRemoveLeft: z.boolean().default(true),
  /** Created timestamp */
  createdAt: z.string().datetime(),
  /** Updated timestamp */
  updatedAt: z.string().datetime(),
}).strict();

export type AudienceSharingConfig = z.infer<typeof AudienceSharingConfigSchema>;

// ---------------------------------------------------------------------------
// Sync Status
// ---------------------------------------------------------------------------

export const SyncStatusSchema = z.object({
  /** Sharing rule identifier */
  sharingConfigId: z.string(),
  /** Current sync status */
  status: z.enum(["idle", "syncing", "success", "error", "partial"]),
  /** Last sync timestamp */
  lastSyncAt: z.string().datetime().optional(),
  /** Next scheduled sync */
  nextSyncAt: z.string().datetime().optional(),
  /** Records synced in last sync */
  lastSyncCount: z.number().int().nonnegative().optional(),
  /** Total records synced all time */
  totalSynced: z.number().int().nonnegative().default(0),
  /** Error message (if status is error) */
  errorMessage: z.string().optional(),
  /** Error count (consecutive) */
  consecutiveErrors: z.number().int().nonnegative().default(0),
  /** Sync history (last N syncs) */
  recentHistory: z.array(z.object({
    timestamp: z.string().datetime(),
    status: z.enum(["success", "error", "partial"]),
    recordCount: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
    errorMessage: z.string().optional(),
  })).default([]),
}).strict();

export type SyncStatus = z.infer<typeof SyncStatusSchema>;

// ---------------------------------------------------------------------------
// WaitlistLab Audience Sharing Dashboard
// ---------------------------------------------------------------------------

export const WlAudienceSharingDashboardSchema = z.object({
  segments: z.array(AudienceSegmentSchema),
  sharingConfigs: z.array(AudienceSharingConfigSchema),
  syncStatuses: z.array(SyncStatusSchema),
  /** Summary stats */
  summary: z.object({
    totalSegments: z.number().int().nonnegative(),
    totalSharedAudience: z.number().int().nonnegative(),
    activeSharingRules: z.number().int().nonnegative(),
    syncErrorCount: z.number().int().nonnegative(),
  }),
}).strict();

export type WlAudienceSharingDashboard = z.infer<typeof WlAudienceSharingDashboardSchema>;
