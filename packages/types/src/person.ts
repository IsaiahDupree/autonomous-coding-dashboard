import { z } from "zod";
import { ProductIdSchema } from "./product";

// ---------------------------------------------------------------------------
// Identity Link
// ---------------------------------------------------------------------------

/**
 * Identity provider type for linking external identities.
 */
export const IdentityProviderSchema = z.enum([
  "email",
  "phone",
  "facebook",
  "instagram",
  "google",
  "linkedin",
  "twitter",
  "tiktok",
  "shopify",
  "stripe",
  "hubspot",
  "salesforce",
  "meta_pixel",
  "meta_capi",
  "custom",
]);
export type IdentityProvider = z.infer<typeof IdentityProviderSchema>;

/**
 * IdentityLink - Links a Person to an external identity/platform.
 */
export const IdentityLinkSchema = z.object({
  /** Unique identity link identifier (UUID v4). */
  id: z.string().uuid(),

  /** The person this identity belongs to. */
  personId: z.string().uuid(),

  /** The identity provider. */
  provider: IdentityProviderSchema,

  /** The external ID on the provider's platform. */
  externalId: z.string().min(1).max(512),

  /** The identifier value (e.g., email address, phone number, username). */
  identifier: z.string().min(1).max(512),

  /** Whether this identity has been verified. */
  verified: z.boolean().default(false),

  /** Whether this is the primary identity for this provider. */
  primary: z.boolean().default(false),

  /** Provider-specific metadata. */
  providerMetadata: z.record(z.string(), z.unknown()).optional(),

  /** ISO 8601 timestamp of when this link was created. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last update. */
  updatedAt: z.string().datetime(),
});

export type IdentityLink = z.infer<typeof IdentityLinkSchema>;

// ---------------------------------------------------------------------------
// Lead Source
// ---------------------------------------------------------------------------

/**
 * Where / how this person entered the system.
 */
export const LeadSourceSchema = z.enum([
  "organic",
  "paid_social",
  "paid_search",
  "referral",
  "email_campaign",
  "content_marketing",
  "direct",
  "partner",
  "event",
  "waitlist",
  "api",
  "import",
  "unknown",
]);
export type LeadSource = z.infer<typeof LeadSourceSchema>;

/**
 * Lead / person lifecycle stage.
 */
export const LifecycleStageSchema = z.enum([
  "anonymous",
  "subscriber",
  "lead",
  "marketing_qualified",
  "sales_qualified",
  "opportunity",
  "customer",
  "evangelist",
  "churned",
]);
export type LifecycleStage = z.infer<typeof LifecycleStageSchema>;

// ---------------------------------------------------------------------------
// Person
// ---------------------------------------------------------------------------

/**
 * UTM parameters captured at acquisition.
 */
export const UtmParametersSchema = z.object({
  utmSource: z.string().max(256).optional(),
  utmMedium: z.string().max(256).optional(),
  utmCampaign: z.string().max(256).optional(),
  utmTerm: z.string().max(256).optional(),
  utmContent: z.string().max(256).optional(),
});
export type UtmParameters = z.infer<typeof UtmParametersSchema>;

/**
 * Person - A contact/lead record for Meta marketing and lead management.
 * This is distinct from SharedUser; a Person may not have an ACD account.
 */
export const PersonSchema = z.object({
  /** Unique person identifier (UUID v4). */
  id: z.string().uuid(),

  /** Associated ACD user ID, if they have an account. */
  userId: z.string().uuid().optional(),

  /** Email address. */
  email: z.string().email().optional(),

  /** Phone number in E.164 format. */
  phone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "Phone must be in E.164 format")
    .optional(),

  /** First name. */
  firstName: z.string().max(128).optional(),

  /** Last name. */
  lastName: z.string().max(128).optional(),

  /** Full name (computed or provided). */
  fullName: z.string().max(256).optional(),

  /** Company / organization name. */
  company: z.string().max(256).optional(),

  /** Job title. */
  jobTitle: z.string().max(256).optional(),

  /** Website URL. */
  websiteUrl: z.string().url().optional(),

  /** Avatar / profile image URL. */
  avatarUrl: z.string().url().optional(),

  /** Country code (ISO 3166-1 alpha-2). */
  country: z.string().length(2).optional(),

  /** State / region. */
  region: z.string().max(128).optional(),

  /** City. */
  city: z.string().max(128).optional(),

  /** Postal / ZIP code. */
  postalCode: z.string().max(20).optional(),

  /** Lifecycle stage. */
  lifecycleStage: LifecycleStageSchema.default("anonymous"),

  /** Lead source. */
  leadSource: LeadSourceSchema.default("unknown"),

  /** UTM parameters from first touch. */
  firstTouchUtm: UtmParametersSchema.optional(),

  /** UTM parameters from last touch. */
  lastTouchUtm: UtmParametersSchema.optional(),

  /** Products this person has interacted with. */
  productInteractions: z.array(ProductIdSchema).default([]),

  /** Lead score (0-100). */
  leadScore: z.number().int().min(0).max(100).default(0),

  /** Meta Pixel external ID (fbp cookie). */
  metaFbp: z.string().max(256).optional(),

  /** Meta Click ID (fbc cookie). */
  metaFbc: z.string().max(256).optional(),

  /** Meta custom audience match keys. */
  metaMatchKeys: z.record(z.string(), z.string()).optional(),

  /** Tags for segmentation. */
  tags: z.array(z.string().max(64)).max(100).default([]),

  /** Custom properties. */
  customProperties: z.record(z.string(), z.unknown()).optional(),

  /** Identity links to external platforms. */
  identityLinks: z.array(IdentityLinkSchema).optional(),

  /** Total lifetime value in cents. */
  lifetimeValueCents: z.number().int().nonnegative().default(0),

  /** Number of conversions. */
  conversionCount: z.number().int().nonnegative().default(0),

  /** ISO 8601 timestamp of first seen. */
  firstSeenAt: z.string().datetime(),

  /** ISO 8601 timestamp of last activity. */
  lastActiveAt: z.string().datetime().optional(),

  /** ISO 8601 timestamp of creation. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last update. */
  updatedAt: z.string().datetime(),
});

export type Person = z.infer<typeof PersonSchema>;
