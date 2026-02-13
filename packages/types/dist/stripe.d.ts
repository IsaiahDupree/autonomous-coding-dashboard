import { z } from "zod";
/**
 * Customer payment status.
 */
export declare const PaymentStatusSchema: z.ZodEnum<["active", "past_due", "unpaid", "cancelled", "incomplete", "incomplete_expired", "trialing", "paused"]>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
/**
 * Payment method type.
 */
export declare const PaymentMethodTypeSchema: z.ZodEnum<["card", "bank_account", "paypal", "apple_pay", "google_pay", "sepa_debit", "ideal", "klarna", "affirm", "other"]>;
export type PaymentMethodType = z.infer<typeof PaymentMethodTypeSchema>;
/**
 * Stored payment method summary.
 */
export declare const PaymentMethodSummarySchema: z.ZodObject<{
    /** Stripe payment method ID. */
    stripePaymentMethodId: z.ZodString;
    /** Payment method type. */
    type: z.ZodEnum<["card", "bank_account", "paypal", "apple_pay", "google_pay", "sepa_debit", "ideal", "klarna", "affirm", "other"]>;
    /** Whether this is the default payment method. */
    isDefault: z.ZodDefault<z.ZodBoolean>;
    /** Card brand (visa, mastercard, etc.) - for card type. */
    cardBrand: z.ZodOptional<z.ZodString>;
    /** Last 4 digits of the card. */
    cardLast4: z.ZodOptional<z.ZodString>;
    /** Card expiry month (1-12). */
    cardExpMonth: z.ZodOptional<z.ZodNumber>;
    /** Card expiry year. */
    cardExpYear: z.ZodOptional<z.ZodNumber>;
    /** Bank name (for bank account type). */
    bankName: z.ZodOptional<z.ZodString>;
    /** ISO 8601 timestamp of creation. */
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "other" | "card" | "bank_account" | "paypal" | "apple_pay" | "google_pay" | "sepa_debit" | "ideal" | "klarna" | "affirm";
    createdAt: string;
    stripePaymentMethodId: string;
    isDefault: boolean;
    cardBrand?: string | undefined;
    cardLast4?: string | undefined;
    cardExpMonth?: number | undefined;
    cardExpYear?: number | undefined;
    bankName?: string | undefined;
}, {
    type: "other" | "card" | "bank_account" | "paypal" | "apple_pay" | "google_pay" | "sepa_debit" | "ideal" | "klarna" | "affirm";
    createdAt: string;
    stripePaymentMethodId: string;
    isDefault?: boolean | undefined;
    cardBrand?: string | undefined;
    cardLast4?: string | undefined;
    cardExpMonth?: number | undefined;
    cardExpYear?: number | undefined;
    bankName?: string | undefined;
}>;
export type PaymentMethodSummary = z.infer<typeof PaymentMethodSummarySchema>;
/**
 * SharedStripeCustomer - The ACD-side representation of a Stripe customer.
 */
export declare const SharedStripeCustomerSchema: z.ZodObject<{
    /** Unique ACD identifier (UUID v4). */
    id: z.ZodString;
    /** Associated ACD user ID. */
    userId: z.ZodString;
    /** Stripe customer ID (e.g., "cus_..."). */
    stripeCustomerId: z.ZodString;
    /** Customer email on Stripe. */
    email: z.ZodString;
    /** Customer name on Stripe. */
    name: z.ZodOptional<z.ZodString>;
    /** Overall payment status. */
    paymentStatus: z.ZodDefault<z.ZodEnum<["active", "past_due", "unpaid", "cancelled", "incomplete", "incomplete_expired", "trialing", "paused"]>>;
    /** Stored payment methods. */
    paymentMethods: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** Stripe payment method ID. */
        stripePaymentMethodId: z.ZodString;
        /** Payment method type. */
        type: z.ZodEnum<["card", "bank_account", "paypal", "apple_pay", "google_pay", "sepa_debit", "ideal", "klarna", "affirm", "other"]>;
        /** Whether this is the default payment method. */
        isDefault: z.ZodDefault<z.ZodBoolean>;
        /** Card brand (visa, mastercard, etc.) - for card type. */
        cardBrand: z.ZodOptional<z.ZodString>;
        /** Last 4 digits of the card. */
        cardLast4: z.ZodOptional<z.ZodString>;
        /** Card expiry month (1-12). */
        cardExpMonth: z.ZodOptional<z.ZodNumber>;
        /** Card expiry year. */
        cardExpYear: z.ZodOptional<z.ZodNumber>;
        /** Bank name (for bank account type). */
        bankName: z.ZodOptional<z.ZodString>;
        /** ISO 8601 timestamp of creation. */
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "other" | "card" | "bank_account" | "paypal" | "apple_pay" | "google_pay" | "sepa_debit" | "ideal" | "klarna" | "affirm";
        createdAt: string;
        stripePaymentMethodId: string;
        isDefault: boolean;
        cardBrand?: string | undefined;
        cardLast4?: string | undefined;
        cardExpMonth?: number | undefined;
        cardExpYear?: number | undefined;
        bankName?: string | undefined;
    }, {
        type: "other" | "card" | "bank_account" | "paypal" | "apple_pay" | "google_pay" | "sepa_debit" | "ideal" | "klarna" | "affirm";
        createdAt: string;
        stripePaymentMethodId: string;
        isDefault?: boolean | undefined;
        cardBrand?: string | undefined;
        cardLast4?: string | undefined;
        cardExpMonth?: number | undefined;
        cardExpYear?: number | undefined;
        bankName?: string | undefined;
    }>, "many">>;
    /** Default currency (ISO 4217). */
    currency: z.ZodDefault<z.ZodString>;
    /** Customer balance in cents (credit or debit). */
    balanceCents: z.ZodDefault<z.ZodNumber>;
    /** Tax ID (if provided). */
    taxId: z.ZodOptional<z.ZodString>;
    /** Tax exempt status. */
    taxExempt: z.ZodDefault<z.ZodEnum<["none", "exempt", "reverse"]>>;
    /** Billing address. */
    billingAddress: z.ZodOptional<z.ZodObject<{
        line1: z.ZodOptional<z.ZodString>;
        line2: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        postalCode: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        country?: string | undefined;
        city?: string | undefined;
        postalCode?: string | undefined;
        line1?: string | undefined;
        line2?: string | undefined;
        state?: string | undefined;
    }, {
        country?: string | undefined;
        city?: string | undefined;
        postalCode?: string | undefined;
        line1?: string | undefined;
        line2?: string | undefined;
        state?: string | undefined;
    }>>;
    /** Total lifetime spend in cents across all products. */
    lifetimeSpendCents: z.ZodDefault<z.ZodNumber>;
    /** Total number of successful payments. */
    totalPayments: z.ZodDefault<z.ZodNumber>;
    /** Total number of refunds. */
    totalRefunds: z.ZodDefault<z.ZodNumber>;
    /** Total refund amount in cents. */
    totalRefundAmountCents: z.ZodDefault<z.ZodNumber>;
    /** Whether the customer has had a failed payment. */
    hasFailedPayment: z.ZodDefault<z.ZodBoolean>;
    /** Stripe metadata. */
    stripeMetadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /** ISO 8601 timestamp of creation. */
    createdAt: z.ZodString;
    /** ISO 8601 timestamp of last update. */
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    email: string;
    stripeCustomerId: string;
    currency: string;
    paymentStatus: "active" | "cancelled" | "past_due" | "unpaid" | "incomplete" | "incomplete_expired" | "trialing" | "paused";
    paymentMethods: {
        type: "other" | "card" | "bank_account" | "paypal" | "apple_pay" | "google_pay" | "sepa_debit" | "ideal" | "klarna" | "affirm";
        createdAt: string;
        stripePaymentMethodId: string;
        isDefault: boolean;
        cardBrand?: string | undefined;
        cardLast4?: string | undefined;
        cardExpMonth?: number | undefined;
        cardExpYear?: number | undefined;
        bankName?: string | undefined;
    }[];
    balanceCents: number;
    taxExempt: "reverse" | "none" | "exempt";
    lifetimeSpendCents: number;
    totalPayments: number;
    totalRefunds: number;
    totalRefundAmountCents: number;
    hasFailedPayment: boolean;
    name?: string | undefined;
    taxId?: string | undefined;
    billingAddress?: {
        country?: string | undefined;
        city?: string | undefined;
        postalCode?: string | undefined;
        line1?: string | undefined;
        line2?: string | undefined;
        state?: string | undefined;
    } | undefined;
    stripeMetadata?: Record<string, string> | undefined;
}, {
    id: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    email: string;
    stripeCustomerId: string;
    name?: string | undefined;
    currency?: string | undefined;
    paymentStatus?: "active" | "cancelled" | "past_due" | "unpaid" | "incomplete" | "incomplete_expired" | "trialing" | "paused" | undefined;
    paymentMethods?: {
        type: "other" | "card" | "bank_account" | "paypal" | "apple_pay" | "google_pay" | "sepa_debit" | "ideal" | "klarna" | "affirm";
        createdAt: string;
        stripePaymentMethodId: string;
        isDefault?: boolean | undefined;
        cardBrand?: string | undefined;
        cardLast4?: string | undefined;
        cardExpMonth?: number | undefined;
        cardExpYear?: number | undefined;
        bankName?: string | undefined;
    }[] | undefined;
    balanceCents?: number | undefined;
    taxId?: string | undefined;
    taxExempt?: "reverse" | "none" | "exempt" | undefined;
    billingAddress?: {
        country?: string | undefined;
        city?: string | undefined;
        postalCode?: string | undefined;
        line1?: string | undefined;
        line2?: string | undefined;
        state?: string | undefined;
    } | undefined;
    lifetimeSpendCents?: number | undefined;
    totalPayments?: number | undefined;
    totalRefunds?: number | undefined;
    totalRefundAmountCents?: number | undefined;
    hasFailedPayment?: boolean | undefined;
    stripeMetadata?: Record<string, string> | undefined;
}>;
export type SharedStripeCustomer = z.infer<typeof SharedStripeCustomerSchema>;
/**
 * Subscription billing interval.
 */
export declare const BillingIntervalSchema: z.ZodEnum<["month", "year", "week", "day"]>;
export type BillingInterval = z.infer<typeof BillingIntervalSchema>;
/**
 * Subscription status.
 */
export declare const SubscriptionStatusSchema: z.ZodEnum<["active", "past_due", "unpaid", "cancelled", "incomplete", "incomplete_expired", "trialing", "paused"]>;
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;
/**
 * Subscription cancel reason.
 */
export declare const CancelReasonSchema: z.ZodEnum<["customer_request", "payment_failure", "too_expensive", "missing_features", "switched_competitor", "no_longer_needed", "other"]>;
export type CancelReason = z.infer<typeof CancelReasonSchema>;
/**
 * ProductSubscription - A subscription to a specific ACD product.
 */
export declare const ProductSubscriptionSchema: z.ZodObject<{
    /** Unique ACD identifier (UUID v4). */
    id: z.ZodString;
    /** ACD user ID. */
    userId: z.ZodString;
    /** Stripe customer ID. */
    stripeCustomerId: z.ZodString;
    /** Stripe subscription ID (e.g., "sub_..."). */
    stripeSubscriptionId: z.ZodString;
    /** Stripe price ID (e.g., "price_..."). */
    stripePriceId: z.ZodString;
    /** Stripe product ID (e.g., "prod_..."). */
    stripeProductId: z.ZodString;
    /** ACD product this subscription is for. */
    productId: z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>;
    /** Product tier. */
    tier: z.ZodEnum<["free", "starter", "pro", "enterprise"]>;
    /** Subscription status. */
    status: z.ZodDefault<z.ZodEnum<["active", "past_due", "unpaid", "cancelled", "incomplete", "incomplete_expired", "trialing", "paused"]>>;
    /** Billing interval. */
    billingInterval: z.ZodEnum<["month", "year", "week", "day"]>;
    /** Billing interval count (e.g., 1 = every month, 3 = quarterly). */
    billingIntervalCount: z.ZodDefault<z.ZodNumber>;
    /** Unit amount in cents per billing period. */
    unitAmountCents: z.ZodNumber;
    /** Currency (ISO 4217). */
    currency: z.ZodDefault<z.ZodString>;
    /** Quantity (for per-seat billing). */
    quantity: z.ZodDefault<z.ZodNumber>;
    /** Discount percentage applied (0-100). */
    discountPercent: z.ZodOptional<z.ZodNumber>;
    /** Stripe coupon ID if applied. */
    stripeCouponId: z.ZodOptional<z.ZodString>;
    /** Whether the subscription cancels at period end. */
    cancelAtPeriodEnd: z.ZodDefault<z.ZodBoolean>;
    /** Cancel reason (if cancelling/cancelled). */
    cancelReason: z.ZodOptional<z.ZodEnum<["customer_request", "payment_failure", "too_expensive", "missing_features", "switched_competitor", "no_longer_needed", "other"]>>;
    /** Cancel feedback from user. */
    cancelFeedback: z.ZodOptional<z.ZodString>;
    /** ISO 8601 timestamp of current period start. */
    currentPeriodStart: z.ZodString;
    /** ISO 8601 timestamp of current period end. */
    currentPeriodEnd: z.ZodString;
    /** ISO 8601 timestamp of trial start. */
    trialStart: z.ZodOptional<z.ZodString>;
    /** ISO 8601 timestamp of trial end. */
    trialEnd: z.ZodOptional<z.ZodString>;
    /** ISO 8601 timestamp of cancellation. */
    cancelledAt: z.ZodOptional<z.ZodString>;
    /** ISO 8601 timestamp of when subscription ended. */
    endedAt: z.ZodOptional<z.ZodString>;
    /** Stripe metadata. */
    stripeMetadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /** ISO 8601 timestamp of creation. */
    createdAt: z.ZodString;
    /** ISO 8601 timestamp of last update. */
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "active" | "cancelled" | "past_due" | "unpaid" | "incomplete" | "incomplete_expired" | "trialing" | "paused";
    id: string;
    userId: string;
    productId: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach";
    createdAt: string;
    updatedAt: string;
    stripeCustomerId: string;
    currency: string;
    quantity: number;
    tier: "free" | "starter" | "pro" | "enterprise";
    stripeSubscriptionId: string;
    stripePriceId: string;
    stripeProductId: string;
    billingInterval: "month" | "year" | "week" | "day";
    billingIntervalCount: number;
    unitAmountCents: number;
    cancelAtPeriodEnd: boolean;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    stripeMetadata?: Record<string, string> | undefined;
    discountPercent?: number | undefined;
    stripeCouponId?: string | undefined;
    cancelReason?: "other" | "customer_request" | "payment_failure" | "too_expensive" | "missing_features" | "switched_competitor" | "no_longer_needed" | undefined;
    cancelFeedback?: string | undefined;
    trialStart?: string | undefined;
    trialEnd?: string | undefined;
    cancelledAt?: string | undefined;
    endedAt?: string | undefined;
}, {
    id: string;
    userId: string;
    productId: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach";
    createdAt: string;
    updatedAt: string;
    stripeCustomerId: string;
    tier: "free" | "starter" | "pro" | "enterprise";
    stripeSubscriptionId: string;
    stripePriceId: string;
    stripeProductId: string;
    billingInterval: "month" | "year" | "week" | "day";
    unitAmountCents: number;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    status?: "active" | "cancelled" | "past_due" | "unpaid" | "incomplete" | "incomplete_expired" | "trialing" | "paused" | undefined;
    currency?: string | undefined;
    quantity?: number | undefined;
    stripeMetadata?: Record<string, string> | undefined;
    billingIntervalCount?: number | undefined;
    discountPercent?: number | undefined;
    stripeCouponId?: string | undefined;
    cancelAtPeriodEnd?: boolean | undefined;
    cancelReason?: "other" | "customer_request" | "payment_failure" | "too_expensive" | "missing_features" | "switched_competitor" | "no_longer_needed" | undefined;
    cancelFeedback?: string | undefined;
    trialStart?: string | undefined;
    trialEnd?: string | undefined;
    cancelledAt?: string | undefined;
    endedAt?: string | undefined;
}>;
export type ProductSubscription = z.infer<typeof ProductSubscriptionSchema>;
/**
 * BundlePricing - Pricing configuration for product bundles.
 */
export declare const BundlePricingSchema: z.ZodObject<{
    /** Unique bundle identifier (UUID v4). */
    id: z.ZodString;
    /** Bundle name (e.g., "Creator Pro Bundle", "Enterprise Suite"). */
    name: z.ZodString;
    /** Bundle description. */
    description: z.ZodOptional<z.ZodString>;
    /** Slug for URL-friendly identification. */
    slug: z.ZodString;
    /** Products included in this bundle. */
    includedProducts: z.ZodArray<z.ZodObject<{
        productId: z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>;
        tier: z.ZodEnum<["free", "starter", "pro", "enterprise"]>;
        /** Whether this product is the primary/featured one. */
        featured: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        productId: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach";
        tier: "free" | "starter" | "pro" | "enterprise";
        featured: boolean;
    }, {
        productId: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach";
        tier: "free" | "starter" | "pro" | "enterprise";
        featured?: boolean | undefined;
    }>, "many">;
    /** Monthly price in cents. */
    monthlyPriceCents: z.ZodNumber;
    /** Yearly price in cents (typically discounted). */
    yearlyPriceCents: z.ZodNumber;
    /** Monthly price in cents if products were purchased individually. */
    individualMonthlyTotalCents: z.ZodNumber;
    /** Savings percentage compared to individual pricing. */
    savingsPercent: z.ZodNumber;
    /** Currency (ISO 4217). */
    currency: z.ZodDefault<z.ZodString>;
    /** Stripe product ID for this bundle. */
    stripeProductId: z.ZodOptional<z.ZodString>;
    /** Stripe monthly price ID. */
    stripeMonthlyPriceId: z.ZodOptional<z.ZodString>;
    /** Stripe yearly price ID. */
    stripeYearlyPriceId: z.ZodOptional<z.ZodString>;
    /** Maximum number of seats. */
    maxSeats: z.ZodOptional<z.ZodNumber>;
    /** Whether this bundle is currently available for purchase. */
    active: z.ZodDefault<z.ZodBoolean>;
    /** Whether this is a featured/highlighted bundle. */
    featured: z.ZodDefault<z.ZodBoolean>;
    /** Display order for sorting. */
    displayOrder: z.ZodDefault<z.ZodNumber>;
    /** Badge text (e.g., "Most Popular", "Best Value"). */
    badge: z.ZodOptional<z.ZodString>;
    /** Features list for marketing display. */
    features: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Usage limits included in the bundle. */
    limits: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    /** ISO 8601 timestamp of creation. */
    createdAt: z.ZodString;
    /** ISO 8601 timestamp of last update. */
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    active: boolean;
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    currency: string;
    slug: string;
    featured: boolean;
    includedProducts: {
        productId: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach";
        tier: "free" | "starter" | "pro" | "enterprise";
        featured: boolean;
    }[];
    monthlyPriceCents: number;
    yearlyPriceCents: number;
    individualMonthlyTotalCents: number;
    savingsPercent: number;
    displayOrder: number;
    features: string[];
    description?: string | undefined;
    stripeProductId?: string | undefined;
    stripeMonthlyPriceId?: string | undefined;
    stripeYearlyPriceId?: string | undefined;
    maxSeats?: number | undefined;
    badge?: string | undefined;
    limits?: Record<string, number> | undefined;
}, {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    slug: string;
    includedProducts: {
        productId: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach";
        tier: "free" | "starter" | "pro" | "enterprise";
        featured?: boolean | undefined;
    }[];
    monthlyPriceCents: number;
    yearlyPriceCents: number;
    individualMonthlyTotalCents: number;
    savingsPercent: number;
    active?: boolean | undefined;
    description?: string | undefined;
    currency?: string | undefined;
    stripeProductId?: string | undefined;
    featured?: boolean | undefined;
    stripeMonthlyPriceId?: string | undefined;
    stripeYearlyPriceId?: string | undefined;
    maxSeats?: number | undefined;
    displayOrder?: number | undefined;
    badge?: string | undefined;
    features?: string[] | undefined;
    limits?: Record<string, number> | undefined;
}>;
export type BundlePricing = z.infer<typeof BundlePricingSchema>;
//# sourceMappingURL=stripe.d.ts.map