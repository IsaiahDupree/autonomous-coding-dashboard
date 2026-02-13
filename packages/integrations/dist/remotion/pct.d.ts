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
import { z } from "zod";
import { RenderJob, RemotionServiceConfig } from "./types";
export interface AdDimension {
    name: string;
    width: number;
    height: number;
    aspectRatio: string;
    platforms: string[];
}
declare const staticAdInputSchema: z.ZodObject<{
    adCopy: z.ZodString;
    headline: z.ZodString;
    ctaText: z.ZodString;
    productImage: z.ZodString;
    brandColors: z.ZodObject<{
        primary: z.ZodString;
        secondary: z.ZodOptional<z.ZodString>;
        accent: z.ZodOptional<z.ZodString>;
        background: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        primary: string;
        secondary?: string | undefined;
        accent?: string | undefined;
        background?: string | undefined;
        text?: string | undefined;
    }, {
        primary: string;
        secondary?: string | undefined;
        accent?: string | undefined;
        background?: string | undefined;
        text?: string | undefined;
    }>;
    dimensions: z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>;
}, "strip", z.ZodTypeAny, {
    adCopy: string;
    headline: string;
    ctaText: string;
    productImage: string;
    brandColors: {
        primary: string;
        secondary?: string | undefined;
        accent?: string | undefined;
        background?: string | undefined;
        text?: string | undefined;
    };
    dimensions: {
        width: number;
        height: number;
    };
}, {
    adCopy: string;
    headline: string;
    ctaText: string;
    productImage: string;
    brandColors: {
        primary: string;
        secondary?: string | undefined;
        accent?: string | undefined;
        background?: string | undefined;
        text?: string | undefined;
    };
    dimensions: {
        width: number;
        height: number;
    };
}>;
export type StaticAdInput = z.infer<typeof staticAdInputSchema>;
declare const miniVSLInputSchema: z.ZodObject<{
    script: z.ZodString;
    voiceId: z.ZodString;
    hookText: z.ZodString;
    productDemo: z.ZodString;
    cta: z.ZodObject<{
        text: z.ZodString;
        url: z.ZodOptional<z.ZodString>;
        style: z.ZodOptional<z.ZodEnum<["button", "banner", "overlay"]>>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        url?: string | undefined;
        style?: "button" | "banner" | "overlay" | undefined;
    }, {
        text: string;
        url?: string | undefined;
        style?: "button" | "banner" | "overlay" | undefined;
    }>;
    duration: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    voiceId: string;
    script: string;
    hookText: string;
    productDemo: string;
    cta: {
        text: string;
        url?: string | undefined;
        style?: "button" | "banner" | "overlay" | undefined;
    };
    duration: number;
}, {
    voiceId: string;
    script: string;
    hookText: string;
    productDemo: string;
    cta: {
        text: string;
        url?: string | undefined;
        style?: "button" | "banner" | "overlay" | undefined;
    };
    duration: number;
}>;
export type MiniVSLInput = z.infer<typeof miniVSLInputSchema>;
declare const beforeAfterInputSchema: z.ZodObject<{
    beforeImage: z.ZodString;
    afterImage: z.ZodString;
    transitionStyle: z.ZodEnum<["slide", "fade", "wipe", "split"]>;
}, "strip", z.ZodTypeAny, {
    beforeImage: string;
    afterImage: string;
    transitionStyle: "slide" | "fade" | "wipe" | "split";
}, {
    beforeImage: string;
    afterImage: string;
    transitionStyle: "slide" | "fade" | "wipe" | "split";
}>;
export type BeforeAfterInput = z.infer<typeof beforeAfterInputSchema>;
export declare class PCTRemotionService {
    private readonly apiUrl;
    private readonly apiKey;
    private readonly timeout;
    constructor(config: RemotionServiceConfig);
    /**
     * Render a static ad image creative (RC-003).
     */
    renderStaticAd(input: StaticAdInput): Promise<RenderJob>;
    /**
     * Render a mini-VSL (Video Sales Letter) video (RC-004).
     */
    renderMiniVSL(input: MiniVSLInput): Promise<RenderJob>;
    /**
     * Render a before/after comparison video.
     */
    renderBeforeAfter(input: BeforeAfterInput): Promise<RenderJob>;
    /**
     * Get all standard ad dimensions with platform metadata.
     */
    getAdDimensions(): AdDimension[];
    private submitRender;
}
export {};
//# sourceMappingURL=pct.d.ts.map