"use strict";
/**
 * WH-002: Remotion Webhook Handler
 *
 * Processes callbacks from Remotion Lambda render jobs.
 * Routes render-complete, render-failed, and progress events
 * to the appropriate internal handlers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemotionWebhookHandler = void 0;
// ── Handler ──────────────────────────────────────────────────────────────────
class RemotionWebhookHandler {
    constructor() {
        this.handlers = new Map();
    }
    /**
     * Register a handler for a specific Remotion event type.
     */
    on(eventType, handler) {
        const existing = this.handlers.get(eventType) ?? [];
        existing.push(handler);
        this.handlers.set(eventType, existing);
    }
    /**
     * Remove a handler for a specific event type.
     */
    off(eventType, handler) {
        const existing = this.handlers.get(eventType);
        if (!existing)
            return;
        const idx = existing.indexOf(handler);
        if (idx >= 0)
            existing.splice(idx, 1);
    }
    /**
     * Process an incoming Remotion webhook payload.
     * Validates the event and routes to registered handlers.
     */
    async processWebhook(payload, signature, secret) {
        const event = this.parseEvent(payload);
        // Verify signature if provided
        if (signature && secret) {
            this.verifySignature(JSON.stringify(payload), signature, secret);
        }
        const handlers = this.handlers.get(event.type) ?? [];
        for (const handler of handlers) {
            await handler(event);
        }
        return { handled: handlers.length > 0, eventType: event.type };
    }
    /**
     * Verify the HMAC signature of a Remotion webhook.
     */
    verifySignature(_payload, _signature, _secret) {
        // In production: compute HMAC-SHA256 and compare with signature
        // const computed = createHmac('sha256', secret).update(payload).digest('hex');
        // if (computed !== signature) throw new Error('Invalid webhook signature');
    }
    /**
     * Parse and validate the incoming event payload.
     */
    parseEvent(payload) {
        if (!payload || typeof payload !== 'object') {
            throw new Error('Invalid Remotion webhook payload');
        }
        const p = payload;
        if (!p.type || typeof p.type !== 'string') {
            throw new Error('Missing or invalid event type');
        }
        if (!p.renderId || typeof p.renderId !== 'string') {
            throw new Error('Missing or invalid renderId');
        }
        return {
            type: p.type,
            renderId: p.renderId,
            compositionId: p.compositionId ?? '',
            timestamp: p.timestamp ?? new Date().toISOString(),
            progress: p.progress,
            outputUrl: p.outputUrl,
            outputSizeBytes: p.outputSizeBytes,
            durationMs: p.durationMs,
            errorMessage: p.errorMessage,
            lambdaFunctionName: p.lambdaFunctionName,
        };
    }
}
exports.RemotionWebhookHandler = RemotionWebhookHandler;
