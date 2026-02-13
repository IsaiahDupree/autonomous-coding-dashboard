"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudienceSyncManager = exports.AdInsightsManager = exports.AnalyticsDashboardProvider = exports.TikTokMetricsTracker = exports.PCTFeedbackEngine = exports.CreativePerformanceTracker = exports.FunnelEngine = exports.InAppNotificationStore = exports.MockEmailTransport = exports.EmailService = exports.SlackNotifier = exports.SessionMonitor = exports.QueueMonitor = exports.CostMonitor = exports.RateLimitMonitor = exports.createHealthCheck = exports.HealthCheckRegistry = exports.calculatePercentiles = exports.calculatePercentile = exports.ActiveSpan = exports.ApmMonitor = exports.MemoryTransport = exports.ConsoleTransport = exports.createLogger = exports.Logger = void 0;
// Types & Schemas
__exportStar(require("./types"), exports);
// MON-001: Logging
var logging_1 = require("./logging");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return logging_1.Logger; } });
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return logging_1.createLogger; } });
Object.defineProperty(exports, "ConsoleTransport", { enumerable: true, get: function () { return logging_1.ConsoleTransport; } });
Object.defineProperty(exports, "MemoryTransport", { enumerable: true, get: function () { return logging_1.MemoryTransport; } });
// MON-002: APM
var apm_1 = require("./apm");
Object.defineProperty(exports, "ApmMonitor", { enumerable: true, get: function () { return apm_1.ApmMonitor; } });
Object.defineProperty(exports, "ActiveSpan", { enumerable: true, get: function () { return apm_1.ActiveSpan; } });
Object.defineProperty(exports, "calculatePercentile", { enumerable: true, get: function () { return apm_1.calculatePercentile; } });
Object.defineProperty(exports, "calculatePercentiles", { enumerable: true, get: function () { return apm_1.calculatePercentiles; } });
// MON-003: Health Checks
var health_1 = require("./health");
Object.defineProperty(exports, "HealthCheckRegistry", { enumerable: true, get: function () { return health_1.HealthCheckRegistry; } });
Object.defineProperty(exports, "createHealthCheck", { enumerable: true, get: function () { return health_1.createHealthCheck; } });
// MON-004: Rate Limit Monitoring
var rate_limits_1 = require("./rate-limits");
Object.defineProperty(exports, "RateLimitMonitor", { enumerable: true, get: function () { return rate_limits_1.RateLimitMonitor; } });
// MON-005: Cost Monitoring
var costs_1 = require("./costs");
Object.defineProperty(exports, "CostMonitor", { enumerable: true, get: function () { return costs_1.CostMonitor; } });
// MON-006: Queue Monitoring
var queues_1 = require("./queues");
Object.defineProperty(exports, "QueueMonitor", { enumerable: true, get: function () { return queues_1.QueueMonitor; } });
// MON-007: Session Monitoring
var sessions_1 = require("./sessions");
Object.defineProperty(exports, "SessionMonitor", { enumerable: true, get: function () { return sessions_1.SessionMonitor; } });
// NOTIFY-001: Slack Notifications
var slack_1 = require("./slack");
Object.defineProperty(exports, "SlackNotifier", { enumerable: true, get: function () { return slack_1.SlackNotifier; } });
// NOTIFY-002: Email Notifications
var email_1 = require("./email");
Object.defineProperty(exports, "EmailService", { enumerable: true, get: function () { return email_1.EmailService; } });
Object.defineProperty(exports, "MockEmailTransport", { enumerable: true, get: function () { return email_1.MockEmailTransport; } });
// NOTIFY-003: In-App Notifications
var in_app_1 = require("./in-app");
Object.defineProperty(exports, "InAppNotificationStore", { enumerable: true, get: function () { return in_app_1.InAppNotificationStore; } });
// AN-002: Cross-Product Funnels
var funnels_1 = require("./funnels");
Object.defineProperty(exports, "FunnelEngine", { enumerable: true, get: function () { return funnels_1.FunnelEngine; } });
// AN-003: Creative Performance Analytics
var creative_perf_1 = require("./creative-perf");
Object.defineProperty(exports, "CreativePerformanceTracker", { enumerable: true, get: function () { return creative_perf_1.CreativePerformanceTracker; } });
// AN-004: PCT Feedback Loop
var pct_feedback_1 = require("./pct-feedback");
Object.defineProperty(exports, "PCTFeedbackEngine", { enumerable: true, get: function () { return pct_feedback_1.PCTFeedbackEngine; } });
// AN-005: TikTok Metrics
var tiktok_metrics_1 = require("./tiktok-metrics");
Object.defineProperty(exports, "TikTokMetricsTracker", { enumerable: true, get: function () { return tiktok_metrics_1.TikTokMetricsTracker; } });
// AN-006: Analytics Dashboard
var analytics_dashboard_1 = require("./analytics-dashboard");
Object.defineProperty(exports, "AnalyticsDashboardProvider", { enumerable: true, get: function () { return analytics_dashboard_1.AnalyticsDashboardProvider; } });
// GAP-004: Ad Insights
var ad_insights_1 = require("./ad-insights");
Object.defineProperty(exports, "AdInsightsManager", { enumerable: true, get: function () { return ad_insights_1.AdInsightsManager; } });
// GAP-007: Audience Sync
var audience_sync_1 = require("./audience-sync");
Object.defineProperty(exports, "AudienceSyncManager", { enumerable: true, get: function () { return audience_sync_1.AudienceSyncManager; } });
//# sourceMappingURL=index.js.map