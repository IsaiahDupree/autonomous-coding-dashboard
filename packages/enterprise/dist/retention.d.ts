/**
 * Data Retention Policies (COMP-005)
 * Per-table retention rules, automated cleanup scheduling.
 */
import { DataCategory, RetentionPolicy } from './types';
export interface CreateRetentionPolicyInput {
    tableName: string;
    retentionDays: number;
    dataCategory: DataCategory;
    autoDelete?: boolean;
}
export interface CleanupResult {
    policyId: string;
    tableName: string;
    recordsDeleted: number;
    executedAt: number;
}
export interface CleanupHandler {
    tableName: string;
    /** Delete records older than the given timestamp. Returns count of deleted records. */
    deleteOlderThan: (cutoffTimestamp: number) => number;
}
/**
 * Manages data retention policies per table.
 * Schedules and executes automated cleanup based on retention rules.
 */
export declare class RetentionPolicyManager {
    private policies;
    /** tableName -> cleanup handler */
    private cleanupHandlers;
    private cleanupHistory;
    /** Create a retention policy */
    createPolicy(input: CreateRetentionPolicyInput): RetentionPolicy;
    /** Get a policy by ID */
    getPolicy(policyId: string): RetentionPolicy | undefined;
    /** Get all policies */
    getAllPolicies(): RetentionPolicy[];
    /** Get policies for a specific table */
    getPoliciesForTable(tableName: string): RetentionPolicy[];
    /** Get policies for a specific data category */
    getPoliciesForCategory(category: DataCategory): RetentionPolicy[];
    /** Update a policy */
    updatePolicy(policyId: string, updates: Partial<Pick<RetentionPolicy, 'retentionDays' | 'autoDelete'>>): RetentionPolicy;
    /** Delete a policy */
    deletePolicy(policyId: string): boolean;
    /** Register a cleanup handler for a table */
    registerCleanupHandler(handler: CleanupHandler): void;
    /**
     * Execute cleanup for a specific policy.
     * Deletes records older than the retention period.
     */
    executeCleanup(policyId: string): CleanupResult;
    /**
     * Execute all auto-delete policies that are due for cleanup.
     */
    executeScheduledCleanups(): CleanupResult[];
    /** Get cleanup history */
    getCleanupHistory(tableName?: string): CleanupResult[];
    /** Check which policies are overdue for cleanup */
    getOverduePolicies(): RetentionPolicy[];
}
//# sourceMappingURL=retention.d.ts.map