"use strict";
/**
 * @module types
 * Centralized Zod schemas and TypeScript types for the monitoring package.
 * Covers logging, APM, health, rate-limits, costs, queues, sessions,
 * notifications (Slack, email, in-app), analytics (funnels, creative perf,
 * PCT feedback, TikTok metrics, dashboard), ad insights, and audience sync.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignPerformanceSchema = exports.AnalyticsDashboardConfigSchema = exports.DashboardWidgetDataSchema = exports.TimeSeriesDataSchema = exports.TimeSeriesPointSchema = exports.TikTokCombinedMetricsSchema = exports.TikTokShopMetricsSchema = exports.TikTokVideoMetricsSchema = exports.OptimizationSuggestionSchema = exports.AdPerformanceDataSchema = exports.ABComparisonSchema = exports.CreativeMetricsSchema = exports.FunnelReportSchema = exports.FunnelStepMetricsSchema = exports.FunnelEventSchema = exports.FunnelDefinitionSchema = exports.FunnelStepSchema = exports.NotificationFilterSchema = exports.InAppNotificationSchema = exports.NotificationPriorityEnum = exports.EmailResultSchema = exports.EmailConfigSchema = exports.EmailMessageSchema = exports.EmailRecipientSchema = exports.SlackConfigSchema = exports.SlackMessageSchema = exports.SlackBlockSchema = exports.SessionConfigSchema = exports.SessionStatsSchema = exports.SessionSchema = exports.QueueConfigSchema = exports.QueueAlertSchema = exports.QueueStatsSchema = exports.UsageReportSchema = exports.CostConfigSchema = exports.BudgetAlertSchema = exports.CostEntrySchema = exports.RateLimitConfigSchema = exports.RateLimitAlertSchema = exports.RateLimitEntrySchema = exports.HealthReportSchema = exports.ComponentHealthSchema = exports.ComponentStatusEnum = exports.ApmConfigSchema = exports.SpanSchema = exports.SpanStatusEnum = exports.LoggerConfigSchema = exports.LogEntrySchema = exports.LOG_LEVEL_PRIORITY = exports.LogLevelEnum = void 0;
exports.AudienceSyncRecordSchema = exports.AudienceDefinitionSchema = exports.AudienceSyncStatusEnum = exports.AdInsightsSummarySchema = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// MON-001: Logging
// ---------------------------------------------------------------------------
exports.LogLevelEnum = zod_1.z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']);
exports.LOG_LEVEL_PRIORITY = {
    trace: 0,
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    fatal: 50,
};
exports.LogEntrySchema = zod_1.z.object({
    timestamp: zod_1.z.string(),
    level: exports.LogLevelEnum,
    message: zod_1.z.string(),
    context: zod_1.z.record(zod_1.z.unknown()).optional(),
    error: zod_1.z
        .object({
        name: zod_1.z.string(),
        message: zod_1.z.string(),
        stack: zod_1.z.string().optional(),
    })
        .optional(),
    logger: zod_1.z.string().optional(),
});
exports.LoggerConfigSchema = zod_1.z.object({
    level: exports.LogLevelEnum.default('info'),
    name: zod_1.z.string().default('root'),
    context: zod_1.z.record(zod_1.z.unknown()).optional(),
    json: zod_1.z.boolean().default(true),
    pretty: zod_1.z.boolean().default(false),
});
// ---------------------------------------------------------------------------
// MON-002: APM / Performance Monitoring
// ---------------------------------------------------------------------------
exports.SpanStatusEnum = zod_1.z.enum(['ok', 'error', 'timeout']);
exports.SpanSchema = zod_1.z.object({
    traceId: zod_1.z.string(),
    spanId: zod_1.z.string(),
    parentSpanId: zod_1.z.string().optional(),
    name: zod_1.z.string(),
    service: zod_1.z.string(),
    startTime: zod_1.z.number(),
    endTime: zod_1.z.number().optional(),
    duration: zod_1.z.number().optional(),
    status: exports.SpanStatusEnum.default('ok'),
    attributes: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.ApmConfigSchema = zod_1.z.object({
    serviceName: zod_1.z.string(),
    sampleRate: zod_1.z.number().min(0).max(1).default(1.0),
    flushIntervalMs: zod_1.z.number().default(30000),
    maxSpans: zod_1.z.number().default(10000),
});
// ---------------------------------------------------------------------------
// MON-003: Health Checks
// ---------------------------------------------------------------------------
exports.ComponentStatusEnum = zod_1.z.enum(['healthy', 'degraded', 'unhealthy']);
exports.ComponentHealthSchema = zod_1.z.object({
    name: zod_1.z.string(),
    status: exports.ComponentStatusEnum,
    message: zod_1.z.string().optional(),
    lastChecked: zod_1.z.string(),
    responseTimeMs: zod_1.z.number().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.HealthReportSchema = zod_1.z.object({
    status: exports.ComponentStatusEnum,
    timestamp: zod_1.z.string(),
    uptime: zod_1.z.number(),
    components: zod_1.z.array(exports.ComponentHealthSchema),
    version: zod_1.z.string().optional(),
});
// ---------------------------------------------------------------------------
// MON-004: Rate Limit Monitoring
// ---------------------------------------------------------------------------
exports.RateLimitEntrySchema = zod_1.z.object({
    service: zod_1.z.string(),
    endpoint: zod_1.z.string().optional(),
    limit: zod_1.z.number(),
    remaining: zod_1.z.number(),
    resetAt: zod_1.z.string(),
    usagePercent: zod_1.z.number(),
    windowMs: zod_1.z.number().optional(),
});
exports.RateLimitAlertSchema = zod_1.z.object({
    service: zod_1.z.string(),
    endpoint: zod_1.z.string().optional(),
    usagePercent: zod_1.z.number(),
    limit: zod_1.z.number(),
    remaining: zod_1.z.number(),
    threshold: zod_1.z.number(),
    timestamp: zod_1.z.string(),
});
exports.RateLimitConfigSchema = zod_1.z.object({
    alertThreshold: zod_1.z.number().min(0).max(1).default(0.8),
    checkIntervalMs: zod_1.z.number().default(60000),
});
// ---------------------------------------------------------------------------
// MON-005: Cost Monitoring
// ---------------------------------------------------------------------------
exports.CostEntrySchema = zod_1.z.object({
    id: zod_1.z.string(),
    service: zod_1.z.string(),
    product: zod_1.z.string().optional(),
    amount: zod_1.z.number(),
    currency: zod_1.z.string().default('USD'),
    timestamp: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.BudgetAlertSchema = zod_1.z.object({
    service: zod_1.z.string(),
    product: zod_1.z.string().optional(),
    currentSpend: zod_1.z.number(),
    budgetLimit: zod_1.z.number(),
    usagePercent: zod_1.z.number(),
    period: zod_1.z.string(),
    timestamp: zod_1.z.string(),
});
exports.CostConfigSchema = zod_1.z.object({
    budgets: zod_1.z
        .array(zod_1.z.object({
        service: zod_1.z.string(),
        product: zod_1.z.string().optional(),
        limit: zod_1.z.number(),
        period: zod_1.z.enum(['hourly', 'daily', 'weekly', 'monthly']).default('monthly'),
        alertThreshold: zod_1.z.number().min(0).max(1).default(0.8),
    }))
        .default([]),
    defaultCurrency: zod_1.z.string().default('USD'),
});
exports.UsageReportSchema = zod_1.z.object({
    period: zod_1.z.string(),
    startDate: zod_1.z.string(),
    endDate: zod_1.z.string(),
    totalSpend: zod_1.z.number(),
    currency: zod_1.z.string(),
    byService: zod_1.z.record(zod_1.z.number()),
    byProduct: zod_1.z.record(zod_1.z.number()),
    entries: zod_1.z.array(exports.CostEntrySchema),
});
// ---------------------------------------------------------------------------
// MON-006: Queue Monitoring
// ---------------------------------------------------------------------------
exports.QueueStatsSchema = zod_1.z.object({
    name: zod_1.z.string(),
    depth: zod_1.z.number(),
    processingRate: zod_1.z.number(), // jobs per second
    failureRate: zod_1.z.number(), // failures per second
    avgProcessingTimeMs: zod_1.z.number(),
    oldestJobAge: zod_1.z.number().optional(), // ms
    staleThresholdMs: zod_1.z.number().default(300000), // 5 min
    hasStaleJobs: zod_1.z.boolean().default(false),
    lastUpdated: zod_1.z.string(),
});
exports.QueueAlertSchema = zod_1.z.object({
    queue: zod_1.z.string(),
    alertType: zod_1.z.enum(['depth_exceeded', 'high_failure_rate', 'stale_jobs', 'processing_slow']),
    message: zod_1.z.string(),
    value: zod_1.z.number(),
    threshold: zod_1.z.number(),
    timestamp: zod_1.z.string(),
});
exports.QueueConfigSchema = zod_1.z.object({
    depthThreshold: zod_1.z.number().default(1000),
    failureRateThreshold: zod_1.z.number().default(0.1),
    staleThresholdMs: zod_1.z.number().default(300000),
    processingTimeThresholdMs: zod_1.z.number().default(60000),
    checkIntervalMs: zod_1.z.number().default(30000),
});
// ---------------------------------------------------------------------------
// MON-007: Session Monitoring
// ---------------------------------------------------------------------------
exports.SessionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    userId: zod_1.z.string(),
    startedAt: zod_1.z.string(),
    lastActivityAt: zod_1.z.string(),
    endedAt: zod_1.z.string().optional(),
    durationMs: zod_1.z.number().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.SessionStatsSchema = zod_1.z.object({
    activeSessions: zod_1.z.number(),
    totalSessions: zod_1.z.number(),
    avgDurationMs: zod_1.z.number(),
    concurrentPeak: zod_1.z.number(),
    sessionsByUser: zod_1.z.record(zod_1.z.number()),
    timestamp: zod_1.z.string(),
});
exports.SessionConfigSchema = zod_1.z.object({
    maxConcurrentSessions: zod_1.z.number().default(100),
    maxSessionsPerUser: zod_1.z.number().default(5),
    sessionTimeoutMs: zod_1.z.number().default(3600000), // 1 hour
    cleanupIntervalMs: zod_1.z.number().default(60000),
});
// ---------------------------------------------------------------------------
// NOTIFY-001: Slack Notifications
// ---------------------------------------------------------------------------
exports.SlackBlockSchema = zod_1.z.lazy(() => zod_1.z.object({
    type: zod_1.z.enum(['section', 'divider', 'header', 'context', 'actions', 'image']),
    text: zod_1.z
        .object({
        type: zod_1.z.enum(['plain_text', 'mrkdwn']),
        text: zod_1.z.string(),
    })
        .optional(),
    fields: zod_1.z
        .array(zod_1.z.object({
        type: zod_1.z.enum(['plain_text', 'mrkdwn']),
        text: zod_1.z.string(),
    }))
        .optional(),
    elements: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).optional(),
    accessory: zod_1.z.record(zod_1.z.unknown()).optional(),
}));
exports.SlackMessageSchema = zod_1.z.object({
    channel: zod_1.z.string(),
    text: zod_1.z.string(),
    blocks: zod_1.z.array(exports.SlackBlockSchema).optional(),
    threadTs: zod_1.z.string().optional(),
    unfurlLinks: zod_1.z.boolean().default(false),
});
exports.SlackConfigSchema = zod_1.z.object({
    webhookUrl: zod_1.z.string().url().optional(),
    defaultChannel: zod_1.z.string().default('#general'),
    channelRouting: zod_1.z
        .record(zod_1.z.string()) // category -> channel
        .default({}),
    enabled: zod_1.z.boolean().default(true),
    rateLimitPerMinute: zod_1.z.number().default(30),
});
// ---------------------------------------------------------------------------
// NOTIFY-002: Email Notifications
// ---------------------------------------------------------------------------
exports.EmailRecipientSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    name: zod_1.z.string().optional(),
});
exports.EmailMessageSchema = zod_1.z.object({
    to: zod_1.z.array(exports.EmailRecipientSchema).min(1),
    cc: zod_1.z.array(exports.EmailRecipientSchema).optional(),
    bcc: zod_1.z.array(exports.EmailRecipientSchema).optional(),
    from: exports.EmailRecipientSchema.optional(),
    replyTo: exports.EmailRecipientSchema.optional(),
    subject: zod_1.z.string(),
    template: zod_1.z.string().optional(),
    templateData: zod_1.z.record(zod_1.z.unknown()).optional(),
    html: zod_1.z.string().optional(),
    text: zod_1.z.string().optional(),
    unsubscribeUrl: zod_1.z.string().optional(),
    headers: zod_1.z.record(zod_1.z.string()).optional(),
});
exports.EmailConfigSchema = zod_1.z.object({
    provider: zod_1.z.enum(['smtp', 'resend', 'mock']).default('mock'),
    from: exports.EmailRecipientSchema.optional(),
    smtpHost: zod_1.z.string().optional(),
    smtpPort: zod_1.z.number().optional(),
    smtpUser: zod_1.z.string().optional(),
    smtpPass: zod_1.z.string().optional(),
    resendApiKey: zod_1.z.string().optional(),
    unsubscribeBaseUrl: zod_1.z.string().optional(),
    enabled: zod_1.z.boolean().default(true),
});
exports.EmailResultSchema = zod_1.z.object({
    messageId: zod_1.z.string(),
    accepted: zod_1.z.array(zod_1.z.string()),
    rejected: zod_1.z.array(zod_1.z.string()),
    timestamp: zod_1.z.string(),
});
// ---------------------------------------------------------------------------
// NOTIFY-003: In-App Notifications
// ---------------------------------------------------------------------------
exports.NotificationPriorityEnum = zod_1.z.enum(['low', 'normal', 'high', 'urgent']);
exports.InAppNotificationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    userId: zod_1.z.string(),
    title: zod_1.z.string(),
    body: zod_1.z.string(),
    type: zod_1.z.string().default('info'),
    priority: exports.NotificationPriorityEnum.default('normal'),
    read: zod_1.z.boolean().default(false),
    readAt: zod_1.z.string().optional(),
    createdAt: zod_1.z.string(),
    expiresAt: zod_1.z.string().optional(),
    actionUrl: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.NotificationFilterSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    read: zod_1.z.boolean().optional(),
    type: zod_1.z.string().optional(),
    priority: exports.NotificationPriorityEnum.optional(),
    since: zod_1.z.string().optional(),
    limit: zod_1.z.number().default(50),
    offset: zod_1.z.number().default(0),
});
// ---------------------------------------------------------------------------
// AN-002: Cross-Product Funnels
// ---------------------------------------------------------------------------
exports.FunnelStepSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    order: zod_1.z.number(),
});
exports.FunnelDefinitionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    steps: zod_1.z.array(exports.FunnelStepSchema).min(2),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string().optional(),
});
exports.FunnelEventSchema = zod_1.z.object({
    funnelId: zod_1.z.string(),
    stepName: zod_1.z.string(),
    userId: zod_1.z.string(),
    sessionId: zod_1.z.string().optional(),
    timestamp: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.FunnelStepMetricsSchema = zod_1.z.object({
    stepName: zod_1.z.string(),
    uniqueUsers: zod_1.z.number(),
    totalEvents: zod_1.z.number(),
    conversionRate: zod_1.z.number(),
    dropOffRate: zod_1.z.number(),
    avgTimeFromPreviousMs: zod_1.z.number().optional(),
});
exports.FunnelReportSchema = zod_1.z.object({
    funnelId: zod_1.z.string(),
    funnelName: zod_1.z.string(),
    period: zod_1.z.object({ start: zod_1.z.string(), end: zod_1.z.string() }),
    overallConversionRate: zod_1.z.number(),
    steps: zod_1.z.array(exports.FunnelStepMetricsSchema),
    totalEntries: zod_1.z.number(),
    totalCompletions: zod_1.z.number(),
});
// ---------------------------------------------------------------------------
// AN-003: Creative Performance Analytics
// ---------------------------------------------------------------------------
exports.CreativeMetricsSchema = zod_1.z.object({
    creativeId: zod_1.z.string(),
    impressions: zod_1.z.number().default(0),
    clicks: zod_1.z.number().default(0),
    conversions: zod_1.z.number().default(0),
    spend: zod_1.z.number().default(0),
    revenue: zod_1.z.number().default(0),
    ctr: zod_1.z.number().default(0), // click-through rate
    cvr: zod_1.z.number().default(0), // conversion rate
    roas: zod_1.z.number().default(0), // return on ad spend
    engagementScore: zod_1.z.number().default(0),
    performanceScore: zod_1.z.number().default(0),
    timestamp: zod_1.z.string(),
});
exports.ABComparisonSchema = zod_1.z.object({
    variantA: zod_1.z.object({ creativeId: zod_1.z.string(), metrics: exports.CreativeMetricsSchema }),
    variantB: zod_1.z.object({ creativeId: zod_1.z.string(), metrics: exports.CreativeMetricsSchema }),
    winner: zod_1.z.enum(['A', 'B', 'inconclusive']),
    confidenceLevel: zod_1.z.number(),
    improvementPercent: zod_1.z.number(),
    metric: zod_1.z.string(),
    timestamp: zod_1.z.string(),
});
// ---------------------------------------------------------------------------
// AN-004: PCT Feedback Loop
// ---------------------------------------------------------------------------
exports.AdPerformanceDataSchema = zod_1.z.object({
    adId: zod_1.z.string(),
    creativeId: zod_1.z.string(),
    campaignId: zod_1.z.string(),
    impressions: zod_1.z.number(),
    clicks: zod_1.z.number(),
    conversions: zod_1.z.number(),
    spend: zod_1.z.number(),
    ctr: zod_1.z.number(),
    cvr: zod_1.z.number(),
    roas: zod_1.z.number(),
    period: zod_1.z.object({ start: zod_1.z.string(), end: zod_1.z.string() }),
});
exports.OptimizationSuggestionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    creativeId: zod_1.z.string(),
    type: zod_1.z.enum(['copy', 'visual', 'targeting', 'budget', 'schedule']),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    expectedImprovement: zod_1.z.number().optional(), // percentage
    basedOn: zod_1.z.string(), // what data the suggestion is based on
    createdAt: zod_1.z.string(),
    status: zod_1.z.enum(['pending', 'applied', 'dismissed']).default('pending'),
});
// ---------------------------------------------------------------------------
// AN-005: TikTok Metrics Integration
// ---------------------------------------------------------------------------
exports.TikTokVideoMetricsSchema = zod_1.z.object({
    videoId: zod_1.z.string(),
    viewCount: zod_1.z.number().default(0),
    likeCount: zod_1.z.number().default(0),
    commentCount: zod_1.z.number().default(0),
    shareCount: zod_1.z.number().default(0),
    saveCount: zod_1.z.number().default(0),
    engagementRate: zod_1.z.number().default(0),
    avgWatchTimeSeconds: zod_1.z.number().default(0),
    completionRate: zod_1.z.number().default(0),
    timestamp: zod_1.z.string(),
});
exports.TikTokShopMetricsSchema = zod_1.z.object({
    videoId: zod_1.z.string(),
    productClicks: zod_1.z.number().default(0),
    addToCartCount: zod_1.z.number().default(0),
    purchaseCount: zod_1.z.number().default(0),
    revenue: zod_1.z.number().default(0),
    conversionRate: zod_1.z.number().default(0),
    avgOrderValue: zod_1.z.number().default(0),
    timestamp: zod_1.z.string(),
});
exports.TikTokCombinedMetricsSchema = zod_1.z.object({
    videoId: zod_1.z.string(),
    video: exports.TikTokVideoMetricsSchema,
    shop: exports.TikTokShopMetricsSchema.optional(),
    fetchedAt: zod_1.z.string(),
});
// ---------------------------------------------------------------------------
// AN-006: Unified Analytics Dashboard
// ---------------------------------------------------------------------------
exports.TimeSeriesPointSchema = zod_1.z.object({
    timestamp: zod_1.z.string(),
    value: zod_1.z.number(),
    label: zod_1.z.string().optional(),
});
exports.TimeSeriesDataSchema = zod_1.z.object({
    metric: zod_1.z.string(),
    product: zod_1.z.string().optional(),
    points: zod_1.z.array(exports.TimeSeriesPointSchema),
    aggregation: zod_1.z.enum(['sum', 'avg', 'min', 'max', 'count']).default('sum'),
});
exports.DashboardWidgetDataSchema = zod_1.z.object({
    widgetId: zod_1.z.string(),
    title: zod_1.z.string(),
    type: zod_1.z.enum(['metric', 'timeseries', 'table', 'pie', 'bar']),
    data: zod_1.z.unknown(),
    updatedAt: zod_1.z.string(),
});
exports.AnalyticsDashboardConfigSchema = zod_1.z.object({
    products: zod_1.z.array(zod_1.z.string()).default([]),
    metrics: zod_1.z.array(zod_1.z.string()).default([]),
    refreshIntervalMs: zod_1.z.number().default(60000),
    timeRange: zod_1.z.object({
        start: zod_1.z.string(),
        end: zod_1.z.string(),
    }).optional(),
});
// ---------------------------------------------------------------------------
// GAP-004: Ad Insights
// ---------------------------------------------------------------------------
exports.CampaignPerformanceSchema = zod_1.z.object({
    campaignId: zod_1.z.string(),
    campaignName: zod_1.z.string(),
    status: zod_1.z.enum(['active', 'paused', 'completed', 'draft']),
    impressions: zod_1.z.number().default(0),
    clicks: zod_1.z.number().default(0),
    conversions: zod_1.z.number().default(0),
    spend: zod_1.z.number().default(0),
    revenue: zod_1.z.number().default(0),
    roas: zod_1.z.number().default(0),
    ctr: zod_1.z.number().default(0),
    cpc: zod_1.z.number().default(0),
    cpa: zod_1.z.number().default(0),
    period: zod_1.z.object({ start: zod_1.z.string(), end: zod_1.z.string() }),
    updatedAt: zod_1.z.string(),
});
exports.AdInsightsSummarySchema = zod_1.z.object({
    totalSpend: zod_1.z.number(),
    totalRevenue: zod_1.z.number(),
    overallRoas: zod_1.z.number(),
    activeCampaigns: zod_1.z.number(),
    topCampaigns: zod_1.z.array(exports.CampaignPerformanceSchema),
    period: zod_1.z.object({ start: zod_1.z.string(), end: zod_1.z.string() }),
    generatedAt: zod_1.z.string(),
});
// ---------------------------------------------------------------------------
// GAP-007: Custom Audience Sync
// ---------------------------------------------------------------------------
exports.AudienceSyncStatusEnum = zod_1.z.enum([
    'pending',
    'syncing',
    'synced',
    'failed',
    'stale',
]);
exports.AudienceDefinitionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    rules: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        operator: zod_1.z.enum(['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'contains', 'in', 'not_in']),
        value: zod_1.z.unknown(),
    })),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string().optional(),
});
exports.AudienceSyncRecordSchema = zod_1.z.object({
    audienceId: zod_1.z.string(),
    platform: zod_1.z.string(),
    status: exports.AudienceSyncStatusEnum,
    memberCount: zod_1.z.number().default(0),
    lastSyncedAt: zod_1.z.string().optional(),
    nextSyncAt: zod_1.z.string().optional(),
    errorMessage: zod_1.z.string().optional(),
    syncDurationMs: zod_1.z.number().optional(),
});
//# sourceMappingURL=types.js.map