"use strict";
/**
 * SYNC-003: Stripe Subscription Sync
 *
 * Syncs subscription status from Stripe to keep local billing
 * state up to date with payment events and plan changes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeSubscriptionSync = void 0;
const STRIPE_API_BASE = 'https://api.stripe.com/v1';
class StripeSubscriptionSync {
    constructor(config) {
        this.pollingTimer = null;
        this.callbacks = [];
        this.trackedCustomerIds = [];
        this.apiKey = config.apiKey;
        this.syncConfig = {
            provider: 'stripe',
            entityType: 'subscription',
            entityId: 'all',
            syncIntervalMs: config.syncConfig?.syncIntervalMs ?? 120000,
            lastSyncAt: config.syncConfig?.lastSyncAt,
        };
    }
    /**
     * Adds a customer to the tracking list.
     */
    trackCustomer(customerId) {
        if (!this.trackedCustomerIds.includes(customerId)) {
            this.trackedCustomerIds.push(customerId);
        }
    }
    /**
     * Removes a customer from the tracking list.
     */
    untrackCustomer(customerId) {
        this.trackedCustomerIds = this.trackedCustomerIds.filter((id) => id !== customerId);
    }
    /**
     * Registers a callback to be notified when subscription statuses change.
     */
    onStatusChange(callback) {
        this.callbacks.push(callback);
    }
    /**
     * Starts polling for subscription status changes.
     */
    start() {
        if (this.pollingTimer) {
            return;
        }
        void this.poll();
        this.pollingTimer = setInterval(() => {
            void this.poll();
        }, this.syncConfig.syncIntervalMs);
    }
    /**
     * Stops the polling loop.
     */
    stop() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
    }
    /**
     * Performs a single poll to fetch subscription statuses for all tracked customers.
     */
    async poll() {
        const allStatuses = [];
        for (const customerId of this.trackedCustomerIds) {
            try {
                const subscriptions = await this.fetchSubscriptions(customerId);
                allStatuses.push(...subscriptions);
            }
            catch {
                // Continue syncing other customers even if one fails
            }
        }
        // Update last sync time
        this.syncConfig.lastSyncAt = new Date().toISOString();
        // Notify callbacks
        for (const callback of this.callbacks) {
            await callback(allStatuses);
        }
        return allStatuses;
    }
    /**
     * Fetches all subscriptions for a specific customer from Stripe.
     */
    async fetchSubscriptions(customerId) {
        const params = new URLSearchParams({
            customer: customerId,
            limit: '100',
            expand: ['data.plan'].toString(),
        });
        const response = await fetch(`${STRIPE_API_BASE}/subscriptions?${params.toString()}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Stripe subscription fetch failed (${response.status}): ${errorBody}`);
        }
        const data = (await response.json());
        return data.data.map((sub) => ({
            subscriptionId: sub.id,
            customerId: sub.customer,
            status: sub.status,
            planId: sub.plan.id,
            planName: sub.plan.nickname ?? sub.plan.id,
            currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            lastChecked: new Date().toISOString(),
        }));
    }
    /**
     * Fetches a single subscription by ID directly from Stripe.
     */
    async getSubscription(subscriptionId) {
        const response = await fetch(`${STRIPE_API_BASE}/subscriptions/${subscriptionId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Stripe subscription fetch failed (${response.status}): ${errorBody}`);
        }
        const sub = (await response.json());
        return {
            subscriptionId: sub.id,
            customerId: sub.customer,
            status: sub.status,
            planId: sub.plan.id,
            planName: sub.plan.nickname ?? sub.plan.id,
            currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            lastChecked: new Date().toISOString(),
        };
    }
    /**
     * Returns the current sync configuration.
     */
    getSyncConfig() {
        return { ...this.syncConfig };
    }
    /**
     * Returns whether the sync loop is currently running.
     */
    isRunning() {
        return this.pollingTimer !== null;
    }
    /**
     * Returns all currently tracked customer IDs.
     */
    getTrackedCustomerIds() {
        return [...this.trackedCustomerIds];
    }
}
exports.StripeSubscriptionSync = StripeSubscriptionSync;
//# sourceMappingURL=stripe-sync.js.map