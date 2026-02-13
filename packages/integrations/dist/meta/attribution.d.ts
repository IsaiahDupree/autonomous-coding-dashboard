/**
 * CrossProductAttributionService (MH-005, GAP-002)
 *
 * Multi-touch attribution across ACD products. Tracks user touchpoints
 * across different products and calculates attribution weights using
 * first-touch, last-touch, and linear models.
 *
 * Includes in-memory touchpoint store with pluggable persistence.
 */
import type { Touchpoint, AttributionModel, AttributionWeight, AttributionResult, CAPIUserData } from "./types";
import { SharedPixelCAPIService } from "./pixel-capi";
export interface AttributionConfig {
    /** List of product IDs participating in attribution. */
    products: string[];
    /** Meta Pixel ID (for syncing attributed conversions to CAPI). */
    pixelId: string;
    /** Optional external event store URL for persistence. */
    eventStoreUrl?: string;
}
/**
 * Pluggable persistence interface for touchpoint storage.
 */
export interface TouchpointStore {
    save(touchpoint: Touchpoint): Promise<void>;
    getByUserId(userId: string): Promise<Touchpoint[]>;
    clear(userId: string): Promise<void>;
}
/**
 * CrossProductAttributionService tracks user touchpoints across products
 * and provides multi-touch attribution for conversion events.
 */
export declare class CrossProductAttributionService {
    private readonly products;
    readonly pixelId: string;
    readonly eventStoreUrl: string | undefined;
    private readonly touchpointStore;
    constructor(config: AttributionConfig, store?: TouchpointStore);
    /**
     * Record a user touchpoint for a product interaction.
     */
    trackTouchpoint(userId: string, product: string, eventType: string, metadata?: Record<string, unknown>): Promise<Touchpoint>;
    /**
     * Get multi-touch attribution for a user's conversion event.
     * Returns first-touch, last-touch, and linear attribution models.
     */
    getAttribution(userId: string, conversionEvent: string): Promise<AttributionResult>;
    /**
     * Get the full cross-product user journey (all touchpoints in order).
     */
    getJourney(userId: string): Promise<Touchpoint[]>;
    /**
     * Calculate attribution weights for a set of touchpoints.
     */
    attributeConversion(_conversionEvent: string, touchpoints: Touchpoint[], model: AttributionModel): AttributionWeight[];
    /**
     * Send attributed conversions to Meta CAPI.
     * Maps attribution weights to CAPI events with product metadata.
     */
    syncToMeta(attributionData: AttributionResult, capiService: SharedPixelCAPIService, userData: CAPIUserData): Promise<{
        eventsReceived: number;
        messages: string[];
    }>;
}
//# sourceMappingURL=attribution.d.ts.map