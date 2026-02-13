import { z } from "zod";
import { ProductIdSchema, ProductTierSchema } from "./product";

// ---------------------------------------------------------------------------
// Shared Stripe Customer
// ---------------------------------------------------------------------------

/**
 * Customer payment status.
 */
export const PaymentStatusSchema = z.enum([
  "active",
  "past_due",
  "unpaid",
  "cancelled",
  "incomplete",
  "incomplete_expired",
  "trialing",
  "paused",
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

/**
 * Payment method type.
 */
export const PaymentMethodTypeSchema = z.enum([
  "card",
  "bank_account",
  "paypal",
  "apple_pay",
  "google_pay",
  "sepa_debit",
  "ideal",
  "klarna",
  "affirm",
  "other",
]);
export type PaymentMethodType = z.infer<typeof PaymentMethodTypeSchema>;

/**
 * Stored payment method summary.
 */
export const PaymentMethodSummarySchema = z.object({
  /** Stripe payment method ID. */
  stripePaymentMethodId: z.string().min(1),

  /** Payment method type. */
  type: PaymentMethodTypeSchema,

  /** Whether this is the default payment method. */
  isDefault: z.boolean().default(false),

  /** Card brand (visa, mastercard, etc.) - for card type. */
  cardBrand: z.string().max(32).optional(),

  /** Last 4 digits of the card. */
  cardLast4: z.string().length(4).optional(),

  /** Card expiry month (1-12). */
  cardExpMonth: z.number().int().min(1).max(12).optional(),

  /** Card expiry year. */
  cardExpYear: z.number().int().optional(),

  /** Bank name (for bank account type). */
  bankName: z.string().max(256).optional(),

  /** ISO 8601 timestamp of creation. */
  createdAt: z.string().datetime(),
});

export type PaymentMethodSummary = z.infer<typeof PaymentMethodSummarySchema>;

/**
 * SharedStripeCustomer - The ACD-side representation of a Stripe customer.
 */
export const SharedStripeCustomerSchema = z.object({
  /** Unique ACD identifier (UUID v4). */
  id: z.string().uuid(),

  /** Associated ACD user ID. */
  userId: z.string().uuid(),

  /** Stripe customer ID (e.g., "cus_..."). */
  stripeCustomerId: z.string().min(1),

  /** Customer email on Stripe. */
  email: z.string().email(),

  /** Customer name on Stripe. */
  name: z.string().max(256).optional(),

  /** Overall payment status. */
  paymentStatus: PaymentStatusSchema.default("active"),

  /** Stored payment methods. */
  paymentMethods: z.array(PaymentMethodSummarySchema).default([]),

  /** Default currency (ISO 4217). */
  currency: z.string().length(3).default("usd"),

  /** Customer balance in cents (credit or debit). */
  balanceCents: z.number().int().default(0),

  /** Tax ID (if provided). */
  taxId: z.string().max(64).optional(),

  /** Tax exempt status. */
  taxExempt: z.enum(["none", "exempt", "reverse"]).default("none"),

  /** Billing address. */
  billingAddress: z
    .object({
      line1: z.string().max(256).optional(),
      line2: z.string().max(256).optional(),
      city: z.string().max(128).optional(),
      state: z.string().max(128).optional(),
      postalCode: z.string().max(20).optional(),
      country: z.string().length(2).optional(),
    })
    .optional(),

  /** Total lifetime spend in cents across all products. */
  lifetimeSpendCents: z.number().int().nonnegative().default(0),

  /** Total number of successful payments. */
  totalPayments: z.number().int().nonnegative().default(0),

  /** Total number of refunds. */
  totalRefunds: z.number().int().nonnegative().default(0),

  /** Total refund amount in cents. */
  totalRefundAmountCents: z.number().int().nonnegative().default(0),

  /** Whether the customer has had a failed payment. */
  hasFailedPayment: z.boolean().default(false),

  /** Stripe metadata. */
  stripeMetadata: z.record(z.string(), z.string()).optional(),

  /** ISO 8601 timestamp of creation. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last update. */
  updatedAt: z.string().datetime(),
});

export type SharedStripeCustomer = z.infer<typeof SharedStripeCustomerSchema>;

// ---------------------------------------------------------------------------
// Product Subscription
// ---------------------------------------------------------------------------

/**
 * Subscription billing interval.
 */
export const BillingIntervalSchema = z.enum(["month", "year", "week", "day"]);
export type BillingInterval = z.infer<typeof BillingIntervalSchema>;

/**
 * Subscription status.
 */
export const SubscriptionStatusSchema = z.enum([
  "active",
  "past_due",
  "unpaid",
  "cancelled",
  "incomplete",
  "incomplete_expired",
  "trialing",
  "paused",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

/**
 * Subscription cancel reason.
 */
export const CancelReasonSchema = z.enum([
  "customer_request",
  "payment_failure",
  "too_expensive",
  "missing_features",
  "switched_competitor",
  "no_longer_needed",
  "other",
]);
export type CancelReason = z.infer<typeof CancelReasonSchema>;

/**
 * ProductSubscription - A subscription to a specific ACD product.
 */
export const ProductSubscriptionSchema = z.object({
  /** Unique ACD identifier (UUID v4). */
  id: z.string().uuid(),

  /** ACD user ID. */
  userId: z.string().uuid(),

  /** Stripe customer ID. */
  stripeCustomerId: z.string().min(1),

  /** Stripe subscription ID (e.g., "sub_..."). */
  stripeSubscriptionId: z.string().min(1),

  /** Stripe price ID (e.g., "price_..."). */
  stripePriceId: z.string().min(1),

  /** Stripe product ID (e.g., "prod_..."). */
  stripeProductId: z.string().min(1),

  /** ACD product this subscription is for. */
  productId: ProductIdSchema,

  /** Product tier. */
  tier: ProductTierSchema,

  /** Subscription status. */
  status: SubscriptionStatusSchema.default("active"),

  /** Billing interval. */
  billingInterval: BillingIntervalSchema,

  /** Billing interval count (e.g., 1 = every month, 3 = quarterly). */
  billingIntervalCount: z.number().int().positive().default(1),

  /** Unit amount in cents per billing period. */
  unitAmountCents: z.number().int().nonnegative(),

  /** Currency (ISO 4217). */
  currency: z.string().length(3).default("usd"),

  /** Quantity (for per-seat billing). */
  quantity: z.number().int().positive().default(1),

  /** Discount percentage applied (0-100). */
  discountPercent: z.number().min(0).max(100).optional(),

  /** Stripe coupon ID if applied. */
  stripeCouponId: z.string().optional(),

  /** Whether the subscription cancels at period end. */
  cancelAtPeriodEnd: z.boolean().default(false),

  /** Cancel reason (if cancelling/cancelled). */
  cancelReason: CancelReasonSchema.optional(),

  /** Cancel feedback from user. */
  cancelFeedback: z.string().max(2048).optional(),

  /** ISO 8601 timestamp of current period start. */
  currentPeriodStart: z.string().datetime(),

  /** ISO 8601 timestamp of current period end. */
  currentPeriodEnd: z.string().datetime(),

  /** ISO 8601 timestamp of trial start. */
  trialStart: z.string().datetime().optional(),

  /** ISO 8601 timestamp of trial end. */
  trialEnd: z.string().datetime().optional(),

  /** ISO 8601 timestamp of cancellation. */
  cancelledAt: z.string().datetime().optional(),

  /** ISO 8601 timestamp of when subscription ended. */
  endedAt: z.string().datetime().optional(),

  /** Stripe metadata. */
  stripeMetadata: z.record(z.string(), z.string()).optional(),

  /** ISO 8601 timestamp of creation. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last update. */
  updatedAt: z.string().datetime(),
});

export type ProductSubscription = z.infer<typeof ProductSubscriptionSchema>;

// ---------------------------------------------------------------------------
// Bundle Pricing
// ---------------------------------------------------------------------------

/**
 * BundlePricing - Pricing configuration for product bundles.
 */
export const BundlePricingSchema = z.object({
  /** Unique bundle identifier (UUID v4). */
  id: z.string().uuid(),

  /** Bundle name (e.g., "Creator Pro Bundle", "Enterprise Suite"). */
  name: z.string().min(1).max(256),

  /** Bundle description. */
  description: z.string().max(2048).optional(),

  /** Slug for URL-friendly identification. */
  slug: z.string().min(1).max(128).regex(/^[a-z0-9-]+$/),

  /** Products included in this bundle. */
  includedProducts: z.array(
    z.object({
      productId: ProductIdSchema,
      tier: ProductTierSchema,
      /** Whether this product is the primary/featured one. */
      featured: z.boolean().default(false),
    })
  ).min(2),

  /** Monthly price in cents. */
  monthlyPriceCents: z.number().int().nonnegative(),

  /** Yearly price in cents (typically discounted). */
  yearlyPriceCents: z.number().int().nonnegative(),

  /** Monthly price in cents if products were purchased individually. */
  individualMonthlyTotalCents: z.number().int().nonnegative(),

  /** Savings percentage compared to individual pricing. */
  savingsPercent: z.number().min(0).max(100),

  /** Currency (ISO 4217). */
  currency: z.string().length(3).default("usd"),

  /** Stripe product ID for this bundle. */
  stripeProductId: z.string().optional(),

  /** Stripe monthly price ID. */
  stripeMonthlyPriceId: z.string().optional(),

  /** Stripe yearly price ID. */
  stripeYearlyPriceId: z.string().optional(),

  /** Maximum number of seats. */
  maxSeats: z.number().int().positive().optional(),

  /** Whether this bundle is currently available for purchase. */
  active: z.boolean().default(true),

  /** Whether this is a featured/highlighted bundle. */
  featured: z.boolean().default(false),

  /** Display order for sorting. */
  displayOrder: z.number().int().nonnegative().default(0),

  /** Badge text (e.g., "Most Popular", "Best Value"). */
  badge: z.string().max(64).optional(),

  /** Features list for marketing display. */
  features: z.array(z.string().max(256)).default([]),

  /** Usage limits included in the bundle. */
  limits: z.record(z.string(), z.number()).optional(),

  /** ISO 8601 timestamp of creation. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last update. */
  updatedAt: z.string().datetime(),
});

export type BundlePricing = z.infer<typeof BundlePricingSchema>;
