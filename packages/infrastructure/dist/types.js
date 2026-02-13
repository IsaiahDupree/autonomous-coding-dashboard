"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheEntrySchema = exports.CacheConfigSchema = exports.WebhookDeliverySchema = exports.WebhookDeliveryStatusEnum = exports.WebhookConfigSchema = exports.RetryPolicySchema = exports.JobSchema = exports.JobPriorityEnum = exports.JobStatusEnum = void 0;
const zod_1 = require("zod");
// ── Job System Types ─────────────────────────────────────────────────────────
exports.JobStatusEnum = zod_1.z.enum([
    'pending',
    'active',
    'completed',
    'failed',
    'delayed',
    'paused',
]);
exports.JobPriorityEnum = zod_1.z.enum([
    'low',
    'normal',
    'high',
    'critical',
]);
exports.JobSchema = zod_1.z.object({
    id: zod_1.z.string(),
    queue: zod_1.z.string(),
    data: zod_1.z.unknown(),
    status: exports.JobStatusEnum,
    priority: exports.JobPriorityEnum,
    attempts: zod_1.z.number().int().min(0),
    maxAttempts: zod_1.z.number().int().min(1),
    createdAt: zod_1.z.date(),
    startedAt: zod_1.z.date().optional(),
    completedAt: zod_1.z.date().optional(),
    failedReason: zod_1.z.string().optional(),
    result: zod_1.z.unknown().optional(),
});
// ── Webhook Types ────────────────────────────────────────────────────────────
exports.RetryPolicySchema = zod_1.z.object({
    maxAttempts: zod_1.z.number().int().min(1).default(3),
    backoffMs: zod_1.z.number().int().min(100).default(1000),
    backoffMultiplier: zod_1.z.number().min(1).default(2),
});
exports.WebhookConfigSchema = zod_1.z.object({
    id: zod_1.z.string(),
    url: zod_1.z.string().url(),
    events: zod_1.z.array(zod_1.z.string()),
    secret: zod_1.z.string(),
    active: zod_1.z.boolean(),
    retryPolicy: exports.RetryPolicySchema,
    createdAt: zod_1.z.date(),
});
exports.WebhookDeliveryStatusEnum = zod_1.z.enum([
    'pending',
    'delivered',
    'failed',
]);
exports.WebhookDeliverySchema = zod_1.z.object({
    id: zod_1.z.string(),
    webhookId: zod_1.z.string(),
    event: zod_1.z.string(),
    payload: zod_1.z.unknown(),
    status: exports.WebhookDeliveryStatusEnum,
    attempts: zod_1.z.number().int().min(0),
    lastAttemptAt: zod_1.z.date().optional(),
    responseCode: zod_1.z.number().int().optional(),
});
// ── Cache Types ──────────────────────────────────────────────────────────────
exports.CacheConfigSchema = zod_1.z.object({
    ttlMs: zod_1.z.number().int().min(0),
    maxSize: zod_1.z.number().int().min(1),
    prefix: zod_1.z.string().default(''),
});
exports.CacheEntrySchema = zod_1.z.object({
    key: zod_1.z.string(),
    value: zod_1.z.unknown(),
    expiresAt: zod_1.z.date(),
    createdAt: zod_1.z.date(),
    accessCount: zod_1.z.number().int().min(0),
});
