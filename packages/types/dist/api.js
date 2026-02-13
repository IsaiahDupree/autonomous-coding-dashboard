"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiErrorResponseSchema = exports.ApiSuccessResponseSchema = exports.ApiResponseSchema = exports.ApiErrorDetailSchema = exports.PaginationMetaSchema = exports.RateLimitConfigSchema = exports.RateLimitAlgorithmSchema = exports.ApiKeySchema = exports.ApiPermissionSchema = exports.ApiKeyStatusSchema = exports.ApiKeyTypeSchema = void 0;
const zod_1 = require("zod");
const product_1 = require("./product");
// ---------------------------------------------------------------------------
// API Key
// ---------------------------------------------------------------------------
/**
 * API key type / scope.
 */
exports.ApiKeyTypeSchema = zod_1.z.enum([
    "publishable",
    "secret",
    "restricted",
    "service",
    "webhook",
]);
/**
 * API key status.
 */
exports.ApiKeyStatusSchema = zod_1.z.enum([
    "active",
    "revoked",
    "expired",
    "suspended",
]);
/**
 * Permission scope for restricted API keys.
 */
exports.ApiPermissionSchema = zod_1.z.object({
    resource: zod_1.z.string().min(1).max(128),
    actions: zod_1.z.array(zod_1.z.enum(["create", "read", "update", "delete", "list", "execute"])),
});
/**
 * ApiKey - Represents an API key for authenticating with ACD services.
 */
exports.ApiKeySchema = zod_1.z.object({
    /** Unique API key identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** The user who owns this key. */
    userId: zod_1.z.string().uuid(),
    /** The product this key provides access to. */
    productId: product_1.ProductIdSchema.optional(),
    /** Organization ID (for team/org keys). */
    orgId: zod_1.z.string().uuid().optional(),
    /** Human-readable label for the key. */
    name: zod_1.z.string().min(1).max(256),
    /** Key type / scope. */
    type: exports.ApiKeyTypeSchema,
    /** Current key status. */
    status: exports.ApiKeyStatusSchema.default("active"),
    /** The key prefix for identification (e.g., "pk_live_", "sk_test_"). */
    keyPrefix: zod_1.z.string().min(1).max(32),
    /** Hashed version of the key (never store raw keys). */
    keyHash: zod_1.z.string().min(1),
    /** Last 4 characters of the key for display. */
    keyLast4: zod_1.z.string().length(4),
    /** Allowed permissions (for restricted keys). */
    permissions: zod_1.z.array(exports.ApiPermissionSchema).optional(),
    /** Allowed IP addresses (CIDR notation). */
    allowedIps: zod_1.z.array(zod_1.z.string()).optional(),
    /** Allowed HTTP referrers (for publishable keys). */
    allowedReferrers: zod_1.z.array(zod_1.z.string()).optional(),
    /** Rate limit override for this key. */
    rateLimitOverride: zod_1.z.number().int().positive().optional(),
    /** Environment (live vs test). */
    environment: zod_1.z.enum(["live", "test"]).default("live"),
    /** ISO 8601 timestamp of expiry (null = no expiry). */
    expiresAt: zod_1.z.string().datetime().nullable().optional(),
    /** ISO 8601 timestamp of last usage. */
    lastUsedAt: zod_1.z.string().datetime().optional(),
    /** Total number of requests made with this key. */
    totalRequests: zod_1.z.number().int().nonnegative().default(0),
    /** ISO 8601 timestamp of creation. */
    createdAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last update. */
    updatedAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of revocation. */
    revokedAt: zod_1.z.string().datetime().optional(),
});
// ---------------------------------------------------------------------------
// Rate Limit Config
// ---------------------------------------------------------------------------
/**
 * Rate limiting algorithm.
 */
exports.RateLimitAlgorithmSchema = zod_1.z.enum([
    "fixed_window",
    "sliding_window",
    "token_bucket",
    "leaky_bucket",
]);
/**
 * RateLimitConfig - Configuration for API rate limiting.
 */
exports.RateLimitConfigSchema = zod_1.z.object({
    /** Unique config identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** Human-readable name. */
    name: zod_1.z.string().min(1).max(256),
    /** Description of this rate limit policy. */
    description: zod_1.z.string().max(1024).optional(),
    /** The product this rate limit applies to. */
    productId: product_1.ProductIdSchema.optional(),
    /** Rate limiting algorithm. */
    algorithm: exports.RateLimitAlgorithmSchema.default("sliding_window"),
    /** Maximum number of requests allowed in the window. */
    maxRequests: zod_1.z.number().int().positive(),
    /** Window duration in seconds. */
    windowSeconds: zod_1.z.number().int().positive(),
    /** Burst capacity (for token bucket). */
    burstCapacity: zod_1.z.number().int().positive().optional(),
    /** Refill rate per second (for token bucket). */
    refillRate: zod_1.z.number().positive().optional(),
    /** Rate limit key strategy (what to limit by). */
    keyStrategy: zod_1.z.enum(["ip", "user_id", "api_key", "endpoint", "custom"]).default("api_key"),
    /** Specific endpoints this config applies to (empty = all). */
    endpoints: zod_1.z.array(zod_1.z.string()).default([]),
    /** HTTP methods this limit applies to. */
    methods: zod_1.z
        .array(zod_1.z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]))
        .optional(),
    /** Whether to include rate limit headers in responses. */
    includeHeaders: zod_1.z.boolean().default(true),
    /** Custom response status code when rate limited. */
    statusCode: zod_1.z.number().int().default(429),
    /** Custom retry-after header value in seconds. */
    retryAfterSeconds: zod_1.z.number().int().positive().optional(),
    /** Whether this config is enabled. */
    enabled: zod_1.z.boolean().default(true),
    /** ISO 8601 timestamp of creation. */
    createdAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last update. */
    updatedAt: zod_1.z.string().datetime(),
});
// ---------------------------------------------------------------------------
// API Response
// ---------------------------------------------------------------------------
/**
 * Standard pagination metadata.
 */
exports.PaginationMetaSchema = zod_1.z.object({
    /** Current page number (1-based). */
    page: zod_1.z.number().int().positive(),
    /** Items per page. */
    perPage: zod_1.z.number().int().positive(),
    /** Total number of items. */
    total: zod_1.z.number().int().nonnegative(),
    /** Total number of pages. */
    totalPages: zod_1.z.number().int().nonnegative(),
    /** Whether there is a next page. */
    hasNext: zod_1.z.boolean(),
    /** Whether there is a previous page. */
    hasPrev: zod_1.z.boolean(),
    /** Cursor for next page (for cursor-based pagination). */
    nextCursor: zod_1.z.string().optional(),
    /** Cursor for previous page. */
    prevCursor: zod_1.z.string().optional(),
});
/**
 * Standard API error detail.
 */
exports.ApiErrorDetailSchema = zod_1.z.object({
    /** Machine-readable error code. */
    code: zod_1.z.string().min(1).max(128),
    /** Human-readable error message. */
    message: zod_1.z.string().min(1).max(2048),
    /** The field that caused the error (for validation errors). */
    field: zod_1.z.string().optional(),
    /** Additional error context. */
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
/**
 * ApiResponse - Standard envelope for all API responses across ACD products.
 * Generic over the data payload type.
 */
const ApiResponseSchema = (dataSchema) => zod_1.z.object({
    /** Whether the request was successful. */
    success: zod_1.z.boolean(),
    /** The response data payload. */
    data: dataSchema.optional(),
    /** Error information (present when success=false). */
    error: exports.ApiErrorDetailSchema.optional(),
    /** Array of validation errors. */
    errors: zod_1.z.array(exports.ApiErrorDetailSchema).optional(),
    /** Pagination metadata (for list endpoints). */
    pagination: exports.PaginationMetaSchema.optional(),
    /** Request metadata. */
    meta: zod_1.z
        .object({
        /** Unique request ID for tracing. */
        requestId: zod_1.z.string().uuid(),
        /** API version. */
        apiVersion: zod_1.z.string().optional(),
        /** Response time in milliseconds. */
        responseTimeMs: zod_1.z.number().nonnegative().optional(),
        /** Rate limit information. */
        rateLimit: zod_1.z
            .object({
            limit: zod_1.z.number().int().positive(),
            remaining: zod_1.z.number().int().nonnegative(),
            resetAt: zod_1.z.string().datetime(),
        })
            .optional(),
    })
        .optional(),
});
exports.ApiResponseSchema = ApiResponseSchema;
/**
 * Convenience: success response type.
 */
const ApiSuccessResponseSchema = (dataSchema) => (0, exports.ApiResponseSchema)(dataSchema).extend({
    success: zod_1.z.literal(true),
});
exports.ApiSuccessResponseSchema = ApiSuccessResponseSchema;
/**
 * Convenience: error response type.
 */
exports.ApiErrorResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(false),
    error: exports.ApiErrorDetailSchema,
    errors: zod_1.z.array(exports.ApiErrorDetailSchema).optional(),
    meta: zod_1.z
        .object({
        requestId: zod_1.z.string().uuid(),
        apiVersion: zod_1.z.string().optional(),
        responseTimeMs: zod_1.z.number().nonnegative().optional(),
    })
        .optional(),
});
//# sourceMappingURL=api.js.map