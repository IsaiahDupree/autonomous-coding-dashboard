"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsTracker = void 0;
const crypto_1 = require("crypto");
const types_1 = require("./types");
// ---------------------------------------------------------------------------
// AnalyticsTracker
// ---------------------------------------------------------------------------
class AnalyticsTracker {
    constructor(transport, options) {
        this.middlewares = [];
        this.transport = transport;
        this.product = options.product;
        this.defaultContext = options.defaultContext ?? {};
        this.debug = options.debug ?? false;
    }
    // ---- public API ----------------------------------------------------------
    /**
     * Register a middleware that can inspect / transform events before they
     * reach the transport layer.
     */
    use(middleware) {
        this.middlewares.push(middleware);
        return this;
    }
    /**
     * Track an arbitrary event.
     */
    async track(event, properties = {}, options = {}) {
        const mergedContext = this.mergeContext(options.context);
        const raw = {
            event,
            properties,
            context: mergedContext,
            userId: options.userId,
            anonymousId: options.anonymousId,
            product: this.product,
            timestamp: new Date().toISOString(),
        };
        // Validate against the input schema
        types_1.TrackEventInputSchema.parse(raw);
        const analyticsEvent = {
            ...raw,
            messageId: (0, crypto_1.randomUUID)(),
        };
        // Validate the enriched event
        types_1.AnalyticsEventSchema.parse(analyticsEvent);
        await this.runMiddlewareAndSend(analyticsEvent);
    }
    /**
     * Identify a user with optional traits.
     */
    async identify(userId, traits = {}) {
        const identifyEvent = {
            event: '$identify',
            properties: { userId, traits },
            product: this.product,
            timestamp: new Date().toISOString(),
            messageId: (0, crypto_1.randomUUID)(),
            userId,
        };
        types_1.AnalyticsEventSchema.parse(identifyEvent);
        await this.runMiddlewareAndSend(identifyEvent);
    }
    /**
     * Convenience method for page view tracking.
     */
    async page(name, properties = {}) {
        await this.track('page_view', { ...properties, name });
    }
    /**
     * Track group / organisation membership.
     */
    async group(groupId, traits = {}) {
        const groupEvent = {
            event: '$group',
            properties: { groupId, traits },
            product: this.product,
            timestamp: new Date().toISOString(),
            messageId: (0, crypto_1.randomUUID)(),
        };
        types_1.AnalyticsEventSchema.parse(groupEvent);
        await this.runMiddlewareAndSend(groupEvent);
    }
    /**
     * Flush any pending events in the transport.
     */
    async flush() {
        await this.transport.flush();
    }
    /**
     * Flush remaining events and release resources.
     */
    async shutdown() {
        await this.transport.flush();
    }
    // ---- internals -----------------------------------------------------------
    mergeContext(perCall) {
        return {
            ...this.defaultContext,
            ...perCall,
            page: {
                ...this.defaultContext.page,
                ...perCall?.page,
            },
            device: {
                ...this.defaultContext.device,
                ...perCall?.device,
            },
            campaign: {
                ...this.defaultContext.campaign,
                ...perCall?.campaign,
            },
        };
    }
    async runMiddlewareAndSend(event) {
        if (this.middlewares.length === 0) {
            if (this.debug) {
                // eslint-disable-next-line no-console
                console.log('[analytics]', JSON.stringify(event, null, 2));
            }
            await this.transport.send(event);
            return;
        }
        // Build a middleware chain where each middleware calls `next` to pass to
        // the subsequent one, with the transport.send as the terminal handler.
        let index = 0;
        const next = (evt) => {
            index++;
            if (index < this.middlewares.length) {
                this.middlewares[index](evt, next);
            }
            else {
                if (this.debug) {
                    // eslint-disable-next-line no-console
                    console.log('[analytics]', JSON.stringify(evt, null, 2));
                }
                // Fire-and-forget inside the sync middleware chain -- the outer
                // promise returned by `runMiddlewareAndSend` will resolve after
                // the initial middleware invocation. Users who need guarantees
                // should call `flush()`.
                void this.transport.send(evt);
            }
        };
        this.middlewares[0](event, next);
    }
}
exports.AnalyticsTracker = AnalyticsTracker;
//# sourceMappingURL=tracker.js.map