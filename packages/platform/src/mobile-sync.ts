/**
 * MOB-003: Offline Data Sync
 *
 * Sync queue management, conflict detection and resolution,
 * and merge rules for offline-first mobile applications.
 */

import { v4Fallback, deepClone } from './utils';
import {
  SyncQueueItem,
  SyncQueueItemSchema,
  SyncConflict,
  SyncConflictSchema,
  MergeRule,
  ConflictResolutionStrategy,
  SyncStatus,
} from './types';

export interface EnqueueSyncInput {
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  version: number;
}

export class OfflineSyncManager {
  private queue: Map<string, SyncQueueItem> = new Map();
  private conflicts: Map<string, SyncConflict> = new Map();
  private mergeRules: Map<string, MergeRule[]> = new Map(); // entityType -> rules
  private defaultStrategy: ConflictResolutionStrategy = 'latest_wins';

  /**
   * Add an item to the sync queue.
   */
  enqueue(input: EnqueueSyncInput): SyncQueueItem {
    const item = SyncQueueItemSchema.parse({
      id: v4Fallback(),
      entityType: input.entityType,
      entityId: input.entityId,
      operation: input.operation,
      data: input.data,
      status: 'pending' as SyncStatus,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      version: input.version,
    });

    this.queue.set(item.id, item);
    return item;
  }

  /**
   * Get all pending items in the sync queue.
   */
  getPendingItems(): SyncQueueItem[] {
    return Array.from(this.queue.values())
      .filter(item => item.status === 'pending' || item.status === 'failed')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Get all items in the sync queue.
   */
  getAllItems(): SyncQueueItem[] {
    return Array.from(this.queue.values())
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Get a specific queue item by ID.
   */
  getItem(itemId: string): SyncQueueItem | undefined {
    return this.queue.get(itemId);
  }

  /**
   * Mark an item as syncing (in-progress).
   */
  markSyncing(itemId: string): SyncQueueItem {
    const item = this.queue.get(itemId);
    if (!item) throw new Error(`Sync item "${itemId}" not found`);

    const updated = { ...item, status: 'syncing' as SyncStatus };
    this.queue.set(itemId, updated);
    return updated;
  }

  /**
   * Mark an item as successfully synced.
   */
  markSynced(itemId: string): SyncQueueItem {
    const item = this.queue.get(itemId);
    if (!item) throw new Error(`Sync item "${itemId}" not found`);

    const updated = {
      ...item,
      status: 'synced' as SyncStatus,
      syncedAt: new Date(),
    };
    this.queue.set(itemId, updated);
    return updated;
  }

  /**
   * Mark an item as failed and increment retry count.
   */
  markFailed(itemId: string, errorMessage: string): SyncQueueItem {
    const item = this.queue.get(itemId);
    if (!item) throw new Error(`Sync item "${itemId}" not found`);

    const newRetryCount = item.retryCount + 1;
    const status: SyncStatus = newRetryCount >= item.maxRetries ? 'failed' : 'pending';

    const updated = {
      ...item,
      status,
      retryCount: newRetryCount,
      errorMessage,
    };
    this.queue.set(itemId, updated);
    return updated;
  }

  /**
   * Detect a conflict between client and server data.
   */
  detectConflict(
    entityType: string,
    entityId: string,
    clientData: Record<string, unknown>,
    serverData: Record<string, unknown>
  ): SyncConflict {
    const conflict = SyncConflictSchema.parse({
      id: v4Fallback(),
      entityType,
      entityId,
      clientData: deepClone(clientData),
      serverData: deepClone(serverData),
      detectedAt: new Date(),
    });

    this.conflicts.set(conflict.id, conflict);

    // Mark any related queue items as conflicted
    for (const [, item] of this.queue) {
      if (item.entityType === entityType && item.entityId === entityId && item.status !== 'synced') {
        this.queue.set(item.id, { ...item, status: 'conflict' as SyncStatus });
      }
    }

    return conflict;
  }

  /**
   * Resolve a conflict using the specified strategy or configured merge rules.
   */
  resolveConflict(
    conflictId: string,
    strategy?: ConflictResolutionStrategy,
    manualData?: Record<string, unknown>
  ): SyncConflict {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) throw new Error(`Conflict "${conflictId}" not found`);

    const resolveStrategy = strategy ?? this.getStrategyForEntity(conflict.entityType);
    let resolvedData: Record<string, unknown>;

    switch (resolveStrategy) {
      case 'client_wins':
        resolvedData = deepClone(conflict.clientData);
        break;

      case 'server_wins':
        resolvedData = deepClone(conflict.serverData);
        break;

      case 'latest_wins':
        // Use client data since it's the more recent change
        resolvedData = deepClone(conflict.clientData);
        break;

      case 'manual':
        if (!manualData) {
          throw new Error('Manual resolution requires providing resolved data');
        }
        resolvedData = deepClone(manualData);
        break;

      case 'merge':
        resolvedData = this.mergeData(
          conflict.entityType,
          conflict.clientData,
          conflict.serverData
        );
        break;

      default:
        resolvedData = deepClone(conflict.serverData);
    }

    const resolved: SyncConflict = {
      ...conflict,
      resolvedAt: new Date(),
      resolution: resolveStrategy,
      resolvedData,
    };

    this.conflicts.set(conflictId, resolved);
    return resolved;
  }

  /**
   * Register merge rules for an entity type.
   */
  setMergeRules(entityType: string, rules: MergeRule[]): void {
    this.mergeRules.set(entityType, rules);
  }

  /**
   * Get merge rules for an entity type.
   */
  getMergeRules(entityType: string): MergeRule[] {
    return this.mergeRules.get(entityType) ?? [];
  }

  /**
   * Set the default conflict resolution strategy.
   */
  setDefaultStrategy(strategy: ConflictResolutionStrategy): void {
    this.defaultStrategy = strategy;
  }

  /**
   * Get all unresolved conflicts.
   */
  getUnresolvedConflicts(): SyncConflict[] {
    return Array.from(this.conflicts.values())
      .filter(c => !c.resolvedAt)
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  /**
   * Get all conflicts for a specific entity.
   */
  getConflictsForEntity(entityType: string, entityId: string): SyncConflict[] {
    return Array.from(this.conflicts.values())
      .filter(c => c.entityType === entityType && c.entityId === entityId);
  }

  /**
   * Remove synced items from the queue.
   */
  purgeSynced(): number {
    let count = 0;
    for (const [id, item] of this.queue) {
      if (item.status === 'synced') {
        this.queue.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * Get sync queue stats.
   */
  getStats(): {
    pending: number;
    syncing: number;
    synced: number;
    failed: number;
    conflicts: number;
    total: number;
  } {
    const items = Array.from(this.queue.values());
    return {
      pending: items.filter(i => i.status === 'pending').length,
      syncing: items.filter(i => i.status === 'syncing').length,
      synced: items.filter(i => i.status === 'synced').length,
      failed: items.filter(i => i.status === 'failed').length,
      conflicts: items.filter(i => i.status === 'conflict').length,
      total: items.length,
    };
  }

  /**
   * Clear the entire sync queue and conflicts.
   */
  clear(): void {
    this.queue.clear();
    this.conflicts.clear();
  }

  /**
   * Merge client and server data using configured merge rules.
   */
  private mergeData(
    entityType: string,
    clientData: Record<string, unknown>,
    serverData: Record<string, unknown>
  ): Record<string, unknown> {
    const rules = this.mergeRules.get(entityType) ?? [];
    const merged = deepClone(serverData); // Start with server as base

    for (const rule of rules) {
      if (rule.field in clientData || rule.field in serverData) {
        switch (rule.strategy) {
          case 'client_wins':
            if (rule.field in clientData) {
              merged[rule.field] = deepClone(clientData[rule.field]);
            }
            break;

          case 'server_wins':
            // Already using server as base
            break;

          case 'latest_wins':
            // Prefer client since it's the latest change
            if (rule.field in clientData) {
              merged[rule.field] = deepClone(clientData[rule.field]);
            }
            break;

          default:
            // For manual or other, use server value
            break;
        }
      }
    }

    // For fields without specific rules, keep server values (already in merged)
    // But add any client-only fields
    for (const [key, value] of Object.entries(clientData)) {
      if (!(key in merged)) {
        merged[key] = deepClone(value);
      }
    }

    return merged;
  }

  /**
   * Get the appropriate conflict resolution strategy for an entity type.
   */
  private getStrategyForEntity(entityType: string): ConflictResolutionStrategy {
    const rules = this.mergeRules.get(entityType);
    if (rules && rules.length > 0) {
      return 'merge';
    }
    return this.defaultStrategy;
  }
}
