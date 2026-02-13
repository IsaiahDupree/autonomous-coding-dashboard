"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerRegistry = exports.CircuitBreakerOpenError = exports.CircuitBreaker = void 0;
const types_1 = require("./types");
/**
 * RES-001: Generic circuit breaker pattern implementation.
 *
 * State machine:
 *   CLOSED  --[failure threshold exceeded]--> OPEN
 *   OPEN    --[reset timeout elapsed]------> HALF_OPEN
 *   HALF_OPEN --[success]-------------------> CLOSED
 *   HALF_OPEN --[failure]-------------------> OPEN
 */
class CircuitBreaker {
    constructor(config = {}) {
        this.state = types_1.CircuitBreakerState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.totalRequests = 0;
        this.halfOpenRequests = 0;
        this.lastFailure = null;
        this.lastSuccess = null;
        this.openedAt = null;
        const parsed = types_1.CircuitBreakerConfigSchema.parse(config);
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
    async execute(fn) {
        if (!this.isCallPermitted()) {
            throw new CircuitBreakerOpenError(`Circuit breaker is ${this.state} - call not permitted`);
        }
        if (this.state === types_1.CircuitBreakerState.HALF_OPEN) {
            this.halfOpenRequests++;
        }
        this.totalRequests++;
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    /**
     * Returns true if calls are currently permitted through the breaker.
     */
    isCallPermitted() {
        switch (this.state) {
            case types_1.CircuitBreakerState.CLOSED:
                return true;
            case types_1.CircuitBreakerState.OPEN: {
                // Check if reset timeout has elapsed
                if (this.openedAt) {
                    const elapsed = Date.now() - this.openedAt.getTime();
                    if (elapsed >= this.config.resetTimeoutMs) {
                        this.transitionTo(types_1.CircuitBreakerState.HALF_OPEN);
                        this.halfOpenRequests = 0;
                        return true;
                    }
                }
                return false;
            }
            case types_1.CircuitBreakerState.HALF_OPEN:
                return this.halfOpenRequests < this.config.halfOpenMaxRequests;
            default:
                return false;
        }
    }
    /** Current circuit breaker state. */
    getState() {
        // Re-evaluate in case reset timeout has elapsed
        if (this.state === types_1.CircuitBreakerState.OPEN && this.openedAt) {
            const elapsed = Date.now() - this.openedAt.getTime();
            if (elapsed >= this.config.resetTimeoutMs) {
                this.transitionTo(types_1.CircuitBreakerState.HALF_OPEN);
                this.halfOpenRequests = 0;
            }
        }
        return this.state;
    }
    /** Snapshot of current metrics. */
    getMetrics() {
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
    reset() {
        this.failures = 0;
        this.halfOpenRequests = 0;
        this.openedAt = null;
        this.transitionTo(types_1.CircuitBreakerState.CLOSED);
    }
    /** Force the breaker OPEN. */
    trip() {
        this.openedAt = new Date();
        this.transitionTo(types_1.CircuitBreakerState.OPEN);
    }
    // ── Private helpers ────────────────────────────────────────────
    onSuccess() {
        this.successes++;
        this.lastSuccess = new Date();
        if (this.state === types_1.CircuitBreakerState.HALF_OPEN) {
            // Successful test request in HALF_OPEN -> transition to CLOSED
            this.failures = 0;
            this.halfOpenRequests = 0;
            this.openedAt = null;
            this.transitionTo(types_1.CircuitBreakerState.CLOSED);
        }
    }
    onFailure() {
        this.failures++;
        this.lastFailure = new Date();
        switch (this.state) {
            case types_1.CircuitBreakerState.HALF_OPEN:
                // Failure in HALF_OPEN -> immediately trip back to OPEN
                this.openedAt = new Date();
                this.halfOpenRequests = 0;
                this.transitionTo(types_1.CircuitBreakerState.OPEN);
                break;
            case types_1.CircuitBreakerState.CLOSED:
                if (this.failures >= this.config.failureThreshold) {
                    this.openedAt = new Date();
                    this.transitionTo(types_1.CircuitBreakerState.OPEN);
                }
                break;
        }
    }
    transitionTo(newState) {
        if (this.state === newState)
            return;
        const oldState = this.state;
        this.state = newState;
        this.config.onStateChange?.(oldState, newState);
    }
}
exports.CircuitBreaker = CircuitBreaker;
/**
 * Error thrown when a call is rejected because the circuit breaker is open.
 */
class CircuitBreakerOpenError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CircuitBreakerOpenError';
    }
}
exports.CircuitBreakerOpenError = CircuitBreakerOpenError;
/**
 * Registry for managing multiple named circuit breakers.
 */
class CircuitBreakerRegistry {
    constructor(defaultConfig = {}) {
        this.breakers = new Map();
        this.defaultConfig = defaultConfig;
    }
    /** Get or create a named circuit breaker. */
    get(name, config) {
        if (!this.breakers.has(name)) {
            this.breakers.set(name, new CircuitBreaker({ ...this.defaultConfig, ...config }));
        }
        return this.breakers.get(name);
    }
    /** Return all breakers with their states. */
    getAll() {
        const result = new Map();
        for (const [name, breaker] of this.breakers) {
            result.set(name, { breaker, state: breaker.getState() });
        }
        return result;
    }
    /** Reset all breakers to CLOSED. */
    resetAll() {
        for (const breaker of this.breakers.values()) {
            breaker.reset();
        }
    }
}
exports.CircuitBreakerRegistry = CircuitBreakerRegistry;
//# sourceMappingURL=circuit-breaker.js.map