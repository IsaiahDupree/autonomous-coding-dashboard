"use strict";
/**
 * Feature Flags (FF-001 to FF-006)
 * - FF-001: Feature flag storage (in-memory store, flag definition with key/description/type/default)
 * - FF-002: Boolean flags evaluation (on/off with user targeting rules)
 * - FF-003: Percentage rollout (gradual rollout with consistent hashing)
 * - FF-004: User segment targeting (segments defined by properties like plan, role, orgId)
 * - FF-005: Flag audit trail (who changed what flag when, change history)
 * - FF-006: Flag SDK (evaluate flags for a user context, with local caching)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlagSDK = exports.FeatureFlagStore = void 0;
const crypto_1 = require("crypto");
const types_1 = require("./types");
// ─── FF-001: Feature Flag Storage ────────────────────────────────────────────
class FeatureFlagStore {
    constructor() {
        this.flags = new Map();
        this.segments = new Map();
        this.auditTrail = [];
        this.changeIdCounter = 0;
    }
    /** Create a new feature flag */
    createFlag(input) {
        if (this.flags.has(input.key)) {
            throw new Error(`Flag with key "${input.key}" already exists`);
        }
        const now = Date.now();
        const flag = types_1.FeatureFlagSchema.parse({
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
    getFlag(key) {
        return this.flags.get(key);
    }
    /** Get all feature flags */
    getAllFlags() {
        return Array.from(this.flags.values());
    }
    /** Update a feature flag */
    updateFlag(key, updates, changedBy) {
        const existing = this.flags.get(key);
        if (!existing) {
            throw new Error(`Flag with key "${key}" not found`);
        }
        const previousFlag = { ...existing };
        const updatedFlag = {
            ...existing,
            ...updates,
            key: existing.key,
            createdAt: existing.createdAt,
            updatedAt: Date.now(),
        };
        this.flags.set(key, updatedFlag);
        // Record changes for each field that changed
        for (const field of Object.keys(updates)) {
            const prev = previousFlag[field];
            const next = updatedFlag[field];
            if (JSON.stringify(prev) !== JSON.stringify(next)) {
                const changeType = field === 'enabled' ? 'toggled' : 'updated';
                this.recordChange(key, changedBy, changeType, field, prev, next);
            }
        }
        return updatedFlag;
    }
    /** Delete a feature flag */
    deleteFlag(key, deletedBy) {
        const flag = this.flags.get(key);
        if (!flag)
            return false;
        this.flags.delete(key);
        this.recordChange(key, deletedBy, 'deleted', undefined, flag, undefined);
        return true;
    }
    // ─── FF-002: Boolean Flags Evaluation ──────────────────────────────────────
    /** Evaluate a boolean flag for a given user context */
    evaluateBoolean(key, userContext, defaultValue = false) {
        const flag = this.flags.get(key);
        if (!flag || !flag.enabled)
            return defaultValue;
        if (flag.type !== 'boolean') {
            throw new Error(`Flag "${key}" is not a boolean flag`);
        }
        // Check targeting rules
        if (flag.targetingRules.length > 0) {
            const matchesRules = this.matchesTargetingRules(flag.targetingRules, userContext);
            if (!matchesRules)
                return defaultValue;
        }
        // Check segment targeting (FF-004)
        if (flag.segmentIds.length > 0) {
            const matchesSegment = this.matchesAnySegment(flag.segmentIds, userContext);
            if (!matchesSegment)
                return defaultValue;
        }
        // Check percentage rollout (FF-003)
        if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
            const inRollout = this.isInRollout(key, userContext.userId, flag.rolloutPercentage);
            if (!inRollout)
                return defaultValue;
        }
        return flag.defaultValue;
    }
    /** Evaluate any flag type for a given user context */
    evaluate(key, userContext, defaultValue) {
        const flag = this.flags.get(key);
        if (!flag || !flag.enabled)
            return defaultValue;
        // Check targeting rules
        if (flag.targetingRules.length > 0) {
            const matchesRules = this.matchesTargetingRules(flag.targetingRules, userContext);
            if (!matchesRules)
                return defaultValue;
        }
        // Check segment targeting
        if (flag.segmentIds.length > 0) {
            const matchesSegment = this.matchesAnySegment(flag.segmentIds, userContext);
            if (!matchesSegment)
                return defaultValue;
        }
        // Check percentage rollout
        if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
            const inRollout = this.isInRollout(key, userContext.userId, flag.rolloutPercentage);
            if (!inRollout)
                return defaultValue;
        }
        return flag.defaultValue;
    }
    // ─── FF-003: Percentage Rollout ────────────────────────────────────────────
    /**
     * Determines if a user is in the rollout percentage.
     * Uses consistent hashing so the same user always gets the same result
     * for a given flag key.
     */
    isInRollout(flagKey, userId, percentage) {
        if (percentage >= 100)
            return true;
        if (percentage <= 0)
            return false;
        const hash = (0, crypto_1.createHash)('sha256')
            .update(`${flagKey}:${userId}`)
            .digest('hex');
        // Take first 8 hex chars and convert to number (0 to 0xFFFFFFFF)
        const hashInt = parseInt(hash.substring(0, 8), 16);
        const normalizedValue = (hashInt / 0xFFFFFFFF) * 100;
        return normalizedValue < percentage;
    }
    // ─── FF-004: User Segment Targeting ────────────────────────────────────────
    /** Create a user segment */
    createSegment(input) {
        if (this.segments.has(input.id)) {
            throw new Error(`Segment with id "${input.id}" already exists`);
        }
        const now = Date.now();
        const segment = types_1.UserSegmentSchema.parse({
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
    getSegment(id) {
        return this.segments.get(id);
    }
    /** Get all segments */
    getAllSegments() {
        return Array.from(this.segments.values());
    }
    /** Delete a segment */
    deleteSegment(id) {
        return this.segments.delete(id);
    }
    /** Check if a user matches any of the given segments */
    matchesAnySegment(segmentIds, userContext) {
        return segmentIds.some(segmentId => {
            const segment = this.segments.get(segmentId);
            if (!segment)
                return false;
            return this.matchesSegment(segment, userContext);
        });
    }
    /** Check if a user matches a specific segment */
    matchesSegment(segment, userContext) {
        if (segment.rules.length === 0)
            return true;
        if (segment.matchAll) {
            return segment.rules.every(rule => this.evaluateRule(rule, userContext));
        }
        else {
            return segment.rules.some(rule => this.evaluateRule(rule, userContext));
        }
    }
    /** Check if a user matches all targeting rules */
    matchesTargetingRules(rules, userContext) {
        return rules.every(rule => this.evaluateRule(rule, userContext));
    }
    /** Evaluate a single targeting rule against user context */
    evaluateRule(rule, userContext) {
        const userValue = this.getUserAttribute(rule.attribute, userContext);
        if (userValue === undefined)
            return false;
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
                }
                catch {
                    return false;
                }
            default:
                return false;
        }
    }
    /** Get a user attribute from the user context */
    getUserAttribute(attribute, userContext) {
        // Check standard fields first
        if (attribute in userContext && attribute !== 'properties') {
            return userContext[attribute];
        }
        // Check custom properties
        return userContext.properties[attribute];
    }
    // ─── FF-005: Flag Audit Trail ──────────────────────────────────────────────
    /** Record a change in the audit trail */
    recordChange(flagKey, changedBy, changeType, fieldChanged, previousValue, newValue) {
        this.changeIdCounter++;
        const change = {
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
    getAuditTrail(flagKey) {
        if (flagKey) {
            return this.auditTrail.filter(c => c.flagKey === flagKey);
        }
        return [...this.auditTrail];
    }
    /** Get audit trail entries for a specific time range */
    getAuditTrailByTimeRange(startTime, endTime) {
        return this.auditTrail.filter(c => c.changedAt >= startTime && c.changedAt <= endTime);
    }
}
exports.FeatureFlagStore = FeatureFlagStore;
/**
 * Flag SDK provides a simple interface to evaluate flags for a user context,
 * with local caching to avoid repeated evaluation.
 */
class FlagSDK {
    constructor(options) {
        this.cache = new Map();
        this.store = options.store;
        this.cacheTtlMs = options.cacheTtlMs ?? 60000; // default 1 minute
    }
    /** Evaluate a boolean flag with caching */
    getBooleanFlag(key, userContext, defaultValue = false) {
        const cacheKey = this.buildCacheKey(key, userContext);
        const cached = this.getFromCache(cacheKey);
        if (cached !== undefined)
            return cached;
        const result = this.store.evaluateBoolean(key, userContext, defaultValue);
        this.setInCache(cacheKey, result);
        return result;
    }
    /** Evaluate any flag type with caching */
    getFlag(key, userContext, defaultValue) {
        const cacheKey = this.buildCacheKey(key, userContext);
        const cached = this.getFromCache(cacheKey);
        if (cached !== undefined)
            return cached;
        const result = this.store.evaluate(key, userContext, defaultValue);
        this.setInCache(cacheKey, result);
        return result;
    }
    /** Get all flag evaluations for a user context */
    getAllFlags(userContext) {
        const flags = this.store.getAllFlags();
        const results = {};
        for (const flag of flags) {
            results[flag.key] = this.getFlag(flag.key, userContext, flag.defaultValue);
        }
        return results;
    }
    /** Invalidate the local cache */
    clearCache() {
        this.cache.clear();
    }
    /** Invalidate cache for a specific flag */
    invalidateFlag(key) {
        // Remove all cached entries for this flag key
        for (const cacheKey of this.cache.keys()) {
            if (cacheKey.startsWith(`${key}:`)) {
                this.cache.delete(cacheKey);
            }
        }
    }
    buildCacheKey(flagKey, userContext) {
        const contextHash = (0, crypto_1.createHash)('sha256')
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
    getFromCache(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        const now = Date.now();
        if (now - entry.evaluatedAt > this.cacheTtlMs) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    }
    setInCache(key, value) {
        this.cache.set(key, {
            value,
            evaluatedAt: Date.now(),
        });
    }
}
exports.FlagSDK = FlagSDK;
//# sourceMappingURL=feature-flags.js.map