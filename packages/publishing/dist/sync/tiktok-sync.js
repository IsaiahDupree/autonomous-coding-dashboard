"use strict";
/**
 * SYNC-002: TikTok Video Status Sync
 *
 * Polls TikTok's Content Posting API to track the status
 * of published videos and detect changes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokVideoSync = void 0;
const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';
class TikTokVideoSync {
    constructor(config) {
        this.pollingTimer = null;
        this.callbacks = [];
        this.trackedPublishIds = [];
        this.accessToken = config.accessToken;
        this.syncConfig = {
            provider: 'tiktok',
            entityType: 'video',
            entityId: 'all',
            syncIntervalMs: config.syncConfig?.syncIntervalMs ?? 60000,
            lastSyncAt: config.syncConfig?.lastSyncAt,
        };
    }
    /**
     * Adds a publish ID to the tracking list.
     */
    trackPublishId(publishId) {
        if (!this.trackedPublishIds.includes(publishId)) {
            this.trackedPublishIds.push(publishId);
        }
    }
    /**
     * Removes a publish ID from the tracking list.
     */
    untrackPublishId(publishId) {
        this.trackedPublishIds = this.trackedPublishIds.filter((id) => id !== publishId);
    }
    /**
     * Registers a callback to be notified when video statuses change.
     */
    onStatusChange(callback) {
        this.callbacks.push(callback);
    }
    /**
     * Starts polling for video status changes at the configured interval.
     */
    start() {
        if (this.pollingTimer) {
            return;
        }
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
     * Performs a single poll to check status of all tracked videos.
     */
    async poll() {
        if (this.trackedPublishIds.length === 0) {
            return [];
        }
        const statuses = [];
        for (const publishId of this.trackedPublishIds) {
            try {
                const status = await this.checkStatus(publishId);
                statuses.push(status);
                // Auto-remove completed or failed videos from tracking
                if (status.status === 'PUBLISH_COMPLETE' || status.status === 'FAILED') {
                    this.untrackPublishId(publishId);
                }
            }
            catch {
                // Continue checking other videos even if one fails
            }
        }
        // Update last sync time
        this.syncConfig.lastSyncAt = new Date().toISOString();
        // Notify callbacks
        for (const callback of this.callbacks) {
            await callback(statuses);
        }
        return statuses;
    }
    /**
     * Checks the status of a single video by its publish ID.
     */
    async checkStatus(publishId) {
        const response = await fetch(`${TIKTOK_API_BASE}/post/publish/status/fetch/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                Authorization: `Bearer ${this.accessToken}`,
            },
            body: JSON.stringify({ publish_id: publishId }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`TikTok video status check failed (${response.status}): ${errorBody}`);
        }
        const data = (await response.json());
        return {
            videoId: data.data.publish_id,
            publishId: data.data.publish_id,
            status: data.data.status,
            createTime: Date.now(),
            title: '',
            shareUrl: '',
            lastChecked: new Date().toISOString(),
        };
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
    /**
     * Returns all currently tracked publish IDs.
     */
    getTrackedIds() {
        return [...this.trackedPublishIds];
    }
}
exports.TikTokVideoSync = TikTokVideoSync;
//# sourceMappingURL=tiktok-sync.js.map