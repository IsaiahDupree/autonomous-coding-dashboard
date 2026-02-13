/**
 * Shared Stripe Customer Management
 * ==================================
 *
 * Provides shared Stripe operations for customer creation, subscription
 * management, billing portal, webhook handling, and entitlement syncing
 * across all ACD products.
 *
 * Stripe is a peer dependency -- consumers must install `stripe` themselves.
 * This module lazy-loads the Stripe instance so that it only fails at
 * call time if Stripe is not configured, not at import time.
 */
/** Simplified subscription shape. */
export interface StripeSubscription {
    id: string;
    customer: string;
    status: string;
    items: {
        data: Array<{
            id: string;
            price: {
                id: string;
                product: string;
                unit_amount?: number | null;
                recurring?: {
                    interval: string;
                } | null;
            };
        }>;
    };
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
    metadata?: Record<string, string>;
}
/** Simplified Stripe event shape. */
export interface StripeEvent {
    id: string;
    type: string;
    data: {
        object: Record<string, unknown>;
    };
    created: number;
}
/** Entitlement record synced from a Stripe subscription. */
export interface SyncedEntitlement {
    userId: string;
    productId: string;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    status: 'active' | 'expired' | 'cancelled' | 'trial' | 'past_due' | 'paused';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    priceId: string;
}
/**
 * Get an existing Stripe customer for a user, or create one if none exists.
 *
 * Looks up customers by email. If a customer already exists, returns the
 * existing customer ID. Otherwise, creates a new customer with the given
 * email and user ID in metadata.
 *
 * @param userId - Internal ACD user ID
 * @param email  - User email address
 * @returns Stripe customer ID
 */
export declare function getOrCreateStripeCustomer(userId: string, email: string): Promise<string>;
/**
 * Link an existing Stripe customer ID to an ACD user.
 *
 * Updates the Stripe customer's metadata to include the ACD user ID.
 * This is useful when a customer was created externally (e.g. via Stripe
 * Checkout) and needs to be associated with an ACD user.
 *
 * @param userId     - Internal ACD user ID
 * @param customerId - Stripe customer ID
 */
export declare function linkStripeCustomer(userId: string, customerId: string): Promise<void>;
/**
 * Create a new subscription for a customer.
 *
 * @param customerId - Stripe customer ID
 * @param priceId    - Stripe price ID
 * @param metadata   - Optional metadata to attach to the subscription
 * @returns The created subscription
 */
export declare function createSubscription(customerId: string, priceId: string, metadata?: Record<string, string>): Promise<StripeSubscription>;
/**
 * Cancel a subscription at the end of the current billing period.
 *
 * @param subscriptionId - Stripe subscription ID
 * @param immediate      - If `true`, cancel immediately instead of at period end
 * @returns The updated subscription
 */
export declare function cancelSubscription(subscriptionId: string, immediate?: boolean): Promise<StripeSubscription>;
/**
 * Generate a Stripe Customer Portal URL where the user can manage their
 * billing, update payment methods, and view invoices.
 *
 * @param customerId - Stripe customer ID
 * @param returnUrl  - URL to redirect to after the portal session. Defaults to
 *                     `process.env.APP_URL` or `http://localhost:3000`.
 * @returns The billing portal session URL
 */
export declare function getBillingPortalUrl(customerId: string, returnUrl?: string): Promise<string>;
/**
 * Verify and parse a Stripe webhook event.
 *
 * @param payload   - The raw request body (string or Buffer)
 * @param signature - The `Stripe-Signature` header value
 * @param secret    - The webhook signing secret. Defaults to
 *                    `process.env.STRIPE_WEBHOOK_SECRET`.
 * @returns The verified Stripe event
 */
export declare function handleStripeWebhook(payload: string | Buffer, signature: string, secret?: string): StripeEvent;
/**
 * Derive an ACD entitlement record from a Stripe subscription.
 *
 * This function does **not** write to a database -- it returns a normalized
 * `SyncedEntitlement` object that the caller can persist in their own
 * data store (shared `entitlements` table, etc.).
 *
 * @param subscription - The Stripe subscription object
 * @returns A `SyncedEntitlement` ready for persistence
 */
export declare function syncEntitlementFromStripe(subscription: StripeSubscription): SyncedEntitlement;
//# sourceMappingURL=stripe.d.ts.map