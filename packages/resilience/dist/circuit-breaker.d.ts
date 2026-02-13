import { CircuitBreakerState, CircuitBreakerConfig, CircuitBreakerMetrics } from './types';
/**
 * RES-001: Generic circuit breaker pattern implementation.
 *
 * State machine:
 *   CLOSED  --[failure threshold exceeded]--> OPEN
 *   OPEN    --[reset timeout elapsed]------> HALF_OPEN
 *   HALF_OPEN --[success]-------------------> CLOSED
 *   HALF_OPEN --[failure]-------------------> OPEN
 */
export declare class CircuitBreaker<T> {
    private state;
    private failures;
    private successes;
    private totalRequests;
    private halfOpenRequests;
    private lastFailure;
    private lastSuccess;
    private openedAt;
    private readonly config;
    constructor(config?: Partial<CircuitBreakerConfig>);
    /**
     * Execute a function call through the circuit breaker.
     */
    execute(fn: () => Promise<T>): Promise<T>;
    /**
     * Returns true if calls are currently permitted through the breaker.
     */
    isCallPermitted(): boolean;
    /** Current circuit breaker state. */
    getState(): CircuitBreakerState;
    /** Snapshot of current metrics. */
    getMetrics(): CircuitBreakerMetrics;
    /** Force reset to CLOSED state. */
    reset(): void;
    /** Force the breaker OPEN. */
    trip(): void;
    private onSuccess;
    private onFailure;
    private transitionTo;
}
/**
 * Error thrown when a call is rejected because the circuit breaker is open.
 */
export declare class CircuitBreakerOpenError extends Error {
    constructor(message: string);
}
/**
 * Registry for managing multiple named circuit breakers.
 */
export declare class CircuitBreakerRegistry {
    private readonly breakers;
    private readonly defaultConfig;
    constructor(defaultConfig?: Partial<CircuitBreakerConfig>);
    /** Get or create a named circuit breaker. */
    get<T = unknown>(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker<T>;
    /** Return all breakers with their states. */
    getAll(): Map<string, {
        breaker: CircuitBreaker<unknown>;
        state: CircuitBreakerState;
    }>;
    /** Reset all breakers to CLOSED. */
    resetAll(): void;
}
//# sourceMappingURL=circuit-breaker.d.ts.map