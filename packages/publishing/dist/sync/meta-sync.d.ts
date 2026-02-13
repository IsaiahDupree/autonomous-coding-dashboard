/**
 * SYNC-001: Meta Ad Status Sync
 *
 * Polls the Meta (Facebook) Marketing API for ad status changes
 * and emits updates to keep local state in sync.
 */
import type { SyncConfig } from '../types';
export interface MetaAdStatus {
    adId: string;
    campaignId: string;
    status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED' | 'PENDING_REVIEW' | 'DISAPPROVED';
    effectiveStatus: string;
    deliveryStatus: string;
    lastUpdated: string;
}
export type MetaSyncCallback = (statuses: MetaAdStatus[]) => void | Promise<void>;
export declare class MetaAdStatusSync {
    private readonly accessToken;
    private readonly adAccountId;
    private readonly syncConfig;
    private pollingTimer;
    private callbacks;
    constructor(config: {
        accessToken: string;
        adAccountId: string;
        syncConfig?: Partial<SyncConfig>;
    });
    /**
     * Registers a callback to be notified when ad statuses change.
     */
    onStatusChange(callback: MetaSyncCallback): void;
    /**
     * Starts polling for ad status changes at the configured interval.
     */
    start(): void;
    /**
     * Stops the polling loop.
     */
    stop(): void;
    /**
     * Performs a single poll to fetch current ad statuses.
     */
    poll(): Promise<MetaAdStatus[]>;
    /**
     * Returns the current sync configuration.
     */
    getSyncConfig(): SyncConfig;
    /**
     * Returns whether the sync loop is currently running.
     */
    isRunning(): boolean;
}
//# sourceMappingURL=meta-sync.d.ts.map