"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIServiceDegradation = exports.ServiceDegradationManager = void 0;
const types_1 = require("./types");
/**
 * RES-004: Service degradation manager.
 *
 * Monitors service health and automatically adjusts the degradation level.
 * At each level, different behavior is applied to function calls:
 *
 *   normal   -> run function directly
 *   degraded -> run function with shorter timeout
 *   minimal  -> prefer cached/fallback, else try function
 *   offline  -> return fallback only, never call function
 */
class ServiceDegradationManager {
    constructor(config) {
        this.currentLevel = types_1.DegradationLevel.NORMAL;
        this.manualOverride = null;
        this.healthCheckTimer = null;
        this.lastHealthCheck = null;
        this.totalChecks = 0;
        this.failedChecks = 0;
        this.startedAt = null;
        this.lastCachedResult = undefined;
        this.config = config;
    }
    /** Get the effective degradation level (manual override takes priority). */
    getCurrentLevel() {
        return this.manualOverride ?? this.currentLevel;
    }
    /**
     * Run a health check and update the degradation level based on rules.
     */
    async checkHealth() {
        this.totalChecks++;
        this.lastHealthCheck = new Date();
        let isHealthy;
        try {
            isHealthy = await this.config.healthCheckFn();
        }
        catch {
            isHealthy = false;
        }
        if (!isHealthy) {
            this.failedChecks++;
        }
        // Build service metrics for rule evaluation
        const metrics = {
            errorRate: this.totalChecks > 0 ? this.failedChecks / this.totalChecks : 0,
            latencyMs: 0,
            requestCount: this.totalChecks,
        };
        // Evaluate rules in reverse order (most severe first) to find the highest applicable level
        const orderedLevels = [
            types_1.DegradationLevel.OFFLINE,
            types_1.DegradationLevel.MINIMAL,
            types_1.DegradationLevel.DEGRADED,
            types_1.DegradationLevel.NORMAL,
        ];
        let newLevel = types_1.DegradationLevel.NORMAL;
        for (const targetLevel of orderedLevels) {
            const rule = this.config.levels.find((r) => r.level === targetLevel);
            if (rule && rule.condition(metrics)) {
                newLevel = targetLevel;
                break;
            }
        }
        if (this.manualOverride === null) {
            this.currentLevel = newLevel;
        }
        return this.getCurrentLevel();
    }
    /**
     * Execute a function respecting the current degradation level.
     */
    async execute(fn, fallback) {
        const level = this.getCurrentLevel();
        switch (level) {
            case types_1.DegradationLevel.NORMAL:
                return this.executeNormal(fn);
            case types_1.DegradationLevel.DEGRADED:
                return this.executeDegraded(fn, fallback);
            case types_1.DegradationLevel.MINIMAL:
                return this.executeMinimal(fn, fallback);
            case types_1.DegradationLevel.OFFLINE:
                return this.executeOffline(fallback);
        }
    }
    /** Get degradation metrics. */
    getMetrics() {
        return {
            level: this.getCurrentLevel(),
            uptime: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
            lastHealthCheck: this.lastHealthCheck,
            failureRate: this.totalChecks > 0 ? this.failedChecks / this.totalChecks : 0,
        };
    }
    /** Manual override of degradation level. Pass null to clear override. */
    override(level) {
        this.manualOverride = level;
    }
    /** Start periodic health checking. */
    start() {
        this.startedAt = new Date();
        this.healthCheckTimer = setInterval(() => void this.checkHealth(), this.config.healthCheckIntervalMs ?? 30000);
        // Perform an initial check
        void this.checkHealth();
    }
    /** Stop periodic health checking. */
    stop() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }
    // ── Protected execution strategies ─────────────────────────────
    async executeNormal(fn) {
        const result = await fn();
        this.lastCachedResult = result;
        return result;
    }
    async executeDegraded(fn, fallback) {
        // Run with a shorter timeout (half the normal acquireTimeout or 15s)
        const timeoutMs = 15000;
        try {
            const result = await Promise.race([
                fn(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Degraded mode timeout')), timeoutMs)),
            ]);
            this.lastCachedResult = result;
            return result;
        }
        catch (error) {
            if (fallback)
                return fallback();
            throw error;
        }
    }
    async executeMinimal(fn, fallback) {
        // Prefer cached/fallback, else try function
        if (fallback) {
            try {
                return fallback();
            }
            catch {
                // fallback failed, try the actual function
            }
        }
        if (this.lastCachedResult !== undefined) {
            return this.lastCachedResult;
        }
        return fn();
    }
    executeOffline(fallback) {
        if (fallback) {
            return fallback();
        }
        throw new Error(`Service "${this.config.service}" is offline and no fallback is available`);
    }
}
exports.ServiceDegradationManager = ServiceDegradationManager;
/**
 * AI-specific degradation manager.
 *
 * Implements a fallback chain:
 *   primary model -> smaller model -> cached response -> error message
 *
 * Includes token budget awareness at degraded levels.
 */
class AIServiceDegradation extends ServiceDegradationManager {
    constructor(config) {
        super(config);
        this.aiConfig = config;
    }
    /** Get the current model to use based on degradation level. */
    getCurrentModel() {
        const level = this.getCurrentLevel();
        switch (level) {
            case types_1.DegradationLevel.NORMAL:
                return this.aiConfig.fallbackChain.primaryModel;
            case types_1.DegradationLevel.DEGRADED:
            case types_1.DegradationLevel.MINIMAL:
                return this.aiConfig.fallbackChain.fallbackModel;
            case types_1.DegradationLevel.OFFLINE:
                return this.aiConfig.fallbackChain.fallbackModel;
        }
    }
    /** Get the max tokens budget for the current degradation level. */
    getMaxTokens() {
        const level = this.getCurrentLevel();
        switch (level) {
            case types_1.DegradationLevel.NORMAL:
                return this.aiConfig.defaultMaxTokens;
            case types_1.DegradationLevel.DEGRADED:
                return this.aiConfig.degradedMaxTokens;
            case types_1.DegradationLevel.MINIMAL:
                return Math.floor(this.aiConfig.degradedMaxTokens / 2);
            case types_1.DegradationLevel.OFFLINE:
                return 0;
        }
    }
    /**
     * Execute an AI call with the full fallback chain:
     *   primary model -> fallback model -> cached response -> error message
     */
    async executeWithFallbackChain(primaryFn, fallbackFn) {
        const level = this.getCurrentLevel();
        const chain = this.aiConfig.fallbackChain;
        // Offline: skip all calls
        if (level === types_1.DegradationLevel.OFFLINE) {
            if (chain.cachedResponseFn) {
                return chain.cachedResponseFn();
            }
            return chain.errorMessage;
        }
        // Normal: try primary
        if (level === types_1.DegradationLevel.NORMAL) {
            try {
                const result = await primaryFn();
                this.lastCachedResult = result;
                return result;
            }
            catch {
                // Fall through to fallback model
            }
        }
        // Degraded / Minimal / primary failed: try fallback model
        try {
            const result = await fallbackFn();
            this.lastCachedResult = result;
            return result;
        }
        catch {
            // Fall through to cached
        }
        // Try cached response
        if (chain.cachedResponseFn) {
            try {
                return chain.cachedResponseFn();
            }
            catch {
                // Fall through to error message
            }
        }
        if (this.lastCachedResult !== undefined) {
            return this.lastCachedResult;
        }
        // Final fallback: error message
        return chain.errorMessage;
    }
}
exports.AIServiceDegradation = AIServiceDegradation;
//# sourceMappingURL=degradation.js.map