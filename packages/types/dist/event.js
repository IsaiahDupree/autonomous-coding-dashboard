"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchTrackInputSchema = exports.TrackEventInputSchema = exports.SharedEventSchema = exports.EventContextSchema = exports.EventSeveritySchema = exports.EventCategorySchema = void 0;
const zod_1 = require("zod");
const product_1 = require("./product");
// ---------------------------------------------------------------------------
// Event Types
// ---------------------------------------------------------------------------
/**
 * Event category for classification.
 */
exports.EventCategorySchema = zod_1.z.enum([
    "page_view",
    "user_action",
    "system",
    "api_call",
    "error",
    "conversion",
    "engagement",
    "auth",
    "billing",
    "render",
    "notification",
    "integration",
    "custom",
]);
/**
 * Event severity / importance level.
 */
exports.EventSeveritySchema = zod_1.z.enum(["debug", "info", "warning", "error", "critical"]);
/**
 * Device / client context captured with the event.
 */
exports.EventContextSchema = zod_1.z.object({
    /** IP address of the client. */
    ip: zod_1.z.string().ip().optional(),
    /** User agent string. */
    userAgent: zod_1.z.string().max(2048).optional(),
    /** ISO 639-1 locale (e.g., "en-US"). */
    locale: zod_1.z.string().max(10).optional(),
    /** Timezone (IANA, e.g., "America/New_York"). */
    timezone: zod_1.z.string().max(64).optional(),
    /** Referring URL. */
    referrer: zod_1.z.string().url().optional(),
    /** Current page URL. */
    pageUrl: zod_1.z.string().url().optional(),
    /** Current page path (without domain). */
    pagePath: zod_1.z.string().optional(),
    /** Screen width. */
    screenWidth: zod_1.z.number().int().positive().optional(),
    /** Screen height. */
    screenHeight: zod_1.z.number().int().positive().optional(),
    /** Device type. */
    deviceType: zod_1.z.enum(["desktop", "mobile", "tablet", "unknown"]).optional(),
    /** Operating system. */
    os: zod_1.z.string().max(64).optional(),
    /** Browser name. */
    browser: zod_1.z.string().max(64).optional(),
    /** Country code (ISO 3166-1 alpha-2). */
    country: zod_1.z.string().length(2).optional(),
    /** Region / state. */
    region: zod_1.z.string().max(128).optional(),
    /** City. */
    city: zod_1.z.string().max(128).optional(),
});
/**
 * SharedEvent - A telemetry/analytics event recorded across ACD products.
 */
exports.SharedEventSchema = zod_1.z.object({
    /** Unique event identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** The event name (e.g., "video.rendered", "user.signed_up"). */
    name: zod_1.z.string().min(1).max(256),
    /** Event category. */
    category: exports.EventCategorySchema,
    /** Event severity. */
    severity: exports.EventSeveritySchema.default("info"),
    /** The product that emitted this event. */
    productId: product_1.ProductIdSchema.optional(),
    /** The user associated with this event (may be null for anonymous). */
    userId: zod_1.z.string().uuid().optional(),
    /** Anonymous/session identifier. */
    anonymousId: zod_1.z.string().max(256).optional(),
    /** Session identifier. */
    sessionId: zod_1.z.string().uuid().optional(),
    /** Client/device context. */
    context: exports.EventContextSchema.optional(),
    /** Event-specific payload data. */
    properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    /** Numeric value associated with the event (e.g., revenue). */
    value: zod_1.z.number().optional(),
    /** Currency code for monetary values (ISO 4217). */
    currency: zod_1.z.string().length(3).optional(),
    /** ISO 8601 timestamp of when the event occurred. */
    timestamp: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of when the event was received by the server. */
    receivedAt: zod_1.z.string().datetime().optional(),
    /** ISO 8601 timestamp of when the event was processed. */
    processedAt: zod_1.z.string().datetime().optional(),
});
// ---------------------------------------------------------------------------
// Track Event Input (client-side)
// ---------------------------------------------------------------------------
/**
 * TrackEventInput - The shape of data sent from clients to track an event.
 * This is a subset of SharedEvent; the server enriches it with IDs and timestamps.
 */
exports.TrackEventInputSchema = zod_1.z.object({
    /** The event name (e.g., "button.clicked", "page.viewed"). */
    name: zod_1.z.string().min(1).max(256),
    /** Event category. */
    category: exports.EventCategorySchema.optional(),
    /** Event severity. */
    severity: exports.EventSeveritySchema.optional(),
    /** The product emitting the event. */
    productId: product_1.ProductIdSchema.optional(),
    /** User ID (if authenticated). */
    userId: zod_1.z.string().uuid().optional(),
    /** Anonymous/session identifier (if not authenticated). */
    anonymousId: zod_1.z.string().max(256).optional(),
    /** Session identifier. */
    sessionId: zod_1.z.string().uuid().optional(),
    /** Client/device context. */
    context: exports.EventContextSchema.optional(),
    /** Event-specific payload data. */
    properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    /** Numeric value associated with the event. */
    value: zod_1.z.number().optional(),
    /** Currency code (ISO 4217). */
    currency: zod_1.z.string().length(3).optional(),
    /** Client-side timestamp (ISO 8601). */
    timestamp: zod_1.z.string().datetime().optional(),
});
/**
 * Batch tracking input for sending multiple events at once.
 */
exports.BatchTrackInputSchema = zod_1.z.object({
    events: zod_1.z.array(exports.TrackEventInputSchema).min(1).max(500),
});
//# sourceMappingURL=event.js.map