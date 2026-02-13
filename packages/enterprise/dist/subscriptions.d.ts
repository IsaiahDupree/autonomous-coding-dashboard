/**
 * Subscriptions (BILL-005, BILL-006)
 * - BILL-005: Subscription lifecycle (create/upgrade/downgrade/cancel/reactivate, trial management)
 * - BILL-006: Revenue reporting (MRR, ARR, churn rate, LTV calculations)
 */
import { RevenueMetrics, Subscription } from './types';
export interface CreateSubscriptionInput {
    customerId: string;
    planId: string;
    trialDays?: number;
}
export interface SubscriptionChangeResult {
    subscription: Subscription;
    previousPlanId?: string;
    proratedCreditCents?: number;
    proratedChargeCents?: number;
}
export declare class SubscriptionService {
    private subscriptions;
    /** customerId -> latest subscription */
    private customerSubscriptions;
    private planPrices;
    /** Register plan prices for revenue calculations */
    registerPlanPrice(planId: string, monthlyPriceCents: number): void;
    /** Create a new subscription */
    createSubscription(input: CreateSubscriptionInput): Subscription;
    /** Get a subscription by ID */
    getSubscription(subscriptionId: string): Subscription | undefined;
    /** Get the active subscription for a customer */
    getCustomerSubscription(customerId: string): Subscription | undefined;
    /** Get all subscriptions */
    getAllSubscriptions(): Subscription[];
    /** Upgrade a subscription to a new plan */
    upgradePlan(subscriptionId: string, newPlanId: string): SubscriptionChangeResult;
    /** Downgrade a subscription to a new plan (takes effect at period end) */
    downgradePlan(subscriptionId: string, newPlanId: string): SubscriptionChangeResult;
    /** Cancel a subscription */
    cancelSubscription(subscriptionId: string, options?: {
        immediate?: boolean;
    }): Subscription;
    /** Reactivate a canceled subscription */
    reactivateSubscription(subscriptionId: string): Subscription;
    /** Convert a trial to an active subscription */
    activateTrial(subscriptionId: string): Subscription;
    /** Pause a subscription */
    pauseSubscription(subscriptionId: string): Subscription;
    /** Resume a paused subscription */
    resumeSubscription(subscriptionId: string): Subscription;
    /** Calculate revenue metrics */
    calculateRevenueMetrics(): RevenueMetrics;
    /** Get revenue metrics for a specific time period */
    getRevenueTimeSeries(startTime: number, endTime: number, intervalMs: number): Array<{
        timestamp: number;
        mrrCents: number;
        activeCount: number;
    }>;
}
//# sourceMappingURL=subscriptions.d.ts.map