"use strict";
// ─── @acd/asset-store ───────────────────────────────────────────────────────
// Unified asset management layer for all ACD products.
// Features: AST-001 through AST-005
// ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaAssetUploader = exports.UsageTracker = exports.TagManager = exports.InMemoryTagStore = exports.TagNormalizer = exports.AssetDeduplicator = exports.calculateContentHash = exports.S3StorageProvider = exports.LocalStorageProvider = exports.SupabaseStorageProvider = exports.AssetSearchParamsSchema = exports.UpdateAssetInputSchema = exports.CreateAssetInputSchema = exports.AssetSchema = exports.AssetMetadataSchema = exports.StorageProviderTypeSchema = exports.ProductIdSchema = exports.AssetStatusSchema = exports.AssetSourceSchema = exports.AssetTypeSchema = void 0;
// AST-001: Shared Asset Storage Types
var types_1 = require("./types");
Object.defineProperty(exports, "AssetTypeSchema", { enumerable: true, get: function () { return types_1.AssetTypeSchema; } });
Object.defineProperty(exports, "AssetSourceSchema", { enumerable: true, get: function () { return types_1.AssetSourceSchema; } });
Object.defineProperty(exports, "AssetStatusSchema", { enumerable: true, get: function () { return types_1.AssetStatusSchema; } });
Object.defineProperty(exports, "ProductIdSchema", { enumerable: true, get: function () { return types_1.ProductIdSchema; } });
Object.defineProperty(exports, "StorageProviderTypeSchema", { enumerable: true, get: function () { return types_1.StorageProviderTypeSchema; } });
Object.defineProperty(exports, "AssetMetadataSchema", { enumerable: true, get: function () { return types_1.AssetMetadataSchema; } });
Object.defineProperty(exports, "AssetSchema", { enumerable: true, get: function () { return types_1.AssetSchema; } });
Object.defineProperty(exports, "CreateAssetInputSchema", { enumerable: true, get: function () { return types_1.CreateAssetInputSchema; } });
Object.defineProperty(exports, "UpdateAssetInputSchema", { enumerable: true, get: function () { return types_1.UpdateAssetInputSchema; } });
Object.defineProperty(exports, "AssetSearchParamsSchema", { enumerable: true, get: function () { return types_1.AssetSearchParamsSchema; } });
// AST-001: Storage Providers
var storage_1 = require("./storage");
Object.defineProperty(exports, "SupabaseStorageProvider", { enumerable: true, get: function () { return storage_1.SupabaseStorageProvider; } });
Object.defineProperty(exports, "LocalStorageProvider", { enumerable: true, get: function () { return storage_1.LocalStorageProvider; } });
Object.defineProperty(exports, "S3StorageProvider", { enumerable: true, get: function () { return storage_1.S3StorageProvider; } });
// AST-002: Asset Deduplication
var dedup_1 = require("./dedup");
Object.defineProperty(exports, "calculateContentHash", { enumerable: true, get: function () { return dedup_1.calculateContentHash; } });
Object.defineProperty(exports, "AssetDeduplicator", { enumerable: true, get: function () { return dedup_1.AssetDeduplicator; } });
// AST-003: Asset Tagging and Search
var tagger_1 = require("./tagger");
Object.defineProperty(exports, "TagNormalizer", { enumerable: true, get: function () { return tagger_1.TagNormalizer; } });
Object.defineProperty(exports, "InMemoryTagStore", { enumerable: true, get: function () { return tagger_1.InMemoryTagStore; } });
Object.defineProperty(exports, "TagManager", { enumerable: true, get: function () { return tagger_1.TagManager; } });
// AST-004: Asset Usage Tracking
var usage_1 = require("./usage");
Object.defineProperty(exports, "UsageTracker", { enumerable: true, get: function () { return usage_1.UsageTracker; } });
// AST-005: Meta Asset Upload
var meta_upload_1 = require("./meta-upload");
Object.defineProperty(exports, "MetaAssetUploader", { enumerable: true, get: function () { return meta_upload_1.MetaAssetUploader; } });
//# sourceMappingURL=index.js.map