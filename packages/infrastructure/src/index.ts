/**
 * @acd/infrastructure
 *
 * Infrastructure services package providing job queues, webhooks,
 * caching, and performance optimization utilities.
 */

// ── Types ────────────────────────────────────────────────────────────────────
export * from './types';

// ── Job Queue System (JOB-001 through JOB-007) ──────────────────────────────
export { JobQueue } from './jobs/queue';
export type { JobQueueOptions, AddJobOptions, JobHandler } from './jobs/queue';

export { JobScheduler } from './jobs/scheduler';
export type { ScheduledJob } from './jobs/scheduler';

export { VideoRenderJobProcessor } from './jobs/video-render';
export type { VideoRenderInput, VideoRenderResult } from './jobs/video-render';

export { MetaAdPublishJobProcessor } from './jobs/meta-publish';
export type { MetaAdPublishInput, MetaAdPublishResult } from './jobs/meta-publish';

export { ContentPipelineJobProcessor } from './jobs/content-pipeline';
export type {
  PipelineStage,
  ContentPipelineInput,
  ContentPipelineResult,
} from './jobs/content-pipeline';

export { AnalyticsAggregationJob } from './jobs/analytics-agg';
export type {
  AggregationPeriod,
  AggregationConfig,
  AggregationResult,
  AnalyticsDataSource,
} from './jobs/analytics-agg';

export { CleanupJob } from './jobs/cleanup';
export type {
  CleanupTarget,
  CleanupResult,
  CleanupReport,
} from './jobs/cleanup';

// ── Webhook System (WH-001 through WH-006) ──────────────────────────────────
export { WebhookManager } from './webhooks/manager';
export type {
  WebhookDispatchResult,
  WebhookTransport,
} from './webhooks/manager';

export { RemotionWebhookHandler } from './webhooks/remotion';
export type {
  RemotionEventType,
  RemotionRenderEvent,
  RemotionEventHandler,
} from './webhooks/remotion';

export { StripeWebhookHub } from './webhooks/stripe';
export type {
  StripeEventCategory,
  StripeWebhookEvent,
  StripeEventRouteResult,
  StripeEventHandler,
} from './webhooks/stripe';

export { MetaWebhookHub } from './webhooks/meta';
export type {
  MetaWebhookObject,
  MetaWebhookEntry,
  MetaWebhookPayload,
  MetaWebhookRouteResult,
  MetaFieldHandler,
} from './webhooks/meta';

export { TikTokWebhookHandler } from './webhooks/tiktok';
export type {
  TikTokEventType,
  TikTokWebhookEvent,
  TikTokWebhookResult,
  TikTokEventHandler,
} from './webhooks/tiktok';

export { CustomWebhookSubscriptions, SYSTEM_EVENTS } from './webhooks/subscriptions';
export type {
  SubscriptionCreateInput,
  Subscription,
  SubscriptionStats,
  SystemEvent,
} from './webhooks/subscriptions';

// ── Cache Layer (CACHE-001 through CACHE-005) ────────────────────────────────
export { CacheManager } from './cache/cache';
export type { CacheManagerOptions, CacheStats } from './cache/cache';

export { SessionCache } from './cache/session';
export type { SessionData, SessionCacheOptions } from './cache/session';

export { ApiResponseCache } from './cache/api-response';
export type {
  CachedResponse,
  ApiResponseCacheOptions,
  ConditionalResult,
} from './cache/api-response';

export { AssetMetadataCache } from './cache/asset-metadata';
export type {
  AssetMetadata,
  AssetMetadataCacheOptions,
} from './cache/asset-metadata';

export { MetaInsightsCache } from './cache/meta-insights';
export type {
  MetaInsightsData,
  MetaInsightsCacheOptions,
  InsightsCacheResult,
} from './cache/meta-insights';

// ── Performance Optimization (PERF-001 through PERF-003) ─────────────────────
export { CDNConfig } from './performance/cdn';
export type {
  CDNConfigOptions,
  CDNPurgeRequest,
  CDNPurgeResult,
  CDNEdgeConfig,
} from './performance/cdn';

export { QueryOptimizer } from './performance/query-optimizer';
export type {
  QueryProfile,
  IndexSuggestion,
  QueryOptimizerOptions,
} from './performance/query-optimizer';

export { ImageOptimizer } from './performance/image-optimizer';
export type {
  ResponsiveImageSet,
  OptimizationPlan,
  ImageOptimizerOptions,
} from './performance/image-optimizer';
