/**
 * WaitlistLab Remotion Integration (RC-006)
 *
 * Provides rendering services for the WaitlistLab product, which focuses on
 * ad creative generation for waitlist / launch campaigns. Supports rendering
 * individual ad creatives as well as generating A/B test variations
 * automatically from a base creative.
 */
import { z } from "zod";
import { RenderJob, RemotionServiceConfig } from "./types";
declare const adCreativeInputSchema: z.ZodObject<{
    campaignId: z.ZodString;
    adSetId: z.ZodString;
    creativeType: z.ZodEnum<["static_image", "video_ad", "carousel", "story", "collection"]>;
    copy: z.ZodObject<{
        headline: z.ZodString;
        body: z.ZodString;
        cta: z.ZodString;
        disclaimer: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        headline: string;
        cta: string;
        body: string;
        disclaimer?: string | undefined;
    }, {
        headline: string;
        cta: string;
        body: string;
        disclaimer?: string | undefined;
    }>;
    media: z.ZodObject<{
        primary: z.ZodString;
        secondary: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        logo: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        primary: string;
        secondary?: string[] | undefined;
        logo?: string | undefined;
    }, {
        primary: string;
        secondary?: string[] | undefined;
        logo?: string | undefined;
    }>;
    cta: z.ZodObject<{
        text: z.ZodString;
        url: z.ZodOptional<z.ZodString>;
        style: z.ZodOptional<z.ZodEnum<["button", "banner", "text-link"]>>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        url?: string | undefined;
        style?: "button" | "banner" | "text-link" | undefined;
    }, {
        text: string;
        url?: string | undefined;
        style?: "button" | "banner" | "text-link" | undefined;
    }>;
    targetPlatform: z.ZodEnum<["facebook", "instagram", "tiktok", "google", "linkedin", "twitter", "snapchat"]>;
}, "strip", z.ZodTypeAny, {
    cta: {
        text: string;
        url?: string | undefined;
        style?: "button" | "banner" | "text-link" | undefined;
    };
    media: {
        primary: string;
        secondary?: string[] | undefined;
        logo?: string | undefined;
    };
    campaignId: string;
    adSetId: string;
    creativeType: "story" | "static_image" | "video_ad" | "carousel" | "collection";
    copy: {
        headline: string;
        cta: string;
        body: string;
        disclaimer?: string | undefined;
    };
    targetPlatform: "instagram" | "facebook" | "twitter" | "tiktok" | "snapchat" | "linkedin" | "google";
}, {
    cta: {
        text: string;
        url?: string | undefined;
        style?: "button" | "banner" | "text-link" | undefined;
    };
    media: {
        primary: string;
        secondary?: string[] | undefined;
        logo?: string | undefined;
    };
    campaignId: string;
    adSetId: string;
    creativeType: "story" | "static_image" | "video_ad" | "carousel" | "collection";
    copy: {
        headline: string;
        cta: string;
        body: string;
        disclaimer?: string | undefined;
    };
    targetPlatform: "instagram" | "facebook" | "twitter" | "tiktok" | "snapchat" | "linkedin" | "google";
}>;
export type AdCreativeInput = z.infer<typeof adCreativeInputSchema>;
declare const variationsInputSchema: z.ZodObject<{
    baseCreative: z.ZodObject<{
        campaignId: z.ZodString;
        adSetId: z.ZodString;
        creativeType: z.ZodEnum<["static_image", "video_ad", "carousel", "story", "collection"]>;
        copy: z.ZodObject<{
            headline: z.ZodString;
            body: z.ZodString;
            cta: z.ZodString;
            disclaimer: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            headline: string;
            cta: string;
            body: string;
            disclaimer?: string | undefined;
        }, {
            headline: string;
            cta: string;
            body: string;
            disclaimer?: string | undefined;
        }>;
        media: z.ZodObject<{
            primary: z.ZodString;
            secondary: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            logo: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            primary: string;
            secondary?: string[] | undefined;
            logo?: string | undefined;
        }, {
            primary: string;
            secondary?: string[] | undefined;
            logo?: string | undefined;
        }>;
        cta: z.ZodObject<{
            text: z.ZodString;
            url: z.ZodOptional<z.ZodString>;
            style: z.ZodOptional<z.ZodEnum<["button", "banner", "text-link"]>>;
        }, "strip", z.ZodTypeAny, {
            text: string;
            url?: string | undefined;
            style?: "button" | "banner" | "text-link" | undefined;
        }, {
            text: string;
            url?: string | undefined;
            style?: "button" | "banner" | "text-link" | undefined;
        }>;
        targetPlatform: z.ZodEnum<["facebook", "instagram", "tiktok", "google", "linkedin", "twitter", "snapchat"]>;
    }, "strip", z.ZodTypeAny, {
        cta: {
            text: string;
            url?: string | undefined;
            style?: "button" | "banner" | "text-link" | undefined;
        };
        media: {
            primary: string;
            secondary?: string[] | undefined;
            logo?: string | undefined;
        };
        campaignId: string;
        adSetId: string;
        creativeType: "story" | "static_image" | "video_ad" | "carousel" | "collection";
        copy: {
            headline: string;
            cta: string;
            body: string;
            disclaimer?: string | undefined;
        };
        targetPlatform: "instagram" | "facebook" | "twitter" | "tiktok" | "snapchat" | "linkedin" | "google";
    }, {
        cta: {
            text: string;
            url?: string | undefined;
            style?: "button" | "banner" | "text-link" | undefined;
        };
        media: {
            primary: string;
            secondary?: string[] | undefined;
            logo?: string | undefined;
        };
        campaignId: string;
        adSetId: string;
        creativeType: "story" | "static_image" | "video_ad" | "carousel" | "collection";
        copy: {
            headline: string;
            cta: string;
            body: string;
            disclaimer?: string | undefined;
        };
        targetPlatform: "instagram" | "facebook" | "twitter" | "tiktok" | "snapchat" | "linkedin" | "google";
    }>;
    variations: z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        values: z.ZodArray<z.ZodUnknown, "many">;
    }, "strip", z.ZodTypeAny, {
        values: unknown[];
        field: string;
    }, {
        values: unknown[];
        field: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    baseCreative: {
        cta: {
            text: string;
            url?: string | undefined;
            style?: "button" | "banner" | "text-link" | undefined;
        };
        media: {
            primary: string;
            secondary?: string[] | undefined;
            logo?: string | undefined;
        };
        campaignId: string;
        adSetId: string;
        creativeType: "story" | "static_image" | "video_ad" | "carousel" | "collection";
        copy: {
            headline: string;
            cta: string;
            body: string;
            disclaimer?: string | undefined;
        };
        targetPlatform: "instagram" | "facebook" | "twitter" | "tiktok" | "snapchat" | "linkedin" | "google";
    };
    variations: {
        values: unknown[];
        field: string;
    }[];
}, {
    baseCreative: {
        cta: {
            text: string;
            url?: string | undefined;
            style?: "button" | "banner" | "text-link" | undefined;
        };
        media: {
            primary: string;
            secondary?: string[] | undefined;
            logo?: string | undefined;
        };
        campaignId: string;
        adSetId: string;
        creativeType: "story" | "static_image" | "video_ad" | "carousel" | "collection";
        copy: {
            headline: string;
            cta: string;
            body: string;
            disclaimer?: string | undefined;
        };
        targetPlatform: "instagram" | "facebook" | "twitter" | "tiktok" | "snapchat" | "linkedin" | "google";
    };
    variations: {
        values: unknown[];
        field: string;
    }[];
}>;
export type VariationsInput = z.infer<typeof variationsInputSchema>;
export declare class WaitlistLabRemotionService {
    private readonly apiUrl;
    private readonly apiKey;
    private readonly timeout;
    constructor(config: RemotionServiceConfig);
    /**
     * Render a single ad creative for a campaign.
     */
    renderAdCreative(input: AdCreativeInput): Promise<RenderJob>;
    /**
     * Generate A/B test variations from a base creative by permuting the
     * specified fields with their alternative values. Each combination
     * produces a separate render job.
     */
    renderVariations(input: VariationsInput): Promise<RenderJob[]>;
    /**
     * Generate all possible combinations of variation values.
     *
     * Given variations: [{ field: "headline", values: ["A", "B"] }, { field: "color", values: ["red", "blue"] }]
     * Returns: [{ headline: "A", color: "red" }, { headline: "A", color: "blue" }, ...]
     */
    private generateCombinations;
    /**
     * Apply a variation combination to a base creative by setting fields
     * at dot-separated paths. Supports top-level and nested fields like
     * "copy.headline" or "cta.text".
     */
    private applyVariation;
    private postToApi;
}
export {};
//# sourceMappingURL=waitlistlab.d.ts.map