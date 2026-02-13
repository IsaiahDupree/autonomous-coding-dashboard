"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedPixelCAPIService = void 0;
const crypto_1 = require("crypto");
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const META_GRAPH_URL = "https://graph.facebook.com/v21.0";
const MAX_BATCH_SIZE = 1000;
/** PII fields that should be SHA-256 hashed for CAPI. */
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
 * SharedPixelCAPIService provides a unified interface for sending server-side
 * events to the Meta Conversions API and generating client-side pixel snippets.
 */
class SharedPixelCAPIService {
    constructor(config) {
        this.pixelId = config.pixelId;
        this.accessToken = config.accessToken;
        this.testEventCode = config.options?.testEventCode;
        this.hashPII = config.options?.hashPII ?? true;
    }
    // -------------------------------------------------------------------------
    // Core event sending
    // -------------------------------------------------------------------------
    /**
     * Send a single server-side CAPI event to Meta.
     */
    async sendEvent(eventName, userData, customData, eventSourceUrl) {
        const event = this.buildEvent(eventName, userData, customData, eventSourceUrl);
        return this.sendToMeta([event]);
    }
    /**
     * Send a PageView event.
     */
    async sendPageView(url, userData) {
        return this.sendEvent("PageView", userData, undefined, url);
    }
    /**
     * Send a Purchase event.
     */
    async sendPurchase(value, currency, userData, orderId) {
        const customData = {
            value,
            currency,
            orderId,
        };
        return this.sendEvent("Purchase", userData, customData);
    }
    /**
     * Send a Lead event.
     */
    async sendLead(userData, formData) {
        const customData = formData
            ? { contentName: formData["formName"], contentCategory: "lead_form" }
            : undefined;
        return this.sendEvent("Lead", userData, customData);
    }
    /**
     * Send a CompleteRegistration event.
     */
    async sendRegistration(userData) {
        return this.sendEvent("CompleteRegistration", userData, {
            status: "registered",
        });
    }
    // -------------------------------------------------------------------------
    // Batch sending
    // -------------------------------------------------------------------------
    /**
     * Send a batch of events (up to 1000 per batch, as per Meta limit).
     */
    async batchEvents(events) {
        const payloads = events.map((e) => this.buildEvent(e.eventName, e.userData, e.customData, e.eventSourceUrl));
        // Split into chunks of MAX_BATCH_SIZE
        const results = {
            eventsReceived: 0,
            messages: [],
        };
        for (let i = 0; i < payloads.length; i += MAX_BATCH_SIZE) {
            const chunk = payloads.slice(i, i + MAX_BATCH_SIZE);
            const chunkResult = await this.sendToMeta(chunk);
            results.eventsReceived += chunkResult.eventsReceived;
            results.messages.push(...chunkResult.messages);
        }
        return results;
    }
    // -------------------------------------------------------------------------
    // Client-side pixel snippet (GAP-005)
    // -------------------------------------------------------------------------
    /**
     * Generate the HTML/JS snippet for embedding Meta Pixel on a web page.
     * This enables client-side event tracking alongside server-side CAPI.
     */
    generatePixelSnippet(pixelId) {
        const pid = pixelId ?? this.pixelId;
        return [
            "<!-- Meta Pixel Code -->",
            "<script>",
            "!function(f,b,e,v,n,t,s)",
            "{if(f.fbq)return;n=f.fbq=function(){n.callMethod?",
            "n.callMethod.apply(n,arguments):n.queue.push(arguments)};",
            "if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';",
            "n.queue=[];t=b.createElement(e);t.async=!0;",
            "t.src=v;s=b.getElementsByTagName(e)[0];",
            "s.parentNode.insertBefore(t,s)}(window, document,'script',",
            "'https://connect.facebook.net/en_US/fbevents.js');",
            `fbq('init', '${pid}');`,
            "fbq('track', 'PageView');",
            "</script>",
            `<noscript><img height="1" width="1" style="display:none"`,
            `src="https://www.facebook.com/tr?id=${pid}&ev=PageView&noscript=1"`,
            "/></noscript>",
            "<!-- End Meta Pixel Code -->",
        ].join("\n");
    }
    // -------------------------------------------------------------------------
    // PII hashing
    // -------------------------------------------------------------------------
    /**
     * SHA-256 hash PII fields for CAPI compliance.
     * Meta requires that PII fields are hashed before sending.
     */
    hashUserData(data) {
        const hashed = { ...data };
        for (const field of PII_HASH_FIELDS) {
            const value = hashed[field];
            if (Array.isArray(value)) {
                hashed[field] = value.map((v) => this.sha256(v.toLowerCase().trim()));
            }
        }
        return hashed;
    }
    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------
    buildEvent(eventName, userData, customData, eventSourceUrl) {
        const processedUserData = this.hashPII
            ? this.hashUserData(userData)
            : userData;
        return {
            eventName,
            eventTime: Math.floor(Date.now() / 1000),
            actionSource: "website",
            eventSourceUrl,
            userData: processedUserData,
            customData,
        };
    }
    async sendToMeta(events) {
        const url = `${META_GRAPH_URL}/${this.pixelId}/events`;
        const payload = {
            data: events,
            access_token: this.accessToken,
        };
        if (this.testEventCode) {
            payload["test_event_code"] = this.testEventCode;
        }
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
    sha256(input) {
        return (0, crypto_1.createHash)("sha256").update(input).digest("hex");
    }
}
exports.SharedPixelCAPIService = SharedPixelCAPIService;
//# sourceMappingURL=pixel-capi.js.map