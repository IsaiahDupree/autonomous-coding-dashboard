import { z } from 'zod';
export declare const JobStatusEnum: z.ZodEnum<["pending", "active", "completed", "failed", "delayed", "paused"]>;
export type JobStatus = z.infer<typeof JobStatusEnum>;
export declare const JobPriorityEnum: z.ZodEnum<["low", "normal", "high", "critical"]>;
export type JobPriority = z.infer<typeof JobPriorityEnum>;
export declare const JobSchema: z.ZodObject<{
    id: z.ZodString;
    queue: z.ZodString;
    data: z.ZodUnknown;
    status: z.ZodEnum<["pending", "active", "completed", "failed", "delayed", "paused"]>;
    priority: z.ZodEnum<["low", "normal", "high", "critical"]>;
    attempts: z.ZodNumber;
    maxAttempts: z.ZodNumber;
    createdAt: z.ZodDate;
    startedAt: z.ZodOptional<z.ZodDate>;
    completedAt: z.ZodOptional<z.ZodDate>;
    failedReason: z.ZodOptional<z.ZodString>;
    result: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "active" | "completed" | "failed" | "delayed" | "paused";
    id: string;
    queue: string;
    priority: "low" | "normal" | "high" | "critical";
    attempts: number;
    maxAttempts: number;
    createdAt: Date;
    data?: unknown;
    startedAt?: Date | undefined;
    completedAt?: Date | undefined;
    failedReason?: string | undefined;
    result?: unknown;
}, {
    status: "pending" | "active" | "completed" | "failed" | "delayed" | "paused";
    id: string;
    queue: string;
    priority: "low" | "normal" | "high" | "critical";
    attempts: number;
    maxAttempts: number;
    createdAt: Date;
    data?: unknown;
    startedAt?: Date | undefined;
    completedAt?: Date | undefined;
    failedReason?: string | undefined;
    result?: unknown;
}>;
export type Job = z.infer<typeof JobSchema>;
export declare const RetryPolicySchema: z.ZodObject<{
    maxAttempts: z.ZodDefault<z.ZodNumber>;
    backoffMs: z.ZodDefault<z.ZodNumber>;
    backoffMultiplier: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    maxAttempts: number;
    backoffMs: number;
    backoffMultiplier: number;
}, {
    maxAttempts?: number | undefined;
    backoffMs?: number | undefined;
    backoffMultiplier?: number | undefined;
}>;
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;
export declare const WebhookConfigSchema: z.ZodObject<{
    id: z.ZodString;
    url: z.ZodString;
    events: z.ZodArray<z.ZodString, "many">;
    secret: z.ZodString;
    active: z.ZodBoolean;
    retryPolicy: z.ZodObject<{
        maxAttempts: z.ZodDefault<z.ZodNumber>;
        backoffMs: z.ZodDefault<z.ZodNumber>;
        backoffMultiplier: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxAttempts: number;
        backoffMs: number;
        backoffMultiplier: number;
    }, {
        maxAttempts?: number | undefined;
        backoffMs?: number | undefined;
        backoffMultiplier?: number | undefined;
    }>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    active: boolean;
    id: string;
    createdAt: Date;
    url: string;
    events: string[];
    secret: string;
    retryPolicy: {
        maxAttempts: number;
        backoffMs: number;
        backoffMultiplier: number;
    };
}, {
    active: boolean;
    id: string;
    createdAt: Date;
    url: string;
    events: string[];
    secret: string;
    retryPolicy: {
        maxAttempts?: number | undefined;
        backoffMs?: number | undefined;
        backoffMultiplier?: number | undefined;
    };
}>;
export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;
export declare const WebhookDeliveryStatusEnum: z.ZodEnum<["pending", "delivered", "failed"]>;
export type WebhookDeliveryStatus = z.infer<typeof WebhookDeliveryStatusEnum>;
export declare const WebhookDeliverySchema: z.ZodObject<{
    id: z.ZodString;
    webhookId: z.ZodString;
    event: z.ZodString;
    payload: z.ZodUnknown;
    status: z.ZodEnum<["pending", "delivered", "failed"]>;
    attempts: z.ZodNumber;
    lastAttemptAt: z.ZodOptional<z.ZodDate>;
    responseCode: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "failed" | "delivered";
    id: string;
    attempts: number;
    webhookId: string;
    event: string;
    payload?: unknown;
    lastAttemptAt?: Date | undefined;
    responseCode?: number | undefined;
}, {
    status: "pending" | "failed" | "delivered";
    id: string;
    attempts: number;
    webhookId: string;
    event: string;
    payload?: unknown;
    lastAttemptAt?: Date | undefined;
    responseCode?: number | undefined;
}>;
export type WebhookDelivery = z.infer<typeof WebhookDeliverySchema>;
export declare const CacheConfigSchema: z.ZodObject<{
    ttlMs: z.ZodNumber;
    maxSize: z.ZodNumber;
    prefix: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    ttlMs: number;
    maxSize: number;
    prefix: string;
}, {
    ttlMs: number;
    maxSize: number;
    prefix?: string | undefined;
}>;
export type CacheConfig = z.infer<typeof CacheConfigSchema>;
export declare const CacheEntrySchema: z.ZodObject<{
    key: z.ZodString;
    value: z.ZodUnknown;
    expiresAt: z.ZodDate;
    createdAt: z.ZodDate;
    accessCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    createdAt: Date;
    key: string;
    expiresAt: Date;
    accessCount: number;
    value?: unknown;
}, {
    createdAt: Date;
    key: string;
    expiresAt: Date;
    accessCount: number;
    value?: unknown;
}>;
export interface CacheEntry<T> {
    key: string;
    value: T;
    expiresAt: Date;
    createdAt: Date;
    accessCount: number;
}
export interface CDNOriginConfig {
    originUrl: string;
    cacheTtlSeconds: number;
    allowedMethods: string[];
    headers: Record<string, string>;
}
export interface CDNCacheRule {
    pathPattern: string;
    ttlSeconds: number;
    cacheControl: string;
}
export interface QueryAnalysis {
    query: string;
    estimatedCostMs: number;
    suggestedIndexes: string[];
    isSlowQuery: boolean;
    optimizedQuery?: string;
}
export interface ImageOptimizeOptions {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp' | 'avif';
}
export interface ImageOptimizeResult {
    originalSize: number;
    optimizedSize: number;
    width: number;
    height: number;
    format: string;
    savings: number;
}
