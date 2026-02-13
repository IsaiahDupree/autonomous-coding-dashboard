/**
 * @acd/publishing - Publishing and Workflow Features Package
 *
 * Phase 5: TikTok integration, multi-platform publishing,
 * content workflows, template management, and status sync.
 */
export { PlatformEnum, PublishStatusEnum, PipelineStageStatusEnum, SyncProviderEnum, VisibilityEnum, ApprovalStatusEnum, PublishMetadataSchema, PublishRequestSchema, PublishResultSchema, PipelineStageSchema, ContentPipelineSchema, TemplateConfigSchema, SyncConfigSchema, } from './types';
export type { Platform, PublishStatus, PipelineStageStatus, SyncProvider, Visibility, PublishMetadata, PublishRequest, PublishResult, PipelineStage, ContentPipeline, TemplateConfig, SyncConfig, Publisher, TikTokTokenResponse, TikTokUserInfo, TikTokUploadInitInput, TikTokUploadInitResponse, TikTokUploadStatusResponse, TikTokShopProduct, TikTokAffiliateLink, TikTokCommissionRate, TikTokSalesData, ApprovalStatus, ApprovalRequest, ABTestConfig, ABTestConversion, ABTestResults, SyndicationResult, HandoffPayload, } from './types';
export { TikTokOAuthService } from './tiktok/oauth';
export { TikTokVideoUploader } from './tiktok/upload';
export { TikTokShopService } from './tiktok/shop';
export type { ProductFilters, DateRange } from './tiktok/shop';
export { TikTokPublisher } from './publishers/tiktok-publisher';
export { InstagramPublisher } from './publishers/instagram-publisher';
export { YouTubePublisher } from './publishers/youtube-publisher';
export { SyndicationService } from './publishers/syndication';
export { CFToMediaPosterHandoff } from './publishers/handoff';
export type { HandoffQueue } from './publishers/handoff';
export { ShortsLinkerYouTubeService } from './publishers/shortslinker';
export { ContentApprovalWorkflow } from './workflows/approval';
export { ContentPipeline as ContentPipelineManager } from './workflows/pipeline';
export { PCTAdPipelineHook } from './workflows/pct-hook';
export type { AdCampaign, AdCreative, PCTAdPipelineConfig } from './workflows/pct-hook';
export { TemplateLibrary } from './templates/library';
export { TemplateUploadService } from './templates/upload';
export type { TemplateUploadInput, TemplateValidationResult } from './templates/upload';
export { TemplateABTestService } from './templates/ab-testing';
export { MetaAdStatusSync } from './sync/meta-sync';
export type { MetaAdStatus, MetaSyncCallback } from './sync/meta-sync';
export { TikTokVideoSync } from './sync/tiktok-sync';
export type { TikTokVideoStatus, TikTokSyncCallback } from './sync/tiktok-sync';
export { StripeSubscriptionSync } from './sync/stripe-sync';
export type { StripeSubscriptionStatus, StripeSyncCallback } from './sync/stripe-sync';
//# sourceMappingURL=index.d.ts.map