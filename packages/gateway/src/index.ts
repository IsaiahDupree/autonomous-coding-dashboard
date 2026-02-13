// ─── @acd/gateway ────────────────────────────────────────────────────────────
// API Gateway package for the Autonomous Coding Dashboard
// Features: GW-001 through GW-005

// Types and Zod schemas
export {
  type ApiKeyRecord,
  type RateLimitConfig,
  type RateLimitInfo,
  type RequestLog,
  type ApiVersion,
  type GatewayConfig,
  type AuditAction,
  type ServiceDefinition,
  ApiKeyRecordSchema,
  RateLimitConfigSchema,
  RateLimitInfoSchema,
  RequestLogSchema,
  ApiVersionSchema,
  GatewayConfigSchema,
  AuditActionSchema,
  ServiceDefinitionSchema,
} from './types';

// GW-001: API Key Management
export {
  ApiKeyManager,
  InMemoryKeyStore,
  type KeyStore,
  type ApiKeyManagerOptions,
} from './api-keys';

// GW-002: Per-Consumer Rate Limiting
export {
  GatewayRateLimiter,
  InMemoryRateLimitStore,
  type RateLimitStore,
} from './rate-limiter';

// GW-003: Request Logging / Audit
export {
  RequestLogger,
  AuditTrail,
  type RequestLoggerOptions,
  type LoggableRequest,
  type LoggableResponse,
} from './logger';

// GW-004: API Versioning
export {
  ApiVersionManager,
  type VersionManagerConfig,
  type VersionableRequest,
  type VersionParseResult,
} from './versioning';

// GW-005: GraphQL Gateway
export {
  GraphQLGateway,
  type GraphQLGatewayOptions,
  type QueryPlan,
  type QueryOperation,
  type ExecutionResult,
  type GraphQLError,
  type ExecutionContext,
} from './graphql';

// Express Middleware
export {
  createGatewayMiddleware,
  apiKeyMiddleware,
  rateLimitMiddleware,
  loggingMiddleware,
  versionMiddleware,
  type Middleware,
  type MiddlewareRequest,
  type MiddlewareResponse,
  type NextFunction,
} from './middleware';
