import { z } from "zod";
/**
 * The type/category of asset.
 */
export declare const AssetTypeSchema: z.ZodEnum<["video", "image", "audio", "document", "template", "font", "subtitle", "thumbnail", "voice_clone", "avatar", "brand_kit", "other"]>;
export type AssetType = z.infer<typeof AssetTypeSchema>;
/**
 * Asset processing status.
 */
export declare const AssetStatusSchema: z.ZodEnum<["uploading", "processing", "ready", "failed", "archived", "deleted"]>;
export type AssetStatus = z.infer<typeof AssetStatusSchema>;
/**
 * Storage provider.
 */
export declare const StorageProviderSchema: z.ZodEnum<["s3", "gcs", "r2", "cloudinary", "supabase_storage", "local"]>;
export type StorageProvider = z.infer<typeof StorageProviderSchema>;
/**
 * Dimensions for image/video assets.
 */
export declare const AssetDimensionsSchema: z.ZodObject<{
    width: z.ZodNumber;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
}, {
    width: number;
    height: number;
}>;
export type AssetDimensions = z.infer<typeof AssetDimensionsSchema>;
/**
 * Video-specific metadata.
 */
export declare const VideoMetadataSchema: z.ZodObject<{
    durationMs: z.ZodNumber;
    fps: z.ZodNumber;
    codec: z.ZodOptional<z.ZodString>;
    bitrate: z.ZodOptional<z.ZodNumber>;
    hasAudio: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    durationMs: number;
    fps: number;
    hasAudio: boolean;
    codec?: string | undefined;
    bitrate?: number | undefined;
}, {
    durationMs: number;
    fps: number;
    codec?: string | undefined;
    bitrate?: number | undefined;
    hasAudio?: boolean | undefined;
}>;
export type VideoMetadata = z.infer<typeof VideoMetadataSchema>;
/**
 * Audio-specific metadata.
 */
export declare const AudioMetadataSchema: z.ZodObject<{
    durationMs: z.ZodNumber;
    sampleRate: z.ZodOptional<z.ZodNumber>;
    channels: z.ZodOptional<z.ZodNumber>;
    codec: z.ZodOptional<z.ZodString>;
    bitrate: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    durationMs: number;
    codec?: string | undefined;
    bitrate?: number | undefined;
    sampleRate?: number | undefined;
    channels?: number | undefined;
}, {
    durationMs: number;
    codec?: string | undefined;
    bitrate?: number | undefined;
    sampleRate?: number | undefined;
    channels?: number | undefined;
}>;
export type AudioMetadata = z.infer<typeof AudioMetadataSchema>;
/**
 * SharedAsset - A media asset stored and referenced across ACD products.
 */
export declare const SharedAssetSchema: z.ZodObject<{
    /** Unique asset identifier (UUID v4). */
    id: z.ZodString;
    /** The user who owns this asset. */
    userId: z.ZodString;
    /** Which product this asset belongs to (or was created by). */
    productId: z.ZodOptional<z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>>;
    /** Display name for the asset. */
    name: z.ZodString;
    /** Original file name at time of upload. */
    originalFileName: z.ZodOptional<z.ZodString>;
    /** Asset type/category. */
    type: z.ZodEnum<["video", "image", "audio", "document", "template", "font", "subtitle", "thumbnail", "voice_clone", "avatar", "brand_kit", "other"]>;
    /** Current processing status. */
    status: z.ZodDefault<z.ZodEnum<["uploading", "processing", "ready", "failed", "archived", "deleted"]>>;
    /** MIME type (e.g., video/mp4, image/png). */
    mimeType: z.ZodString;
    /** File size in bytes. */
    sizeBytes: z.ZodNumber;
    /** Storage provider. */
    storageProvider: z.ZodEnum<["s3", "gcs", "r2", "cloudinary", "supabase_storage", "local"]>;
    /** Storage bucket name. */
    storageBucket: z.ZodString;
    /** Storage key/path within the bucket. */
    storageKey: z.ZodString;
    /** Public URL (if publicly accessible). */
    publicUrl: z.ZodOptional<z.ZodString>;
    /** Signed/presigned URL (temporary access). */
    signedUrl: z.ZodOptional<z.ZodString>;
    /** Expiration time for the signed URL. */
    signedUrlExpiresAt: z.ZodOptional<z.ZodString>;
    /** CDN URL for optimized delivery. */
    cdnUrl: z.ZodOptional<z.ZodString>;
    /** Thumbnail URL (for video/image assets). */
    thumbnailUrl: z.ZodOptional<z.ZodString>;
    /** Image/video dimensions. */
    dimensions: z.ZodOptional<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>>;
    /** Video-specific metadata. */
    videoMetadata: z.ZodOptional<z.ZodObject<{
        durationMs: z.ZodNumber;
        fps: z.ZodNumber;
        codec: z.ZodOptional<z.ZodString>;
        bitrate: z.ZodOptional<z.ZodNumber>;
        hasAudio: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        durationMs: number;
        fps: number;
        hasAudio: boolean;
        codec?: string | undefined;
        bitrate?: number | undefined;
    }, {
        durationMs: number;
        fps: number;
        codec?: string | undefined;
        bitrate?: number | undefined;
        hasAudio?: boolean | undefined;
    }>>;
    /** Audio-specific metadata. */
    audioMetadata: z.ZodOptional<z.ZodObject<{
        durationMs: z.ZodNumber;
        sampleRate: z.ZodOptional<z.ZodNumber>;
        channels: z.ZodOptional<z.ZodNumber>;
        codec: z.ZodOptional<z.ZodString>;
        bitrate: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        durationMs: number;
        codec?: string | undefined;
        bitrate?: number | undefined;
        sampleRate?: number | undefined;
        channels?: number | undefined;
    }, {
        durationMs: number;
        codec?: string | undefined;
        bitrate?: number | undefined;
        sampleRate?: number | undefined;
        channels?: number | undefined;
    }>>;
    /** Content hash for deduplication (SHA-256). */
    contentHash: z.ZodOptional<z.ZodString>;
    /** Tags for organization and search. */
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Arbitrary metadata. */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    /** ISO 8601 timestamp of creation. */
    createdAt: z.ZodString;
    /** ISO 8601 timestamp of last update. */
    updatedAt: z.ZodString;
    /** ISO 8601 timestamp of deletion (soft delete). */
    deletedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "video" | "image" | "audio" | "document" | "template" | "font" | "subtitle" | "thumbnail" | "voice_clone" | "avatar" | "brand_kit" | "other";
    status: "uploading" | "processing" | "ready" | "failed" | "archived" | "deleted";
    id: string;
    userId: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    mimeType: string;
    sizeBytes: number;
    storageProvider: "s3" | "gcs" | "r2" | "cloudinary" | "supabase_storage" | "local";
    storageBucket: string;
    storageKey: string;
    tags: string[];
    productId?: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach" | undefined;
    originalFileName?: string | undefined;
    publicUrl?: string | undefined;
    signedUrl?: string | undefined;
    signedUrlExpiresAt?: string | undefined;
    cdnUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    dimensions?: {
        width: number;
        height: number;
    } | undefined;
    videoMetadata?: {
        durationMs: number;
        fps: number;
        hasAudio: boolean;
        codec?: string | undefined;
        bitrate?: number | undefined;
    } | undefined;
    audioMetadata?: {
        durationMs: number;
        codec?: string | undefined;
        bitrate?: number | undefined;
        sampleRate?: number | undefined;
        channels?: number | undefined;
    } | undefined;
    contentHash?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    deletedAt?: string | undefined;
}, {
    type: "video" | "image" | "audio" | "document" | "template" | "font" | "subtitle" | "thumbnail" | "voice_clone" | "avatar" | "brand_kit" | "other";
    id: string;
    userId: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    mimeType: string;
    sizeBytes: number;
    storageProvider: "s3" | "gcs" | "r2" | "cloudinary" | "supabase_storage" | "local";
    storageBucket: string;
    storageKey: string;
    status?: "uploading" | "processing" | "ready" | "failed" | "archived" | "deleted" | undefined;
    productId?: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach" | undefined;
    originalFileName?: string | undefined;
    publicUrl?: string | undefined;
    signedUrl?: string | undefined;
    signedUrlExpiresAt?: string | undefined;
    cdnUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    dimensions?: {
        width: number;
        height: number;
    } | undefined;
    videoMetadata?: {
        durationMs: number;
        fps: number;
        codec?: string | undefined;
        bitrate?: number | undefined;
        hasAudio?: boolean | undefined;
    } | undefined;
    audioMetadata?: {
        durationMs: number;
        codec?: string | undefined;
        bitrate?: number | undefined;
        sampleRate?: number | undefined;
        channels?: number | undefined;
    } | undefined;
    contentHash?: string | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    deletedAt?: string | undefined;
}>;
export type SharedAsset = z.infer<typeof SharedAssetSchema>;
//# sourceMappingURL=asset.d.ts.map