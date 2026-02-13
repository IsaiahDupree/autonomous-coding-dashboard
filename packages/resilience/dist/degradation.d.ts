import { DegradationLevel, DegradationConfig } from './types';
export interface DegradationMetrics {
    level: DegradationLevel;
    uptime: number;
    lastHealthCheck: Date | null;
    failureRate: number;
}
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
export declare class ServiceDegradationManager {
    protected currentLevel: DegradationLevel;
    protected manualOverride: DegradationLevel | null;
    protected readonly config: DegradationConfig;
    protected healthCheckTimer: ReturnType<typeof setInterval> | null;
    protected lastHealthCheck: Date | null;
    protected totalChecks: number;
    protected failedChecks: number;
    protected startedAt: Date | null;
    protected lastCachedResult: unknown;
    constructor(config: DegradationConfig);
    /** Get the effective degradation level (manual override takes priority). */
    getCurrentLevel(): DegradationLevel;
    /**
     * Run a health check and update the degradation level based on rules.
     */
    checkHealth(): Promise<DegradationLevel>;
    /**
     * Execute a function respecting the current degradation level.
     */
    execute<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T>;
    /** Get degradation metrics. */
    getMetrics(): DegradationMetrics;
    /** Manual override of degradation level. Pass null to clear override. */
    override(level: DegradationLevel | null): void;
    /** Start periodic health checking. */
    start(): void;
    /** Stop periodic health checking. */
    stop(): void;
    protected executeNormal<T>(fn: () => Promise<T>): Promise<T>;
    protected executeDegraded<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T>;
    protected executeMinimal<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T>;
    protected executeOffline<T>(fallback?: () => T): T;
}
export interface AIFallbackChain {
    primaryModel: string;
    fallbackModel: string;
    cachedResponseFn?: () => unknown;
    errorMessage: string;
}
export interface AIServiceDegradationConfig extends DegradationConfig {
    fallbackChain: AIFallbackChain;
    defaultMaxTokens: number;
    degradedMaxTokens: number;
}
/**
 * AI-specific degradation manager.
 *
 * Implements a fallback chain:
 *   primary model -> smaller model -> cached response -> error message
 *
 * Includes token budget awareness at degraded levels.
 */
export declare class AIServiceDegradation extends ServiceDegradationManager {
    private readonly aiConfig;
    constructor(config: AIServiceDegradationConfig);
    /** Get the current model to use based on degradation level. */
    getCurrentModel(): string;
    /** Get the max tokens budget for the current degradation level. */
    getMaxTokens(): number;
    /**
     * Execute an AI call with the full fallback chain:
     *   primary model -> fallback model -> cached response -> error message
     */
    executeWithFallbackChain<T>(primaryFn: () => Promise<T>, fallbackFn: () => Promise<T>): Promise<T | string>;
}
//# sourceMappingURL=degradation.d.ts.map