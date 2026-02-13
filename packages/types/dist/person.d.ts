import { z } from "zod";
/**
 * Identity provider type for linking external identities.
 */
export declare const IdentityProviderSchema: z.ZodEnum<["email", "phone", "facebook", "instagram", "google", "linkedin", "twitter", "tiktok", "shopify", "stripe", "hubspot", "salesforce", "meta_pixel", "meta_capi", "custom"]>;
export type IdentityProvider = z.infer<typeof IdentityProviderSchema>;
/**
 * IdentityLink - Links a Person to an external identity/platform.
 */
export declare const IdentityLinkSchema: z.ZodObject<{
    /** Unique identity link identifier (UUID v4). */
    id: z.ZodString;
    /** The person this identity belongs to. */
    personId: z.ZodString;
    /** The identity provider. */
    provider: z.ZodEnum<["email", "phone", "facebook", "instagram", "google", "linkedin", "twitter", "tiktok", "shopify", "stripe", "hubspot", "salesforce", "meta_pixel", "meta_capi", "custom"]>;
    /** The external ID on the provider's platform. */
    externalId: z.ZodString;
    /** The identifier value (e.g., email address, phone number, username). */
    identifier: z.ZodString;
    /** Whether this identity has been verified. */
    verified: z.ZodDefault<z.ZodBoolean>;
    /** Whether this is the primary identity for this provider. */
    primary: z.ZodDefault<z.ZodBoolean>;
    /** Provider-specific metadata. */
    providerMetadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    /** ISO 8601 timestamp of when this link was created. */
    createdAt: z.ZodString;
    /** ISO 8601 timestamp of last update. */
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    provider: "custom" | "email" | "facebook" | "instagram" | "phone" | "google" | "linkedin" | "twitter" | "tiktok" | "shopify" | "stripe" | "hubspot" | "salesforce" | "meta_pixel" | "meta_capi";
    externalId: string;
    personId: string;
    identifier: string;
    verified: boolean;
    primary: boolean;
    providerMetadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    provider: "custom" | "email" | "facebook" | "instagram" | "phone" | "google" | "linkedin" | "twitter" | "tiktok" | "shopify" | "stripe" | "hubspot" | "salesforce" | "meta_pixel" | "meta_capi";
    externalId: string;
    personId: string;
    identifier: string;
    verified?: boolean | undefined;
    primary?: boolean | undefined;
    providerMetadata?: Record<string, unknown> | undefined;
}>;
export type IdentityLink = z.infer<typeof IdentityLinkSchema>;
/**
 * Where / how this person entered the system.
 */
export declare const LeadSourceSchema: z.ZodEnum<["organic", "paid_social", "paid_search", "referral", "email_campaign", "content_marketing", "direct", "partner", "event", "waitlist", "api", "import", "unknown"]>;
export type LeadSource = z.infer<typeof LeadSourceSchema>;
/**
 * Lead / person lifecycle stage.
 */
export declare const LifecycleStageSchema: z.ZodEnum<["anonymous", "subscriber", "lead", "marketing_qualified", "sales_qualified", "opportunity", "customer", "evangelist", "churned"]>;
export type LifecycleStage = z.infer<typeof LifecycleStageSchema>;
/**
 * UTM parameters captured at acquisition.
 */
export declare const UtmParametersSchema: z.ZodObject<{
    utmSource: z.ZodOptional<z.ZodString>;
    utmMedium: z.ZodOptional<z.ZodString>;
    utmCampaign: z.ZodOptional<z.ZodString>;
    utmTerm: z.ZodOptional<z.ZodString>;
    utmContent: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    utmSource?: string | undefined;
    utmMedium?: string | undefined;
    utmCampaign?: string | undefined;
    utmTerm?: string | undefined;
    utmContent?: string | undefined;
}, {
    utmSource?: string | undefined;
    utmMedium?: string | undefined;
    utmCampaign?: string | undefined;
    utmTerm?: string | undefined;
    utmContent?: string | undefined;
}>;
export type UtmParameters = z.infer<typeof UtmParametersSchema>;
/**
 * Person - A contact/lead record for Meta marketing and lead management.
 * This is distinct from SharedUser; a Person may not have an ACD account.
 */
export declare const PersonSchema: z.ZodObject<{
    /** Unique person identifier (UUID v4). */
    id: z.ZodString;
    /** Associated ACD user ID, if they have an account. */
    userId: z.ZodOptional<z.ZodString>;
    /** Email address. */
    email: z.ZodOptional<z.ZodString>;
    /** Phone number in E.164 format. */
    phone: z.ZodOptional<z.ZodString>;
    /** First name. */
    firstName: z.ZodOptional<z.ZodString>;
    /** Last name. */
    lastName: z.ZodOptional<z.ZodString>;
    /** Full name (computed or provided). */
    fullName: z.ZodOptional<z.ZodString>;
    /** Company / organization name. */
    company: z.ZodOptional<z.ZodString>;
    /** Job title. */
    jobTitle: z.ZodOptional<z.ZodString>;
    /** Website URL. */
    websiteUrl: z.ZodOptional<z.ZodString>;
    /** Avatar / profile image URL. */
    avatarUrl: z.ZodOptional<z.ZodString>;
    /** Country code (ISO 3166-1 alpha-2). */
    country: z.ZodOptional<z.ZodString>;
    /** State / region. */
    region: z.ZodOptional<z.ZodString>;
    /** City. */
    city: z.ZodOptional<z.ZodString>;
    /** Postal / ZIP code. */
    postalCode: z.ZodOptional<z.ZodString>;
    /** Lifecycle stage. */
    lifecycleStage: z.ZodDefault<z.ZodEnum<["anonymous", "subscriber", "lead", "marketing_qualified", "sales_qualified", "opportunity", "customer", "evangelist", "churned"]>>;
    /** Lead source. */
    leadSource: z.ZodDefault<z.ZodEnum<["organic", "paid_social", "paid_search", "referral", "email_campaign", "content_marketing", "direct", "partner", "event", "waitlist", "api", "import", "unknown"]>>;
    /** UTM parameters from first touch. */
    firstTouchUtm: z.ZodOptional<z.ZodObject<{
        utmSource: z.ZodOptional<z.ZodString>;
        utmMedium: z.ZodOptional<z.ZodString>;
        utmCampaign: z.ZodOptional<z.ZodString>;
        utmTerm: z.ZodOptional<z.ZodString>;
        utmContent: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        utmSource?: string | undefined;
        utmMedium?: string | undefined;
        utmCampaign?: string | undefined;
        utmTerm?: string | undefined;
        utmContent?: string | undefined;
    }, {
        utmSource?: string | undefined;
        utmMedium?: string | undefined;
        utmCampaign?: string | undefined;
        utmTerm?: string | undefined;
        utmContent?: string | undefined;
    }>>;
    /** UTM parameters from last touch. */
    lastTouchUtm: z.ZodOptional<z.ZodObject<{
        utmSource: z.ZodOptional<z.ZodString>;
        utmMedium: z.ZodOptional<z.ZodString>;
        utmCampaign: z.ZodOptional<z.ZodString>;
        utmTerm: z.ZodOptional<z.ZodString>;
        utmContent: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        utmSource?: string | undefined;
        utmMedium?: string | undefined;
        utmCampaign?: string | undefined;
        utmTerm?: string | undefined;
        utmContent?: string | undefined;
    }, {
        utmSource?: string | undefined;
        utmMedium?: string | undefined;
        utmCampaign?: string | undefined;
        utmTerm?: string | undefined;
        utmContent?: string | undefined;
    }>>;
    /** Products this person has interacted with. */
    productInteractions: z.ZodDefault<z.ZodArray<z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>, "many">>;
    /** Lead score (0-100). */
    leadScore: z.ZodDefault<z.ZodNumber>;
    /** Meta Pixel external ID (fbp cookie). */
    metaFbp: z.ZodOptional<z.ZodString>;
    /** Meta Click ID (fbc cookie). */
    metaFbc: z.ZodOptional<z.ZodString>;
    /** Meta custom audience match keys. */
    metaMatchKeys: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /** Tags for segmentation. */
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Custom properties. */
    customProperties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    /** Identity links to external platforms. */
    identityLinks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        /** Unique identity link identifier (UUID v4). */
        id: z.ZodString;
        /** The person this identity belongs to. */
        personId: z.ZodString;
        /** The identity provider. */
        provider: z.ZodEnum<["email", "phone", "facebook", "instagram", "google", "linkedin", "twitter", "tiktok", "shopify", "stripe", "hubspot", "salesforce", "meta_pixel", "meta_capi", "custom"]>;
        /** The external ID on the provider's platform. */
        externalId: z.ZodString;
        /** The identifier value (e.g., email address, phone number, username). */
        identifier: z.ZodString;
        /** Whether this identity has been verified. */
        verified: z.ZodDefault<z.ZodBoolean>;
        /** Whether this is the primary identity for this provider. */
        primary: z.ZodDefault<z.ZodBoolean>;
        /** Provider-specific metadata. */
        providerMetadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        /** ISO 8601 timestamp of when this link was created. */
        createdAt: z.ZodString;
        /** ISO 8601 timestamp of last update. */
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        updatedAt: string;
        provider: "custom" | "email" | "facebook" | "instagram" | "phone" | "google" | "linkedin" | "twitter" | "tiktok" | "shopify" | "stripe" | "hubspot" | "salesforce" | "meta_pixel" | "meta_capi";
        externalId: string;
        personId: string;
        identifier: string;
        verified: boolean;
        primary: boolean;
        providerMetadata?: Record<string, unknown> | undefined;
    }, {
        id: string;
        createdAt: string;
        updatedAt: string;
        provider: "custom" | "email" | "facebook" | "instagram" | "phone" | "google" | "linkedin" | "twitter" | "tiktok" | "shopify" | "stripe" | "hubspot" | "salesforce" | "meta_pixel" | "meta_capi";
        externalId: string;
        personId: string;
        identifier: string;
        verified?: boolean | undefined;
        primary?: boolean | undefined;
        providerMetadata?: Record<string, unknown> | undefined;
    }>, "many">>;
    /** Total lifetime value in cents. */
    lifetimeValueCents: z.ZodDefault<z.ZodNumber>;
    /** Number of conversions. */
    conversionCount: z.ZodDefault<z.ZodNumber>;
    /** ISO 8601 timestamp of first seen. */
    firstSeenAt: z.ZodString;
    /** ISO 8601 timestamp of last activity. */
    lastActiveAt: z.ZodOptional<z.ZodString>;
    /** ISO 8601 timestamp of creation. */
    createdAt: z.ZodString;
    /** ISO 8601 timestamp of last update. */
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    tags: string[];
    lifecycleStage: "anonymous" | "subscriber" | "lead" | "marketing_qualified" | "sales_qualified" | "opportunity" | "customer" | "evangelist" | "churned";
    leadSource: "unknown" | "organic" | "paid_social" | "paid_search" | "referral" | "email_campaign" | "content_marketing" | "direct" | "partner" | "event" | "waitlist" | "api" | "import";
    productInteractions: ("portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach")[];
    leadScore: number;
    lifetimeValueCents: number;
    conversionCount: number;
    firstSeenAt: string;
    userId?: string | undefined;
    lastActiveAt?: string | undefined;
    email?: string | undefined;
    country?: string | undefined;
    region?: string | undefined;
    city?: string | undefined;
    phone?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    fullName?: string | undefined;
    company?: string | undefined;
    jobTitle?: string | undefined;
    websiteUrl?: string | undefined;
    avatarUrl?: string | undefined;
    postalCode?: string | undefined;
    firstTouchUtm?: {
        utmSource?: string | undefined;
        utmMedium?: string | undefined;
        utmCampaign?: string | undefined;
        utmTerm?: string | undefined;
        utmContent?: string | undefined;
    } | undefined;
    lastTouchUtm?: {
        utmSource?: string | undefined;
        utmMedium?: string | undefined;
        utmCampaign?: string | undefined;
        utmTerm?: string | undefined;
        utmContent?: string | undefined;
    } | undefined;
    metaFbp?: string | undefined;
    metaFbc?: string | undefined;
    metaMatchKeys?: Record<string, string> | undefined;
    customProperties?: Record<string, unknown> | undefined;
    identityLinks?: {
        id: string;
        createdAt: string;
        updatedAt: string;
        provider: "custom" | "email" | "facebook" | "instagram" | "phone" | "google" | "linkedin" | "twitter" | "tiktok" | "shopify" | "stripe" | "hubspot" | "salesforce" | "meta_pixel" | "meta_capi";
        externalId: string;
        personId: string;
        identifier: string;
        verified: boolean;
        primary: boolean;
        providerMetadata?: Record<string, unknown> | undefined;
    }[] | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    firstSeenAt: string;
    userId?: string | undefined;
    tags?: string[] | undefined;
    lastActiveAt?: string | undefined;
    email?: string | undefined;
    country?: string | undefined;
    region?: string | undefined;
    city?: string | undefined;
    phone?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    fullName?: string | undefined;
    company?: string | undefined;
    jobTitle?: string | undefined;
    websiteUrl?: string | undefined;
    avatarUrl?: string | undefined;
    postalCode?: string | undefined;
    lifecycleStage?: "anonymous" | "subscriber" | "lead" | "marketing_qualified" | "sales_qualified" | "opportunity" | "customer" | "evangelist" | "churned" | undefined;
    leadSource?: "unknown" | "organic" | "paid_social" | "paid_search" | "referral" | "email_campaign" | "content_marketing" | "direct" | "partner" | "event" | "waitlist" | "api" | "import" | undefined;
    firstTouchUtm?: {
        utmSource?: string | undefined;
        utmMedium?: string | undefined;
        utmCampaign?: string | undefined;
        utmTerm?: string | undefined;
        utmContent?: string | undefined;
    } | undefined;
    lastTouchUtm?: {
        utmSource?: string | undefined;
        utmMedium?: string | undefined;
        utmCampaign?: string | undefined;
        utmTerm?: string | undefined;
        utmContent?: string | undefined;
    } | undefined;
    productInteractions?: ("portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach")[] | undefined;
    leadScore?: number | undefined;
    metaFbp?: string | undefined;
    metaFbc?: string | undefined;
    metaMatchKeys?: Record<string, string> | undefined;
    customProperties?: Record<string, unknown> | undefined;
    identityLinks?: {
        id: string;
        createdAt: string;
        updatedAt: string;
        provider: "custom" | "email" | "facebook" | "instagram" | "phone" | "google" | "linkedin" | "twitter" | "tiktok" | "shopify" | "stripe" | "hubspot" | "salesforce" | "meta_pixel" | "meta_capi";
        externalId: string;
        personId: string;
        identifier: string;
        verified?: boolean | undefined;
        primary?: boolean | undefined;
        providerMetadata?: Record<string, unknown> | undefined;
    }[] | undefined;
    lifetimeValueCents?: number | undefined;
    conversionCount?: number | undefined;
}>;
export type Person = z.infer<typeof PersonSchema>;
//# sourceMappingURL=person.d.ts.map