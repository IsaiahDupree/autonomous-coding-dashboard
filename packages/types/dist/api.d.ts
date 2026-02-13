import { z } from "zod";
/**
 * API key type / scope.
 */
export declare const ApiKeyTypeSchema: z.ZodEnum<["publishable", "secret", "restricted", "service", "webhook"]>;
export type ApiKeyType = z.infer<typeof ApiKeyTypeSchema>;
/**
 * API key status.
 */
export declare const ApiKeyStatusSchema: z.ZodEnum<["active", "revoked", "expired", "suspended"]>;
export type ApiKeyStatus = z.infer<typeof ApiKeyStatusSchema>;
/**
 * Permission scope for restricted API keys.
 */
export declare const ApiPermissionSchema: z.ZodObject<{
    resource: z.ZodString;
    actions: z.ZodArray<z.ZodEnum<["create", "read", "update", "delete", "list", "execute"]>, "many">;
}, "strip", z.ZodTypeAny, {
    resource: string;
    actions: ("create" | "read" | "update" | "delete" | "list" | "execute")[];
}, {
    resource: string;
    actions: ("create" | "read" | "update" | "delete" | "list" | "execute")[];
}>;
export type ApiPermission = z.infer<typeof ApiPermissionSchema>;
/**
 * ApiKey - Represents an API key for authenticating with ACD services.
 */
export declare const ApiKeySchema: z.ZodObject<{
    /** Unique API key identifier (UUID v4). */
    id: z.ZodString;
    /** The user who owns this key. */
    userId: z.ZodString;
    /** The product this key provides access to. */
    productId: z.ZodOptional<z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>>;
    /** Organization ID (for team/org keys). */
    orgId: z.ZodOptional<z.ZodString>;
    /** Human-readable label for the key. */
    name: z.ZodString;
    /** Key type / scope. */
    type: z.ZodEnum<["publishable", "secret", "restricted", "service", "webhook"]>;
    /** Current key status. */
    status: z.ZodDefault<z.ZodEnum<["active", "revoked", "expired", "suspended"]>>;
    /** The key prefix for identification (e.g., "pk_live_", "sk_test_"). */
    keyPrefix: z.ZodString;
    /** Hashed version of the key (never store raw keys). */
    keyHash: z.ZodString;
    /** Last 4 characters of the key for display. */
    keyLast4: z.ZodString;
    /** Allowed permissions (for restricted keys). */
    permissions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        resource: z.ZodString;
        actions: z.ZodArray<z.ZodEnum<["create", "read", "update", "delete", "list", "execute"]>, "many">;
    }, "strip", z.ZodTypeAny, {
        resource: string;
        actions: ("create" | "read" | "update" | "delete" | "list" | "execute")[];
    }, {
        resource: string;
        actions: ("create" | "read" | "update" | "delete" | "list" | "execute")[];
    }>, "many">>;
    /** Allowed IP addresses (CIDR notation). */
    allowedIps: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Allowed HTTP referrers (for publishable keys). */
    allowedReferrers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Rate limit override for this key. */
    rateLimitOverride: z.ZodOptional<z.ZodNumber>;
    /** Environment (live vs test). */
    environment: z.ZodDefault<z.ZodEnum<["live", "test"]>>;
    /** ISO 8601 timestamp of expiry (null = no expiry). */
    expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** ISO 8601 timestamp of last usage. */
    lastUsedAt: z.ZodOptional<z.ZodString>;
    /** Total number of requests made with this key. */
    totalRequests: z.ZodDefault<z.ZodNumber>;
    /** ISO 8601 timestamp of creation. */
    createdAt: z.ZodString;
    /** ISO 8601 timestamp of last update. */
    updatedAt: z.ZodString;
    /** ISO 8601 timestamp of revocation. */
    revokedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "publishable" | "secret" | "restricted" | "service" | "webhook";
    status: "active" | "revoked" | "expired" | "suspended";
    id: string;
    userId: string;
    name: string;
    keyPrefix: string;
    keyHash: string;
    keyLast4: string;
    environment: "live" | "test";
    totalRequests: number;
    createdAt: string;
    updatedAt: string;
    productId?: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach" | undefined;
    orgId?: string | undefined;
    permissions?: {
        resource: string;
        actions: ("create" | "read" | "update" | "delete" | "list" | "execute")[];
    }[] | undefined;
    allowedIps?: string[] | undefined;
    allowedReferrers?: string[] | undefined;
    rateLimitOverride?: number | undefined;
    expiresAt?: string | null | undefined;
    lastUsedAt?: string | undefined;
    revokedAt?: string | undefined;
}, {
    type: "publishable" | "secret" | "restricted" | "service" | "webhook";
    id: string;
    userId: string;
    name: string;
    keyPrefix: string;
    keyHash: string;
    keyLast4: string;
    createdAt: string;
    updatedAt: string;
    status?: "active" | "revoked" | "expired" | "suspended" | undefined;
    productId?: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach" | undefined;
    orgId?: string | undefined;
    permissions?: {
        resource: string;
        actions: ("create" | "read" | "update" | "delete" | "list" | "execute")[];
    }[] | undefined;
    allowedIps?: string[] | undefined;
    allowedReferrers?: string[] | undefined;
    rateLimitOverride?: number | undefined;
    environment?: "live" | "test" | undefined;
    expiresAt?: string | null | undefined;
    lastUsedAt?: string | undefined;
    totalRequests?: number | undefined;
    revokedAt?: string | undefined;
}>;
export type ApiKey = z.infer<typeof ApiKeySchema>;
/**
 * Rate limiting algorithm.
 */
export declare const RateLimitAlgorithmSchema: z.ZodEnum<["fixed_window", "sliding_window", "token_bucket", "leaky_bucket"]>;
export type RateLimitAlgorithm = z.infer<typeof RateLimitAlgorithmSchema>;
/**
 * RateLimitConfig - Configuration for API rate limiting.
 */
export declare const RateLimitConfigSchema: z.ZodObject<{
    /** Unique config identifier (UUID v4). */
    id: z.ZodString;
    /** Human-readable name. */
    name: z.ZodString;
    /** Description of this rate limit policy. */
    description: z.ZodOptional<z.ZodString>;
    /** The product this rate limit applies to. */
    productId: z.ZodOptional<z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>>;
    /** Rate limiting algorithm. */
    algorithm: z.ZodDefault<z.ZodEnum<["fixed_window", "sliding_window", "token_bucket", "leaky_bucket"]>>;
    /** Maximum number of requests allowed in the window. */
    maxRequests: z.ZodNumber;
    /** Window duration in seconds. */
    windowSeconds: z.ZodNumber;
    /** Burst capacity (for token bucket). */
    burstCapacity: z.ZodOptional<z.ZodNumber>;
    /** Refill rate per second (for token bucket). */
    refillRate: z.ZodOptional<z.ZodNumber>;
    /** Rate limit key strategy (what to limit by). */
    keyStrategy: z.ZodDefault<z.ZodEnum<["ip", "user_id", "api_key", "endpoint", "custom"]>>;
    /** Specific endpoints this config applies to (empty = all). */
    endpoints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** HTTP methods this limit applies to. */
    methods: z.ZodOptional<z.ZodArray<z.ZodEnum<["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]>, "many">>;
    /** Whether to include rate limit headers in responses. */
    includeHeaders: z.ZodDefault<z.ZodBoolean>;
    /** Custom response status code when rate limited. */
    statusCode: z.ZodDefault<z.ZodNumber>;
    /** Custom retry-after header value in seconds. */
    retryAfterSeconds: z.ZodOptional<z.ZodNumber>;
    /** Whether this config is enabled. */
    enabled: z.ZodDefault<z.ZodBoolean>;
    /** ISO 8601 timestamp of creation. */
    createdAt: z.ZodString;
    /** ISO 8601 timestamp of last update. */
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    algorithm: "fixed_window" | "sliding_window" | "token_bucket" | "leaky_bucket";
    maxRequests: number;
    windowSeconds: number;
    keyStrategy: "custom" | "ip" | "user_id" | "api_key" | "endpoint";
    endpoints: string[];
    includeHeaders: boolean;
    statusCode: number;
    enabled: boolean;
    productId?: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach" | undefined;
    description?: string | undefined;
    burstCapacity?: number | undefined;
    refillRate?: number | undefined;
    methods?: ("GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS")[] | undefined;
    retryAfterSeconds?: number | undefined;
}, {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    maxRequests: number;
    windowSeconds: number;
    productId?: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach" | undefined;
    description?: string | undefined;
    algorithm?: "fixed_window" | "sliding_window" | "token_bucket" | "leaky_bucket" | undefined;
    burstCapacity?: number | undefined;
    refillRate?: number | undefined;
    keyStrategy?: "custom" | "ip" | "user_id" | "api_key" | "endpoint" | undefined;
    endpoints?: string[] | undefined;
    methods?: ("GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS")[] | undefined;
    includeHeaders?: boolean | undefined;
    statusCode?: number | undefined;
    retryAfterSeconds?: number | undefined;
    enabled?: boolean | undefined;
}>;
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
/**
 * Standard pagination metadata.
 */
export declare const PaginationMetaSchema: z.ZodObject<{
    /** Current page number (1-based). */
    page: z.ZodNumber;
    /** Items per page. */
    perPage: z.ZodNumber;
    /** Total number of items. */
    total: z.ZodNumber;
    /** Total number of pages. */
    totalPages: z.ZodNumber;
    /** Whether there is a next page. */
    hasNext: z.ZodBoolean;
    /** Whether there is a previous page. */
    hasPrev: z.ZodBoolean;
    /** Cursor for next page (for cursor-based pagination). */
    nextCursor: z.ZodOptional<z.ZodString>;
    /** Cursor for previous page. */
    prevCursor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string | undefined;
    prevCursor?: string | undefined;
}, {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string | undefined;
    prevCursor?: string | undefined;
}>;
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
/**
 * Standard API error detail.
 */
export declare const ApiErrorDetailSchema: z.ZodObject<{
    /** Machine-readable error code. */
    code: z.ZodString;
    /** Human-readable error message. */
    message: z.ZodString;
    /** The field that caused the error (for validation errors). */
    field: z.ZodOptional<z.ZodString>;
    /** Additional error context. */
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    code: string;
    message: string;
    field?: string | undefined;
    details?: Record<string, unknown> | undefined;
}, {
    code: string;
    message: string;
    field?: string | undefined;
    details?: Record<string, unknown> | undefined;
}>;
export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;
/**
 * ApiResponse - Standard envelope for all API responses across ACD products.
 * Generic over the data payload type.
 */
export declare const ApiResponseSchema: <T extends z.ZodType>(dataSchema: T) => z.ZodObject<{
    /** Whether the request was successful. */
    success: z.ZodBoolean;
    /** The response data payload. */
    data: z.ZodOptional<T>;
    /** Error information (present when success=false). */
    error: z.ZodOptional<z.ZodObject<{
        /** Machine-readable error code. */
        code: z.ZodString;
        /** Human-readable error message. */
        message: z.ZodString;
        /** The field that caused the error (for validation errors). */
        field: z.ZodOptional<z.ZodString>;
        /** Additional error context. */
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }>>;
    /** Array of validation errors. */
    errors: z.ZodOptional<z.ZodArray<z.ZodObject<{
        /** Machine-readable error code. */
        code: z.ZodString;
        /** Human-readable error message. */
        message: z.ZodString;
        /** The field that caused the error (for validation errors). */
        field: z.ZodOptional<z.ZodString>;
        /** Additional error context. */
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }>, "many">>;
    /** Pagination metadata (for list endpoints). */
    pagination: z.ZodOptional<z.ZodObject<{
        /** Current page number (1-based). */
        page: z.ZodNumber;
        /** Items per page. */
        perPage: z.ZodNumber;
        /** Total number of items. */
        total: z.ZodNumber;
        /** Total number of pages. */
        totalPages: z.ZodNumber;
        /** Whether there is a next page. */
        hasNext: z.ZodBoolean;
        /** Whether there is a previous page. */
        hasPrev: z.ZodBoolean;
        /** Cursor for next page (for cursor-based pagination). */
        nextCursor: z.ZodOptional<z.ZodString>;
        /** Cursor for previous page. */
        prevCursor: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
        nextCursor?: string | undefined;
        prevCursor?: string | undefined;
    }, {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
        nextCursor?: string | undefined;
        prevCursor?: string | undefined;
    }>>;
    /** Request metadata. */
    meta: z.ZodOptional<z.ZodObject<{
        /** Unique request ID for tracing. */
        requestId: z.ZodString;
        /** API version. */
        apiVersion: z.ZodOptional<z.ZodString>;
        /** Response time in milliseconds. */
        responseTimeMs: z.ZodOptional<z.ZodNumber>;
        /** Rate limit information. */
        rateLimit: z.ZodOptional<z.ZodObject<{
            limit: z.ZodNumber;
            remaining: z.ZodNumber;
            resetAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            limit: number;
            remaining: number;
            resetAt: string;
        }, {
            limit: number;
            remaining: number;
            resetAt: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        requestId: string;
        apiVersion?: string | undefined;
        responseTimeMs?: number | undefined;
        rateLimit?: {
            limit: number;
            remaining: number;
            resetAt: string;
        } | undefined;
    }, {
        requestId: string;
        apiVersion?: string | undefined;
        responseTimeMs?: number | undefined;
        rateLimit?: {
            limit: number;
            remaining: number;
            resetAt: string;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    /** Whether the request was successful. */
    success: z.ZodBoolean;
    /** The response data payload. */
    data: z.ZodOptional<T>;
    /** Error information (present when success=false). */
    error: z.ZodOptional<z.ZodObject<{
        /** Machine-readable error code. */
        code: z.ZodString;
        /** Human-readable error message. */
        message: z.ZodString;
        /** The field that caused the error (for validation errors). */
        field: z.ZodOptional<z.ZodString>;
        /** Additional error context. */
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }>>;
    /** Array of validation errors. */
    errors: z.ZodOptional<z.ZodArray<z.ZodObject<{
        /** Machine-readable error code. */
        code: z.ZodString;
        /** Human-readable error message. */
        message: z.ZodString;
        /** The field that caused the error (for validation errors). */
        field: z.ZodOptional<z.ZodString>;
        /** Additional error context. */
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }>, "many">>;
    /** Pagination metadata (for list endpoints). */
    pagination: z.ZodOptional<z.ZodObject<{
        /** Current page number (1-based). */
        page: z.ZodNumber;
        /** Items per page. */
        perPage: z.ZodNumber;
        /** Total number of items. */
        total: z.ZodNumber;
        /** Total number of pages. */
        totalPages: z.ZodNumber;
        /** Whether there is a next page. */
        hasNext: z.ZodBoolean;
        /** Whether there is a previous page. */
        hasPrev: z.ZodBoolean;
        /** Cursor for next page (for cursor-based pagination). */
        nextCursor: z.ZodOptional<z.ZodString>;
        /** Cursor for previous page. */
        prevCursor: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
        nextCursor?: string | undefined;
        prevCursor?: string | undefined;
    }, {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
        nextCursor?: string | undefined;
        prevCursor?: string | undefined;
    }>>;
    /** Request metadata. */
    meta: z.ZodOptional<z.ZodObject<{
        /** Unique request ID for tracing. */
        requestId: z.ZodString;
        /** API version. */
        apiVersion: z.ZodOptional<z.ZodString>;
        /** Response time in milliseconds. */
        responseTimeMs: z.ZodOptional<z.ZodNumber>;
        /** Rate limit information. */
        rateLimit: z.ZodOptional<z.ZodObject<{
            limit: z.ZodNumber;
            remaining: z.ZodNumber;
            resetAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            limit: number;
            remaining: number;
            resetAt: string;
        }, {
            limit: number;
            remaining: number;
            resetAt: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        requestId: string;
        apiVersion?: string | undefined;
        responseTimeMs?: number | undefined;
        rateLimit?: {
            limit: number;
            remaining: number;
            resetAt: string;
        } | undefined;
    }, {
        requestId: string;
        apiVersion?: string | undefined;
        responseTimeMs?: number | undefined;
        rateLimit?: {
            limit: number;
            remaining: number;
            resetAt: string;
        } | undefined;
    }>>;
}>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<{
    /** Whether the request was successful. */
    success: z.ZodBoolean;
    /** The response data payload. */
    data: z.ZodOptional<T>;
    /** Error information (present when success=false). */
    error: z.ZodOptional<z.ZodObject<{
        /** Machine-readable error code. */
        code: z.ZodString;
        /** Human-readable error message. */
        message: z.ZodString;
        /** The field that caused the error (for validation errors). */
        field: z.ZodOptional<z.ZodString>;
        /** Additional error context. */
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }>>;
    /** Array of validation errors. */
    errors: z.ZodOptional<z.ZodArray<z.ZodObject<{
        /** Machine-readable error code. */
        code: z.ZodString;
        /** Human-readable error message. */
        message: z.ZodString;
        /** The field that caused the error (for validation errors). */
        field: z.ZodOptional<z.ZodString>;
        /** Additional error context. */
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }>, "many">>;
    /** Pagination metadata (for list endpoints). */
    pagination: z.ZodOptional<z.ZodObject<{
        /** Current page number (1-based). */
        page: z.ZodNumber;
        /** Items per page. */
        perPage: z.ZodNumber;
        /** Total number of items. */
        total: z.ZodNumber;
        /** Total number of pages. */
        totalPages: z.ZodNumber;
        /** Whether there is a next page. */
        hasNext: z.ZodBoolean;
        /** Whether there is a previous page. */
        hasPrev: z.ZodBoolean;
        /** Cursor for next page (for cursor-based pagination). */
        nextCursor: z.ZodOptional<z.ZodString>;
        /** Cursor for previous page. */
        prevCursor: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
        nextCursor?: string | undefined;
        prevCursor?: string | undefined;
    }, {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
        nextCursor?: string | undefined;
        prevCursor?: string | undefined;
    }>>;
    /** Request metadata. */
    meta: z.ZodOptional<z.ZodObject<{
        /** Unique request ID for tracing. */
        requestId: z.ZodString;
        /** API version. */
        apiVersion: z.ZodOptional<z.ZodString>;
        /** Response time in milliseconds. */
        responseTimeMs: z.ZodOptional<z.ZodNumber>;
        /** Rate limit information. */
        rateLimit: z.ZodOptional<z.ZodObject<{
            limit: z.ZodNumber;
            remaining: z.ZodNumber;
            resetAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            limit: number;
            remaining: number;
            resetAt: string;
        }, {
            limit: number;
            remaining: number;
            resetAt: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        requestId: string;
        apiVersion?: string | undefined;
        responseTimeMs?: number | undefined;
        rateLimit?: {
            limit: number;
            remaining: number;
            resetAt: string;
        } | undefined;
    }, {
        requestId: string;
        apiVersion?: string | undefined;
        responseTimeMs?: number | undefined;
        rateLimit?: {
            limit: number;
            remaining: number;
            resetAt: string;
        } | undefined;
    }>>;
}> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
/**
 * Convenience: success response type.
 */
export declare const ApiSuccessResponseSchema: <T extends z.ZodType>(dataSchema: T) => z.ZodObject<{
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodObject<{
        /** Machine-readable error code. */
        code: z.ZodString;
        /** Human-readable error message. */
        message: z.ZodString;
        /** The field that caused the error (for validation errors). */
        field: z.ZodOptional<z.ZodString>;
        /** Additional error context. */
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }>>;
    errors: z.ZodOptional<z.ZodArray<z.ZodObject<{
        /** Machine-readable error code. */
        code: z.ZodString;
        /** Human-readable error message. */
        message: z.ZodString;
        /** The field that caused the error (for validation errors). */
        field: z.ZodOptional<z.ZodString>;
        /** Additional error context. */
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }>, "many">>;
    pagination: z.ZodOptional<z.ZodObject<{
        /** Current page number (1-based). */
        page: z.ZodNumber;
        /** Items per page. */
        perPage: z.ZodNumber;
        /** Total number of items. */
        total: z.ZodNumber;
        /** Total number of pages. */
        totalPages: z.ZodNumber;
        /** Whether there is a next page. */
        hasNext: z.ZodBoolean;
        /** Whether there is a previous page. */
        hasPrev: z.ZodBoolean;
        /** Cursor for next page (for cursor-based pagination). */
        nextCursor: z.ZodOptional<z.ZodString>;
        /** Cursor for previous page. */
        prevCursor: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
        nextCursor?: string | undefined;
        prevCursor?: string | undefined;
    }, {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
        nextCursor?: string | undefined;
        prevCursor?: string | undefined;
    }>>;
    meta: z.ZodOptional<z.ZodObject<{
        /** Unique request ID for tracing. */
        requestId: z.ZodString;
        /** API version. */
        apiVersion: z.ZodOptional<z.ZodString>;
        /** Response time in milliseconds. */
        responseTimeMs: z.ZodOptional<z.ZodNumber>;
        /** Rate limit information. */
        rateLimit: z.ZodOptional<z.ZodObject<{
            limit: z.ZodNumber;
            remaining: z.ZodNumber;
            resetAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            limit: number;
            remaining: number;
            resetAt: string;
        }, {
            limit: number;
            remaining: number;
            resetAt: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        requestId: string;
        apiVersion?: string | undefined;
        responseTimeMs?: number | undefined;
        rateLimit?: {
            limit: number;
            remaining: number;
            resetAt: string;
        } | undefined;
    }, {
        requestId: string;
        apiVersion?: string | undefined;
        responseTimeMs?: number | undefined;
        rateLimit?: {
            limit: number;
            remaining: number;
            resetAt: string;
        } | undefined;
    }>>;
} & {
    success: z.ZodLiteral<true>;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodObject<{
        /** Machine-readable error code. */
        code: z.ZodString;
        /** Human-readable error message. */
        message: z.ZodString;
        /** The field that caused the error (for validation errors). */
        field: z.ZodOptional<z.ZodString>;
        /** Additional error context. */
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }>>;
    errors: z.ZodOptional<z.ZodArray<z.ZodObject<{
        /** Machine-readable error code. */
        code: z.ZodString;
        /** Human-readable error message. */
        message: z.ZodString;
        /** The field that caused the error (for validation errors). */
        field: z.ZodOptional<z.ZodString>;
        /** Additional error context. */
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }>, "many">>;
    pagination: z.ZodOptional<z.ZodObject<{
        /** Current page number (1-based). */
        page: z.ZodNumber;
        /** Items per page. */
        perPage: z.ZodNumber;
        /** Total number of items. */
        total: z.ZodNumber;
        /** Total number of pages. */
        totalPages: z.ZodNumber;
        /** Whether there is a next page. */
        hasNext: z.ZodBoolean;
        /** Whether there is a previous page. */
        hasPrev: z.ZodBoolean;
        /** Cursor for next page (for cursor-based pagination). */
        nextCursor: z.ZodOptional<z.ZodString>;
        /** Cursor for previous page. */
        prevCursor: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
        nextCursor?: string | undefined;
        prevCursor?: string | undefined;
    }, {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
        nextCursor?: string | undefined;
        prevCursor?: string | undefined;
    }>>;
    meta: z.ZodOptional<z.ZodObject<{
        /** Unique request ID for tracing. */
        requestId: z.ZodString;
        /** API version. */
        apiVersion: z.ZodOptional<z.ZodString>;
        /** Response time in milliseconds. */
        responseTimeMs: z.ZodOptional<z.ZodNumber>;
        /** Rate limit information. */
        rateLimit: z.ZodOptional<z.ZodObject<{
            limit: z.ZodNumber;
            remaining: z.ZodNumber;
            resetAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            limit: number;
            remaining: number;
            resetAt: string;
        }, {
            limit: number;
            remaining: number;
            resetAt: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        requestId: string;
        apiVersion?: string | undefined;
        responseTimeMs?: number | undefined;
        rateLimit?: {
            limit: number;
            remaining: number;
            resetAt: string;
        } | undefined;
    }, {
        requestId: string;
        apiVersion?: string | undefined;
        responseTimeMs?: number | undefined;
        rateLimit?: {
            limit: number;
            remaining: number;
            resetAt: string;
        } | undefined;
    }>>;
} & {
    success: z.ZodLiteral<true>;
}>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<{
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodObject<{
        /** Machine-readable error code. */
        code: z.ZodString;
        /** Human-readable error message. */
        message: z.ZodString;
        /** The field that caused the error (for validation errors). */
        field: z.ZodOptional<z.ZodString>;
        /** Additional error context. */
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }>>;
    errors: z.ZodOptional<z.ZodArray<z.ZodObject<{
        /** Machine-readable error code. */
        code: z.ZodString;
        /** Human-readable error message. */
        message: z.ZodString;
        /** The field that caused the error (for validation errors). */
        field: z.ZodOptional<z.ZodString>;
        /** Additional error context. */
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }>, "many">>;
    pagination: z.ZodOptional<z.ZodObject<{
        /** Current page number (1-based). */
        page: z.ZodNumber;
        /** Items per page. */
        perPage: z.ZodNumber;
        /** Total number of items. */
        total: z.ZodNumber;
        /** Total number of pages. */
        totalPages: z.ZodNumber;
        /** Whether there is a next page. */
        hasNext: z.ZodBoolean;
        /** Whether there is a previous page. */
        hasPrev: z.ZodBoolean;
        /** Cursor for next page (for cursor-based pagination). */
        nextCursor: z.ZodOptional<z.ZodString>;
        /** Cursor for previous page. */
        prevCursor: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
        nextCursor?: string | undefined;
        prevCursor?: string | undefined;
    }, {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
        nextCursor?: string | undefined;
        prevCursor?: string | undefined;
    }>>;
    meta: z.ZodOptional<z.ZodObject<{
        /** Unique request ID for tracing. */
        requestId: z.ZodString;
        /** API version. */
        apiVersion: z.ZodOptional<z.ZodString>;
        /** Response time in milliseconds. */
        responseTimeMs: z.ZodOptional<z.ZodNumber>;
        /** Rate limit information. */
        rateLimit: z.ZodOptional<z.ZodObject<{
            limit: z.ZodNumber;
            remaining: z.ZodNumber;
            resetAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            limit: number;
            remaining: number;
            resetAt: string;
        }, {
            limit: number;
            remaining: number;
            resetAt: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        requestId: string;
        apiVersion?: string | undefined;
        responseTimeMs?: number | undefined;
        rateLimit?: {
            limit: number;
            remaining: number;
            resetAt: string;
        } | undefined;
    }, {
        requestId: string;
        apiVersion?: string | undefined;
        responseTimeMs?: number | undefined;
        rateLimit?: {
            limit: number;
            remaining: number;
            resetAt: string;
        } | undefined;
    }>>;
} & {
    success: z.ZodLiteral<true>;
}> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
/**
 * Convenience: error response type.
 */
export declare const ApiErrorResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<false>;
    error: z.ZodObject<{
        /** Machine-readable error code. */
        code: z.ZodString;
        /** Human-readable error message. */
        message: z.ZodString;
        /** The field that caused the error (for validation errors). */
        field: z.ZodOptional<z.ZodString>;
        /** Additional error context. */
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }>;
    errors: z.ZodOptional<z.ZodArray<z.ZodObject<{
        /** Machine-readable error code. */
        code: z.ZodString;
        /** Human-readable error message. */
        message: z.ZodString;
        /** The field that caused the error (for validation errors). */
        field: z.ZodOptional<z.ZodString>;
        /** Additional error context. */
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }>, "many">>;
    meta: z.ZodOptional<z.ZodObject<{
        requestId: z.ZodString;
        apiVersion: z.ZodOptional<z.ZodString>;
        responseTimeMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        requestId: string;
        apiVersion?: string | undefined;
        responseTimeMs?: number | undefined;
    }, {
        requestId: string;
        apiVersion?: string | undefined;
        responseTimeMs?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    success: false;
    error: {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    };
    errors?: {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }[] | undefined;
    meta?: {
        requestId: string;
        apiVersion?: string | undefined;
        responseTimeMs?: number | undefined;
    } | undefined;
}, {
    success: false;
    error: {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    };
    errors?: {
        code: string;
        message: string;
        field?: string | undefined;
        details?: Record<string, unknown> | undefined;
    }[] | undefined;
    meta?: {
        requestId: string;
        apiVersion?: string | undefined;
        responseTimeMs?: number | undefined;
    } | undefined;
}>;
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
//# sourceMappingURL=api.d.ts.map