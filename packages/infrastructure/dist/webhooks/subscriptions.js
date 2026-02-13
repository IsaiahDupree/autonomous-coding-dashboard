"use strict";
/**
 * WH-006: Custom Webhook Subscriptions
 *
 * Allows users to define their own webhook subscriptions
 * for system events (render complete, campaign published, etc.).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomWebhookSubscriptions = exports.SYSTEM_EVENTS = void 0;
const manager_1 = require("./manager");
// ── System Events ────────────────────────────────────────────────────────────
exports.SYSTEM_EVENTS = [
    'render.started',
    'render.completed',
    'render.failed',
    'campaign.created',
    'campaign.published',
    'campaign.paused',
    'content.uploaded',
    'content.processed',
    'content.published',
    'analytics.report_ready',
    'billing.payment_received',
    'billing.payment_failed',
    'user.signed_up',
    'user.plan_changed',
];
// ── CustomWebhookSubscriptions ───────────────────────────────────────────────
class CustomWebhookSubscriptions {
    constructor(webhookManager) {
        this.subscriptions = new Map();
        this.counter = 0;
        this.webhookManager = webhookManager ?? new manager_1.WebhookManager();
    }
    /**
     * Create a new user-defined webhook subscription.
     */
    create(input) {
        // Validate events
        for (const event of input.events) {
            if (!this.isValidEvent(event)) {
                throw new Error(`Invalid event "${event}". Valid events: ${exports.SYSTEM_EVENTS.join(', ')}, or use wildcard "*"`);
            }
        }
        const secret = input.secret ?? this.generateSecret();
        const webhookConfig = this.webhookManager.register(input.url, input.events, secret);
        const id = `sub_${Date.now()}_${++this.counter}`;
        const now = new Date();
        const subscription = {
            id,
            name: input.name,
            webhookId: webhookConfig.id,
            url: input.url,
            events: input.events,
            active: true,
            metadata: input.metadata ?? {},
            createdAt: now,
            updatedAt: now,
        };
        this.subscriptions.set(id, subscription);
        return subscription;
    }
    /**
     * Delete a subscription.
     */
    delete(id) {
        const sub = this.subscriptions.get(id);
        if (!sub)
            return false;
        this.webhookManager.unregister(sub.webhookId);
        return this.subscriptions.delete(id);
    }
    /**
     * Enable or disable a subscription.
     */
    setActive(id, active) {
        const sub = this.subscriptions.get(id);
        if (!sub)
            return null;
        sub.active = active;
        sub.updatedAt = new Date();
        // Also update the underlying webhook config
        const wh = this.webhookManager.getWebhook(sub.webhookId);
        if (wh) {
            wh.active = active;
        }
        return sub;
    }
    /**
     * Update subscription events.
     */
    updateEvents(id, events) {
        const sub = this.subscriptions.get(id);
        if (!sub)
            return null;
        for (const event of events) {
            if (!this.isValidEvent(event)) {
                throw new Error(`Invalid event "${event}"`);
            }
        }
        // Re-register with new events
        const oldWh = this.webhookManager.getWebhook(sub.webhookId);
        if (oldWh) {
            this.webhookManager.unregister(sub.webhookId);
            const newWh = this.webhookManager.register(sub.url, events, oldWh.secret);
            sub.webhookId = newWh.id;
        }
        sub.events = events;
        sub.updatedAt = new Date();
        return sub;
    }
    /**
     * Get a subscription by ID.
     */
    get(id) {
        return this.subscriptions.get(id) ?? null;
    }
    /**
     * List all subscriptions.
     */
    list() {
        return Array.from(this.subscriptions.values());
    }
    /**
     * Get delivery stats for a subscription.
     */
    getStats(id) {
        const sub = this.subscriptions.get(id);
        if (!sub)
            return null;
        const deliveries = this.webhookManager.getDeliveryHistory(sub.webhookId);
        const successful = deliveries.filter((d) => d.status === 'delivered').length;
        const failed = deliveries.filter((d) => d.status === 'failed').length;
        const lastDelivery = deliveries[deliveries.length - 1];
        return {
            totalDeliveries: deliveries.length,
            successfulDeliveries: successful,
            failedDeliveries: failed,
            lastDeliveryAt: lastDelivery?.lastAttemptAt,
        };
    }
    /**
     * Dispatch a system event (triggers all matching subscriptions).
     */
    async dispatch(event, payload) {
        await this.webhookManager.dispatch(event, payload);
    }
    /**
     * Get the underlying webhook manager.
     */
    getWebhookManager() {
        return this.webhookManager;
    }
    // ── Internal ─────────────────────────────────────────────────────────────
    isValidEvent(event) {
        if (event === '*')
            return true;
        return exports.SYSTEM_EVENTS.includes(event);
    }
    generateSecret() {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = 'whsec_';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}
exports.CustomWebhookSubscriptions = CustomWebhookSubscriptions;
