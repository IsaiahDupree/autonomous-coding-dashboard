"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedAssetSchema = exports.AudioMetadataSchema = exports.VideoMetadataSchema = exports.AssetDimensionsSchema = exports.StorageProviderSchema = exports.AssetStatusSchema = exports.AssetTypeSchema = void 0;
const zod_1 = require("zod");
const product_1 = require("./product");
// ---------------------------------------------------------------------------
// Asset Types
// ---------------------------------------------------------------------------
/**
 * The type/category of asset.
 */
exports.AssetTypeSchema = zod_1.z.enum([
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
/**
 * Asset processing status.
 */
exports.AssetStatusSchema = zod_1.z.enum([
    "uploading",
    "processing",
    "ready",
    "failed",
    "archived",
    "deleted",
]);
/**
 * Storage provider.
 */
exports.StorageProviderSchema = zod_1.z.enum([
    "s3",
    "gcs",
    "r2",
    "cloudinary",
    "supabase_storage",
    "local",
]);
/**
 * Dimensions for image/video assets.
 */
exports.AssetDimensionsSchema = zod_1.z.object({
    width: zod_1.z.number().int().positive(),
    height: zod_1.z.number().int().positive(),
});
/**
 * Video-specific metadata.
 */
exports.VideoMetadataSchema = zod_1.z.object({
    durationMs: zod_1.z.number().int().nonnegative(),
    fps: zod_1.z.number().positive(),
    codec: zod_1.z.string().optional(),
    bitrate: zod_1.z.number().int().positive().optional(),
    hasAudio: zod_1.z.boolean().default(true),
});
/**
 * Audio-specific metadata.
 */
exports.AudioMetadataSchema = zod_1.z.object({
    durationMs: zod_1.z.number().int().nonnegative(),
    sampleRate: zod_1.z.number().int().positive().optional(),
    channels: zod_1.z.number().int().positive().optional(),
    codec: zod_1.z.string().optional(),
    bitrate: zod_1.z.number().int().positive().optional(),
});
/**
 * SharedAsset - A media asset stored and referenced across ACD products.
 */
exports.SharedAssetSchema = zod_1.z.object({
    /** Unique asset identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** The user who owns this asset. */
    userId: zod_1.z.string().uuid(),
    /** Which product this asset belongs to (or was created by). */
    productId: product_1.ProductIdSchema.optional(),
    /** Display name for the asset. */
    name: zod_1.z.string().min(1).max(512),
    /** Original file name at time of upload. */
    originalFileName: zod_1.z.string().max(1024).optional(),
    /** Asset type/category. */
    type: exports.AssetTypeSchema,
    /** Current processing status. */
    status: exports.AssetStatusSchema.default("uploading"),
    /** MIME type (e.g., video/mp4, image/png). */
    mimeType: zod_1.z.string().regex(/^[\w-]+\/[\w.+-]+$/),
    /** File size in bytes. */
    sizeBytes: zod_1.z.number().int().nonnegative(),
    /** Storage provider. */
    storageProvider: exports.StorageProviderSchema,
    /** Storage bucket name. */
    storageBucket: zod_1.z.string().min(1),
    /** Storage key/path within the bucket. */
    storageKey: zod_1.z.string().min(1),
    /** Public URL (if publicly accessible). */
    publicUrl: zod_1.z.string().url().optional(),
    /** Signed/presigned URL (temporary access). */
    signedUrl: zod_1.z.string().url().optional(),
    /** Expiration time for the signed URL. */
    signedUrlExpiresAt: zod_1.z.string().datetime().optional(),
    /** CDN URL for optimized delivery. */
    cdnUrl: zod_1.z.string().url().optional(),
    /** Thumbnail URL (for video/image assets). */
    thumbnailUrl: zod_1.z.string().url().optional(),
    /** Image/video dimensions. */
    dimensions: exports.AssetDimensionsSchema.optional(),
    /** Video-specific metadata. */
    videoMetadata: exports.VideoMetadataSchema.optional(),
    /** Audio-specific metadata. */
    audioMetadata: exports.AudioMetadataSchema.optional(),
    /** Content hash for deduplication (SHA-256). */
    contentHash: zod_1.z.string().optional(),
    /** Tags for organization and search. */
    tags: zod_1.z.array(zod_1.z.string().max(64)).max(50).default([]),
    /** Arbitrary metadata. */
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    /** ISO 8601 timestamp of creation. */
    createdAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last update. */
    updatedAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of deletion (soft delete). */
    deletedAt: zod_1.z.string().datetime().optional(),
});
//# sourceMappingURL=asset.js.map