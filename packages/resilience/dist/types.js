"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolConfigSchema = exports.DegradationConfigSchema = exports.DegradationLevel = exports.DeadLetterEntrySchema = exports.RetryConfigSchema = exports.CircuitBreakerConfigSchema = exports.CircuitBreakerState = void 0;
const zod_1 = require("zod");
// ── Circuit Breaker ────────────────────────────────────────────────
var CircuitBreakerState;
(function (CircuitBreakerState) {
    CircuitBreakerState["CLOSED"] = "closed";
    CircuitBreakerState["OPEN"] = "open";
    CircuitBreakerState["HALF_OPEN"] = "half_open";
})(CircuitBreakerState || (exports.CircuitBreakerState = CircuitBreakerState = {}));
exports.CircuitBreakerConfigSchema = zod_1.z.object({
    failureThreshold: zod_1.z.number().int().positive().default(5),
    resetTimeoutMs: zod_1.z.number().int().positive().default(30000),
    halfOpenMaxRequests: zod_1.z.number().int().positive().default(1),
    monitorWindowMs: zod_1.z.number().int().positive().default(60000),
    onStateChange: zod_1.z
        .function()
        .args(zod_1.z.nativeEnum(CircuitBreakerState), zod_1.z.nativeEnum(CircuitBreakerState))
        .returns(zod_1.z.void())
        .optional(),
});
// ── Retry / Backoff ────────────────────────────────────────────────
exports.RetryConfigSchema = zod_1.z.object({
    maxRetries: zod_1.z.number().int().nonnegative().default(3),
    baseDelayMs: zod_1.z.number().int().positive().default(1000),
    maxDelayMs: zod_1.z.number().int().positive().default(30000),
    backoffMultiplier: zod_1.z.number().positive().default(2),
    jitterFactor: zod_1.z.number().min(0).max(1).default(0.1),
    retryableErrors: zod_1.z
        .function()
        .args(zod_1.z.unknown())
        .returns(zod_1.z.boolean())
        .optional(),
});
// ── Dead Letter Queue ──────────────────────────────────────────────
exports.DeadLetterEntrySchema = zod_1.z.object({
    id: zod_1.z.string(),
    originalQueue: zod_1.z.string(),
    payload: zod_1.z.unknown(),
    error: zod_1.z.object({
        message: zod_1.z.string(),
        stack: zod_1.z.string().optional(),
    }),
    attempts: zod_1.z.number().int().nonnegative(),
    firstFailedAt: zod_1.z.date(),
    lastFailedAt: zod_1.z.date(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// ── Service Degradation ────────────────────────────────────────────
var DegradationLevel;
(function (DegradationLevel) {
    DegradationLevel["NORMAL"] = "normal";
    DegradationLevel["DEGRADED"] = "degraded";
    DegradationLevel["MINIMAL"] = "minimal";
    DegradationLevel["OFFLINE"] = "offline";
})(DegradationLevel || (exports.DegradationLevel = DegradationLevel = {}));
exports.DegradationConfigSchema = zod_1.z.object({
    service: zod_1.z.string(),
    levels: zod_1.z.array(zod_1.z.custom()),
    healthCheckIntervalMs: zod_1.z.number().int().positive().default(30000),
    healthCheckFn: zod_1.z.function().args().returns(zod_1.z.promise(zod_1.z.boolean())),
});
// ── Connection Pool ────────────────────────────────────────────────
exports.PoolConfigSchema = zod_1.z.object({
    min: zod_1.z.number().int().nonnegative().default(2),
    max: zod_1.z.number().int().positive().default(10),
    acquireTimeoutMs: zod_1.z.number().int().positive().default(30000),
    idleTimeoutMs: zod_1.z.number().int().positive().default(60000),
    maxWaitingClients: zod_1.z.number().int().positive().default(100),
});
//# sourceMappingURL=types.js.map