/**
 * CAPIIngestService (GAP-001, GAP-006)
 *
 * Centralized CAPI (Conversions API) event ingestion for all ACD products.
 * Validates, enriches, and forwards events to the Meta Conversions API.
 *
 * - GAP-001: Shared CAPI event ingest across products
 * - GAP-006: Edge function handler for non-WaitlistLab conversion events
 */
import type { CAPIUserData, CAPICustomData } from "../meta/types";
export interface CAPIIngestConfig {
    /** Meta Pixel ID / dataset ID. */
    pixelId: string;
    /** Meta access token for CAPI. */
    accessToken: string;
    /** Options. */
    options?: {
        /** Whether to validate events with Zod before sending. */
        validateEvents?: boolean;
        /** Whether to enrich user data from shared person store. */
        enrichWithPerson?: boolean;
    };
}
/**
 * Interface for looking up person data to enrich CAPI events.
 */
export interface PersonStore {
    findByExternalId(externalId: string): Promise<PersonRecord | null>;
}
export interface PersonRecord {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
}
interface EdgeFunctionRequest {
    method: string;
    body: string | null;
    headers: Record<string, string>;
}
interface EdgeFunctionResponse {
    status: number;
    headers: Record<string, string>;
    body: string;
}
/**
 * CAPIIngestService provides centralized CAPI event ingestion.
 * All ACD products send conversion events through this service.
 */
export declare class CAPIIngestService {
    private readonly pixelId;
    private readonly accessToken;
    private readonly shouldValidate;
    private readonly shouldEnrich;
    private personStore;
    constructor(config: CAPIIngestConfig);
    /**
     * Set the person store for user data enrichment.
     */
    setPersonStore(store: PersonStore): void;
    /**
     * Ingest a single conversion event. Validates, enriches, hashes PII,
     * and forwards to Meta CAPI.
     */
    ingestEvent(event: {
        eventName: string;
        userData: CAPIUserData;
        customData?: CAPICustomData;
        sourceProduct?: string;
        eventSourceUrl?: string;
    }): Promise<{
        eventsReceived: number;
        messages: string[];
    }>;
    /**
     * Ingest a batch of conversion events.
     */
    ingestBatch(events: Array<{
        eventName: string;
        userData: CAPIUserData;
        customData?: CAPICustomData;
        sourceProduct?: string;
        eventSourceUrl?: string;
    }>): Promise<{
        eventsReceived: number;
        messages: string[];
    }>;
    /**
     * Create an edge function handler for non-WaitlistLab conversion events.
     * Returns a handler function that accepts HTTP-like request objects and
     * processes them as CAPI events.
     */
    createEdgeFunction(): (req: EdgeFunctionRequest) => Promise<EdgeFunctionResponse>;
    /**
     * Validate an event using Zod schema.
     * @throws Error if validation fails.
     */
    validateEvent(event: {
        eventName: string;
        userData: CAPIUserData;
        customData?: CAPICustomData;
        sourceProduct?: string;
        eventSourceUrl?: string;
    }): void;
    /**
     * Enrich user data from the shared person store.
     * Looks up the person by externalId and fills in any missing PII fields.
     */
    enrichFromPersonStore(userData: CAPIUserData): Promise<CAPIUserData>;
    private hashPII;
    private sha256;
    private sendToMeta;
}
export {};
//# sourceMappingURL=capi-ingest.d.ts.map