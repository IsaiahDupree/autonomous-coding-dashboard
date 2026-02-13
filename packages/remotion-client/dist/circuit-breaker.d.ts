/**
 * Circuit breaker implementation for the Remotion API client.
 *
 * The circuit breaker prevents cascading failures by short-circuiting
 * requests when the downstream service is unhealthy.
 *
 * State machine:
 *
 *   CLOSED  --[failure threshold reached]--> OPEN
 *   OPEN    --[reset timeout elapsed]------> HALF_OPEN
 *   HALF_OPEN --[probe succeeds]-----------> CLOSED
 *   HALF_OPEN --[probe fails]--------------> OPEN
 */
export declare enum CircuitBreakerState {
    Closed = "closed",
    Open = "open",
    HalfOpen = "half-open"
}
export interface CircuitBreakerOptions {
    /** Number of consecutive failures before the circuit opens. Default: 5 */
    failureThreshold?: number;
    /** Milliseconds to wait in OPEN state before transitioning to HALF_OPEN. Default: 30 000 */
    resetTimeoutMs?: number;
    /**
     * Number of successful probe requests in HALF_OPEN state required to
     * transition back to CLOSED. Default: 1
     */
    halfOpenSuccessThreshold?: number;
    /** Optional callback invoked on every state transition. */
    onStateChange?: (from: CircuitBreakerState, to: CircuitBreakerState) => void;
}
export declare class CircuitBreaker {
    private state;
    private failureCount;
    private successCount;
    private lastFailureTime;
    private readonly failureThreshold;
    private readonly resetTimeoutMs;
    private readonly halfOpenSuccessThreshold;
    private readonly onStateChange?;
    constructor(options?: CircuitBreakerOptions);
    /** Return the current state of the circuit breaker. */
    getState(): CircuitBreakerState;
    /** Return the number of consecutive failures recorded so far. */
    getFailureCount(): number;
    /**
     * Execute an async function through the circuit breaker.
     *
     * - If the circuit is **closed**, the function runs normally.
     * - If the circuit is **open** and the reset timeout has not elapsed,
     *   a `CircuitBreakerOpenError` is thrown immediately.
     * - If the circuit is **half-open**, one probe request is allowed through.
     */
    execute<T>(fn: () => Promise<T>): Promise<T>;
    /**
     * Manually reset the circuit breaker back to the closed state.
     * Useful in tests or after a known recovery.
     */
    reset(): void;
    private onSuccess;
    private onFailure;
    private shouldAttemptReset;
    private remainingResetMs;
    private transitionTo;
}
//# sourceMappingURL=circuit-breaker.d.ts.map