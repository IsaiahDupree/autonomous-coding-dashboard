import { z } from "zod";
import { ProductIdSchema } from "./product";

// ---------------------------------------------------------------------------
// API Key
// ---------------------------------------------------------------------------

/**
 * API key type / scope.
 */
export const ApiKeyTypeSchema = z.enum([
  "publishable",
  "secret",
  "restricted",
  "service",
  "webhook",
]);
export type ApiKeyType = z.infer<typeof ApiKeyTypeSchema>;

/**
 * API key status.
 */
export const ApiKeyStatusSchema = z.enum([
  "active",
  "revoked",
  "expired",
  "suspended",
]);
export type ApiKeyStatus = z.infer<typeof ApiKeyStatusSchema>;

/**
 * Permission scope for restricted API keys.
 */
export const ApiPermissionSchema = z.object({
  resource: z.string().min(1).max(128),
  actions: z.array(z.enum(["create", "read", "update", "delete", "list", "execute"])),
});
export type ApiPermission = z.infer<typeof ApiPermissionSchema>;

/**
 * ApiKey - Represents an API key for authenticating with ACD services.
 */
export const ApiKeySchema = z.object({
  /** Unique API key identifier (UUID v4). */
  id: z.string().uuid(),

  /** The user who owns this key. */
  userId: z.string().uuid(),

  /** The product this key provides access to. */
  productId: ProductIdSchema.optional(),

  /** Organization ID (for team/org keys). */
  orgId: z.string().uuid().optional(),

  /** Human-readable label for the key. */
  name: z.string().min(1).max(256),

  /** Key type / scope. */
  type: ApiKeyTypeSchema,

  /** Current key status. */
  status: ApiKeyStatusSchema.default("active"),

  /** The key prefix for identification (e.g., "pk_live_", "sk_test_"). */
  keyPrefix: z.string().min(1).max(32),

  /** Hashed version of the key (never store raw keys). */
  keyHash: z.string().min(1),

  /** Last 4 characters of the key for display. */
  keyLast4: z.string().length(4),

  /** Allowed permissions (for restricted keys). */
  permissions: z.array(ApiPermissionSchema).optional(),

  /** Allowed IP addresses (CIDR notation). */
  allowedIps: z.array(z.string()).optional(),

  /** Allowed HTTP referrers (for publishable keys). */
  allowedReferrers: z.array(z.string()).optional(),

  /** Rate limit override for this key. */
  rateLimitOverride: z.number().int().positive().optional(),

  /** Environment (live vs test). */
  environment: z.enum(["live", "test"]).default("live"),

  /** ISO 8601 timestamp of expiry (null = no expiry). */
  expiresAt: z.string().datetime().nullable().optional(),

  /** ISO 8601 timestamp of last usage. */
  lastUsedAt: z.string().datetime().optional(),

  /** Total number of requests made with this key. */
  totalRequests: z.number().int().nonnegative().default(0),

  /** ISO 8601 timestamp of creation. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last update. */
  updatedAt: z.string().datetime(),

  /** ISO 8601 timestamp of revocation. */
  revokedAt: z.string().datetime().optional(),
});

export type ApiKey = z.infer<typeof ApiKeySchema>;

// ---------------------------------------------------------------------------
// Rate Limit Config
// ---------------------------------------------------------------------------

/**
 * Rate limiting algorithm.
 */
export const RateLimitAlgorithmSchema = z.enum([
  "fixed_window",
  "sliding_window",
  "token_bucket",
  "leaky_bucket",
]);
export type RateLimitAlgorithm = z.infer<typeof RateLimitAlgorithmSchema>;

/**
 * RateLimitConfig - Configuration for API rate limiting.
 */
export const RateLimitConfigSchema = z.object({
  /** Unique config identifier (UUID v4). */
  id: z.string().uuid(),

  /** Human-readable name. */
  name: z.string().min(1).max(256),

  /** Description of this rate limit policy. */
  description: z.string().max(1024).optional(),

  /** The product this rate limit applies to. */
  productId: ProductIdSchema.optional(),

  /** Rate limiting algorithm. */
  algorithm: RateLimitAlgorithmSchema.default("sliding_window"),

  /** Maximum number of requests allowed in the window. */
  maxRequests: z.number().int().positive(),

  /** Window duration in seconds. */
  windowSeconds: z.number().int().positive(),

  /** Burst capacity (for token bucket). */
  burstCapacity: z.number().int().positive().optional(),

  /** Refill rate per second (for token bucket). */
  refillRate: z.number().positive().optional(),

  /** Rate limit key strategy (what to limit by). */
  keyStrategy: z.enum(["ip", "user_id", "api_key", "endpoint", "custom"]).default("api_key"),

  /** Specific endpoints this config applies to (empty = all). */
  endpoints: z.array(z.string()).default([]),

  /** HTTP methods this limit applies to. */
  methods: z
    .array(z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]))
    .optional(),

  /** Whether to include rate limit headers in responses. */
  includeHeaders: z.boolean().default(true),

  /** Custom response status code when rate limited. */
  statusCode: z.number().int().default(429),

  /** Custom retry-after header value in seconds. */
  retryAfterSeconds: z.number().int().positive().optional(),

  /** Whether this config is enabled. */
  enabled: z.boolean().default(true),

  /** ISO 8601 timestamp of creation. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last update. */
  updatedAt: z.string().datetime(),
});

export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;

// ---------------------------------------------------------------------------
// API Response
// ---------------------------------------------------------------------------

/**
 * Standard pagination metadata.
 */
export const PaginationMetaSchema = z.object({
  /** Current page number (1-based). */
  page: z.number().int().positive(),

  /** Items per page. */
  perPage: z.number().int().positive(),

  /** Total number of items. */
  total: z.number().int().nonnegative(),

  /** Total number of pages. */
  totalPages: z.number().int().nonnegative(),

  /** Whether there is a next page. */
  hasNext: z.boolean(),

  /** Whether there is a previous page. */
  hasPrev: z.boolean(),

  /** Cursor for next page (for cursor-based pagination). */
  nextCursor: z.string().optional(),

  /** Cursor for previous page. */
  prevCursor: z.string().optional(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/**
 * Standard API error detail.
 */
export const ApiErrorDetailSchema = z.object({
  /** Machine-readable error code. */
  code: z.string().min(1).max(128),

  /** Human-readable error message. */
  message: z.string().min(1).max(2048),

  /** The field that caused the error (for validation errors). */
  field: z.string().optional(),

  /** Additional error context. */
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

/**
 * ApiResponse - Standard envelope for all API responses across ACD products.
 * Generic over the data payload type.
 */
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    /** Whether the request was successful. */
    success: z.boolean(),

    /** The response data payload. */
    data: dataSchema.optional(),

    /** Error information (present when success=false). */
    error: ApiErrorDetailSchema.optional(),

    /** Array of validation errors. */
    errors: z.array(ApiErrorDetailSchema).optional(),

    /** Pagination metadata (for list endpoints). */
    pagination: PaginationMetaSchema.optional(),

    /** Request metadata. */
    meta: z
      .object({
        /** Unique request ID for tracing. */
        requestId: z.string().uuid(),

        /** API version. */
        apiVersion: z.string().optional(),

        /** Response time in milliseconds. */
        responseTimeMs: z.number().nonnegative().optional(),

        /** Rate limit information. */
        rateLimit: z
          .object({
            limit: z.number().int().positive(),
            remaining: z.number().int().nonnegative(),
            resetAt: z.string().datetime(),
          })
          .optional(),
      })
      .optional(),
  });

/**
 * Convenience: success response type.
 */
export const ApiSuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  ApiResponseSchema(dataSchema).extend({
    success: z.literal(true),
  });

/**
 * Convenience: error response type.
 */
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: ApiErrorDetailSchema,
  errors: z.array(ApiErrorDetailSchema).optional(),
  meta: z
    .object({
      requestId: z.string().uuid(),
      apiVersion: z.string().optional(),
      responseTimeMs: z.number().nonnegative().optional(),
    })
    .optional(),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

/**
 * Helper type: infer a successful API response with a given data shape.
 */
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiErrorDetail;
  errors?: ApiErrorDetail[];
  pagination?: PaginationMeta;
  meta?: {
    requestId: string;
    apiVersion?: string;
    responseTimeMs?: number;
    rateLimit?: {
      limit: number;
      remaining: number;
      resetAt: string;
    };
  };
};
