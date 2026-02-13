"use strict";
/**
 * Data Retention Policies (COMP-005)
 * Per-table retention rules, automated cleanup scheduling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetentionPolicyManager = void 0;
const types_1 = require("./types");
let policyIdCounter = 0;
/**
 * Manages data retention policies per table.
 * Schedules and executes automated cleanup based on retention rules.
 */
class RetentionPolicyManager {
    constructor() {
        this.policies = new Map();
        /** tableName -> cleanup handler */
        this.cleanupHandlers = new Map();
        this.cleanupHistory = [];
    }
    /** Create a retention policy */
    createPolicy(input) {
        policyIdCounter++;
        const now = Date.now();
        // Calculate next scheduled cleanup (daily at midnight by default)
        const tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0);
        const policy = types_1.RetentionPolicySchema.parse({
            id: `retention_${policyIdCounter}`,
            tableName: input.tableName,
            retentionDays: input.retentionDays,
            dataCategory: input.dataCategory,
            autoDelete: input.autoDelete ?? false,
            nextScheduledCleanup: tomorrow.getTime(),
            createdAt: now,
            updatedAt: now,
        });
        this.policies.set(policy.id, policy);
        return policy;
    }
    /** Get a policy by ID */
    getPolicy(policyId) {
        return this.policies.get(policyId);
    }
    /** Get all policies */
    getAllPolicies() {
        return Array.from(this.policies.values());
    }
    /** Get policies for a specific table */
    getPoliciesForTable(tableName) {
        return Array.from(this.policies.values()).filter(p => p.tableName === tableName);
    }
    /** Get policies for a specific data category */
    getPoliciesForCategory(category) {
        return Array.from(this.policies.values()).filter(p => p.dataCategory === category);
    }
    /** Update a policy */
    updatePolicy(policyId, updates) {
        const policy = this.policies.get(policyId);
        if (!policy) {
            throw new Error(`Retention policy "${policyId}" not found`);
        }
        if (updates.retentionDays !== undefined) {
            policy.retentionDays = updates.retentionDays;
        }
        if (updates.autoDelete !== undefined) {
            policy.autoDelete = updates.autoDelete;
        }
        policy.updatedAt = Date.now();
        return policy;
    }
    /** Delete a policy */
    deletePolicy(policyId) {
        return this.policies.delete(policyId);
    }
    /** Register a cleanup handler for a table */
    registerCleanupHandler(handler) {
        this.cleanupHandlers.set(handler.tableName, handler);
    }
    /**
     * Execute cleanup for a specific policy.
     * Deletes records older than the retention period.
     */
    executeCleanup(policyId) {
        const policy = this.policies.get(policyId);
        if (!policy) {
            throw new Error(`Retention policy "${policyId}" not found`);
        }
        const handler = this.cleanupHandlers.get(policy.tableName);
        if (!handler) {
            throw new Error(`No cleanup handler registered for table "${policy.tableName}"`);
        }
        const now = Date.now();
        const cutoffTimestamp = now - (policy.retentionDays * 24 * 60 * 60 * 1000);
        const recordsDeleted = handler.deleteOlderThan(cutoffTimestamp);
        // Update policy
        policy.lastCleanup = now;
        policy.nextScheduledCleanup = now + 24 * 60 * 60 * 1000; // Next day
        policy.updatedAt = now;
        const result = {
            policyId,
            tableName: policy.tableName,
            recordsDeleted,
            executedAt: now,
        };
        this.cleanupHistory.push(result);
        return result;
    }
    /**
     * Execute all auto-delete policies that are due for cleanup.
     */
    executeScheduledCleanups() {
        const now = Date.now();
        const results = [];
        for (const policy of this.policies.values()) {
            if (!policy.autoDelete)
                continue;
            if (policy.nextScheduledCleanup && policy.nextScheduledCleanup > now)
                continue;
            try {
                const result = this.executeCleanup(policy.id);
                results.push(result);
            }
            catch {
                // Skip policies without handlers
            }
        }
        return results;
    }
    /** Get cleanup history */
    getCleanupHistory(tableName) {
        if (tableName) {
            return this.cleanupHistory.filter(r => r.tableName === tableName);
        }
        return [...this.cleanupHistory];
    }
    /** Check which policies are overdue for cleanup */
    getOverduePolicies() {
        const now = Date.now();
        return Array.from(this.policies.values()).filter(p => p.autoDelete && p.nextScheduledCleanup && p.nextScheduledCleanup <= now);
    }
}
exports.RetentionPolicyManager = RetentionPolicyManager;
//# sourceMappingURL=retention.js.map