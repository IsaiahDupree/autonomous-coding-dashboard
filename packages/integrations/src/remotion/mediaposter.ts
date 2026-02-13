/**
 * MediaPoster Remotion Integration (RC-005)
 *
 * Provides rendering services for the MediaPoster product, which handles
 * social media video content creation. Supports platform-specific video
 * rendering (Instagram, TikTok, YouTube), carousels, and story formats.
 */

import { z } from "zod";
import {
  RenderJob,
  RenderTemplate,
  ProductRenderConfig,
  RemotionServiceConfig,
} from "./types";

// ---------------------------------------------------------------------------
// Platform aspect ratio mappings
// ---------------------------------------------------------------------------

const PLATFORM_ASPECT_RATIOS: Record<string, { width: number; height: number }> = {
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

const socialVideoInputSchema = z.object({
  contentId: z.string().min(1),
  platform: z.enum(["instagram", "tiktok", "youtube"]),
  aspectRatio: z.enum(["1:1", "4:5", "9:16", "16:9"]),
  overlayText: z
    .object({
      text: z.string(),
      position: z.enum(["top", "center", "bottom"]).optional(),
      fontSize: z.number().positive().optional(),
      color: z.string().optional(),
    })
    .optional(),
});

export type SocialVideoInput = z.infer<typeof socialVideoInputSchema>;

const carouselSlideSchema = z.object({
  image: z.string().url(),
  caption: z.string(),
});

const carouselInputSchema = z.object({
  slides: z.array(carouselSlideSchema).min(2).max(20),
  transition: z.enum(["slide", "fade", "zoom", "flip"]),
  music: z.string().url().optional(),
});

export type CarouselInput = z.infer<typeof carouselInputSchema>;

const storySegmentSchema = z.object({
  media: z.string().url(),
  duration: z.number().positive().max(15),
  text: z
    .object({
      content: z.string(),
      position: z.enum(["top", "center", "bottom"]).optional(),
      style: z.enum(["default", "neon", "typewriter", "bold"]).optional(),
    })
    .optional(),
});

const storyInputSchema = z.object({
  segments: z.array(storySegmentSchema).min(1).max(10),
});

export type StoryInput = z.infer<typeof storyInputSchema>;

// ---------------------------------------------------------------------------
// Template configs
// ---------------------------------------------------------------------------

const MEDIAPOSTER_TEMPLATES: ProductRenderConfig[] = [
  {
    product: "mediaposter",
    template: RenderTemplate.SocialPost,
    inputSchema: socialVideoInputSchema,
    defaultProps: {
      fps: 30,
      codec: "h264",
    },
    outputFormat: "mp4",
  },
  {
    product: "mediaposter",
    template: RenderTemplate.UgcVideo,
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

export class MediaPosterRemotionService {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(config: RemotionServiceConfig) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30_000;
  }

  /**
   * Render a social video optimized for a specific platform and aspect ratio.
   */
  async renderSocialVideo(input: SocialVideoInput): Promise<RenderJob> {
    const validated = socialVideoInputSchema.parse(input);

    const dimensionKey = `${validated.platform}:${validated.aspectRatio}`;
    const dimensions = PLATFORM_ASPECT_RATIOS[dimensionKey] ?? {
      width: 1080,
      height: 1080,
    };

    const templateConfig = MEDIAPOSTER_TEMPLATES.find(
      (t) => t.template === RenderTemplate.SocialPost,
    )!;

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
  async renderCarousel(input: CarouselInput): Promise<RenderJob> {
    const validated = carouselInputSchema.parse(input);

    const templateConfig = MEDIAPOSTER_TEMPLATES.find(
      (t) => t.template === RenderTemplate.UgcVideo,
    )!;

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
  async renderStory(input: StoryInput): Promise<RenderJob> {
    const validated = storyInputSchema.parse(input);

    const totalDuration = validated.segments.reduce(
      (sum, seg) => sum + seg.duration,
      0,
    );
    const totalFrames = Math.round(totalDuration * 30);

    return this.submitRender(
      {
        product: "mediaposter",
        template: RenderTemplate.SocialPost,
        inputSchema: storyInputSchema,
        defaultProps: {
          fps: 30,
          width: 1080,
          height: 1920,
        },
        outputFormat: "mp4",
      },
      {
        ...validated,
        compositionType: "story",
        durationInFrames: totalFrames,
      },
    );
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
