import { z } from 'zod';

// ─── Rate Limit Config ───────────────────────────────────────────────────────

export const RateLimitConfigSchema = z.object({
  windowMs: z.number().positive(),
  maxRequests: z.number().positive(),
  keyPrefix: z.string().optional(),
  skipFailedRequests: z.boolean().optional(),
  skipSuccessfulRequests: z.boolean().optional(),
});

export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;

// ─── Rate Limit Info ─────────────────────────────────────────────────────────

export const RateLimitInfoSchema = z.object({
  limit: z.number(),
  remaining: z.number(),
  resetAt: z.date(),
});

export type RateLimitInfo = z.infer<typeof RateLimitInfoSchema>;

// ─── API Key Record ──────────────────────────────────────────────────────────

export const ApiKeyRecordSchema = z.object({
  id: z.string(),
  key: z.string(), // hashed
  name: z.string(),
  ownerId: z.string(),
  orgId: z.string(),
  scopes: z.array(z.string()),
  rateLimit: z.object({
    windowMs: z.number().positive(),
    maxRequests: z.number().positive(),
  }),
  product: z.string().nullable(),
  createdAt: z.date(),
  expiresAt: z.date().nullable(),
  lastUsedAt: z.date().nullable(),
  isActive: z.boolean(),
});

export type ApiKeyRecord = z.infer<typeof ApiKeyRecordSchema>;

// ─── Request Log ─────────────────────────────────────────────────────────────

export const RequestLogSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  method: z.string(),
  path: z.string(),
  statusCode: z.number(),
  responseTimeMs: z.number(),
  apiKeyId: z.string().optional(),
  userId: z.string().optional(),
  orgId: z.string().optional(),
  product: z.string().optional(),
  ip: z.string(),
  userAgent: z.string(),
  requestHeaders: z.record(z.string(), z.string()),
  responseSize: z.number(),
  error: z.string().optional(),
});

export type RequestLog = z.infer<typeof RequestLogSchema>;

// ─── API Version ─────────────────────────────────────────────────────────────

export const ApiVersionSchema = z.object({
  version: z.string().regex(/^v\d+$/, 'Version must be in format "v1", "v2", etc.'),
  deprecated: z.boolean(),
  sunsetDate: z.date().optional(),
  routes: z.array(z.string()),
});

export type ApiVersion = z.infer<typeof ApiVersionSchema>;

// ─── Gateway Config ──────────────────────────────────────────────────────────

export const GatewayConfigSchema = z.object({
  apiKeys: z.object({
    hashAlgorithm: z.literal('sha256'),
    prefix: z.string().default('acd_'),
  }),
  rateLimit: RateLimitConfigSchema,
  logging: z.object({
    enabled: z.boolean(),
    includeHeaders: z.boolean().optional(),
    excludePaths: z.array(z.string()).optional(),
    sensitiveHeaders: z.array(z.string()).optional(),
  }),
  versioning: z.object({
    current: z.string(),
    supported: z.array(ApiVersionSchema),
    headerName: z.string().default('X-API-Version'),
  }),
});

export type GatewayConfig = z.infer<typeof GatewayConfigSchema>;

// ─── Audit Action ────────────────────────────────────────────────────────────

export const AuditActionSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  actor: z.string(),
  action: z.string(),
  resource: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type AuditAction = z.infer<typeof AuditActionSchema>;

// ─── Service Definition (for GraphQL gateway) ────────────────────────────────

export const ServiceDefinitionSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  sdl: z.string(),
});

export type ServiceDefinition = z.infer<typeof ServiceDefinitionSchema>;
