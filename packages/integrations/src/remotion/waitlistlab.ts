/**
 * WaitlistLab Remotion Integration (RC-006)
 *
 * Provides rendering services for the WaitlistLab product, which focuses on
 * ad creative generation for waitlist / launch campaigns. Supports rendering
 * individual ad creatives as well as generating A/B test variations
 * automatically from a base creative.
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

const adCreativeInputSchema = z.object({
  campaignId: z.string().min(1),
  adSetId: z.string().min(1),
  creativeType: z.enum([
    "static_image",
    "video_ad",
    "carousel",
    "story",
    "collection",
  ]),
  copy: z.object({
    headline: z.string().min(1),
    body: z.string().min(1),
    cta: z.string().min(1),
    disclaimer: z.string().optional(),
  }),
  media: z.object({
    primary: z.string().url(),
    secondary: z.array(z.string().url()).optional(),
    logo: z.string().url().optional(),
  }),
  cta: z.object({
    text: z.string().min(1),
    url: z.string().url().optional(),
    style: z.enum(["button", "banner", "text-link"]).optional(),
  }),
  targetPlatform: z.enum([
    "facebook",
    "instagram",
    "tiktok",
    "google",
    "linkedin",
    "twitter",
    "snapchat",
  ]),
});

export type AdCreativeInput = z.infer<typeof adCreativeInputSchema>;

const variationFieldSchema = z.object({
  field: z.string().min(1),
  values: z.array(z.unknown()).min(2),
});

const variationsInputSchema = z.object({
  baseCreative: adCreativeInputSchema,
  variations: z.array(variationFieldSchema).min(1),
});

export type VariationsInput = z.infer<typeof variationsInputSchema>;

// ---------------------------------------------------------------------------
// Platform dimension defaults
// ---------------------------------------------------------------------------

const PLATFORM_DEFAULTS: Record<string, { width: number; height: number; format: "mp4" | "png" }> = {
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

const WAITLISTLAB_TEMPLATE: ProductRenderConfig = {
  product: "waitlistlab",
  template: RenderTemplate.StaticAd,
  inputSchema: adCreativeInputSchema,
  defaultProps: {
    quality: 95,
  },
  outputFormat: "png",
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class WaitlistLabRemotionService {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(config: RemotionServiceConfig) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30_000;
  }

  /**
   * Render a single ad creative for a campaign.
   */
  async renderAdCreative(input: AdCreativeInput): Promise<RenderJob> {
    const validated = adCreativeInputSchema.parse(input);

    const platformDefaults = PLATFORM_DEFAULTS[validated.targetPlatform] ?? {
      width: 1080,
      height: 1080,
      format: "png" as const,
    };

    const isVideo =
      validated.creativeType === "video_ad" ||
      validated.creativeType === "story" ||
      platformDefaults.format === "mp4";

    const endpoint = isVideo ? "/v1/render/video" : "/v1/render/static";
    const template = isVideo
      ? RenderTemplate.SocialPost
      : RenderTemplate.StaticAd;

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
  async renderVariations(input: VariationsInput): Promise<RenderJob[]> {
    const validated = variationsInputSchema.parse(input);

    // Generate all combinations of variation values
    const combinations = this.generateCombinations(validated.variations);

    const renderPromises = combinations.map(async (combo) => {
      // Deep-merge variation values into the base creative
      const creativeInput = this.applyVariation(
        validated.baseCreative,
        combo,
      );
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
  private generateCombinations(
    variations: Array<{ field: string; values: unknown[] }>,
  ): Array<Record<string, unknown>> {
    if (variations.length === 0) return [{}];

    const [first, ...rest] = variations;
    const restCombinations = this.generateCombinations(rest);

    const results: Array<Record<string, unknown>> = [];
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
  private applyVariation(
    base: AdCreativeInput,
    variation: Record<string, unknown>,
  ): AdCreativeInput {
    const result = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;

    for (const [path, value] of Object.entries(variation)) {
      const parts = path.split(".");
      let target: Record<string, unknown> = result;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (
          typeof target[part] === "object" &&
          target[part] !== null
        ) {
          target = target[part] as Record<string, unknown>;
        }
      }

      target[parts[parts.length - 1]] = value;
    }

    return result as unknown as AdCreativeInput;
  }

  private async postToApi(
    endpoint: string,
    body: Record<string, unknown>,
  ): Promise<RenderJob> {
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
