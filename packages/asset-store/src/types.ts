import { z } from "zod";

// ─── AST-001: Shared Asset Storage Types ────────────────────────────────────

/**
 * AssetType - All supported asset types in the ACD ecosystem.
 */
export const AssetTypeSchema = z.enum([
  "image",
  "video",
  "audio",
  "font",
  "template",
  "document",
  "subtitle",
  "thumbnail",
  "voice_clone",
  "lottie",
  "svg",
  "other",
]);
export type AssetType = z.infer<typeof AssetTypeSchema>;

/**
 * AssetSource - Where the asset originated from.
 */
export const AssetSourceSchema = z.enum([
  "upload",
  "generated",
  "remotion_render",
  "ai_generated",
  "meta_ad",
  "tiktok",
  "youtube",
  "imported",
]);
export type AssetSource = z.infer<typeof AssetSourceSchema>;

/**
 * AssetStatus - Lifecycle status of an asset.
 */
export const AssetStatusSchema = z.enum([
  "pending",
  "processing",
  "ready",
  "failed",
  "archived",
  "deleted",
]);
export type AssetStatus = z.infer<typeof AssetStatusSchema>;

/**
 * ProductId - References all ACD product identifiers.
 * Mirrors @acd/types ProductIdSchema for self-contained use.
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
 * StorageProviderType - Supported storage backends.
 */
export const StorageProviderTypeSchema = z.enum([
  "s3",
  "supabase",
  "r2",
  "local",
]);
export type StorageProviderType = z.infer<typeof StorageProviderTypeSchema>;

/**
 * AssetMetadata - Technical metadata extracted from asset files.
 */
export const AssetMetadataSchema = z.object({
  /** Image/video width in pixels */
  width: z.number().int().positive().optional(),
  /** Image/video height in pixels */
  height: z.number().int().positive().optional(),
  /** Audio/video duration in seconds */
  duration: z.number().nonnegative().optional(),
  /** Video frames per second */
  fps: z.number().positive().optional(),
  /** Media codec (e.g. h264, aac) */
  codec: z.string().optional(),
  /** Media bitrate in bits per second */
  bitrate: z.number().int().nonnegative().optional(),
  /** Audio sample rate in Hz */
  sampleRate: z.number().int().positive().optional(),
  /** Audio channel count */
  channels: z.number().int().positive().optional(),
  /** MIME type of the asset */
  mimeType: z.string().min(1),
  /** File size in bytes */
  fileSize: z.number().int().nonnegative(),
  /** SHA-256 content hash for deduplication */
  contentHash: z.string().regex(/^[a-f0-9]{64}$/, "Must be a valid SHA-256 hex string"),
});
export type AssetMetadata = z.infer<typeof AssetMetadataSchema>;

/**
 * Asset - Full asset record in the asset store.
 */
export const AssetSchema = z.object({
  /** Unique asset identifier */
  id: z.string().uuid(),
  /** Organization that owns this asset */
  orgId: z.string().min(1),
  /** User who created/uploaded this asset */
  creatorId: z.string().min(1),
  /** Type classification of the asset */
  type: AssetTypeSchema,
  /** How the asset was sourced */
  source: AssetSourceSchema,
  /** Current lifecycle status */
  status: AssetStatusSchema,
  /** Human-readable display name */
  name: z.string().min(1),
  /** Original filename at upload time */
  originalFilename: z.string().min(1),
  /** Internal storage path/key */
  storagePath: z.string().min(1),
  /** Which storage backend holds this asset */
  storageProvider: StorageProviderTypeSchema,
  /** Public URL if the asset is publicly accessible */
  publicUrl: z.string().url().optional(),
  /** URL for the asset thumbnail */
  thumbnailUrl: z.string().url().optional(),
  /** Technical metadata */
  metadata: AssetMetadataSchema,
  /** User-defined tags for organization and search */
  tags: z.array(z.string()).default([]),
  /** Number of times this asset has been used across products */
  usageCount: z.number().int().nonnegative().default(0),
  /** Products that have used this asset */
  products: z.array(ProductIdSchema).default([]),
  /** When this asset record was created */
  createdAt: z.string().datetime(),
  /** When this asset record was last updated */
  updatedAt: z.string().datetime(),
});
export type Asset = z.infer<typeof AssetSchema>;

/**
 * CreateAssetInput - Input schema for creating a new asset.
 */
export const CreateAssetInputSchema = z.object({
  orgId: z.string().min(1),
  creatorId: z.string().min(1),
  type: AssetTypeSchema,
  source: AssetSourceSchema,
  name: z.string().min(1),
  originalFilename: z.string().min(1),
  storagePath: z.string().min(1),
  storageProvider: StorageProviderTypeSchema,
  publicUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  metadata: AssetMetadataSchema,
  tags: z.array(z.string()).default([]),
  products: z.array(ProductIdSchema).default([]),
});
export type CreateAssetInput = z.infer<typeof CreateAssetInputSchema>;

/**
 * UpdateAssetInput - Input schema for updating an existing asset.
 * All fields are optional.
 */
export const UpdateAssetInputSchema = z.object({
  name: z.string().min(1).optional(),
  status: AssetStatusSchema.optional(),
  publicUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  products: z.array(ProductIdSchema).optional(),
  metadata: AssetMetadataSchema.partial().optional(),
});
export type UpdateAssetInput = z.infer<typeof UpdateAssetInputSchema>;

/**
 * AssetSearchParams - Parameters for searching/filtering assets (AST-003).
 */
export const AssetSearchParamsSchema = z.object({
  /** Free-text search query */
  query: z.string().optional(),
  /** Filter by asset types */
  types: z.array(AssetTypeSchema).optional(),
  /** Filter by asset sources */
  sources: z.array(AssetSourceSchema).optional(),
  /** Filter by tags */
  tags: z.array(z.string()).optional(),
  /** Filter by products that use the asset */
  products: z.array(ProductIdSchema).optional(),
  /** Required: organization scope */
  orgId: z.string().min(1),
  /** Filter by creator */
  creatorId: z.string().optional(),
  /** Minimum file size in bytes */
  minSize: z.number().int().nonnegative().optional(),
  /** Maximum file size in bytes */
  maxSize: z.number().int().nonnegative().optional(),
  /** Sort field */
  sortBy: z.enum(["createdAt", "updatedAt", "name", "fileSize", "usageCount"]).optional(),
  /** Sort direction */
  sortOrder: z.enum(["asc", "desc"]).optional(),
  /** Page number (1-indexed) */
  page: z.number().int().positive().optional(),
  /** Results per page */
  limit: z.number().int().positive().max(100).optional(),
});
export type AssetSearchParams = z.infer<typeof AssetSearchParamsSchema>;
