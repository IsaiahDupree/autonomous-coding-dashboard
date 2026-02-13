import { z } from 'zod';

// ── Job System Types ─────────────────────────────────────────────────────────

export const JobStatusEnum = z.enum([
  'pending',
  'active',
  'completed',
  'failed',
  'delayed',
  'paused',
]);
export type JobStatus = z.infer<typeof JobStatusEnum>;

export const JobPriorityEnum = z.enum([
  'low',
  'normal',
  'high',
  'critical',
]);
export type JobPriority = z.infer<typeof JobPriorityEnum>;

export const JobSchema = z.object({
  id: z.string(),
  queue: z.string(),
  data: z.unknown(),
  status: JobStatusEnum,
  priority: JobPriorityEnum,
  attempts: z.number().int().min(0),
  maxAttempts: z.number().int().min(1),
  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  failedReason: z.string().optional(),
  result: z.unknown().optional(),
});
export type Job = z.infer<typeof JobSchema>;

// ── Webhook Types ────────────────────────────────────────────────────────────

export const RetryPolicySchema = z.object({
  maxAttempts: z.number().int().min(1).default(3),
  backoffMs: z.number().int().min(100).default(1000),
  backoffMultiplier: z.number().min(1).default(2),
});
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

export const WebhookConfigSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  events: z.array(z.string()),
  secret: z.string(),
  active: z.boolean(),
  retryPolicy: RetryPolicySchema,
  createdAt: z.date(),
});
export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

export const WebhookDeliveryStatusEnum = z.enum([
  'pending',
  'delivered',
  'failed',
]);
export type WebhookDeliveryStatus = z.infer<typeof WebhookDeliveryStatusEnum>;

export const WebhookDeliverySchema = z.object({
  id: z.string(),
  webhookId: z.string(),
  event: z.string(),
  payload: z.unknown(),
  status: WebhookDeliveryStatusEnum,
  attempts: z.number().int().min(0),
  lastAttemptAt: z.date().optional(),
  responseCode: z.number().int().optional(),
});
export type WebhookDelivery = z.infer<typeof WebhookDeliverySchema>;

// ── Cache Types ──────────────────────────────────────────────────────────────

export const CacheConfigSchema = z.object({
  ttlMs: z.number().int().min(0),
  maxSize: z.number().int().min(1),
  prefix: z.string().default(''),
});
export type CacheConfig = z.infer<typeof CacheConfigSchema>;

export const CacheEntrySchema = z.object({
  key: z.string(),
  value: z.unknown(),
  expiresAt: z.date(),
  createdAt: z.date(),
  accessCount: z.number().int().min(0),
});

export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: Date;
  createdAt: Date;
  accessCount: number;
}

// ── Performance Types ────────────────────────────────────────────────────────

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
