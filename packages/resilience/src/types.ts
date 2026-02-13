import { z } from 'zod';

// ── Circuit Breaker ────────────────────────────────────────────────

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export const CircuitBreakerConfigSchema = z.object({
  failureThreshold: z.number().int().positive().default(5),
  resetTimeoutMs: z.number().int().positive().default(30000),
  halfOpenMaxRequests: z.number().int().positive().default(1),
  monitorWindowMs: z.number().int().positive().default(60000),
  onStateChange: z
    .function()
    .args(
      z.nativeEnum(CircuitBreakerState),
      z.nativeEnum(CircuitBreakerState),
    )
    .returns(z.void())
    .optional(),
});

export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>;

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  totalRequests: number;
}

// ── Retry / Backoff ────────────────────────────────────────────────

export const RetryConfigSchema = z.object({
  maxRetries: z.number().int().nonnegative().default(3),
  baseDelayMs: z.number().int().positive().default(1000),
  maxDelayMs: z.number().int().positive().default(30000),
  backoffMultiplier: z.number().positive().default(2),
  jitterFactor: z.number().min(0).max(1).default(0.1),
  retryableErrors: z
    .function()
    .args(z.unknown())
    .returns(z.boolean())
    .optional(),
});

export type RetryConfig = z.infer<typeof RetryConfigSchema>;

// ── Dead Letter Queue ──────────────────────────────────────────────

export const DeadLetterEntrySchema = z.object({
  id: z.string(),
  originalQueue: z.string(),
  payload: z.unknown(),
  error: z.object({
    message: z.string(),
    stack: z.string().optional(),
  }),
  attempts: z.number().int().nonnegative(),
  firstFailedAt: z.date(),
  lastFailedAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

export type DeadLetterEntry = z.infer<typeof DeadLetterEntrySchema>;

// ── Service Degradation ────────────────────────────────────────────

export enum DegradationLevel {
  NORMAL = 'normal',
  DEGRADED = 'degraded',
  MINIMAL = 'minimal',
  OFFLINE = 'offline',
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

export const DegradationConfigSchema = z.object({
  service: z.string(),
  levels: z.array(z.custom<DegradationRule>()),
  healthCheckIntervalMs: z.number().int().positive().default(30000),
  healthCheckFn: z.function().args().returns(z.promise(z.boolean())),
});

export type DegradationConfig = z.infer<typeof DegradationConfigSchema>;

// ── Connection Pool ────────────────────────────────────────────────

export const PoolConfigSchema = z.object({
  min: z.number().int().nonnegative().default(2),
  max: z.number().int().positive().default(10),
  acquireTimeoutMs: z.number().int().positive().default(30000),
  idleTimeoutMs: z.number().int().positive().default(60000),
  maxWaitingClients: z.number().int().positive().default(100),
});

export type PoolConfig = z.infer<typeof PoolConfigSchema>;

export interface PoolFactory<T> {
  create: () => Promise<T>;
  destroy: (conn: T) => Promise<void>;
  validate?: (conn: T) => Promise<boolean>;
}

// ── Health Status ──────────────────────────────────────────────────

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  lastCheck: Date;
  details?: Record<string, unknown>;
}
