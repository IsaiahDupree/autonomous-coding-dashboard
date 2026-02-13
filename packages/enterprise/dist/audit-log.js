"use strict";
/**
 * Audit Log (COMP-006)
 * Immutable log of all data access and modifications.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
const types_1 = require("./types");
let auditLogIdCounter = 0;
/**
 * Immutable audit log service.
 * Records all data access and modifications for compliance.
 * Entries cannot be modified or deleted once written.
 */
class AuditLogService {
    constructor() {
        /**
         * Immutable log storage. Entries are append-only.
         * In production, this would be backed by an append-only database or event stream.
         */
        this.log = [];
    }
    /** Write an entry to the audit log. This is append-only and cannot be undone. */
    write(input) {
        auditLogIdCounter++;
        const entry = types_1.AuditLogEntrySchema.parse({
            id: `audit_${auditLogIdCounter}`,
            timestamp: Date.now(),
            actorId: input.actorId,
            action: input.action,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
            details: input.details ?? {},
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });
        // Freeze the entry to prevent modification
        Object.freeze(entry);
        this.log.push(entry);
        return entry;
    }
    /** Query the audit log with filters */
    query(query) {
        let results = this.log.filter(entry => {
            if (query.actorId && entry.actorId !== query.actorId)
                return false;
            if (query.action && entry.action !== query.action)
                return false;
            if (query.resourceType && entry.resourceType !== query.resourceType)
                return false;
            if (query.resourceId && entry.resourceId !== query.resourceId)
                return false;
            if (query.startTime && entry.timestamp < query.startTime)
                return false;
            if (query.endTime && entry.timestamp > query.endTime)
                return false;
            return true;
        });
        // Sort by timestamp descending (most recent first)
        results = results.sort((a, b) => b.timestamp - a.timestamp);
        // Apply pagination
        const offset = query.offset ?? 0;
        const limit = query.limit ?? results.length;
        return results.slice(offset, offset + limit);
    }
    /** Get all entries for a specific resource */
    getResourceHistory(resourceType, resourceId) {
        return this.query({ resourceType, resourceId });
    }
    /** Get all actions by a specific actor */
    getActorHistory(actorId, limit) {
        return this.query({ actorId, limit });
    }
    /** Get a count of entries matching the query */
    count(query) {
        return this.query({ ...query, limit: undefined, offset: undefined }).length;
    }
    /** Get the total number of entries in the log */
    size() {
        return this.log.length;
    }
    /**
     * Get a summary of actions grouped by type in a time period.
     */
    getActionSummary(startTime, endTime) {
        const entries = this.query({ startTime, endTime });
        const counts = new Map();
        for (const entry of entries) {
            counts.set(entry.action, (counts.get(entry.action) ?? 0) + 1);
        }
        return Array.from(counts.entries())
            .map(([action, count]) => ({ action, count }))
            .sort((a, b) => b.count - a.count);
    }
    /**
     * Get a summary of activity by actor in a time period.
     */
    getActorSummary(startTime, endTime) {
        const entries = this.query({ startTime, endTime });
        const actors = new Map();
        for (const entry of entries) {
            const existing = actors.get(entry.actorId);
            if (existing) {
                existing.count++;
                existing.lastActivity = Math.max(existing.lastActivity, entry.timestamp);
            }
            else {
                actors.set(entry.actorId, { count: 1, lastActivity: entry.timestamp });
            }
        }
        return Array.from(actors.entries())
            .map(([actorId, data]) => ({
            actorId,
            actionCount: data.count,
            lastActivity: data.lastActivity,
        }))
            .sort((a, b) => b.actionCount - a.actionCount);
    }
    /**
     * Export log entries as JSON for archival.
     * Note: This is read-only; the log itself is never modified.
     */
    exportAsJSON(query) {
        const entries = query ? this.query(query) : [...this.log];
        return JSON.stringify(entries, null, 2);
    }
}
exports.AuditLogService = AuditLogService;
//# sourceMappingURL=audit-log.js.map