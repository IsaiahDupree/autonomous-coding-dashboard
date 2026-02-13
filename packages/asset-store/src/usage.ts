import type { ProductId } from "./types";

// ─── AST-004: Asset Usage Tracking ──────────────────────────────────────────

/**
 * UsageContext - Additional context about how an asset is being used.
 */
export interface UsageContext {
  /** Component or widget that uses the asset */
  componentId?: string;
  /** Page URL where the asset appears */
  pageUrl?: string;
  /** Ad ID if used in an ad creative */
  adId?: string;
}

/**
 * UsageRecord - A single usage event for an asset.
 */
export interface UsageRecord {
  assetId: string;
  product: ProductId;
  context?: UsageContext;
  timestamp: string;
}

/**
 * PersistenceCallback - Called when usage data changes, allowing external persistence.
 */
export type PersistenceCallback = (records: UsageRecord[]) => Promise<void>;

/**
 * UsageTracker - Tracks how assets are used across ACD products.
 *
 * Uses an in-memory store with an optional persistence callback for
 * writing usage data to an external database.
 */
export class UsageTracker {
  /** Map of assetId -> usage records */
  private records: Map<string, UsageRecord[]> = new Map();
  /** Map of assetId -> orgId for scoping queries */
  private assetOrgs: Map<string, string> = new Map();
  /** Map of assetId -> createdAt for age-based queries */
  private assetCreatedAt: Map<string, string> = new Map();
  /** Optional callback for persisting usage data */
  private persistCallback: PersistenceCallback | null = null;

  /**
   * @param persistCallback - Optional callback invoked when usage data changes.
   */
  constructor(persistCallback?: PersistenceCallback) {
    this.persistCallback = persistCallback || null;
  }

  /**
   * Register an asset with the tracker (for org-scoped queries).
   */
  registerAsset(assetId: string, orgId: string, createdAt: string): void {
    this.assetOrgs.set(assetId, orgId);
    this.assetCreatedAt.set(assetId, createdAt);
  }

  /**
   * Record a usage event for an asset.
   */
  async recordUsage(assetId: string, product: ProductId, context?: UsageContext): Promise<void> {
    const record: UsageRecord = {
      assetId,
      product,
      context,
      timestamp: new Date().toISOString(),
    };

    const existing = this.records.get(assetId) || [];
    existing.push(record);
    this.records.set(assetId, existing);

    if (this.persistCallback) {
      await this.persistCallback(existing);
    }
  }

  /**
   * Get total usage count for an asset.
   */
  getUsageCount(assetId: string): number {
    const records = this.records.get(assetId);
    return records ? records.length : 0;
  }

  /**
   * Get usage count broken down by product.
   */
  getUsageByProduct(assetId: string): Map<ProductId, number> {
    const productCounts = new Map<ProductId, number>();
    const records = this.records.get(assetId) || [];

    for (const record of records) {
      const current = productCounts.get(record.product) || 0;
      productCounts.set(record.product, current + 1);
    }

    return productCounts;
  }

  /**
   * Find assets that have not been used and are older than the specified number of days.
   * Useful for cleanup/archival workflows.
   */
  getUnusedAssets(orgId: string, olderThanDays: number): string[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffIso = cutoffDate.toISOString();

    const unused: string[] = [];

    for (const [assetId, assetOrgId] of this.assetOrgs) {
      if (assetOrgId !== orgId) continue;

      const usageCount = this.getUsageCount(assetId);
      const createdAt = this.assetCreatedAt.get(assetId);

      if (usageCount === 0 && createdAt && createdAt < cutoffIso) {
        unused.push(assetId);
      }
    }

    return unused;
  }

  /**
   * Get the most-used assets for an organization, sorted by usage count descending.
   */
  getMostUsedAssets(orgId: string, limit: number = 10): Array<{ assetId: string; count: number }> {
    const assetCounts: Array<{ assetId: string; count: number }> = [];

    for (const [assetId, assetOrgId] of this.assetOrgs) {
      if (assetOrgId !== orgId) continue;

      const count = this.getUsageCount(assetId);
      if (count > 0) {
        assetCounts.push({ assetId, count });
      }
    }

    return assetCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get all usage records for a specific asset.
   */
  getUsageRecords(assetId: string): UsageRecord[] {
    return this.records.get(assetId) || [];
  }

  /**
   * Clear all usage data (useful for testing).
   */
  clear(): void {
    this.records.clear();
    this.assetOrgs.clear();
    this.assetCreatedAt.clear();
  }
}
