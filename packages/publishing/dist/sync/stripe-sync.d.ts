/**
 * SYNC-003: Stripe Subscription Sync
 *
 * Syncs subscription status from Stripe to keep local billing
 * state up to date with payment events and plan changes.
 */
import type { SyncConfig } from '../types';
export interface StripeSubscriptionStatus {
    subscriptionId: string;
    customerId: string;
    status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'paused';
    planId: string;
    planName: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    lastChecked: string;
}
export type StripeSyncCallback = (subscriptions: StripeSubscriptionStatus[]) => void | Promise<void>;
export declare class StripeSubscriptionSync {
    private readonly apiKey;
    private readonly syncConfig;
    private pollingTimer;
    private callbacks;
    private trackedCustomerIds;
    constructor(config: {
        apiKey: string;
        syncConfig?: Partial<SyncConfig>;
    });
    /**
     * Adds a customer to the tracking list.
     */
    trackCustomer(customerId: string): void;
    /**
     * Removes a customer from the tracking list.
     */
    untrackCustomer(customerId: string): void;
    /**
     * Registers a callback to be notified when subscription statuses change.
     */
    onStatusChange(callback: StripeSyncCallback): void;
    /**
     * Starts polling for subscription status changes.
     */
    start(): void;
    /**
     * Stops the polling loop.
     */
    stop(): void;
    /**
     * Performs a single poll to fetch subscription statuses for all tracked customers.
     */
    poll(): Promise<StripeSubscriptionStatus[]>;
    /**
     * Fetches all subscriptions for a specific customer from Stripe.
     */
    private fetchSubscriptions;
    /**
     * Fetches a single subscription by ID directly from Stripe.
     */
    getSubscription(subscriptionId: string): Promise<StripeSubscriptionStatus>;
    /**
     * Returns the current sync configuration.
     */
    getSyncConfig(): SyncConfig;
    /**
     * Returns whether the sync loop is currently running.
     */
    isRunning(): boolean;
    /**
     * Returns all currently tracked customer IDs.
     */
    getTrackedCustomerIds(): string[];
}
//# sourceMappingURL=stripe-sync.d.ts.map