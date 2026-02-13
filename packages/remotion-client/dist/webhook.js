"use strict";
/**
 * Webhook utilities for the Remotion API.
 *
 * Provides:
 *  - HMAC-SHA256 signature verification.
 *  - Typed webhook event parsing.
 *  - An enum of all known webhook event types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookEventType = void 0;
exports.verifyWebhookSignature = verifyWebhookSignature;
exports.parseWebhookEvent = parseWebhookEvent;
exports.safeParseWebhookEvent = safeParseWebhookEvent;
const node_crypto_1 = require("node:crypto");
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Webhook event types
// ---------------------------------------------------------------------------
var WebhookEventType;
(function (WebhookEventType) {
    /** A render job completed successfully. */
    WebhookEventType["JobCompleted"] = "job.completed";
    /** A render job failed. */
    WebhookEventType["JobFailed"] = "job.failed";
    /** Periodic progress update for a running job. */
    WebhookEventType["JobProgress"] = "job.progress";
})(WebhookEventType || (exports.WebhookEventType = WebhookEventType = {}));
// ---------------------------------------------------------------------------
// Zod schemas for webhook payloads
// ---------------------------------------------------------------------------
const jobCompletedPayloadSchema = zod_1.z.object({
    jobId: zod_1.z.string(),
    status: zod_1.z.literal("completed"),
    outputUrl: zod_1.z.string().url(),
    durationMs: zod_1.z.number(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
const jobFailedPayloadSchema = zod_1.z.object({
    jobId: zod_1.z.string(),
    status: zod_1.z.literal("failed"),
    error: zod_1.z.object({
        code: zod_1.z.string(),
        message: zod_1.z.string(),
    }),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
const jobProgressPayloadSchema = zod_1.z.object({
    jobId: zod_1.z.string(),
    status: zod_1.z.literal("progress"),
    progress: zod_1.z.number().min(0).max(100),
    currentStep: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
const webhookEventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.nativeEnum(WebhookEventType),
    timestamp: zod_1.z.string().datetime(),
    payload: zod_1.z.union([
        jobCompletedPayloadSchema,
        jobFailedPayloadSchema,
        jobProgressPayloadSchema,
    ]),
});
// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------
/**
 * Verify the HMAC-SHA256 signature of an incoming webhook payload.
 *
 * The expected signature format is `sha256=<hex digest>`.
 *
 * @param payload  - The raw request body (string or Buffer).
 * @param signature - The value of the `x-remotion-signature` header.
 * @param secret   - The webhook secret shared between you and the API.
 * @returns `true` if the signature is valid, `false` otherwise.
 */
function verifyWebhookSignature(payload, signature, secret) {
    if (!payload || !signature || !secret) {
        return false;
    }
    try {
        const hmac = (0, node_crypto_1.createHmac)("sha256", secret);
        hmac.update(typeof payload === "string" ? payload : payload.toString("utf-8"));
        const expected = `sha256=${hmac.digest("hex")}`;
        // Use timing-safe comparison to prevent timing attacks.
        const sigBuf = Buffer.from(signature, "utf-8");
        const expBuf = Buffer.from(expected, "utf-8");
        if (sigBuf.length !== expBuf.length) {
            return false;
        }
        return (0, node_crypto_1.timingSafeEqual)(sigBuf, expBuf);
    }
    catch {
        return false;
    }
}
// ---------------------------------------------------------------------------
// Event parsing
// ---------------------------------------------------------------------------
/**
 * Parse and validate an incoming webhook event payload.
 *
 * @param payload - The parsed JSON body of the webhook request (object),
 *                  or a raw JSON string.
 * @returns A fully-typed `WebhookEvent`.
 * @throws `z.ZodError` if the payload does not match the expected schema.
 */
function parseWebhookEvent(payload) {
    const data = typeof payload === "string" ? JSON.parse(payload) : payload;
    const parsed = webhookEventSchema.parse(data);
    return parsed;
}
/**
 * Safely attempt to parse a webhook event. Returns `null` instead of throwing
 * when validation fails.
 */
function safeParseWebhookEvent(payload) {
    try {
        const data = typeof payload === "string" ? JSON.parse(payload) : payload;
        const result = webhookEventSchema.safeParse(data);
        if (result.success) {
            return result.data;
        }
        return null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=webhook.js.map