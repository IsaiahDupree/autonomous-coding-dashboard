import { z } from "zod";
/**
 * AssetType - All supported asset types in the ACD ecosystem.
 */
export declare const AssetTypeSchema: z.ZodEnum<["image", "video", "audio", "font", "template", "document", "subtitle", "thumbnail", "voice_clone", "lottie", "svg", "other"]>;
export type AssetType = z.infer<typeof AssetTypeSchema>;
/**
 * AssetSource - Where the asset originated from.
 */
export declare const AssetSourceSchema: z.ZodEnum<["upload", "generated", "remotion_render", "ai_generated", "meta_ad", "tiktok", "youtube", "imported"]>;
export type AssetSource = z.infer<typeof AssetSourceSchema>;
/**
 * AssetStatus - Lifecycle status of an asset.
 */
export declare const AssetStatusSchema: z.ZodEnum<["pending", "processing", "ready", "failed", "archived", "deleted"]>;
export type AssetStatus = z.infer<typeof AssetStatusSchema>;
/**
 * ProductId - References all ACD product identifiers.
 * Mirrors @acd/types ProductIdSchema for self-contained use.
 */
export declare const ProductIdSchema: z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>;
export type ProductId = z.infer<typeof ProductIdSchema>;
/**
 * StorageProviderType - Supported storage backends.
 */
export declare const StorageProviderTypeSchema: z.ZodEnum<["s3", "supabase", "r2", "local"]>;
export type StorageProviderType = z.infer<typeof StorageProviderTypeSchema>;
/**
 * AssetMetadata - Technical metadata extracted from asset files.
 */
export declare const AssetMetadataSchema: z.ZodObject<{
    /** Image/video width in pixels */
    width: z.ZodOptional<z.ZodNumber>;
    /** Image/video height in pixels */
    height: z.ZodOptional<z.ZodNumber>;
    /** Audio/video duration in seconds */
    duration: z.ZodOptional<z.ZodNumber>;
    /** Video frames per second */
    fps: z.ZodOptional<z.ZodNumber>;
    /** Media codec (e.g. h264, aac) */
    codec: z.ZodOptional<z.ZodString>;
    /** Media bitrate in bits per second */
    bitrate: z.ZodOptional<z.ZodNumber>;
    /** Audio sample rate in Hz */
    sampleRate: z.ZodOptional<z.ZodNumber>;
    /** Audio channel count */
    channels: z.ZodOptional<z.ZodNumber>;
    /** MIME type of the asset */
    mimeType: z.ZodString;
    /** File size in bytes */
    fileSize: z.ZodNumber;
    /** SHA-256 content hash for deduplication */
    contentHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    mimeType: string;
    fileSize: number;
    contentHash: string;
    width?: number | undefined;
    height?: number | undefined;
    duration?: number | undefined;
    fps?: number | undefined;
    codec?: string | undefined;
    bitrate?: number | undefined;
    sampleRate?: number | undefined;
    channels?: number | undefined;
}, {
    mimeType: string;
    fileSize: number;
    contentHash: string;
    width?: number | undefined;
    height?: number | undefined;
    duration?: number | undefined;
    fps?: number | undefined;
    codec?: string | undefined;
    bitrate?: number | undefined;
    sampleRate?: number | undefined;
    channels?: number | undefined;
}>;
export type AssetMetadata = z.infer<typeof AssetMetadataSchema>;
/**
 * Asset - Full asset record in the asset store.
 */
export declare const AssetSchema: z.ZodObject<{
    /** Unique asset identifier */
    id: z.ZodString;
    /** Organization that owns this asset */
    orgId: z.ZodString;
    /** User who created/uploaded this asset */
    creatorId: z.ZodString;
    /** Type classification of the asset */
    type: z.ZodEnum<["image", "video", "audio", "font", "template", "document", "subtitle", "thumbnail", "voice_clone", "lottie", "svg", "other"]>;
    /** How the asset was sourced */
    source: z.ZodEnum<["upload", "generated", "remotion_render", "ai_generated", "meta_ad", "tiktok", "youtube", "imported"]>;
    /** Current lifecycle status */
    status: z.ZodEnum<["pending", "processing", "ready", "failed", "archived", "deleted"]>;
    /** Human-readable display name */
    name: z.ZodString;
    /** Original filename at upload time */
    originalFilename: z.ZodString;
    /** Internal storage path/key */
    storagePath: z.ZodString;
    /** Which storage backend holds this asset */
    storageProvider: z.ZodEnum<["s3", "supabase", "r2", "local"]>;
    /** Public URL if the asset is publicly accessible */
    publicUrl: z.ZodOptional<z.ZodString>;
    /** URL for the asset thumbnail */
    thumbnailUrl: z.ZodOptional<z.ZodString>;
    /** Technical metadata */
    metadata: z.ZodObject<{
        /** Image/video width in pixels */
        width: z.ZodOptional<z.ZodNumber>;
        /** Image/video height in pixels */
        height: z.ZodOptional<z.ZodNumber>;
        /** Audio/video duration in seconds */
        duration: z.ZodOptional<z.ZodNumber>;
        /** Video frames per second */
        fps: z.ZodOptional<z.ZodNumber>;
        /** Media codec (e.g. h264, aac) */
        codec: z.ZodOptional<z.ZodString>;
        /** Media bitrate in bits per second */
        bitrate: z.ZodOptional<z.ZodNumber>;
        /** Audio sample rate in Hz */
        sampleRate: z.ZodOptional<z.ZodNumber>;
        /** Audio channel count */
        channels: z.ZodOptional<z.ZodNumber>;
        /** MIME type of the asset */
        mimeType: z.ZodString;
        /** File size in bytes */
        fileSize: z.ZodNumber;
        /** SHA-256 content hash for deduplication */
        contentHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        mimeType: string;
        fileSize: number;
        contentHash: string;
        width?: number | undefined;
        height?: number | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        codec?: string | undefined;
        bitrate?: number | undefined;
        sampleRate?: number | undefined;
        channels?: number | undefined;
    }, {
        mimeType: string;
        fileSize: number;
        contentHash: string;
        width?: number | undefined;
        height?: number | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        codec?: string | undefined;
        bitrate?: number | undefined;
        sampleRate?: number | undefined;
        channels?: number | undefined;
    }>;
    /** User-defined tags for organization and search */
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Number of times this asset has been used across products */
    usageCount: z.ZodDefault<z.ZodNumber>;
    /** Products that have used this asset */
    products: z.ZodDefault<z.ZodArray<z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>, "many">>;
    /** When this asset record was created */
    createdAt: z.ZodString;
    /** When this asset record was last updated */
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "image" | "video" | "audio" | "font" | "template" | "document" | "subtitle" | "thumbnail" | "voice_clone" | "lottie" | "svg" | "other";
    status: "pending" | "processing" | "ready" | "failed" | "archived" | "deleted";
    id: string;
    orgId: string;
    creatorId: string;
    source: "upload" | "generated" | "remotion_render" | "ai_generated" | "meta_ad" | "tiktok" | "youtube" | "imported";
    name: string;
    originalFilename: string;
    storagePath: string;
    storageProvider: "s3" | "supabase" | "r2" | "local";
    metadata: {
        mimeType: string;
        fileSize: number;
        contentHash: string;
        width?: number | undefined;
        height?: number | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        codec?: string | undefined;
        bitrate?: number | undefined;
        sampleRate?: number | undefined;
        channels?: number | undefined;
    };
    tags: string[];
    usageCount: number;
    products: ("portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach")[];
    createdAt: string;
    updatedAt: string;
    publicUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
}, {
    type: "image" | "video" | "audio" | "font" | "template" | "document" | "subtitle" | "thumbnail" | "voice_clone" | "lottie" | "svg" | "other";
    status: "pending" | "processing" | "ready" | "failed" | "archived" | "deleted";
    id: string;
    orgId: string;
    creatorId: string;
    source: "upload" | "generated" | "remotion_render" | "ai_generated" | "meta_ad" | "tiktok" | "youtube" | "imported";
    name: string;
    originalFilename: string;
    storagePath: string;
    storageProvider: "s3" | "supabase" | "r2" | "local";
    metadata: {
        mimeType: string;
        fileSize: number;
        contentHash: string;
        width?: number | undefined;
        height?: number | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        codec?: string | undefined;
        bitrate?: number | undefined;
        sampleRate?: number | undefined;
        channels?: number | undefined;
    };
    createdAt: string;
    updatedAt: string;
    publicUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    tags?: string[] | undefined;
    usageCount?: number | undefined;
    products?: ("portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach")[] | undefined;
}>;
export type Asset = z.infer<typeof AssetSchema>;
/**
 * CreateAssetInput - Input schema for creating a new asset.
 */
export declare const CreateAssetInputSchema: z.ZodObject<{
    orgId: z.ZodString;
    creatorId: z.ZodString;
    type: z.ZodEnum<["image", "video", "audio", "font", "template", "document", "subtitle", "thumbnail", "voice_clone", "lottie", "svg", "other"]>;
    source: z.ZodEnum<["upload", "generated", "remotion_render", "ai_generated", "meta_ad", "tiktok", "youtube", "imported"]>;
    name: z.ZodString;
    originalFilename: z.ZodString;
    storagePath: z.ZodString;
    storageProvider: z.ZodEnum<["s3", "supabase", "r2", "local"]>;
    publicUrl: z.ZodOptional<z.ZodString>;
    thumbnailUrl: z.ZodOptional<z.ZodString>;
    metadata: z.ZodObject<{
        /** Image/video width in pixels */
        width: z.ZodOptional<z.ZodNumber>;
        /** Image/video height in pixels */
        height: z.ZodOptional<z.ZodNumber>;
        /** Audio/video duration in seconds */
        duration: z.ZodOptional<z.ZodNumber>;
        /** Video frames per second */
        fps: z.ZodOptional<z.ZodNumber>;
        /** Media codec (e.g. h264, aac) */
        codec: z.ZodOptional<z.ZodString>;
        /** Media bitrate in bits per second */
        bitrate: z.ZodOptional<z.ZodNumber>;
        /** Audio sample rate in Hz */
        sampleRate: z.ZodOptional<z.ZodNumber>;
        /** Audio channel count */
        channels: z.ZodOptional<z.ZodNumber>;
        /** MIME type of the asset */
        mimeType: z.ZodString;
        /** File size in bytes */
        fileSize: z.ZodNumber;
        /** SHA-256 content hash for deduplication */
        contentHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        mimeType: string;
        fileSize: number;
        contentHash: string;
        width?: number | undefined;
        height?: number | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        codec?: string | undefined;
        bitrate?: number | undefined;
        sampleRate?: number | undefined;
        channels?: number | undefined;
    }, {
        mimeType: string;
        fileSize: number;
        contentHash: string;
        width?: number | undefined;
        height?: number | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        codec?: string | undefined;
        bitrate?: number | undefined;
        sampleRate?: number | undefined;
        channels?: number | undefined;
    }>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    products: z.ZodDefault<z.ZodArray<z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "image" | "video" | "audio" | "font" | "template" | "document" | "subtitle" | "thumbnail" | "voice_clone" | "lottie" | "svg" | "other";
    orgId: string;
    creatorId: string;
    source: "upload" | "generated" | "remotion_render" | "ai_generated" | "meta_ad" | "tiktok" | "youtube" | "imported";
    name: string;
    originalFilename: string;
    storagePath: string;
    storageProvider: "s3" | "supabase" | "r2" | "local";
    metadata: {
        mimeType: string;
        fileSize: number;
        contentHash: string;
        width?: number | undefined;
        height?: number | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        codec?: string | undefined;
        bitrate?: number | undefined;
        sampleRate?: number | undefined;
        channels?: number | undefined;
    };
    tags: string[];
    products: ("portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach")[];
    publicUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
}, {
    type: "image" | "video" | "audio" | "font" | "template" | "document" | "subtitle" | "thumbnail" | "voice_clone" | "lottie" | "svg" | "other";
    orgId: string;
    creatorId: string;
    source: "upload" | "generated" | "remotion_render" | "ai_generated" | "meta_ad" | "tiktok" | "youtube" | "imported";
    name: string;
    originalFilename: string;
    storagePath: string;
    storageProvider: "s3" | "supabase" | "r2" | "local";
    metadata: {
        mimeType: string;
        fileSize: number;
        contentHash: string;
        width?: number | undefined;
        height?: number | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        codec?: string | undefined;
        bitrate?: number | undefined;
        sampleRate?: number | undefined;
        channels?: number | undefined;
    };
    publicUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    tags?: string[] | undefined;
    products?: ("portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach")[] | undefined;
}>;
export type CreateAssetInput = z.infer<typeof CreateAssetInputSchema>;
/**
 * UpdateAssetInput - Input schema for updating an existing asset.
 * All fields are optional.
 */
export declare const UpdateAssetInputSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["pending", "processing", "ready", "failed", "archived", "deleted"]>>;
    publicUrl: z.ZodOptional<z.ZodString>;
    thumbnailUrl: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    products: z.ZodOptional<z.ZodArray<z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>, "many">>;
    metadata: z.ZodOptional<z.ZodObject<{
        width: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        height: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        duration: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        fps: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        codec: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        bitrate: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        sampleRate: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        channels: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        mimeType: z.ZodOptional<z.ZodString>;
        fileSize: z.ZodOptional<z.ZodNumber>;
        contentHash: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        width?: number | undefined;
        height?: number | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        codec?: string | undefined;
        bitrate?: number | undefined;
        sampleRate?: number | undefined;
        channels?: number | undefined;
        mimeType?: string | undefined;
        fileSize?: number | undefined;
        contentHash?: string | undefined;
    }, {
        width?: number | undefined;
        height?: number | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        codec?: string | undefined;
        bitrate?: number | undefined;
        sampleRate?: number | undefined;
        channels?: number | undefined;
        mimeType?: string | undefined;
        fileSize?: number | undefined;
        contentHash?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    status?: "pending" | "processing" | "ready" | "failed" | "archived" | "deleted" | undefined;
    name?: string | undefined;
    publicUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    metadata?: {
        width?: number | undefined;
        height?: number | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        codec?: string | undefined;
        bitrate?: number | undefined;
        sampleRate?: number | undefined;
        channels?: number | undefined;
        mimeType?: string | undefined;
        fileSize?: number | undefined;
        contentHash?: string | undefined;
    } | undefined;
    tags?: string[] | undefined;
    products?: ("portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach")[] | undefined;
}, {
    status?: "pending" | "processing" | "ready" | "failed" | "archived" | "deleted" | undefined;
    name?: string | undefined;
    publicUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    metadata?: {
        width?: number | undefined;
        height?: number | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        codec?: string | undefined;
        bitrate?: number | undefined;
        sampleRate?: number | undefined;
        channels?: number | undefined;
        mimeType?: string | undefined;
        fileSize?: number | undefined;
        contentHash?: string | undefined;
    } | undefined;
    tags?: string[] | undefined;
    products?: ("portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach")[] | undefined;
}>;
export type UpdateAssetInput = z.infer<typeof UpdateAssetInputSchema>;
/**
 * AssetSearchParams - Parameters for searching/filtering assets (AST-003).
 */
export declare const AssetSearchParamsSchema: z.ZodObject<{
    /** Free-text search query */
    query: z.ZodOptional<z.ZodString>;
    /** Filter by asset types */
    types: z.ZodOptional<z.ZodArray<z.ZodEnum<["image", "video", "audio", "font", "template", "document", "subtitle", "thumbnail", "voice_clone", "lottie", "svg", "other"]>, "many">>;
    /** Filter by asset sources */
    sources: z.ZodOptional<z.ZodArray<z.ZodEnum<["upload", "generated", "remotion_render", "ai_generated", "meta_ad", "tiktok", "youtube", "imported"]>, "many">>;
    /** Filter by tags */
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Filter by products that use the asset */
    products: z.ZodOptional<z.ZodArray<z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>, "many">>;
    /** Required: organization scope */
    orgId: z.ZodString;
    /** Filter by creator */
    creatorId: z.ZodOptional<z.ZodString>;
    /** Minimum file size in bytes */
    minSize: z.ZodOptional<z.ZodNumber>;
    /** Maximum file size in bytes */
    maxSize: z.ZodOptional<z.ZodNumber>;
    /** Sort field */
    sortBy: z.ZodOptional<z.ZodEnum<["createdAt", "updatedAt", "name", "fileSize", "usageCount"]>>;
    /** Sort direction */
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
    /** Page number (1-indexed) */
    page: z.ZodOptional<z.ZodNumber>;
    /** Results per page */
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    orgId: string;
    creatorId?: string | undefined;
    tags?: string[] | undefined;
    products?: ("portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach")[] | undefined;
    query?: string | undefined;
    types?: ("image" | "video" | "audio" | "font" | "template" | "document" | "subtitle" | "thumbnail" | "voice_clone" | "lottie" | "svg" | "other")[] | undefined;
    sources?: ("upload" | "generated" | "remotion_render" | "ai_generated" | "meta_ad" | "tiktok" | "youtube" | "imported")[] | undefined;
    minSize?: number | undefined;
    maxSize?: number | undefined;
    sortBy?: "fileSize" | "name" | "usageCount" | "createdAt" | "updatedAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}, {
    orgId: string;
    creatorId?: string | undefined;
    tags?: string[] | undefined;
    products?: ("portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach")[] | undefined;
    query?: string | undefined;
    types?: ("image" | "video" | "audio" | "font" | "template" | "document" | "subtitle" | "thumbnail" | "voice_clone" | "lottie" | "svg" | "other")[] | undefined;
    sources?: ("upload" | "generated" | "remotion_render" | "ai_generated" | "meta_ad" | "tiktok" | "youtube" | "imported")[] | undefined;
    minSize?: number | undefined;
    maxSize?: number | undefined;
    sortBy?: "fileSize" | "name" | "usageCount" | "createdAt" | "updatedAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}>;
export type AssetSearchParams = z.infer<typeof AssetSearchParamsSchema>;
//# sourceMappingURL=types.d.ts.map