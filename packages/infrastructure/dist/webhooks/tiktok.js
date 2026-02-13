"use strict";
/**
 * WH-005: TikTok Webhook Handler
 *
 * Processes incoming TikTok Marketing API and Content Publishing
 * webhook events (ad status changes, content moderation, audience sync).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokWebhookHandler = void 0;
// ── TikTokWebhookHandler ────────────────────────────────────────────────────
class TikTokWebhookHandler {
    constructor() {
        this.handlers = new Map();
        this.globalHandlers = [];
        this.processedIds = new Set();
    }
    /**
     * Register a handler for a specific TikTok event type.
     */
    on(eventType, handler) {
        const existing = this.handlers.get(eventType) ?? [];
        existing.push(handler);
        this.handlers.set(eventType, existing);
    }
    /**
     * Register a global handler that receives all events.
     */
    onAny(handler) {
        this.globalHandlers.push(handler);
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
     * Process an incoming TikTok webhook payload.
     */
    async processWebhook(payload, _signature, _secret) {
        const event = this.parseEvent(payload);
        // Idempotency check
        if (this.processedIds.has(event.eventId)) {
            return {
                eventId: event.eventId,
                eventType: event.eventType,
                handled: true,
                handlerCount: 0,
            };
        }
        this.processedIds.add(event.eventId);
        this.pruneProcessedIds();
        let handlerCount = 0;
        // Type-specific handlers
        const typeHandlers = this.handlers.get(event.eventType) ?? [];
        for (const h of typeHandlers) {
            await h(event);
            handlerCount++;
        }
        // Global handlers
        for (const h of this.globalHandlers) {
            await h(event);
            handlerCount++;
        }
        return {
            eventId: event.eventId,
            eventType: event.eventType,
            handled: handlerCount > 0,
            handlerCount,
        };
    }
    // ── Internal ─────────────────────────────────────────────────────────────
    parseEvent(payload) {
        if (!payload || typeof payload !== 'object') {
            throw new Error('Invalid TikTok webhook payload');
        }
        const p = payload;
        if (!p.event_type && !p.eventType) {
            throw new Error('Missing event type');
        }
        return {
            eventType: (p.event_type ?? p.eventType),
            eventId: (p.event_id ?? p.eventId ?? `tt_${Date.now()}`),
            advertiserId: (p.advertiser_id ?? p.advertiserId ?? ''),
            timestamp: p.timestamp ?? Date.now(),
            data: p.data ?? {},
        };
    }
    pruneProcessedIds() {
        if (this.processedIds.size > 10000) {
            const iter = this.processedIds.values();
            for (let i = 0; i < 1000; i++) {
                const v = iter.next();
                if (v.done)
                    break;
                this.processedIds.delete(v.value);
            }
        }
    }
}
exports.TikTokWebhookHandler = TikTokWebhookHandler;
