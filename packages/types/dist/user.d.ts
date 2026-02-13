import { z } from "zod";
/**
 * User role across the ACD platform.
 */
export declare const UserRoleSchema: z.ZodEnum<["owner", "admin", "member", "viewer", "guest"]>;
export type UserRole = z.infer<typeof UserRoleSchema>;
/**
 * Account status for a user.
 */
export declare const AccountStatusSchema: z.ZodEnum<["active", "suspended", "pending_verification", "deactivated"]>;
export type AccountStatus = z.infer<typeof AccountStatusSchema>;
/**
 * SharedUser - The canonical user record shared across all ACD products.
 */
export declare const SharedUserSchema: z.ZodObject<{
    /** Unique user identifier (UUID v4). */
    id: z.ZodString;
    /** User's email address. */
    email: z.ZodString;
    /** Whether the email has been verified. */
    emailVerified: z.ZodDefault<z.ZodBoolean>;
    /** Display name. */
    displayName: z.ZodString;
    /** First name. */
    firstName: z.ZodOptional<z.ZodString>;
    /** Last name. */
    lastName: z.ZodOptional<z.ZodString>;
    /** URL to user avatar image. */
    avatarUrl: z.ZodOptional<z.ZodString>;
    /** Phone number in E.164 format. */
    phone: z.ZodOptional<z.ZodString>;
    /** Role within the platform. */
    role: z.ZodDefault<z.ZodEnum<["owner", "admin", "member", "viewer", "guest"]>>;
    /** Current account status. */
    status: z.ZodDefault<z.ZodEnum<["active", "suspended", "pending_verification", "deactivated"]>>;
    /** External auth provider ID (e.g., Supabase, Firebase, Clerk). */
    authProviderId: z.ZodOptional<z.ZodString>;
    /** Stripe customer ID, if linked. */
    stripeCustomerId: z.ZodOptional<z.ZodString>;
    /** Metadata bag for extensibility. */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    /** ISO 8601 timestamp of account creation. */
    createdAt: z.ZodString;
    /** ISO 8601 timestamp of last update. */
    updatedAt: z.ZodString;
    /** ISO 8601 timestamp of last login. */
    lastLoginAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "suspended" | "pending_verification" | "deactivated";
    id: string;
    createdAt: string;
    updatedAt: string;
    email: string;
    role: "owner" | "admin" | "member" | "viewer" | "guest";
    displayName: string;
    emailVerified: boolean;
    metadata?: Record<string, unknown> | undefined;
    stripeCustomerId?: string | undefined;
    phone?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    avatarUrl?: string | undefined;
    authProviderId?: string | undefined;
    lastLoginAt?: string | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    email: string;
    displayName: string;
    status?: "active" | "suspended" | "pending_verification" | "deactivated" | undefined;
    metadata?: Record<string, unknown> | undefined;
    role?: "owner" | "admin" | "member" | "viewer" | "guest" | undefined;
    stripeCustomerId?: string | undefined;
    phone?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    avatarUrl?: string | undefined;
    emailVerified?: boolean | undefined;
    authProviderId?: string | undefined;
    lastLoginAt?: string | undefined;
}>;
export type SharedUser = z.infer<typeof SharedUserSchema>;
/**
 * Entitlement status.
 */
export declare const EntitlementStatusSchema: z.ZodEnum<["active", "expired", "cancelled", "trial", "past_due", "paused"]>;
export type EntitlementStatus = z.infer<typeof EntitlementStatusSchema>;
/**
 * SharedEntitlement - Represents a user's access rights to an ACD product.
 */
export declare const SharedEntitlementSchema: z.ZodObject<{
    /** Unique entitlement identifier (UUID v4). */
    id: z.ZodString;
    /** The user this entitlement belongs to. */
    userId: z.ZodString;
    /** The product this entitlement grants access to. */
    productId: z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>;
    /** The tier of access. */
    tier: z.ZodEnum<["free", "starter", "pro", "enterprise"]>;
    /** Current entitlement status. */
    status: z.ZodDefault<z.ZodEnum<["active", "expired", "cancelled", "trial", "past_due", "paused"]>>;
    /** Maximum number of seats (for team plans). */
    seats: z.ZodOptional<z.ZodNumber>;
    /** Usage limits as key-value pairs (e.g., renders_per_month: 100). */
    limits: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    /** Current usage counters. */
    usage: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    /** Whether this entitlement auto-renews. */
    autoRenew: z.ZodDefault<z.ZodBoolean>;
    /** Associated Stripe subscription ID. */
    stripeSubscriptionId: z.ZodOptional<z.ZodString>;
    /** ISO 8601 timestamp when the entitlement begins. */
    startsAt: z.ZodString;
    /** ISO 8601 timestamp when the entitlement expires (null = perpetual). */
    expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** ISO 8601 timestamp of creation. */
    createdAt: z.ZodString;
    /** ISO 8601 timestamp of last update. */
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "active" | "expired" | "cancelled" | "past_due" | "paused" | "trial";
    id: string;
    userId: string;
    productId: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach";
    createdAt: string;
    updatedAt: string;
    tier: "free" | "starter" | "pro" | "enterprise";
    autoRenew: boolean;
    startsAt: string;
    expiresAt?: string | null | undefined;
    stripeSubscriptionId?: string | undefined;
    limits?: Record<string, number> | undefined;
    seats?: number | undefined;
    usage?: Record<string, number> | undefined;
}, {
    id: string;
    userId: string;
    productId: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach";
    createdAt: string;
    updatedAt: string;
    tier: "free" | "starter" | "pro" | "enterprise";
    startsAt: string;
    status?: "active" | "expired" | "cancelled" | "past_due" | "paused" | "trial" | undefined;
    expiresAt?: string | null | undefined;
    stripeSubscriptionId?: string | undefined;
    limits?: Record<string, number> | undefined;
    seats?: number | undefined;
    usage?: Record<string, number> | undefined;
    autoRenew?: boolean | undefined;
}>;
export type SharedEntitlement = z.infer<typeof SharedEntitlementSchema>;
//# sourceMappingURL=user.d.ts.map