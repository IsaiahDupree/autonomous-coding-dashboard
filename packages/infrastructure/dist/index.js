"use strict";
/**
 * @acd/infrastructure
 *
 * Infrastructure services package providing job queues, webhooks,
 * caching, and performance optimization utilities.
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
exports.ImageOptimizer = exports.QueryOptimizer = exports.CDNConfig = exports.MetaInsightsCache = exports.AssetMetadataCache = exports.ApiResponseCache = exports.SessionCache = exports.CacheManager = exports.SYSTEM_EVENTS = exports.CustomWebhookSubscriptions = exports.TikTokWebhookHandler = exports.MetaWebhookHub = exports.StripeWebhookHub = exports.RemotionWebhookHandler = exports.WebhookManager = exports.CleanupJob = exports.AnalyticsAggregationJob = exports.ContentPipelineJobProcessor = exports.MetaAdPublishJobProcessor = exports.VideoRenderJobProcessor = exports.JobScheduler = exports.JobQueue = void 0;
// ── Types ────────────────────────────────────────────────────────────────────
__exportStar(require("./types"), exports);
// ── Job Queue System (JOB-001 through JOB-007) ──────────────────────────────
var queue_1 = require("./jobs/queue");
Object.defineProperty(exports, "JobQueue", { enumerable: true, get: function () { return queue_1.JobQueue; } });
var scheduler_1 = require("./jobs/scheduler");
Object.defineProperty(exports, "JobScheduler", { enumerable: true, get: function () { return scheduler_1.JobScheduler; } });
var video_render_1 = require("./jobs/video-render");
Object.defineProperty(exports, "VideoRenderJobProcessor", { enumerable: true, get: function () { return video_render_1.VideoRenderJobProcessor; } });
var meta_publish_1 = require("./jobs/meta-publish");
Object.defineProperty(exports, "MetaAdPublishJobProcessor", { enumerable: true, get: function () { return meta_publish_1.MetaAdPublishJobProcessor; } });
var content_pipeline_1 = require("./jobs/content-pipeline");
Object.defineProperty(exports, "ContentPipelineJobProcessor", { enumerable: true, get: function () { return content_pipeline_1.ContentPipelineJobProcessor; } });
var analytics_agg_1 = require("./jobs/analytics-agg");
Object.defineProperty(exports, "AnalyticsAggregationJob", { enumerable: true, get: function () { return analytics_agg_1.AnalyticsAggregationJob; } });
var cleanup_1 = require("./jobs/cleanup");
Object.defineProperty(exports, "CleanupJob", { enumerable: true, get: function () { return cleanup_1.CleanupJob; } });
// ── Webhook System (WH-001 through WH-006) ──────────────────────────────────
var manager_1 = require("./webhooks/manager");
Object.defineProperty(exports, "WebhookManager", { enumerable: true, get: function () { return manager_1.WebhookManager; } });
var remotion_1 = require("./webhooks/remotion");
Object.defineProperty(exports, "RemotionWebhookHandler", { enumerable: true, get: function () { return remotion_1.RemotionWebhookHandler; } });
var stripe_1 = require("./webhooks/stripe");
Object.defineProperty(exports, "StripeWebhookHub", { enumerable: true, get: function () { return stripe_1.StripeWebhookHub; } });
var meta_1 = require("./webhooks/meta");
Object.defineProperty(exports, "MetaWebhookHub", { enumerable: true, get: function () { return meta_1.MetaWebhookHub; } });
var tiktok_1 = require("./webhooks/tiktok");
Object.defineProperty(exports, "TikTokWebhookHandler", { enumerable: true, get: function () { return tiktok_1.TikTokWebhookHandler; } });
var subscriptions_1 = require("./webhooks/subscriptions");
Object.defineProperty(exports, "CustomWebhookSubscriptions", { enumerable: true, get: function () { return subscriptions_1.CustomWebhookSubscriptions; } });
Object.defineProperty(exports, "SYSTEM_EVENTS", { enumerable: true, get: function () { return subscriptions_1.SYSTEM_EVENTS; } });
// ── Cache Layer (CACHE-001 through CACHE-005) ────────────────────────────────
var cache_1 = require("./cache/cache");
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return cache_1.CacheManager; } });
var session_1 = require("./cache/session");
Object.defineProperty(exports, "SessionCache", { enumerable: true, get: function () { return session_1.SessionCache; } });
var api_response_1 = require("./cache/api-response");
Object.defineProperty(exports, "ApiResponseCache", { enumerable: true, get: function () { return api_response_1.ApiResponseCache; } });
var asset_metadata_1 = require("./cache/asset-metadata");
Object.defineProperty(exports, "AssetMetadataCache", { enumerable: true, get: function () { return asset_metadata_1.AssetMetadataCache; } });
var meta_insights_1 = require("./cache/meta-insights");
Object.defineProperty(exports, "MetaInsightsCache", { enumerable: true, get: function () { return meta_insights_1.MetaInsightsCache; } });
// ── Performance Optimization (PERF-001 through PERF-003) ─────────────────────
var cdn_1 = require("./performance/cdn");
Object.defineProperty(exports, "CDNConfig", { enumerable: true, get: function () { return cdn_1.CDNConfig; } });
var query_optimizer_1 = require("./performance/query-optimizer");
Object.defineProperty(exports, "QueryOptimizer", { enumerable: true, get: function () { return query_optimizer_1.QueryOptimizer; } });
var image_optimizer_1 = require("./performance/image-optimizer");
Object.defineProperty(exports, "ImageOptimizer", { enumerable: true, get: function () { return image_optimizer_1.ImageOptimizer; } });
