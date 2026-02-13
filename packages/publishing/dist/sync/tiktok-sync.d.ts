/**
 * SYNC-002: TikTok Video Status Sync
 *
 * Polls TikTok's Content Posting API to track the status
 * of published videos and detect changes.
 */
import type { SyncConfig } from '../types';
export interface TikTokVideoStatus {
    videoId: string;
    publishId: string;
    status: 'PROCESSING_UPLOAD' | 'PROCESSING_DOWNLOAD' | 'SEND_TO_USER_INBOX' | 'PUBLISH_COMPLETE' | 'FAILED';
    createTime: number;
    title: string;
    shareUrl: string;
    lastChecked: string;
}
export type TikTokSyncCallback = (statuses: TikTokVideoStatus[]) => void | Promise<void>;
export declare class TikTokVideoSync {
    private readonly accessToken;
    private readonly syncConfig;
    private pollingTimer;
    private callbacks;
    private trackedPublishIds;
    constructor(config: {
        accessToken: string;
        syncConfig?: Partial<SyncConfig>;
    });
    /**
     * Adds a publish ID to the tracking list.
     */
    trackPublishId(publishId: string): void;
    /**
     * Removes a publish ID from the tracking list.
     */
    untrackPublishId(publishId: string): void;
    /**
     * Registers a callback to be notified when video statuses change.
     */
    onStatusChange(callback: TikTokSyncCallback): void;
    /**
     * Starts polling for video status changes at the configured interval.
     */
    start(): void;
    /**
     * Stops the polling loop.
     */
    stop(): void;
    /**
     * Performs a single poll to check status of all tracked videos.
     */
    poll(): Promise<TikTokVideoStatus[]>;
    /**
     * Checks the status of a single video by its publish ID.
     */
    private checkStatus;
    /**
     * Returns the current sync configuration.
     */
    getSyncConfig(): SyncConfig;
    /**
     * Returns whether the sync loop is currently running.
     */
    isRunning(): boolean;
    /**
     * Returns all currently tracked publish IDs.
     */
    getTrackedIds(): string[];
}
//# sourceMappingURL=tiktok-sync.d.ts.map