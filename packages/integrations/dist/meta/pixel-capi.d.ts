/**
 * SharedPixelCAPIService (MH-004, GAP-001, GAP-005)
 *
 * Shared service for Meta Pixel (client-side) and Conversions API (server-side)
 * event tracking. Used across all ACD products for unified conversion tracking.
 *
 * - MH-004: Core CAPI event sending
 * - GAP-001: Shared CAPI ingest for all products
 * - GAP-005: Client-side pixel snippet generation
 */
import type { CAPIUserData, CAPICustomData } from "./types";
export interface PixelCAPIConfig {
    /** Meta Pixel ID / dataset ID. */
    pixelId: string;
    /** Long-lived access token for Conversions API. */
    accessToken: string;
    /** Options for the service. */
    options?: {
        /** Test event code for sandbox testing (sent as test_event_code). */
        testEventCode?: string;
        /** Whether to auto-hash PII fields before sending. */
        hashPII?: boolean;
    };
}
/**
 * SharedPixelCAPIService provides a unified interface for sending server-side
 * events to the Meta Conversions API and generating client-side pixel snippets.
 */
export declare class SharedPixelCAPIService {
    private readonly pixelId;
    private readonly accessToken;
    private readonly testEventCode;
    private readonly hashPII;
    constructor(config: PixelCAPIConfig);
    /**
     * Send a single server-side CAPI event to Meta.
     */
    sendEvent(eventName: string, userData: CAPIUserData, customData?: CAPICustomData, eventSourceUrl?: string): Promise<{
        eventsReceived: number;
        messages: string[];
    }>;
    /**
     * Send a PageView event.
     */
    sendPageView(url: string, userData: CAPIUserData): Promise<{
        eventsReceived: number;
        messages: string[];
    }>;
    /**
     * Send a Purchase event.
     */
    sendPurchase(value: number, currency: string, userData: CAPIUserData, orderId?: string): Promise<{
        eventsReceived: number;
        messages: string[];
    }>;
    /**
     * Send a Lead event.
     */
    sendLead(userData: CAPIUserData, formData?: Record<string, string>): Promise<{
        eventsReceived: number;
        messages: string[];
    }>;
    /**
     * Send a CompleteRegistration event.
     */
    sendRegistration(userData: CAPIUserData): Promise<{
        eventsReceived: number;
        messages: string[];
    }>;
    /**
     * Send a batch of events (up to 1000 per batch, as per Meta limit).
     */
    batchEvents(events: Array<{
        eventName: string;
        userData: CAPIUserData;
        customData?: CAPICustomData;
        eventSourceUrl?: string;
    }>): Promise<{
        eventsReceived: number;
        messages: string[];
    }>;
    /**
     * Generate the HTML/JS snippet for embedding Meta Pixel on a web page.
     * This enables client-side event tracking alongside server-side CAPI.
     */
    generatePixelSnippet(pixelId?: string): string;
    /**
     * SHA-256 hash PII fields for CAPI compliance.
     * Meta requires that PII fields are hashed before sending.
     */
    hashUserData(data: CAPIUserData): CAPIUserData;
    private buildEvent;
    private sendToMeta;
    private sha256;
}
//# sourceMappingURL=pixel-capi.d.ts.map