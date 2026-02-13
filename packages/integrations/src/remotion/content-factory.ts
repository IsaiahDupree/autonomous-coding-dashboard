/**
 * Content Factory Remotion Integration (RC-002)
 *
 * Provides a service layer for the Content Factory product to render UGC videos,
 * product showcases, and testimonials through the Remotion API.
 *
 * All inputs are validated with Zod schemas before being submitted to the API.
 */

import { z } from "zod";
import {
  RenderJob,
  RenderTemplate,
  ProductRenderConfig,
  RemotionServiceConfig,
} from "./types";

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const ugcVideoInputSchema = z.object({
  scriptId: z.string().min(1),
  voiceId: z.string().min(1),
  templateId: z.string().min(1),
  productImages: z.array(z.string().url()).min(1),
  music: z.string().url().optional(),
  captions: z
    .object({
      enabled: z.boolean(),
      style: z.enum(["word-by-word", "sentence", "paragraph"]).optional(),
      position: z.enum(["top", "center", "bottom"]).optional(),
    })
    .optional(),
});

export type UGCVideoInput = z.infer<typeof ugcVideoInputSchema>;

const productShowcaseInputSchema = z.object({
  productId: z.string().min(1),
  images: z.array(z.string().url()).min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  style: z.enum(["minimal", "bold", "elegant", "playful", "corporate"]),
});

export type ProductShowcaseInput = z.infer<typeof productShowcaseInputSchema>;

const testimonialInputSchema = z.object({
  testimonialId: z.string().min(1),
  customerName: z.string().min(1),
  quote: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  avatar: z.string().url().optional(),
});

export type TestimonialInput = z.infer<typeof testimonialInputSchema>;

// ---------------------------------------------------------------------------
// Template configs
// ---------------------------------------------------------------------------

const CONTENT_FACTORY_TEMPLATES: ProductRenderConfig[] = [
  {
    product: "content-factory",
    template: RenderTemplate.UgcVideo,
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
    template: RenderTemplate.ProductShowcase,
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
    template: RenderTemplate.Testimonial,
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

export class ContentFactoryRemotionService {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(config: RemotionServiceConfig) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30_000;
  }

  /**
   * Render a UGC (user-generated content) video from a script, voice, and
   * product images.
   */
  async renderUGCVideo(input: UGCVideoInput): Promise<RenderJob> {
    const validated = ugcVideoInputSchema.parse(input);
    const templateConfig = CONTENT_FACTORY_TEMPLATES.find(
      (t) => t.template === RenderTemplate.UgcVideo,
    )!;

    return this.submitRender(templateConfig, validated);
  }

  /**
   * Render a product showcase video from product images and copy.
   */
  async renderProductShowcase(
    input: ProductShowcaseInput,
  ): Promise<RenderJob> {
    const validated = productShowcaseInputSchema.parse(input);
    const templateConfig = CONTENT_FACTORY_TEMPLATES.find(
      (t) => t.template === RenderTemplate.ProductShowcase,
    )!;

    return this.submitRender(templateConfig, validated);
  }

  /**
   * Render a testimonial video from customer review data.
   */
  async renderTestimonial(input: TestimonialInput): Promise<RenderJob> {
    const validated = testimonialInputSchema.parse(input);
    const templateConfig = CONTENT_FACTORY_TEMPLATES.find(
      (t) => t.template === RenderTemplate.Testimonial,
    )!;

    return this.submitRender(templateConfig, validated);
  }

  /**
   * Get all Content Factory specific Remotion templates.
   */
  getTemplates(): ProductRenderConfig[] {
    return [...CONTENT_FACTORY_TEMPLATES];
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private async submitRender(
    templateConfig: ProductRenderConfig,
    inputProps: Record<string, unknown>,
  ): Promise<RenderJob> {
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
        throw new Error(
          `Remotion API error (${response.status}): ${errorBody}`,
        );
      }

      return (await response.json()) as RenderJob;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
