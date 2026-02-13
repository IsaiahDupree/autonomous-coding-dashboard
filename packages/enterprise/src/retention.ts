/**
 * Data Retention Policies (COMP-005)
 * Per-table retention rules, automated cleanup scheduling.
 */

import { DataCategory, RetentionPolicy, RetentionPolicySchema } from './types';

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

let policyIdCounter = 0;

/**
 * Manages data retention policies per table.
 * Schedules and executes automated cleanup based on retention rules.
 */
export class RetentionPolicyManager {
  private policies: Map<string, RetentionPolicy> = new Map();
  /** tableName -> cleanup handler */
  private cleanupHandlers: Map<string, CleanupHandler> = new Map();
  private cleanupHistory: CleanupResult[] = [];

  /** Create a retention policy */
  createPolicy(input: CreateRetentionPolicyInput): RetentionPolicy {
    policyIdCounter++;
    const now = Date.now();

    // Calculate next scheduled cleanup (daily at midnight by default)
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);

    const policy = RetentionPolicySchema.parse({
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
  getPolicy(policyId: string): RetentionPolicy | undefined {
    return this.policies.get(policyId);
  }

  /** Get all policies */
  getAllPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values());
  }

  /** Get policies for a specific table */
  getPoliciesForTable(tableName: string): RetentionPolicy[] {
    return Array.from(this.policies.values()).filter(p => p.tableName === tableName);
  }

  /** Get policies for a specific data category */
  getPoliciesForCategory(category: DataCategory): RetentionPolicy[] {
    return Array.from(this.policies.values()).filter(p => p.dataCategory === category);
  }

  /** Update a policy */
  updatePolicy(
    policyId: string,
    updates: Partial<Pick<RetentionPolicy, 'retentionDays' | 'autoDelete'>>,
  ): RetentionPolicy {
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
  deletePolicy(policyId: string): boolean {
    return this.policies.delete(policyId);
  }

  /** Register a cleanup handler for a table */
  registerCleanupHandler(handler: CleanupHandler): void {
    this.cleanupHandlers.set(handler.tableName, handler);
  }

  /**
   * Execute cleanup for a specific policy.
   * Deletes records older than the retention period.
   */
  executeCleanup(policyId: string): CleanupResult {
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

    const result: CleanupResult = {
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
  executeScheduledCleanups(): CleanupResult[] {
    const now = Date.now();
    const results: CleanupResult[] = [];

    for (const policy of this.policies.values()) {
      if (!policy.autoDelete) continue;
      if (policy.nextScheduledCleanup && policy.nextScheduledCleanup > now) continue;

      try {
        const result = this.executeCleanup(policy.id);
        results.push(result);
      } catch {
        // Skip policies without handlers
      }
    }

    return results;
  }

  /** Get cleanup history */
  getCleanupHistory(tableName?: string): CleanupResult[] {
    if (tableName) {
      return this.cleanupHistory.filter(r => r.tableName === tableName);
    }
    return [...this.cleanupHistory];
  }

  /** Check which policies are overdue for cleanup */
  getOverduePolicies(): RetentionPolicy[] {
    const now = Date.now();
    return Array.from(this.policies.values()).filter(
      p => p.autoDelete && p.nextScheduledCleanup && p.nextScheduledCleanup <= now,
    );
  }
}
