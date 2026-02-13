"use strict";
/**
 * SYNC-001: Meta Ad Status Sync
 *
 * Polls the Meta (Facebook) Marketing API for ad status changes
 * and emits updates to keep local state in sync.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaAdStatusSync = void 0;
const META_API_BASE = 'https://graph.facebook.com/v19.0';
class MetaAdStatusSync {
    constructor(config) {
        this.pollingTimer = null;
        this.callbacks = [];
        this.accessToken = config.accessToken;
        this.adAccountId = config.adAccountId;
        this.syncConfig = {
            provider: 'meta',
            entityType: 'ad',
            entityId: config.adAccountId,
            syncIntervalMs: config.syncConfig?.syncIntervalMs ?? 60000,
            lastSyncAt: config.syncConfig?.lastSyncAt,
        };
    }
    /**
     * Registers a callback to be notified when ad statuses change.
     */
    onStatusChange(callback) {
        this.callbacks.push(callback);
    }
    /**
     * Starts polling for ad status changes at the configured interval.
     */
    start() {
        if (this.pollingTimer) {
            return; // Already running
        }
        // Perform an initial sync immediately
        void this.poll();
        this.pollingTimer = setInterval(() => {
            void this.poll();
        }, this.syncConfig.syncIntervalMs);
    }
    /**
     * Stops the polling loop.
     */
    stop() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
    }
    /**
     * Performs a single poll to fetch current ad statuses.
     */
    async poll() {
        const fields = 'id,campaign_id,status,effective_status,delivery_info';
        const params = new URLSearchParams({
            fields,
            access_token: this.accessToken,
            limit: '100',
        });
        if (this.syncConfig.lastSyncAt) {
            params.set('filtering', JSON.stringify([
                { field: 'updated_time', operator: 'GREATER_THAN', value: this.syncConfig.lastSyncAt },
            ]));
        }
        const response = await fetch(`${META_API_BASE}/act_${this.adAccountId}/ads?${params.toString()}`);
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Meta ad status sync failed (${response.status}): ${errorBody}`);
        }
        const data = (await response.json());
        const statuses = data.data.map((ad) => ({
            adId: ad.id,
            campaignId: ad.campaign_id,
            status: ad.status,
            effectiveStatus: ad.effective_status,
            deliveryStatus: ad.delivery_info?.status ?? 'unknown',
            lastUpdated: new Date().toISOString(),
        }));
        // Update last sync time
        this.syncConfig.lastSyncAt = new Date().toISOString();
        // Notify callbacks
        for (const callback of this.callbacks) {
            await callback(statuses);
        }
        return statuses;
    }
    /**
     * Returns the current sync configuration.
     */
    getSyncConfig() {
        return { ...this.syncConfig };
    }
    /**
     * Returns whether the sync loop is currently running.
     */
    isRunning() {
        return this.pollingTimer !== null;
    }
}
exports.MetaAdStatusSync = MetaAdStatusSync;
//# sourceMappingURL=meta-sync.js.map