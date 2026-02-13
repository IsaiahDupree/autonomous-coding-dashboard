/**
 * MediaPoster Remotion Integration (RC-005)
 *
 * Provides rendering services for the MediaPoster product, which handles
 * social media video content creation. Supports platform-specific video
 * rendering (Instagram, TikTok, YouTube), carousels, and story formats.
 */
import { z } from "zod";
import { RenderJob, RemotionServiceConfig } from "./types";
declare const socialVideoInputSchema: z.ZodObject<{
    contentId: z.ZodString;
    platform: z.ZodEnum<["instagram", "tiktok", "youtube"]>;
    aspectRatio: z.ZodEnum<["1:1", "4:5", "9:16", "16:9"]>;
    overlayText: z.ZodOptional<z.ZodObject<{
        text: z.ZodString;
        position: z.ZodOptional<z.ZodEnum<["top", "center", "bottom"]>>;
        fontSize: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        position?: "top" | "center" | "bottom" | undefined;
        fontSize?: number | undefined;
        color?: string | undefined;
    }, {
        text: string;
        position?: "top" | "center" | "bottom" | undefined;
        fontSize?: number | undefined;
        color?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    contentId: string;
    platform: "instagram" | "tiktok" | "youtube";
    aspectRatio: "1:1" | "9:16" | "16:9" | "4:5";
    overlayText?: {
        text: string;
        position?: "top" | "center" | "bottom" | undefined;
        fontSize?: number | undefined;
        color?: string | undefined;
    } | undefined;
}, {
    contentId: string;
    platform: "instagram" | "tiktok" | "youtube";
    aspectRatio: "1:1" | "9:16" | "16:9" | "4:5";
    overlayText?: {
        text: string;
        position?: "top" | "center" | "bottom" | undefined;
        fontSize?: number | undefined;
        color?: string | undefined;
    } | undefined;
}>;
export type SocialVideoInput = z.infer<typeof socialVideoInputSchema>;
declare const carouselInputSchema: z.ZodObject<{
    slides: z.ZodArray<z.ZodObject<{
        image: z.ZodString;
        caption: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        image: string;
        caption: string;
    }, {
        image: string;
        caption: string;
    }>, "many">;
    transition: z.ZodEnum<["slide", "fade", "zoom", "flip"]>;
    music: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    slides: {
        image: string;
        caption: string;
    }[];
    transition: "slide" | "fade" | "zoom" | "flip";
    music?: string | undefined;
}, {
    slides: {
        image: string;
        caption: string;
    }[];
    transition: "slide" | "fade" | "zoom" | "flip";
    music?: string | undefined;
}>;
export type CarouselInput = z.infer<typeof carouselInputSchema>;
declare const storyInputSchema: z.ZodObject<{
    segments: z.ZodArray<z.ZodObject<{
        media: z.ZodString;
        duration: z.ZodNumber;
        text: z.ZodOptional<z.ZodObject<{
            content: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<["top", "center", "bottom"]>>;
            style: z.ZodOptional<z.ZodEnum<["default", "neon", "typewriter", "bold"]>>;
        }, "strip", z.ZodTypeAny, {
            content: string;
            style?: "bold" | "default" | "neon" | "typewriter" | undefined;
            position?: "top" | "center" | "bottom" | undefined;
        }, {
            content: string;
            style?: "bold" | "default" | "neon" | "typewriter" | undefined;
            position?: "top" | "center" | "bottom" | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        media: string;
        text?: {
            content: string;
            style?: "bold" | "default" | "neon" | "typewriter" | undefined;
            position?: "top" | "center" | "bottom" | undefined;
        } | undefined;
    }, {
        duration: number;
        media: string;
        text?: {
            content: string;
            style?: "bold" | "default" | "neon" | "typewriter" | undefined;
            position?: "top" | "center" | "bottom" | undefined;
        } | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    segments: {
        duration: number;
        media: string;
        text?: {
            content: string;
            style?: "bold" | "default" | "neon" | "typewriter" | undefined;
            position?: "top" | "center" | "bottom" | undefined;
        } | undefined;
    }[];
}, {
    segments: {
        duration: number;
        media: string;
        text?: {
            content: string;
            style?: "bold" | "default" | "neon" | "typewriter" | undefined;
            position?: "top" | "center" | "bottom" | undefined;
        } | undefined;
    }[];
}>;
export type StoryInput = z.infer<typeof storyInputSchema>;
export declare class MediaPosterRemotionService {
    private readonly apiUrl;
    private readonly apiKey;
    private readonly timeout;
    constructor(config: RemotionServiceConfig);
    /**
     * Render a social video optimized for a specific platform and aspect ratio.
     */
    renderSocialVideo(input: SocialVideoInput): Promise<RenderJob>;
    /**
     * Render a carousel video from multiple image/caption slides with
     * configurable transitions and optional background music.
     */
    renderCarousel(input: CarouselInput): Promise<RenderJob>;
    /**
     * Render a story-format video composed of multiple timed segments,
     * each with their own media and optional text overlays.
     */
    renderStory(input: StoryInput): Promise<RenderJob>;
    private submitRender;
}
export {};
//# sourceMappingURL=mediaposter.d.ts.map