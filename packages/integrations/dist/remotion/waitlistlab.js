"use strict";
/**
 * WaitlistLab Remotion Integration (RC-006)
 *
 * Provides rendering services for the WaitlistLab product, which focuses on
 * ad creative generation for waitlist / launch campaigns. Supports rendering
 * individual ad creatives as well as generating A/B test variations
 * automatically from a base creative.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaitlistLabRemotionService = void 0;
const zod_1 = require("zod");
const types_1 = require("./types");
// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------
const adCreativeInputSchema = zod_1.z.object({
    campaignId: zod_1.z.string().min(1),
    adSetId: zod_1.z.string().min(1),
    creativeType: zod_1.z.enum([
        "static_image",
        "video_ad",
        "carousel",
        "story",
        "collection",
    ]),
    copy: zod_1.z.object({
        headline: zod_1.z.string().min(1),
        body: zod_1.z.string().min(1),
        cta: zod_1.z.string().min(1),
        disclaimer: zod_1.z.string().optional(),
    }),
    media: zod_1.z.object({
        primary: zod_1.z.string().url(),
        secondary: zod_1.z.array(zod_1.z.string().url()).optional(),
        logo: zod_1.z.string().url().optional(),
    }),
    cta: zod_1.z.object({
        text: zod_1.z.string().min(1),
        url: zod_1.z.string().url().optional(),
        style: zod_1.z.enum(["button", "banner", "text-link"]).optional(),
    }),
    targetPlatform: zod_1.z.enum([
        "facebook",
        "instagram",
        "tiktok",
        "google",
        "linkedin",
        "twitter",
        "snapchat",
    ]),
});
const variationFieldSchema = zod_1.z.object({
    field: zod_1.z.string().min(1),
    values: zod_1.z.array(zod_1.z.unknown()).min(2),
});
const variationsInputSchema = zod_1.z.object({
    baseCreative: adCreativeInputSchema,
    variations: zod_1.z.array(variationFieldSchema).min(1),
});
// ---------------------------------------------------------------------------
// Platform dimension defaults
// ---------------------------------------------------------------------------
const PLATFORM_DEFAULTS = {
    facebook: { width: 1200, height: 628, format: "png" },
    instagram: { width: 1080, height: 1080, format: "png" },
    tiktok: { width: 1080, height: 1920, format: "mp4" },
    google: { width: 1200, height: 628, format: "png" },
    linkedin: { width: 1200, height: 628, format: "png" },
    twitter: { width: 1200, height: 675, format: "png" },
    snapchat: { width: 1080, height: 1920, format: "mp4" },
};
// ---------------------------------------------------------------------------
// Template config
// ---------------------------------------------------------------------------
const WAITLISTLAB_TEMPLATE = {
    product: "waitlistlab",
    template: types_1.RenderTemplate.StaticAd,
    inputSchema: adCreativeInputSchema,
    defaultProps: {
        quality: 95,
    },
    outputFormat: "png",
};
// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
class WaitlistLabRemotionService {
    constructor(config) {
        this.apiUrl = config.apiUrl;
        this.apiKey = config.apiKey;
        this.timeout = config.timeout ?? 30000;
    }
    /**
     * Render a single ad creative for a campaign.
     */
    async renderAdCreative(input) {
        const validated = adCreativeInputSchema.parse(input);
        const platformDefaults = PLATFORM_DEFAULTS[validated.targetPlatform] ?? {
            width: 1080,
            height: 1080,
            format: "png",
        };
        const isVideo = validated.creativeType === "video_ad" ||
            validated.creativeType === "story" ||
            platformDefaults.format === "mp4";
        const endpoint = isVideo ? "/v1/render/video" : "/v1/render/static";
        const template = isVideo
            ? types_1.RenderTemplate.SocialPost
            : types_1.RenderTemplate.StaticAd;
        const body = {
            compositionId: template,
            inputProps: {
                ...WAITLISTLAB_TEMPLATE.defaultProps,
                ...validated,
                width: platformDefaults.width,
                height: platformDefaults.height,
            },
            outputFormat: platformDefaults.format,
            metadata: {
                product: "waitlistlab",
                template,
                campaignId: validated.campaignId,
                adSetId: validated.adSetId,
            },
        };
        return this.postToApi(endpoint, body);
    }
    /**
     * Generate A/B test variations from a base creative by permuting the
     * specified fields with their alternative values. Each combination
     * produces a separate render job.
     */
    async renderVariations(input) {
        const validated = variationsInputSchema.parse(input);
        // Generate all combinations of variation values
        const combinations = this.generateCombinations(validated.variations);
        const renderPromises = combinations.map(async (combo) => {
            // Deep-merge variation values into the base creative
            const creativeInput = this.applyVariation(validated.baseCreative, combo);
            return this.renderAdCreative(creativeInput);
        });
        return Promise.all(renderPromises);
    }
    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------
    /**
     * Generate all possible combinations of variation values.
     *
     * Given variations: [{ field: "headline", values: ["A", "B"] }, { field: "color", values: ["red", "blue"] }]
     * Returns: [{ headline: "A", color: "red" }, { headline: "A", color: "blue" }, ...]
     */
    generateCombinations(variations) {
        if (variations.length === 0)
            return [{}];
        const [first, ...rest] = variations;
        const restCombinations = this.generateCombinations(rest);
        const results = [];
        for (const value of first.values) {
            for (const combo of restCombinations) {
                results.push({ [first.field]: value, ...combo });
            }
        }
        return results;
    }
    /**
     * Apply a variation combination to a base creative by setting fields
     * at dot-separated paths. Supports top-level and nested fields like
     * "copy.headline" or "cta.text".
     */
    applyVariation(base, variation) {
        const result = JSON.parse(JSON.stringify(base));
        for (const [path, value] of Object.entries(variation)) {
            const parts = path.split(".");
            let target = result;
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (typeof target[part] === "object" &&
                    target[part] !== null) {
                    target = target[part];
                }
            }
            target[parts[parts.length - 1]] = value;
        }
        return result;
    }
    async postToApi(endpoint, body) {
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
exports.WaitlistLabRemotionService = WaitlistLabRemotionService;
//# sourceMappingURL=waitlistlab.js.map