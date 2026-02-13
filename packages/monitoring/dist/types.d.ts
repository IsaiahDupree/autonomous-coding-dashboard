/**
 * @module types
 * Centralized Zod schemas and TypeScript types for the monitoring package.
 * Covers logging, APM, health, rate-limits, costs, queues, sessions,
 * notifications (Slack, email, in-app), analytics (funnels, creative perf,
 * PCT feedback, TikTok metrics, dashboard), ad insights, and audience sync.
 */
import { z } from 'zod';
export declare const LogLevelEnum: z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal"]>;
export type LogLevel = z.infer<typeof LogLevelEnum>;
export declare const LOG_LEVEL_PRIORITY: Record<LogLevel, number>;
export declare const LogEntrySchema: z.ZodObject<{
    timestamp: z.ZodString;
    level: z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal"]>;
    message: z.ZodString;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    error: z.ZodOptional<z.ZodObject<{
        name: z.ZodString;
        message: z.ZodString;
        stack: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        name: string;
        stack?: string | undefined;
    }, {
        message: string;
        name: string;
        stack?: string | undefined;
    }>>;
    logger: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    timestamp: string;
    level: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
    error?: {
        message: string;
        name: string;
        stack?: string | undefined;
    } | undefined;
    context?: Record<string, unknown> | undefined;
    logger?: string | undefined;
}, {
    message: string;
    timestamp: string;
    level: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
    error?: {
        message: string;
        name: string;
        stack?: string | undefined;
    } | undefined;
    context?: Record<string, unknown> | undefined;
    logger?: string | undefined;
}>;
export type LogEntry = z.infer<typeof LogEntrySchema>;
export declare const LoggerConfigSchema: z.ZodObject<{
    level: z.ZodDefault<z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal"]>>;
    name: z.ZodDefault<z.ZodString>;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    json: z.ZodDefault<z.ZodBoolean>;
    pretty: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    level: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
    name: string;
    json: boolean;
    pretty: boolean;
    context?: Record<string, unknown> | undefined;
}, {
    level?: "trace" | "debug" | "info" | "warn" | "error" | "fatal" | undefined;
    context?: Record<string, unknown> | undefined;
    name?: string | undefined;
    json?: boolean | undefined;
    pretty?: boolean | undefined;
}>;
export type LoggerConfig = z.infer<typeof LoggerConfigSchema>;
export declare const SpanStatusEnum: z.ZodEnum<["ok", "error", "timeout"]>;
export type SpanStatus = z.infer<typeof SpanStatusEnum>;
export declare const SpanSchema: z.ZodObject<{
    traceId: z.ZodString;
    spanId: z.ZodString;
    parentSpanId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    service: z.ZodString;
    startTime: z.ZodNumber;
    endTime: z.ZodOptional<z.ZodNumber>;
    duration: z.ZodOptional<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<["ok", "error", "timeout"]>>;
    attributes: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status: "error" | "ok" | "timeout";
    name: string;
    traceId: string;
    spanId: string;
    service: string;
    startTime: number;
    parentSpanId?: string | undefined;
    endTime?: number | undefined;
    duration?: number | undefined;
    attributes?: Record<string, unknown> | undefined;
}, {
    name: string;
    traceId: string;
    spanId: string;
    service: string;
    startTime: number;
    status?: "error" | "ok" | "timeout" | undefined;
    parentSpanId?: string | undefined;
    endTime?: number | undefined;
    duration?: number | undefined;
    attributes?: Record<string, unknown> | undefined;
}>;
export type Span = z.infer<typeof SpanSchema>;
export declare const ApmConfigSchema: z.ZodObject<{
    serviceName: z.ZodString;
    sampleRate: z.ZodDefault<z.ZodNumber>;
    flushIntervalMs: z.ZodDefault<z.ZodNumber>;
    maxSpans: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    serviceName: string;
    sampleRate: number;
    flushIntervalMs: number;
    maxSpans: number;
}, {
    serviceName: string;
    sampleRate?: number | undefined;
    flushIntervalMs?: number | undefined;
    maxSpans?: number | undefined;
}>;
export type ApmConfig = z.infer<typeof ApmConfigSchema>;
export declare const ComponentStatusEnum: z.ZodEnum<["healthy", "degraded", "unhealthy"]>;
export type ComponentStatus = z.infer<typeof ComponentStatusEnum>;
export declare const ComponentHealthSchema: z.ZodObject<{
    name: z.ZodString;
    status: z.ZodEnum<["healthy", "degraded", "unhealthy"]>;
    message: z.ZodOptional<z.ZodString>;
    lastChecked: z.ZodString;
    responseTimeMs: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status: "healthy" | "degraded" | "unhealthy";
    name: string;
    lastChecked: string;
    message?: string | undefined;
    responseTimeMs?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status: "healthy" | "degraded" | "unhealthy";
    name: string;
    lastChecked: string;
    message?: string | undefined;
    responseTimeMs?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type ComponentHealth = z.infer<typeof ComponentHealthSchema>;
export declare const HealthReportSchema: z.ZodObject<{
    status: z.ZodEnum<["healthy", "degraded", "unhealthy"]>;
    timestamp: z.ZodString;
    uptime: z.ZodNumber;
    components: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        status: z.ZodEnum<["healthy", "degraded", "unhealthy"]>;
        message: z.ZodOptional<z.ZodString>;
        lastChecked: z.ZodString;
        responseTimeMs: z.ZodOptional<z.ZodNumber>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        status: "healthy" | "degraded" | "unhealthy";
        name: string;
        lastChecked: string;
        message?: string | undefined;
        responseTimeMs?: number | undefined;
        metadata?: Record<string, unknown> | undefined;
    }, {
        status: "healthy" | "degraded" | "unhealthy";
        name: string;
        lastChecked: string;
        message?: string | undefined;
        responseTimeMs?: number | undefined;
        metadata?: Record<string, unknown> | undefined;
    }>, "many">;
    version: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    uptime: number;
    components: {
        status: "healthy" | "degraded" | "unhealthy";
        name: string;
        lastChecked: string;
        message?: string | undefined;
        responseTimeMs?: number | undefined;
        metadata?: Record<string, unknown> | undefined;
    }[];
    version?: string | undefined;
}, {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    uptime: number;
    components: {
        status: "healthy" | "degraded" | "unhealthy";
        name: string;
        lastChecked: string;
        message?: string | undefined;
        responseTimeMs?: number | undefined;
        metadata?: Record<string, unknown> | undefined;
    }[];
    version?: string | undefined;
}>;
export type HealthReport = z.infer<typeof HealthReportSchema>;
export declare const RateLimitEntrySchema: z.ZodObject<{
    service: z.ZodString;
    endpoint: z.ZodOptional<z.ZodString>;
    limit: z.ZodNumber;
    remaining: z.ZodNumber;
    resetAt: z.ZodString;
    usagePercent: z.ZodNumber;
    windowMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    service: string;
    limit: number;
    remaining: number;
    resetAt: string;
    usagePercent: number;
    endpoint?: string | undefined;
    windowMs?: number | undefined;
}, {
    service: string;
    limit: number;
    remaining: number;
    resetAt: string;
    usagePercent: number;
    endpoint?: string | undefined;
    windowMs?: number | undefined;
}>;
export type RateLimitEntry = z.infer<typeof RateLimitEntrySchema>;
export declare const RateLimitAlertSchema: z.ZodObject<{
    service: z.ZodString;
    endpoint: z.ZodOptional<z.ZodString>;
    usagePercent: z.ZodNumber;
    limit: z.ZodNumber;
    remaining: z.ZodNumber;
    threshold: z.ZodNumber;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    service: string;
    limit: number;
    remaining: number;
    usagePercent: number;
    threshold: number;
    endpoint?: string | undefined;
}, {
    timestamp: string;
    service: string;
    limit: number;
    remaining: number;
    usagePercent: number;
    threshold: number;
    endpoint?: string | undefined;
}>;
export type RateLimitAlert = z.infer<typeof RateLimitAlertSchema>;
export declare const RateLimitConfigSchema: z.ZodObject<{
    alertThreshold: z.ZodDefault<z.ZodNumber>;
    checkIntervalMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    alertThreshold: number;
    checkIntervalMs: number;
}, {
    alertThreshold?: number | undefined;
    checkIntervalMs?: number | undefined;
}>;
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
export declare const CostEntrySchema: z.ZodObject<{
    id: z.ZodString;
    service: z.ZodString;
    product: z.ZodOptional<z.ZodString>;
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    service: string;
    id: string;
    amount: number;
    currency: string;
    metadata?: Record<string, unknown> | undefined;
    product?: string | undefined;
}, {
    timestamp: string;
    service: string;
    id: string;
    amount: number;
    metadata?: Record<string, unknown> | undefined;
    product?: string | undefined;
    currency?: string | undefined;
}>;
export type CostEntry = z.infer<typeof CostEntrySchema>;
export declare const BudgetAlertSchema: z.ZodObject<{
    service: z.ZodString;
    product: z.ZodOptional<z.ZodString>;
    currentSpend: z.ZodNumber;
    budgetLimit: z.ZodNumber;
    usagePercent: z.ZodNumber;
    period: z.ZodString;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    service: string;
    usagePercent: number;
    currentSpend: number;
    budgetLimit: number;
    period: string;
    product?: string | undefined;
}, {
    timestamp: string;
    service: string;
    usagePercent: number;
    currentSpend: number;
    budgetLimit: number;
    period: string;
    product?: string | undefined;
}>;
export type BudgetAlert = z.infer<typeof BudgetAlertSchema>;
export declare const CostConfigSchema: z.ZodObject<{
    budgets: z.ZodDefault<z.ZodArray<z.ZodObject<{
        service: z.ZodString;
        product: z.ZodOptional<z.ZodString>;
        limit: z.ZodNumber;
        period: z.ZodDefault<z.ZodEnum<["hourly", "daily", "weekly", "monthly"]>>;
        alertThreshold: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        service: string;
        limit: number;
        alertThreshold: number;
        period: "hourly" | "daily" | "weekly" | "monthly";
        product?: string | undefined;
    }, {
        service: string;
        limit: number;
        alertThreshold?: number | undefined;
        product?: string | undefined;
        period?: "hourly" | "daily" | "weekly" | "monthly" | undefined;
    }>, "many">>;
    defaultCurrency: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    budgets: {
        service: string;
        limit: number;
        alertThreshold: number;
        period: "hourly" | "daily" | "weekly" | "monthly";
        product?: string | undefined;
    }[];
    defaultCurrency: string;
}, {
    budgets?: {
        service: string;
        limit: number;
        alertThreshold?: number | undefined;
        product?: string | undefined;
        period?: "hourly" | "daily" | "weekly" | "monthly" | undefined;
    }[] | undefined;
    defaultCurrency?: string | undefined;
}>;
export type CostConfig = z.infer<typeof CostConfigSchema>;
export declare const UsageReportSchema: z.ZodObject<{
    period: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodString;
    totalSpend: z.ZodNumber;
    currency: z.ZodString;
    byService: z.ZodRecord<z.ZodString, z.ZodNumber>;
    byProduct: z.ZodRecord<z.ZodString, z.ZodNumber>;
    entries: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        service: z.ZodString;
        product: z.ZodOptional<z.ZodString>;
        amount: z.ZodNumber;
        currency: z.ZodDefault<z.ZodString>;
        timestamp: z.ZodString;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        service: string;
        id: string;
        amount: number;
        currency: string;
        metadata?: Record<string, unknown> | undefined;
        product?: string | undefined;
    }, {
        timestamp: string;
        service: string;
        id: string;
        amount: number;
        metadata?: Record<string, unknown> | undefined;
        product?: string | undefined;
        currency?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    entries: {
        timestamp: string;
        service: string;
        id: string;
        amount: number;
        currency: string;
        metadata?: Record<string, unknown> | undefined;
        product?: string | undefined;
    }[];
    currency: string;
    period: string;
    startDate: string;
    endDate: string;
    totalSpend: number;
    byService: Record<string, number>;
    byProduct: Record<string, number>;
}, {
    entries: {
        timestamp: string;
        service: string;
        id: string;
        amount: number;
        metadata?: Record<string, unknown> | undefined;
        product?: string | undefined;
        currency?: string | undefined;
    }[];
    currency: string;
    period: string;
    startDate: string;
    endDate: string;
    totalSpend: number;
    byService: Record<string, number>;
    byProduct: Record<string, number>;
}>;
export type UsageReport = z.infer<typeof UsageReportSchema>;
export declare const QueueStatsSchema: z.ZodObject<{
    name: z.ZodString;
    depth: z.ZodNumber;
    processingRate: z.ZodNumber;
    failureRate: z.ZodNumber;
    avgProcessingTimeMs: z.ZodNumber;
    oldestJobAge: z.ZodOptional<z.ZodNumber>;
    staleThresholdMs: z.ZodDefault<z.ZodNumber>;
    hasStaleJobs: z.ZodDefault<z.ZodBoolean>;
    lastUpdated: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    depth: number;
    processingRate: number;
    failureRate: number;
    avgProcessingTimeMs: number;
    staleThresholdMs: number;
    hasStaleJobs: boolean;
    lastUpdated: string;
    oldestJobAge?: number | undefined;
}, {
    name: string;
    depth: number;
    processingRate: number;
    failureRate: number;
    avgProcessingTimeMs: number;
    lastUpdated: string;
    oldestJobAge?: number | undefined;
    staleThresholdMs?: number | undefined;
    hasStaleJobs?: boolean | undefined;
}>;
export type QueueStats = z.infer<typeof QueueStatsSchema>;
export declare const QueueAlertSchema: z.ZodObject<{
    queue: z.ZodString;
    alertType: z.ZodEnum<["depth_exceeded", "high_failure_rate", "stale_jobs", "processing_slow"]>;
    message: z.ZodString;
    value: z.ZodNumber;
    threshold: z.ZodNumber;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: number;
    message: string;
    timestamp: string;
    threshold: number;
    queue: string;
    alertType: "depth_exceeded" | "high_failure_rate" | "stale_jobs" | "processing_slow";
}, {
    value: number;
    message: string;
    timestamp: string;
    threshold: number;
    queue: string;
    alertType: "depth_exceeded" | "high_failure_rate" | "stale_jobs" | "processing_slow";
}>;
export type QueueAlert = z.infer<typeof QueueAlertSchema>;
export declare const QueueConfigSchema: z.ZodObject<{
    depthThreshold: z.ZodDefault<z.ZodNumber>;
    failureRateThreshold: z.ZodDefault<z.ZodNumber>;
    staleThresholdMs: z.ZodDefault<z.ZodNumber>;
    processingTimeThresholdMs: z.ZodDefault<z.ZodNumber>;
    checkIntervalMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    checkIntervalMs: number;
    staleThresholdMs: number;
    depthThreshold: number;
    failureRateThreshold: number;
    processingTimeThresholdMs: number;
}, {
    checkIntervalMs?: number | undefined;
    staleThresholdMs?: number | undefined;
    depthThreshold?: number | undefined;
    failureRateThreshold?: number | undefined;
    processingTimeThresholdMs?: number | undefined;
}>;
export type QueueConfig = z.infer<typeof QueueConfigSchema>;
export declare const SessionSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    startedAt: z.ZodString;
    lastActivityAt: z.ZodString;
    endedAt: z.ZodOptional<z.ZodString>;
    durationMs: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    userId: string;
    startedAt: string;
    lastActivityAt: string;
    metadata?: Record<string, unknown> | undefined;
    endedAt?: string | undefined;
    durationMs?: number | undefined;
}, {
    id: string;
    userId: string;
    startedAt: string;
    lastActivityAt: string;
    metadata?: Record<string, unknown> | undefined;
    endedAt?: string | undefined;
    durationMs?: number | undefined;
}>;
export type Session = z.infer<typeof SessionSchema>;
export declare const SessionStatsSchema: z.ZodObject<{
    activeSessions: z.ZodNumber;
    totalSessions: z.ZodNumber;
    avgDurationMs: z.ZodNumber;
    concurrentPeak: z.ZodNumber;
    sessionsByUser: z.ZodRecord<z.ZodString, z.ZodNumber>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    activeSessions: number;
    totalSessions: number;
    avgDurationMs: number;
    concurrentPeak: number;
    sessionsByUser: Record<string, number>;
}, {
    timestamp: string;
    activeSessions: number;
    totalSessions: number;
    avgDurationMs: number;
    concurrentPeak: number;
    sessionsByUser: Record<string, number>;
}>;
export type SessionStats = z.infer<typeof SessionStatsSchema>;
export declare const SessionConfigSchema: z.ZodObject<{
    maxConcurrentSessions: z.ZodDefault<z.ZodNumber>;
    maxSessionsPerUser: z.ZodDefault<z.ZodNumber>;
    sessionTimeoutMs: z.ZodDefault<z.ZodNumber>;
    cleanupIntervalMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    maxConcurrentSessions: number;
    maxSessionsPerUser: number;
    sessionTimeoutMs: number;
    cleanupIntervalMs: number;
}, {
    maxConcurrentSessions?: number | undefined;
    maxSessionsPerUser?: number | undefined;
    sessionTimeoutMs?: number | undefined;
    cleanupIntervalMs?: number | undefined;
}>;
export type SessionConfig = z.infer<typeof SessionConfigSchema>;
export declare const SlackBlockSchema: z.ZodType<SlackBlock>;
export interface SlackBlock {
    type: 'section' | 'divider' | 'header' | 'context' | 'actions' | 'image';
    text?: {
        type: 'plain_text' | 'mrkdwn';
        text: string;
    };
    fields?: Array<{
        type: 'plain_text' | 'mrkdwn';
        text: string;
    }>;
    elements?: Array<Record<string, unknown>>;
    accessory?: Record<string, unknown>;
}
export declare const SlackMessageSchema: z.ZodObject<{
    channel: z.ZodString;
    text: z.ZodString;
    blocks: z.ZodOptional<z.ZodArray<z.ZodType<SlackBlock, z.ZodTypeDef, SlackBlock>, "many">>;
    threadTs: z.ZodOptional<z.ZodString>;
    unfurlLinks: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    text: string;
    channel: string;
    unfurlLinks: boolean;
    blocks?: SlackBlock[] | undefined;
    threadTs?: string | undefined;
}, {
    text: string;
    channel: string;
    blocks?: SlackBlock[] | undefined;
    threadTs?: string | undefined;
    unfurlLinks?: boolean | undefined;
}>;
export type SlackMessage = z.infer<typeof SlackMessageSchema>;
export declare const SlackConfigSchema: z.ZodObject<{
    webhookUrl: z.ZodOptional<z.ZodString>;
    defaultChannel: z.ZodDefault<z.ZodString>;
    channelRouting: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    rateLimitPerMinute: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    defaultChannel: string;
    channelRouting: Record<string, string>;
    enabled: boolean;
    rateLimitPerMinute: number;
    webhookUrl?: string | undefined;
}, {
    webhookUrl?: string | undefined;
    defaultChannel?: string | undefined;
    channelRouting?: Record<string, string> | undefined;
    enabled?: boolean | undefined;
    rateLimitPerMinute?: number | undefined;
}>;
export type SlackConfig = z.infer<typeof SlackConfigSchema>;
export declare const EmailRecipientSchema: z.ZodObject<{
    email: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    name?: string | undefined;
}, {
    email: string;
    name?: string | undefined;
}>;
export type EmailRecipient = z.infer<typeof EmailRecipientSchema>;
export declare const EmailMessageSchema: z.ZodObject<{
    to: z.ZodArray<z.ZodObject<{
        email: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        name?: string | undefined;
    }, {
        email: string;
        name?: string | undefined;
    }>, "many">;
    cc: z.ZodOptional<z.ZodArray<z.ZodObject<{
        email: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        name?: string | undefined;
    }, {
        email: string;
        name?: string | undefined;
    }>, "many">>;
    bcc: z.ZodOptional<z.ZodArray<z.ZodObject<{
        email: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        name?: string | undefined;
    }, {
        email: string;
        name?: string | undefined;
    }>, "many">>;
    from: z.ZodOptional<z.ZodObject<{
        email: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        name?: string | undefined;
    }, {
        email: string;
        name?: string | undefined;
    }>>;
    replyTo: z.ZodOptional<z.ZodObject<{
        email: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        name?: string | undefined;
    }, {
        email: string;
        name?: string | undefined;
    }>>;
    subject: z.ZodString;
    template: z.ZodOptional<z.ZodString>;
    templateData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    html: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodString>;
    unsubscribeUrl: z.ZodOptional<z.ZodString>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    to: {
        email: string;
        name?: string | undefined;
    }[];
    subject: string;
    text?: string | undefined;
    cc?: {
        email: string;
        name?: string | undefined;
    }[] | undefined;
    bcc?: {
        email: string;
        name?: string | undefined;
    }[] | undefined;
    from?: {
        email: string;
        name?: string | undefined;
    } | undefined;
    replyTo?: {
        email: string;
        name?: string | undefined;
    } | undefined;
    template?: string | undefined;
    templateData?: Record<string, unknown> | undefined;
    html?: string | undefined;
    unsubscribeUrl?: string | undefined;
    headers?: Record<string, string> | undefined;
}, {
    to: {
        email: string;
        name?: string | undefined;
    }[];
    subject: string;
    text?: string | undefined;
    cc?: {
        email: string;
        name?: string | undefined;
    }[] | undefined;
    bcc?: {
        email: string;
        name?: string | undefined;
    }[] | undefined;
    from?: {
        email: string;
        name?: string | undefined;
    } | undefined;
    replyTo?: {
        email: string;
        name?: string | undefined;
    } | undefined;
    template?: string | undefined;
    templateData?: Record<string, unknown> | undefined;
    html?: string | undefined;
    unsubscribeUrl?: string | undefined;
    headers?: Record<string, string> | undefined;
}>;
export type EmailMessage = z.infer<typeof EmailMessageSchema>;
export declare const EmailConfigSchema: z.ZodObject<{
    provider: z.ZodDefault<z.ZodEnum<["smtp", "resend", "mock"]>>;
    from: z.ZodOptional<z.ZodObject<{
        email: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        name?: string | undefined;
    }, {
        email: string;
        name?: string | undefined;
    }>>;
    smtpHost: z.ZodOptional<z.ZodString>;
    smtpPort: z.ZodOptional<z.ZodNumber>;
    smtpUser: z.ZodOptional<z.ZodString>;
    smtpPass: z.ZodOptional<z.ZodString>;
    resendApiKey: z.ZodOptional<z.ZodString>;
    unsubscribeBaseUrl: z.ZodOptional<z.ZodString>;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    provider: "smtp" | "resend" | "mock";
    from?: {
        email: string;
        name?: string | undefined;
    } | undefined;
    smtpHost?: string | undefined;
    smtpPort?: number | undefined;
    smtpUser?: string | undefined;
    smtpPass?: string | undefined;
    resendApiKey?: string | undefined;
    unsubscribeBaseUrl?: string | undefined;
}, {
    enabled?: boolean | undefined;
    from?: {
        email: string;
        name?: string | undefined;
    } | undefined;
    provider?: "smtp" | "resend" | "mock" | undefined;
    smtpHost?: string | undefined;
    smtpPort?: number | undefined;
    smtpUser?: string | undefined;
    smtpPass?: string | undefined;
    resendApiKey?: string | undefined;
    unsubscribeBaseUrl?: string | undefined;
}>;
export type EmailConfig = z.infer<typeof EmailConfigSchema>;
export declare const EmailResultSchema: z.ZodObject<{
    messageId: z.ZodString;
    accepted: z.ZodArray<z.ZodString, "many">;
    rejected: z.ZodArray<z.ZodString, "many">;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    messageId: string;
    accepted: string[];
    rejected: string[];
}, {
    timestamp: string;
    messageId: string;
    accepted: string[];
    rejected: string[];
}>;
export type EmailResult = z.infer<typeof EmailResultSchema>;
export declare const NotificationPriorityEnum: z.ZodEnum<["low", "normal", "high", "urgent"]>;
export type NotificationPriority = z.infer<typeof NotificationPriorityEnum>;
export declare const InAppNotificationSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    title: z.ZodString;
    body: z.ZodString;
    type: z.ZodDefault<z.ZodString>;
    priority: z.ZodDefault<z.ZodEnum<["low", "normal", "high", "urgent"]>>;
    read: z.ZodDefault<z.ZodBoolean>;
    readAt: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    expiresAt: z.ZodOptional<z.ZodString>;
    actionUrl: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: string;
    id: string;
    userId: string;
    title: string;
    body: string;
    priority: "low" | "normal" | "high" | "urgent";
    read: boolean;
    createdAt: string;
    metadata?: Record<string, unknown> | undefined;
    readAt?: string | undefined;
    expiresAt?: string | undefined;
    actionUrl?: string | undefined;
}, {
    id: string;
    userId: string;
    title: string;
    body: string;
    createdAt: string;
    type?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    priority?: "low" | "normal" | "high" | "urgent" | undefined;
    read?: boolean | undefined;
    readAt?: string | undefined;
    expiresAt?: string | undefined;
    actionUrl?: string | undefined;
}>;
export type InAppNotification = z.infer<typeof InAppNotificationSchema>;
export declare const NotificationFilterSchema: z.ZodObject<{
    userId: z.ZodString;
    read: z.ZodOptional<z.ZodBoolean>;
    type: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodEnum<["low", "normal", "high", "urgent"]>>;
    since: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    userId: string;
    offset: number;
    type?: string | undefined;
    priority?: "low" | "normal" | "high" | "urgent" | undefined;
    read?: boolean | undefined;
    since?: string | undefined;
}, {
    userId: string;
    type?: string | undefined;
    limit?: number | undefined;
    priority?: "low" | "normal" | "high" | "urgent" | undefined;
    read?: boolean | undefined;
    since?: string | undefined;
    offset?: number | undefined;
}>;
export type NotificationFilter = z.infer<typeof NotificationFilterSchema>;
export declare const FunnelStepSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    name: string;
    order: number;
    description?: string | undefined;
}, {
    name: string;
    order: number;
    description?: string | undefined;
}>;
export type FunnelStep = z.infer<typeof FunnelStepSchema>;
export declare const FunnelDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    steps: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        order: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        order: number;
        description?: string | undefined;
    }, {
        name: string;
        order: number;
        description?: string | undefined;
    }>, "many">;
    createdAt: z.ZodString;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    createdAt: string;
    steps: {
        name: string;
        order: number;
        description?: string | undefined;
    }[];
    description?: string | undefined;
    updatedAt?: string | undefined;
}, {
    name: string;
    id: string;
    createdAt: string;
    steps: {
        name: string;
        order: number;
        description?: string | undefined;
    }[];
    description?: string | undefined;
    updatedAt?: string | undefined;
}>;
export type FunnelDefinition = z.infer<typeof FunnelDefinitionSchema>;
export declare const FunnelEventSchema: z.ZodObject<{
    funnelId: z.ZodString;
    stepName: z.ZodString;
    userId: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    userId: string;
    funnelId: string;
    stepName: string;
    metadata?: Record<string, unknown> | undefined;
    sessionId?: string | undefined;
}, {
    timestamp: string;
    userId: string;
    funnelId: string;
    stepName: string;
    metadata?: Record<string, unknown> | undefined;
    sessionId?: string | undefined;
}>;
export type FunnelEvent = z.infer<typeof FunnelEventSchema>;
export declare const FunnelStepMetricsSchema: z.ZodObject<{
    stepName: z.ZodString;
    uniqueUsers: z.ZodNumber;
    totalEvents: z.ZodNumber;
    conversionRate: z.ZodNumber;
    dropOffRate: z.ZodNumber;
    avgTimeFromPreviousMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    stepName: string;
    uniqueUsers: number;
    totalEvents: number;
    conversionRate: number;
    dropOffRate: number;
    avgTimeFromPreviousMs?: number | undefined;
}, {
    stepName: string;
    uniqueUsers: number;
    totalEvents: number;
    conversionRate: number;
    dropOffRate: number;
    avgTimeFromPreviousMs?: number | undefined;
}>;
export type FunnelStepMetrics = z.infer<typeof FunnelStepMetricsSchema>;
export declare const FunnelReportSchema: z.ZodObject<{
    funnelId: z.ZodString;
    funnelName: z.ZodString;
    period: z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>;
    overallConversionRate: z.ZodNumber;
    steps: z.ZodArray<z.ZodObject<{
        stepName: z.ZodString;
        uniqueUsers: z.ZodNumber;
        totalEvents: z.ZodNumber;
        conversionRate: z.ZodNumber;
        dropOffRate: z.ZodNumber;
        avgTimeFromPreviousMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        stepName: string;
        uniqueUsers: number;
        totalEvents: number;
        conversionRate: number;
        dropOffRate: number;
        avgTimeFromPreviousMs?: number | undefined;
    }, {
        stepName: string;
        uniqueUsers: number;
        totalEvents: number;
        conversionRate: number;
        dropOffRate: number;
        avgTimeFromPreviousMs?: number | undefined;
    }>, "many">;
    totalEntries: z.ZodNumber;
    totalCompletions: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    period: {
        start: string;
        end: string;
    };
    steps: {
        stepName: string;
        uniqueUsers: number;
        totalEvents: number;
        conversionRate: number;
        dropOffRate: number;
        avgTimeFromPreviousMs?: number | undefined;
    }[];
    funnelId: string;
    funnelName: string;
    overallConversionRate: number;
    totalEntries: number;
    totalCompletions: number;
}, {
    period: {
        start: string;
        end: string;
    };
    steps: {
        stepName: string;
        uniqueUsers: number;
        totalEvents: number;
        conversionRate: number;
        dropOffRate: number;
        avgTimeFromPreviousMs?: number | undefined;
    }[];
    funnelId: string;
    funnelName: string;
    overallConversionRate: number;
    totalEntries: number;
    totalCompletions: number;
}>;
export type FunnelReport = z.infer<typeof FunnelReportSchema>;
export declare const CreativeMetricsSchema: z.ZodObject<{
    creativeId: z.ZodString;
    impressions: z.ZodDefault<z.ZodNumber>;
    clicks: z.ZodDefault<z.ZodNumber>;
    conversions: z.ZodDefault<z.ZodNumber>;
    spend: z.ZodDefault<z.ZodNumber>;
    revenue: z.ZodDefault<z.ZodNumber>;
    ctr: z.ZodDefault<z.ZodNumber>;
    cvr: z.ZodDefault<z.ZodNumber>;
    roas: z.ZodDefault<z.ZodNumber>;
    engagementScore: z.ZodDefault<z.ZodNumber>;
    performanceScore: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    creativeId: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    revenue: number;
    ctr: number;
    cvr: number;
    roas: number;
    engagementScore: number;
    performanceScore: number;
}, {
    timestamp: string;
    creativeId: string;
    impressions?: number | undefined;
    clicks?: number | undefined;
    conversions?: number | undefined;
    spend?: number | undefined;
    revenue?: number | undefined;
    ctr?: number | undefined;
    cvr?: number | undefined;
    roas?: number | undefined;
    engagementScore?: number | undefined;
    performanceScore?: number | undefined;
}>;
export type CreativeMetrics = z.infer<typeof CreativeMetricsSchema>;
export declare const ABComparisonSchema: z.ZodObject<{
    variantA: z.ZodObject<{
        creativeId: z.ZodString;
        metrics: z.ZodObject<{
            creativeId: z.ZodString;
            impressions: z.ZodDefault<z.ZodNumber>;
            clicks: z.ZodDefault<z.ZodNumber>;
            conversions: z.ZodDefault<z.ZodNumber>;
            spend: z.ZodDefault<z.ZodNumber>;
            revenue: z.ZodDefault<z.ZodNumber>;
            ctr: z.ZodDefault<z.ZodNumber>;
            cvr: z.ZodDefault<z.ZodNumber>;
            roas: z.ZodDefault<z.ZodNumber>;
            engagementScore: z.ZodDefault<z.ZodNumber>;
            performanceScore: z.ZodDefault<z.ZodNumber>;
            timestamp: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            timestamp: string;
            creativeId: string;
            impressions: number;
            clicks: number;
            conversions: number;
            spend: number;
            revenue: number;
            ctr: number;
            cvr: number;
            roas: number;
            engagementScore: number;
            performanceScore: number;
        }, {
            timestamp: string;
            creativeId: string;
            impressions?: number | undefined;
            clicks?: number | undefined;
            conversions?: number | undefined;
            spend?: number | undefined;
            revenue?: number | undefined;
            ctr?: number | undefined;
            cvr?: number | undefined;
            roas?: number | undefined;
            engagementScore?: number | undefined;
            performanceScore?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        creativeId: string;
        metrics: {
            timestamp: string;
            creativeId: string;
            impressions: number;
            clicks: number;
            conversions: number;
            spend: number;
            revenue: number;
            ctr: number;
            cvr: number;
            roas: number;
            engagementScore: number;
            performanceScore: number;
        };
    }, {
        creativeId: string;
        metrics: {
            timestamp: string;
            creativeId: string;
            impressions?: number | undefined;
            clicks?: number | undefined;
            conversions?: number | undefined;
            spend?: number | undefined;
            revenue?: number | undefined;
            ctr?: number | undefined;
            cvr?: number | undefined;
            roas?: number | undefined;
            engagementScore?: number | undefined;
            performanceScore?: number | undefined;
        };
    }>;
    variantB: z.ZodObject<{
        creativeId: z.ZodString;
        metrics: z.ZodObject<{
            creativeId: z.ZodString;
            impressions: z.ZodDefault<z.ZodNumber>;
            clicks: z.ZodDefault<z.ZodNumber>;
            conversions: z.ZodDefault<z.ZodNumber>;
            spend: z.ZodDefault<z.ZodNumber>;
            revenue: z.ZodDefault<z.ZodNumber>;
            ctr: z.ZodDefault<z.ZodNumber>;
            cvr: z.ZodDefault<z.ZodNumber>;
            roas: z.ZodDefault<z.ZodNumber>;
            engagementScore: z.ZodDefault<z.ZodNumber>;
            performanceScore: z.ZodDefault<z.ZodNumber>;
            timestamp: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            timestamp: string;
            creativeId: string;
            impressions: number;
            clicks: number;
            conversions: number;
            spend: number;
            revenue: number;
            ctr: number;
            cvr: number;
            roas: number;
            engagementScore: number;
            performanceScore: number;
        }, {
            timestamp: string;
            creativeId: string;
            impressions?: number | undefined;
            clicks?: number | undefined;
            conversions?: number | undefined;
            spend?: number | undefined;
            revenue?: number | undefined;
            ctr?: number | undefined;
            cvr?: number | undefined;
            roas?: number | undefined;
            engagementScore?: number | undefined;
            performanceScore?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        creativeId: string;
        metrics: {
            timestamp: string;
            creativeId: string;
            impressions: number;
            clicks: number;
            conversions: number;
            spend: number;
            revenue: number;
            ctr: number;
            cvr: number;
            roas: number;
            engagementScore: number;
            performanceScore: number;
        };
    }, {
        creativeId: string;
        metrics: {
            timestamp: string;
            creativeId: string;
            impressions?: number | undefined;
            clicks?: number | undefined;
            conversions?: number | undefined;
            spend?: number | undefined;
            revenue?: number | undefined;
            ctr?: number | undefined;
            cvr?: number | undefined;
            roas?: number | undefined;
            engagementScore?: number | undefined;
            performanceScore?: number | undefined;
        };
    }>;
    winner: z.ZodEnum<["A", "B", "inconclusive"]>;
    confidenceLevel: z.ZodNumber;
    improvementPercent: z.ZodNumber;
    metric: z.ZodString;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    variantA: {
        creativeId: string;
        metrics: {
            timestamp: string;
            creativeId: string;
            impressions: number;
            clicks: number;
            conversions: number;
            spend: number;
            revenue: number;
            ctr: number;
            cvr: number;
            roas: number;
            engagementScore: number;
            performanceScore: number;
        };
    };
    variantB: {
        creativeId: string;
        metrics: {
            timestamp: string;
            creativeId: string;
            impressions: number;
            clicks: number;
            conversions: number;
            spend: number;
            revenue: number;
            ctr: number;
            cvr: number;
            roas: number;
            engagementScore: number;
            performanceScore: number;
        };
    };
    winner: "A" | "B" | "inconclusive";
    confidenceLevel: number;
    improvementPercent: number;
    metric: string;
}, {
    timestamp: string;
    variantA: {
        creativeId: string;
        metrics: {
            timestamp: string;
            creativeId: string;
            impressions?: number | undefined;
            clicks?: number | undefined;
            conversions?: number | undefined;
            spend?: number | undefined;
            revenue?: number | undefined;
            ctr?: number | undefined;
            cvr?: number | undefined;
            roas?: number | undefined;
            engagementScore?: number | undefined;
            performanceScore?: number | undefined;
        };
    };
    variantB: {
        creativeId: string;
        metrics: {
            timestamp: string;
            creativeId: string;
            impressions?: number | undefined;
            clicks?: number | undefined;
            conversions?: number | undefined;
            spend?: number | undefined;
            revenue?: number | undefined;
            ctr?: number | undefined;
            cvr?: number | undefined;
            roas?: number | undefined;
            engagementScore?: number | undefined;
            performanceScore?: number | undefined;
        };
    };
    winner: "A" | "B" | "inconclusive";
    confidenceLevel: number;
    improvementPercent: number;
    metric: string;
}>;
export type ABComparison = z.infer<typeof ABComparisonSchema>;
export declare const AdPerformanceDataSchema: z.ZodObject<{
    adId: z.ZodString;
    creativeId: z.ZodString;
    campaignId: z.ZodString;
    impressions: z.ZodNumber;
    clicks: z.ZodNumber;
    conversions: z.ZodNumber;
    spend: z.ZodNumber;
    ctr: z.ZodNumber;
    cvr: z.ZodNumber;
    roas: z.ZodNumber;
    period: z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>;
}, "strip", z.ZodTypeAny, {
    period: {
        start: string;
        end: string;
    };
    creativeId: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    ctr: number;
    cvr: number;
    roas: number;
    adId: string;
    campaignId: string;
}, {
    period: {
        start: string;
        end: string;
    };
    creativeId: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    ctr: number;
    cvr: number;
    roas: number;
    adId: string;
    campaignId: string;
}>;
export type AdPerformanceData = z.infer<typeof AdPerformanceDataSchema>;
export declare const OptimizationSuggestionSchema: z.ZodObject<{
    id: z.ZodString;
    creativeId: z.ZodString;
    type: z.ZodEnum<["copy", "visual", "targeting", "budget", "schedule"]>;
    priority: z.ZodEnum<["low", "medium", "high", "critical"]>;
    title: z.ZodString;
    description: z.ZodString;
    expectedImprovement: z.ZodOptional<z.ZodNumber>;
    basedOn: z.ZodString;
    createdAt: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["pending", "applied", "dismissed"]>>;
}, "strip", z.ZodTypeAny, {
    type: "copy" | "visual" | "targeting" | "budget" | "schedule";
    status: "pending" | "applied" | "dismissed";
    id: string;
    title: string;
    priority: "low" | "high" | "medium" | "critical";
    createdAt: string;
    description: string;
    creativeId: string;
    basedOn: string;
    expectedImprovement?: number | undefined;
}, {
    type: "copy" | "visual" | "targeting" | "budget" | "schedule";
    id: string;
    title: string;
    priority: "low" | "high" | "medium" | "critical";
    createdAt: string;
    description: string;
    creativeId: string;
    basedOn: string;
    status?: "pending" | "applied" | "dismissed" | undefined;
    expectedImprovement?: number | undefined;
}>;
export type OptimizationSuggestion = z.infer<typeof OptimizationSuggestionSchema>;
export declare const TikTokVideoMetricsSchema: z.ZodObject<{
    videoId: z.ZodString;
    viewCount: z.ZodDefault<z.ZodNumber>;
    likeCount: z.ZodDefault<z.ZodNumber>;
    commentCount: z.ZodDefault<z.ZodNumber>;
    shareCount: z.ZodDefault<z.ZodNumber>;
    saveCount: z.ZodDefault<z.ZodNumber>;
    engagementRate: z.ZodDefault<z.ZodNumber>;
    avgWatchTimeSeconds: z.ZodDefault<z.ZodNumber>;
    completionRate: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    videoId: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    saveCount: number;
    engagementRate: number;
    avgWatchTimeSeconds: number;
    completionRate: number;
}, {
    timestamp: string;
    videoId: string;
    viewCount?: number | undefined;
    likeCount?: number | undefined;
    commentCount?: number | undefined;
    shareCount?: number | undefined;
    saveCount?: number | undefined;
    engagementRate?: number | undefined;
    avgWatchTimeSeconds?: number | undefined;
    completionRate?: number | undefined;
}>;
export type TikTokVideoMetrics = z.infer<typeof TikTokVideoMetricsSchema>;
export declare const TikTokShopMetricsSchema: z.ZodObject<{
    videoId: z.ZodString;
    productClicks: z.ZodDefault<z.ZodNumber>;
    addToCartCount: z.ZodDefault<z.ZodNumber>;
    purchaseCount: z.ZodDefault<z.ZodNumber>;
    revenue: z.ZodDefault<z.ZodNumber>;
    conversionRate: z.ZodDefault<z.ZodNumber>;
    avgOrderValue: z.ZodDefault<z.ZodNumber>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    conversionRate: number;
    revenue: number;
    videoId: string;
    productClicks: number;
    addToCartCount: number;
    purchaseCount: number;
    avgOrderValue: number;
}, {
    timestamp: string;
    videoId: string;
    conversionRate?: number | undefined;
    revenue?: number | undefined;
    productClicks?: number | undefined;
    addToCartCount?: number | undefined;
    purchaseCount?: number | undefined;
    avgOrderValue?: number | undefined;
}>;
export type TikTokShopMetrics = z.infer<typeof TikTokShopMetricsSchema>;
export declare const TikTokCombinedMetricsSchema: z.ZodObject<{
    videoId: z.ZodString;
    video: z.ZodObject<{
        videoId: z.ZodString;
        viewCount: z.ZodDefault<z.ZodNumber>;
        likeCount: z.ZodDefault<z.ZodNumber>;
        commentCount: z.ZodDefault<z.ZodNumber>;
        shareCount: z.ZodDefault<z.ZodNumber>;
        saveCount: z.ZodDefault<z.ZodNumber>;
        engagementRate: z.ZodDefault<z.ZodNumber>;
        avgWatchTimeSeconds: z.ZodDefault<z.ZodNumber>;
        completionRate: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        videoId: string;
        viewCount: number;
        likeCount: number;
        commentCount: number;
        shareCount: number;
        saveCount: number;
        engagementRate: number;
        avgWatchTimeSeconds: number;
        completionRate: number;
    }, {
        timestamp: string;
        videoId: string;
        viewCount?: number | undefined;
        likeCount?: number | undefined;
        commentCount?: number | undefined;
        shareCount?: number | undefined;
        saveCount?: number | undefined;
        engagementRate?: number | undefined;
        avgWatchTimeSeconds?: number | undefined;
        completionRate?: number | undefined;
    }>;
    shop: z.ZodOptional<z.ZodObject<{
        videoId: z.ZodString;
        productClicks: z.ZodDefault<z.ZodNumber>;
        addToCartCount: z.ZodDefault<z.ZodNumber>;
        purchaseCount: z.ZodDefault<z.ZodNumber>;
        revenue: z.ZodDefault<z.ZodNumber>;
        conversionRate: z.ZodDefault<z.ZodNumber>;
        avgOrderValue: z.ZodDefault<z.ZodNumber>;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        conversionRate: number;
        revenue: number;
        videoId: string;
        productClicks: number;
        addToCartCount: number;
        purchaseCount: number;
        avgOrderValue: number;
    }, {
        timestamp: string;
        videoId: string;
        conversionRate?: number | undefined;
        revenue?: number | undefined;
        productClicks?: number | undefined;
        addToCartCount?: number | undefined;
        purchaseCount?: number | undefined;
        avgOrderValue?: number | undefined;
    }>>;
    fetchedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    videoId: string;
    video: {
        timestamp: string;
        videoId: string;
        viewCount: number;
        likeCount: number;
        commentCount: number;
        shareCount: number;
        saveCount: number;
        engagementRate: number;
        avgWatchTimeSeconds: number;
        completionRate: number;
    };
    fetchedAt: string;
    shop?: {
        timestamp: string;
        conversionRate: number;
        revenue: number;
        videoId: string;
        productClicks: number;
        addToCartCount: number;
        purchaseCount: number;
        avgOrderValue: number;
    } | undefined;
}, {
    videoId: string;
    video: {
        timestamp: string;
        videoId: string;
        viewCount?: number | undefined;
        likeCount?: number | undefined;
        commentCount?: number | undefined;
        shareCount?: number | undefined;
        saveCount?: number | undefined;
        engagementRate?: number | undefined;
        avgWatchTimeSeconds?: number | undefined;
        completionRate?: number | undefined;
    };
    fetchedAt: string;
    shop?: {
        timestamp: string;
        videoId: string;
        conversionRate?: number | undefined;
        revenue?: number | undefined;
        productClicks?: number | undefined;
        addToCartCount?: number | undefined;
        purchaseCount?: number | undefined;
        avgOrderValue?: number | undefined;
    } | undefined;
}>;
export type TikTokCombinedMetrics = z.infer<typeof TikTokCombinedMetricsSchema>;
export declare const TimeSeriesPointSchema: z.ZodObject<{
    timestamp: z.ZodString;
    value: z.ZodNumber;
    label: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    value: number;
    timestamp: string;
    label?: string | undefined;
}, {
    value: number;
    timestamp: string;
    label?: string | undefined;
}>;
export type TimeSeriesPoint = z.infer<typeof TimeSeriesPointSchema>;
export declare const TimeSeriesDataSchema: z.ZodObject<{
    metric: z.ZodString;
    product: z.ZodOptional<z.ZodString>;
    points: z.ZodArray<z.ZodObject<{
        timestamp: z.ZodString;
        value: z.ZodNumber;
        label: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        timestamp: string;
        label?: string | undefined;
    }, {
        value: number;
        timestamp: string;
        label?: string | undefined;
    }>, "many">;
    aggregation: z.ZodDefault<z.ZodEnum<["sum", "avg", "min", "max", "count"]>>;
}, "strip", z.ZodTypeAny, {
    metric: string;
    points: {
        value: number;
        timestamp: string;
        label?: string | undefined;
    }[];
    aggregation: "sum" | "avg" | "min" | "max" | "count";
    product?: string | undefined;
}, {
    metric: string;
    points: {
        value: number;
        timestamp: string;
        label?: string | undefined;
    }[];
    product?: string | undefined;
    aggregation?: "sum" | "avg" | "min" | "max" | "count" | undefined;
}>;
export type TimeSeriesData = z.infer<typeof TimeSeriesDataSchema>;
export declare const DashboardWidgetDataSchema: z.ZodObject<{
    widgetId: z.ZodString;
    title: z.ZodString;
    type: z.ZodEnum<["metric", "timeseries", "table", "pie", "bar"]>;
    data: z.ZodUnknown;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "metric" | "timeseries" | "table" | "pie" | "bar";
    title: string;
    updatedAt: string;
    widgetId: string;
    data?: unknown;
}, {
    type: "metric" | "timeseries" | "table" | "pie" | "bar";
    title: string;
    updatedAt: string;
    widgetId: string;
    data?: unknown;
}>;
export type DashboardWidgetData = z.infer<typeof DashboardWidgetDataSchema>;
export declare const AnalyticsDashboardConfigSchema: z.ZodObject<{
    products: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    metrics: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    refreshIntervalMs: z.ZodDefault<z.ZodNumber>;
    timeRange: z.ZodOptional<z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    metrics: string[];
    products: string[];
    refreshIntervalMs: number;
    timeRange?: {
        start: string;
        end: string;
    } | undefined;
}, {
    metrics?: string[] | undefined;
    products?: string[] | undefined;
    refreshIntervalMs?: number | undefined;
    timeRange?: {
        start: string;
        end: string;
    } | undefined;
}>;
export type AnalyticsDashboardConfig = z.infer<typeof AnalyticsDashboardConfigSchema>;
export declare const CampaignPerformanceSchema: z.ZodObject<{
    campaignId: z.ZodString;
    campaignName: z.ZodString;
    status: z.ZodEnum<["active", "paused", "completed", "draft"]>;
    impressions: z.ZodDefault<z.ZodNumber>;
    clicks: z.ZodDefault<z.ZodNumber>;
    conversions: z.ZodDefault<z.ZodNumber>;
    spend: z.ZodDefault<z.ZodNumber>;
    revenue: z.ZodDefault<z.ZodNumber>;
    roas: z.ZodDefault<z.ZodNumber>;
    ctr: z.ZodDefault<z.ZodNumber>;
    cpc: z.ZodDefault<z.ZodNumber>;
    cpa: z.ZodDefault<z.ZodNumber>;
    period: z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "active" | "paused" | "completed" | "draft";
    period: {
        start: string;
        end: string;
    };
    updatedAt: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    revenue: number;
    ctr: number;
    roas: number;
    campaignId: string;
    campaignName: string;
    cpc: number;
    cpa: number;
}, {
    status: "active" | "paused" | "completed" | "draft";
    period: {
        start: string;
        end: string;
    };
    updatedAt: string;
    campaignId: string;
    campaignName: string;
    impressions?: number | undefined;
    clicks?: number | undefined;
    conversions?: number | undefined;
    spend?: number | undefined;
    revenue?: number | undefined;
    ctr?: number | undefined;
    roas?: number | undefined;
    cpc?: number | undefined;
    cpa?: number | undefined;
}>;
export type CampaignPerformance = z.infer<typeof CampaignPerformanceSchema>;
export declare const AdInsightsSummarySchema: z.ZodObject<{
    totalSpend: z.ZodNumber;
    totalRevenue: z.ZodNumber;
    overallRoas: z.ZodNumber;
    activeCampaigns: z.ZodNumber;
    topCampaigns: z.ZodArray<z.ZodObject<{
        campaignId: z.ZodString;
        campaignName: z.ZodString;
        status: z.ZodEnum<["active", "paused", "completed", "draft"]>;
        impressions: z.ZodDefault<z.ZodNumber>;
        clicks: z.ZodDefault<z.ZodNumber>;
        conversions: z.ZodDefault<z.ZodNumber>;
        spend: z.ZodDefault<z.ZodNumber>;
        revenue: z.ZodDefault<z.ZodNumber>;
        roas: z.ZodDefault<z.ZodNumber>;
        ctr: z.ZodDefault<z.ZodNumber>;
        cpc: z.ZodDefault<z.ZodNumber>;
        cpa: z.ZodDefault<z.ZodNumber>;
        period: z.ZodObject<{
            start: z.ZodString;
            end: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            start: string;
            end: string;
        }, {
            start: string;
            end: string;
        }>;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "active" | "paused" | "completed" | "draft";
        period: {
            start: string;
            end: string;
        };
        updatedAt: string;
        impressions: number;
        clicks: number;
        conversions: number;
        spend: number;
        revenue: number;
        ctr: number;
        roas: number;
        campaignId: string;
        campaignName: string;
        cpc: number;
        cpa: number;
    }, {
        status: "active" | "paused" | "completed" | "draft";
        period: {
            start: string;
            end: string;
        };
        updatedAt: string;
        campaignId: string;
        campaignName: string;
        impressions?: number | undefined;
        clicks?: number | undefined;
        conversions?: number | undefined;
        spend?: number | undefined;
        revenue?: number | undefined;
        ctr?: number | undefined;
        roas?: number | undefined;
        cpc?: number | undefined;
        cpa?: number | undefined;
    }>, "many">;
    period: z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>;
    generatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    period: {
        start: string;
        end: string;
    };
    totalSpend: number;
    totalRevenue: number;
    overallRoas: number;
    activeCampaigns: number;
    topCampaigns: {
        status: "active" | "paused" | "completed" | "draft";
        period: {
            start: string;
            end: string;
        };
        updatedAt: string;
        impressions: number;
        clicks: number;
        conversions: number;
        spend: number;
        revenue: number;
        ctr: number;
        roas: number;
        campaignId: string;
        campaignName: string;
        cpc: number;
        cpa: number;
    }[];
    generatedAt: string;
}, {
    period: {
        start: string;
        end: string;
    };
    totalSpend: number;
    totalRevenue: number;
    overallRoas: number;
    activeCampaigns: number;
    topCampaigns: {
        status: "active" | "paused" | "completed" | "draft";
        period: {
            start: string;
            end: string;
        };
        updatedAt: string;
        campaignId: string;
        campaignName: string;
        impressions?: number | undefined;
        clicks?: number | undefined;
        conversions?: number | undefined;
        spend?: number | undefined;
        revenue?: number | undefined;
        ctr?: number | undefined;
        roas?: number | undefined;
        cpc?: number | undefined;
        cpa?: number | undefined;
    }[];
    generatedAt: string;
}>;
export type AdInsightsSummary = z.infer<typeof AdInsightsSummarySchema>;
export declare const AudienceSyncStatusEnum: z.ZodEnum<["pending", "syncing", "synced", "failed", "stale"]>;
export type AudienceSyncStatus = z.infer<typeof AudienceSyncStatusEnum>;
export declare const AudienceDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    rules: z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        operator: z.ZodEnum<["eq", "neq", "gt", "lt", "gte", "lte", "contains", "in", "not_in"]>;
        value: z.ZodUnknown;
    }, "strip", z.ZodTypeAny, {
        field: string;
        operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains" | "in" | "not_in";
        value?: unknown;
    }, {
        field: string;
        operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains" | "in" | "not_in";
        value?: unknown;
    }>, "many">;
    createdAt: z.ZodString;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    createdAt: string;
    rules: {
        field: string;
        operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains" | "in" | "not_in";
        value?: unknown;
    }[];
    description?: string | undefined;
    updatedAt?: string | undefined;
}, {
    name: string;
    id: string;
    createdAt: string;
    rules: {
        field: string;
        operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains" | "in" | "not_in";
        value?: unknown;
    }[];
    description?: string | undefined;
    updatedAt?: string | undefined;
}>;
export type AudienceDefinition = z.infer<typeof AudienceDefinitionSchema>;
export declare const AudienceSyncRecordSchema: z.ZodObject<{
    audienceId: z.ZodString;
    platform: z.ZodString;
    status: z.ZodEnum<["pending", "syncing", "synced", "failed", "stale"]>;
    memberCount: z.ZodDefault<z.ZodNumber>;
    lastSyncedAt: z.ZodOptional<z.ZodString>;
    nextSyncAt: z.ZodOptional<z.ZodString>;
    errorMessage: z.ZodOptional<z.ZodString>;
    syncDurationMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "syncing" | "synced" | "failed" | "stale";
    audienceId: string;
    platform: string;
    memberCount: number;
    lastSyncedAt?: string | undefined;
    nextSyncAt?: string | undefined;
    errorMessage?: string | undefined;
    syncDurationMs?: number | undefined;
}, {
    status: "pending" | "syncing" | "synced" | "failed" | "stale";
    audienceId: string;
    platform: string;
    memberCount?: number | undefined;
    lastSyncedAt?: string | undefined;
    nextSyncAt?: string | undefined;
    errorMessage?: string | undefined;
    syncDurationMs?: number | undefined;
}>;
export type AudienceSyncRecord = z.infer<typeof AudienceSyncRecordSchema>;
//# sourceMappingURL=types.d.ts.map