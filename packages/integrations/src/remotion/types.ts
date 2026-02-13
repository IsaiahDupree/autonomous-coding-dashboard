/**
 * Shared types and schemas for product-specific Remotion integrations.
 *
 * These types are used across all product integration modules (Content Factory,
 * PCT, MediaPoster, WaitlistLab) to ensure a consistent interface with the
 * Remotion rendering API.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Render Template enum
// ---------------------------------------------------------------------------

export enum RenderTemplate {
  UgcVideo = "ugc_video",
  StaticAd = "static_ad",
  MiniVsl = "mini_vsl",
  BeforeAfter = "before_after",
  ProductShowcase = "product_showcase",
  Testimonial = "testimonial",
  SocialPost = "social_post",
}

// ---------------------------------------------------------------------------
// Render Job (mirrors the remotion-client RenderJob for decoupled usage)
// ---------------------------------------------------------------------------

export interface RenderJob {
  id: string;
  status: "queued" | "rendering" | "completed" | "failed" | "cancelled";
  progress: number;
  outputUrl?: string;
  error?: { code: string; message: string };
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Product Render Config
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Job Callback (RC-007)
// ---------------------------------------------------------------------------

export const jobCallbackSchema = z.object({
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  secret: z.string().optional(),
  events: z.array(
    z.enum(["job.completed", "job.failed", "job.progress"]),
  ).min(1),
});

export type JobCallback = z.infer<typeof jobCallbackSchema>;

// ---------------------------------------------------------------------------
// Batch Job types (RC-008)
// ---------------------------------------------------------------------------

export const batchJobItemSchema = z.object({
  template: z.nativeEnum(RenderTemplate),
  input: z.record(z.unknown()),
  callback: jobCallbackSchema.optional(),
  priority: z.number().int().min(0).max(10).optional(),
});

export const batchJobRequestSchema = z.object({
  jobs: z.array(batchJobItemSchema).min(1),
  parallelism: z.number().int().min(1).max(50).optional(),
  webhook: jobCallbackSchema.optional(),
});

export type BatchJobRequest = z.infer<typeof batchJobRequestSchema>;

export interface BatchJobResult {
  batchId: string;
  jobs: Array<{
    jobId: string;
    status: "queued" | "rendering" | "completed" | "failed" | "cancelled";
    template: RenderTemplate;
  }>;
}

// ---------------------------------------------------------------------------
// Base service configuration
// ---------------------------------------------------------------------------

export interface RemotionServiceConfig {
  /** Remotion API base URL. */
  apiUrl: string;
  /** API key for authentication. */
  apiKey: string;
  /** Request timeout in ms. Default: 30000 */
  timeout?: number;
}
