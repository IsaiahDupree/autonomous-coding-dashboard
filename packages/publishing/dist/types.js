"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalStatusEnum = exports.SyncConfigSchema = exports.TemplateConfigSchema = exports.ContentPipelineSchema = exports.PipelineStageSchema = exports.PublishResultSchema = exports.PublishRequestSchema = exports.PublishMetadataSchema = exports.VisibilityEnum = exports.SyncProviderEnum = exports.PipelineStageStatusEnum = exports.PublishStatusEnum = exports.PlatformEnum = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
exports.PlatformEnum = zod_1.z.enum([
    'tiktok',
    'instagram',
    'youtube',
    'facebook',
    'twitter',
    'linkedin',
]);
exports.PublishStatusEnum = zod_1.z.enum([
    'draft',
    'pending_review',
    'approved',
    'publishing',
    'published',
    'failed',
    'archived',
]);
exports.PipelineStageStatusEnum = zod_1.z.enum([
    'pending',
    'in_progress',
    'completed',
    'failed',
    'skipped',
]);
exports.SyncProviderEnum = zod_1.z.enum(['meta', 'tiktok', 'stripe']);
exports.VisibilityEnum = zod_1.z.enum(['public', 'private', 'unlisted', 'friends']);
// ---------------------------------------------------------------------------
// Publish Request / Result
// ---------------------------------------------------------------------------
exports.PublishMetadataSchema = zod_1.z.object({
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    visibility: exports.VisibilityEnum.default('public'),
});
exports.PublishRequestSchema = zod_1.z.object({
    contentId: zod_1.z.string(),
    platform: exports.PlatformEnum,
    account: zod_1.z.string(),
    scheduledAt: zod_1.z.string().datetime().optional(),
    metadata: exports.PublishMetadataSchema,
});
exports.PublishResultSchema = zod_1.z.object({
    publishId: zod_1.z.string(),
    platform: exports.PlatformEnum,
    externalId: zod_1.z.string(),
    url: zod_1.z.string().url(),
    status: exports.PublishStatusEnum,
    publishedAt: zod_1.z.string().datetime(),
});
// ---------------------------------------------------------------------------
// Content Pipeline
// ---------------------------------------------------------------------------
exports.PipelineStageSchema = zod_1.z.object({
    name: zod_1.z.string(),
    status: exports.PipelineStageStatusEnum,
    startedAt: zod_1.z.string().datetime().optional(),
    completedAt: zod_1.z.string().datetime().optional(),
    output: zod_1.z.unknown().optional(),
});
exports.ContentPipelineSchema = zod_1.z.object({
    id: zod_1.z.string(),
    stages: zod_1.z.array(exports.PipelineStageSchema),
    currentStage: zod_1.z.number().int().min(0),
    createdAt: zod_1.z.string().datetime(),
});
// ---------------------------------------------------------------------------
// Template Config
// ---------------------------------------------------------------------------
exports.TemplateConfigSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    category: zod_1.z.string(),
    description: zod_1.z.string(),
    thumbnailUrl: zod_1.z.string().url().optional(),
    inputSchema: zod_1.z.record(zod_1.z.unknown()),
    defaultProps: zod_1.z.record(zod_1.z.unknown()),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    isPublic: zod_1.z.boolean().default(false),
});
// ---------------------------------------------------------------------------
// Sync Config
// ---------------------------------------------------------------------------
exports.SyncConfigSchema = zod_1.z.object({
    provider: exports.SyncProviderEnum,
    entityType: zod_1.z.string(),
    entityId: zod_1.z.string(),
    lastSyncAt: zod_1.z.string().datetime().optional(),
    syncIntervalMs: zod_1.z.number().int().positive().default(60000),
});
// ---------------------------------------------------------------------------
// Workflow types
// ---------------------------------------------------------------------------
exports.ApprovalStatusEnum = zod_1.z.enum([
    'pending',
    'approved',
    'rejected',
    'revision_requested',
]);
//# sourceMappingURL=types.js.map