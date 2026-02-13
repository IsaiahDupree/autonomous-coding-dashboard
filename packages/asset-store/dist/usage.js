"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageTracker = void 0;
/**
 * UsageTracker - Tracks how assets are used across ACD products.
 *
 * Uses an in-memory store with an optional persistence callback for
 * writing usage data to an external database.
 */
class UsageTracker {
    /**
     * @param persistCallback - Optional callback invoked when usage data changes.
     */
    constructor(persistCallback) {
        /** Map of assetId -> usage records */
        this.records = new Map();
        /** Map of assetId -> orgId for scoping queries */
        this.assetOrgs = new Map();
        /** Map of assetId -> createdAt for age-based queries */
        this.assetCreatedAt = new Map();
        /** Optional callback for persisting usage data */
        this.persistCallback = null;
        this.persistCallback = persistCallback || null;
    }
    /**
     * Register an asset with the tracker (for org-scoped queries).
     */
    registerAsset(assetId, orgId, createdAt) {
        this.assetOrgs.set(assetId, orgId);
        this.assetCreatedAt.set(assetId, createdAt);
    }
    /**
     * Record a usage event for an asset.
     */
    async recordUsage(assetId, product, context) {
        const record = {
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
    getUsageCount(assetId) {
        const records = this.records.get(assetId);
        return records ? records.length : 0;
    }
    /**
     * Get usage count broken down by product.
     */
    getUsageByProduct(assetId) {
        const productCounts = new Map();
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
    getUnusedAssets(orgId, olderThanDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        const cutoffIso = cutoffDate.toISOString();
        const unused = [];
        for (const [assetId, assetOrgId] of this.assetOrgs) {
            if (assetOrgId !== orgId)
                continue;
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
    getMostUsedAssets(orgId, limit = 10) {
        const assetCounts = [];
        for (const [assetId, assetOrgId] of this.assetOrgs) {
            if (assetOrgId !== orgId)
                continue;
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
    getUsageRecords(assetId) {
        return this.records.get(assetId) || [];
    }
    /**
     * Clear all usage data (useful for testing).
     */
    clear() {
        this.records.clear();
        this.assetOrgs.clear();
        this.assetCreatedAt.clear();
    }
}
exports.UsageTracker = UsageTracker;
//# sourceMappingURL=usage.js.map