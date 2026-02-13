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
    deletedRecords: Array<{
        tableName: string;
        recordId: string;
    }>;
    logEntries: DeletionLogEntry[];
    completedAt: number;
}
/**
 * Handles cascade deletion of user data across all registered tables.
 * Maintains an immutable deletion log for audit purposes.
 */
export declare class DataDeletionService {
    private registry;
    private deletionTargets;
    private deletionLog;
    constructor(registry: DataSubjectRegistry);
    /** Register a deletion target (table/service that holds user data) */
    registerDeletionTarget(target: DeletionTarget): void;
    /**
     * Execute a cascade deletion for a user.
     * Deletes data from all registered targets and cleans up the registry.
     */
    deleteUserData(userId: string, deletedBy: string, reason?: string): DeletionResult;
    /**
     * Delete specific records for a user from a specific table.
     */
    deleteSpecificRecords(userId: string, tableName: string, recordIds: string[], deletedBy: string, reason?: string): DeletionLogEntry[];
    /** Get the deletion log for a user */
    getDeletionLog(userId?: string): DeletionLogEntry[];
    /** Get deletion log entries in a time range */
    getDeletionLogByTimeRange(startTime: number, endTime: number): DeletionLogEntry[];
    /** Get all registered deletion targets */
    getRegisteredTargets(): string[];
}
//# sourceMappingURL=data-deletion.d.ts.map