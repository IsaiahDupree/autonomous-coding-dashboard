"use strict";
/**
 * CACHE-004: Asset Metadata Cache
 *
 * Caches metadata for video/image assets (dimensions, duration,
 * format info, thumbnails) to avoid repeated storage lookups.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetMetadataCache = void 0;
const cache_1 = require("./cache");
// ── AssetMetadataCache ───────────────────────────────────────────────────────
class AssetMetadataCache {
    constructor(options = {}) {
        this.byUrl = new Map(); // storageUrl -> assetId
        this.cache = new cache_1.CacheManager({
            defaultTtlMs: options.ttlMs ?? 3600000, // 1 hour
            maxSize: options.maxEntries ?? 10000,
            prefix: 'asset',
        });
    }
    /**
     * Cache asset metadata.
     */
    set(metadata) {
        this.cache.set(metadata.assetId, metadata);
        this.byUrl.set(metadata.storageUrl, metadata.assetId);
    }
    /**
     * Get asset metadata by asset ID.
     */
    get(assetId) {
        return this.cache.get(assetId);
    }
    /**
     * Get asset metadata by storage URL.
     */
    getByUrl(storageUrl) {
        const assetId = this.byUrl.get(storageUrl);
        if (!assetId)
            return null;
        return this.get(assetId);
    }
    /**
     * Update specific fields of cached metadata.
     */
    update(assetId, updates) {
        const existing = this.get(assetId);
        if (!existing)
            return null;
        const updated = { ...existing, ...updates, assetId: existing.assetId };
        this.set(updated);
        return updated;
    }
    /**
     * Remove asset metadata from cache.
     */
    remove(assetId) {
        const meta = this.get(assetId);
        if (meta) {
            this.byUrl.delete(meta.storageUrl);
        }
        return this.cache.delete(assetId);
    }
    /**
     * Bulk cache multiple assets.
     */
    setMany(assets) {
        for (const asset of assets) {
            this.set(asset);
        }
    }
    /**
     * Get multiple assets by ID.
     */
    getMany(assetIds) {
        return assetIds.map((id) => this.get(id));
    }
    /**
     * Check if an asset is cached.
     */
    has(assetId) {
        return this.cache.has(assetId);
    }
    /**
     * Get cache statistics.
     */
    getStats() {
        return this.cache.getStats();
    }
    /**
     * Clear all cached asset metadata.
     */
    clear() {
        this.cache.clear();
        this.byUrl.clear();
    }
}
exports.AssetMetadataCache = AssetMetadataCache;
