import { z } from 'zod';
export declare enum CircuitBreakerState {
    CLOSED = "closed",
    OPEN = "open",
    HALF_OPEN = "half_open"
}
export declare const CircuitBreakerConfigSchema: z.ZodObject<{
    failureThreshold: z.ZodDefault<z.ZodNumber>;
    resetTimeoutMs: z.ZodDefault<z.ZodNumber>;
    halfOpenMaxRequests: z.ZodDefault<z.ZodNumber>;
    monitorWindowMs: z.ZodDefault<z.ZodNumber>;
    onStateChange: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodNativeEnum<typeof CircuitBreakerState>, z.ZodNativeEnum<typeof CircuitBreakerState>], z.ZodUnknown>, z.ZodVoid>>;
}, "strip", z.ZodTypeAny, {
    failureThreshold: number;
    resetTimeoutMs: number;
    halfOpenMaxRequests: number;
    monitorWindowMs: number;
    onStateChange?: ((args_0: CircuitBreakerState, args_1: CircuitBreakerState, ...args: unknown[]) => void) | undefined;
}, {
    failureThreshold?: number | undefined;
    resetTimeoutMs?: number | undefined;
    halfOpenMaxRequests?: number | undefined;
    monitorWindowMs?: number | undefined;
    onStateChange?: ((args_0: CircuitBreakerState, args_1: CircuitBreakerState, ...args: unknown[]) => void) | undefined;
}>;
export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>;
export interface CircuitBreakerMetrics {
    state: CircuitBreakerState;
    failures: number;
    successes: number;
    lastFailure: Date | null;
    lastSuccess: Date | null;
    totalRequests: number;
}
export declare const RetryConfigSchema: z.ZodObject<{
    maxRetries: z.ZodDefault<z.ZodNumber>;
    baseDelayMs: z.ZodDefault<z.ZodNumber>;
    maxDelayMs: z.ZodDefault<z.ZodNumber>;
    backoffMultiplier: z.ZodDefault<z.ZodNumber>;
    jitterFactor: z.ZodDefault<z.ZodNumber>;
    retryableErrors: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodUnknown], z.ZodUnknown>, z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    jitterFactor: number;
    retryableErrors?: ((args_0: unknown, ...args: unknown[]) => boolean) | undefined;
}, {
    maxRetries?: number | undefined;
    baseDelayMs?: number | undefined;
    maxDelayMs?: number | undefined;
    backoffMultiplier?: number | undefined;
    jitterFactor?: number | undefined;
    retryableErrors?: ((args_0: unknown, ...args: unknown[]) => boolean) | undefined;
}>;
export type RetryConfig = z.infer<typeof RetryConfigSchema>;
export declare const DeadLetterEntrySchema: z.ZodObject<{
    id: z.ZodString;
    originalQueue: z.ZodString;
    payload: z.ZodUnknown;
    error: z.ZodObject<{
        message: z.ZodString;
        stack: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        stack?: string | undefined;
    }, {
        message: string;
        stack?: string | undefined;
    }>;
    attempts: z.ZodNumber;
    firstFailedAt: z.ZodDate;
    lastFailedAt: z.ZodDate;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    originalQueue: string;
    error: {
        message: string;
        stack?: string | undefined;
    };
    attempts: number;
    firstFailedAt: Date;
    lastFailedAt: Date;
    payload?: unknown;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    originalQueue: string;
    error: {
        message: string;
        stack?: string | undefined;
    };
    attempts: number;
    firstFailedAt: Date;
    lastFailedAt: Date;
    payload?: unknown;
    metadata?: Record<string, unknown> | undefined;
}>;
export type DeadLetterEntry = z.infer<typeof DeadLetterEntrySchema>;
export declare enum DegradationLevel {
    NORMAL = "normal",
    DEGRADED = "degraded",
    MINIMAL = "minimal",
    OFFLINE = "offline"
}
export interface ServiceMetrics {
    errorRate: number;
    latencyMs: number;
    requestCount: number;
    [key: string]: unknown;
}
export interface DegradationRule {
    level: DegradationLevel;
    condition: (metrics: ServiceMetrics) => boolean;
    fallback?: () => unknown;
}
export declare const DegradationConfigSchema: z.ZodObject<{
    service: z.ZodString;
    levels: z.ZodArray<z.ZodType<DegradationRule, z.ZodTypeDef, DegradationRule>, "many">;
    healthCheckIntervalMs: z.ZodDefault<z.ZodNumber>;
    healthCheckFn: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodPromise<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    service: string;
    levels: DegradationRule[];
    healthCheckIntervalMs: number;
    healthCheckFn: (...args: unknown[]) => Promise<boolean>;
}, {
    service: string;
    levels: DegradationRule[];
    healthCheckFn: (...args: unknown[]) => Promise<boolean>;
    healthCheckIntervalMs?: number | undefined;
}>;
export type DegradationConfig = z.infer<typeof DegradationConfigSchema>;
export declare const PoolConfigSchema: z.ZodObject<{
    min: z.ZodDefault<z.ZodNumber>;
    max: z.ZodDefault<z.ZodNumber>;
    acquireTimeoutMs: z.ZodDefault<z.ZodNumber>;
    idleTimeoutMs: z.ZodDefault<z.ZodNumber>;
    maxWaitingClients: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    min: number;
    max: number;
    acquireTimeoutMs: number;
    idleTimeoutMs: number;
    maxWaitingClients: number;
}, {
    min?: number | undefined;
    max?: number | undefined;
    acquireTimeoutMs?: number | undefined;
    idleTimeoutMs?: number | undefined;
    maxWaitingClients?: number | undefined;
}>;
export type PoolConfig = z.infer<typeof PoolConfigSchema>;
export interface PoolFactory<T> {
    create: () => Promise<T>;
    destroy: (conn: T) => Promise<void>;
    validate?: (conn: T) => Promise<boolean>;
}
export interface HealthStatus {
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    latencyMs: number;
    lastCheck: Date;
    details?: Record<string, unknown>;
}
//# sourceMappingURL=types.d.ts.map