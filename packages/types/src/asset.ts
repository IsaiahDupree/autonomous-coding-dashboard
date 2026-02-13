import { z } from "zod";
import { ProductIdSchema } from "./product";

// ---------------------------------------------------------------------------
// Asset Types
// ---------------------------------------------------------------------------

/**
 * The type/category of asset.
 */
export const AssetTypeSchema = z.enum([
  "video",
  "image",
  "audio",
  "document",
  "template",
  "font",
  "subtitle",
  "thumbnail",
  "voice_clone",
  "avatar",
  "brand_kit",
  "other",
]);
export type AssetType = z.infer<typeof AssetTypeSchema>;

/**
 * Asset processing status.
 */
export const AssetStatusSchema = z.enum([
  "uploading",
  "processing",
  "ready",
  "failed",
  "archived",
  "deleted",
]);
export type AssetStatus = z.infer<typeof AssetStatusSchema>;

/**
 * Storage provider.
 */
export const StorageProviderSchema = z.enum([
  "s3",
  "gcs",
  "r2",
  "cloudinary",
  "supabase_storage",
  "local",
]);
export type StorageProvider = z.infer<typeof StorageProviderSchema>;

/**
 * Dimensions for image/video assets.
 */
export const AssetDimensionsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type AssetDimensions = z.infer<typeof AssetDimensionsSchema>;

/**
 * Video-specific metadata.
 */
export const VideoMetadataSchema = z.object({
  durationMs: z.number().int().nonnegative(),
  fps: z.number().positive(),
  codec: z.string().optional(),
  bitrate: z.number().int().positive().optional(),
  hasAudio: z.boolean().default(true),
});
export type VideoMetadata = z.infer<typeof VideoMetadataSchema>;

/**
 * Audio-specific metadata.
 */
export const AudioMetadataSchema = z.object({
  durationMs: z.number().int().nonnegative(),
  sampleRate: z.number().int().positive().optional(),
  channels: z.number().int().positive().optional(),
  codec: z.string().optional(),
  bitrate: z.number().int().positive().optional(),
});
export type AudioMetadata = z.infer<typeof AudioMetadataSchema>;

/**
 * SharedAsset - A media asset stored and referenced across ACD products.
 */
export const SharedAssetSchema = z.object({
  /** Unique asset identifier (UUID v4). */
  id: z.string().uuid(),

  /** The user who owns this asset. */
  userId: z.string().uuid(),

  /** Which product this asset belongs to (or was created by). */
  productId: ProductIdSchema.optional(),

  /** Display name for the asset. */
  name: z.string().min(1).max(512),

  /** Original file name at time of upload. */
  originalFileName: z.string().max(1024).optional(),

  /** Asset type/category. */
  type: AssetTypeSchema,

  /** Current processing status. */
  status: AssetStatusSchema.default("uploading"),

  /** MIME type (e.g., video/mp4, image/png). */
  mimeType: z.string().regex(/^[\w-]+\/[\w.+-]+$/),

  /** File size in bytes. */
  sizeBytes: z.number().int().nonnegative(),

  /** Storage provider. */
  storageProvider: StorageProviderSchema,

  /** Storage bucket name. */
  storageBucket: z.string().min(1),

  /** Storage key/path within the bucket. */
  storageKey: z.string().min(1),

  /** Public URL (if publicly accessible). */
  publicUrl: z.string().url().optional(),

  /** Signed/presigned URL (temporary access). */
  signedUrl: z.string().url().optional(),

  /** Expiration time for the signed URL. */
  signedUrlExpiresAt: z.string().datetime().optional(),

  /** CDN URL for optimized delivery. */
  cdnUrl: z.string().url().optional(),

  /** Thumbnail URL (for video/image assets). */
  thumbnailUrl: z.string().url().optional(),

  /** Image/video dimensions. */
  dimensions: AssetDimensionsSchema.optional(),

  /** Video-specific metadata. */
  videoMetadata: VideoMetadataSchema.optional(),

  /** Audio-specific metadata. */
  audioMetadata: AudioMetadataSchema.optional(),

  /** Content hash for deduplication (SHA-256). */
  contentHash: z.string().optional(),

  /** Tags for organization and search. */
  tags: z.array(z.string().max(64)).max(50).default([]),

  /** Arbitrary metadata. */
  metadata: z.record(z.string(), z.unknown()).optional(),

  /** ISO 8601 timestamp of creation. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last update. */
  updatedAt: z.string().datetime(),

  /** ISO 8601 timestamp of deletion (soft delete). */
  deletedAt: z.string().datetime().optional(),
});

export type SharedAsset = z.infer<typeof SharedAssetSchema>;
