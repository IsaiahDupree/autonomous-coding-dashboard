/**
 * Audit Log (COMP-006)
 * Immutable log of all data access and modifications.
 */
import { AuditLogEntry } from './types';
export interface CreateAuditLogInput {
    actorId: string;
    action: AuditLogEntry['action'];
    resourceType: string;
    resourceId: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}
export interface AuditLogQuery {
    actorId?: string;
    action?: AuditLogEntry['action'];
    resourceType?: string;
    resourceId?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
    offset?: number;
}
/**
 * Immutable audit log service.
 * Records all data access and modifications for compliance.
 * Entries cannot be modified or deleted once written.
 */
export declare class AuditLogService {
    /**
     * Immutable log storage. Entries are append-only.
     * In production, this would be backed by an append-only database or event stream.
     */
    private readonly log;
    /** Write an entry to the audit log. This is append-only and cannot be undone. */
    write(input: CreateAuditLogInput): AuditLogEntry;
    /** Query the audit log with filters */
    query(query: AuditLogQuery): AuditLogEntry[];
    /** Get all entries for a specific resource */
    getResourceHistory(resourceType: string, resourceId: string): AuditLogEntry[];
    /** Get all actions by a specific actor */
    getActorHistory(actorId: string, limit?: number): AuditLogEntry[];
    /** Get a count of entries matching the query */
    count(query: Omit<AuditLogQuery, 'limit' | 'offset'>): number;
    /** Get the total number of entries in the log */
    size(): number;
    /**
     * Get a summary of actions grouped by type in a time period.
     */
    getActionSummary(startTime: number, endTime: number): Array<{
        action: AuditLogEntry['action'];
        count: number;
    }>;
    /**
     * Get a summary of activity by actor in a time period.
     */
    getActorSummary(startTime: number, endTime: number): Array<{
        actorId: string;
        actionCount: number;
        lastActivity: number;
    }>;
    /**
     * Export log entries as JSON for archival.
     * Note: This is read-only; the log itself is never modified.
     */
    exportAsJSON(query?: AuditLogQuery): string;
}
//# sourceMappingURL=audit-log.d.ts.map