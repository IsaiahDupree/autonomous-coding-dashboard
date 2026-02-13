"use strict";
/**
 * WH-001: Webhook Manager
 *
 * Core webhook infrastructure: registration, dispatching with HMAC-SHA256
 * signatures, delivery tracking, and exponential backoff retry.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookManager = void 0;
const crypto_1 = require("crypto");
// ── Helpers ──────────────────────────────────────────────────────────────────
let deliveryCounter = 0;
function generateId(prefix) {
    return `${prefix}_${Date.now()}_${++deliveryCounter}`;
}
function computeSignature(payload, secret) {
    return (0, crypto_1.createHmac)('sha256', secret).update(payload).digest('hex');
}
// ── Default Transport (no-op / stub for production replacement) ──────────────
class DefaultWebhookTransport {
    async send(_url, _payload, _headers) {
        // In production, this would use fetch/http to POST
        return { statusCode: 200 };
    }
}
// ── WebhookManager ──────────────────────────────────────────────────────────
class WebhookManager {
    constructor(transport) {
        this.webhooks = new Map();
        this.deliveries = new Map();
        this.transport = transport ?? new DefaultWebhookTransport();
    }
    /**
     * Register a new webhook subscription.
     */
    register(url, events, secret, retryPolicy) {
        const id = generateId('wh');
        const config = {
            id,
            url,
            events,
            secret,
            active: true,
            retryPolicy: {
                maxAttempts: retryPolicy?.maxAttempts ?? 3,
                backoffMs: retryPolicy?.backoffMs ?? 1000,
                backoffMultiplier: retryPolicy?.backoffMultiplier ?? 2,
            },
            createdAt: new Date(),
        };
        this.webhooks.set(id, config);
        this.deliveries.set(id, []);
        return config;
    }
    /**
     * Unregister a webhook subscription.
     */
    unregister(id) {
        this.deliveries.delete(id);
        return this.webhooks.delete(id);
    }
    /**
     * Get a webhook by ID.
     */
    getWebhook(id) {
        return this.webhooks.get(id);
    }
    /**
     * List all registered webhooks.
     */
    listWebhooks() {
        return Array.from(this.webhooks.values());
    }
    /**
     * Dispatch an event to all matching webhook subscriptions.
     */
    async dispatch(event, payload) {
        const results = [];
        for (const webhook of this.webhooks.values()) {
            if (!webhook.active)
                continue;
            if (!webhook.events.includes(event) && !webhook.events.includes('*')) {
                continue;
            }
            const result = await this.deliverWithRetry(webhook, event, payload);
            results.push(result);
        }
        return results;
    }
    /**
     * Get delivery history for a webhook.
     */
    getDeliveryHistory(webhookId) {
        return this.deliveries.get(webhookId) ?? [];
    }
    // ── Internal ─────────────────────────────────────────────────────────────
    async deliverWithRetry(webhook, event, payload) {
        const deliveryId = generateId('del');
        const payloadStr = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
        const signature = computeSignature(payloadStr, webhook.secret);
        const headers = {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': `sha256=${signature}`,
            'X-Webhook-Id': webhook.id,
            'X-Webhook-Event': event,
            'X-Delivery-Id': deliveryId,
        };
        const delivery = {
            id: deliveryId,
            webhookId: webhook.id,
            event,
            payload,
            status: 'pending',
            attempts: 0,
        };
        const { maxAttempts, backoffMs, backoffMultiplier } = webhook.retryPolicy;
        let lastError;
        let responseCode;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            delivery.attempts = attempt + 1;
            delivery.lastAttemptAt = new Date();
            try {
                const response = await this.transport.send(webhook.url, payloadStr, headers);
                responseCode = response.statusCode;
                delivery.responseCode = responseCode;
                if (responseCode >= 200 && responseCode < 300) {
                    delivery.status = 'delivered';
                    this.recordDelivery(webhook.id, delivery);
                    return {
                        webhookId: webhook.id,
                        deliveryId,
                        status: 'delivered',
                        responseCode,
                    };
                }
                lastError = `HTTP ${responseCode}`;
            }
            catch (err) {
                lastError = err instanceof Error ? err.message : String(err);
            }
            // Wait before retry (exponential backoff)
            if (attempt < maxAttempts - 1) {
                const delay = backoffMs * Math.pow(backoffMultiplier, attempt);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        // All retries exhausted
        delivery.status = 'failed';
        this.recordDelivery(webhook.id, delivery);
        return {
            webhookId: webhook.id,
            deliveryId,
            status: 'failed',
            responseCode,
            error: lastError,
        };
    }
    recordDelivery(webhookId, delivery) {
        const history = this.deliveries.get(webhookId);
        if (history) {
            history.push(delivery);
            // Keep only last 100 deliveries per webhook
            if (history.length > 100) {
                history.splice(0, history.length - 100);
            }
        }
    }
}
exports.WebhookManager = WebhookManager;
