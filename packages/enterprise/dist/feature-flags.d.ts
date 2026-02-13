/**
 * Feature Flags (FF-001 to FF-006)
 * - FF-001: Feature flag storage (in-memory store, flag definition with key/description/type/default)
 * - FF-002: Boolean flags evaluation (on/off with user targeting rules)
 * - FF-003: Percentage rollout (gradual rollout with consistent hashing)
 * - FF-004: User segment targeting (segments defined by properties like plan, role, orgId)
 * - FF-005: Flag audit trail (who changed what flag when, change history)
 * - FF-006: Flag SDK (evaluate flags for a user context, with local caching)
 */
import { FeatureFlag, FlagChange, TargetingRule, UserContext, UserSegment } from './types';
export declare class FeatureFlagStore {
    private flags;
    private segments;
    private auditTrail;
    private changeIdCounter;
    /** Create a new feature flag */
    createFlag(input: {
        key: string;
        description?: string;
        type: FeatureFlag['type'];
        defaultValue: unknown;
        enabled?: boolean;
        rolloutPercentage?: number;
        createdBy?: string;
    }): FeatureFlag;
    /** Get a feature flag by key */
    getFlag(key: string): FeatureFlag | undefined;
    /** Get all feature flags */
    getAllFlags(): FeatureFlag[];
    /** Update a feature flag */
    updateFlag(key: string, updates: Partial<Omit<FeatureFlag, 'key' | 'createdAt'>>, changedBy: string): FeatureFlag;
    /** Delete a feature flag */
    deleteFlag(key: string, deletedBy: string): boolean;
    /** Evaluate a boolean flag for a given user context */
    evaluateBoolean(key: string, userContext: UserContext, defaultValue?: boolean): boolean;
    /** Evaluate any flag type for a given user context */
    evaluate<T = unknown>(key: string, userContext: UserContext, defaultValue: T): T;
    /**
     * Determines if a user is in the rollout percentage.
     * Uses consistent hashing so the same user always gets the same result
     * for a given flag key.
     */
    private isInRollout;
    /** Create a user segment */
    createSegment(input: {
        id: string;
        name: string;
        description?: string;
        rules: TargetingRule[];
        matchAll?: boolean;
    }): UserSegment;
    /** Get a segment by ID */
    getSegment(id: string): UserSegment | undefined;
    /** Get all segments */
    getAllSegments(): UserSegment[];
    /** Delete a segment */
    deleteSegment(id: string): boolean;
    /** Check if a user matches any of the given segments */
    private matchesAnySegment;
    /** Check if a user matches a specific segment */
    matchesSegment(segment: UserSegment, userContext: UserContext): boolean;
    /** Check if a user matches all targeting rules */
    private matchesTargetingRules;
    /** Evaluate a single targeting rule against user context */
    private evaluateRule;
    /** Get a user attribute from the user context */
    private getUserAttribute;
    /** Record a change in the audit trail */
    private recordChange;
    /** Get the full audit trail, optionally filtered by flag key */
    getAuditTrail(flagKey?: string): FlagChange[];
    /** Get audit trail entries for a specific time range */
    getAuditTrailByTimeRange(startTime: number, endTime: number): FlagChange[];
}
export interface FlagSDKOptions {
    store: FeatureFlagStore;
    cacheTtlMs?: number;
}
/**
 * Flag SDK provides a simple interface to evaluate flags for a user context,
 * with local caching to avoid repeated evaluation.
 */
export declare class FlagSDK {
    private store;
    private cacheTtlMs;
    private cache;
    constructor(options: FlagSDKOptions);
    /** Evaluate a boolean flag with caching */
    getBooleanFlag(key: string, userContext: UserContext, defaultValue?: boolean): boolean;
    /** Evaluate any flag type with caching */
    getFlag<T = unknown>(key: string, userContext: UserContext, defaultValue: T): T;
    /** Get all flag evaluations for a user context */
    getAllFlags(userContext: UserContext): Record<string, unknown>;
    /** Invalidate the local cache */
    clearCache(): void;
    /** Invalidate cache for a specific flag */
    invalidateFlag(key: string): void;
    private buildCacheKey;
    private getFromCache;
    private setInCache;
}
//# sourceMappingURL=feature-flags.d.ts.map