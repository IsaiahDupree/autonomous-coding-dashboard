/**
 * @module audience-sync
 * GAP-007: Custom Audience Sync.
 * Audience definition, sync status tracking, and member count management.
 */
import { AudienceDefinition, AudienceSyncRecord, AudienceSyncStatus } from './types';
/** Callback for sync status change events. */
export type SyncStatusChangeHandler = (record: AudienceSyncRecord) => void;
/** Interface for platform-specific audience sync implementation. */
export interface AudienceSyncAdapter {
    platform: string;
    sync(audience: AudienceDefinition): Promise<{
        memberCount: number;
        success: boolean;
        error?: string;
    }>;
}
/**
 * Audience Sync Manager.
 * Manages custom audience definitions and tracks sync status across platforms.
 *
 * @example
 * ```ts
 * const manager = new AudienceSyncManager();
 *
 * const audience = manager.defineAudience({
 *   id: 'aud-1',
 *   name: 'High-Value Customers',
 *   rules: [
 *     { field: 'totalSpend', operator: 'gte', value: 1000 },
 *     { field: 'lastPurchaseDate', operator: 'gte', value: '2024-01-01' },
 *   ],
 * });
 *
 * await manager.syncToplatform('aud-1', 'facebook');
 * const status = manager.getSyncStatus('aud-1', 'facebook');
 * ```
 */
export declare class AudienceSyncManager {
    private readonly audiences;
    private readonly syncRecords;
    private readonly adapters;
    private readonly statusChangeHandlers;
    /** Register a status change handler. */
    onStatusChange(handler: SyncStatusChangeHandler): void;
    /** Register a platform sync adapter. */
    registerAdapter(adapter: AudienceSyncAdapter): void;
    /** Define a new audience. */
    defineAudience(params: Omit<AudienceDefinition, 'createdAt'> & {
        createdAt?: string;
    }): AudienceDefinition;
    /** Update an existing audience definition. */
    updateAudience(id: string, updates: Partial<Pick<AudienceDefinition, 'name' | 'description' | 'rules'>>): AudienceDefinition | null;
    /** Get an audience definition. */
    getAudience(id: string): AudienceDefinition | undefined;
    /** Get all audience definitions. */
    getAllAudiences(): AudienceDefinition[];
    /** Delete an audience. */
    deleteAudience(id: string): boolean;
    /** Sync an audience to a platform. */
    syncToPlatform(audienceId: string, platform: string): Promise<AudienceSyncRecord>;
    /** Get sync status for an audience on a platform. */
    getSyncStatus(audienceId: string, platform: string): AudienceSyncRecord | undefined;
    /** Get all sync records for an audience. */
    getSyncRecords(audienceId: string): AudienceSyncRecord[];
    /** Get all sync records across all audiences. */
    getAllSyncRecords(): AudienceSyncRecord[];
    /** Get sync records by status. */
    getSyncRecordsByStatus(status: AudienceSyncStatus): AudienceSyncRecord[];
    /** Get total member count across all audiences for a platform. */
    getTotalMemberCount(platform?: string): number;
    /** Clear all data. */
    clear(): void;
    private makeKey;
    private updateSyncRecord;
    private emitStatusChange;
}
//# sourceMappingURL=audience-sync.d.ts.map