"use strict";
/**
 * @acd/publishing - Publishing and Workflow Features Package
 *
 * Phase 5: TikTok integration, multi-platform publishing,
 * content workflows, template management, and status sync.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeSubscriptionSync = exports.TikTokVideoSync = exports.MetaAdStatusSync = exports.TemplateABTestService = exports.TemplateUploadService = exports.TemplateLibrary = exports.PCTAdPipelineHook = exports.ContentPipelineManager = exports.ContentApprovalWorkflow = exports.ShortsLinkerYouTubeService = exports.CFToMediaPosterHandoff = exports.SyndicationService = exports.YouTubePublisher = exports.InstagramPublisher = exports.TikTokPublisher = exports.TikTokShopService = exports.TikTokVideoUploader = exports.TikTokOAuthService = exports.SyncConfigSchema = exports.TemplateConfigSchema = exports.ContentPipelineSchema = exports.PipelineStageSchema = exports.PublishResultSchema = exports.PublishRequestSchema = exports.PublishMetadataSchema = exports.ApprovalStatusEnum = exports.VisibilityEnum = exports.SyncProviderEnum = exports.PipelineStageStatusEnum = exports.PublishStatusEnum = exports.PlatformEnum = void 0;
// ---------------------------------------------------------------------------
// Types & schemas
// ---------------------------------------------------------------------------
var types_1 = require("./types");
Object.defineProperty(exports, "PlatformEnum", { enumerable: true, get: function () { return types_1.PlatformEnum; } });
Object.defineProperty(exports, "PublishStatusEnum", { enumerable: true, get: function () { return types_1.PublishStatusEnum; } });
Object.defineProperty(exports, "PipelineStageStatusEnum", { enumerable: true, get: function () { return types_1.PipelineStageStatusEnum; } });
Object.defineProperty(exports, "SyncProviderEnum", { enumerable: true, get: function () { return types_1.SyncProviderEnum; } });
Object.defineProperty(exports, "VisibilityEnum", { enumerable: true, get: function () { return types_1.VisibilityEnum; } });
Object.defineProperty(exports, "ApprovalStatusEnum", { enumerable: true, get: function () { return types_1.ApprovalStatusEnum; } });
Object.defineProperty(exports, "PublishMetadataSchema", { enumerable: true, get: function () { return types_1.PublishMetadataSchema; } });
Object.defineProperty(exports, "PublishRequestSchema", { enumerable: true, get: function () { return types_1.PublishRequestSchema; } });
Object.defineProperty(exports, "PublishResultSchema", { enumerable: true, get: function () { return types_1.PublishResultSchema; } });
Object.defineProperty(exports, "PipelineStageSchema", { enumerable: true, get: function () { return types_1.PipelineStageSchema; } });
Object.defineProperty(exports, "ContentPipelineSchema", { enumerable: true, get: function () { return types_1.ContentPipelineSchema; } });
Object.defineProperty(exports, "TemplateConfigSchema", { enumerable: true, get: function () { return types_1.TemplateConfigSchema; } });
Object.defineProperty(exports, "SyncConfigSchema", { enumerable: true, get: function () { return types_1.SyncConfigSchema; } });
// ---------------------------------------------------------------------------
// TikTok (CF-TIKTOK-001, CF-TIKTOK-002, CF-TIKTOK-003)
// ---------------------------------------------------------------------------
var oauth_1 = require("./tiktok/oauth");
Object.defineProperty(exports, "TikTokOAuthService", { enumerable: true, get: function () { return oauth_1.TikTokOAuthService; } });
var upload_1 = require("./tiktok/upload");
Object.defineProperty(exports, "TikTokVideoUploader", { enumerable: true, get: function () { return upload_1.TikTokVideoUploader; } });
var shop_1 = require("./tiktok/shop");
Object.defineProperty(exports, "TikTokShopService", { enumerable: true, get: function () { return shop_1.TikTokShopService; } });
// ---------------------------------------------------------------------------
// Publishers (PUB-001 through PUB-007)
// ---------------------------------------------------------------------------
var tiktok_publisher_1 = require("./publishers/tiktok-publisher");
Object.defineProperty(exports, "TikTokPublisher", { enumerable: true, get: function () { return tiktok_publisher_1.TikTokPublisher; } });
var instagram_publisher_1 = require("./publishers/instagram-publisher");
Object.defineProperty(exports, "InstagramPublisher", { enumerable: true, get: function () { return instagram_publisher_1.InstagramPublisher; } });
var youtube_publisher_1 = require("./publishers/youtube-publisher");
Object.defineProperty(exports, "YouTubePublisher", { enumerable: true, get: function () { return youtube_publisher_1.YouTubePublisher; } });
var syndication_1 = require("./publishers/syndication");
Object.defineProperty(exports, "SyndicationService", { enumerable: true, get: function () { return syndication_1.SyndicationService; } });
var handoff_1 = require("./publishers/handoff");
Object.defineProperty(exports, "CFToMediaPosterHandoff", { enumerable: true, get: function () { return handoff_1.CFToMediaPosterHandoff; } });
var shortslinker_1 = require("./publishers/shortslinker");
Object.defineProperty(exports, "ShortsLinkerYouTubeService", { enumerable: true, get: function () { return shortslinker_1.ShortsLinkerYouTubeService; } });
// ---------------------------------------------------------------------------
// Workflows (FLOW-001, FLOW-002, FLOW-003)
// ---------------------------------------------------------------------------
var approval_1 = require("./workflows/approval");
Object.defineProperty(exports, "ContentApprovalWorkflow", { enumerable: true, get: function () { return approval_1.ContentApprovalWorkflow; } });
var pipeline_1 = require("./workflows/pipeline");
Object.defineProperty(exports, "ContentPipelineManager", { enumerable: true, get: function () { return pipeline_1.ContentPipeline; } });
var pct_hook_1 = require("./workflows/pct-hook");
Object.defineProperty(exports, "PCTAdPipelineHook", { enumerable: true, get: function () { return pct_hook_1.PCTAdPipelineHook; } });
// ---------------------------------------------------------------------------
// Templates (TEMPLATE-001, TEMPLATE-002, TEMPLATE-003)
// ---------------------------------------------------------------------------
var library_1 = require("./templates/library");
Object.defineProperty(exports, "TemplateLibrary", { enumerable: true, get: function () { return library_1.TemplateLibrary; } });
var upload_2 = require("./templates/upload");
Object.defineProperty(exports, "TemplateUploadService", { enumerable: true, get: function () { return upload_2.TemplateUploadService; } });
var ab_testing_1 = require("./templates/ab-testing");
Object.defineProperty(exports, "TemplateABTestService", { enumerable: true, get: function () { return ab_testing_1.TemplateABTestService; } });
// ---------------------------------------------------------------------------
// Sync (SYNC-001, SYNC-002, SYNC-003)
// ---------------------------------------------------------------------------
var meta_sync_1 = require("./sync/meta-sync");
Object.defineProperty(exports, "MetaAdStatusSync", { enumerable: true, get: function () { return meta_sync_1.MetaAdStatusSync; } });
var tiktok_sync_1 = require("./sync/tiktok-sync");
Object.defineProperty(exports, "TikTokVideoSync", { enumerable: true, get: function () { return tiktok_sync_1.TikTokVideoSync; } });
var stripe_sync_1 = require("./sync/stripe-sync");
Object.defineProperty(exports, "StripeSubscriptionSync", { enumerable: true, get: function () { return stripe_sync_1.StripeSubscriptionSync; } });
//# sourceMappingURL=index.js.map