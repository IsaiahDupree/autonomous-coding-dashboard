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
import {
  RenderJob,
  RenderTemplate,
  ProductRenderConfig,
  RemotionServiceConfig,
} from "./types";

// ---------------------------------------------------------------------------
// Standard ad dimensions
// ---------------------------------------------------------------------------

export interface AdDimension {
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
  platforms: string[];
}

const AD_DIMENSIONS: AdDimension[] = [
  {
    name: "Square",
    width: 1080,
    height: 1080,
    aspectRatio: "1:1",
    platforms: ["instagram", "facebook", "twitter"],
  },
  {
    name: "Story / Reel",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    platforms: ["instagram", "tiktok", "snapchat", "youtube-shorts"],
  },
  {
    name: "Landscape",
    width: 1200,
    height: 628,
    aspectRatio: "1.91:1",
    platforms: ["facebook", "twitter", "linkedin"],
  },
  {
    name: "YouTube Thumbnail",
    width: 1280,
    height: 720,
    aspectRatio: "16:9",
    platforms: ["youtube"],
  },
  {
    name: "Pinterest Pin",
    width: 1000,
    height: 1500,
    aspectRatio: "2:3",
    platforms: ["pinterest"],
  },
  {
    name: "Twitter Header",
    width: 1500,
    height: 500,
    aspectRatio: "3:1",
    platforms: ["twitter"],
  },
];

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const staticAdInputSchema = z.object({
  adCopy: z.string().min(1),
  headline: z.string().min(1),
  ctaText: z.string().min(1),
  productImage: z.string().url(),
  brandColors: z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    text: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }),
  dimensions: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
});

export type StaticAdInput = z.infer<typeof staticAdInputSchema>;

const miniVSLInputSchema = z.object({
  script: z.string().min(1),
  voiceId: z.string().min(1),
  hookText: z.string().min(1),
  productDemo: z.string().url(),
  cta: z.object({
    text: z.string().min(1),
    url: z.string().url().optional(),
    style: z.enum(["button", "banner", "overlay"]).optional(),
  }),
  duration: z.number().positive().max(120),
});

export type MiniVSLInput = z.infer<typeof miniVSLInputSchema>;

const beforeAfterInputSchema = z.object({
  beforeImage: z.string().url(),
  afterImage: z.string().url(),
  transitionStyle: z.enum(["slide", "fade", "wipe", "split"]),
});

export type BeforeAfterInput = z.infer<typeof beforeAfterInputSchema>;

// ---------------------------------------------------------------------------
// Template configs
// ---------------------------------------------------------------------------

const PCT_TEMPLATES: ProductRenderConfig[] = [
  {
    product: "pct",
    template: RenderTemplate.StaticAd,
    inputSchema: staticAdInputSchema,
    defaultProps: {
      format: "png",
      quality: 95,
    },
    outputFormat: "png",
  },
  {
    product: "pct",
    template: RenderTemplate.MiniVsl,
    inputSchema: miniVSLInputSchema,
    defaultProps: {
      fps: 30,
      width: 1080,
      height: 1920,
      codec: "h264",
    },
    outputFormat: "mp4",
  },
  {
    product: "pct",
    template: RenderTemplate.BeforeAfter,
    inputSchema: beforeAfterInputSchema,
    defaultProps: {
      fps: 30,
      width: 1080,
      height: 1080,
      durationInFrames: 150,
    },
    outputFormat: "mp4",
  },
];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class PCTRemotionService {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(config: RemotionServiceConfig) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30_000;
  }

  /**
   * Render a static ad image creative (RC-003).
   */
  async renderStaticAd(input: StaticAdInput): Promise<RenderJob> {
    const validated = staticAdInputSchema.parse(input);
    const templateConfig = PCT_TEMPLATES.find(
      (t) => t.template === RenderTemplate.StaticAd,
    )!;

    return this.submitRender(templateConfig, {
      ...validated,
      width: validated.dimensions.width,
      height: validated.dimensions.height,
    });
  }

  /**
   * Render a mini-VSL (Video Sales Letter) video (RC-004).
   */
  async renderMiniVSL(input: MiniVSLInput): Promise<RenderJob> {
    const validated = miniVSLInputSchema.parse(input);
    const templateConfig = PCT_TEMPLATES.find(
      (t) => t.template === RenderTemplate.MiniVsl,
    )!;

    return this.submitRender(templateConfig, {
      ...validated,
      durationInFrames: Math.round(validated.duration * 30),
    });
  }

  /**
   * Render a before/after comparison video.
   */
  async renderBeforeAfter(input: BeforeAfterInput): Promise<RenderJob> {
    const validated = beforeAfterInputSchema.parse(input);
    const templateConfig = PCT_TEMPLATES.find(
      (t) => t.template === RenderTemplate.BeforeAfter,
    )!;

    return this.submitRender(templateConfig, validated);
  }

  /**
   * Get all standard ad dimensions with platform metadata.
   */
  getAdDimensions(): AdDimension[] {
    return [...AD_DIMENSIONS];
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private async submitRender(
    templateConfig: ProductRenderConfig,
    inputProps: Record<string, unknown>,
  ): Promise<RenderJob> {
    const isStatic = templateConfig.outputFormat === "png" ||
      templateConfig.outputFormat === "jpeg";

    const endpoint = isStatic ? "/v1/render/static" : "/v1/render/video";

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
