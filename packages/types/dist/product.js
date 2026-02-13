"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductDefinitionSchema = exports.ProductStatusSchema = exports.ProductTierSchema = exports.ProductDisplayNames = exports.ProductIdSchema = void 0;
const zod_1 = require("zod");
/**
 * ProductId - Enum of all ACD product identifiers.
 * Every product in the ACD ecosystem is represented here.
 */
exports.ProductIdSchema = zod_1.z.enum([
    "portal28",
    "remotion",
    "waitlist_lab",
    "media_poster",
    "content_factory",
    "pct",
    "software_hub",
    "gap_radar",
    "blog_canvas",
    "canvas_cast",
    "shorts_linker",
    "vello_pad",
    "velvet_hold",
    "steady_letters",
    "ever_reach",
]);
/**
 * Human-readable display names for each product.
 */
exports.ProductDisplayNames = {
    portal28: "Portal28",
    remotion: "Remotion",
    waitlist_lab: "WaitlistLab",
    media_poster: "MediaPoster",
    content_factory: "ContentFactory",
    pct: "PCT",
    software_hub: "SoftwareHub",
    gap_radar: "GapRadar",
    blog_canvas: "BlogCanvas",
    canvas_cast: "CanvasCast",
    shorts_linker: "ShortsLinker",
    vello_pad: "VelloPad",
    velvet_hold: "VelvetHold",
    steady_letters: "SteadyLetters",
    ever_reach: "EverReach",
};
/**
 * Product tier categorization.
 */
exports.ProductTierSchema = zod_1.z.enum(["free", "starter", "pro", "enterprise"]);
/**
 * Product status in the ecosystem.
 */
exports.ProductStatusSchema = zod_1.z.enum([
    "active",
    "beta",
    "coming_soon",
    "deprecated",
    "maintenance",
]);
/**
 * Full product definition.
 */
exports.ProductDefinitionSchema = zod_1.z.object({
    id: exports.ProductIdSchema,
    displayName: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    status: exports.ProductStatusSchema,
    tier: exports.ProductTierSchema,
    url: zod_1.z.string().url().optional(),
    iconUrl: zod_1.z.string().url().optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
//# sourceMappingURL=product.js.map