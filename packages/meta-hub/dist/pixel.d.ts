import { MetaRateLimiter, type RateLimiterConfig } from './rate-limiter';
import { type MetaPixelConfig, type CAPIEvent, type UserData, type HashedUserData } from './types';
/**
 * Client for the Meta Conversions API (CAPI) and Pixel server-side events.
 *
 * Handles:
 * - PII hashing (SHA-256) per Meta requirements
 * - Event validation via Zod
 * - Batched event submission
 * - Rate-limit management
 * - appsecret_proof generation when appSecret is provided
 */
export declare class MetaPixelClient {
    private readonly pixelId;
    private readonly accessToken;
    private readonly appSecret?;
    private readonly baseUrl;
    private readonly rateLimiter;
    constructor(config: MetaPixelConfig, rateLimiterConfig?: RateLimiterConfig);
    /**
     * Send a single Conversions API event.
     *
     * The event is validated, user data fields are hashed, and the event is
     * submitted to the Meta Graph API.
     */
    sendEvent(event: CAPIEvent): Promise<void>;
    /**
     * Send a batch of Conversions API events.
     *
     * Events are validated, user data is hashed, and they are submitted as a
     * single batch request.  Returns the number of events accepted by Meta.
     */
    sendEvents(events: CAPIEvent[]): Promise<{
        eventsReceived: number;
    }>;
    /**
     * Hash user data fields according to Meta's requirements.
     *
     * Meta requires that PII fields (email, phone, name, etc.) be hashed
     * with SHA-256 before being sent to the Conversions API.  Fields that
     * are already hashed (64-character hex strings) are left as-is.
     *
     * Non-PII fields (client_ip_address, client_user_agent, fbc, fbp) are
     * passed through without hashing.
     */
    hashUserData(data: UserData): HashedUserData;
    /**
     * Create a standard PageView event for CAPI.
     */
    createPageViewEvent(userData: UserData, eventSourceUrl: string, eventId?: string): CAPIEvent;
    /**
     * Create a standard Purchase event for CAPI.
     */
    createPurchaseEvent(userData: UserData, value: number, currency: string, eventSourceUrl: string, contentIds?: string[], eventId?: string): CAPIEvent;
    /**
     * Create a standard Lead event for CAPI.
     */
    createLeadEvent(userData: UserData, eventSourceUrl: string, value?: number, currency?: string, eventId?: string): CAPIEvent;
    /**
     * Create a standard CompleteRegistration event for CAPI.
     */
    createRegistrationEvent(userData: UserData, eventSourceUrl: string, value?: number, currency?: string, eventId?: string): CAPIEvent;
    /**
     * Expose the underlying rate limiter for advanced use cases.
     */
    getRateLimiter(): MetaRateLimiter;
    /**
     * Gracefully shut down the pixel client.
     */
    shutdown(): void;
    /**
     * Hash user data for CAPI submission.  Unlike the public `hashUserData`
     * this returns a plain object suitable for the CAPI event payload.
     */
    private hashUserDataForCapi;
    private buildUrl;
}
//# sourceMappingURL=pixel.d.ts.map