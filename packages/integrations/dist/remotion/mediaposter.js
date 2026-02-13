"use strict";
/**
 * MediaPoster Remotion Integration (RC-005)
 *
 * Provides rendering services for the MediaPoster product, which handles
 * social media video content creation. Supports platform-specific video
 * rendering (Instagram, TikTok, YouTube), carousels, and story formats.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaPosterRemotionService = void 0;
const zod_1 = require("zod");
const types_1 = require("./types");
// ---------------------------------------------------------------------------
// Platform aspect ratio mappings
// ---------------------------------------------------------------------------
const PLATFORM_ASPECT_RATIOS = {
    "instagram:1:1": { width: 1080, height: 1080 },
    "instagram:4:5": { width: 1080, height: 1350 },
    "instagram:9:16": { width: 1080, height: 1920 },
    "tiktok:9:16": { width: 1080, height: 1920 },
    "youtube:16:9": { width: 1920, height: 1080 },
    "youtube:9:16": { width: 1080, height: 1920 },
};
// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------
const socialVideoInputSchema = zod_1.z.object({
    contentId: zod_1.z.string().min(1),
    platform: zod_1.z.enum(["instagram", "tiktok", "youtube"]),
    aspectRatio: zod_1.z.enum(["1:1", "4:5", "9:16", "16:9"]),
    overlayText: zod_1.z
        .object({
        text: zod_1.z.string(),
        position: zod_1.z.enum(["top", "center", "bottom"]).optional(),
        fontSize: zod_1.z.number().positive().optional(),
        color: zod_1.z.string().optional(),
    })
        .optional(),
});
const carouselSlideSchema = zod_1.z.object({
    image: zod_1.z.string().url(),
    caption: zod_1.z.string(),
});
const carouselInputSchema = zod_1.z.object({
    slides: zod_1.z.array(carouselSlideSchema).min(2).max(20),
    transition: zod_1.z.enum(["slide", "fade", "zoom", "flip"]),
    music: zod_1.z.string().url().optional(),
});
const storySegmentSchema = zod_1.z.object({
    media: zod_1.z.string().url(),
    duration: zod_1.z.number().positive().max(15),
    text: zod_1.z
        .object({
        content: zod_1.z.string(),
        position: zod_1.z.enum(["top", "center", "bottom"]).optional(),
        style: zod_1.z.enum(["default", "neon", "typewriter", "bold"]).optional(),
    })
        .optional(),
});
const storyInputSchema = zod_1.z.object({
    segments: zod_1.z.array(storySegmentSchema).min(1).max(10),
});
// ---------------------------------------------------------------------------
// Template configs
// ---------------------------------------------------------------------------
const MEDIAPOSTER_TEMPLATES = [
    {
        product: "mediaposter",
        template: types_1.RenderTemplate.SocialPost,
        inputSchema: socialVideoInputSchema,
        defaultProps: {
            fps: 30,
            codec: "h264",
        },
        outputFormat: "mp4",
    },
    {
        product: "mediaposter",
        template: types_1.RenderTemplate.UgcVideo,
        inputSchema: carouselInputSchema,
        defaultProps: {
            fps: 30,
            width: 1080,
            height: 1080,
            slideDurationFrames: 90,
        },
        outputFormat: "mp4",
    },
];
// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
class MediaPosterRemotionService {
    constructor(config) {
        this.apiUrl = config.apiUrl;
        this.apiKey = config.apiKey;
        this.timeout = config.timeout ?? 30000;
    }
    /**
     * Render a social video optimized for a specific platform and aspect ratio.
     */
    async renderSocialVideo(input) {
        const validated = socialVideoInputSchema.parse(input);
        const dimensionKey = `${validated.platform}:${validated.aspectRatio}`;
        const dimensions = PLATFORM_ASPECT_RATIOS[dimensionKey] ?? {
            width: 1080,
            height: 1080,
        };
        const templateConfig = MEDIAPOSTER_TEMPLATES.find((t) => t.template === types_1.RenderTemplate.SocialPost);
        return this.submitRender(templateConfig, {
            ...validated,
            width: dimensions.width,
            height: dimensions.height,
        });
    }
    /**
     * Render a carousel video from multiple image/caption slides with
     * configurable transitions and optional background music.
     */
    async renderCarousel(input) {
        const validated = carouselInputSchema.parse(input);
        const templateConfig = MEDIAPOSTER_TEMPLATES.find((t) => t.template === types_1.RenderTemplate.UgcVideo);
        const totalFrames = validated.slides.length * 90;
        return this.submitRender(templateConfig, {
            ...validated,
            durationInFrames: totalFrames,
        });
    }
    /**
     * Render a story-format video composed of multiple timed segments,
     * each with their own media and optional text overlays.
     */
    async renderStory(input) {
        const validated = storyInputSchema.parse(input);
        const totalDuration = validated.segments.reduce((sum, seg) => sum + seg.duration, 0);
        const totalFrames = Math.round(totalDuration * 30);
        return this.submitRender({
            product: "mediaposter",
            template: types_1.RenderTemplate.SocialPost,
            inputSchema: storyInputSchema,
            defaultProps: {
                fps: 30,
                width: 1080,
                height: 1920,
            },
            outputFormat: "mp4",
        }, {
            ...validated,
            compositionType: "story",
            durationInFrames: totalFrames,
        });
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
exports.MediaPosterRemotionService = MediaPosterRemotionService;
//# sourceMappingURL=mediaposter.js.map