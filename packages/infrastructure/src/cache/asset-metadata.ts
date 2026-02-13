/**
 * CACHE-004: Asset Metadata Cache
 *
 * Caches metadata for video/image assets (dimensions, duration,
 * format info, thumbnails) to avoid repeated storage lookups.
 */

import { CacheManager } from './cache';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AssetMetadata {
  assetId: string;
  type: 'video' | 'image' | 'audio' | 'document';
  filename: string;
  mimeType: string;
  sizeBytes: number;
  dimensions?: { width: number; height: number };
  duration?: number; // seconds, for video/audio
  thumbnailUrl?: string;
  storageUrl: string;
  uploadedAt: Date;
  metadata: Record<string, unknown>;
}

export interface AssetMetadataCacheOptions {
  ttlMs?: number;
  maxEntries?: number;
}

// ── AssetMetadataCache ───────────────────────────────────────────────────────

export class AssetMetadataCache {
  private cache: CacheManager;
  private byUrl: Map<string, string> = new Map(); // storageUrl -> assetId

  constructor(options: AssetMetadataCacheOptions = {}) {
    this.cache = new CacheManager({
      defaultTtlMs: options.ttlMs ?? 3_600_000, // 1 hour
      maxSize: options.maxEntries ?? 10_000,
      prefix: 'asset',
    });
  }

  /**
   * Cache asset metadata.
   */
  set(metadata: AssetMetadata): void {
    this.cache.set(metadata.assetId, metadata);
    this.byUrl.set(metadata.storageUrl, metadata.assetId);
  }

  /**
   * Get asset metadata by asset ID.
   */
  get(assetId: string): AssetMetadata | null {
    return this.cache.get<AssetMetadata>(assetId);
  }

  /**
   * Get asset metadata by storage URL.
   */
  getByUrl(storageUrl: string): AssetMetadata | null {
    const assetId = this.byUrl.get(storageUrl);
    if (!assetId) return null;
    return this.get(assetId);
  }

  /**
   * Update specific fields of cached metadata.
   */
  update(assetId: string, updates: Partial<AssetMetadata>): AssetMetadata | null {
    const existing = this.get(assetId);
    if (!existing) return null;

    const updated: AssetMetadata = { ...existing, ...updates, assetId: existing.assetId };
    this.set(updated);
    return updated;
  }

  /**
   * Remove asset metadata from cache.
   */
  remove(assetId: string): boolean {
    const meta = this.get(assetId);
    if (meta) {
      this.byUrl.delete(meta.storageUrl);
    }
    return this.cache.delete(assetId);
  }

  /**
   * Bulk cache multiple assets.
   */
  setMany(assets: AssetMetadata[]): void {
    for (const asset of assets) {
      this.set(asset);
    }
  }

  /**
   * Get multiple assets by ID.
   */
  getMany(assetIds: string[]): (AssetMetadata | null)[] {
    return assetIds.map((id) => this.get(id));
  }

  /**
   * Check if an asset is cached.
   */
  has(assetId: string): boolean {
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
  clear(): void {
    this.cache.clear();
    this.byUrl.clear();
  }
}
