import {
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerConfigSchema,
  CircuitBreakerMetrics,
} from './types';

/**
 * RES-001: Generic circuit breaker pattern implementation.
 *
 * State machine:
 *   CLOSED  --[failure threshold exceeded]--> OPEN
 *   OPEN    --[reset timeout elapsed]------> HALF_OPEN
 *   HALF_OPEN --[success]-------------------> CLOSED
 *   HALF_OPEN --[failure]-------------------> OPEN
 */
export class CircuitBreaker<T> {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures = 0;
  private successes = 0;
  private totalRequests = 0;
  private halfOpenRequests = 0;
  private lastFailure: Date | null = null;
  private lastSuccess: Date | null = null;
  private openedAt: Date | null = null;
  private readonly config: Required<
    Omit<CircuitBreakerConfig, 'onStateChange'>
  > & { onStateChange?: CircuitBreakerConfig['onStateChange'] };

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    const parsed = CircuitBreakerConfigSchema.parse(config);
    this.config = {
      failureThreshold: parsed.failureThreshold,
      resetTimeoutMs: parsed.resetTimeoutMs,
      halfOpenMaxRequests: parsed.halfOpenMaxRequests,
      monitorWindowMs: parsed.monitorWindowMs,
      onStateChange: parsed.onStateChange,
    };
  }

  /**
   * Execute a function call through the circuit breaker.
   */
  async execute(fn: () => Promise<T>): Promise<T> {
    if (!this.isCallPermitted()) {
      throw new CircuitBreakerOpenError(
        `Circuit breaker is ${this.state} - call not permitted`,
      );
    }

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenRequests++;
    }

    this.totalRequests++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Returns true if calls are currently permitted through the breaker.
   */
  isCallPermitted(): boolean {
    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        return true;

      case CircuitBreakerState.OPEN: {
        // Check if reset timeout has elapsed
        if (this.openedAt) {
          const elapsed = Date.now() - this.openedAt.getTime();
          if (elapsed >= this.config.resetTimeoutMs) {
            this.transitionTo(CircuitBreakerState.HALF_OPEN);
            this.halfOpenRequests = 0;
            return true;
          }
        }
        return false;
      }

      case CircuitBreakerState.HALF_OPEN:
        return this.halfOpenRequests < this.config.halfOpenMaxRequests;

      default:
        return false;
    }
  }

  /** Current circuit breaker state. */
  getState(): CircuitBreakerState {
    // Re-evaluate in case reset timeout has elapsed
    if (this.state === CircuitBreakerState.OPEN && this.openedAt) {
      const elapsed = Date.now() - this.openedAt.getTime();
      if (elapsed >= this.config.resetTimeoutMs) {
        this.transitionTo(CircuitBreakerState.HALF_OPEN);
        this.halfOpenRequests = 0;
      }
    }
    return this.state;
  }

  /** Snapshot of current metrics. */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.getState(),
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      totalRequests: this.totalRequests,
    };
  }

  /** Force reset to CLOSED state. */
  reset(): void {
    this.failures = 0;
    this.halfOpenRequests = 0;
    this.openedAt = null;
    this.transitionTo(CircuitBreakerState.CLOSED);
  }

  /** Force the breaker OPEN. */
  trip(): void {
    this.openedAt = new Date();
    this.transitionTo(CircuitBreakerState.OPEN);
  }

  // ── Private helpers ────────────────────────────────────────────

  private onSuccess(): void {
    this.successes++;
    this.lastSuccess = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Successful test request in HALF_OPEN -> transition to CLOSED
      this.failures = 0;
      this.halfOpenRequests = 0;
      this.openedAt = null;
      this.transitionTo(CircuitBreakerState.CLOSED);
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = new Date();

    switch (this.state) {
      case CircuitBreakerState.HALF_OPEN:
        // Failure in HALF_OPEN -> immediately trip back to OPEN
        this.openedAt = new Date();
        this.halfOpenRequests = 0;
        this.transitionTo(CircuitBreakerState.OPEN);
        break;

      case CircuitBreakerState.CLOSED:
        if (this.failures >= this.config.failureThreshold) {
          this.openedAt = new Date();
          this.transitionTo(CircuitBreakerState.OPEN);
        }
        break;
    }
  }

  private transitionTo(newState: CircuitBreakerState): void {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;
    this.config.onStateChange?.(oldState, newState);
  }
}

/**
 * Error thrown when a call is rejected because the circuit breaker is open.
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Registry for managing multiple named circuit breakers.
 */
export class CircuitBreakerRegistry {
  private readonly breakers = new Map<string, CircuitBreaker<unknown>>();
  private readonly defaultConfig: Partial<CircuitBreakerConfig>;

  constructor(defaultConfig: Partial<CircuitBreakerConfig> = {}) {
    this.defaultConfig = defaultConfig;
  }

  /** Get or create a named circuit breaker. */
  get<T = unknown>(
    name: string,
    config?: Partial<CircuitBreakerConfig>,
  ): CircuitBreaker<T> {
    if (!this.breakers.has(name)) {
      this.breakers.set(
        name,
        new CircuitBreaker<unknown>({ ...this.defaultConfig, ...config }),
      );
    }
    return this.breakers.get(name)! as CircuitBreaker<T>;
  }

  /** Return all breakers with their states. */
  getAll(): Map<string, { breaker: CircuitBreaker<unknown>; state: CircuitBreakerState }> {
    const result = new Map<
      string,
      { breaker: CircuitBreaker<unknown>; state: CircuitBreakerState }
    >();
    for (const [name, breaker] of this.breakers) {
      result.set(name, { breaker, state: breaker.getState() });
    }
    return result;
  }

  /** Reset all breakers to CLOSED. */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}
