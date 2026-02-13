"use strict";
/**
 * @acd/enterprise - Shared Zod schemas and TypeScript types
 * Covers: Feature Flags, Billing/Metering, AI Orchestration, Cost Tracking, Compliance/GDPR
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogEntrySchema = exports.RetentionPolicySchema = exports.ConsentRecordSchema = exports.ConsentCategorySchema = exports.DeletionLogEntrySchema = exports.DataExportSchema = exports.DataExportFormatSchema = exports.DataSubjectRecordSchema = exports.DataCategorySchema = exports.CostAlertSchema = exports.CostAllocationSchema = exports.CostEntrySchema = exports.CostCategorySchema = exports.FallbackChainSchema = exports.TokenBudgetSchema = exports.AICacheEntrySchema = exports.PromptTemplateSchema = exports.AIResponseSchema = exports.AIRequestSchema = exports.AIModelConfigSchema = exports.AIProviderNameSchema = exports.RevenueMetricsSchema = exports.SubscriptionSchema = exports.SubscriptionStatusSchema = exports.PaymentMethodSchema = exports.PaymentMethodTypeSchema = exports.InvoiceSchema = exports.DiscountSchema = exports.InvoiceLineItemSchema = exports.PricingPlanSchema = exports.PricingTierSchema = exports.UsageRecordSchema = exports.UsageMetricSchema = exports.UserContextSchema = exports.FlagChangeSchema = exports.FeatureFlagSchema = exports.UserSegmentSchema = exports.TargetingRuleSchema = exports.TargetingRuleOperatorSchema = exports.FlagTypeSchema = exports.TimestampSchema = void 0;
const zod_1 = require("zod");
// ─── Common ──────────────────────────────────────────────────────────────────
exports.TimestampSchema = zod_1.z.number().describe('Unix timestamp in milliseconds');
// ─── Feature Flags (FF-001 to FF-006) ────────────────────────────────────────
exports.FlagTypeSchema = zod_1.z.enum(['boolean', 'string', 'number', 'json']);
exports.TargetingRuleOperatorSchema = zod_1.z.enum([
    'equals', 'not_equals', 'in', 'not_in', 'gt', 'lt', 'gte', 'lte', 'contains', 'regex',
]);
exports.TargetingRuleSchema = zod_1.z.object({
    attribute: zod_1.z.string(),
    operator: exports.TargetingRuleOperatorSchema,
    value: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.array(zod_1.z.string())]),
});
exports.UserSegmentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    rules: zod_1.z.array(exports.TargetingRuleSchema),
    matchAll: zod_1.z.boolean().default(true),
    createdAt: exports.TimestampSchema,
    updatedAt: exports.TimestampSchema,
});
exports.FeatureFlagSchema = zod_1.z.object({
    key: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    type: exports.FlagTypeSchema,
    defaultValue: zod_1.z.unknown(),
    enabled: zod_1.z.boolean().default(false),
    targetingRules: zod_1.z.array(exports.TargetingRuleSchema).default([]),
    segmentIds: zod_1.z.array(zod_1.z.string()).default([]),
    rolloutPercentage: zod_1.z.number().min(0).max(100).optional(),
    createdAt: exports.TimestampSchema,
    updatedAt: exports.TimestampSchema,
    createdBy: zod_1.z.string().optional(),
});
exports.FlagChangeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    flagKey: zod_1.z.string(),
    changedBy: zod_1.z.string(),
    changedAt: exports.TimestampSchema,
    previousValue: zod_1.z.unknown(),
    newValue: zod_1.z.unknown(),
    changeType: zod_1.z.enum(['created', 'updated', 'deleted', 'toggled']),
    fieldChanged: zod_1.z.string().optional(),
});
exports.UserContextSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    email: zod_1.z.string().optional(),
    plan: zod_1.z.string().optional(),
    role: zod_1.z.string().optional(),
    orgId: zod_1.z.string().optional(),
    properties: zod_1.z.record(zod_1.z.unknown()).default({}),
});
// ─── Billing / Metering (BILL-001 to BILL-006) ──────────────────────────────
exports.UsageMetricSchema = zod_1.z.enum([
    'api_calls', 'renders', 'storage_bytes', 'compute_minutes', 'bandwidth_bytes', 'seats',
]);
exports.UsageRecordSchema = zod_1.z.object({
    id: zod_1.z.string(),
    customerId: zod_1.z.string(),
    metric: exports.UsageMetricSchema,
    quantity: zod_1.z.number().min(0),
    timestamp: exports.TimestampSchema,
    metadata: zod_1.z.record(zod_1.z.string()).default({}),
});
exports.PricingTierSchema = zod_1.z.object({
    upTo: zod_1.z.number().nullable(), // null = unlimited
    unitPrice: zod_1.z.number().min(0), // price per unit in cents
    flatFee: zod_1.z.number().min(0).default(0),
});
exports.PricingPlanSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    basePriceCents: zod_1.z.number().min(0),
    billingPeriod: zod_1.z.enum(['monthly', 'yearly']),
    metrics: zod_1.z.record(exports.UsageMetricSchema, zod_1.z.object({
        included: zod_1.z.number().min(0),
        tiers: zod_1.z.array(exports.PricingTierSchema),
        overageEnabled: zod_1.z.boolean().default(true),
    })),
});
exports.InvoiceLineItemSchema = zod_1.z.object({
    description: zod_1.z.string(),
    metric: exports.UsageMetricSchema.optional(),
    quantity: zod_1.z.number(),
    unitPriceCents: zod_1.z.number(),
    totalCents: zod_1.z.number(),
});
exports.DiscountSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(['percentage', 'fixed']),
    value: zod_1.z.number().min(0),
    description: zod_1.z.string(),
});
exports.InvoiceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    customerId: zod_1.z.string(),
    planId: zod_1.z.string(),
    periodStart: exports.TimestampSchema,
    periodEnd: exports.TimestampSchema,
    lineItems: zod_1.z.array(exports.InvoiceLineItemSchema),
    subtotalCents: zod_1.z.number(),
    discounts: zod_1.z.array(exports.DiscountSchema).default([]),
    discountAmountCents: zod_1.z.number().default(0),
    taxRate: zod_1.z.number().min(0).max(1).default(0),
    taxAmountCents: zod_1.z.number().default(0),
    totalCents: zod_1.z.number(),
    status: zod_1.z.enum(['draft', 'issued', 'paid', 'void', 'overdue']),
    issuedAt: exports.TimestampSchema.optional(),
    paidAt: exports.TimestampSchema.optional(),
    dueDate: exports.TimestampSchema.optional(),
    createdAt: exports.TimestampSchema,
});
exports.PaymentMethodTypeSchema = zod_1.z.enum(['card', 'bank_account']);
exports.PaymentMethodSchema = zod_1.z.object({
    id: zod_1.z.string(),
    customerId: zod_1.z.string(),
    type: exports.PaymentMethodTypeSchema,
    isDefault: zod_1.z.boolean().default(false),
    // Card fields
    cardBrand: zod_1.z.string().optional(),
    cardLast4: zod_1.z.string().length(4).optional(),
    cardExpMonth: zod_1.z.number().min(1).max(12).optional(),
    cardExpYear: zod_1.z.number().min(2020).optional(),
    // Bank fields
    bankName: zod_1.z.string().optional(),
    bankLast4: zod_1.z.string().length(4).optional(),
    bankAccountType: zod_1.z.enum(['checking', 'savings']).optional(),
    // Common
    billingName: zod_1.z.string().optional(),
    billingEmail: zod_1.z.string().email().optional(),
    createdAt: exports.TimestampSchema,
    updatedAt: exports.TimestampSchema,
});
exports.SubscriptionStatusSchema = zod_1.z.enum([
    'trialing', 'active', 'past_due', 'canceled', 'paused', 'expired',
]);
exports.SubscriptionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    customerId: zod_1.z.string(),
    planId: zod_1.z.string(),
    status: exports.SubscriptionStatusSchema,
    currentPeriodStart: exports.TimestampSchema,
    currentPeriodEnd: exports.TimestampSchema,
    trialStart: exports.TimestampSchema.optional(),
    trialEnd: exports.TimestampSchema.optional(),
    canceledAt: exports.TimestampSchema.optional(),
    cancelAtPeriodEnd: zod_1.z.boolean().default(false),
    createdAt: exports.TimestampSchema,
    updatedAt: exports.TimestampSchema,
});
exports.RevenueMetricsSchema = zod_1.z.object({
    mrrCents: zod_1.z.number(),
    arrCents: zod_1.z.number(),
    churnRate: zod_1.z.number().min(0).max(1),
    avgLtvCents: zod_1.z.number(),
    activeSubscriptions: zod_1.z.number(),
    trialingSubscriptions: zod_1.z.number(),
    canceledThisPeriod: zod_1.z.number(),
    newThisPeriod: zod_1.z.number(),
    calculatedAt: exports.TimestampSchema,
});
// ─── AI Orchestration (AI-001 to AI-006) ─────────────────────────────────────
exports.AIProviderNameSchema = zod_1.z.enum(['openai', 'anthropic', 'local']);
exports.AIModelConfigSchema = zod_1.z.object({
    provider: exports.AIProviderNameSchema,
    model: zod_1.z.string(),
    maxTokens: zod_1.z.number().min(1).optional(),
    temperature: zod_1.z.number().min(0).max(2).optional(),
    apiKey: zod_1.z.string().optional(),
    baseUrl: zod_1.z.string().url().optional(),
    costPer1kInputTokens: zod_1.z.number().min(0).default(0),
    costPer1kOutputTokens: zod_1.z.number().min(0).default(0),
});
exports.AIRequestSchema = zod_1.z.object({
    prompt: zod_1.z.string(),
    systemPrompt: zod_1.z.string().optional(),
    maxTokens: zod_1.z.number().min(1).optional(),
    temperature: zod_1.z.number().min(0).max(2).optional(),
    metadata: zod_1.z.record(zod_1.z.string()).default({}),
});
exports.AIResponseSchema = zod_1.z.object({
    content: zod_1.z.string(),
    provider: exports.AIProviderNameSchema,
    model: zod_1.z.string(),
    inputTokens: zod_1.z.number().min(0),
    outputTokens: zod_1.z.number().min(0),
    latencyMs: zod_1.z.number().min(0),
    cached: zod_1.z.boolean().default(false),
    costCents: zod_1.z.number().min(0).default(0),
    metadata: zod_1.z.record(zod_1.z.string()).default({}),
});
exports.PromptTemplateSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    version: zod_1.z.number().min(1),
    template: zod_1.z.string(),
    variables: zod_1.z.array(zod_1.z.string()),
    isActive: zod_1.z.boolean().default(true),
    abTestGroup: zod_1.z.string().optional(),
    createdAt: exports.TimestampSchema,
    updatedAt: exports.TimestampSchema,
});
exports.AICacheEntrySchema = zod_1.z.object({
    key: zod_1.z.string(),
    response: exports.AIResponseSchema,
    createdAt: exports.TimestampSchema,
    ttlMs: zod_1.z.number().min(0),
    expiresAt: exports.TimestampSchema,
    hitCount: zod_1.z.number().min(0).default(0),
});
exports.TokenBudgetSchema = zod_1.z.object({
    id: zod_1.z.string(),
    scope: zod_1.z.enum(['request', 'daily', 'monthly']),
    maxTokens: zod_1.z.number().min(1),
    maxCostCents: zod_1.z.number().min(0),
    usedTokens: zod_1.z.number().min(0).default(0),
    usedCostCents: zod_1.z.number().min(0).default(0),
    periodStart: exports.TimestampSchema,
    periodEnd: exports.TimestampSchema,
});
exports.FallbackChainSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    providers: zod_1.z.array(zod_1.z.object({
        config: exports.AIModelConfigSchema,
        timeoutMs: zod_1.z.number().min(100).default(30000),
        priority: zod_1.z.number().min(0),
    })),
    maxRetries: zod_1.z.number().min(0).default(2),
});
// ─── Cost Tracking (COST-001 to COST-003) ────────────────────────────────────
exports.CostCategorySchema = zod_1.z.enum([
    'api', 'compute', 'storage', 'bandwidth', 'ai', 'third_party', 'other',
]);
exports.CostEntrySchema = zod_1.z.object({
    id: zod_1.z.string(),
    serviceId: zod_1.z.string(),
    category: exports.CostCategorySchema,
    amountCents: zod_1.z.number(),
    description: zod_1.z.string(),
    timestamp: exports.TimestampSchema,
    metadata: zod_1.z.record(zod_1.z.string()).default({}),
});
exports.CostAllocationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    costEntryId: zod_1.z.string(),
    productId: zod_1.z.string(),
    allocationPercentage: zod_1.z.number().min(0).max(100),
    allocatedAmountCents: zod_1.z.number(),
    timestamp: exports.TimestampSchema,
});
exports.CostAlertSchema = zod_1.z.object({
    id: zod_1.z.string(),
    serviceId: zod_1.z.string().optional(),
    category: exports.CostCategorySchema.optional(),
    budgetCents: zod_1.z.number().min(0),
    thresholdPercent: zod_1.z.number().min(0).max(100).default(80),
    currentSpendCents: zod_1.z.number().min(0).default(0),
    periodStart: exports.TimestampSchema,
    periodEnd: exports.TimestampSchema,
    triggered: zod_1.z.boolean().default(false),
    triggeredAt: exports.TimestampSchema.optional(),
    notificationCallback: zod_1.z.string().optional(), // callback identifier
});
// ─── Compliance / GDPR (COMP-001 to COMP-006) ───────────────────────────────
exports.DataCategorySchema = zod_1.z.enum([
    'personal', 'financial', 'health', 'behavioral', 'technical', 'communications', 'preferences',
]);
exports.DataSubjectRecordSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    email: zod_1.z.string().email().optional(),
    dataEntries: zod_1.z.array(zod_1.z.object({
        tableName: zod_1.z.string(),
        recordId: zod_1.z.string(),
        category: exports.DataCategorySchema,
        description: zod_1.z.string(),
        createdAt: exports.TimestampSchema,
    })),
    registeredAt: exports.TimestampSchema,
    updatedAt: exports.TimestampSchema,
});
exports.DataExportFormatSchema = zod_1.z.enum(['json', 'csv']);
exports.DataExportSchema = zod_1.z.object({
    id: zod_1.z.string(),
    userId: zod_1.z.string(),
    format: exports.DataExportFormatSchema,
    data: zod_1.z.record(zod_1.z.unknown()),
    requestedAt: exports.TimestampSchema,
    completedAt: exports.TimestampSchema.optional(),
    status: zod_1.z.enum(['pending', 'processing', 'completed', 'failed']),
});
exports.DeletionLogEntrySchema = zod_1.z.object({
    id: zod_1.z.string(),
    userId: zod_1.z.string(),
    tableName: zod_1.z.string(),
    recordId: zod_1.z.string(),
    deletedAt: exports.TimestampSchema,
    deletedBy: zod_1.z.string(),
    reason: zod_1.z.string().optional(),
});
exports.ConsentCategorySchema = zod_1.z.enum([
    'essential', 'analytics', 'marketing', 'personalization', 'third_party',
]);
exports.ConsentRecordSchema = zod_1.z.object({
    id: zod_1.z.string(),
    userId: zod_1.z.string(),
    category: exports.ConsentCategorySchema,
    granted: zod_1.z.boolean(),
    grantedAt: exports.TimestampSchema,
    revokedAt: exports.TimestampSchema.optional(),
    ipAddress: zod_1.z.string().optional(),
    userAgent: zod_1.z.string().optional(),
    version: zod_1.z.number().min(1).default(1),
});
exports.RetentionPolicySchema = zod_1.z.object({
    id: zod_1.z.string(),
    tableName: zod_1.z.string(),
    retentionDays: zod_1.z.number().min(1),
    dataCategory: exports.DataCategorySchema,
    autoDelete: zod_1.z.boolean().default(false),
    lastCleanup: exports.TimestampSchema.optional(),
    nextScheduledCleanup: exports.TimestampSchema.optional(),
    createdAt: exports.TimestampSchema,
    updatedAt: exports.TimestampSchema,
});
exports.AuditLogEntrySchema = zod_1.z.object({
    id: zod_1.z.string(),
    timestamp: exports.TimestampSchema,
    actorId: zod_1.z.string(),
    action: zod_1.z.enum(['create', 'read', 'update', 'delete', 'export', 'access']),
    resourceType: zod_1.z.string(),
    resourceId: zod_1.z.string(),
    details: zod_1.z.record(zod_1.z.unknown()).default({}),
    ipAddress: zod_1.z.string().optional(),
    userAgent: zod_1.z.string().optional(),
    // Immutability: once written, entries cannot be modified
});
//# sourceMappingURL=types.js.map