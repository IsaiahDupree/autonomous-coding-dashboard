/**
 * CACHE-004: Asset Metadata Cache
 *
 * Caches metadata for video/image assets (dimensions, duration,
 * format info, thumbnails) to avoid repeated storage lookups.
 */
export interface AssetMetadata {
    assetId: string;
    type: 'video' | 'image' | 'audio' | 'document';
    filename: string;
    mimeType: string;
    sizeBytes: number;
    dimensions?: {
        width: number;
        height: number;
    };
    duration?: number;
    thumbnailUrl?: string;
    storageUrl: string;
    uploadedAt: Date;
    metadata: Record<string, unknown>;
}
export interface AssetMetadataCacheOptions {
    ttlMs?: number;
    maxEntries?: number;
}
export declare class AssetMetadataCache {
    private cache;
    private byUrl;
    constructor(options?: AssetMetadataCacheOptions);
    /**
     * Cache asset metadata.
     */
    set(metadata: AssetMetadata): void;
    /**
     * Get asset metadata by asset ID.
     */
    get(assetId: string): AssetMetadata | null;
    /**
     * Get asset metadata by storage URL.
     */
    getByUrl(storageUrl: string): AssetMetadata | null;
    /**
     * Update specific fields of cached metadata.
     */
    update(assetId: string, updates: Partial<AssetMetadata>): AssetMetadata | null;
    /**
     * Remove asset metadata from cache.
     */
    remove(assetId: string): boolean;
    /**
     * Bulk cache multiple assets.
     */
    setMany(assets: AssetMetadata[]): void;
    /**
     * Get multiple assets by ID.
     */
    getMany(assetIds: string[]): (AssetMetadata | null)[];
    /**
     * Check if an asset is cached.
     */
    has(assetId: string): boolean;
    /**
     * Get cache statistics.
     */
    getStats(): import("./cache").CacheStats;
    /**
     * Clear all cached asset metadata.
     */
    clear(): void;
}
