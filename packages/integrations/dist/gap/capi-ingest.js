"use strict";
/**
 * CAPIIngestService (GAP-001, GAP-006)
 *
 * Centralized CAPI (Conversions API) event ingestion for all ACD products.
 * Validates, enriches, and forwards events to the Meta Conversions API.
 *
 * - GAP-001: Shared CAPI event ingest across products
 * - GAP-006: Edge function handler for non-WaitlistLab conversion events
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAPIIngestService = void 0;
const zod_1 = require("zod");
const crypto_1 = require("crypto");
// ---------------------------------------------------------------------------
// Event schema (Zod validation)
// ---------------------------------------------------------------------------
const CAPIIngestEventSchema = zod_1.z.object({
    eventName: zod_1.z.string().min(1).max(256),
    userData: zod_1.z.object({
        em: zod_1.z.array(zod_1.z.string()).optional(),
        ph: zod_1.z.array(zod_1.z.string()).optional(),
        fn: zod_1.z.array(zod_1.z.string()).optional(),
        ln: zod_1.z.array(zod_1.z.string()).optional(),
        db: zod_1.z.array(zod_1.z.string()).optional(),
        ge: zod_1.z.array(zod_1.z.string()).optional(),
        ct: zod_1.z.array(zod_1.z.string()).optional(),
        st: zod_1.z.array(zod_1.z.string()).optional(),
        zp: zod_1.z.array(zod_1.z.string()).optional(),
        country: zod_1.z.array(zod_1.z.string()).optional(),
        externalId: zod_1.z.array(zod_1.z.string()).optional(),
        clientIpAddress: zod_1.z.string().optional(),
        clientUserAgent: zod_1.z.string().optional(),
        fbc: zod_1.z.string().optional(),
        fbp: zod_1.z.string().optional(),
        subscriptionId: zod_1.z.string().optional(),
        leadId: zod_1.z.string().optional(),
    }),
    customData: zod_1.z
        .object({
        value: zod_1.z.number().optional(),
        currency: zod_1.z.string().length(3).optional(),
        contentName: zod_1.z.string().optional(),
        contentCategory: zod_1.z.string().optional(),
        contentIds: zod_1.z.array(zod_1.z.string()).optional(),
        contentType: zod_1.z.string().optional(),
        numItems: zod_1.z.number().int().optional(),
        orderId: zod_1.z.string().optional(),
        searchString: zod_1.z.string().optional(),
        status: zod_1.z.string().optional(),
    })
        .passthrough()
        .optional(),
    sourceProduct: zod_1.z.string().min(1).optional(),
    eventSourceUrl: zod_1.z.string().url().optional(),
});
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const META_GRAPH_URL = "https://graph.facebook.com/v21.0";
/** PII fields that should be SHA-256 hashed. */
const PII_HASH_FIELDS = [
    "em",
    "ph",
    "fn",
    "ln",
    "db",
    "ge",
    "ct",
    "st",
    "zp",
    "country",
];
// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
/**
 * CAPIIngestService provides centralized CAPI event ingestion.
 * All ACD products send conversion events through this service.
 */
class CAPIIngestService {
    constructor(config) {
        this.personStore = null;
        this.pixelId = config.pixelId;
        this.accessToken = config.accessToken;
        this.shouldValidate = config.options?.validateEvents ?? true;
        this.shouldEnrich = config.options?.enrichWithPerson ?? false;
    }
    /**
     * Set the person store for user data enrichment.
     */
    setPersonStore(store) {
        this.personStore = store;
    }
    // -------------------------------------------------------------------------
    // Single event ingest
    // -------------------------------------------------------------------------
    /**
     * Ingest a single conversion event. Validates, enriches, hashes PII,
     * and forwards to Meta CAPI.
     */
    async ingestEvent(event) {
        // Validate
        if (this.shouldValidate) {
            this.validateEvent(event);
        }
        // Enrich from person store if enabled
        let userData = event.userData;
        if (this.shouldEnrich && userData.externalId && userData.externalId.length > 0) {
            userData = await this.enrichFromPersonStore(userData);
        }
        // Hash PII
        const hashedUserData = this.hashPII(userData);
        // Build CAPI payload
        const payload = {
            data: [
                {
                    event_name: event.eventName,
                    event_time: Math.floor(Date.now() / 1000),
                    action_source: "website",
                    event_source_url: event.eventSourceUrl,
                    user_data: hashedUserData,
                    custom_data: event.customData,
                },
            ],
            access_token: this.accessToken,
        };
        return this.sendToMeta(payload);
    }
    // -------------------------------------------------------------------------
    // Batch ingest
    // -------------------------------------------------------------------------
    /**
     * Ingest a batch of conversion events.
     */
    async ingestBatch(events) {
        const processedEvents = [];
        for (const event of events) {
            if (this.shouldValidate) {
                this.validateEvent(event);
            }
            let userData = event.userData;
            if (this.shouldEnrich && userData.externalId && userData.externalId.length > 0) {
                userData = await this.enrichFromPersonStore(userData);
            }
            const hashedUserData = this.hashPII(userData);
            processedEvents.push({
                event_name: event.eventName,
                event_time: Math.floor(Date.now() / 1000),
                action_source: "website",
                event_source_url: event.eventSourceUrl,
                user_data: hashedUserData,
                custom_data: event.customData,
            });
        }
        // Send in batches of 1000 (Meta limit)
        const results = { eventsReceived: 0, messages: [] };
        for (let i = 0; i < processedEvents.length; i += 1000) {
            const chunk = processedEvents.slice(i, i + 1000);
            const payload = {
                data: chunk,
                access_token: this.accessToken,
            };
            const chunkResult = await this.sendToMeta(payload);
            results.eventsReceived += chunkResult.eventsReceived;
            results.messages.push(...chunkResult.messages);
        }
        return results;
    }
    // -------------------------------------------------------------------------
    // Edge function handler (GAP-006)
    // -------------------------------------------------------------------------
    /**
     * Create an edge function handler for non-WaitlistLab conversion events.
     * Returns a handler function that accepts HTTP-like request objects and
     * processes them as CAPI events.
     */
    createEdgeFunction() {
        return async (req) => {
            // Only accept POST
            if (req.method !== "POST") {
                return {
                    status: 405,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ error: "Method not allowed" }),
                };
            }
            try {
                const body = JSON.parse(req.body ?? "{}");
                if (!body.eventName || !body.userData) {
                    return {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            error: "Missing required fields: eventName, userData",
                        }),
                    };
                }
                // Hash PII from the incoming request
                const hashedUserData = this.hashPII(body.userData);
                // Forward to CAPI
                const result = await this.ingestEvent({
                    eventName: body.eventName,
                    userData: hashedUserData,
                    customData: body.customData,
                    eventSourceUrl: body.eventSourceUrl,
                });
                return {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(result),
                };
            }
            catch (err) {
                const message = err instanceof Error ? err.message : "Internal server error";
                return {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ error: message }),
                };
            }
        };
    }
    // -------------------------------------------------------------------------
    // Validation
    // -------------------------------------------------------------------------
    /**
     * Validate an event using Zod schema.
     * @throws Error if validation fails.
     */
    validateEvent(event) {
        const result = CAPIIngestEventSchema.safeParse(event);
        if (!result.success) {
            const issues = result.error.issues
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join("; ");
            throw new Error(`Event validation failed: ${issues}`);
        }
    }
    // -------------------------------------------------------------------------
    // Person store enrichment
    // -------------------------------------------------------------------------
    /**
     * Enrich user data from the shared person store.
     * Looks up the person by externalId and fills in any missing PII fields.
     */
    async enrichFromPersonStore(userData) {
        if (!this.personStore) {
            return userData;
        }
        const externalId = userData.externalId?.[0];
        if (!externalId) {
            return userData;
        }
        const person = await this.personStore.findByExternalId(externalId);
        if (!person) {
            return userData;
        }
        const enriched = { ...userData };
        // Only fill in fields that are not already present
        if (!enriched.em && person.email) {
            enriched.em = [person.email];
        }
        if (!enriched.ph && person.phone) {
            enriched.ph = [person.phone];
        }
        if (!enriched.fn && person.firstName) {
            enriched.fn = [person.firstName];
        }
        if (!enriched.ln && person.lastName) {
            enriched.ln = [person.lastName];
        }
        if (!enriched.ct && person.city) {
            enriched.ct = [person.city];
        }
        if (!enriched.st && person.state) {
            enriched.st = [person.state];
        }
        if (!enriched.zp && person.zipCode) {
            enriched.zp = [person.zipCode];
        }
        if (!enriched.country && person.country) {
            enriched.country = [person.country];
        }
        return enriched;
    }
    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------
    hashPII(userData) {
        const hashed = { ...userData };
        for (const field of PII_HASH_FIELDS) {
            const value = hashed[field];
            if (Array.isArray(value)) {
                hashed[field] = value.map((v) => this.sha256(v.toLowerCase().trim()));
            }
        }
        return hashed;
    }
    sha256(input) {
        return (0, crypto_1.createHash)("sha256").update(input).digest("hex");
    }
    async sendToMeta(payload) {
        const url = `${META_GRAPH_URL}/${this.pixelId}/events`;
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Meta CAPI error ${res.status}: ${text}`);
        }
        const json = (await res.json());
        return {
            eventsReceived: json.events_received ?? 0,
            messages: json.messages ?? [],
        };
    }
}
exports.CAPIIngestService = CAPIIngestService;
//# sourceMappingURL=capi-ingest.js.map