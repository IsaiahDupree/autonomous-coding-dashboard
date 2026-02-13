"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateStripeCustomer = getOrCreateStripeCustomer;
exports.linkStripeCustomer = linkStripeCustomer;
exports.createSubscription = createSubscription;
exports.cancelSubscription = cancelSubscription;
exports.getBillingPortalUrl = getBillingPortalUrl;
exports.handleStripeWebhook = handleStripeWebhook;
exports.syncEntitlementFromStripe = syncEntitlementFromStripe;
// ---------------------------------------------------------------------------
// Stripe instance management
// ---------------------------------------------------------------------------
let stripeInstance = null;
/**
 * Get or create the shared Stripe instance.
 *
 * @param secretKey - Stripe secret key. Defaults to `process.env.STRIPE_SECRET_KEY`.
 * @returns Stripe instance
 */
function getStripe(secretKey) {
    if (stripeInstance) {
        return stripeInstance;
    }
    const key = secretKey || process.env.STRIPE_SECRET_KEY;
    if (!key) {
        throw new Error('[acd/auth] STRIPE_SECRET_KEY is not set. Cannot initialize Stripe.');
    }
    try {
        // Dynamic require to avoid hard dependency at bundle time
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Stripe = require('stripe');
        stripeInstance = new Stripe(key, {
            apiVersion: '2024-06-20',
            typescript: true,
        });
        return stripeInstance;
    }
    catch {
        throw new Error('[acd/auth] Failed to initialize Stripe. Ensure the `stripe` package is installed.');
    }
}
// ---------------------------------------------------------------------------
// Customer management
// ---------------------------------------------------------------------------
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
async function getOrCreateStripeCustomer(userId, email) {
    if (!userId || !email) {
        throw new Error('[acd/auth] userId and email are required to get or create a Stripe customer.');
    }
    const stripe = getStripe();
    // Search for existing customer by email
    const existing = await stripe.customers.list({
        email,
        limit: 1,
    });
    if (existing.data.length > 0) {
        return existing.data[0].id;
    }
    // Create new customer
    const customer = await stripe.customers.create({
        email,
        metadata: {
            acd_user_id: userId,
        },
    });
    return customer.id;
}
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
async function linkStripeCustomer(userId, customerId) {
    if (!userId || !customerId) {
        throw new Error('[acd/auth] userId and customerId are required to link a Stripe customer.');
    }
    const stripe = getStripe();
    // Verify customer exists
    try {
        await stripe.customers.retrieve(customerId);
    }
    catch {
        throw new Error(`[acd/auth] Stripe customer ${customerId} not found.`);
    }
    // We use the customers.create-like update method via the Stripe SDK
    // In practice you would use stripe.customers.update, but since we
    // typed loosely, we call through the raw API pattern.
    try {
        const Stripe = require('stripe');
        const stripeRaw = new Stripe(process.env.STRIPE_SECRET_KEY);
        await stripeRaw.customers.update(customerId, {
            metadata: { acd_user_id: userId },
        });
    }
    catch (err) {
        throw new Error(`[acd/auth] Failed to link Stripe customer: ${err instanceof Error ? err.message : String(err)}`);
    }
}
// ---------------------------------------------------------------------------
// Subscription management
// ---------------------------------------------------------------------------
/**
 * Create a new subscription for a customer.
 *
 * @param customerId - Stripe customer ID
 * @param priceId    - Stripe price ID
 * @param metadata   - Optional metadata to attach to the subscription
 * @returns The created subscription
 */
async function createSubscription(customerId, priceId, metadata) {
    if (!customerId || !priceId) {
        throw new Error('[acd/auth] customerId and priceId are required to create a subscription.');
    }
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata: metadata || {},
    });
    return subscription;
}
/**
 * Cancel a subscription at the end of the current billing period.
 *
 * @param subscriptionId - Stripe subscription ID
 * @param immediate      - If `true`, cancel immediately instead of at period end
 * @returns The updated subscription
 */
async function cancelSubscription(subscriptionId, immediate = false) {
    if (!subscriptionId) {
        throw new Error('[acd/auth] subscriptionId is required to cancel a subscription.');
    }
    const stripe = getStripe();
    if (immediate) {
        return stripe.subscriptions.cancel(subscriptionId);
    }
    // Cancel at period end using raw Stripe SDK
    try {
        const Stripe = require('stripe');
        const stripeRaw = new Stripe(process.env.STRIPE_SECRET_KEY);
        return await stripeRaw.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });
    }
    catch (err) {
        throw new Error(`[acd/auth] Failed to cancel subscription: ${err instanceof Error ? err.message : String(err)}`);
    }
}
// ---------------------------------------------------------------------------
// Billing portal
// ---------------------------------------------------------------------------
/**
 * Generate a Stripe Customer Portal URL where the user can manage their
 * billing, update payment methods, and view invoices.
 *
 * @param customerId - Stripe customer ID
 * @param returnUrl  - URL to redirect to after the portal session. Defaults to
 *                     `process.env.APP_URL` or `http://localhost:3000`.
 * @returns The billing portal session URL
 */
async function getBillingPortalUrl(customerId, returnUrl) {
    if (!customerId) {
        throw new Error('[acd/auth] customerId is required to generate a billing portal URL.');
    }
    const stripe = getStripe();
    const url = returnUrl || process.env.APP_URL || 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: url,
    });
    return session.url;
}
// ---------------------------------------------------------------------------
// Webhook handling
// ---------------------------------------------------------------------------
/**
 * Verify and parse a Stripe webhook event.
 *
 * @param payload   - The raw request body (string or Buffer)
 * @param signature - The `Stripe-Signature` header value
 * @param secret    - The webhook signing secret. Defaults to
 *                    `process.env.STRIPE_WEBHOOK_SECRET`.
 * @returns The verified Stripe event
 */
function handleStripeWebhook(payload, signature, secret) {
    const webhookSecret = secret || process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        throw new Error('[acd/auth] STRIPE_WEBHOOK_SECRET is not set. Cannot verify webhook.');
    }
    if (!payload || !signature) {
        throw new Error('[acd/auth] Webhook payload and signature are required.');
    }
    const stripe = getStripe();
    try {
        return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    }
    catch (err) {
        throw new Error(`[acd/auth] Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
// ---------------------------------------------------------------------------
// Entitlement sync
// ---------------------------------------------------------------------------
/** Map Stripe subscription status to ACD entitlement status. */
const STATUS_MAP = {
    active: 'active',
    trialing: 'trial',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'past_due',
    incomplete: 'paused',
    incomplete_expired: 'expired',
    paused: 'paused',
};
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
function syncEntitlementFromStripe(subscription) {
    if (!subscription || !subscription.id) {
        throw new Error('[acd/auth] A valid Stripe subscription is required.');
    }
    const userId = subscription.metadata?.acd_user_id || '';
    const productId = subscription.metadata?.acd_product_id || '';
    if (!userId) {
        throw new Error('[acd/auth] Subscription metadata must contain `acd_user_id` to sync entitlement.');
    }
    const firstItem = subscription.items?.data?.[0];
    const priceId = firstItem?.price?.id || '';
    const status = STATUS_MAP[subscription.status] || 'expired';
    return {
        userId,
        productId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id || '',
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        priceId,
    };
}
//# sourceMappingURL=stripe.js.map