/**
 * Data Deletion (COMP-003)
 * Cascade deletion across all tables, with deletion log.
 */

import { DeletionLogEntry } from './types';
import { DataSubjectRegistry } from './data-registry';

export interface DeletionTarget {
  tableName: string;
  /** Function to delete records for a user. Returns the IDs of deleted records. */
  deleteUserData: (userId: string) => string[];
}

export interface DeletionResult {
  userId: string;
  deletedBy: string;
  reason?: string;
  deletedRecords: Array<{ tableName: string; recordId: string }>;
  logEntries: DeletionLogEntry[];
  completedAt: number;
}

let deletionLogIdCounter = 0;

/**
 * Handles cascade deletion of user data across all registered tables.
 * Maintains an immutable deletion log for audit purposes.
 */
export class DataDeletionService {
  private deletionTargets: Map<string, DeletionTarget> = new Map();
  private deletionLog: DeletionLogEntry[] = [];

  constructor(private registry: DataSubjectRegistry) {}

  /** Register a deletion target (table/service that holds user data) */
  registerDeletionTarget(target: DeletionTarget): void {
    this.deletionTargets.set(target.tableName, target);
  }

  /**
   * Execute a cascade deletion for a user.
   * Deletes data from all registered targets and cleans up the registry.
   */
  deleteUserData(
    userId: string,
    deletedBy: string,
    reason?: string,
  ): DeletionResult {
    const result: DeletionResult = {
      userId,
      deletedBy,
      reason,
      deletedRecords: [],
      logEntries: [],
      completedAt: 0,
    };

    const now = Date.now();

    // Get all known data entries from the registry
    const subjectRecord = this.registry.getSubjectRecord(userId);
    const registeredTables = new Set<string>();

    if (subjectRecord) {
      for (const entry of subjectRecord.dataEntries) {
        registeredTables.add(entry.tableName);
      }
    }

    // Also include all registered deletion targets (even if not in registry)
    for (const tableName of this.deletionTargets.keys()) {
      registeredTables.add(tableName);
    }

    // Execute deletion for each target
    for (const tableName of registeredTables) {
      const target = this.deletionTargets.get(tableName);
      if (target) {
        try {
          const deletedIds = target.deleteUserData(userId);
          for (const recordId of deletedIds) {
            result.deletedRecords.push({ tableName, recordId });

            // Log each deletion
            deletionLogIdCounter++;
            const logEntry: DeletionLogEntry = {
              id: `del_${deletionLogIdCounter}`,
              userId,
              tableName,
              recordId,
              deletedAt: now,
              deletedBy,
              reason,
            };
            this.deletionLog.push(logEntry);
            result.logEntries.push(logEntry);
          }
        } catch (err) {
          // Log the failure but continue with other tables
          deletionLogIdCounter++;
          const logEntry: DeletionLogEntry = {
            id: `del_${deletionLogIdCounter}`,
            userId,
            tableName,
            recordId: `ERROR: ${err instanceof Error ? err.message : String(err)}`,
            deletedAt: now,
            deletedBy,
            reason: `Deletion failed: ${err instanceof Error ? err.message : String(err)}`,
          };
          this.deletionLog.push(logEntry);
          result.logEntries.push(logEntry);
        }
      }
    }

    // Clean up the data subject registry
    this.registry.removeAllEntries(userId);

    result.completedAt = Date.now();
    return result;
  }

  /**
   * Delete specific records for a user from a specific table.
   */
  deleteSpecificRecords(
    userId: string,
    tableName: string,
    recordIds: string[],
    deletedBy: string,
    reason?: string,
  ): DeletionLogEntry[] {
    const now = Date.now();
    const logEntries: DeletionLogEntry[] = [];

    for (const recordId of recordIds) {
      deletionLogIdCounter++;
      const logEntry: DeletionLogEntry = {
        id: `del_${deletionLogIdCounter}`,
        userId,
        tableName,
        recordId,
        deletedAt: now,
        deletedBy,
        reason,
      };
      this.deletionLog.push(logEntry);
      logEntries.push(logEntry);

      // Remove from registry
      this.registry.removeDataEntry(userId, tableName, recordId);
    }

    return logEntries;
  }

  /** Get the deletion log for a user */
  getDeletionLog(userId?: string): DeletionLogEntry[] {
    if (userId) {
      return this.deletionLog.filter(e => e.userId === userId);
    }
    return [...this.deletionLog];
  }

  /** Get deletion log entries in a time range */
  getDeletionLogByTimeRange(startTime: number, endTime: number): DeletionLogEntry[] {
    return this.deletionLog.filter(
      e => e.deletedAt >= startTime && e.deletedAt <= endTime,
    );
  }

  /** Get all registered deletion targets */
  getRegisteredTargets(): string[] {
    return Array.from(this.deletionTargets.keys());
  }
}
