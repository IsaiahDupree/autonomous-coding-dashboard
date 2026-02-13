import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const PlatformEnum = z.enum([
  'tiktok',
  'instagram',
  'youtube',
  'facebook',
  'twitter',
  'linkedin',
]);
export type Platform = z.infer<typeof PlatformEnum>;

export const PublishStatusEnum = z.enum([
  'draft',
  'pending_review',
  'approved',
  'publishing',
  'published',
  'failed',
  'archived',
]);
export type PublishStatus = z.infer<typeof PublishStatusEnum>;

export const PipelineStageStatusEnum = z.enum([
  'pending',
  'in_progress',
  'completed',
  'failed',
  'skipped',
]);
export type PipelineStageStatus = z.infer<typeof PipelineStageStatusEnum>;

export const SyncProviderEnum = z.enum(['meta', 'tiktok', 'stripe']);
export type SyncProvider = z.infer<typeof SyncProviderEnum>;

export const VisibilityEnum = z.enum(['public', 'private', 'unlisted', 'friends']);
export type Visibility = z.infer<typeof VisibilityEnum>;

// ---------------------------------------------------------------------------
// Publish Request / Result
// ---------------------------------------------------------------------------

export const PublishMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  visibility: VisibilityEnum.default('public'),
});
export type PublishMetadata = z.infer<typeof PublishMetadataSchema>;

export const PublishRequestSchema = z.object({
  contentId: z.string(),
  platform: PlatformEnum,
  account: z.string(),
  scheduledAt: z.string().datetime().optional(),
  metadata: PublishMetadataSchema,
});
export type PublishRequest = z.infer<typeof PublishRequestSchema>;

export const PublishResultSchema = z.object({
  publishId: z.string(),
  platform: PlatformEnum,
  externalId: z.string(),
  url: z.string().url(),
  status: PublishStatusEnum,
  publishedAt: z.string().datetime(),
});
export type PublishResult = z.infer<typeof PublishResultSchema>;

// ---------------------------------------------------------------------------
// Content Pipeline
// ---------------------------------------------------------------------------

export const PipelineStageSchema = z.object({
  name: z.string(),
  status: PipelineStageStatusEnum,
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  output: z.unknown().optional(),
});
export type PipelineStage = z.infer<typeof PipelineStageSchema>;

export const ContentPipelineSchema = z.object({
  id: z.string(),
  stages: z.array(PipelineStageSchema),
  currentStage: z.number().int().min(0),
  createdAt: z.string().datetime(),
});
export type ContentPipeline = z.infer<typeof ContentPipelineSchema>;

// ---------------------------------------------------------------------------
// Template Config
// ---------------------------------------------------------------------------

export const TemplateConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  thumbnailUrl: z.string().url().optional(),
  inputSchema: z.record(z.unknown()),
  defaultProps: z.record(z.unknown()),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(false),
});
export type TemplateConfig = z.infer<typeof TemplateConfigSchema>;

// ---------------------------------------------------------------------------
// Sync Config
// ---------------------------------------------------------------------------

export const SyncConfigSchema = z.object({
  provider: SyncProviderEnum,
  entityType: z.string(),
  entityId: z.string(),
  lastSyncAt: z.string().datetime().optional(),
  syncIntervalMs: z.number().int().positive().default(60_000),
});
export type SyncConfig = z.infer<typeof SyncConfigSchema>;

// ---------------------------------------------------------------------------
// Publisher Interface
// ---------------------------------------------------------------------------

export interface Publisher {
  publish(request: PublishRequest): Promise<PublishResult>;
  getStatus(publishId: string): Promise<PublishStatus>;
  delete(externalId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// TikTok-specific types
// ---------------------------------------------------------------------------

export interface TikTokTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  open_id: string;
  scope: string;
  token_type: string;
}

export interface TikTokUserInfo {
  open_id: string;
  union_id: string;
  avatar_url: string;
  display_name: string;
  bio_description: string;
  profile_deep_link: string;
  is_verified: boolean;
  follower_count: number;
  following_count: number;
  likes_count: number;
  video_count: number;
}

export interface TikTokUploadInitInput {
  title: string;
  description: string;
  privacyLevel: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY';
  disableComment?: boolean;
  videoCoverTimestamp?: number;
}

export interface TikTokUploadInitResponse {
  publish_id: string;
  upload_url: string;
}

export interface TikTokUploadStatusResponse {
  status: 'PROCESSING_UPLOAD' | 'PROCESSING_DOWNLOAD' | 'SEND_TO_USER_INBOX' | 'PUBLISH_COMPLETE' | 'FAILED';
  publish_id: string;
  uploaded_bytes?: number;
  error_code?: string;
  error_message?: string;
}

export interface TikTokShopProduct {
  product_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_urls: string[];
  status: string;
}

export interface TikTokAffiliateLink {
  link_id: string;
  product_id: string;
  short_url: string;
  commission_rate: number;
  created_at: string;
}

export interface TikTokCommissionRate {
  product_id: string;
  commission_rate: number;
  effective_from: string;
  effective_to: string | null;
}

export interface TikTokSalesData {
  affiliate_link_id: string;
  total_orders: number;
  total_revenue: number;
  total_commission: number;
  currency: string;
  period_start: string;
  period_end: string;
}

// ---------------------------------------------------------------------------
// Workflow types
// ---------------------------------------------------------------------------

export const ApprovalStatusEnum = z.enum([
  'pending',
  'approved',
  'rejected',
  'revision_requested',
]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusEnum>;

export interface ApprovalRequest {
  id: string;
  contentId: string;
  submittedBy: string;
  submittedAt: string;
  status: ApprovalStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  comments?: string;
}

// ---------------------------------------------------------------------------
// Template A/B Testing types
// ---------------------------------------------------------------------------

export interface ABTestConfig {
  testId: string;
  templateIdA: string;
  templateIdB: string;
  name: string;
  trafficSplit: number; // 0-1, portion going to variant B
  startedAt: string;
  endedAt?: string;
  isActive: boolean;
}

export interface ABTestConversion {
  testId: string;
  variant: 'A' | 'B';
  userId: string;
  convertedAt: string;
  value?: number;
}

export interface ABTestResults {
  testId: string;
  variantA: { impressions: number; conversions: number; conversionRate: number };
  variantB: { impressions: number; conversions: number; conversionRate: number };
  winner: 'A' | 'B' | 'inconclusive';
  confidence: number;
}

// ---------------------------------------------------------------------------
// Handoff / Syndication types
// ---------------------------------------------------------------------------

export interface SyndicationResult {
  contentId: string;
  results: Map<Platform, PublishResult | { error: string }>;
  completedAt: string;
}

export interface HandoffPayload {
  contentId: string;
  renderedAssetUrl: string;
  metadata: PublishMetadata;
  targetPlatforms: Platform[];
  priority: number;
  createdAt: string;
}
