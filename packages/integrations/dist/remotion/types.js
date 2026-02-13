"use strict";
/**
 * Shared types and schemas for product-specific Remotion integrations.
 *
 * These types are used across all product integration modules (Content Factory,
 * PCT, MediaPoster, WaitlistLab) to ensure a consistent interface with the
 * Remotion rendering API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchJobRequestSchema = exports.batchJobItemSchema = exports.jobCallbackSchema = exports.RenderTemplate = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Render Template enum
// ---------------------------------------------------------------------------
var RenderTemplate;
(function (RenderTemplate) {
    RenderTemplate["UgcVideo"] = "ugc_video";
    RenderTemplate["StaticAd"] = "static_ad";
    RenderTemplate["MiniVsl"] = "mini_vsl";
    RenderTemplate["BeforeAfter"] = "before_after";
    RenderTemplate["ProductShowcase"] = "product_showcase";
    RenderTemplate["Testimonial"] = "testimonial";
    RenderTemplate["SocialPost"] = "social_post";
})(RenderTemplate || (exports.RenderTemplate = RenderTemplate = {}));
// ---------------------------------------------------------------------------
// Job Callback (RC-007)
// ---------------------------------------------------------------------------
exports.jobCallbackSchema = zod_1.z.object({
    url: zod_1.z.string().url(),
    headers: zod_1.z.record(zod_1.z.string()).optional(),
    secret: zod_1.z.string().optional(),
    events: zod_1.z.array(zod_1.z.enum(["job.completed", "job.failed", "job.progress"])).min(1),
});
// ---------------------------------------------------------------------------
// Batch Job types (RC-008)
// ---------------------------------------------------------------------------
exports.batchJobItemSchema = zod_1.z.object({
    template: zod_1.z.nativeEnum(RenderTemplate),
    input: zod_1.z.record(zod_1.z.unknown()),
    callback: exports.jobCallbackSchema.optional(),
    priority: zod_1.z.number().int().min(0).max(10).optional(),
});
exports.batchJobRequestSchema = zod_1.z.object({
    jobs: zod_1.z.array(exports.batchJobItemSchema).min(1),
    parallelism: zod_1.z.number().int().min(1).max(50).optional(),
    webhook: exports.jobCallbackSchema.optional(),
});
//# sourceMappingURL=types.js.map