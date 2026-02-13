/**
 * @module types
 * Centralized Zod schemas and TypeScript types for the monitoring package.
 * Covers logging, APM, health, rate-limits, costs, queues, sessions,
 * notifications (Slack, email, in-app), analytics (funnels, creative perf,
 * PCT feedback, TikTok metrics, dashboard), ad insights, and audience sync.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// MON-001: Logging
// ---------------------------------------------------------------------------

export const LogLevelEnum = z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']);
export type LogLevel = z.infer<typeof LogLevelEnum>;

export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

export const LogEntrySchema = z.object({
  timestamp: z.string(),
  level: LogLevelEnum,
  message: z.string(),
  context: z.record(z.unknown()).optional(),
  error: z
    .object({
      name: z.string(),
      message: z.string(),
      stack: z.string().optional(),
    })
    .optional(),
  logger: z.string().optional(),
});
export type LogEntry = z.infer<typeof LogEntrySchema>;

export const LoggerConfigSchema = z.object({
  level: LogLevelEnum.default('info'),
  name: z.string().default('root'),
  context: z.record(z.unknown()).optional(),
  json: z.boolean().default(true),
  pretty: z.boolean().default(false),
});
export type LoggerConfig = z.infer<typeof LoggerConfigSchema>;

// ---------------------------------------------------------------------------
// MON-002: APM / Performance Monitoring
// ---------------------------------------------------------------------------

export const SpanStatusEnum = z.enum(['ok', 'error', 'timeout']);
export type SpanStatus = z.infer<typeof SpanStatusEnum>;

export const SpanSchema = z.object({
  traceId: z.string(),
  spanId: z.string(),
  parentSpanId: z.string().optional(),
  name: z.string(),
  service: z.string(),
  startTime: z.number(),
  endTime: z.number().optional(),
  duration: z.number().optional(),
  status: SpanStatusEnum.default('ok'),
  attributes: z.record(z.unknown()).optional(),
});
export type Span = z.infer<typeof SpanSchema>;

export const ApmConfigSchema = z.object({
  serviceName: z.string(),
  sampleRate: z.number().min(0).max(1).default(1.0),
  flushIntervalMs: z.number().default(30_000),
  maxSpans: z.number().default(10_000),
});
export type ApmConfig = z.infer<typeof ApmConfigSchema>;

// ---------------------------------------------------------------------------
// MON-003: Health Checks
// ---------------------------------------------------------------------------

export const ComponentStatusEnum = z.enum(['healthy', 'degraded', 'unhealthy']);
export type ComponentStatus = z.infer<typeof ComponentStatusEnum>;

export const ComponentHealthSchema = z.object({
  name: z.string(),
  status: ComponentStatusEnum,
  message: z.string().optional(),
  lastChecked: z.string(),
  responseTimeMs: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type ComponentHealth = z.infer<typeof ComponentHealthSchema>;

export const HealthReportSchema = z.object({
  status: ComponentStatusEnum,
  timestamp: z.string(),
  uptime: z.number(),
  components: z.array(ComponentHealthSchema),
  version: z.string().optional(),
});
export type HealthReport = z.infer<typeof HealthReportSchema>;

// ---------------------------------------------------------------------------
// MON-004: Rate Limit Monitoring
// ---------------------------------------------------------------------------

export const RateLimitEntrySchema = z.object({
  service: z.string(),
  endpoint: z.string().optional(),
  limit: z.number(),
  remaining: z.number(),
  resetAt: z.string(),
  usagePercent: z.number(),
  windowMs: z.number().optional(),
});
export type RateLimitEntry = z.infer<typeof RateLimitEntrySchema>;

export const RateLimitAlertSchema = z.object({
  service: z.string(),
  endpoint: z.string().optional(),
  usagePercent: z.number(),
  limit: z.number(),
  remaining: z.number(),
  threshold: z.number(),
  timestamp: z.string(),
});
export type RateLimitAlert = z.infer<typeof RateLimitAlertSchema>;

export const RateLimitConfigSchema = z.object({
  alertThreshold: z.number().min(0).max(1).default(0.8),
  checkIntervalMs: z.number().default(60_000),
});
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;

// ---------------------------------------------------------------------------
// MON-005: Cost Monitoring
// ---------------------------------------------------------------------------

export const CostEntrySchema = z.object({
  id: z.string(),
  service: z.string(),
  product: z.string().optional(),
  amount: z.number(),
  currency: z.string().default('USD'),
  timestamp: z.string(),
  metadata: z.record(z.unknown()).optional(),
});
export type CostEntry = z.infer<typeof CostEntrySchema>;

export const BudgetAlertSchema = z.object({
  service: z.string(),
  product: z.string().optional(),
  currentSpend: z.number(),
  budgetLimit: z.number(),
  usagePercent: z.number(),
  period: z.string(),
  timestamp: z.string(),
});
export type BudgetAlert = z.infer<typeof BudgetAlertSchema>;

export const CostConfigSchema = z.object({
  budgets: z
    .array(
      z.object({
        service: z.string(),
        product: z.string().optional(),
        limit: z.number(),
        period: z.enum(['hourly', 'daily', 'weekly', 'monthly']).default('monthly'),
        alertThreshold: z.number().min(0).max(1).default(0.8),
      })
    )
    .default([]),
  defaultCurrency: z.string().default('USD'),
});
export type CostConfig = z.infer<typeof CostConfigSchema>;

export const UsageReportSchema = z.object({
  period: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  totalSpend: z.number(),
  currency: z.string(),
  byService: z.record(z.number()),
  byProduct: z.record(z.number()),
  entries: z.array(CostEntrySchema),
});
export type UsageReport = z.infer<typeof UsageReportSchema>;

// ---------------------------------------------------------------------------
// MON-006: Queue Monitoring
// ---------------------------------------------------------------------------

export const QueueStatsSchema = z.object({
  name: z.string(),
  depth: z.number(),
  processingRate: z.number(), // jobs per second
  failureRate: z.number(), // failures per second
  avgProcessingTimeMs: z.number(),
  oldestJobAge: z.number().optional(), // ms
  staleThresholdMs: z.number().default(300_000), // 5 min
  hasStaleJobs: z.boolean().default(false),
  lastUpdated: z.string(),
});
export type QueueStats = z.infer<typeof QueueStatsSchema>;

export const QueueAlertSchema = z.object({
  queue: z.string(),
  alertType: z.enum(['depth_exceeded', 'high_failure_rate', 'stale_jobs', 'processing_slow']),
  message: z.string(),
  value: z.number(),
  threshold: z.number(),
  timestamp: z.string(),
});
export type QueueAlert = z.infer<typeof QueueAlertSchema>;

export const QueueConfigSchema = z.object({
  depthThreshold: z.number().default(1000),
  failureRateThreshold: z.number().default(0.1),
  staleThresholdMs: z.number().default(300_000),
  processingTimeThresholdMs: z.number().default(60_000),
  checkIntervalMs: z.number().default(30_000),
});
export type QueueConfig = z.infer<typeof QueueConfigSchema>;

// ---------------------------------------------------------------------------
// MON-007: Session Monitoring
// ---------------------------------------------------------------------------

export const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  startedAt: z.string(),
  lastActivityAt: z.string(),
  endedAt: z.string().optional(),
  durationMs: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type Session = z.infer<typeof SessionSchema>;

export const SessionStatsSchema = z.object({
  activeSessions: z.number(),
  totalSessions: z.number(),
  avgDurationMs: z.number(),
  concurrentPeak: z.number(),
  sessionsByUser: z.record(z.number()),
  timestamp: z.string(),
});
export type SessionStats = z.infer<typeof SessionStatsSchema>;

export const SessionConfigSchema = z.object({
  maxConcurrentSessions: z.number().default(100),
  maxSessionsPerUser: z.number().default(5),
  sessionTimeoutMs: z.number().default(3_600_000), // 1 hour
  cleanupIntervalMs: z.number().default(60_000),
});
export type SessionConfig = z.infer<typeof SessionConfigSchema>;

// ---------------------------------------------------------------------------
// NOTIFY-001: Slack Notifications
// ---------------------------------------------------------------------------

export const SlackBlockSchema: z.ZodType<SlackBlock> = z.lazy(() =>
  z.object({
    type: z.enum(['section', 'divider', 'header', 'context', 'actions', 'image']),
    text: z
      .object({
        type: z.enum(['plain_text', 'mrkdwn']),
        text: z.string(),
      })
      .optional(),
    fields: z
      .array(
        z.object({
          type: z.enum(['plain_text', 'mrkdwn']),
          text: z.string(),
        })
      )
      .optional(),
    elements: z.array(z.record(z.unknown())).optional(),
    accessory: z.record(z.unknown()).optional(),
  })
);

export interface SlackBlock {
  type: 'section' | 'divider' | 'header' | 'context' | 'actions' | 'image';
  text?: { type: 'plain_text' | 'mrkdwn'; text: string };
  fields?: Array<{ type: 'plain_text' | 'mrkdwn'; text: string }>;
  elements?: Array<Record<string, unknown>>;
  accessory?: Record<string, unknown>;
}

export const SlackMessageSchema = z.object({
  channel: z.string(),
  text: z.string(),
  blocks: z.array(SlackBlockSchema).optional(),
  threadTs: z.string().optional(),
  unfurlLinks: z.boolean().default(false),
});
export type SlackMessage = z.infer<typeof SlackMessageSchema>;

export const SlackConfigSchema = z.object({
  webhookUrl: z.string().url().optional(),
  defaultChannel: z.string().default('#general'),
  channelRouting: z
    .record(z.string()) // category -> channel
    .default({}),
  enabled: z.boolean().default(true),
  rateLimitPerMinute: z.number().default(30),
});
export type SlackConfig = z.infer<typeof SlackConfigSchema>;

// ---------------------------------------------------------------------------
// NOTIFY-002: Email Notifications
// ---------------------------------------------------------------------------

export const EmailRecipientSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});
export type EmailRecipient = z.infer<typeof EmailRecipientSchema>;

export const EmailMessageSchema = z.object({
  to: z.array(EmailRecipientSchema).min(1),
  cc: z.array(EmailRecipientSchema).optional(),
  bcc: z.array(EmailRecipientSchema).optional(),
  from: EmailRecipientSchema.optional(),
  replyTo: EmailRecipientSchema.optional(),
  subject: z.string(),
  template: z.string().optional(),
  templateData: z.record(z.unknown()).optional(),
  html: z.string().optional(),
  text: z.string().optional(),
  unsubscribeUrl: z.string().optional(),
  headers: z.record(z.string()).optional(),
});
export type EmailMessage = z.infer<typeof EmailMessageSchema>;

export const EmailConfigSchema = z.object({
  provider: z.enum(['smtp', 'resend', 'mock']).default('mock'),
  from: EmailRecipientSchema.optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  resendApiKey: z.string().optional(),
  unsubscribeBaseUrl: z.string().optional(),
  enabled: z.boolean().default(true),
});
export type EmailConfig = z.infer<typeof EmailConfigSchema>;

export const EmailResultSchema = z.object({
  messageId: z.string(),
  accepted: z.array(z.string()),
  rejected: z.array(z.string()),
  timestamp: z.string(),
});
export type EmailResult = z.infer<typeof EmailResultSchema>;

// ---------------------------------------------------------------------------
// NOTIFY-003: In-App Notifications
// ---------------------------------------------------------------------------

export const NotificationPriorityEnum = z.enum(['low', 'normal', 'high', 'urgent']);
export type NotificationPriority = z.infer<typeof NotificationPriorityEnum>;

export const InAppNotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  body: z.string(),
  type: z.string().default('info'),
  priority: NotificationPriorityEnum.default('normal'),
  read: z.boolean().default(false),
  readAt: z.string().optional(),
  createdAt: z.string(),
  expiresAt: z.string().optional(),
  actionUrl: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type InAppNotification = z.infer<typeof InAppNotificationSchema>;

export const NotificationFilterSchema = z.object({
  userId: z.string(),
  read: z.boolean().optional(),
  type: z.string().optional(),
  priority: NotificationPriorityEnum.optional(),
  since: z.string().optional(),
  limit: z.number().default(50),
  offset: z.number().default(0),
});
export type NotificationFilter = z.infer<typeof NotificationFilterSchema>;

// ---------------------------------------------------------------------------
// AN-002: Cross-Product Funnels
// ---------------------------------------------------------------------------

export const FunnelStepSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  order: z.number(),
});
export type FunnelStep = z.infer<typeof FunnelStepSchema>;

export const FunnelDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  steps: z.array(FunnelStepSchema).min(2),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type FunnelDefinition = z.infer<typeof FunnelDefinitionSchema>;

export const FunnelEventSchema = z.object({
  funnelId: z.string(),
  stepName: z.string(),
  userId: z.string(),
  sessionId: z.string().optional(),
  timestamp: z.string(),
  metadata: z.record(z.unknown()).optional(),
});
export type FunnelEvent = z.infer<typeof FunnelEventSchema>;

export const FunnelStepMetricsSchema = z.object({
  stepName: z.string(),
  uniqueUsers: z.number(),
  totalEvents: z.number(),
  conversionRate: z.number(),
  dropOffRate: z.number(),
  avgTimeFromPreviousMs: z.number().optional(),
});
export type FunnelStepMetrics = z.infer<typeof FunnelStepMetricsSchema>;

export const FunnelReportSchema = z.object({
  funnelId: z.string(),
  funnelName: z.string(),
  period: z.object({ start: z.string(), end: z.string() }),
  overallConversionRate: z.number(),
  steps: z.array(FunnelStepMetricsSchema),
  totalEntries: z.number(),
  totalCompletions: z.number(),
});
export type FunnelReport = z.infer<typeof FunnelReportSchema>;

// ---------------------------------------------------------------------------
// AN-003: Creative Performance Analytics
// ---------------------------------------------------------------------------

export const CreativeMetricsSchema = z.object({
  creativeId: z.string(),
  impressions: z.number().default(0),
  clicks: z.number().default(0),
  conversions: z.number().default(0),
  spend: z.number().default(0),
  revenue: z.number().default(0),
  ctr: z.number().default(0), // click-through rate
  cvr: z.number().default(0), // conversion rate
  roas: z.number().default(0), // return on ad spend
  engagementScore: z.number().default(0),
  performanceScore: z.number().default(0),
  timestamp: z.string(),
});
export type CreativeMetrics = z.infer<typeof CreativeMetricsSchema>;

export const ABComparisonSchema = z.object({
  variantA: z.object({ creativeId: z.string(), metrics: CreativeMetricsSchema }),
  variantB: z.object({ creativeId: z.string(), metrics: CreativeMetricsSchema }),
  winner: z.enum(['A', 'B', 'inconclusive']),
  confidenceLevel: z.number(),
  improvementPercent: z.number(),
  metric: z.string(),
  timestamp: z.string(),
});
export type ABComparison = z.infer<typeof ABComparisonSchema>;

// ---------------------------------------------------------------------------
// AN-004: PCT Feedback Loop
// ---------------------------------------------------------------------------

export const AdPerformanceDataSchema = z.object({
  adId: z.string(),
  creativeId: z.string(),
  campaignId: z.string(),
  impressions: z.number(),
  clicks: z.number(),
  conversions: z.number(),
  spend: z.number(),
  ctr: z.number(),
  cvr: z.number(),
  roas: z.number(),
  period: z.object({ start: z.string(), end: z.string() }),
});
export type AdPerformanceData = z.infer<typeof AdPerformanceDataSchema>;

export const OptimizationSuggestionSchema = z.object({
  id: z.string(),
  creativeId: z.string(),
  type: z.enum(['copy', 'visual', 'targeting', 'budget', 'schedule']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string(),
  description: z.string(),
  expectedImprovement: z.number().optional(), // percentage
  basedOn: z.string(), // what data the suggestion is based on
  createdAt: z.string(),
  status: z.enum(['pending', 'applied', 'dismissed']).default('pending'),
});
export type OptimizationSuggestion = z.infer<typeof OptimizationSuggestionSchema>;

// ---------------------------------------------------------------------------
// AN-005: TikTok Metrics Integration
// ---------------------------------------------------------------------------

export const TikTokVideoMetricsSchema = z.object({
  videoId: z.string(),
  viewCount: z.number().default(0),
  likeCount: z.number().default(0),
  commentCount: z.number().default(0),
  shareCount: z.number().default(0),
  saveCount: z.number().default(0),
  engagementRate: z.number().default(0),
  avgWatchTimeSeconds: z.number().default(0),
  completionRate: z.number().default(0),
  timestamp: z.string(),
});
export type TikTokVideoMetrics = z.infer<typeof TikTokVideoMetricsSchema>;

export const TikTokShopMetricsSchema = z.object({
  videoId: z.string(),
  productClicks: z.number().default(0),
  addToCartCount: z.number().default(0),
  purchaseCount: z.number().default(0),
  revenue: z.number().default(0),
  conversionRate: z.number().default(0),
  avgOrderValue: z.number().default(0),
  timestamp: z.string(),
});
export type TikTokShopMetrics = z.infer<typeof TikTokShopMetricsSchema>;

export const TikTokCombinedMetricsSchema = z.object({
  videoId: z.string(),
  video: TikTokVideoMetricsSchema,
  shop: TikTokShopMetricsSchema.optional(),
  fetchedAt: z.string(),
});
export type TikTokCombinedMetrics = z.infer<typeof TikTokCombinedMetricsSchema>;

// ---------------------------------------------------------------------------
// AN-006: Unified Analytics Dashboard
// ---------------------------------------------------------------------------

export const TimeSeriesPointSchema = z.object({
  timestamp: z.string(),
  value: z.number(),
  label: z.string().optional(),
});
export type TimeSeriesPoint = z.infer<typeof TimeSeriesPointSchema>;

export const TimeSeriesDataSchema = z.object({
  metric: z.string(),
  product: z.string().optional(),
  points: z.array(TimeSeriesPointSchema),
  aggregation: z.enum(['sum', 'avg', 'min', 'max', 'count']).default('sum'),
});
export type TimeSeriesData = z.infer<typeof TimeSeriesDataSchema>;

export const DashboardWidgetDataSchema = z.object({
  widgetId: z.string(),
  title: z.string(),
  type: z.enum(['metric', 'timeseries', 'table', 'pie', 'bar']),
  data: z.unknown(),
  updatedAt: z.string(),
});
export type DashboardWidgetData = z.infer<typeof DashboardWidgetDataSchema>;

export const AnalyticsDashboardConfigSchema = z.object({
  products: z.array(z.string()).default([]),
  metrics: z.array(z.string()).default([]),
  refreshIntervalMs: z.number().default(60_000),
  timeRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
});
export type AnalyticsDashboardConfig = z.infer<typeof AnalyticsDashboardConfigSchema>;

// ---------------------------------------------------------------------------
// GAP-004: Ad Insights
// ---------------------------------------------------------------------------

export const CampaignPerformanceSchema = z.object({
  campaignId: z.string(),
  campaignName: z.string(),
  status: z.enum(['active', 'paused', 'completed', 'draft']),
  impressions: z.number().default(0),
  clicks: z.number().default(0),
  conversions: z.number().default(0),
  spend: z.number().default(0),
  revenue: z.number().default(0),
  roas: z.number().default(0),
  ctr: z.number().default(0),
  cpc: z.number().default(0),
  cpa: z.number().default(0),
  period: z.object({ start: z.string(), end: z.string() }),
  updatedAt: z.string(),
});
export type CampaignPerformance = z.infer<typeof CampaignPerformanceSchema>;

export const AdInsightsSummarySchema = z.object({
  totalSpend: z.number(),
  totalRevenue: z.number(),
  overallRoas: z.number(),
  activeCampaigns: z.number(),
  topCampaigns: z.array(CampaignPerformanceSchema),
  period: z.object({ start: z.string(), end: z.string() }),
  generatedAt: z.string(),
});
export type AdInsightsSummary = z.infer<typeof AdInsightsSummarySchema>;

// ---------------------------------------------------------------------------
// GAP-007: Custom Audience Sync
// ---------------------------------------------------------------------------

export const AudienceSyncStatusEnum = z.enum([
  'pending',
  'syncing',
  'synced',
  'failed',
  'stale',
]);
export type AudienceSyncStatus = z.infer<typeof AudienceSyncStatusEnum>;

export const AudienceDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  rules: z.array(
    z.object({
      field: z.string(),
      operator: z.enum(['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'contains', 'in', 'not_in']),
      value: z.unknown(),
    })
  ),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type AudienceDefinition = z.infer<typeof AudienceDefinitionSchema>;

export const AudienceSyncRecordSchema = z.object({
  audienceId: z.string(),
  platform: z.string(),
  status: AudienceSyncStatusEnum,
  memberCount: z.number().default(0),
  lastSyncedAt: z.string().optional(),
  nextSyncAt: z.string().optional(),
  errorMessage: z.string().optional(),
  syncDurationMs: z.number().optional(),
});
export type AudienceSyncRecord = z.infer<typeof AudienceSyncRecordSchema>;
