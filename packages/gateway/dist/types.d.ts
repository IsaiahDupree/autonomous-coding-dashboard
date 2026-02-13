import { z } from 'zod';
export declare const RateLimitConfigSchema: z.ZodObject<{
    windowMs: z.ZodNumber;
    maxRequests: z.ZodNumber;
    keyPrefix: z.ZodOptional<z.ZodString>;
    skipFailedRequests: z.ZodOptional<z.ZodBoolean>;
    skipSuccessfulRequests: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    windowMs: number;
    maxRequests: number;
    keyPrefix?: string | undefined;
    skipFailedRequests?: boolean | undefined;
    skipSuccessfulRequests?: boolean | undefined;
}, {
    windowMs: number;
    maxRequests: number;
    keyPrefix?: string | undefined;
    skipFailedRequests?: boolean | undefined;
    skipSuccessfulRequests?: boolean | undefined;
}>;
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
export declare const RateLimitInfoSchema: z.ZodObject<{
    limit: z.ZodNumber;
    remaining: z.ZodNumber;
    resetAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    limit: number;
    remaining: number;
    resetAt: Date;
}, {
    limit: number;
    remaining: number;
    resetAt: Date;
}>;
export type RateLimitInfo = z.infer<typeof RateLimitInfoSchema>;
export declare const ApiKeyRecordSchema: z.ZodObject<{
    id: z.ZodString;
    key: z.ZodString;
    name: z.ZodString;
    ownerId: z.ZodString;
    orgId: z.ZodString;
    scopes: z.ZodArray<z.ZodString, "many">;
    rateLimit: z.ZodObject<{
        windowMs: z.ZodNumber;
        maxRequests: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        windowMs: number;
        maxRequests: number;
    }, {
        windowMs: number;
        maxRequests: number;
    }>;
    product: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodDate;
    expiresAt: z.ZodNullable<z.ZodDate>;
    lastUsedAt: z.ZodNullable<z.ZodDate>;
    isActive: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string;
    key: string;
    name: string;
    ownerId: string;
    orgId: string;
    scopes: string[];
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    product: string | null;
    createdAt: Date;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    isActive: boolean;
}, {
    id: string;
    key: string;
    name: string;
    ownerId: string;
    orgId: string;
    scopes: string[];
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    product: string | null;
    createdAt: Date;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    isActive: boolean;
}>;
export type ApiKeyRecord = z.infer<typeof ApiKeyRecordSchema>;
export declare const RequestLogSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodDate;
    method: z.ZodString;
    path: z.ZodString;
    statusCode: z.ZodNumber;
    responseTimeMs: z.ZodNumber;
    apiKeyId: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
    orgId: z.ZodOptional<z.ZodString>;
    product: z.ZodOptional<z.ZodString>;
    ip: z.ZodString;
    userAgent: z.ZodString;
    requestHeaders: z.ZodRecord<z.ZodString, z.ZodString>;
    responseSize: z.ZodNumber;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    id: string;
    timestamp: Date;
    method: string;
    statusCode: number;
    responseTimeMs: number;
    ip: string;
    userAgent: string;
    requestHeaders: Record<string, string>;
    responseSize: number;
    orgId?: string | undefined;
    product?: string | undefined;
    apiKeyId?: string | undefined;
    userId?: string | undefined;
    error?: string | undefined;
}, {
    path: string;
    id: string;
    timestamp: Date;
    method: string;
    statusCode: number;
    responseTimeMs: number;
    ip: string;
    userAgent: string;
    requestHeaders: Record<string, string>;
    responseSize: number;
    orgId?: string | undefined;
    product?: string | undefined;
    apiKeyId?: string | undefined;
    userId?: string | undefined;
    error?: string | undefined;
}>;
export type RequestLog = z.infer<typeof RequestLogSchema>;
export declare const ApiVersionSchema: z.ZodObject<{
    version: z.ZodString;
    deprecated: z.ZodBoolean;
    sunsetDate: z.ZodOptional<z.ZodDate>;
    routes: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    version: string;
    deprecated: boolean;
    routes: string[];
    sunsetDate?: Date | undefined;
}, {
    version: string;
    deprecated: boolean;
    routes: string[];
    sunsetDate?: Date | undefined;
}>;
export type ApiVersion = z.infer<typeof ApiVersionSchema>;
export declare const GatewayConfigSchema: z.ZodObject<{
    apiKeys: z.ZodObject<{
        hashAlgorithm: z.ZodLiteral<"sha256">;
        prefix: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        hashAlgorithm: "sha256";
        prefix: string;
    }, {
        hashAlgorithm: "sha256";
        prefix?: string | undefined;
    }>;
    rateLimit: z.ZodObject<{
        windowMs: z.ZodNumber;
        maxRequests: z.ZodNumber;
        keyPrefix: z.ZodOptional<z.ZodString>;
        skipFailedRequests: z.ZodOptional<z.ZodBoolean>;
        skipSuccessfulRequests: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        windowMs: number;
        maxRequests: number;
        keyPrefix?: string | undefined;
        skipFailedRequests?: boolean | undefined;
        skipSuccessfulRequests?: boolean | undefined;
    }, {
        windowMs: number;
        maxRequests: number;
        keyPrefix?: string | undefined;
        skipFailedRequests?: boolean | undefined;
        skipSuccessfulRequests?: boolean | undefined;
    }>;
    logging: z.ZodObject<{
        enabled: z.ZodBoolean;
        includeHeaders: z.ZodOptional<z.ZodBoolean>;
        excludePaths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        sensitiveHeaders: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        includeHeaders?: boolean | undefined;
        excludePaths?: string[] | undefined;
        sensitiveHeaders?: string[] | undefined;
    }, {
        enabled: boolean;
        includeHeaders?: boolean | undefined;
        excludePaths?: string[] | undefined;
        sensitiveHeaders?: string[] | undefined;
    }>;
    versioning: z.ZodObject<{
        current: z.ZodString;
        supported: z.ZodArray<z.ZodObject<{
            version: z.ZodString;
            deprecated: z.ZodBoolean;
            sunsetDate: z.ZodOptional<z.ZodDate>;
            routes: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            version: string;
            deprecated: boolean;
            routes: string[];
            sunsetDate?: Date | undefined;
        }, {
            version: string;
            deprecated: boolean;
            routes: string[];
            sunsetDate?: Date | undefined;
        }>, "many">;
        headerName: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        current: string;
        supported: {
            version: string;
            deprecated: boolean;
            routes: string[];
            sunsetDate?: Date | undefined;
        }[];
        headerName: string;
    }, {
        current: string;
        supported: {
            version: string;
            deprecated: boolean;
            routes: string[];
            sunsetDate?: Date | undefined;
        }[];
        headerName?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    rateLimit: {
        windowMs: number;
        maxRequests: number;
        keyPrefix?: string | undefined;
        skipFailedRequests?: boolean | undefined;
        skipSuccessfulRequests?: boolean | undefined;
    };
    apiKeys: {
        hashAlgorithm: "sha256";
        prefix: string;
    };
    logging: {
        enabled: boolean;
        includeHeaders?: boolean | undefined;
        excludePaths?: string[] | undefined;
        sensitiveHeaders?: string[] | undefined;
    };
    versioning: {
        current: string;
        supported: {
            version: string;
            deprecated: boolean;
            routes: string[];
            sunsetDate?: Date | undefined;
        }[];
        headerName: string;
    };
}, {
    rateLimit: {
        windowMs: number;
        maxRequests: number;
        keyPrefix?: string | undefined;
        skipFailedRequests?: boolean | undefined;
        skipSuccessfulRequests?: boolean | undefined;
    };
    apiKeys: {
        hashAlgorithm: "sha256";
        prefix?: string | undefined;
    };
    logging: {
        enabled: boolean;
        includeHeaders?: boolean | undefined;
        excludePaths?: string[] | undefined;
        sensitiveHeaders?: string[] | undefined;
    };
    versioning: {
        current: string;
        supported: {
            version: string;
            deprecated: boolean;
            routes: string[];
            sunsetDate?: Date | undefined;
        }[];
        headerName?: string | undefined;
    };
}>;
export type GatewayConfig = z.infer<typeof GatewayConfigSchema>;
export declare const AuditActionSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodDate;
    actor: z.ZodString;
    action: z.ZodString;
    resource: z.ZodString;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    timestamp: Date;
    actor: string;
    action: string;
    resource: string;
    details?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: Date;
    actor: string;
    action: string;
    resource: string;
    details?: Record<string, unknown> | undefined;
}>;
export type AuditAction = z.infer<typeof AuditActionSchema>;
export declare const ServiceDefinitionSchema: z.ZodObject<{
    name: z.ZodString;
    url: z.ZodString;
    sdl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    url: string;
    sdl: string;
}, {
    name: string;
    url: string;
    sdl: string;
}>;
export type ServiceDefinition = z.infer<typeof ServiceDefinitionSchema>;
//# sourceMappingURL=types.d.ts.map