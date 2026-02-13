"use strict";
/**
 * Subscriptions (BILL-005, BILL-006)
 * - BILL-005: Subscription lifecycle (create/upgrade/downgrade/cancel/reactivate, trial management)
 * - BILL-006: Revenue reporting (MRR, ARR, churn rate, LTV calculations)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const types_1 = require("./types");
let subscriptionIdCounter = 0;
class SubscriptionService {
    constructor() {
        this.subscriptions = new Map();
        /** customerId -> latest subscription */
        this.customerSubscriptions = new Map();
        this.planPrices = new Map();
    }
    /** Register plan prices for revenue calculations */
    registerPlanPrice(planId, monthlyPriceCents) {
        this.planPrices.set(planId, monthlyPriceCents);
    }
    /** Create a new subscription */
    createSubscription(input) {
        // Check if customer already has an active subscription
        const existingSubId = this.customerSubscriptions.get(input.customerId);
        if (existingSubId) {
            const existing = this.subscriptions.get(existingSubId);
            if (existing && ['active', 'trialing'].includes(existing.status)) {
                throw new Error(`Customer "${input.customerId}" already has an active subscription`);
            }
        }
        subscriptionIdCounter++;
        const now = Date.now();
        const periodDurationMs = 30 * 24 * 60 * 60 * 1000; // ~30 days
        const hasTrials = input.trialDays && input.trialDays > 0;
        const trialDurationMs = hasTrials ? input.trialDays * 24 * 60 * 60 * 1000 : 0;
        const subscription = types_1.SubscriptionSchema.parse({
            id: `sub_${subscriptionIdCounter}`,
            customerId: input.customerId,
            planId: input.planId,
            status: hasTrials ? 'trialing' : 'active',
            currentPeriodStart: now,
            currentPeriodEnd: now + (hasTrials ? trialDurationMs : periodDurationMs),
            trialStart: hasTrials ? now : undefined,
            trialEnd: hasTrials ? now + trialDurationMs : undefined,
            cancelAtPeriodEnd: false,
            createdAt: now,
            updatedAt: now,
        });
        this.subscriptions.set(subscription.id, subscription);
        this.customerSubscriptions.set(input.customerId, subscription.id);
        return subscription;
    }
    /** Get a subscription by ID */
    getSubscription(subscriptionId) {
        return this.subscriptions.get(subscriptionId);
    }
    /** Get the active subscription for a customer */
    getCustomerSubscription(customerId) {
        const subId = this.customerSubscriptions.get(customerId);
        return subId ? this.subscriptions.get(subId) : undefined;
    }
    /** Get all subscriptions */
    getAllSubscriptions() {
        return Array.from(this.subscriptions.values());
    }
    /** Upgrade a subscription to a new plan */
    upgradePlan(subscriptionId, newPlanId) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription) {
            throw new Error(`Subscription "${subscriptionId}" not found`);
        }
        if (!['active', 'trialing'].includes(subscription.status)) {
            throw new Error(`Cannot upgrade subscription in "${subscription.status}" status`);
        }
        const previousPlanId = subscription.planId;
        const now = Date.now();
        // Calculate proration
        const periodTotal = subscription.currentPeriodEnd - subscription.currentPeriodStart;
        const remaining = subscription.currentPeriodEnd - now;
        const ratio = Math.max(0, remaining / periodTotal);
        const oldPlanPrice = this.planPrices.get(previousPlanId) ?? 0;
        const newPlanPrice = this.planPrices.get(newPlanId) ?? 0;
        const proratedCreditCents = Math.round(oldPlanPrice * ratio);
        const proratedChargeCents = Math.round(newPlanPrice * ratio);
        subscription.planId = newPlanId;
        subscription.updatedAt = now;
        return {
            subscription,
            previousPlanId,
            proratedCreditCents,
            proratedChargeCents,
        };
    }
    /** Downgrade a subscription to a new plan (takes effect at period end) */
    downgradePlan(subscriptionId, newPlanId) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription) {
            throw new Error(`Subscription "${subscriptionId}" not found`);
        }
        if (subscription.status !== 'active') {
            throw new Error(`Cannot downgrade subscription in "${subscription.status}" status`);
        }
        const previousPlanId = subscription.planId;
        // Downgrade takes effect at end of current period
        subscription.planId = newPlanId;
        subscription.updatedAt = Date.now();
        return {
            subscription,
            previousPlanId,
        };
    }
    /** Cancel a subscription */
    cancelSubscription(subscriptionId, options = {}) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription) {
            throw new Error(`Subscription "${subscriptionId}" not found`);
        }
        if (['canceled', 'expired'].includes(subscription.status)) {
            throw new Error(`Subscription is already ${subscription.status}`);
        }
        const now = Date.now();
        subscription.updatedAt = now;
        if (options.immediate) {
            subscription.status = 'canceled';
            subscription.canceledAt = now;
        }
        else {
            subscription.cancelAtPeriodEnd = true;
            subscription.canceledAt = now;
        }
        return subscription;
    }
    /** Reactivate a canceled subscription */
    reactivateSubscription(subscriptionId) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription) {
            throw new Error(`Subscription "${subscriptionId}" not found`);
        }
        if (subscription.status === 'canceled' && subscription.cancelAtPeriodEnd) {
            // Was set to cancel at period end, can be reactivated
            subscription.cancelAtPeriodEnd = false;
            subscription.canceledAt = undefined;
            subscription.status = 'active';
            subscription.updatedAt = Date.now();
            return subscription;
        }
        if (subscription.status === 'canceled' || subscription.status === 'expired') {
            // Create new period
            const now = Date.now();
            const periodDurationMs = 30 * 24 * 60 * 60 * 1000;
            subscription.status = 'active';
            subscription.currentPeriodStart = now;
            subscription.currentPeriodEnd = now + periodDurationMs;
            subscription.canceledAt = undefined;
            subscription.cancelAtPeriodEnd = false;
            subscription.updatedAt = now;
            return subscription;
        }
        throw new Error(`Cannot reactivate subscription in "${subscription.status}" status`);
    }
    /** Convert a trial to an active subscription */
    activateTrial(subscriptionId) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription) {
            throw new Error(`Subscription "${subscriptionId}" not found`);
        }
        if (subscription.status !== 'trialing') {
            throw new Error(`Subscription is not in trial status`);
        }
        const now = Date.now();
        const periodDurationMs = 30 * 24 * 60 * 60 * 1000;
        subscription.status = 'active';
        subscription.currentPeriodStart = now;
        subscription.currentPeriodEnd = now + periodDurationMs;
        subscription.updatedAt = now;
        return subscription;
    }
    /** Pause a subscription */
    pauseSubscription(subscriptionId) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription) {
            throw new Error(`Subscription "${subscriptionId}" not found`);
        }
        if (subscription.status !== 'active') {
            throw new Error(`Can only pause active subscriptions`);
        }
        subscription.status = 'paused';
        subscription.updatedAt = Date.now();
        return subscription;
    }
    /** Resume a paused subscription */
    resumeSubscription(subscriptionId) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription) {
            throw new Error(`Subscription "${subscriptionId}" not found`);
        }
        if (subscription.status !== 'paused') {
            throw new Error(`Can only resume paused subscriptions`);
        }
        subscription.status = 'active';
        subscription.updatedAt = Date.now();
        return subscription;
    }
    // ─── BILL-006: Revenue Reporting ───────────────────────────────────────────
    /** Calculate revenue metrics */
    calculateRevenueMetrics() {
        const allSubs = Array.from(this.subscriptions.values());
        const now = Date.now();
        const activeSubs = allSubs.filter(s => s.status === 'active');
        const trialingSubs = allSubs.filter(s => s.status === 'trialing');
        // MRR: sum of all active subscription monthly prices
        let mrrCents = 0;
        for (const sub of activeSubs) {
            mrrCents += this.planPrices.get(sub.planId) ?? 0;
        }
        // ARR
        const arrCents = mrrCents * 12;
        // Churn rate: canceled in last 30 days / active at start of period
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        const canceledThisPeriod = allSubs.filter(s => s.status === 'canceled' && s.canceledAt && s.canceledAt >= thirtyDaysAgo).length;
        const newThisPeriod = allSubs.filter(s => s.createdAt >= thirtyDaysAgo && s.status !== 'canceled').length;
        const activeAtPeriodStart = activeSubs.length + canceledThisPeriod - newThisPeriod;
        const churnRate = activeAtPeriodStart > 0
            ? canceledThisPeriod / activeAtPeriodStart
            : 0;
        // Average LTV: MRR per customer / churn rate (simplified)
        const avgMrrPerCustomer = activeSubs.length > 0 ? mrrCents / activeSubs.length : 0;
        const avgLtvCents = churnRate > 0
            ? Math.round(avgMrrPerCustomer / churnRate)
            : Math.round(avgMrrPerCustomer * 24); // Default to 24 months if no churn
        return {
            mrrCents,
            arrCents,
            churnRate: Math.max(0, Math.min(1, churnRate)),
            avgLtvCents,
            activeSubscriptions: activeSubs.length,
            trialingSubscriptions: trialingSubs.length,
            canceledThisPeriod,
            newThisPeriod,
            calculatedAt: now,
        };
    }
    /** Get revenue metrics for a specific time period */
    getRevenueTimeSeries(startTime, endTime, intervalMs) {
        const allSubs = Array.from(this.subscriptions.values());
        const series = [];
        for (let t = startTime; t <= endTime; t += intervalMs) {
            const activeAtTime = allSubs.filter(sub => {
                const created = sub.createdAt <= t;
                const notCanceled = !sub.canceledAt || sub.canceledAt > t;
                const notExpired = sub.currentPeriodEnd > t || sub.status !== 'expired';
                return created && notCanceled && notExpired;
            });
            let mrrCents = 0;
            for (const sub of activeAtTime) {
                mrrCents += this.planPrices.get(sub.planId) ?? 0;
            }
            series.push({
                timestamp: t,
                mrrCents,
                activeCount: activeAtTime.length,
            });
        }
        return series;
    }
}
exports.SubscriptionService = SubscriptionService;
//# sourceMappingURL=subscriptions.js.map