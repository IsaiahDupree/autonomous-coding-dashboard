"use strict";
/**
 * Content Factory Remotion Integration (RC-002)
 *
 * Provides a service layer for the Content Factory product to render UGC videos,
 * product showcases, and testimonials through the Remotion API.
 *
 * All inputs are validated with Zod schemas before being submitted to the API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentFactoryRemotionService = void 0;
const zod_1 = require("zod");
const types_1 = require("./types");
// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------
const ugcVideoInputSchema = zod_1.z.object({
    scriptId: zod_1.z.string().min(1),
    voiceId: zod_1.z.string().min(1),
    templateId: zod_1.z.string().min(1),
    productImages: zod_1.z.array(zod_1.z.string().url()).min(1),
    music: zod_1.z.string().url().optional(),
    captions: zod_1.z
        .object({
        enabled: zod_1.z.boolean(),
        style: zod_1.z.enum(["word-by-word", "sentence", "paragraph"]).optional(),
        position: zod_1.z.enum(["top", "center", "bottom"]).optional(),
    })
        .optional(),
});
const productShowcaseInputSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1),
    images: zod_1.z.array(zod_1.z.string().url()).min(1),
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().min(1),
    style: zod_1.z.enum(["minimal", "bold", "elegant", "playful", "corporate"]),
});
const testimonialInputSchema = zod_1.z.object({
    testimonialId: zod_1.z.string().min(1),
    customerName: zod_1.z.string().min(1),
    quote: zod_1.z.string().min(1),
    rating: zod_1.z.number().int().min(1).max(5),
    avatar: zod_1.z.string().url().optional(),
});
// ---------------------------------------------------------------------------
// Template configs
// ---------------------------------------------------------------------------
const CONTENT_FACTORY_TEMPLATES = [
    {
        product: "content-factory",
        template: types_1.RenderTemplate.UgcVideo,
        inputSchema: ugcVideoInputSchema,
        defaultProps: {
            fps: 30,
            width: 1080,
            height: 1920,
            durationInFrames: 900,
        },
        outputFormat: "mp4",
    },
    {
        product: "content-factory",
        template: types_1.RenderTemplate.ProductShowcase,
        inputSchema: productShowcaseInputSchema,
        defaultProps: {
            fps: 30,
            width: 1080,
            height: 1080,
            durationInFrames: 300,
        },
        outputFormat: "mp4",
    },
    {
        product: "content-factory",
        template: types_1.RenderTemplate.Testimonial,
        inputSchema: testimonialInputSchema,
        defaultProps: {
            fps: 30,
            width: 1080,
            height: 1080,
            durationInFrames: 450,
        },
        outputFormat: "mp4",
    },
];
// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
class ContentFactoryRemotionService {
    constructor(config) {
        this.apiUrl = config.apiUrl;
        this.apiKey = config.apiKey;
        this.timeout = config.timeout ?? 30000;
    }
    /**
     * Render a UGC (user-generated content) video from a script, voice, and
     * product images.
     */
    async renderUGCVideo(input) {
        const validated = ugcVideoInputSchema.parse(input);
        const templateConfig = CONTENT_FACTORY_TEMPLATES.find((t) => t.template === types_1.RenderTemplate.UgcVideo);
        return this.submitRender(templateConfig, validated);
    }
    /**
     * Render a product showcase video from product images and copy.
     */
    async renderProductShowcase(input) {
        const validated = productShowcaseInputSchema.parse(input);
        const templateConfig = CONTENT_FACTORY_TEMPLATES.find((t) => t.template === types_1.RenderTemplate.ProductShowcase);
        return this.submitRender(templateConfig, validated);
    }
    /**
     * Render a testimonial video from customer review data.
     */
    async renderTestimonial(input) {
        const validated = testimonialInputSchema.parse(input);
        const templateConfig = CONTENT_FACTORY_TEMPLATES.find((t) => t.template === types_1.RenderTemplate.Testimonial);
        return this.submitRender(templateConfig, validated);
    }
    /**
     * Get all Content Factory specific Remotion templates.
     */
    getTemplates() {
        return [...CONTENT_FACTORY_TEMPLATES];
    }
    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------
    async submitRender(templateConfig, inputProps) {
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
            const response = await fetch(`${this.apiUrl}/v1/render/video`, {
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
exports.ContentFactoryRemotionService = ContentFactoryRemotionService;
//# sourceMappingURL=content-factory.js.map