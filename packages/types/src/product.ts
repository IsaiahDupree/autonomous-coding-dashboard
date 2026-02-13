import { z } from "zod";

/**
 * ProductId - Enum of all ACD product identifiers.
 * Every product in the ACD ecosystem is represented here.
 */
export const ProductIdSchema = z.enum([
  "portal28",
  "remotion",
  "waitlist_lab",
  "media_poster",
  "content_factory",
  "pct",
  "software_hub",
  "gap_radar",
  "blog_canvas",
  "canvas_cast",
  "shorts_linker",
  "vello_pad",
  "velvet_hold",
  "steady_letters",
  "ever_reach",
]);

export type ProductId = z.infer<typeof ProductIdSchema>;

/**
 * Human-readable display names for each product.
 */
export const ProductDisplayNames: Record<ProductId, string> = {
  portal28: "Portal28",
  remotion: "Remotion",
  waitlist_lab: "WaitlistLab",
  media_poster: "MediaPoster",
  content_factory: "ContentFactory",
  pct: "PCT",
  software_hub: "SoftwareHub",
  gap_radar: "GapRadar",
  blog_canvas: "BlogCanvas",
  canvas_cast: "CanvasCast",
  shorts_linker: "ShortsLinker",
  vello_pad: "VelloPad",
  velvet_hold: "VelvetHold",
  steady_letters: "SteadyLetters",
  ever_reach: "EverReach",
};

/**
 * Product tier categorization.
 */
export const ProductTierSchema = z.enum(["free", "starter", "pro", "enterprise"]);
export type ProductTier = z.infer<typeof ProductTierSchema>;

/**
 * Product status in the ecosystem.
 */
export const ProductStatusSchema = z.enum([
  "active",
  "beta",
  "coming_soon",
  "deprecated",
  "maintenance",
]);
export type ProductStatus = z.infer<typeof ProductStatusSchema>;

/**
 * Full product definition.
 */
export const ProductDefinitionSchema = z.object({
  id: ProductIdSchema,
  displayName: z.string().min(1),
  description: z.string(),
  status: ProductStatusSchema,
  tier: ProductTierSchema,
  url: z.string().url().optional(),
  iconUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ProductDefinition = z.infer<typeof ProductDefinitionSchema>;
