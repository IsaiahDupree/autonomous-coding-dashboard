/**
 * @acd/monitoring
 *
 * Comprehensive monitoring, notifications, and analytics package
 * for the Autonomous Coding Dashboard monorepo.
 *
 * Modules:
 * - MON-001: Structured logging (Logger, transports)
 * - MON-002: APM / performance monitoring (ApmMonitor, spans, percentiles)
 * - MON-003: Health check system (HealthCheckRegistry)
 * - MON-004: Rate limit monitoring (RateLimitMonitor)
 * - MON-005: Cost monitoring (CostMonitor, budget alerts)
 * - MON-006: Queue monitoring (QueueMonitor, stale job detection)
 * - MON-007: Session monitoring (SessionMonitor, concurrent limits)
 * - NOTIFY-001: Slack notifications (SlackNotifier, Block Kit)
 * - NOTIFY-002: Email notifications (EmailService, templates)
 * - NOTIFY-003: In-app notifications (InAppNotificationStore)
 * - AN-002: Cross-product funnels (FunnelEngine)
 * - AN-003: Creative performance analytics (CreativePerformanceTracker)
 * - AN-004: PCT feedback loop (PCTFeedbackEngine)
 * - AN-005: TikTok metrics integration (TikTokMetricsTracker)
 * - AN-006: Unified analytics dashboard (AnalyticsDashboardProvider)
 * - GAP-004: Ad insights (AdInsightsManager)
 * - GAP-007: Custom audience sync (AudienceSyncManager)
 */
export * from './types';
export { Logger, createLogger, ConsoleTransport, MemoryTransport, } from './logging';
export type { LogTransport } from './logging';
export { ApmMonitor, ActiveSpan, calculatePercentile, calculatePercentiles, } from './apm';
export { HealthCheckRegistry, createHealthCheck, } from './health';
export type { HealthCheckFn } from './health';
export { RateLimitMonitor } from './rate-limits';
export type { RateLimitAlertHandler } from './rate-limits';
export { CostMonitor } from './costs';
export type { BudgetAlertHandler } from './costs';
export { QueueMonitor } from './queues';
export type { QueueAlertHandler } from './queues';
export { SessionMonitor } from './sessions';
export type { SessionLimitHandler } from './sessions';
export { SlackNotifier } from './slack';
export type { SlackSendResult } from './slack';
export { EmailService, MockEmailTransport, } from './email';
export type { EmailTemplate, EmailTransport } from './email';
export { InAppNotificationStore } from './in-app';
export type { NotificationPushHandler } from './in-app';
export { FunnelEngine } from './funnels';
export { CreativePerformanceTracker } from './creative-perf';
export type { PerformanceWeights } from './creative-perf';
export { PCTFeedbackEngine } from './pct-feedback';
export type { PCTThresholds } from './pct-feedback';
export { TikTokMetricsTracker } from './tiktok-metrics';
export type { TikTokDataFetcher } from './tiktok-metrics';
export { AnalyticsDashboardProvider } from './analytics-dashboard';
export type { MetricDataSource } from './analytics-dashboard';
export { AdInsightsManager } from './ad-insights';
export { AudienceSyncManager } from './audience-sync';
export type { AudienceSyncAdapter, SyncStatusChangeHandler } from './audience-sync';
//# sourceMappingURL=index.d.ts.map