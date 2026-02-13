import {
  DegradationLevel,
  DegradationConfig,
  DegradationRule,
  ServiceMetrics,
} from './types';

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
export class ServiceDegradationManager {
  protected currentLevel: DegradationLevel = DegradationLevel.NORMAL;
  protected manualOverride: DegradationLevel | null = null;
  protected readonly config: DegradationConfig;
  protected healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  protected lastHealthCheck: Date | null = null;
  protected totalChecks = 0;
  protected failedChecks = 0;
  protected startedAt: Date | null = null;
  protected lastCachedResult: unknown = undefined;

  constructor(config: DegradationConfig) {
    this.config = config;
  }

  /** Get the effective degradation level (manual override takes priority). */
  getCurrentLevel(): DegradationLevel {
    return this.manualOverride ?? this.currentLevel;
  }

  /**
   * Run a health check and update the degradation level based on rules.
   */
  async checkHealth(): Promise<DegradationLevel> {
    this.totalChecks++;
    this.lastHealthCheck = new Date();

    let isHealthy: boolean;
    try {
      isHealthy = await this.config.healthCheckFn();
    } catch {
      isHealthy = false;
    }

    if (!isHealthy) {
      this.failedChecks++;
    }

    // Build service metrics for rule evaluation
    const metrics: ServiceMetrics = {
      errorRate: this.totalChecks > 0 ? this.failedChecks / this.totalChecks : 0,
      latencyMs: 0,
      requestCount: this.totalChecks,
    };

    // Evaluate rules in reverse order (most severe first) to find the highest applicable level
    const orderedLevels: DegradationLevel[] = [
      DegradationLevel.OFFLINE,
      DegradationLevel.MINIMAL,
      DegradationLevel.DEGRADED,
      DegradationLevel.NORMAL,
    ];

    let newLevel = DegradationLevel.NORMAL;

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
  async execute<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    const level = this.getCurrentLevel();

    switch (level) {
      case DegradationLevel.NORMAL:
        return this.executeNormal(fn);

      case DegradationLevel.DEGRADED:
        return this.executeDegraded(fn, fallback);

      case DegradationLevel.MINIMAL:
        return this.executeMinimal(fn, fallback);

      case DegradationLevel.OFFLINE:
        return this.executeOffline(fallback);
    }
  }

  /** Get degradation metrics. */
  getMetrics(): DegradationMetrics {
    return {
      level: this.getCurrentLevel(),
      uptime: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
      lastHealthCheck: this.lastHealthCheck,
      failureRate:
        this.totalChecks > 0 ? this.failedChecks / this.totalChecks : 0,
    };
  }

  /** Manual override of degradation level. Pass null to clear override. */
  override(level: DegradationLevel | null): void {
    this.manualOverride = level;
  }

  /** Start periodic health checking. */
  start(): void {
    this.startedAt = new Date();
    this.healthCheckTimer = setInterval(
      () => void this.checkHealth(),
      this.config.healthCheckIntervalMs ?? 30000,
    );
    // Perform an initial check
    void this.checkHealth();
  }

  /** Stop periodic health checking. */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  // ── Protected execution strategies ─────────────────────────────

  protected async executeNormal<T>(fn: () => Promise<T>): Promise<T> {
    const result = await fn();
    this.lastCachedResult = result;
    return result;
  }

  protected async executeDegraded<T>(
    fn: () => Promise<T>,
    fallback?: () => T,
  ): Promise<T> {
    // Run with a shorter timeout (half the normal acquireTimeout or 15s)
    const timeoutMs = 15000;
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Degraded mode timeout')), timeoutMs),
        ),
      ]);
      this.lastCachedResult = result;
      return result;
    } catch (error) {
      if (fallback) return fallback();
      throw error;
    }
  }

  protected async executeMinimal<T>(
    fn: () => Promise<T>,
    fallback?: () => T,
  ): Promise<T> {
    // Prefer cached/fallback, else try function
    if (fallback) {
      try {
        return fallback();
      } catch {
        // fallback failed, try the actual function
      }
    }

    if (this.lastCachedResult !== undefined) {
      return this.lastCachedResult as T;
    }

    return fn();
  }

  protected executeOffline<T>(fallback?: () => T): T {
    if (fallback) {
      return fallback();
    }
    throw new Error(
      `Service "${this.config.service}" is offline and no fallback is available`,
    );
  }
}

// ── AI Service Degradation ───────────────────────────────────────

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
export class AIServiceDegradation extends ServiceDegradationManager {
  private readonly aiConfig: AIServiceDegradationConfig;

  constructor(config: AIServiceDegradationConfig) {
    super(config);
    this.aiConfig = config;
  }

  /** Get the current model to use based on degradation level. */
  getCurrentModel(): string {
    const level = this.getCurrentLevel();
    switch (level) {
      case DegradationLevel.NORMAL:
        return this.aiConfig.fallbackChain.primaryModel;
      case DegradationLevel.DEGRADED:
      case DegradationLevel.MINIMAL:
        return this.aiConfig.fallbackChain.fallbackModel;
      case DegradationLevel.OFFLINE:
        return this.aiConfig.fallbackChain.fallbackModel;
    }
  }

  /** Get the max tokens budget for the current degradation level. */
  getMaxTokens(): number {
    const level = this.getCurrentLevel();
    switch (level) {
      case DegradationLevel.NORMAL:
        return this.aiConfig.defaultMaxTokens;
      case DegradationLevel.DEGRADED:
        return this.aiConfig.degradedMaxTokens;
      case DegradationLevel.MINIMAL:
        return Math.floor(this.aiConfig.degradedMaxTokens / 2);
      case DegradationLevel.OFFLINE:
        return 0;
    }
  }

  /**
   * Execute an AI call with the full fallback chain:
   *   primary model -> fallback model -> cached response -> error message
   */
  async executeWithFallbackChain<T>(
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T>,
  ): Promise<T | string> {
    const level = this.getCurrentLevel();
    const chain = this.aiConfig.fallbackChain;

    // Offline: skip all calls
    if (level === DegradationLevel.OFFLINE) {
      if (chain.cachedResponseFn) {
        return chain.cachedResponseFn() as T;
      }
      return chain.errorMessage;
    }

    // Normal: try primary
    if (level === DegradationLevel.NORMAL) {
      try {
        const result = await primaryFn();
        this.lastCachedResult = result;
        return result;
      } catch {
        // Fall through to fallback model
      }
    }

    // Degraded / Minimal / primary failed: try fallback model
    try {
      const result = await fallbackFn();
      this.lastCachedResult = result;
      return result;
    } catch {
      // Fall through to cached
    }

    // Try cached response
    if (chain.cachedResponseFn) {
      try {
        return chain.cachedResponseFn() as T;
      } catch {
        // Fall through to error message
      }
    }

    if (this.lastCachedResult !== undefined) {
      return this.lastCachedResult as T;
    }

    // Final fallback: error message
    return chain.errorMessage;
  }
}
