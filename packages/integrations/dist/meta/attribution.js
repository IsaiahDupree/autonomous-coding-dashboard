"use strict";
/**
 * CrossProductAttributionService (MH-005, GAP-002)
 *
 * Multi-touch attribution across ACD products. Tracks user touchpoints
 * across different products and calculates attribution weights using
 * first-touch, last-touch, and linear models.
 *
 * Includes in-memory touchpoint store with pluggable persistence.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossProductAttributionService = void 0;
const crypto_1 = require("crypto");
// ---------------------------------------------------------------------------
// In-memory store (default)
// ---------------------------------------------------------------------------
class InMemoryTouchpointStore {
    constructor() {
        this.store = new Map();
    }
    async save(touchpoint) {
        const existing = this.store.get(touchpoint.userId) ?? [];
        existing.push(touchpoint);
        this.store.set(touchpoint.userId, existing);
    }
    async getByUserId(userId) {
        return this.store.get(userId) ?? [];
    }
    async clear(userId) {
        this.store.delete(userId);
    }
}
// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
/**
 * CrossProductAttributionService tracks user touchpoints across products
 * and provides multi-touch attribution for conversion events.
 */
class CrossProductAttributionService {
    constructor(config, store) {
        this.products = config.products;
        this.pixelId = config.pixelId;
        this.eventStoreUrl = config.eventStoreUrl;
        this.touchpointStore = store ?? new InMemoryTouchpointStore();
    }
    // -------------------------------------------------------------------------
    // Touchpoint tracking
    // -------------------------------------------------------------------------
    /**
     * Record a user touchpoint for a product interaction.
     */
    async trackTouchpoint(userId, product, eventType, metadata) {
        if (!this.products.includes(product)) {
            throw new Error(`Product "${product}" is not registered for attribution. ` +
                `Registered products: ${this.products.join(", ")}`);
        }
        const touchpoint = {
            id: (0, crypto_1.randomUUID)(),
            userId,
            product,
            eventType,
            timestamp: new Date().toISOString(),
            metadata,
        };
        await this.touchpointStore.save(touchpoint);
        return touchpoint;
    }
    // -------------------------------------------------------------------------
    // Attribution calculation
    // -------------------------------------------------------------------------
    /**
     * Get multi-touch attribution for a user's conversion event.
     * Returns first-touch, last-touch, and linear attribution models.
     */
    async getAttribution(userId, conversionEvent) {
        const touchpoints = await this.touchpointStore.getByUserId(userId);
        if (touchpoints.length === 0) {
            return {
                userId,
                conversionEvent,
                models: {
                    first_touch: [],
                    last_touch: [],
                    linear: [],
                },
            };
        }
        // Sort touchpoints chronologically
        const sorted = [...touchpoints].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return {
            userId,
            conversionEvent,
            models: {
                first_touch: this.attributeConversion(conversionEvent, sorted, "first_touch"),
                last_touch: this.attributeConversion(conversionEvent, sorted, "last_touch"),
                linear: this.attributeConversion(conversionEvent, sorted, "linear"),
            },
        };
    }
    /**
     * Get the full cross-product user journey (all touchpoints in order).
     */
    async getJourney(userId) {
        const touchpoints = await this.touchpointStore.getByUserId(userId);
        return [...touchpoints].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    /**
     * Calculate attribution weights for a set of touchpoints.
     */
    attributeConversion(_conversionEvent, touchpoints, model) {
        if (touchpoints.length === 0) {
            return [];
        }
        switch (model) {
            case "first_touch":
                return [
                    {
                        touchpointId: touchpoints[0].id,
                        product: touchpoints[0].product,
                        eventType: touchpoints[0].eventType,
                        weight: 1.0,
                    },
                ];
            case "last_touch":
                return [
                    {
                        touchpointId: touchpoints[touchpoints.length - 1].id,
                        product: touchpoints[touchpoints.length - 1].product,
                        eventType: touchpoints[touchpoints.length - 1].eventType,
                        weight: 1.0,
                    },
                ];
            case "linear": {
                const weight = 1.0 / touchpoints.length;
                return touchpoints.map((tp) => ({
                    touchpointId: tp.id,
                    product: tp.product,
                    eventType: tp.eventType,
                    weight,
                }));
            }
        }
    }
    // -------------------------------------------------------------------------
    // Sync to Meta CAPI
    // -------------------------------------------------------------------------
    /**
     * Send attributed conversions to Meta CAPI.
     * Maps attribution weights to CAPI events with product metadata.
     */
    async syncToMeta(attributionData, capiService, userData) {
        // Use the first-touch model for Meta attribution (most common for acquisition)
        const weights = attributionData.models.first_touch;
        if (weights.length === 0) {
            return { eventsReceived: 0, messages: ["No touchpoints to sync"] };
        }
        const events = weights.map((w) => ({
            eventName: attributionData.conversionEvent,
            userData,
            customData: {
                contentName: `${w.product}:${w.eventType}`,
                contentCategory: "attribution",
                value: w.weight,
                currency: "USD",
            },
        }));
        return capiService.batchEvents(events);
    }
}
exports.CrossProductAttributionService = CrossProductAttributionService;
//# sourceMappingURL=attribution.js.map