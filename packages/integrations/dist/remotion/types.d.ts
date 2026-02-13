/**
 * Shared types and schemas for product-specific Remotion integrations.
 *
 * These types are used across all product integration modules (Content Factory,
 * PCT, MediaPoster, WaitlistLab) to ensure a consistent interface with the
 * Remotion rendering API.
 */
import { z } from "zod";
export declare enum RenderTemplate {
    UgcVideo = "ugc_video",
    StaticAd = "static_ad",
    MiniVsl = "mini_vsl",
    BeforeAfter = "before_after",
    ProductShowcase = "product_showcase",
    Testimonial = "testimonial",
    SocialPost = "social_post"
}
export interface RenderJob {
    id: string;
    status: "queued" | "rendering" | "completed" | "failed" | "cancelled";
    progress: number;
    outputUrl?: string;
    error?: {
        code: string;
        message: string;
    };
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, unknown>;
}
export interface ProductRenderConfig {
    /** The product identifier (e.g. "content-factory", "pct"). */
    product: string;
    /** The Remotion template to use. */
    template: RenderTemplate;
    /** Reference to the Zod schema used to validate input props. */
    inputSchema: z.ZodTypeAny;
    /** Default props passed to the Remotion composition. */
    defaultProps: Record<string, unknown>;
    /** Desired output format. */
    outputFormat: "mp4" | "webm" | "mov" | "png" | "jpeg" | "gif";
}
export declare const jobCallbackSchema: z.ZodObject<{
    url: z.ZodString;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    secret: z.ZodOptional<z.ZodString>;
    events: z.ZodArray<z.ZodEnum<["job.completed", "job.failed", "job.progress"]>, "many">;
}, "strip", z.ZodTypeAny, {
    url: string;
    events: ("job.completed" | "job.failed" | "job.progress")[];
    headers?: Record<string, string> | undefined;
    secret?: string | undefined;
}, {
    url: string;
    events: ("job.completed" | "job.failed" | "job.progress")[];
    headers?: Record<string, string> | undefined;
    secret?: string | undefined;
}>;
export type JobCallback = z.infer<typeof jobCallbackSchema>;
export declare const batchJobItemSchema: z.ZodObject<{
    template: z.ZodNativeEnum<typeof RenderTemplate>;
    input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    callback: z.ZodOptional<z.ZodObject<{
        url: z.ZodString;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        secret: z.ZodOptional<z.ZodString>;
        events: z.ZodArray<z.ZodEnum<["job.completed", "job.failed", "job.progress"]>, "many">;
    }, "strip", z.ZodTypeAny, {
        url: string;
        events: ("job.completed" | "job.failed" | "job.progress")[];
        headers?: Record<string, string> | undefined;
        secret?: string | undefined;
    }, {
        url: string;
        events: ("job.completed" | "job.failed" | "job.progress")[];
        headers?: Record<string, string> | undefined;
        secret?: string | undefined;
    }>>;
    priority: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    template: RenderTemplate;
    input: Record<string, unknown>;
    callback?: {
        url: string;
        events: ("job.completed" | "job.failed" | "job.progress")[];
        headers?: Record<string, string> | undefined;
        secret?: string | undefined;
    } | undefined;
    priority?: number | undefined;
}, {
    template: RenderTemplate;
    input: Record<string, unknown>;
    callback?: {
        url: string;
        events: ("job.completed" | "job.failed" | "job.progress")[];
        headers?: Record<string, string> | undefined;
        secret?: string | undefined;
    } | undefined;
    priority?: number | undefined;
}>;
export declare const batchJobRequestSchema: z.ZodObject<{
    jobs: z.ZodArray<z.ZodObject<{
        template: z.ZodNativeEnum<typeof RenderTemplate>;
        input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        callback: z.ZodOptional<z.ZodObject<{
            url: z.ZodString;
            headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
            secret: z.ZodOptional<z.ZodString>;
            events: z.ZodArray<z.ZodEnum<["job.completed", "job.failed", "job.progress"]>, "many">;
        }, "strip", z.ZodTypeAny, {
            url: string;
            events: ("job.completed" | "job.failed" | "job.progress")[];
            headers?: Record<string, string> | undefined;
            secret?: string | undefined;
        }, {
            url: string;
            events: ("job.completed" | "job.failed" | "job.progress")[];
            headers?: Record<string, string> | undefined;
            secret?: string | undefined;
        }>>;
        priority: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        template: RenderTemplate;
        input: Record<string, unknown>;
        callback?: {
            url: string;
            events: ("job.completed" | "job.failed" | "job.progress")[];
            headers?: Record<string, string> | undefined;
            secret?: string | undefined;
        } | undefined;
        priority?: number | undefined;
    }, {
        template: RenderTemplate;
        input: Record<string, unknown>;
        callback?: {
            url: string;
            events: ("job.completed" | "job.failed" | "job.progress")[];
            headers?: Record<string, string> | undefined;
            secret?: string | undefined;
        } | undefined;
        priority?: number | undefined;
    }>, "many">;
    parallelism: z.ZodOptional<z.ZodNumber>;
    webhook: z.ZodOptional<z.ZodObject<{
        url: z.ZodString;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        secret: z.ZodOptional<z.ZodString>;
        events: z.ZodArray<z.ZodEnum<["job.completed", "job.failed", "job.progress"]>, "many">;
    }, "strip", z.ZodTypeAny, {
        url: string;
        events: ("job.completed" | "job.failed" | "job.progress")[];
        headers?: Record<string, string> | undefined;
        secret?: string | undefined;
    }, {
        url: string;
        events: ("job.completed" | "job.failed" | "job.progress")[];
        headers?: Record<string, string> | undefined;
        secret?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    jobs: {
        template: RenderTemplate;
        input: Record<string, unknown>;
        callback?: {
            url: string;
            events: ("job.completed" | "job.failed" | "job.progress")[];
            headers?: Record<string, string> | undefined;
            secret?: string | undefined;
        } | undefined;
        priority?: number | undefined;
    }[];
    parallelism?: number | undefined;
    webhook?: {
        url: string;
        events: ("job.completed" | "job.failed" | "job.progress")[];
        headers?: Record<string, string> | undefined;
        secret?: string | undefined;
    } | undefined;
}, {
    jobs: {
        template: RenderTemplate;
        input: Record<string, unknown>;
        callback?: {
            url: string;
            events: ("job.completed" | "job.failed" | "job.progress")[];
            headers?: Record<string, string> | undefined;
            secret?: string | undefined;
        } | undefined;
        priority?: number | undefined;
    }[];
    parallelism?: number | undefined;
    webhook?: {
        url: string;
        events: ("job.completed" | "job.failed" | "job.progress")[];
        headers?: Record<string, string> | undefined;
        secret?: string | undefined;
    } | undefined;
}>;
export type BatchJobRequest = z.infer<typeof batchJobRequestSchema>;
export interface BatchJobResult {
    batchId: string;
    jobs: Array<{
        jobId: string;
        status: "queued" | "rendering" | "completed" | "failed" | "cancelled";
        template: RenderTemplate;
    }>;
}
export interface RemotionServiceConfig {
    /** Remotion API base URL. */
    apiUrl: string;
    /** API key for authentication. */
    apiKey: string;
    /** Request timeout in ms. Default: 30000 */
    timeout?: number;
}
//# sourceMappingURL=types.d.ts.map