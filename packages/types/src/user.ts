import { z } from "zod";
import { ProductIdSchema, ProductTierSchema } from "./product";

// ---------------------------------------------------------------------------
// Shared User
// ---------------------------------------------------------------------------

/**
 * User role across the ACD platform.
 */
export const UserRoleSchema = z.enum(["owner", "admin", "member", "viewer", "guest"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

/**
 * Account status for a user.
 */
export const AccountStatusSchema = z.enum([
  "active",
  "suspended",
  "pending_verification",
  "deactivated",
]);
export type AccountStatus = z.infer<typeof AccountStatusSchema>;

/**
 * SharedUser - The canonical user record shared across all ACD products.
 */
export const SharedUserSchema = z.object({
  /** Unique user identifier (UUID v4). */
  id: z.string().uuid(),

  /** User's email address. */
  email: z.string().email(),

  /** Whether the email has been verified. */
  emailVerified: z.boolean().default(false),

  /** Display name. */
  displayName: z.string().min(1).max(255),

  /** First name. */
  firstName: z.string().min(1).max(128).optional(),

  /** Last name. */
  lastName: z.string().min(1).max(128).optional(),

  /** URL to user avatar image. */
  avatarUrl: z.string().url().optional(),

  /** Phone number in E.164 format. */
  phone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "Phone must be in E.164 format")
    .optional(),

  /** Role within the platform. */
  role: UserRoleSchema.default("member"),

  /** Current account status. */
  status: AccountStatusSchema.default("active"),

  /** External auth provider ID (e.g., Supabase, Firebase, Clerk). */
  authProviderId: z.string().optional(),

  /** Stripe customer ID, if linked. */
  stripeCustomerId: z.string().optional(),

  /** Metadata bag for extensibility. */
  metadata: z.record(z.string(), z.unknown()).optional(),

  /** ISO 8601 timestamp of account creation. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last update. */
  updatedAt: z.string().datetime(),

  /** ISO 8601 timestamp of last login. */
  lastLoginAt: z.string().datetime().optional(),
});

export type SharedUser = z.infer<typeof SharedUserSchema>;

// ---------------------------------------------------------------------------
// Shared Entitlement
// ---------------------------------------------------------------------------

/**
 * Entitlement status.
 */
export const EntitlementStatusSchema = z.enum([
  "active",
  "expired",
  "cancelled",
  "trial",
  "past_due",
  "paused",
]);
export type EntitlementStatus = z.infer<typeof EntitlementStatusSchema>;

/**
 * SharedEntitlement - Represents a user's access rights to an ACD product.
 */
export const SharedEntitlementSchema = z.object({
  /** Unique entitlement identifier (UUID v4). */
  id: z.string().uuid(),

  /** The user this entitlement belongs to. */
  userId: z.string().uuid(),

  /** The product this entitlement grants access to. */
  productId: ProductIdSchema,

  /** The tier of access. */
  tier: ProductTierSchema,

  /** Current entitlement status. */
  status: EntitlementStatusSchema.default("active"),

  /** Maximum number of seats (for team plans). */
  seats: z.number().int().positive().optional(),

  /** Usage limits as key-value pairs (e.g., renders_per_month: 100). */
  limits: z.record(z.string(), z.number()).optional(),

  /** Current usage counters. */
  usage: z.record(z.string(), z.number()).optional(),

  /** Whether this entitlement auto-renews. */
  autoRenew: z.boolean().default(true),

  /** Associated Stripe subscription ID. */
  stripeSubscriptionId: z.string().optional(),

  /** ISO 8601 timestamp when the entitlement begins. */
  startsAt: z.string().datetime(),

  /** ISO 8601 timestamp when the entitlement expires (null = perpetual). */
  expiresAt: z.string().datetime().nullable().optional(),

  /** ISO 8601 timestamp of creation. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last update. */
  updatedAt: z.string().datetime(),
});

export type SharedEntitlement = z.infer<typeof SharedEntitlementSchema>;
