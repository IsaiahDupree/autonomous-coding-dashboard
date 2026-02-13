"use strict";
/**
 * PCT (Product Creative Tool) Remotion Integration (RC-003, RC-004)
 *
 * RC-003: Static ad rendering -- generates still image creatives in standard
 *         ad dimensions (1080x1080, 1080x1920, 1200x628, etc.).
 * RC-004: Mini-VSL (Video Sales Letter) rendering -- generates short-form
 *         video ads with voice, hooks, product demos, and CTAs.
 *
 * Also supports before/after comparison renders.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PCTRemotionService = void 0;
const zod_1 = require("zod");
const types_1 = require("./types");
const AD_DIMENSIONS = [
    {
        name: "Square",
        width: 1080,
        height: 1080,
        aspectRatio: "1:1",
        platforms: ["instagram", "facebook", "twitter"],
    },
    {
        name: "Story / Reel",
        width: 1080,
        height: 1920,
        aspectRatio: "9:16",
        platforms: ["instagram", "tiktok", "snapchat", "youtube-shorts"],
    },
    {
        name: "Landscape",
        width: 1200,
        height: 628,
        aspectRatio: "1.91:1",
        platforms: ["facebook", "twitter", "linkedin"],
    },
    {
        name: "YouTube Thumbnail",
        width: 1280,
        height: 720,
        aspectRatio: "16:9",
        platforms: ["youtube"],
    },
    {
        name: "Pinterest Pin",
        width: 1000,
        height: 1500,
        aspectRatio: "2:3",
        platforms: ["pinterest"],
    },
    {
        name: "Twitter Header",
        width: 1500,
        height: 500,
        aspectRatio: "3:1",
        platforms: ["twitter"],
    },
];
// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------
const staticAdInputSchema = zod_1.z.object({
    adCopy: zod_1.z.string().min(1),
    headline: zod_1.z.string().min(1),
    ctaText: zod_1.z.string().min(1),
    productImage: zod_1.z.string().url(),
    brandColors: zod_1.z.object({
        primary: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/),
        secondary: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        accent: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        background: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        text: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }),
    dimensions: zod_1.z.object({
        width: zod_1.z.number().int().positive(),
        height: zod_1.z.number().int().positive(),
    }),
});
const miniVSLInputSchema = zod_1.z.object({
    script: zod_1.z.string().min(1),
    voiceId: zod_1.z.string().min(1),
    hookText: zod_1.z.string().min(1),
    productDemo: zod_1.z.string().url(),
    cta: zod_1.z.object({
        text: zod_1.z.string().min(1),
        url: zod_1.z.string().url().optional(),
        style: zod_1.z.enum(["button", "banner", "overlay"]).optional(),
    }),
    duration: zod_1.z.number().positive().max(120),
});
const beforeAfterInputSchema = zod_1.z.object({
    beforeImage: zod_1.z.string().url(),
    afterImage: zod_1.z.string().url(),
    transitionStyle: zod_1.z.enum(["slide", "fade", "wipe", "split"]),
});
// ---------------------------------------------------------------------------
// Template configs
// ---------------------------------------------------------------------------
const PCT_TEMPLATES = [
    {
        product: "pct",
        template: types_1.RenderTemplate.StaticAd,
        inputSchema: staticAdInputSchema,
        defaultProps: {
            format: "png",
            quality: 95,
        },
        outputFormat: "png",
    },
    {
        product: "pct",
        template: types_1.RenderTemplate.MiniVsl,
        inputSchema: miniVSLInputSchema,
        defaultProps: {
            fps: 30,
            width: 1080,
            height: 1920,
            codec: "h264",
        },
        outputFormat: "mp4",
    },
    {
        product: "pct",
        template: types_1.RenderTemplate.BeforeAfter,
        inputSchema: beforeAfterInputSchema,
        defaultProps: {
            fps: 30,
            width: 1080,
            height: 1080,
            durationInFrames: 150,
        },
        outputFormat: "mp4",
    },
];
// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
class PCTRemotionService {
    constructor(config) {
        this.apiUrl = config.apiUrl;
        this.apiKey = config.apiKey;
        this.timeout = config.timeout ?? 30000;
    }
    /**
     * Render a static ad image creative (RC-003).
     */
    async renderStaticAd(input) {
        const validated = staticAdInputSchema.parse(input);
        const templateConfig = PCT_TEMPLATES.find((t) => t.template === types_1.RenderTemplate.StaticAd);
        return this.submitRender(templateConfig, {
            ...validated,
            width: validated.dimensions.width,
            height: validated.dimensions.height,
        });
    }
    /**
     * Render a mini-VSL (Video Sales Letter) video (RC-004).
     */
    async renderMiniVSL(input) {
        const validated = miniVSLInputSchema.parse(input);
        const templateConfig = PCT_TEMPLATES.find((t) => t.template === types_1.RenderTemplate.MiniVsl);
        return this.submitRender(templateConfig, {
            ...validated,
            durationInFrames: Math.round(validated.duration * 30),
        });
    }
    /**
     * Render a before/after comparison video.
     */
    async renderBeforeAfter(input) {
        const validated = beforeAfterInputSchema.parse(input);
        const templateConfig = PCT_TEMPLATES.find((t) => t.template === types_1.RenderTemplate.BeforeAfter);
        return this.submitRender(templateConfig, validated);
    }
    /**
     * Get all standard ad dimensions with platform metadata.
     */
    getAdDimensions() {
        return [...AD_DIMENSIONS];
    }
    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------
    async submitRender(templateConfig, inputProps) {
        const isStatic = templateConfig.outputFormat === "png" ||
            templateConfig.outputFormat === "jpeg";
        const endpoint = isStatic ? "/v1/render/static" : "/v1/render/video";
        const body = {
            compositionId: templateConfig.template,
            inputProps: {
                ...templateConfig.defaultProps,
                ...inputProps,
            },
            outputFormat: templateConfig.outputFormat,
            metadata: {
                product: templateConfig.product,
                template: templateConfig.template,
            },
        };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(`${this.apiUrl}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Remotion API error (${response.status}): ${errorBody}`);
            }
            return (await response.json());
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
}
exports.PCTRemotionService = PCTRemotionService;
//# sourceMappingURL=pct.js.map