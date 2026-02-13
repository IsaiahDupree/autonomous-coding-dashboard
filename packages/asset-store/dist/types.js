"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetSearchParamsSchema = exports.UpdateAssetInputSchema = exports.CreateAssetInputSchema = exports.AssetSchema = exports.AssetMetadataSchema = exports.StorageProviderTypeSchema = exports.ProductIdSchema = exports.AssetStatusSchema = exports.AssetSourceSchema = exports.AssetTypeSchema = void 0;
const zod_1 = require("zod");
// ─── AST-001: Shared Asset Storage Types ────────────────────────────────────
/**
 * AssetType - All supported asset types in the ACD ecosystem.
 */
exports.AssetTypeSchema = zod_1.z.enum([
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
/**
 * AssetSource - Where the asset originated from.
 */
exports.AssetSourceSchema = zod_1.z.enum([
    "upload",
    "generated",
    "remotion_render",
    "ai_generated",
    "meta_ad",
    "tiktok",
    "youtube",
    "imported",
]);
/**
 * AssetStatus - Lifecycle status of an asset.
 */
exports.AssetStatusSchema = zod_1.z.enum([
    "pending",
    "processing",
    "ready",
    "failed",
    "archived",
    "deleted",
]);
/**
 * ProductId - References all ACD product identifiers.
 * Mirrors @acd/types ProductIdSchema for self-contained use.
 */
exports.ProductIdSchema = zod_1.z.enum([
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
/**
 * StorageProviderType - Supported storage backends.
 */
exports.StorageProviderTypeSchema = zod_1.z.enum([
    "s3",
    "supabase",
    "r2",
    "local",
]);
/**
 * AssetMetadata - Technical metadata extracted from asset files.
 */
exports.AssetMetadataSchema = zod_1.z.object({
    /** Image/video width in pixels */
    width: zod_1.z.number().int().positive().optional(),
    /** Image/video height in pixels */
    height: zod_1.z.number().int().positive().optional(),
    /** Audio/video duration in seconds */
    duration: zod_1.z.number().nonnegative().optional(),
    /** Video frames per second */
    fps: zod_1.z.number().positive().optional(),
    /** Media codec (e.g. h264, aac) */
    codec: zod_1.z.string().optional(),
    /** Media bitrate in bits per second */
    bitrate: zod_1.z.number().int().nonnegative().optional(),
    /** Audio sample rate in Hz */
    sampleRate: zod_1.z.number().int().positive().optional(),
    /** Audio channel count */
    channels: zod_1.z.number().int().positive().optional(),
    /** MIME type of the asset */
    mimeType: zod_1.z.string().min(1),
    /** File size in bytes */
    fileSize: zod_1.z.number().int().nonnegative(),
    /** SHA-256 content hash for deduplication */
    contentHash: zod_1.z.string().regex(/^[a-f0-9]{64}$/, "Must be a valid SHA-256 hex string"),
});
/**
 * Asset - Full asset record in the asset store.
 */
exports.AssetSchema = zod_1.z.object({
    /** Unique asset identifier */
    id: zod_1.z.string().uuid(),
    /** Organization that owns this asset */
    orgId: zod_1.z.string().min(1),
    /** User who created/uploaded this asset */
    creatorId: zod_1.z.string().min(1),
    /** Type classification of the asset */
    type: exports.AssetTypeSchema,
    /** How the asset was sourced */
    source: exports.AssetSourceSchema,
    /** Current lifecycle status */
    status: exports.AssetStatusSchema,
    /** Human-readable display name */
    name: zod_1.z.string().min(1),
    /** Original filename at upload time */
    originalFilename: zod_1.z.string().min(1),
    /** Internal storage path/key */
    storagePath: zod_1.z.string().min(1),
    /** Which storage backend holds this asset */
    storageProvider: exports.StorageProviderTypeSchema,
    /** Public URL if the asset is publicly accessible */
    publicUrl: zod_1.z.string().url().optional(),
    /** URL for the asset thumbnail */
    thumbnailUrl: zod_1.z.string().url().optional(),
    /** Technical metadata */
    metadata: exports.AssetMetadataSchema,
    /** User-defined tags for organization and search */
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    /** Number of times this asset has been used across products */
    usageCount: zod_1.z.number().int().nonnegative().default(0),
    /** Products that have used this asset */
    products: zod_1.z.array(exports.ProductIdSchema).default([]),
    /** When this asset record was created */
    createdAt: zod_1.z.string().datetime(),
    /** When this asset record was last updated */
    updatedAt: zod_1.z.string().datetime(),
});
/**
 * CreateAssetInput - Input schema for creating a new asset.
 */
exports.CreateAssetInputSchema = zod_1.z.object({
    orgId: zod_1.z.string().min(1),
    creatorId: zod_1.z.string().min(1),
    type: exports.AssetTypeSchema,
    source: exports.AssetSourceSchema,
    name: zod_1.z.string().min(1),
    originalFilename: zod_1.z.string().min(1),
    storagePath: zod_1.z.string().min(1),
    storageProvider: exports.StorageProviderTypeSchema,
    publicUrl: zod_1.z.string().url().optional(),
    thumbnailUrl: zod_1.z.string().url().optional(),
    metadata: exports.AssetMetadataSchema,
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    products: zod_1.z.array(exports.ProductIdSchema).default([]),
});
/**
 * UpdateAssetInput - Input schema for updating an existing asset.
 * All fields are optional.
 */
exports.UpdateAssetInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    status: exports.AssetStatusSchema.optional(),
    publicUrl: zod_1.z.string().url().optional(),
    thumbnailUrl: zod_1.z.string().url().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    products: zod_1.z.array(exports.ProductIdSchema).optional(),
    metadata: exports.AssetMetadataSchema.partial().optional(),
});
/**
 * AssetSearchParams - Parameters for searching/filtering assets (AST-003).
 */
exports.AssetSearchParamsSchema = zod_1.z.object({
    /** Free-text search query */
    query: zod_1.z.string().optional(),
    /** Filter by asset types */
    types: zod_1.z.array(exports.AssetTypeSchema).optional(),
    /** Filter by asset sources */
    sources: zod_1.z.array(exports.AssetSourceSchema).optional(),
    /** Filter by tags */
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    /** Filter by products that use the asset */
    products: zod_1.z.array(exports.ProductIdSchema).optional(),
    /** Required: organization scope */
    orgId: zod_1.z.string().min(1),
    /** Filter by creator */
    creatorId: zod_1.z.string().optional(),
    /** Minimum file size in bytes */
    minSize: zod_1.z.number().int().nonnegative().optional(),
    /** Maximum file size in bytes */
    maxSize: zod_1.z.number().int().nonnegative().optional(),
    /** Sort field */
    sortBy: zod_1.z.enum(["createdAt", "updatedAt", "name", "fileSize", "usageCount"]).optional(),
    /** Sort direction */
    sortOrder: zod_1.z.enum(["asc", "desc"]).optional(),
    /** Page number (1-indexed) */
    page: zod_1.z.number().int().positive().optional(),
    /** Results per page */
    limit: zod_1.z.number().int().positive().max(100).optional(),
});
//# sourceMappingURL=types.js.map