/**
 * Content Factory Remotion Integration (RC-002)
 *
 * Provides a service layer for the Content Factory product to render UGC videos,
 * product showcases, and testimonials through the Remotion API.
 *
 * All inputs are validated with Zod schemas before being submitted to the API.
 */
import { z } from "zod";
import { RenderJob, ProductRenderConfig, RemotionServiceConfig } from "./types";
declare const ugcVideoInputSchema: z.ZodObject<{
    scriptId: z.ZodString;
    voiceId: z.ZodString;
    templateId: z.ZodString;
    productImages: z.ZodArray<z.ZodString, "many">;
    music: z.ZodOptional<z.ZodString>;
    captions: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        style: z.ZodOptional<z.ZodEnum<["word-by-word", "sentence", "paragraph"]>>;
        position: z.ZodOptional<z.ZodEnum<["top", "center", "bottom"]>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        style?: "word-by-word" | "sentence" | "paragraph" | undefined;
        position?: "top" | "center" | "bottom" | undefined;
    }, {
        enabled: boolean;
        style?: "word-by-word" | "sentence" | "paragraph" | undefined;
        position?: "top" | "center" | "bottom" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    scriptId: string;
    voiceId: string;
    templateId: string;
    productImages: string[];
    music?: string | undefined;
    captions?: {
        enabled: boolean;
        style?: "word-by-word" | "sentence" | "paragraph" | undefined;
        position?: "top" | "center" | "bottom" | undefined;
    } | undefined;
}, {
    scriptId: string;
    voiceId: string;
    templateId: string;
    productImages: string[];
    music?: string | undefined;
    captions?: {
        enabled: boolean;
        style?: "word-by-word" | "sentence" | "paragraph" | undefined;
        position?: "top" | "center" | "bottom" | undefined;
    } | undefined;
}>;
export type UGCVideoInput = z.infer<typeof ugcVideoInputSchema>;
declare const productShowcaseInputSchema: z.ZodObject<{
    productId: z.ZodString;
    images: z.ZodArray<z.ZodString, "many">;
    title: z.ZodString;
    description: z.ZodString;
    style: z.ZodEnum<["minimal", "bold", "elegant", "playful", "corporate"]>;
}, "strip", z.ZodTypeAny, {
    style: "minimal" | "bold" | "elegant" | "playful" | "corporate";
    productId: string;
    images: string[];
    title: string;
    description: string;
}, {
    style: "minimal" | "bold" | "elegant" | "playful" | "corporate";
    productId: string;
    images: string[];
    title: string;
    description: string;
}>;
export type ProductShowcaseInput = z.infer<typeof productShowcaseInputSchema>;
declare const testimonialInputSchema: z.ZodObject<{
    testimonialId: z.ZodString;
    customerName: z.ZodString;
    quote: z.ZodString;
    rating: z.ZodNumber;
    avatar: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    testimonialId: string;
    customerName: string;
    quote: string;
    rating: number;
    avatar?: string | undefined;
}, {
    testimonialId: string;
    customerName: string;
    quote: string;
    rating: number;
    avatar?: string | undefined;
}>;
export type TestimonialInput = z.infer<typeof testimonialInputSchema>;
export declare class ContentFactoryRemotionService {
    private readonly apiUrl;
    private readonly apiKey;
    private readonly timeout;
    constructor(config: RemotionServiceConfig);
    /**
     * Render a UGC (user-generated content) video from a script, voice, and
     * product images.
     */
    renderUGCVideo(input: UGCVideoInput): Promise<RenderJob>;
    /**
     * Render a product showcase video from product images and copy.
     */
    renderProductShowcase(input: ProductShowcaseInput): Promise<RenderJob>;
    /**
     * Render a testimonial video from customer review data.
     */
    renderTestimonial(input: TestimonialInput): Promise<RenderJob>;
    /**
     * Get all Content Factory specific Remotion templates.
     */
    getTemplates(): ProductRenderConfig[];
    private submitRender;
}
export {};
//# sourceMappingURL=content-factory.d.ts.map