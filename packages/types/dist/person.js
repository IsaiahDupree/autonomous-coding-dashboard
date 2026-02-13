"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonSchema = exports.UtmParametersSchema = exports.LifecycleStageSchema = exports.LeadSourceSchema = exports.IdentityLinkSchema = exports.IdentityProviderSchema = void 0;
const zod_1 = require("zod");
const product_1 = require("./product");
// ---------------------------------------------------------------------------
// Identity Link
// ---------------------------------------------------------------------------
/**
 * Identity provider type for linking external identities.
 */
exports.IdentityProviderSchema = zod_1.z.enum([
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
/**
 * IdentityLink - Links a Person to an external identity/platform.
 */
exports.IdentityLinkSchema = zod_1.z.object({
    /** Unique identity link identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** The person this identity belongs to. */
    personId: zod_1.z.string().uuid(),
    /** The identity provider. */
    provider: exports.IdentityProviderSchema,
    /** The external ID on the provider's platform. */
    externalId: zod_1.z.string().min(1).max(512),
    /** The identifier value (e.g., email address, phone number, username). */
    identifier: zod_1.z.string().min(1).max(512),
    /** Whether this identity has been verified. */
    verified: zod_1.z.boolean().default(false),
    /** Whether this is the primary identity for this provider. */
    primary: zod_1.z.boolean().default(false),
    /** Provider-specific metadata. */
    providerMetadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    /** ISO 8601 timestamp of when this link was created. */
    createdAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last update. */
    updatedAt: zod_1.z.string().datetime(),
});
// ---------------------------------------------------------------------------
// Lead Source
// ---------------------------------------------------------------------------
/**
 * Where / how this person entered the system.
 */
exports.LeadSourceSchema = zod_1.z.enum([
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
/**
 * Lead / person lifecycle stage.
 */
exports.LifecycleStageSchema = zod_1.z.enum([
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
// ---------------------------------------------------------------------------
// Person
// ---------------------------------------------------------------------------
/**
 * UTM parameters captured at acquisition.
 */
exports.UtmParametersSchema = zod_1.z.object({
    utmSource: zod_1.z.string().max(256).optional(),
    utmMedium: zod_1.z.string().max(256).optional(),
    utmCampaign: zod_1.z.string().max(256).optional(),
    utmTerm: zod_1.z.string().max(256).optional(),
    utmContent: zod_1.z.string().max(256).optional(),
});
/**
 * Person - A contact/lead record for Meta marketing and lead management.
 * This is distinct from SharedUser; a Person may not have an ACD account.
 */
exports.PersonSchema = zod_1.z.object({
    /** Unique person identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** Associated ACD user ID, if they have an account. */
    userId: zod_1.z.string().uuid().optional(),
    /** Email address. */
    email: zod_1.z.string().email().optional(),
    /** Phone number in E.164 format. */
    phone: zod_1.z
        .string()
        .regex(/^\+[1-9]\d{1,14}$/, "Phone must be in E.164 format")
        .optional(),
    /** First name. */
    firstName: zod_1.z.string().max(128).optional(),
    /** Last name. */
    lastName: zod_1.z.string().max(128).optional(),
    /** Full name (computed or provided). */
    fullName: zod_1.z.string().max(256).optional(),
    /** Company / organization name. */
    company: zod_1.z.string().max(256).optional(),
    /** Job title. */
    jobTitle: zod_1.z.string().max(256).optional(),
    /** Website URL. */
    websiteUrl: zod_1.z.string().url().optional(),
    /** Avatar / profile image URL. */
    avatarUrl: zod_1.z.string().url().optional(),
    /** Country code (ISO 3166-1 alpha-2). */
    country: zod_1.z.string().length(2).optional(),
    /** State / region. */
    region: zod_1.z.string().max(128).optional(),
    /** City. */
    city: zod_1.z.string().max(128).optional(),
    /** Postal / ZIP code. */
    postalCode: zod_1.z.string().max(20).optional(),
    /** Lifecycle stage. */
    lifecycleStage: exports.LifecycleStageSchema.default("anonymous"),
    /** Lead source. */
    leadSource: exports.LeadSourceSchema.default("unknown"),
    /** UTM parameters from first touch. */
    firstTouchUtm: exports.UtmParametersSchema.optional(),
    /** UTM parameters from last touch. */
    lastTouchUtm: exports.UtmParametersSchema.optional(),
    /** Products this person has interacted with. */
    productInteractions: zod_1.z.array(product_1.ProductIdSchema).default([]),
    /** Lead score (0-100). */
    leadScore: zod_1.z.number().int().min(0).max(100).default(0),
    /** Meta Pixel external ID (fbp cookie). */
    metaFbp: zod_1.z.string().max(256).optional(),
    /** Meta Click ID (fbc cookie). */
    metaFbc: zod_1.z.string().max(256).optional(),
    /** Meta custom audience match keys. */
    metaMatchKeys: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    /** Tags for segmentation. */
    tags: zod_1.z.array(zod_1.z.string().max(64)).max(100).default([]),
    /** Custom properties. */
    customProperties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    /** Identity links to external platforms. */
    identityLinks: zod_1.z.array(exports.IdentityLinkSchema).optional(),
    /** Total lifetime value in cents. */
    lifetimeValueCents: zod_1.z.number().int().nonnegative().default(0),
    /** Number of conversions. */
    conversionCount: zod_1.z.number().int().nonnegative().default(0),
    /** ISO 8601 timestamp of first seen. */
    firstSeenAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last activity. */
    lastActiveAt: zod_1.z.string().datetime().optional(),
    /** ISO 8601 timestamp of creation. */
    createdAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last update. */
    updatedAt: zod_1.z.string().datetime(),
});
//# sourceMappingURL=person.js.map