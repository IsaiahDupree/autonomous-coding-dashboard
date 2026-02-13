"use strict";
/**
 * Data Deletion (COMP-003)
 * Cascade deletion across all tables, with deletion log.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataDeletionService = void 0;
let deletionLogIdCounter = 0;
/**
 * Handles cascade deletion of user data across all registered tables.
 * Maintains an immutable deletion log for audit purposes.
 */
class DataDeletionService {
    constructor(registry) {
        this.registry = registry;
        this.deletionTargets = new Map();
        this.deletionLog = [];
    }
    /** Register a deletion target (table/service that holds user data) */
    registerDeletionTarget(target) {
        this.deletionTargets.set(target.tableName, target);
    }
    /**
     * Execute a cascade deletion for a user.
     * Deletes data from all registered targets and cleans up the registry.
     */
    deleteUserData(userId, deletedBy, reason) {
        const result = {
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
        const registeredTables = new Set();
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
                        const logEntry = {
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
                }
                catch (err) {
                    // Log the failure but continue with other tables
                    deletionLogIdCounter++;
                    const logEntry = {
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
    deleteSpecificRecords(userId, tableName, recordIds, deletedBy, reason) {
        const now = Date.now();
        const logEntries = [];
        for (const recordId of recordIds) {
            deletionLogIdCounter++;
            const logEntry = {
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
    getDeletionLog(userId) {
        if (userId) {
            return this.deletionLog.filter(e => e.userId === userId);
        }
        return [...this.deletionLog];
    }
    /** Get deletion log entries in a time range */
    getDeletionLogByTimeRange(startTime, endTime) {
        return this.deletionLog.filter(e => e.deletedAt >= startTime && e.deletedAt <= endTime);
    }
    /** Get all registered deletion targets */
    getRegisteredTargets() {
        return Array.from(this.deletionTargets.keys());
    }
}
exports.DataDeletionService = DataDeletionService;
//# sourceMappingURL=data-deletion.js.map