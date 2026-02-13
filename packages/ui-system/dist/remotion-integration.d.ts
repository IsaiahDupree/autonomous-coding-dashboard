/**
 * INT-REM-001: Remotion Template Marketplace Types
 * INT-REM-002: Remotion Render History Types
 * INT-REM-003: Remotion Asset Library Types
 *
 * Type definitions and Zod schemas for Remotion product integrations
 * covering the template marketplace, render history, and asset library.
 */
import { z } from "zod";
export declare const RemotionTemplateCategorySchema: z.ZodEnum<["social_media", "ads", "presentations", "intros_outros", "lower_thirds", "transitions", "text_animations", "infographics", "product_demos", "testimonials", "music_visualizers", "explainer", "custom"]>;
export type RemotionTemplateCategory = z.infer<typeof RemotionTemplateCategorySchema>;
export declare const RemotionTemplateListingSchema: z.ZodObject<{
    /** Template identifier */
    id: z.ZodString;
    /** Template name */
    name: z.ZodString;
    /** Template description */
    description: z.ZodString;
    /** Short description (for cards) */
    shortDescription: z.ZodOptional<z.ZodString>;
    /** Category */
    category: z.ZodEnum<["social_media", "ads", "presentations", "intros_outros", "lower_thirds", "transitions", "text_animations", "infographics", "product_demos", "testimonials", "music_visualizers", "explainer", "custom"]>;
    /** Tags */
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Author / creator identifier */
    authorId: z.ZodString;
    /** Author display name */
    authorName: z.ZodString;
    /** Author avatar URL */
    authorAvatar: z.ZodOptional<z.ZodString>;
    /** Whether author is verified */
    authorVerified: z.ZodDefault<z.ZodBoolean>;
    /** Preview thumbnail URL */
    thumbnailUrl: z.ZodString;
    /** Preview video URL */
    previewVideoUrl: z.ZodOptional<z.ZodString>;
    /** Additional preview images */
    previewImages: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Template version */
    version: z.ZodDefault<z.ZodString>;
    /** Aspect ratios supported */
    aspectRatios: z.ZodDefault<z.ZodArray<z.ZodEnum<["16:9", "9:16", "1:1", "4:5", "4:3"]>, "many">>;
    /** Default duration (seconds) */
    defaultDuration: z.ZodNumber;
    /** Minimum duration (seconds) */
    minDuration: z.ZodOptional<z.ZodNumber>;
    /** Maximum duration (seconds) */
    maxDuration: z.ZodOptional<z.ZodNumber>;
    /** Default FPS */
    fps: z.ZodDefault<z.ZodNumber>;
    /** Customizable properties count */
    customizableProperties: z.ZodNumber;
    /** Required input types */
    requiredInputs: z.ZodDefault<z.ZodArray<z.ZodEnum<["text", "image", "video", "audio", "color", "logo"]>, "many">>;
    /** Created timestamp */
    createdAt: z.ZodString;
    /** Updated timestamp */
    updatedAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    id: string;
    name: string;
    description: string;
    category: "custom" | "social_media" | "ads" | "presentations" | "intros_outros" | "lower_thirds" | "transitions" | "text_animations" | "infographics" | "product_demos" | "testimonials" | "music_visualizers" | "explainer";
    createdAt: string;
    updatedAt: string;
    thumbnailUrl: string;
    version: string;
    tags: string[];
    authorId: string;
    authorName: string;
    authorVerified: boolean;
    previewImages: string[];
    aspectRatios: ("16:9" | "9:16" | "1:1" | "4:5" | "4:3")[];
    defaultDuration: number;
    fps: number;
    customizableProperties: number;
    requiredInputs: ("color" | "text" | "logo" | "image" | "video" | "audio")[];
    shortDescription?: string | undefined;
    authorAvatar?: string | undefined;
    previewVideoUrl?: string | undefined;
    minDuration?: number | undefined;
    maxDuration?: number | undefined;
}, {
    id: string;
    name: string;
    description: string;
    category: "custom" | "social_media" | "ads" | "presentations" | "intros_outros" | "lower_thirds" | "transitions" | "text_animations" | "infographics" | "product_demos" | "testimonials" | "music_visualizers" | "explainer";
    createdAt: string;
    updatedAt: string;
    thumbnailUrl: string;
    authorId: string;
    authorName: string;
    defaultDuration: number;
    customizableProperties: number;
    version?: string | undefined;
    shortDescription?: string | undefined;
    tags?: string[] | undefined;
    authorAvatar?: string | undefined;
    authorVerified?: boolean | undefined;
    previewVideoUrl?: string | undefined;
    previewImages?: string[] | undefined;
    aspectRatios?: ("16:9" | "9:16" | "1:1" | "4:5" | "4:3")[] | undefined;
    minDuration?: number | undefined;
    maxDuration?: number | undefined;
    fps?: number | undefined;
    requiredInputs?: ("color" | "text" | "logo" | "image" | "video" | "audio")[] | undefined;
}>;
export type RemotionTemplateListing = z.infer<typeof RemotionTemplateListingSchema>;
export declare const RemotionPricingModelSchema: z.ZodEnum<["free", "one_time", "subscription", "per_render"]>;
export type RemotionPricingModel = z.infer<typeof RemotionPricingModelSchema>;
export declare const RemotionTemplatePricingSchema: z.ZodObject<{
    /** Template identifier */
    templateId: z.ZodString;
    /** Pricing model */
    model: z.ZodEnum<["free", "one_time", "subscription", "per_render"]>;
    /** Price amount (0 for free) */
    price: z.ZodDefault<z.ZodNumber>;
    /** Currency code */
    currency: z.ZodDefault<z.ZodString>;
    /** Subscription billing period (if subscription) */
    billingPeriod: z.ZodOptional<z.ZodEnum<["monthly", "yearly"]>>;
    /** Per-render price (if per_render) */
    perRenderPrice: z.ZodOptional<z.ZodNumber>;
    /** Volume discount tiers (if per_render) */
    volumeDiscounts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        minRenders: z.ZodNumber;
        pricePerRender: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        minRenders: number;
        pricePerRender: number;
    }, {
        minRenders: number;
        pricePerRender: number;
    }>, "many">>;
    /** Free trial renders (if paid) */
    freeTrialRenders: z.ZodDefault<z.ZodNumber>;
    /** License type */
    licenseType: z.ZodDefault<z.ZodEnum<["personal", "commercial", "extended"]>>;
    /** Whether resale is permitted */
    resalePermitted: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    model: "free" | "one_time" | "subscription" | "per_render";
    currency: string;
    templateId: string;
    price: number;
    freeTrialRenders: number;
    licenseType: "personal" | "commercial" | "extended";
    resalePermitted: boolean;
    billingPeriod?: "monthly" | "yearly" | undefined;
    perRenderPrice?: number | undefined;
    volumeDiscounts?: {
        minRenders: number;
        pricePerRender: number;
    }[] | undefined;
}, {
    model: "free" | "one_time" | "subscription" | "per_render";
    templateId: string;
    currency?: string | undefined;
    price?: number | undefined;
    billingPeriod?: "monthly" | "yearly" | undefined;
    perRenderPrice?: number | undefined;
    volumeDiscounts?: {
        minRenders: number;
        pricePerRender: number;
    }[] | undefined;
    freeTrialRenders?: number | undefined;
    licenseType?: "personal" | "commercial" | "extended" | undefined;
    resalePermitted?: boolean | undefined;
}>;
export type RemotionTemplatePricing = z.infer<typeof RemotionTemplatePricingSchema>;
export declare const RemotionTemplateRatingSchema: z.ZodObject<{
    /** Template identifier */
    templateId: z.ZodString;
    /** Average rating (0-5) */
    averageRating: z.ZodNumber;
    /** Total number of ratings */
    totalRatings: z.ZodNumber;
    /** Rating distribution */
    distribution: z.ZodObject<{
        1: z.ZodNumber;
        2: z.ZodNumber;
        3: z.ZodNumber;
        4: z.ZodNumber;
        5: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        4: number;
        3: number;
        5: number;
        1: number;
        2: number;
    }, {
        4: number;
        3: number;
        5: number;
        1: number;
        2: number;
    }>;
    /** Total downloads / uses */
    totalDownloads: z.ZodNumber;
    /** Total renders using this template */
    totalRenders: z.ZodNumber;
    /** Recent reviews */
    recentReviews: z.ZodDefault<z.ZodArray<z.ZodObject<{
        reviewerName: z.ZodString;
        rating: z.ZodNumber;
        comment: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        createdAt: string;
        reviewerName: string;
        rating: number;
        comment?: string | undefined;
    }, {
        createdAt: string;
        reviewerName: string;
        rating: number;
        comment?: string | undefined;
    }>, "many">>;
}, "strict", z.ZodTypeAny, {
    templateId: string;
    averageRating: number;
    totalRatings: number;
    distribution: {
        4: number;
        3: number;
        5: number;
        1: number;
        2: number;
    };
    totalDownloads: number;
    totalRenders: number;
    recentReviews: {
        createdAt: string;
        reviewerName: string;
        rating: number;
        comment?: string | undefined;
    }[];
}, {
    templateId: string;
    averageRating: number;
    totalRatings: number;
    distribution: {
        4: number;
        3: number;
        5: number;
        1: number;
        2: number;
    };
    totalDownloads: number;
    totalRenders: number;
    recentReviews?: {
        createdAt: string;
        reviewerName: string;
        rating: number;
        comment?: string | undefined;
    }[] | undefined;
}>;
export type RemotionTemplateRating = z.infer<typeof RemotionTemplateRatingSchema>;
export declare const TemplateMarketplaceFilterSchema: z.ZodObject<{
    /** Search query */
    query: z.ZodOptional<z.ZodString>;
    /** Category filter */
    categories: z.ZodOptional<z.ZodArray<z.ZodEnum<["social_media", "ads", "presentations", "intros_outros", "lower_thirds", "transitions", "text_animations", "infographics", "product_demos", "testimonials", "music_visualizers", "explainer", "custom"]>, "many">>;
    /** Tag filter */
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Pricing model filter */
    pricingModels: z.ZodOptional<z.ZodArray<z.ZodEnum<["free", "one_time", "subscription", "per_render"]>, "many">>;
    /** Max price */
    maxPrice: z.ZodOptional<z.ZodNumber>;
    /** Min rating */
    minRating: z.ZodOptional<z.ZodNumber>;
    /** Aspect ratio filter */
    aspectRatios: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Sort by */
    sortBy: z.ZodDefault<z.ZodEnum<["relevance", "newest", "popular", "rating", "price_low", "price_high"]>>;
    /** Pagination */
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    pageSize: number;
    sortBy: "rating" | "relevance" | "newest" | "popular" | "price_low" | "price_high";
    page: number;
    tags?: string[] | undefined;
    aspectRatios?: string[] | undefined;
    query?: string | undefined;
    categories?: ("custom" | "social_media" | "ads" | "presentations" | "intros_outros" | "lower_thirds" | "transitions" | "text_animations" | "infographics" | "product_demos" | "testimonials" | "music_visualizers" | "explainer")[] | undefined;
    pricingModels?: ("free" | "one_time" | "subscription" | "per_render")[] | undefined;
    maxPrice?: number | undefined;
    minRating?: number | undefined;
}, {
    pageSize?: number | undefined;
    tags?: string[] | undefined;
    aspectRatios?: string[] | undefined;
    query?: string | undefined;
    categories?: ("custom" | "social_media" | "ads" | "presentations" | "intros_outros" | "lower_thirds" | "transitions" | "text_animations" | "infographics" | "product_demos" | "testimonials" | "music_visualizers" | "explainer")[] | undefined;
    pricingModels?: ("free" | "one_time" | "subscription" | "per_render")[] | undefined;
    maxPrice?: number | undefined;
    minRating?: number | undefined;
    sortBy?: "rating" | "relevance" | "newest" | "popular" | "price_low" | "price_high" | undefined;
    page?: number | undefined;
}>;
export type TemplateMarketplaceFilter = z.infer<typeof TemplateMarketplaceFilterSchema>;
export declare const RenderStatusSchema: z.ZodEnum<["queued", "rendering", "compositing", "encoding", "uploading", "completed", "failed", "cancelled"]>;
export type RenderStatus = z.infer<typeof RenderStatusSchema>;
export declare const RenderJobSchema: z.ZodObject<{
    /** Render job identifier */
    id: z.ZodString;
    /** Template identifier used */
    templateId: z.ZodString;
    /** Template name */
    templateName: z.ZodString;
    /** User / project identifier */
    userId: z.ZodString;
    /** Project identifier */
    projectId: z.ZodOptional<z.ZodString>;
    /** Render status */
    status: z.ZodEnum<["queued", "rendering", "compositing", "encoding", "uploading", "completed", "failed", "cancelled"]>;
    /** Progress (0-100) */
    progress: z.ZodDefault<z.ZodNumber>;
    /** Current render step description */
    currentStep: z.ZodOptional<z.ZodString>;
    /** Output configuration */
    outputConfig: z.ZodObject<{
        /** Output format */
        format: z.ZodEnum<["mp4", "webm", "gif", "png_sequence", "mov"]>;
        /** Output resolution */
        width: z.ZodNumber;
        height: z.ZodNumber;
        /** Frame rate */
        fps: z.ZodDefault<z.ZodNumber>;
        /** Quality (1-100) */
        quality: z.ZodDefault<z.ZodNumber>;
        /** Codec */
        codec: z.ZodOptional<z.ZodEnum<["h264", "h265", "vp8", "vp9", "prores", "gif"]>>;
        /** Duration (seconds) */
        duration: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        height: number;
        width: number;
        duration: number;
        format: "mp4" | "webm" | "gif" | "png_sequence" | "mov";
        fps: number;
        quality: number;
        codec?: "gif" | "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
    }, {
        height: number;
        width: number;
        duration: number;
        format: "mp4" | "webm" | "gif" | "png_sequence" | "mov";
        fps?: number | undefined;
        quality?: number | undefined;
        codec?: "gif" | "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
    }>;
    /** Input parameters used */
    inputParams: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    /** Output file URL (when completed) */
    outputUrl: z.ZodOptional<z.ZodString>;
    /** Output file size (bytes) */
    outputSizeBytes: z.ZodOptional<z.ZodNumber>;
    /** Render start timestamp */
    startedAt: z.ZodOptional<z.ZodString>;
    /** Render completion timestamp */
    completedAt: z.ZodOptional<z.ZodString>;
    /** Render duration (ms) */
    renderDurationMs: z.ZodOptional<z.ZodNumber>;
    /** Error message (if failed) */
    errorMessage: z.ZodOptional<z.ZodString>;
    /** Error code */
    errorCode: z.ZodOptional<z.ZodString>;
    /** Retry count */
    retryCount: z.ZodDefault<z.ZodNumber>;
    /** Max retries */
    maxRetries: z.ZodDefault<z.ZodNumber>;
    /** Created timestamp */
    createdAt: z.ZodString;
    /** Lambda function used */
    lambdaFunction: z.ZodOptional<z.ZodString>;
    /** AWS region used */
    region: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    status: "completed" | "queued" | "rendering" | "compositing" | "encoding" | "uploading" | "failed" | "cancelled";
    id: string;
    createdAt: string;
    progress: number;
    templateId: string;
    templateName: string;
    userId: string;
    outputConfig: {
        height: number;
        width: number;
        duration: number;
        format: "mp4" | "webm" | "gif" | "png_sequence" | "mov";
        fps: number;
        quality: number;
        codec?: "gif" | "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
    };
    retryCount: number;
    maxRetries: number;
    errorMessage?: string | undefined;
    projectId?: string | undefined;
    currentStep?: string | undefined;
    inputParams?: Record<string, unknown> | undefined;
    outputUrl?: string | undefined;
    outputSizeBytes?: number | undefined;
    startedAt?: string | undefined;
    completedAt?: string | undefined;
    renderDurationMs?: number | undefined;
    errorCode?: string | undefined;
    lambdaFunction?: string | undefined;
    region?: string | undefined;
}, {
    status: "completed" | "queued" | "rendering" | "compositing" | "encoding" | "uploading" | "failed" | "cancelled";
    id: string;
    createdAt: string;
    templateId: string;
    templateName: string;
    userId: string;
    outputConfig: {
        height: number;
        width: number;
        duration: number;
        format: "mp4" | "webm" | "gif" | "png_sequence" | "mov";
        fps?: number | undefined;
        quality?: number | undefined;
        codec?: "gif" | "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
    };
    progress?: number | undefined;
    errorMessage?: string | undefined;
    projectId?: string | undefined;
    currentStep?: string | undefined;
    inputParams?: Record<string, unknown> | undefined;
    outputUrl?: string | undefined;
    outputSizeBytes?: number | undefined;
    startedAt?: string | undefined;
    completedAt?: string | undefined;
    renderDurationMs?: number | undefined;
    errorCode?: string | undefined;
    retryCount?: number | undefined;
    maxRetries?: number | undefined;
    lambdaFunction?: string | undefined;
    region?: string | undefined;
}>;
export type RenderJob = z.infer<typeof RenderJobSchema>;
export declare const RenderStatusHistoryEntrySchema: z.ZodObject<{
    /** Status */
    status: z.ZodEnum<["queued", "rendering", "compositing", "encoding", "uploading", "completed", "failed", "cancelled"]>;
    /** Timestamp */
    timestamp: z.ZodString;
    /** Progress at this point */
    progress: z.ZodNumber;
    /** Additional details */
    details: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    status: "completed" | "queued" | "rendering" | "compositing" | "encoding" | "uploading" | "failed" | "cancelled";
    progress: number;
    timestamp: string;
    details?: string | undefined;
}, {
    status: "completed" | "queued" | "rendering" | "compositing" | "encoding" | "uploading" | "failed" | "cancelled";
    progress: number;
    timestamp: string;
    details?: string | undefined;
}>;
export type RenderStatusHistoryEntry = z.infer<typeof RenderStatusHistoryEntrySchema>;
export declare const RenderStatusTrackingSchema: z.ZodObject<{
    /** Render job identifier */
    jobId: z.ZodString;
    /** Current status */
    currentStatus: z.ZodEnum<["queued", "rendering", "compositing", "encoding", "uploading", "completed", "failed", "cancelled"]>;
    /** Status history */
    history: z.ZodArray<z.ZodObject<{
        /** Status */
        status: z.ZodEnum<["queued", "rendering", "compositing", "encoding", "uploading", "completed", "failed", "cancelled"]>;
        /** Timestamp */
        timestamp: z.ZodString;
        /** Progress at this point */
        progress: z.ZodNumber;
        /** Additional details */
        details: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        status: "completed" | "queued" | "rendering" | "compositing" | "encoding" | "uploading" | "failed" | "cancelled";
        progress: number;
        timestamp: string;
        details?: string | undefined;
    }, {
        status: "completed" | "queued" | "rendering" | "compositing" | "encoding" | "uploading" | "failed" | "cancelled";
        progress: number;
        timestamp: string;
        details?: string | undefined;
    }>, "many">;
    /** Estimated time remaining (ms) */
    estimatedTimeRemainingMs: z.ZodOptional<z.ZodNumber>;
    /** Current progress */
    progress: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    progress: number;
    jobId: string;
    currentStatus: "completed" | "queued" | "rendering" | "compositing" | "encoding" | "uploading" | "failed" | "cancelled";
    history: {
        status: "completed" | "queued" | "rendering" | "compositing" | "encoding" | "uploading" | "failed" | "cancelled";
        progress: number;
        timestamp: string;
        details?: string | undefined;
    }[];
    estimatedTimeRemainingMs?: number | undefined;
}, {
    progress: number;
    jobId: string;
    currentStatus: "completed" | "queued" | "rendering" | "compositing" | "encoding" | "uploading" | "failed" | "cancelled";
    history: {
        status: "completed" | "queued" | "rendering" | "compositing" | "encoding" | "uploading" | "failed" | "cancelled";
        progress: number;
        timestamp: string;
        details?: string | undefined;
    }[];
    estimatedTimeRemainingMs?: number | undefined;
}>;
export type RenderStatusTracking = z.infer<typeof RenderStatusTrackingSchema>;
export declare const RenderCostSchema: z.ZodObject<{
    /** Render job identifier */
    jobId: z.ZodString;
    /** Template cost (if paid template) */
    templateCost: z.ZodDefault<z.ZodNumber>;
    /** Compute cost (Lambda / server) */
    computeCost: z.ZodNumber;
    /** Storage cost */
    storageCost: z.ZodDefault<z.ZodNumber>;
    /** Bandwidth / transfer cost */
    transferCost: z.ZodDefault<z.ZodNumber>;
    /** Total cost */
    totalCost: z.ZodNumber;
    /** Currency */
    currency: z.ZodDefault<z.ZodString>;
    /** Compute duration billed (ms) */
    billedDurationMs: z.ZodNumber;
    /** Memory allocated (MB) */
    memoryAllocatedMb: z.ZodNumber;
    /** Whether this was covered by plan / credits */
    coveredByPlan: z.ZodDefault<z.ZodBoolean>;
    /** Credits used */
    creditsUsed: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    currency: string;
    jobId: string;
    templateCost: number;
    computeCost: number;
    storageCost: number;
    transferCost: number;
    totalCost: number;
    billedDurationMs: number;
    memoryAllocatedMb: number;
    coveredByPlan: boolean;
    creditsUsed: number;
}, {
    jobId: string;
    computeCost: number;
    totalCost: number;
    billedDurationMs: number;
    memoryAllocatedMb: number;
    currency?: string | undefined;
    templateCost?: number | undefined;
    storageCost?: number | undefined;
    transferCost?: number | undefined;
    coveredByPlan?: boolean | undefined;
    creditsUsed?: number | undefined;
}>;
export type RenderCost = z.infer<typeof RenderCostSchema>;
export declare const RenderHistoryDashboardSchema: z.ZodObject<{
    /** Render jobs (paginated) */
    jobs: z.ZodArray<z.ZodObject<{
        /** Render job identifier */
        id: z.ZodString;
        /** Template identifier used */
        templateId: z.ZodString;
        /** Template name */
        templateName: z.ZodString;
        /** User / project identifier */
        userId: z.ZodString;
        /** Project identifier */
        projectId: z.ZodOptional<z.ZodString>;
        /** Render status */
        status: z.ZodEnum<["queued", "rendering", "compositing", "encoding", "uploading", "completed", "failed", "cancelled"]>;
        /** Progress (0-100) */
        progress: z.ZodDefault<z.ZodNumber>;
        /** Current render step description */
        currentStep: z.ZodOptional<z.ZodString>;
        /** Output configuration */
        outputConfig: z.ZodObject<{
            /** Output format */
            format: z.ZodEnum<["mp4", "webm", "gif", "png_sequence", "mov"]>;
            /** Output resolution */
            width: z.ZodNumber;
            height: z.ZodNumber;
            /** Frame rate */
            fps: z.ZodDefault<z.ZodNumber>;
            /** Quality (1-100) */
            quality: z.ZodDefault<z.ZodNumber>;
            /** Codec */
            codec: z.ZodOptional<z.ZodEnum<["h264", "h265", "vp8", "vp9", "prores", "gif"]>>;
            /** Duration (seconds) */
            duration: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            height: number;
            width: number;
            duration: number;
            format: "mp4" | "webm" | "gif" | "png_sequence" | "mov";
            fps: number;
            quality: number;
            codec?: "gif" | "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
        }, {
            height: number;
            width: number;
            duration: number;
            format: "mp4" | "webm" | "gif" | "png_sequence" | "mov";
            fps?: number | undefined;
            quality?: number | undefined;
            codec?: "gif" | "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
        }>;
        /** Input parameters used */
        inputParams: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        /** Output file URL (when completed) */
        outputUrl: z.ZodOptional<z.ZodString>;
        /** Output file size (bytes) */
        outputSizeBytes: z.ZodOptional<z.ZodNumber>;
        /** Render start timestamp */
        startedAt: z.ZodOptional<z.ZodString>;
        /** Render completion timestamp */
        completedAt: z.ZodOptional<z.ZodString>;
        /** Render duration (ms) */
        renderDurationMs: z.ZodOptional<z.ZodNumber>;
        /** Error message (if failed) */
        errorMessage: z.ZodOptional<z.ZodString>;
        /** Error code */
        errorCode: z.ZodOptional<z.ZodString>;
        /** Retry count */
        retryCount: z.ZodDefault<z.ZodNumber>;
        /** Max retries */
        maxRetries: z.ZodDefault<z.ZodNumber>;
        /** Created timestamp */
        createdAt: z.ZodString;
        /** Lambda function used */
        lambdaFunction: z.ZodOptional<z.ZodString>;
        /** AWS region used */
        region: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        status: "completed" | "queued" | "rendering" | "compositing" | "encoding" | "uploading" | "failed" | "cancelled";
        id: string;
        createdAt: string;
        progress: number;
        templateId: string;
        templateName: string;
        userId: string;
        outputConfig: {
            height: number;
            width: number;
            duration: number;
            format: "mp4" | "webm" | "gif" | "png_sequence" | "mov";
            fps: number;
            quality: number;
            codec?: "gif" | "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
        };
        retryCount: number;
        maxRetries: number;
        errorMessage?: string | undefined;
        projectId?: string | undefined;
        currentStep?: string | undefined;
        inputParams?: Record<string, unknown> | undefined;
        outputUrl?: string | undefined;
        outputSizeBytes?: number | undefined;
        startedAt?: string | undefined;
        completedAt?: string | undefined;
        renderDurationMs?: number | undefined;
        errorCode?: string | undefined;
        lambdaFunction?: string | undefined;
        region?: string | undefined;
    }, {
        status: "completed" | "queued" | "rendering" | "compositing" | "encoding" | "uploading" | "failed" | "cancelled";
        id: string;
        createdAt: string;
        templateId: string;
        templateName: string;
        userId: string;
        outputConfig: {
            height: number;
            width: number;
            duration: number;
            format: "mp4" | "webm" | "gif" | "png_sequence" | "mov";
            fps?: number | undefined;
            quality?: number | undefined;
            codec?: "gif" | "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
        };
        progress?: number | undefined;
        errorMessage?: string | undefined;
        projectId?: string | undefined;
        currentStep?: string | undefined;
        inputParams?: Record<string, unknown> | undefined;
        outputUrl?: string | undefined;
        outputSizeBytes?: number | undefined;
        startedAt?: string | undefined;
        completedAt?: string | undefined;
        renderDurationMs?: number | undefined;
        errorCode?: string | undefined;
        retryCount?: number | undefined;
        maxRetries?: number | undefined;
        lambdaFunction?: string | undefined;
        region?: string | undefined;
    }>, "many">;
    /** Pagination */
    pagination: z.ZodObject<{
        page: z.ZodNumber;
        pageSize: z.ZodNumber;
        totalJobs: z.ZodNumber;
        totalPages: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        pageSize: number;
        page: number;
        totalJobs: number;
        totalPages: number;
    }, {
        pageSize: number;
        page: number;
        totalJobs: number;
        totalPages: number;
    }>;
    /** Summary stats */
    summary: z.ZodObject<{
        totalRenders: z.ZodNumber;
        completedRenders: z.ZodNumber;
        failedRenders: z.ZodNumber;
        avgRenderDurationMs: z.ZodNumber;
        totalCost: z.ZodNumber;
        avgCostPerRender: z.ZodNumber;
        mostUsedTemplate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        totalRenders: number;
        totalCost: number;
        completedRenders: number;
        failedRenders: number;
        avgRenderDurationMs: number;
        avgCostPerRender: number;
        mostUsedTemplate?: string | undefined;
    }, {
        totalRenders: number;
        totalCost: number;
        completedRenders: number;
        failedRenders: number;
        avgRenderDurationMs: number;
        avgCostPerRender: number;
        mostUsedTemplate?: string | undefined;
    }>;
    /** Cost breakdown for period */
    costBreakdown: z.ZodObject<{
        compute: z.ZodNumber;
        storage: z.ZodNumber;
        transfer: z.ZodNumber;
        templates: z.ZodNumber;
        total: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        compute: number;
        storage: number;
        transfer: number;
        templates: number;
        total: number;
    }, {
        compute: number;
        storage: number;
        transfer: number;
        templates: number;
        total: number;
    }>;
    /** Filter/sort applied */
    filters: z.ZodOptional<z.ZodObject<{
        status: z.ZodOptional<z.ZodArray<z.ZodEnum<["queued", "rendering", "compositing", "encoding", "uploading", "completed", "failed", "cancelled"]>, "many">>;
        templateId: z.ZodOptional<z.ZodString>;
        dateFrom: z.ZodOptional<z.ZodString>;
        dateTo: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodDefault<z.ZodEnum<["newest", "oldest", "cost", "duration"]>>;
    }, "strip", z.ZodTypeAny, {
        sortBy: "duration" | "newest" | "oldest" | "cost";
        status?: ("completed" | "queued" | "rendering" | "compositing" | "encoding" | "uploading" | "failed" | "cancelled")[] | undefined;
        templateId?: string | undefined;
        dateFrom?: string | undefined;
        dateTo?: string | undefined;
    }, {
        status?: ("completed" | "queued" | "rendering" | "compositing" | "encoding" | "uploading" | "failed" | "cancelled")[] | undefined;
        templateId?: string | undefined;
        sortBy?: "duration" | "newest" | "oldest" | "cost" | undefined;
        dateFrom?: string | undefined;
        dateTo?: string | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    pagination: {
        pageSize: number;
        page: number;
        totalJobs: number;
        totalPages: number;
    };
    summary: {
        totalRenders: number;
        totalCost: number;
        completedRenders: number;
        failedRenders: number;
        avgRenderDurationMs: number;
        avgCostPerRender: number;
        mostUsedTemplate?: string | undefined;
    };
    jobs: {
        status: "completed" | "queued" | "rendering" | "compositing" | "encoding" | "uploading" | "failed" | "cancelled";
        id: string;
        createdAt: string;
        progress: number;
        templateId: string;
        templateName: string;
        userId: string;
        outputConfig: {
            height: number;
            width: number;
            duration: number;
            format: "mp4" | "webm" | "gif" | "png_sequence" | "mov";
            fps: number;
            quality: number;
            codec?: "gif" | "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
        };
        retryCount: number;
        maxRetries: number;
        errorMessage?: string | undefined;
        projectId?: string | undefined;
        currentStep?: string | undefined;
        inputParams?: Record<string, unknown> | undefined;
        outputUrl?: string | undefined;
        outputSizeBytes?: number | undefined;
        startedAt?: string | undefined;
        completedAt?: string | undefined;
        renderDurationMs?: number | undefined;
        errorCode?: string | undefined;
        lambdaFunction?: string | undefined;
        region?: string | undefined;
    }[];
    costBreakdown: {
        compute: number;
        storage: number;
        transfer: number;
        templates: number;
        total: number;
    };
    filters?: {
        sortBy: "duration" | "newest" | "oldest" | "cost";
        status?: ("completed" | "queued" | "rendering" | "compositing" | "encoding" | "uploading" | "failed" | "cancelled")[] | undefined;
        templateId?: string | undefined;
        dateFrom?: string | undefined;
        dateTo?: string | undefined;
    } | undefined;
}, {
    pagination: {
        pageSize: number;
        page: number;
        totalJobs: number;
        totalPages: number;
    };
    summary: {
        totalRenders: number;
        totalCost: number;
        completedRenders: number;
        failedRenders: number;
        avgRenderDurationMs: number;
        avgCostPerRender: number;
        mostUsedTemplate?: string | undefined;
    };
    jobs: {
        status: "completed" | "queued" | "rendering" | "compositing" | "encoding" | "uploading" | "failed" | "cancelled";
        id: string;
        createdAt: string;
        templateId: string;
        templateName: string;
        userId: string;
        outputConfig: {
            height: number;
            width: number;
            duration: number;
            format: "mp4" | "webm" | "gif" | "png_sequence" | "mov";
            fps?: number | undefined;
            quality?: number | undefined;
            codec?: "gif" | "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
        };
        progress?: number | undefined;
        errorMessage?: string | undefined;
        projectId?: string | undefined;
        currentStep?: string | undefined;
        inputParams?: Record<string, unknown> | undefined;
        outputUrl?: string | undefined;
        outputSizeBytes?: number | undefined;
        startedAt?: string | undefined;
        completedAt?: string | undefined;
        renderDurationMs?: number | undefined;
        errorCode?: string | undefined;
        retryCount?: number | undefined;
        maxRetries?: number | undefined;
        lambdaFunction?: string | undefined;
        region?: string | undefined;
    }[];
    costBreakdown: {
        compute: number;
        storage: number;
        transfer: number;
        templates: number;
        total: number;
    };
    filters?: {
        status?: ("completed" | "queued" | "rendering" | "compositing" | "encoding" | "uploading" | "failed" | "cancelled")[] | undefined;
        templateId?: string | undefined;
        sortBy?: "duration" | "newest" | "oldest" | "cost" | undefined;
        dateFrom?: string | undefined;
        dateTo?: string | undefined;
    } | undefined;
}>;
export type RenderHistoryDashboard = z.infer<typeof RenderHistoryDashboardSchema>;
export declare const AssetCategorySchema: z.ZodEnum<["images", "videos", "audio", "fonts", "lottie_animations", "3d_models", "icons", "backgrounds", "overlays", "transitions", "color_palettes", "brand_kits"]>;
export type AssetCategory = z.infer<typeof AssetCategorySchema>;
export declare const UsageRightsSchema: z.ZodObject<{
    /** License type */
    license: z.ZodEnum<["royalty_free", "editorial", "creative_commons", "proprietary", "public_domain", "custom"]>;
    /** Creative Commons variant (if applicable) */
    ccVariant: z.ZodOptional<z.ZodEnum<["CC0", "CC-BY", "CC-BY-SA", "CC-BY-NC", "CC-BY-NC-SA", "CC-BY-ND", "CC-BY-NC-ND"]>>;
    /** Allow commercial use */
    commercialUse: z.ZodBoolean;
    /** Allow modification */
    allowModification: z.ZodBoolean;
    /** Require attribution */
    requireAttribution: z.ZodBoolean;
    /** Attribution text (if required) */
    attributionText: z.ZodOptional<z.ZodString>;
    /** Usage limit (renders, 0 = unlimited) */
    usageLimit: z.ZodDefault<z.ZodNumber>;
    /** Geographic restrictions */
    geographicRestrictions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Expiration date (if time-limited) */
    expiresAt: z.ZodOptional<z.ZodString>;
    /** Source / provider */
    source: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    license: "custom" | "royalty_free" | "editorial" | "creative_commons" | "proprietary" | "public_domain";
    commercialUse: boolean;
    allowModification: boolean;
    requireAttribution: boolean;
    usageLimit: number;
    geographicRestrictions: string[];
    ccVariant?: "CC0" | "CC-BY" | "CC-BY-SA" | "CC-BY-NC" | "CC-BY-NC-SA" | "CC-BY-ND" | "CC-BY-NC-ND" | undefined;
    attributionText?: string | undefined;
    expiresAt?: string | undefined;
    source?: string | undefined;
}, {
    license: "custom" | "royalty_free" | "editorial" | "creative_commons" | "proprietary" | "public_domain";
    commercialUse: boolean;
    allowModification: boolean;
    requireAttribution: boolean;
    ccVariant?: "CC0" | "CC-BY" | "CC-BY-SA" | "CC-BY-NC" | "CC-BY-NC-SA" | "CC-BY-ND" | "CC-BY-NC-ND" | undefined;
    attributionText?: string | undefined;
    usageLimit?: number | undefined;
    geographicRestrictions?: string[] | undefined;
    expiresAt?: string | undefined;
    source?: string | undefined;
}>;
export type UsageRights = z.infer<typeof UsageRightsSchema>;
export declare const AssetEntrySchema: z.ZodObject<{
    /** Asset identifier */
    id: z.ZodString;
    /** Asset name */
    name: z.ZodString;
    /** Asset description */
    description: z.ZodOptional<z.ZodString>;
    /** Category */
    category: z.ZodEnum<["images", "videos", "audio", "fonts", "lottie_animations", "3d_models", "icons", "backgrounds", "overlays", "transitions", "color_palettes", "brand_kits"]>;
    /** Tags */
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** File type / MIME type */
    mimeType: z.ZodString;
    /** File extension */
    extension: z.ZodString;
    /** File size (bytes) */
    fileSizeBytes: z.ZodNumber;
    /** Preview URL (thumbnail, waveform, etc.) */
    previewUrl: z.ZodString;
    /** Full asset URL */
    assetUrl: z.ZodString;
    /** Additional preview URLs (e.g., multiple resolutions) */
    additionalPreviews: z.ZodDefault<z.ZodArray<z.ZodObject<{
        url: z.ZodString;
        label: z.ZodString;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        url: string;
        height?: number | undefined;
        width?: number | undefined;
    }, {
        label: string;
        url: string;
        height?: number | undefined;
        width?: number | undefined;
    }>, "many">>;
    /** Dimensions (for images/videos) */
    dimensions: z.ZodOptional<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        height: number;
        width: number;
    }, {
        height: number;
        width: number;
    }>>;
    /** Duration in seconds (for audio/video) */
    duration: z.ZodOptional<z.ZodNumber>;
    /** Frame rate (for video) */
    fps: z.ZodOptional<z.ZodNumber>;
    /** Has alpha / transparency */
    hasAlpha: z.ZodOptional<z.ZodBoolean>;
    /** Color profile */
    colorProfile: z.ZodOptional<z.ZodString>;
    /** Usage rights */
    usageRights: z.ZodObject<{
        /** License type */
        license: z.ZodEnum<["royalty_free", "editorial", "creative_commons", "proprietary", "public_domain", "custom"]>;
        /** Creative Commons variant (if applicable) */
        ccVariant: z.ZodOptional<z.ZodEnum<["CC0", "CC-BY", "CC-BY-SA", "CC-BY-NC", "CC-BY-NC-SA", "CC-BY-ND", "CC-BY-NC-ND"]>>;
        /** Allow commercial use */
        commercialUse: z.ZodBoolean;
        /** Allow modification */
        allowModification: z.ZodBoolean;
        /** Require attribution */
        requireAttribution: z.ZodBoolean;
        /** Attribution text (if required) */
        attributionText: z.ZodOptional<z.ZodString>;
        /** Usage limit (renders, 0 = unlimited) */
        usageLimit: z.ZodDefault<z.ZodNumber>;
        /** Geographic restrictions */
        geographicRestrictions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Expiration date (if time-limited) */
        expiresAt: z.ZodOptional<z.ZodString>;
        /** Source / provider */
        source: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        license: "custom" | "royalty_free" | "editorial" | "creative_commons" | "proprietary" | "public_domain";
        commercialUse: boolean;
        allowModification: boolean;
        requireAttribution: boolean;
        usageLimit: number;
        geographicRestrictions: string[];
        ccVariant?: "CC0" | "CC-BY" | "CC-BY-SA" | "CC-BY-NC" | "CC-BY-NC-SA" | "CC-BY-ND" | "CC-BY-NC-ND" | undefined;
        attributionText?: string | undefined;
        expiresAt?: string | undefined;
        source?: string | undefined;
    }, {
        license: "custom" | "royalty_free" | "editorial" | "creative_commons" | "proprietary" | "public_domain";
        commercialUse: boolean;
        allowModification: boolean;
        requireAttribution: boolean;
        ccVariant?: "CC0" | "CC-BY" | "CC-BY-SA" | "CC-BY-NC" | "CC-BY-NC-SA" | "CC-BY-ND" | "CC-BY-NC-ND" | undefined;
        attributionText?: string | undefined;
        usageLimit?: number | undefined;
        geographicRestrictions?: string[] | undefined;
        expiresAt?: string | undefined;
        source?: string | undefined;
    }>;
    /** Usage count (how many times used in renders) */
    usageCount: z.ZodDefault<z.ZodNumber>;
    /** Last used timestamp */
    lastUsedAt: z.ZodOptional<z.ZodString>;
    /** Uploaded by user identifier */
    uploadedBy: z.ZodString;
    /** Whether this is a user upload or system/stock asset */
    isUserUpload: z.ZodDefault<z.ZodBoolean>;
    /** Is favorite / starred */
    isFavorite: z.ZodDefault<z.ZodBoolean>;
    /** Created timestamp */
    createdAt: z.ZodString;
    /** Updated timestamp */
    updatedAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    id: string;
    name: string;
    category: "transitions" | "audio" | "images" | "videos" | "fonts" | "lottie_animations" | "3d_models" | "icons" | "backgrounds" | "overlays" | "color_palettes" | "brand_kits";
    createdAt: string;
    updatedAt: string;
    tags: string[];
    mimeType: string;
    extension: string;
    fileSizeBytes: number;
    previewUrl: string;
    assetUrl: string;
    additionalPreviews: {
        label: string;
        url: string;
        height?: number | undefined;
        width?: number | undefined;
    }[];
    usageRights: {
        license: "custom" | "royalty_free" | "editorial" | "creative_commons" | "proprietary" | "public_domain";
        commercialUse: boolean;
        allowModification: boolean;
        requireAttribution: boolean;
        usageLimit: number;
        geographicRestrictions: string[];
        ccVariant?: "CC0" | "CC-BY" | "CC-BY-SA" | "CC-BY-NC" | "CC-BY-NC-SA" | "CC-BY-ND" | "CC-BY-NC-ND" | undefined;
        attributionText?: string | undefined;
        expiresAt?: string | undefined;
        source?: string | undefined;
    };
    usageCount: number;
    uploadedBy: string;
    isUserUpload: boolean;
    isFavorite: boolean;
    description?: string | undefined;
    duration?: number | undefined;
    fps?: number | undefined;
    dimensions?: {
        height: number;
        width: number;
    } | undefined;
    hasAlpha?: boolean | undefined;
    colorProfile?: string | undefined;
    lastUsedAt?: string | undefined;
}, {
    id: string;
    name: string;
    category: "transitions" | "audio" | "images" | "videos" | "fonts" | "lottie_animations" | "3d_models" | "icons" | "backgrounds" | "overlays" | "color_palettes" | "brand_kits";
    createdAt: string;
    updatedAt: string;
    mimeType: string;
    extension: string;
    fileSizeBytes: number;
    previewUrl: string;
    assetUrl: string;
    usageRights: {
        license: "custom" | "royalty_free" | "editorial" | "creative_commons" | "proprietary" | "public_domain";
        commercialUse: boolean;
        allowModification: boolean;
        requireAttribution: boolean;
        ccVariant?: "CC0" | "CC-BY" | "CC-BY-SA" | "CC-BY-NC" | "CC-BY-NC-SA" | "CC-BY-ND" | "CC-BY-NC-ND" | undefined;
        attributionText?: string | undefined;
        usageLimit?: number | undefined;
        geographicRestrictions?: string[] | undefined;
        expiresAt?: string | undefined;
        source?: string | undefined;
    };
    uploadedBy: string;
    description?: string | undefined;
    duration?: number | undefined;
    tags?: string[] | undefined;
    fps?: number | undefined;
    additionalPreviews?: {
        label: string;
        url: string;
        height?: number | undefined;
        width?: number | undefined;
    }[] | undefined;
    dimensions?: {
        height: number;
        width: number;
    } | undefined;
    hasAlpha?: boolean | undefined;
    colorProfile?: string | undefined;
    usageCount?: number | undefined;
    lastUsedAt?: string | undefined;
    isUserUpload?: boolean | undefined;
    isFavorite?: boolean | undefined;
}>;
export type AssetEntry = z.infer<typeof AssetEntrySchema>;
export declare const AssetLibraryFilterSchema: z.ZodObject<{
    /** Search query */
    query: z.ZodOptional<z.ZodString>;
    /** Category filter */
    categories: z.ZodOptional<z.ZodArray<z.ZodEnum<["images", "videos", "audio", "fonts", "lottie_animations", "3d_models", "icons", "backgrounds", "overlays", "transitions", "color_palettes", "brand_kits"]>, "many">>;
    /** Tag filter */
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** License type filter */
    licenseTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Only user uploads */
    userUploadsOnly: z.ZodOptional<z.ZodBoolean>;
    /** Only favorites */
    favoritesOnly: z.ZodOptional<z.ZodBoolean>;
    /** File type filter */
    mimeTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Sort by */
    sortBy: z.ZodDefault<z.ZodEnum<["newest", "oldest", "name", "size", "most_used", "recently_used"]>>;
    /** Pagination */
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    pageSize: number;
    sortBy: "size" | "name" | "newest" | "oldest" | "most_used" | "recently_used";
    page: number;
    tags?: string[] | undefined;
    query?: string | undefined;
    categories?: ("transitions" | "audio" | "images" | "videos" | "fonts" | "lottie_animations" | "3d_models" | "icons" | "backgrounds" | "overlays" | "color_palettes" | "brand_kits")[] | undefined;
    licenseTypes?: string[] | undefined;
    userUploadsOnly?: boolean | undefined;
    favoritesOnly?: boolean | undefined;
    mimeTypes?: string[] | undefined;
}, {
    pageSize?: number | undefined;
    tags?: string[] | undefined;
    query?: string | undefined;
    categories?: ("transitions" | "audio" | "images" | "videos" | "fonts" | "lottie_animations" | "3d_models" | "icons" | "backgrounds" | "overlays" | "color_palettes" | "brand_kits")[] | undefined;
    sortBy?: "size" | "name" | "newest" | "oldest" | "most_used" | "recently_used" | undefined;
    page?: number | undefined;
    licenseTypes?: string[] | undefined;
    userUploadsOnly?: boolean | undefined;
    favoritesOnly?: boolean | undefined;
    mimeTypes?: string[] | undefined;
}>;
export type AssetLibraryFilter = z.infer<typeof AssetLibraryFilterSchema>;
export declare const AssetLibraryDashboardSchema: z.ZodObject<{
    /** Assets (paginated) */
    assets: z.ZodArray<z.ZodObject<{
        /** Asset identifier */
        id: z.ZodString;
        /** Asset name */
        name: z.ZodString;
        /** Asset description */
        description: z.ZodOptional<z.ZodString>;
        /** Category */
        category: z.ZodEnum<["images", "videos", "audio", "fonts", "lottie_animations", "3d_models", "icons", "backgrounds", "overlays", "transitions", "color_palettes", "brand_kits"]>;
        /** Tags */
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** File type / MIME type */
        mimeType: z.ZodString;
        /** File extension */
        extension: z.ZodString;
        /** File size (bytes) */
        fileSizeBytes: z.ZodNumber;
        /** Preview URL (thumbnail, waveform, etc.) */
        previewUrl: z.ZodString;
        /** Full asset URL */
        assetUrl: z.ZodString;
        /** Additional preview URLs (e.g., multiple resolutions) */
        additionalPreviews: z.ZodDefault<z.ZodArray<z.ZodObject<{
            url: z.ZodString;
            label: z.ZodString;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            url: string;
            height?: number | undefined;
            width?: number | undefined;
        }, {
            label: string;
            url: string;
            height?: number | undefined;
            width?: number | undefined;
        }>, "many">>;
        /** Dimensions (for images/videos) */
        dimensions: z.ZodOptional<z.ZodObject<{
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            height: number;
            width: number;
        }, {
            height: number;
            width: number;
        }>>;
        /** Duration in seconds (for audio/video) */
        duration: z.ZodOptional<z.ZodNumber>;
        /** Frame rate (for video) */
        fps: z.ZodOptional<z.ZodNumber>;
        /** Has alpha / transparency */
        hasAlpha: z.ZodOptional<z.ZodBoolean>;
        /** Color profile */
        colorProfile: z.ZodOptional<z.ZodString>;
        /** Usage rights */
        usageRights: z.ZodObject<{
            /** License type */
            license: z.ZodEnum<["royalty_free", "editorial", "creative_commons", "proprietary", "public_domain", "custom"]>;
            /** Creative Commons variant (if applicable) */
            ccVariant: z.ZodOptional<z.ZodEnum<["CC0", "CC-BY", "CC-BY-SA", "CC-BY-NC", "CC-BY-NC-SA", "CC-BY-ND", "CC-BY-NC-ND"]>>;
            /** Allow commercial use */
            commercialUse: z.ZodBoolean;
            /** Allow modification */
            allowModification: z.ZodBoolean;
            /** Require attribution */
            requireAttribution: z.ZodBoolean;
            /** Attribution text (if required) */
            attributionText: z.ZodOptional<z.ZodString>;
            /** Usage limit (renders, 0 = unlimited) */
            usageLimit: z.ZodDefault<z.ZodNumber>;
            /** Geographic restrictions */
            geographicRestrictions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Expiration date (if time-limited) */
            expiresAt: z.ZodOptional<z.ZodString>;
            /** Source / provider */
            source: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            license: "custom" | "royalty_free" | "editorial" | "creative_commons" | "proprietary" | "public_domain";
            commercialUse: boolean;
            allowModification: boolean;
            requireAttribution: boolean;
            usageLimit: number;
            geographicRestrictions: string[];
            ccVariant?: "CC0" | "CC-BY" | "CC-BY-SA" | "CC-BY-NC" | "CC-BY-NC-SA" | "CC-BY-ND" | "CC-BY-NC-ND" | undefined;
            attributionText?: string | undefined;
            expiresAt?: string | undefined;
            source?: string | undefined;
        }, {
            license: "custom" | "royalty_free" | "editorial" | "creative_commons" | "proprietary" | "public_domain";
            commercialUse: boolean;
            allowModification: boolean;
            requireAttribution: boolean;
            ccVariant?: "CC0" | "CC-BY" | "CC-BY-SA" | "CC-BY-NC" | "CC-BY-NC-SA" | "CC-BY-ND" | "CC-BY-NC-ND" | undefined;
            attributionText?: string | undefined;
            usageLimit?: number | undefined;
            geographicRestrictions?: string[] | undefined;
            expiresAt?: string | undefined;
            source?: string | undefined;
        }>;
        /** Usage count (how many times used in renders) */
        usageCount: z.ZodDefault<z.ZodNumber>;
        /** Last used timestamp */
        lastUsedAt: z.ZodOptional<z.ZodString>;
        /** Uploaded by user identifier */
        uploadedBy: z.ZodString;
        /** Whether this is a user upload or system/stock asset */
        isUserUpload: z.ZodDefault<z.ZodBoolean>;
        /** Is favorite / starred */
        isFavorite: z.ZodDefault<z.ZodBoolean>;
        /** Created timestamp */
        createdAt: z.ZodString;
        /** Updated timestamp */
        updatedAt: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        id: string;
        name: string;
        category: "transitions" | "audio" | "images" | "videos" | "fonts" | "lottie_animations" | "3d_models" | "icons" | "backgrounds" | "overlays" | "color_palettes" | "brand_kits";
        createdAt: string;
        updatedAt: string;
        tags: string[];
        mimeType: string;
        extension: string;
        fileSizeBytes: number;
        previewUrl: string;
        assetUrl: string;
        additionalPreviews: {
            label: string;
            url: string;
            height?: number | undefined;
            width?: number | undefined;
        }[];
        usageRights: {
            license: "custom" | "royalty_free" | "editorial" | "creative_commons" | "proprietary" | "public_domain";
            commercialUse: boolean;
            allowModification: boolean;
            requireAttribution: boolean;
            usageLimit: number;
            geographicRestrictions: string[];
            ccVariant?: "CC0" | "CC-BY" | "CC-BY-SA" | "CC-BY-NC" | "CC-BY-NC-SA" | "CC-BY-ND" | "CC-BY-NC-ND" | undefined;
            attributionText?: string | undefined;
            expiresAt?: string | undefined;
            source?: string | undefined;
        };
        usageCount: number;
        uploadedBy: string;
        isUserUpload: boolean;
        isFavorite: boolean;
        description?: string | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        dimensions?: {
            height: number;
            width: number;
        } | undefined;
        hasAlpha?: boolean | undefined;
        colorProfile?: string | undefined;
        lastUsedAt?: string | undefined;
    }, {
        id: string;
        name: string;
        category: "transitions" | "audio" | "images" | "videos" | "fonts" | "lottie_animations" | "3d_models" | "icons" | "backgrounds" | "overlays" | "color_palettes" | "brand_kits";
        createdAt: string;
        updatedAt: string;
        mimeType: string;
        extension: string;
        fileSizeBytes: number;
        previewUrl: string;
        assetUrl: string;
        usageRights: {
            license: "custom" | "royalty_free" | "editorial" | "creative_commons" | "proprietary" | "public_domain";
            commercialUse: boolean;
            allowModification: boolean;
            requireAttribution: boolean;
            ccVariant?: "CC0" | "CC-BY" | "CC-BY-SA" | "CC-BY-NC" | "CC-BY-NC-SA" | "CC-BY-ND" | "CC-BY-NC-ND" | undefined;
            attributionText?: string | undefined;
            usageLimit?: number | undefined;
            geographicRestrictions?: string[] | undefined;
            expiresAt?: string | undefined;
            source?: string | undefined;
        };
        uploadedBy: string;
        description?: string | undefined;
        duration?: number | undefined;
        tags?: string[] | undefined;
        fps?: number | undefined;
        additionalPreviews?: {
            label: string;
            url: string;
            height?: number | undefined;
            width?: number | undefined;
        }[] | undefined;
        dimensions?: {
            height: number;
            width: number;
        } | undefined;
        hasAlpha?: boolean | undefined;
        colorProfile?: string | undefined;
        usageCount?: number | undefined;
        lastUsedAt?: string | undefined;
        isUserUpload?: boolean | undefined;
        isFavorite?: boolean | undefined;
    }>, "many">;
    /** Pagination */
    pagination: z.ZodObject<{
        page: z.ZodNumber;
        pageSize: z.ZodNumber;
        totalAssets: z.ZodNumber;
        totalPages: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        pageSize: number;
        page: number;
        totalPages: number;
        totalAssets: number;
    }, {
        pageSize: number;
        page: number;
        totalPages: number;
        totalAssets: number;
    }>;
    /** Storage summary */
    storageSummary: z.ZodObject<{
        totalAssets: z.ZodNumber;
        totalSizeBytes: z.ZodNumber;
        storageLimitBytes: z.ZodNumber;
        usagePercentage: z.ZodNumber;
        byCategory: z.ZodRecord<z.ZodEnum<["images", "videos", "audio", "fonts", "lottie_animations", "3d_models", "icons", "backgrounds", "overlays", "transitions", "color_palettes", "brand_kits"]>, z.ZodObject<{
            count: z.ZodNumber;
            sizeBytes: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            count: number;
            sizeBytes: number;
        }, {
            count: number;
            sizeBytes: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        totalAssets: number;
        totalSizeBytes: number;
        storageLimitBytes: number;
        usagePercentage: number;
        byCategory: Partial<Record<"transitions" | "audio" | "images" | "videos" | "fonts" | "lottie_animations" | "3d_models" | "icons" | "backgrounds" | "overlays" | "color_palettes" | "brand_kits", {
            count: number;
            sizeBytes: number;
        }>>;
    }, {
        totalAssets: number;
        totalSizeBytes: number;
        storageLimitBytes: number;
        usagePercentage: number;
        byCategory: Partial<Record<"transitions" | "audio" | "images" | "videos" | "fonts" | "lottie_animations" | "3d_models" | "icons" | "backgrounds" | "overlays" | "color_palettes" | "brand_kits", {
            count: number;
            sizeBytes: number;
        }>>;
    }>;
    /** Active filter */
    appliedFilter: z.ZodOptional<z.ZodObject<{
        /** Search query */
        query: z.ZodOptional<z.ZodString>;
        /** Category filter */
        categories: z.ZodOptional<z.ZodArray<z.ZodEnum<["images", "videos", "audio", "fonts", "lottie_animations", "3d_models", "icons", "backgrounds", "overlays", "transitions", "color_palettes", "brand_kits"]>, "many">>;
        /** Tag filter */
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** License type filter */
        licenseTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Only user uploads */
        userUploadsOnly: z.ZodOptional<z.ZodBoolean>;
        /** Only favorites */
        favoritesOnly: z.ZodOptional<z.ZodBoolean>;
        /** File type filter */
        mimeTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Sort by */
        sortBy: z.ZodDefault<z.ZodEnum<["newest", "oldest", "name", "size", "most_used", "recently_used"]>>;
        /** Pagination */
        page: z.ZodDefault<z.ZodNumber>;
        pageSize: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        pageSize: number;
        sortBy: "size" | "name" | "newest" | "oldest" | "most_used" | "recently_used";
        page: number;
        tags?: string[] | undefined;
        query?: string | undefined;
        categories?: ("transitions" | "audio" | "images" | "videos" | "fonts" | "lottie_animations" | "3d_models" | "icons" | "backgrounds" | "overlays" | "color_palettes" | "brand_kits")[] | undefined;
        licenseTypes?: string[] | undefined;
        userUploadsOnly?: boolean | undefined;
        favoritesOnly?: boolean | undefined;
        mimeTypes?: string[] | undefined;
    }, {
        pageSize?: number | undefined;
        tags?: string[] | undefined;
        query?: string | undefined;
        categories?: ("transitions" | "audio" | "images" | "videos" | "fonts" | "lottie_animations" | "3d_models" | "icons" | "backgrounds" | "overlays" | "color_palettes" | "brand_kits")[] | undefined;
        sortBy?: "size" | "name" | "newest" | "oldest" | "most_used" | "recently_used" | undefined;
        page?: number | undefined;
        licenseTypes?: string[] | undefined;
        userUploadsOnly?: boolean | undefined;
        favoritesOnly?: boolean | undefined;
        mimeTypes?: string[] | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    pagination: {
        pageSize: number;
        page: number;
        totalPages: number;
        totalAssets: number;
    };
    assets: {
        id: string;
        name: string;
        category: "transitions" | "audio" | "images" | "videos" | "fonts" | "lottie_animations" | "3d_models" | "icons" | "backgrounds" | "overlays" | "color_palettes" | "brand_kits";
        createdAt: string;
        updatedAt: string;
        tags: string[];
        mimeType: string;
        extension: string;
        fileSizeBytes: number;
        previewUrl: string;
        assetUrl: string;
        additionalPreviews: {
            label: string;
            url: string;
            height?: number | undefined;
            width?: number | undefined;
        }[];
        usageRights: {
            license: "custom" | "royalty_free" | "editorial" | "creative_commons" | "proprietary" | "public_domain";
            commercialUse: boolean;
            allowModification: boolean;
            requireAttribution: boolean;
            usageLimit: number;
            geographicRestrictions: string[];
            ccVariant?: "CC0" | "CC-BY" | "CC-BY-SA" | "CC-BY-NC" | "CC-BY-NC-SA" | "CC-BY-ND" | "CC-BY-NC-ND" | undefined;
            attributionText?: string | undefined;
            expiresAt?: string | undefined;
            source?: string | undefined;
        };
        usageCount: number;
        uploadedBy: string;
        isUserUpload: boolean;
        isFavorite: boolean;
        description?: string | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        dimensions?: {
            height: number;
            width: number;
        } | undefined;
        hasAlpha?: boolean | undefined;
        colorProfile?: string | undefined;
        lastUsedAt?: string | undefined;
    }[];
    storageSummary: {
        totalAssets: number;
        totalSizeBytes: number;
        storageLimitBytes: number;
        usagePercentage: number;
        byCategory: Partial<Record<"transitions" | "audio" | "images" | "videos" | "fonts" | "lottie_animations" | "3d_models" | "icons" | "backgrounds" | "overlays" | "color_palettes" | "brand_kits", {
            count: number;
            sizeBytes: number;
        }>>;
    };
    appliedFilter?: {
        pageSize: number;
        sortBy: "size" | "name" | "newest" | "oldest" | "most_used" | "recently_used";
        page: number;
        tags?: string[] | undefined;
        query?: string | undefined;
        categories?: ("transitions" | "audio" | "images" | "videos" | "fonts" | "lottie_animations" | "3d_models" | "icons" | "backgrounds" | "overlays" | "color_palettes" | "brand_kits")[] | undefined;
        licenseTypes?: string[] | undefined;
        userUploadsOnly?: boolean | undefined;
        favoritesOnly?: boolean | undefined;
        mimeTypes?: string[] | undefined;
    } | undefined;
}, {
    pagination: {
        pageSize: number;
        page: number;
        totalPages: number;
        totalAssets: number;
    };
    assets: {
        id: string;
        name: string;
        category: "transitions" | "audio" | "images" | "videos" | "fonts" | "lottie_animations" | "3d_models" | "icons" | "backgrounds" | "overlays" | "color_palettes" | "brand_kits";
        createdAt: string;
        updatedAt: string;
        mimeType: string;
        extension: string;
        fileSizeBytes: number;
        previewUrl: string;
        assetUrl: string;
        usageRights: {
            license: "custom" | "royalty_free" | "editorial" | "creative_commons" | "proprietary" | "public_domain";
            commercialUse: boolean;
            allowModification: boolean;
            requireAttribution: boolean;
            ccVariant?: "CC0" | "CC-BY" | "CC-BY-SA" | "CC-BY-NC" | "CC-BY-NC-SA" | "CC-BY-ND" | "CC-BY-NC-ND" | undefined;
            attributionText?: string | undefined;
            usageLimit?: number | undefined;
            geographicRestrictions?: string[] | undefined;
            expiresAt?: string | undefined;
            source?: string | undefined;
        };
        uploadedBy: string;
        description?: string | undefined;
        duration?: number | undefined;
        tags?: string[] | undefined;
        fps?: number | undefined;
        additionalPreviews?: {
            label: string;
            url: string;
            height?: number | undefined;
            width?: number | undefined;
        }[] | undefined;
        dimensions?: {
            height: number;
            width: number;
        } | undefined;
        hasAlpha?: boolean | undefined;
        colorProfile?: string | undefined;
        usageCount?: number | undefined;
        lastUsedAt?: string | undefined;
        isUserUpload?: boolean | undefined;
        isFavorite?: boolean | undefined;
    }[];
    storageSummary: {
        totalAssets: number;
        totalSizeBytes: number;
        storageLimitBytes: number;
        usagePercentage: number;
        byCategory: Partial<Record<"transitions" | "audio" | "images" | "videos" | "fonts" | "lottie_animations" | "3d_models" | "icons" | "backgrounds" | "overlays" | "color_palettes" | "brand_kits", {
            count: number;
            sizeBytes: number;
        }>>;
    };
    appliedFilter?: {
        pageSize?: number | undefined;
        tags?: string[] | undefined;
        query?: string | undefined;
        categories?: ("transitions" | "audio" | "images" | "videos" | "fonts" | "lottie_animations" | "3d_models" | "icons" | "backgrounds" | "overlays" | "color_palettes" | "brand_kits")[] | undefined;
        sortBy?: "size" | "name" | "newest" | "oldest" | "most_used" | "recently_used" | undefined;
        page?: number | undefined;
        licenseTypes?: string[] | undefined;
        userUploadsOnly?: boolean | undefined;
        favoritesOnly?: boolean | undefined;
        mimeTypes?: string[] | undefined;
    } | undefined;
}>;
export type AssetLibraryDashboard = z.infer<typeof AssetLibraryDashboardSchema>;
//# sourceMappingURL=remotion-integration.d.ts.map