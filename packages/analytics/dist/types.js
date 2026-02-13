"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsEventSchema = exports.IdentifyInputSchema = exports.BatchTrackInputSchema = exports.TrackEventInputSchema = exports.EventContextSchema = exports.CampaignContextSchema = exports.DeviceContextSchema = exports.PageContextSchema = exports.EventCategorySchema = exports.ProductIdSchema = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Product IDs -- every product in the ACD ecosystem
// ---------------------------------------------------------------------------
exports.ProductIdSchema = zod_1.z.enum([
    'portal28',
    'content-factory',
    'pct',
    'waitlistlab',
    'mediaposter',
    'shorts-linker',
    'vellopad',
    'velvet-hold',
    'steady-letters',
    'ever-reach',
    'gap-radar',
    'blog-canvas',
    'canvas-cast',
    'software-hub',
    'acd',
]);
// ---------------------------------------------------------------------------
// Event categories
// ---------------------------------------------------------------------------
exports.EventCategorySchema = zod_1.z.enum([
    'page_view',
    'click',
    'form_submit',
    'api_call',
    'error',
    'purchase',
    'subscription',
    'content_created',
    'content_published',
    'render_started',
    'render_completed',
    'ad_created',
    'ad_published',
    'campaign_created',
    'user_signed_up',
    'user_logged_in',
    'feature_used',
    'custom',
]);
// ---------------------------------------------------------------------------
// Event context -- optional metadata attached to each event
// ---------------------------------------------------------------------------
exports.PageContextSchema = zod_1.z.object({
    url: zod_1.z.string().optional(),
    path: zod_1.z.string().optional(),
    referrer: zod_1.z.string().optional(),
    title: zod_1.z.string().optional(),
});
exports.DeviceContextSchema = zod_1.z.object({
    type: zod_1.z.string().optional(),
    os: zod_1.z.string().optional(),
    browser: zod_1.z.string().optional(),
});
exports.CampaignContextSchema = zod_1.z.object({
    utm_source: zod_1.z.string().optional(),
    utm_medium: zod_1.z.string().optional(),
    utm_campaign: zod_1.z.string().optional(),
    utm_term: zod_1.z.string().optional(),
    utm_content: zod_1.z.string().optional(),
});
exports.EventContextSchema = zod_1.z.object({
    ip: zod_1.z.string().optional(),
    userAgent: zod_1.z.string().optional(),
    locale: zod_1.z.string().optional(),
    timezone: zod_1.z.string().optional(),
    page: exports.PageContextSchema.optional(),
    device: exports.DeviceContextSchema.optional(),
    campaign: exports.CampaignContextSchema.optional(),
});
// ---------------------------------------------------------------------------
// Core event schemas
// ---------------------------------------------------------------------------
exports.TrackEventInputSchema = zod_1.z.object({
    event: zod_1.z.string(),
    properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    context: exports.EventContextSchema.optional(),
    userId: zod_1.z.string().optional(),
    anonymousId: zod_1.z.string().optional(),
    product: exports.ProductIdSchema,
    timestamp: zod_1.z.string().datetime().optional(),
});
exports.BatchTrackInputSchema = zod_1.z.object({
    events: zod_1.z.array(exports.TrackEventInputSchema),
});
// ---------------------------------------------------------------------------
// Identify schema
// ---------------------------------------------------------------------------
exports.IdentifyInputSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    traits: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    product: exports.ProductIdSchema,
});
// ---------------------------------------------------------------------------
// Internal enriched event -- what the tracker passes to transports
// ---------------------------------------------------------------------------
exports.AnalyticsEventSchema = zod_1.z.object({
    event: zod_1.z.string(),
    properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    context: exports.EventContextSchema.optional(),
    userId: zod_1.z.string().optional(),
    anonymousId: zod_1.z.string().optional(),
    product: exports.ProductIdSchema,
    timestamp: zod_1.z.string().datetime(),
    messageId: zod_1.z.string(),
});
//# sourceMappingURL=types.js.map