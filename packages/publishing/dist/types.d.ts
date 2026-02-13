import { z } from 'zod';
export declare const PlatformEnum: z.ZodEnum<["tiktok", "instagram", "youtube", "facebook", "twitter", "linkedin"]>;
export type Platform = z.infer<typeof PlatformEnum>;
export declare const PublishStatusEnum: z.ZodEnum<["draft", "pending_review", "approved", "publishing", "published", "failed", "archived"]>;
export type PublishStatus = z.infer<typeof PublishStatusEnum>;
export declare const PipelineStageStatusEnum: z.ZodEnum<["pending", "in_progress", "completed", "failed", "skipped"]>;
export type PipelineStageStatus = z.infer<typeof PipelineStageStatusEnum>;
export declare const SyncProviderEnum: z.ZodEnum<["meta", "tiktok", "stripe"]>;
export type SyncProvider = z.infer<typeof SyncProviderEnum>;
export declare const VisibilityEnum: z.ZodEnum<["public", "private", "unlisted", "friends"]>;
export type Visibility = z.infer<typeof VisibilityEnum>;
export declare const PublishMetadataSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    visibility: z.ZodDefault<z.ZodEnum<["public", "private", "unlisted", "friends"]>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    tags: string[];
    visibility: "public" | "private" | "unlisted" | "friends";
}, {
    title: string;
    description: string;
    tags?: string[] | undefined;
    visibility?: "public" | "private" | "unlisted" | "friends" | undefined;
}>;
export type PublishMetadata = z.infer<typeof PublishMetadataSchema>;
export declare const PublishRequestSchema: z.ZodObject<{
    contentId: z.ZodString;
    platform: z.ZodEnum<["tiktok", "instagram", "youtube", "facebook", "twitter", "linkedin"]>;
    account: z.ZodString;
    scheduledAt: z.ZodOptional<z.ZodString>;
    metadata: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        visibility: z.ZodDefault<z.ZodEnum<["public", "private", "unlisted", "friends"]>>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
        tags: string[];
        visibility: "public" | "private" | "unlisted" | "friends";
    }, {
        title: string;
        description: string;
        tags?: string[] | undefined;
        visibility?: "public" | "private" | "unlisted" | "friends" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    contentId: string;
    platform: "tiktok" | "instagram" | "youtube" | "facebook" | "twitter" | "linkedin";
    account: string;
    metadata: {
        title: string;
        description: string;
        tags: string[];
        visibility: "public" | "private" | "unlisted" | "friends";
    };
    scheduledAt?: string | undefined;
}, {
    contentId: string;
    platform: "tiktok" | "instagram" | "youtube" | "facebook" | "twitter" | "linkedin";
    account: string;
    metadata: {
        title: string;
        description: string;
        tags?: string[] | undefined;
        visibility?: "public" | "private" | "unlisted" | "friends" | undefined;
    };
    scheduledAt?: string | undefined;
}>;
export type PublishRequest = z.infer<typeof PublishRequestSchema>;
export declare const PublishResultSchema: z.ZodObject<{
    publishId: z.ZodString;
    platform: z.ZodEnum<["tiktok", "instagram", "youtube", "facebook", "twitter", "linkedin"]>;
    externalId: z.ZodString;
    url: z.ZodString;
    status: z.ZodEnum<["draft", "pending_review", "approved", "publishing", "published", "failed", "archived"]>;
    publishedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "pending_review" | "approved" | "publishing" | "published" | "failed" | "archived";
    platform: "tiktok" | "instagram" | "youtube" | "facebook" | "twitter" | "linkedin";
    publishId: string;
    externalId: string;
    url: string;
    publishedAt: string;
}, {
    status: "draft" | "pending_review" | "approved" | "publishing" | "published" | "failed" | "archived";
    platform: "tiktok" | "instagram" | "youtube" | "facebook" | "twitter" | "linkedin";
    publishId: string;
    externalId: string;
    url: string;
    publishedAt: string;
}>;
export type PublishResult = z.infer<typeof PublishResultSchema>;
export declare const PipelineStageSchema: z.ZodObject<{
    name: z.ZodString;
    status: z.ZodEnum<["pending", "in_progress", "completed", "failed", "skipped"]>;
    startedAt: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodString>;
    output: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    status: "failed" | "pending" | "in_progress" | "completed" | "skipped";
    name: string;
    startedAt?: string | undefined;
    completedAt?: string | undefined;
    output?: unknown;
}, {
    status: "failed" | "pending" | "in_progress" | "completed" | "skipped";
    name: string;
    startedAt?: string | undefined;
    completedAt?: string | undefined;
    output?: unknown;
}>;
export type PipelineStage = z.infer<typeof PipelineStageSchema>;
export declare const ContentPipelineSchema: z.ZodObject<{
    id: z.ZodString;
    stages: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        status: z.ZodEnum<["pending", "in_progress", "completed", "failed", "skipped"]>;
        startedAt: z.ZodOptional<z.ZodString>;
        completedAt: z.ZodOptional<z.ZodString>;
        output: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        status: "failed" | "pending" | "in_progress" | "completed" | "skipped";
        name: string;
        startedAt?: string | undefined;
        completedAt?: string | undefined;
        output?: unknown;
    }, {
        status: "failed" | "pending" | "in_progress" | "completed" | "skipped";
        name: string;
        startedAt?: string | undefined;
        completedAt?: string | undefined;
        output?: unknown;
    }>, "many">;
    currentStage: z.ZodNumber;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    stages: {
        status: "failed" | "pending" | "in_progress" | "completed" | "skipped";
        name: string;
        startedAt?: string | undefined;
        completedAt?: string | undefined;
        output?: unknown;
    }[];
    currentStage: number;
    createdAt: string;
}, {
    id: string;
    stages: {
        status: "failed" | "pending" | "in_progress" | "completed" | "skipped";
        name: string;
        startedAt?: string | undefined;
        completedAt?: string | undefined;
        output?: unknown;
    }[];
    currentStage: number;
    createdAt: string;
}>;
export type ContentPipeline = z.infer<typeof ContentPipelineSchema>;
export declare const TemplateConfigSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    category: z.ZodString;
    description: z.ZodString;
    thumbnailUrl: z.ZodOptional<z.ZodString>;
    inputSchema: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    defaultProps: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    isPublic: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    description: string;
    tags: string[];
    name: string;
    id: string;
    category: string;
    inputSchema: Record<string, unknown>;
    defaultProps: Record<string, unknown>;
    isPublic: boolean;
    thumbnailUrl?: string | undefined;
}, {
    description: string;
    name: string;
    id: string;
    category: string;
    inputSchema: Record<string, unknown>;
    defaultProps: Record<string, unknown>;
    tags?: string[] | undefined;
    thumbnailUrl?: string | undefined;
    isPublic?: boolean | undefined;
}>;
export type TemplateConfig = z.infer<typeof TemplateConfigSchema>;
export declare const SyncConfigSchema: z.ZodObject<{
    provider: z.ZodEnum<["meta", "tiktok", "stripe"]>;
    entityType: z.ZodString;
    entityId: z.ZodString;
    lastSyncAt: z.ZodOptional<z.ZodString>;
    syncIntervalMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    provider: "tiktok" | "meta" | "stripe";
    entityType: string;
    entityId: string;
    syncIntervalMs: number;
    lastSyncAt?: string | undefined;
}, {
    provider: "tiktok" | "meta" | "stripe";
    entityType: string;
    entityId: string;
    lastSyncAt?: string | undefined;
    syncIntervalMs?: number | undefined;
}>;
export type SyncConfig = z.infer<typeof SyncConfigSchema>;
export interface Publisher {
    publish(request: PublishRequest): Promise<PublishResult>;
    getStatus(publishId: string): Promise<PublishStatus>;
    delete(externalId: string): Promise<void>;
}
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
export declare const ApprovalStatusEnum: z.ZodEnum<["pending", "approved", "rejected", "revision_requested"]>;
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
export interface ABTestConfig {
    testId: string;
    templateIdA: string;
    templateIdB: string;
    name: string;
    trafficSplit: number;
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
    variantA: {
        impressions: number;
        conversions: number;
        conversionRate: number;
    };
    variantB: {
        impressions: number;
        conversions: number;
        conversionRate: number;
    };
    winner: 'A' | 'B' | 'inconclusive';
    confidence: number;
}
export interface SyndicationResult {
    contentId: string;
    results: Map<Platform, PublishResult | {
        error: string;
    }>;
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
//# sourceMappingURL=types.d.ts.map