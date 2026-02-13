/**
 * @module audience-sync
 * GAP-007: Custom Audience Sync.
 * Audience definition, sync status tracking, and member count management.
 */

import {
  AudienceDefinition,
  AudienceDefinitionSchema,
  AudienceSyncRecord,
  AudienceSyncRecordSchema,
  AudienceSyncStatus,
} from './types';

/** Callback for sync status change events. */
export type SyncStatusChangeHandler = (record: AudienceSyncRecord) => void;

/** Interface for platform-specific audience sync implementation. */
export interface AudienceSyncAdapter {
  platform: string;
  sync(audience: AudienceDefinition): Promise<{ memberCount: number; success: boolean; error?: string }>;
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
export class AudienceSyncManager {
  private readonly audiences: Map<string, AudienceDefinition> = new Map();
  private readonly syncRecords: Map<string, AudienceSyncRecord> = new Map();
  private readonly adapters: Map<string, AudienceSyncAdapter> = new Map();
  private readonly statusChangeHandlers: SyncStatusChangeHandler[] = [];

  /** Register a status change handler. */
  onStatusChange(handler: SyncStatusChangeHandler): void {
    this.statusChangeHandlers.push(handler);
  }

  /** Register a platform sync adapter. */
  registerAdapter(adapter: AudienceSyncAdapter): void {
    this.adapters.set(adapter.platform, adapter);
  }

  /** Define a new audience. */
  defineAudience(
    params: Omit<AudienceDefinition, 'createdAt'> & { createdAt?: string }
  ): AudienceDefinition {
    const audience = AudienceDefinitionSchema.parse({
      createdAt: params.createdAt ?? new Date().toISOString(),
      ...params,
    });

    this.audiences.set(audience.id, audience);
    return audience;
  }

  /** Update an existing audience definition. */
  updateAudience(
    id: string,
    updates: Partial<Pick<AudienceDefinition, 'name' | 'description' | 'rules'>>
  ): AudienceDefinition | null {
    const audience = this.audiences.get(id);
    if (!audience) return null;

    const updated = AudienceDefinitionSchema.parse({
      ...audience,
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    this.audiences.set(id, updated);

    // Mark all syncs as stale when audience is updated
    for (const [key, record] of this.syncRecords) {
      if (record.audienceId === id && record.status === 'synced') {
        const staleRecord: AudienceSyncRecord = { ...record, status: 'stale' };
        this.syncRecords.set(key, staleRecord);
        this.emitStatusChange(staleRecord);
      }
    }

    return updated;
  }

  /** Get an audience definition. */
  getAudience(id: string): AudienceDefinition | undefined {
    return this.audiences.get(id);
  }

  /** Get all audience definitions. */
  getAllAudiences(): AudienceDefinition[] {
    return Array.from(this.audiences.values());
  }

  /** Delete an audience. */
  deleteAudience(id: string): boolean {
    // Also clean up sync records
    for (const key of this.syncRecords.keys()) {
      if (key.startsWith(`${id}:`)) {
        this.syncRecords.delete(key);
      }
    }
    return this.audiences.delete(id);
  }

  /** Sync an audience to a platform. */
  async syncToPlatform(
    audienceId: string,
    platform: string
  ): Promise<AudienceSyncRecord> {
    const audience = this.audiences.get(audienceId);
    if (!audience) {
      throw new Error(`Audience not found: ${audienceId}`);
    }

    const key = this.makeKey(audienceId, platform);
    const adapter = this.adapters.get(platform);

    // Mark as syncing
    const syncingRecord = this.updateSyncRecord(key, {
      audienceId,
      platform,
      status: 'syncing',
      memberCount: this.syncRecords.get(key)?.memberCount ?? 0,
    });
    this.emitStatusChange(syncingRecord);

    if (!adapter) {
      // No adapter - simulate sync for in-memory/mock usage
      const record = this.updateSyncRecord(key, {
        audienceId,
        platform,
        status: 'synced',
        memberCount: 0,
        lastSyncedAt: new Date().toISOString(),
        syncDurationMs: 0,
      });
      this.emitStatusChange(record);
      return record;
    }

    const startTime = Date.now();

    try {
      const result = await adapter.sync(audience);
      const syncDurationMs = Date.now() - startTime;

      if (result.success) {
        const record = this.updateSyncRecord(key, {
          audienceId,
          platform,
          status: 'synced',
          memberCount: result.memberCount,
          lastSyncedAt: new Date().toISOString(),
          syncDurationMs,
        });
        this.emitStatusChange(record);
        return record;
      } else {
        const record = this.updateSyncRecord(key, {
          audienceId,
          platform,
          status: 'failed',
          memberCount: this.syncRecords.get(key)?.memberCount ?? 0,
          errorMessage: result.error ?? 'Sync failed',
          syncDurationMs,
        });
        this.emitStatusChange(record);
        return record;
      }
    } catch (error) {
      const syncDurationMs = Date.now() - startTime;
      const errMessage = error instanceof Error ? error.message : String(error);

      const record = this.updateSyncRecord(key, {
        audienceId,
        platform,
        status: 'failed',
        memberCount: this.syncRecords.get(key)?.memberCount ?? 0,
        errorMessage: errMessage,
        syncDurationMs,
      });
      this.emitStatusChange(record);
      return record;
    }
  }

  /** Get sync status for an audience on a platform. */
  getSyncStatus(
    audienceId: string,
    platform: string
  ): AudienceSyncRecord | undefined {
    return this.syncRecords.get(this.makeKey(audienceId, platform));
  }

  /** Get all sync records for an audience. */
  getSyncRecords(audienceId: string): AudienceSyncRecord[] {
    const results: AudienceSyncRecord[] = [];
    for (const [key, record] of this.syncRecords) {
      if (record.audienceId === audienceId) {
        results.push(record);
      }
    }
    return results;
  }

  /** Get all sync records across all audiences. */
  getAllSyncRecords(): AudienceSyncRecord[] {
    return Array.from(this.syncRecords.values());
  }

  /** Get sync records by status. */
  getSyncRecordsByStatus(status: AudienceSyncStatus): AudienceSyncRecord[] {
    return Array.from(this.syncRecords.values()).filter(
      (r) => r.status === status
    );
  }

  /** Get total member count across all audiences for a platform. */
  getTotalMemberCount(platform?: string): number {
    let total = 0;
    for (const record of this.syncRecords.values()) {
      if (platform && record.platform !== platform) continue;
      if (record.status === 'synced') {
        total += record.memberCount;
      }
    }
    return total;
  }

  /** Clear all data. */
  clear(): void {
    this.audiences.clear();
    this.syncRecords.clear();
  }

  private makeKey(audienceId: string, platform: string): string {
    return `${audienceId}:${platform}`;
  }

  private updateSyncRecord(
    key: string,
    data: Omit<AudienceSyncRecord, 'nextSyncAt'> & { nextSyncAt?: string }
  ): AudienceSyncRecord {
    const record = AudienceSyncRecordSchema.parse(data);
    this.syncRecords.set(key, record);
    return record;
  }

  private emitStatusChange(record: AudienceSyncRecord): void {
    for (const handler of this.statusChangeHandlers) {
      try {
        handler(record);
      } catch {
        // Ignore handler errors
      }
    }
  }
}
