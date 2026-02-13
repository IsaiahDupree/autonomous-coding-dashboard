"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BundlePricingSchema = exports.ProductSubscriptionSchema = exports.CancelReasonSchema = exports.SubscriptionStatusSchema = exports.BillingIntervalSchema = exports.SharedStripeCustomerSchema = exports.PaymentMethodSummarySchema = exports.PaymentMethodTypeSchema = exports.PaymentStatusSchema = void 0;
const zod_1 = require("zod");
const product_1 = require("./product");
// ---------------------------------------------------------------------------
// Shared Stripe Customer
// ---------------------------------------------------------------------------
/**
 * Customer payment status.
 */
exports.PaymentStatusSchema = zod_1.z.enum([
    "active",
    "past_due",
    "unpaid",
    "cancelled",
    "incomplete",
    "incomplete_expired",
    "trialing",
    "paused",
]);
/**
 * Payment method type.
 */
exports.PaymentMethodTypeSchema = zod_1.z.enum([
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
/**
 * Stored payment method summary.
 */
exports.PaymentMethodSummarySchema = zod_1.z.object({
    /** Stripe payment method ID. */
    stripePaymentMethodId: zod_1.z.string().min(1),
    /** Payment method type. */
    type: exports.PaymentMethodTypeSchema,
    /** Whether this is the default payment method. */
    isDefault: zod_1.z.boolean().default(false),
    /** Card brand (visa, mastercard, etc.) - for card type. */
    cardBrand: zod_1.z.string().max(32).optional(),
    /** Last 4 digits of the card. */
    cardLast4: zod_1.z.string().length(4).optional(),
    /** Card expiry month (1-12). */
    cardExpMonth: zod_1.z.number().int().min(1).max(12).optional(),
    /** Card expiry year. */
    cardExpYear: zod_1.z.number().int().optional(),
    /** Bank name (for bank account type). */
    bankName: zod_1.z.string().max(256).optional(),
    /** ISO 8601 timestamp of creation. */
    createdAt: zod_1.z.string().datetime(),
});
/**
 * SharedStripeCustomer - The ACD-side representation of a Stripe customer.
 */
exports.SharedStripeCustomerSchema = zod_1.z.object({
    /** Unique ACD identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** Associated ACD user ID. */
    userId: zod_1.z.string().uuid(),
    /** Stripe customer ID (e.g., "cus_..."). */
    stripeCustomerId: zod_1.z.string().min(1),
    /** Customer email on Stripe. */
    email: zod_1.z.string().email(),
    /** Customer name on Stripe. */
    name: zod_1.z.string().max(256).optional(),
    /** Overall payment status. */
    paymentStatus: exports.PaymentStatusSchema.default("active"),
    /** Stored payment methods. */
    paymentMethods: zod_1.z.array(exports.PaymentMethodSummarySchema).default([]),
    /** Default currency (ISO 4217). */
    currency: zod_1.z.string().length(3).default("usd"),
    /** Customer balance in cents (credit or debit). */
    balanceCents: zod_1.z.number().int().default(0),
    /** Tax ID (if provided). */
    taxId: zod_1.z.string().max(64).optional(),
    /** Tax exempt status. */
    taxExempt: zod_1.z.enum(["none", "exempt", "reverse"]).default("none"),
    /** Billing address. */
    billingAddress: zod_1.z
        .object({
        line1: zod_1.z.string().max(256).optional(),
        line2: zod_1.z.string().max(256).optional(),
        city: zod_1.z.string().max(128).optional(),
        state: zod_1.z.string().max(128).optional(),
        postalCode: zod_1.z.string().max(20).optional(),
        country: zod_1.z.string().length(2).optional(),
    })
        .optional(),
    /** Total lifetime spend in cents across all products. */
    lifetimeSpendCents: zod_1.z.number().int().nonnegative().default(0),
    /** Total number of successful payments. */
    totalPayments: zod_1.z.number().int().nonnegative().default(0),
    /** Total number of refunds. */
    totalRefunds: zod_1.z.number().int().nonnegative().default(0),
    /** Total refund amount in cents. */
    totalRefundAmountCents: zod_1.z.number().int().nonnegative().default(0),
    /** Whether the customer has had a failed payment. */
    hasFailedPayment: zod_1.z.boolean().default(false),
    /** Stripe metadata. */
    stripeMetadata: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    /** ISO 8601 timestamp of creation. */
    createdAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last update. */
    updatedAt: zod_1.z.string().datetime(),
});
// ---------------------------------------------------------------------------
// Product Subscription
// ---------------------------------------------------------------------------
/**
 * Subscription billing interval.
 */
exports.BillingIntervalSchema = zod_1.z.enum(["month", "year", "week", "day"]);
/**
 * Subscription status.
 */
exports.SubscriptionStatusSchema = zod_1.z.enum([
    "active",
    "past_due",
    "unpaid",
    "cancelled",
    "incomplete",
    "incomplete_expired",
    "trialing",
    "paused",
]);
/**
 * Subscription cancel reason.
 */
exports.CancelReasonSchema = zod_1.z.enum([
    "customer_request",
    "payment_failure",
    "too_expensive",
    "missing_features",
    "switched_competitor",
    "no_longer_needed",
    "other",
]);
/**
 * ProductSubscription - A subscription to a specific ACD product.
 */
exports.ProductSubscriptionSchema = zod_1.z.object({
    /** Unique ACD identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** ACD user ID. */
    userId: zod_1.z.string().uuid(),
    /** Stripe customer ID. */
    stripeCustomerId: zod_1.z.string().min(1),
    /** Stripe subscription ID (e.g., "sub_..."). */
    stripeSubscriptionId: zod_1.z.string().min(1),
    /** Stripe price ID (e.g., "price_..."). */
    stripePriceId: zod_1.z.string().min(1),
    /** Stripe product ID (e.g., "prod_..."). */
    stripeProductId: zod_1.z.string().min(1),
    /** ACD product this subscription is for. */
    productId: product_1.ProductIdSchema,
    /** Product tier. */
    tier: product_1.ProductTierSchema,
    /** Subscription status. */
    status: exports.SubscriptionStatusSchema.default("active"),
    /** Billing interval. */
    billingInterval: exports.BillingIntervalSchema,
    /** Billing interval count (e.g., 1 = every month, 3 = quarterly). */
    billingIntervalCount: zod_1.z.number().int().positive().default(1),
    /** Unit amount in cents per billing period. */
    unitAmountCents: zod_1.z.number().int().nonnegative(),
    /** Currency (ISO 4217). */
    currency: zod_1.z.string().length(3).default("usd"),
    /** Quantity (for per-seat billing). */
    quantity: zod_1.z.number().int().positive().default(1),
    /** Discount percentage applied (0-100). */
    discountPercent: zod_1.z.number().min(0).max(100).optional(),
    /** Stripe coupon ID if applied. */
    stripeCouponId: zod_1.z.string().optional(),
    /** Whether the subscription cancels at period end. */
    cancelAtPeriodEnd: zod_1.z.boolean().default(false),
    /** Cancel reason (if cancelling/cancelled). */
    cancelReason: exports.CancelReasonSchema.optional(),
    /** Cancel feedback from user. */
    cancelFeedback: zod_1.z.string().max(2048).optional(),
    /** ISO 8601 timestamp of current period start. */
    currentPeriodStart: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of current period end. */
    currentPeriodEnd: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of trial start. */
    trialStart: zod_1.z.string().datetime().optional(),
    /** ISO 8601 timestamp of trial end. */
    trialEnd: zod_1.z.string().datetime().optional(),
    /** ISO 8601 timestamp of cancellation. */
    cancelledAt: zod_1.z.string().datetime().optional(),
    /** ISO 8601 timestamp of when subscription ended. */
    endedAt: zod_1.z.string().datetime().optional(),
    /** Stripe metadata. */
    stripeMetadata: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    /** ISO 8601 timestamp of creation. */
    createdAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last update. */
    updatedAt: zod_1.z.string().datetime(),
});
// ---------------------------------------------------------------------------
// Bundle Pricing
// ---------------------------------------------------------------------------
/**
 * BundlePricing - Pricing configuration for product bundles.
 */
exports.BundlePricingSchema = zod_1.z.object({
    /** Unique bundle identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** Bundle name (e.g., "Creator Pro Bundle", "Enterprise Suite"). */
    name: zod_1.z.string().min(1).max(256),
    /** Bundle description. */
    description: zod_1.z.string().max(2048).optional(),
    /** Slug for URL-friendly identification. */
    slug: zod_1.z.string().min(1).max(128).regex(/^[a-z0-9-]+$/),
    /** Products included in this bundle. */
    includedProducts: zod_1.z.array(zod_1.z.object({
        productId: product_1.ProductIdSchema,
        tier: product_1.ProductTierSchema,
        /** Whether this product is the primary/featured one. */
        featured: zod_1.z.boolean().default(false),
    })).min(2),
    /** Monthly price in cents. */
    monthlyPriceCents: zod_1.z.number().int().nonnegative(),
    /** Yearly price in cents (typically discounted). */
    yearlyPriceCents: zod_1.z.number().int().nonnegative(),
    /** Monthly price in cents if products were purchased individually. */
    individualMonthlyTotalCents: zod_1.z.number().int().nonnegative(),
    /** Savings percentage compared to individual pricing. */
    savingsPercent: zod_1.z.number().min(0).max(100),
    /** Currency (ISO 4217). */
    currency: zod_1.z.string().length(3).default("usd"),
    /** Stripe product ID for this bundle. */
    stripeProductId: zod_1.z.string().optional(),
    /** Stripe monthly price ID. */
    stripeMonthlyPriceId: zod_1.z.string().optional(),
    /** Stripe yearly price ID. */
    stripeYearlyPriceId: zod_1.z.string().optional(),
    /** Maximum number of seats. */
    maxSeats: zod_1.z.number().int().positive().optional(),
    /** Whether this bundle is currently available for purchase. */
    active: zod_1.z.boolean().default(true),
    /** Whether this is a featured/highlighted bundle. */
    featured: zod_1.z.boolean().default(false),
    /** Display order for sorting. */
    displayOrder: zod_1.z.number().int().nonnegative().default(0),
    /** Badge text (e.g., "Most Popular", "Best Value"). */
    badge: zod_1.z.string().max(64).optional(),
    /** Features list for marketing display. */
    features: zod_1.z.array(zod_1.z.string().max(256)).default([]),
    /** Usage limits included in the bundle. */
    limits: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional(),
    /** ISO 8601 timestamp of creation. */
    createdAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last update. */
    updatedAt: zod_1.z.string().datetime(),
});
//# sourceMappingURL=stripe.js.map