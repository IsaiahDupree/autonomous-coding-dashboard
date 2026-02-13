"use strict";
/**
 * WH-004: Meta Webhook Hub
 *
 * Routes incoming Meta (Facebook/Instagram) webhook events
 * to the appropriate handlers for ads, pages, and Instagram.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaWebhookHub = void 0;
// ── MetaWebhookHub ──────────────────────────────────────────────────────────
class MetaWebhookHub {
    constructor(verifyToken) {
        this.objectHandlers = new Map();
        this.verifyToken = verifyToken;
    }
    /**
     * Handle Meta's webhook verification challenge (GET request).
     */
    handleVerification(params) {
        if (params['hub.mode'] === 'subscribe' &&
            params['hub.verify_token'] === this.verifyToken) {
            return { statusCode: 200, body: params['hub.challenge'] ?? '' };
        }
        return { statusCode: 403, body: 'Forbidden' };
    }
    /**
     * Register a handler for a specific object type and field.
     */
    on(objectType, field, handler) {
        if (!this.objectHandlers.has(objectType)) {
            this.objectHandlers.set(objectType, new Map());
        }
        const fieldMap = this.objectHandlers.get(objectType);
        const existing = fieldMap.get(field) ?? [];
        existing.push(handler);
        fieldMap.set(field, existing);
    }
    /**
     * Process an incoming Meta webhook payload.
     */
    async processWebhook(payload) {
        const parsed = this.parsePayload(payload);
        let handlersInvoked = 0;
        const fieldMap = this.objectHandlers.get(parsed.object);
        for (const entry of parsed.entry) {
            if (!entry.changes)
                continue;
            for (const change of entry.changes) {
                if (!fieldMap)
                    continue;
                // Exact field match
                const handlers = fieldMap.get(change.field) ?? [];
                // Wildcard handlers
                const wildcardHandlers = fieldMap.get('*') ?? [];
                for (const h of [...handlers, ...wildcardHandlers]) {
                    await h(entry.id, change.field, change.value);
                    handlersInvoked++;
                }
            }
        }
        return {
            object: parsed.object,
            entriesProcessed: parsed.entry.length,
            handlersInvoked,
        };
    }
    // ── Internal ─────────────────────────────────────────────────────────────
    parsePayload(payload) {
        if (!payload || typeof payload !== 'object') {
            throw new Error('Invalid Meta webhook payload');
        }
        const p = payload;
        if (!p.object || typeof p.object !== 'string') {
            throw new Error('Missing webhook object type');
        }
        if (!Array.isArray(p.entry)) {
            throw new Error('Missing webhook entry array');
        }
        return {
            object: p.object,
            entry: p.entry,
        };
    }
}
exports.MetaWebhookHub = MetaWebhookHub;
