/**
 * Feature Flags (FF-001 to FF-006)
 * - FF-001: Feature flag storage (in-memory store, flag definition with key/description/type/default)
 * - FF-002: Boolean flags evaluation (on/off with user targeting rules)
 * - FF-003: Percentage rollout (gradual rollout with consistent hashing)
 * - FF-004: User segment targeting (segments defined by properties like plan, role, orgId)
 * - FF-005: Flag audit trail (who changed what flag when, change history)
 * - FF-006: Flag SDK (evaluate flags for a user context, with local caching)
 */

import { createHash } from 'crypto';
import {
  FeatureFlag,
  FeatureFlagSchema,
  FlagChange,
  TargetingRule,
  UserContext,
  UserSegment,
  UserSegmentSchema,
} from './types';

// ─── FF-001: Feature Flag Storage ────────────────────────────────────────────

export class FeatureFlagStore {
  private flags: Map<string, FeatureFlag> = new Map();
  private segments: Map<string, UserSegment> = new Map();
  private auditTrail: FlagChange[] = [];
  private changeIdCounter = 0;

  /** Create a new feature flag */
  createFlag(input: {
    key: string;
    description?: string;
    type: FeatureFlag['type'];
    defaultValue: unknown;
    enabled?: boolean;
    rolloutPercentage?: number;
    createdBy?: string;
  }): FeatureFlag {
    if (this.flags.has(input.key)) {
      throw new Error(`Flag with key "${input.key}" already exists`);
    }

    const now = Date.now();
    const flag = FeatureFlagSchema.parse({
      key: input.key,
      description: input.description,
      type: input.type,
      defaultValue: input.defaultValue,
      enabled: input.enabled ?? false,
      rolloutPercentage: input.rolloutPercentage,
      createdBy: input.createdBy,
      targetingRules: [],
      segmentIds: [],
      createdAt: now,
      updatedAt: now,
    });

    this.flags.set(flag.key, flag);
    this.recordChange(flag.key, input.createdBy ?? 'system', 'created', undefined, undefined, flag);
    return flag;
  }

  /** Get a feature flag by key */
  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  /** Get all feature flags */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /** Update a feature flag */
  updateFlag(key: string, updates: Partial<Omit<FeatureFlag, 'key' | 'createdAt'>>, changedBy: string): FeatureFlag {
    const existing = this.flags.get(key);
    if (!existing) {
      throw new Error(`Flag with key "${key}" not found`);
    }

    const previousFlag = { ...existing };
    const updatedFlag: FeatureFlag = {
      ...existing,
      ...updates,
      key: existing.key,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    };

    this.flags.set(key, updatedFlag);

    // Record changes for each field that changed
    for (const field of Object.keys(updates) as Array<keyof typeof updates>) {
      const prev = previousFlag[field as keyof FeatureFlag];
      const next = updatedFlag[field as keyof FeatureFlag];
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        const changeType = field === 'enabled' ? 'toggled' as const : 'updated' as const;
        this.recordChange(key, changedBy, changeType, field as string, prev, next);
      }
    }

    return updatedFlag;
  }

  /** Delete a feature flag */
  deleteFlag(key: string, deletedBy: string): boolean {
    const flag = this.flags.get(key);
    if (!flag) return false;

    this.flags.delete(key);
    this.recordChange(key, deletedBy, 'deleted', undefined, flag, undefined);
    return true;
  }

  // ─── FF-002: Boolean Flags Evaluation ──────────────────────────────────────

  /** Evaluate a boolean flag for a given user context */
  evaluateBoolean(key: string, userContext: UserContext, defaultValue = false): boolean {
    const flag = this.flags.get(key);
    if (!flag || !flag.enabled) return defaultValue;
    if (flag.type !== 'boolean') {
      throw new Error(`Flag "${key}" is not a boolean flag`);
    }

    // Check targeting rules
    if (flag.targetingRules.length > 0) {
      const matchesRules = this.matchesTargetingRules(flag.targetingRules, userContext);
      if (!matchesRules) return defaultValue;
    }

    // Check segment targeting (FF-004)
    if (flag.segmentIds.length > 0) {
      const matchesSegment = this.matchesAnySegment(flag.segmentIds, userContext);
      if (!matchesSegment) return defaultValue;
    }

    // Check percentage rollout (FF-003)
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      const inRollout = this.isInRollout(key, userContext.userId, flag.rolloutPercentage);
      if (!inRollout) return defaultValue;
    }

    return flag.defaultValue as boolean;
  }

  /** Evaluate any flag type for a given user context */
  evaluate<T = unknown>(key: string, userContext: UserContext, defaultValue: T): T {
    const flag = this.flags.get(key);
    if (!flag || !flag.enabled) return defaultValue;

    // Check targeting rules
    if (flag.targetingRules.length > 0) {
      const matchesRules = this.matchesTargetingRules(flag.targetingRules, userContext);
      if (!matchesRules) return defaultValue;
    }

    // Check segment targeting
    if (flag.segmentIds.length > 0) {
      const matchesSegment = this.matchesAnySegment(flag.segmentIds, userContext);
      if (!matchesSegment) return defaultValue;
    }

    // Check percentage rollout
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      const inRollout = this.isInRollout(key, userContext.userId, flag.rolloutPercentage);
      if (!inRollout) return defaultValue;
    }

    return flag.defaultValue as T;
  }

  // ─── FF-003: Percentage Rollout ────────────────────────────────────────────

  /**
   * Determines if a user is in the rollout percentage.
   * Uses consistent hashing so the same user always gets the same result
   * for a given flag key.
   */
  private isInRollout(flagKey: string, userId: string, percentage: number): boolean {
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;

    const hash = createHash('sha256')
      .update(`${flagKey}:${userId}`)
      .digest('hex');

    // Take first 8 hex chars and convert to number (0 to 0xFFFFFFFF)
    const hashInt = parseInt(hash.substring(0, 8), 16);
    const normalizedValue = (hashInt / 0xFFFFFFFF) * 100;

    return normalizedValue < percentage;
  }

  // ─── FF-004: User Segment Targeting ────────────────────────────────────────

  /** Create a user segment */
  createSegment(input: {
    id: string;
    name: string;
    description?: string;
    rules: TargetingRule[];
    matchAll?: boolean;
  }): UserSegment {
    if (this.segments.has(input.id)) {
      throw new Error(`Segment with id "${input.id}" already exists`);
    }

    const now = Date.now();
    const segment = UserSegmentSchema.parse({
      id: input.id,
      name: input.name,
      description: input.description,
      rules: input.rules,
      matchAll: input.matchAll ?? true,
      createdAt: now,
      updatedAt: now,
    });

    this.segments.set(segment.id, segment);
    return segment;
  }

  /** Get a segment by ID */
  getSegment(id: string): UserSegment | undefined {
    return this.segments.get(id);
  }

  /** Get all segments */
  getAllSegments(): UserSegment[] {
    return Array.from(this.segments.values());
  }

  /** Delete a segment */
  deleteSegment(id: string): boolean {
    return this.segments.delete(id);
  }

  /** Check if a user matches any of the given segments */
  private matchesAnySegment(segmentIds: string[], userContext: UserContext): boolean {
    return segmentIds.some(segmentId => {
      const segment = this.segments.get(segmentId);
      if (!segment) return false;
      return this.matchesSegment(segment, userContext);
    });
  }

  /** Check if a user matches a specific segment */
  matchesSegment(segment: UserSegment, userContext: UserContext): boolean {
    if (segment.rules.length === 0) return true;

    if (segment.matchAll) {
      return segment.rules.every(rule => this.evaluateRule(rule, userContext));
    } else {
      return segment.rules.some(rule => this.evaluateRule(rule, userContext));
    }
  }

  /** Check if a user matches all targeting rules */
  private matchesTargetingRules(rules: TargetingRule[], userContext: UserContext): boolean {
    return rules.every(rule => this.evaluateRule(rule, userContext));
  }

  /** Evaluate a single targeting rule against user context */
  private evaluateRule(rule: TargetingRule, userContext: UserContext): boolean {
    const userValue = this.getUserAttribute(rule.attribute, userContext);
    if (userValue === undefined) return false;

    const ruleValue = rule.value;

    switch (rule.operator) {
      case 'equals':
        return String(userValue) === String(ruleValue);
      case 'not_equals':
        return String(userValue) !== String(ruleValue);
      case 'in':
        if (Array.isArray(ruleValue)) {
          return ruleValue.includes(String(userValue));
        }
        return false;
      case 'not_in':
        if (Array.isArray(ruleValue)) {
          return !ruleValue.includes(String(userValue));
        }
        return true;
      case 'gt':
        return Number(userValue) > Number(ruleValue);
      case 'lt':
        return Number(userValue) < Number(ruleValue);
      case 'gte':
        return Number(userValue) >= Number(ruleValue);
      case 'lte':
        return Number(userValue) <= Number(ruleValue);
      case 'contains':
        return String(userValue).includes(String(ruleValue));
      case 'regex':
        try {
          return new RegExp(String(ruleValue)).test(String(userValue));
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  /** Get a user attribute from the user context */
  private getUserAttribute(attribute: string, userContext: UserContext): unknown {
    // Check standard fields first
    if (attribute in userContext && attribute !== 'properties') {
      return (userContext as Record<string, unknown>)[attribute];
    }
    // Check custom properties
    return userContext.properties[attribute];
  }

  // ─── FF-005: Flag Audit Trail ──────────────────────────────────────────────

  /** Record a change in the audit trail */
  private recordChange(
    flagKey: string,
    changedBy: string,
    changeType: FlagChange['changeType'],
    fieldChanged: string | undefined,
    previousValue: unknown,
    newValue: unknown,
  ): void {
    this.changeIdCounter++;
    const change: FlagChange = {
      id: `change_${this.changeIdCounter}`,
      flagKey,
      changedBy,
      changedAt: Date.now(),
      previousValue,
      newValue,
      changeType,
      fieldChanged,
    };
    this.auditTrail.push(change);
  }

  /** Get the full audit trail, optionally filtered by flag key */
  getAuditTrail(flagKey?: string): FlagChange[] {
    if (flagKey) {
      return this.auditTrail.filter(c => c.flagKey === flagKey);
    }
    return [...this.auditTrail];
  }

  /** Get audit trail entries for a specific time range */
  getAuditTrailByTimeRange(startTime: number, endTime: number): FlagChange[] {
    return this.auditTrail.filter(c => c.changedAt >= startTime && c.changedAt <= endTime);
  }
}

// ─── FF-006: Flag SDK ────────────────────────────────────────────────────────

export interface FlagSDKOptions {
  store: FeatureFlagStore;
  cacheTtlMs?: number;
}

interface CachedEvaluation {
  value: unknown;
  evaluatedAt: number;
}

/**
 * Flag SDK provides a simple interface to evaluate flags for a user context,
 * with local caching to avoid repeated evaluation.
 */
export class FlagSDK {
  private store: FeatureFlagStore;
  private cacheTtlMs: number;
  private cache: Map<string, CachedEvaluation> = new Map();

  constructor(options: FlagSDKOptions) {
    this.store = options.store;
    this.cacheTtlMs = options.cacheTtlMs ?? 60_000; // default 1 minute
  }

  /** Evaluate a boolean flag with caching */
  getBooleanFlag(key: string, userContext: UserContext, defaultValue = false): boolean {
    const cacheKey = this.buildCacheKey(key, userContext);
    const cached = this.getFromCache(cacheKey);
    if (cached !== undefined) return cached as boolean;

    const result = this.store.evaluateBoolean(key, userContext, defaultValue);
    this.setInCache(cacheKey, result);
    return result;
  }

  /** Evaluate any flag type with caching */
  getFlag<T = unknown>(key: string, userContext: UserContext, defaultValue: T): T {
    const cacheKey = this.buildCacheKey(key, userContext);
    const cached = this.getFromCache(cacheKey);
    if (cached !== undefined) return cached as T;

    const result = this.store.evaluate<T>(key, userContext, defaultValue);
    this.setInCache(cacheKey, result);
    return result;
  }

  /** Get all flag evaluations for a user context */
  getAllFlags(userContext: UserContext): Record<string, unknown> {
    const flags = this.store.getAllFlags();
    const results: Record<string, unknown> = {};
    for (const flag of flags) {
      results[flag.key] = this.getFlag(flag.key, userContext, flag.defaultValue);
    }
    return results;
  }

  /** Invalidate the local cache */
  clearCache(): void {
    this.cache.clear();
  }

  /** Invalidate cache for a specific flag */
  invalidateFlag(key: string): void {
    // Remove all cached entries for this flag key
    for (const cacheKey of this.cache.keys()) {
      if (cacheKey.startsWith(`${key}:`)) {
        this.cache.delete(cacheKey);
      }
    }
  }

  private buildCacheKey(flagKey: string, userContext: UserContext): string {
    const contextHash = createHash('sha256')
      .update(JSON.stringify({
        userId: userContext.userId,
        email: userContext.email,
        plan: userContext.plan,
        role: userContext.role,
        orgId: userContext.orgId,
        properties: userContext.properties,
      }))
      .digest('hex')
      .substring(0, 12);
    return `${flagKey}:${contextHash}`;
  }

  private getFromCache(key: string): unknown | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    if (now - entry.evaluatedAt > this.cacheTtlMs) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  private setInCache(key: string, value: unknown): void {
    this.cache.set(key, {
      value,
      evaluatedAt: Date.now(),
    });
  }
}
