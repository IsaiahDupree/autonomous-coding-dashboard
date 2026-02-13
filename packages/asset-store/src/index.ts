// ─── @acd/asset-store ───────────────────────────────────────────────────────
// Unified asset management layer for all ACD products.
// Features: AST-001 through AST-005
// ─────────────────────────────────────────────────────────────────────────────

// AST-001: Shared Asset Storage Types
export {
  AssetTypeSchema,
  AssetSourceSchema,
  AssetStatusSchema,
  ProductIdSchema,
  StorageProviderTypeSchema,
  AssetMetadataSchema,
  AssetSchema,
  CreateAssetInputSchema,
  UpdateAssetInputSchema,
  AssetSearchParamsSchema,
} from "./types";
export type {
  AssetType,
  AssetSource,
  AssetStatus,
  ProductId,
  StorageProviderType,
  AssetMetadata,
  Asset,
  CreateAssetInput,
  UpdateAssetInput,
  AssetSearchParams,
} from "./types";

// AST-001: Storage Providers
export {
  SupabaseStorageProvider,
  LocalStorageProvider,
  S3StorageProvider,
} from "./storage";
export type {
  StorageProvider,
  StorageObjectMetadata,
} from "./storage";

// AST-002: Asset Deduplication
export {
  calculateContentHash,
  AssetDeduplicator,
} from "./dedup";
export type {
  DeduplicationResult,
} from "./dedup";

// AST-003: Asset Tagging and Search
export {
  TagNormalizer,
  InMemoryTagStore,
  TagManager,
} from "./tagger";
export type {
  TagStore,
} from "./tagger";

// AST-004: Asset Usage Tracking
export {
  UsageTracker,
} from "./usage";
export type {
  UsageContext,
  UsageRecord,
  PersistenceCallback,
} from "./usage";

// AST-005: Meta Asset Upload
export {
  MetaAssetUploader,
} from "./meta-upload";
export type {
  MetaImageUploadResult,
  MetaVideoUploadResult,
  MetaVideoStatus,
} from "./meta-upload";
