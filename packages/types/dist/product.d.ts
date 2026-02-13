import { z } from "zod";
/**
 * ProductId - Enum of all ACD product identifiers.
 * Every product in the ACD ecosystem is represented here.
 */
export declare const ProductIdSchema: z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>;
export type ProductId = z.infer<typeof ProductIdSchema>;
/**
 * Human-readable display names for each product.
 */
export declare const ProductDisplayNames: Record<ProductId, string>;
/**
 * Product tier categorization.
 */
export declare const ProductTierSchema: z.ZodEnum<["free", "starter", "pro", "enterprise"]>;
export type ProductTier = z.infer<typeof ProductTierSchema>;
/**
 * Product status in the ecosystem.
 */
export declare const ProductStatusSchema: z.ZodEnum<["active", "beta", "coming_soon", "deprecated", "maintenance"]>;
export type ProductStatus = z.infer<typeof ProductStatusSchema>;
/**
 * Full product definition.
 */
export declare const ProductDefinitionSchema: z.ZodObject<{
    id: z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>;
    displayName: z.ZodString;
    description: z.ZodString;
    status: z.ZodEnum<["active", "beta", "coming_soon", "deprecated", "maintenance"]>;
    tier: z.ZodEnum<["free", "starter", "pro", "enterprise"]>;
    url: z.ZodOptional<z.ZodString>;
    iconUrl: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "active" | "beta" | "coming_soon" | "deprecated" | "maintenance";
    id: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach";
    createdAt: string;
    updatedAt: string;
    description: string;
    displayName: string;
    tier: "free" | "starter" | "pro" | "enterprise";
    url?: string | undefined;
    iconUrl?: string | undefined;
}, {
    status: "active" | "beta" | "coming_soon" | "deprecated" | "maintenance";
    id: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach";
    createdAt: string;
    updatedAt: string;
    description: string;
    displayName: string;
    tier: "free" | "starter" | "pro" | "enterprise";
    url?: string | undefined;
    iconUrl?: string | undefined;
}>;
export type ProductDefinition = z.infer<typeof ProductDefinitionSchema>;
//# sourceMappingURL=product.d.ts.map