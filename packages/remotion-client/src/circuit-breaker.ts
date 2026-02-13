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

import { CircuitBreakerOpenError } from "./errors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export enum CircuitBreakerState {
  Closed = "closed",
  Open = "open",
  HalfOpen = "half-open",
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

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.Closed;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenSuccessThreshold: number;
  private readonly onStateChange?: (
    from: CircuitBreakerState,
    to: CircuitBreakerState,
  ) => void;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold ?? 1;
    this.onStateChange = options.onStateChange;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Return the current state of the circuit breaker. */
  getState(): CircuitBreakerState {
    // Check for automatic transition from OPEN -> HALF_OPEN.
    if (this.state === CircuitBreakerState.Open && this.shouldAttemptReset()) {
      this.transitionTo(CircuitBreakerState.HalfOpen);
    }
    return this.state;
  }

  /** Return the number of consecutive failures recorded so far. */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Execute an async function through the circuit breaker.
   *
   * - If the circuit is **closed**, the function runs normally.
   * - If the circuit is **open** and the reset timeout has not elapsed,
   *   a `CircuitBreakerOpenError` is thrown immediately.
   * - If the circuit is **half-open**, one probe request is allowed through.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState(); // may transition OPEN -> HALF_OPEN

    if (currentState === CircuitBreakerState.Open) {
      const waitMs = this.remainingResetMs();
      throw new CircuitBreakerOpenError(
        `Circuit breaker is open. Retry after ${waitMs}ms.`,
        waitMs,
      );
    }

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
   * Manually reset the circuit breaker back to the closed state.
   * Useful in tests or after a known recovery.
   */
  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    if (this.state !== CircuitBreakerState.Closed) {
      this.transitionTo(CircuitBreakerState.Closed);
    }
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private onSuccess(): void {
    if (this.state === CircuitBreakerState.HalfOpen) {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.reset();
      }
    } else {
      // In CLOSED state a success resets the failure counter.
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HalfOpen) {
      // Probe failed -- go back to OPEN.
      this.successCount = 0;
      this.transitionTo(CircuitBreakerState.Open);
    } else if (
      this.state === CircuitBreakerState.Closed &&
      this.failureCount >= this.failureThreshold
    ) {
      this.transitionTo(CircuitBreakerState.Open);
    }
  }

  private shouldAttemptReset(): boolean {
    if (this.lastFailureTime === null) return false;
    return Date.now() - this.lastFailureTime >= this.resetTimeoutMs;
  }

  private remainingResetMs(): number {
    if (this.lastFailureTime === null) return 0;
    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.resetTimeoutMs - elapsed);
  }

  private transitionTo(newState: CircuitBreakerState): void {
    const prev = this.state;
    this.state = newState;

    if (newState === CircuitBreakerState.HalfOpen) {
      this.successCount = 0;
    }

    if (this.onStateChange && prev !== newState) {
      this.onStateChange(prev, newState);
    }
  }
}
