"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedEntitlementSchema = exports.EntitlementStatusSchema = exports.SharedUserSchema = exports.AccountStatusSchema = exports.UserRoleSchema = void 0;
const zod_1 = require("zod");
const product_1 = require("./product");
// ---------------------------------------------------------------------------
// Shared User
// ---------------------------------------------------------------------------
/**
 * User role across the ACD platform.
 */
exports.UserRoleSchema = zod_1.z.enum(["owner", "admin", "member", "viewer", "guest"]);
/**
 * Account status for a user.
 */
exports.AccountStatusSchema = zod_1.z.enum([
    "active",
    "suspended",
    "pending_verification",
    "deactivated",
]);
/**
 * SharedUser - The canonical user record shared across all ACD products.
 */
exports.SharedUserSchema = zod_1.z.object({
    /** Unique user identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** User's email address. */
    email: zod_1.z.string().email(),
    /** Whether the email has been verified. */
    emailVerified: zod_1.z.boolean().default(false),
    /** Display name. */
    displayName: zod_1.z.string().min(1).max(255),
    /** First name. */
    firstName: zod_1.z.string().min(1).max(128).optional(),
    /** Last name. */
    lastName: zod_1.z.string().min(1).max(128).optional(),
    /** URL to user avatar image. */
    avatarUrl: zod_1.z.string().url().optional(),
    /** Phone number in E.164 format. */
    phone: zod_1.z
        .string()
        .regex(/^\+[1-9]\d{1,14}$/, "Phone must be in E.164 format")
        .optional(),
    /** Role within the platform. */
    role: exports.UserRoleSchema.default("member"),
    /** Current account status. */
    status: exports.AccountStatusSchema.default("active"),
    /** External auth provider ID (e.g., Supabase, Firebase, Clerk). */
    authProviderId: zod_1.z.string().optional(),
    /** Stripe customer ID, if linked. */
    stripeCustomerId: zod_1.z.string().optional(),
    /** Metadata bag for extensibility. */
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    /** ISO 8601 timestamp of account creation. */
    createdAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last update. */
    updatedAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last login. */
    lastLoginAt: zod_1.z.string().datetime().optional(),
});
// ---------------------------------------------------------------------------
// Shared Entitlement
// ---------------------------------------------------------------------------
/**
 * Entitlement status.
 */
exports.EntitlementStatusSchema = zod_1.z.enum([
    "active",
    "expired",
    "cancelled",
    "trial",
    "past_due",
    "paused",
]);
/**
 * SharedEntitlement - Represents a user's access rights to an ACD product.
 */
exports.SharedEntitlementSchema = zod_1.z.object({
    /** Unique entitlement identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** The user this entitlement belongs to. */
    userId: zod_1.z.string().uuid(),
    /** The product this entitlement grants access to. */
    productId: product_1.ProductIdSchema,
    /** The tier of access. */
    tier: product_1.ProductTierSchema,
    /** Current entitlement status. */
    status: exports.EntitlementStatusSchema.default("active"),
    /** Maximum number of seats (for team plans). */
    seats: zod_1.z.number().int().positive().optional(),
    /** Usage limits as key-value pairs (e.g., renders_per_month: 100). */
    limits: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional(),
    /** Current usage counters. */
    usage: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional(),
    /** Whether this entitlement auto-renews. */
    autoRenew: zod_1.z.boolean().default(true),
    /** Associated Stripe subscription ID. */
    stripeSubscriptionId: zod_1.z.string().optional(),
    /** ISO 8601 timestamp when the entitlement begins. */
    startsAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp when the entitlement expires (null = perpetual). */
    expiresAt: zod_1.z.string().datetime().nullable().optional(),
    /** ISO 8601 timestamp of creation. */
    createdAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last update. */
    updatedAt: zod_1.z.string().datetime(),
});
//# sourceMappingURL=user.js.map