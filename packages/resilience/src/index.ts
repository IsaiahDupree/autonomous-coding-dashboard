// ── Types ──────────────────────────────────────────────────────────
export {
  CircuitBreakerState,
  CircuitBreakerConfigSchema,
  CircuitBreakerConfig,
  CircuitBreakerMetrics,
  RetryConfigSchema,
  RetryConfig,
  DeadLetterEntrySchema,
  DeadLetterEntry,
  DegradationLevel,
  DegradationConfigSchema,
  DegradationConfig,
  DegradationRule,
  ServiceMetrics,
  PoolConfigSchema,
  PoolConfig,
  PoolFactory,
  HealthStatus,
} from './types';

// ── Circuit Breaker (RES-001) ──────────────────────────────────────
export {
  CircuitBreaker,
  CircuitBreakerOpenError,
  CircuitBreakerRegistry,
} from './circuit-breaker';

// ── Retry / Backoff (RES-002) ──────────────────────────────────────
export {
  retry,
  retryWithCircuitBreaker,
  createMetaRetryConfig,
  createRemotionRetryConfig,
  RetryableError,
} from './retry';

// ── Dead Letter Queue (RES-003) ────────────────────────────────────
export {
  DeadLetterQueue,
  DeadLetterQueueOptions,
  DeadLetterStats,
} from './dead-letter';

// ── Service Degradation (RES-004) ──────────────────────────────────
export {
  ServiceDegradationManager,
  DegradationMetrics,
  AIServiceDegradation,
  AIServiceDegradationConfig,
  AIFallbackChain,
} from './degradation';

// ── Connection Pool (RES-005) ──────────────────────────────────────
export {
  ConnectionPool,
  PoolStats,
  withConnection,
} from './pool';

// ── Health Checking ────────────────────────────────────────────────
export {
  HealthChecker,
  httpHealthCheck,
  tcpHealthCheck,
  dnsHealthCheck,
} from './health';
