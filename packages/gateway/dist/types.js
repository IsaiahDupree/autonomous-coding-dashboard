"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceDefinitionSchema = exports.AuditActionSchema = exports.GatewayConfigSchema = exports.ApiVersionSchema = exports.RequestLogSchema = exports.ApiKeyRecordSchema = exports.RateLimitInfoSchema = exports.RateLimitConfigSchema = void 0;
const zod_1 = require("zod");
// ─── Rate Limit Config ───────────────────────────────────────────────────────
exports.RateLimitConfigSchema = zod_1.z.object({
    windowMs: zod_1.z.number().positive(),
    maxRequests: zod_1.z.number().positive(),
    keyPrefix: zod_1.z.string().optional(),
    skipFailedRequests: zod_1.z.boolean().optional(),
    skipSuccessfulRequests: zod_1.z.boolean().optional(),
});
// ─── Rate Limit Info ─────────────────────────────────────────────────────────
exports.RateLimitInfoSchema = zod_1.z.object({
    limit: zod_1.z.number(),
    remaining: zod_1.z.number(),
    resetAt: zod_1.z.date(),
});
// ─── API Key Record ──────────────────────────────────────────────────────────
exports.ApiKeyRecordSchema = zod_1.z.object({
    id: zod_1.z.string(),
    key: zod_1.z.string(), // hashed
    name: zod_1.z.string(),
    ownerId: zod_1.z.string(),
    orgId: zod_1.z.string(),
    scopes: zod_1.z.array(zod_1.z.string()),
    rateLimit: zod_1.z.object({
        windowMs: zod_1.z.number().positive(),
        maxRequests: zod_1.z.number().positive(),
    }),
    product: zod_1.z.string().nullable(),
    createdAt: zod_1.z.date(),
    expiresAt: zod_1.z.date().nullable(),
    lastUsedAt: zod_1.z.date().nullable(),
    isActive: zod_1.z.boolean(),
});
// ─── Request Log ─────────────────────────────────────────────────────────────
exports.RequestLogSchema = zod_1.z.object({
    id: zod_1.z.string(),
    timestamp: zod_1.z.date(),
    method: zod_1.z.string(),
    path: zod_1.z.string(),
    statusCode: zod_1.z.number(),
    responseTimeMs: zod_1.z.number(),
    apiKeyId: zod_1.z.string().optional(),
    userId: zod_1.z.string().optional(),
    orgId: zod_1.z.string().optional(),
    product: zod_1.z.string().optional(),
    ip: zod_1.z.string(),
    userAgent: zod_1.z.string(),
    requestHeaders: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
    responseSize: zod_1.z.number(),
    error: zod_1.z.string().optional(),
});
// ─── API Version ─────────────────────────────────────────────────────────────
exports.ApiVersionSchema = zod_1.z.object({
    version: zod_1.z.string().regex(/^v\d+$/, 'Version must be in format "v1", "v2", etc.'),
    deprecated: zod_1.z.boolean(),
    sunsetDate: zod_1.z.date().optional(),
    routes: zod_1.z.array(zod_1.z.string()),
});
// ─── Gateway Config ──────────────────────────────────────────────────────────
exports.GatewayConfigSchema = zod_1.z.object({
    apiKeys: zod_1.z.object({
        hashAlgorithm: zod_1.z.literal('sha256'),
        prefix: zod_1.z.string().default('acd_'),
    }),
    rateLimit: exports.RateLimitConfigSchema,
    logging: zod_1.z.object({
        enabled: zod_1.z.boolean(),
        includeHeaders: zod_1.z.boolean().optional(),
        excludePaths: zod_1.z.array(zod_1.z.string()).optional(),
        sensitiveHeaders: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    versioning: zod_1.z.object({
        current: zod_1.z.string(),
        supported: zod_1.z.array(exports.ApiVersionSchema),
        headerName: zod_1.z.string().default('X-API-Version'),
    }),
});
// ─── Audit Action ────────────────────────────────────────────────────────────
exports.AuditActionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    timestamp: zod_1.z.date(),
    actor: zod_1.z.string(),
    action: zod_1.z.string(),
    resource: zod_1.z.string(),
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
// ─── Service Definition (for GraphQL gateway) ────────────────────────────────
exports.ServiceDefinitionSchema = zod_1.z.object({
    name: zod_1.z.string(),
    url: zod_1.z.string().url(),
    sdl: zod_1.z.string(),
});
//# sourceMappingURL=types.js.map