/**
 * @acd/enterprise - Shared Zod schemas and TypeScript types
 * Covers: Feature Flags, Billing/Metering, AI Orchestration, Cost Tracking, Compliance/GDPR
 */

import { z } from 'zod';

// ─── Common ──────────────────────────────────────────────────────────────────

export const TimestampSchema = z.number().describe('Unix timestamp in milliseconds');

// ─── Feature Flags (FF-001 to FF-006) ────────────────────────────────────────

export const FlagTypeSchema = z.enum(['boolean', 'string', 'number', 'json']);
export type FlagType = z.infer<typeof FlagTypeSchema>;

export const TargetingRuleOperatorSchema = z.enum([
  'equals', 'not_equals', 'in', 'not_in', 'gt', 'lt', 'gte', 'lte', 'contains', 'regex',
]);
export type TargetingRuleOperator = z.infer<typeof TargetingRuleOperatorSchema>;

export const TargetingRuleSchema = z.object({
  attribute: z.string(),
  operator: TargetingRuleOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
});
export type TargetingRule = z.infer<typeof TargetingRuleSchema>;

export const UserSegmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  rules: z.array(TargetingRuleSchema),
  matchAll: z.boolean().default(true),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type UserSegment = z.infer<typeof UserSegmentSchema>;

export const FeatureFlagSchema = z.object({
  key: z.string().min(1),
  description: z.string().optional(),
  type: FlagTypeSchema,
  defaultValue: z.unknown(),
  enabled: z.boolean().default(false),
  targetingRules: z.array(TargetingRuleSchema).default([]),
  segmentIds: z.array(z.string()).default([]),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  createdBy: z.string().optional(),
});
export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

export const FlagChangeSchema = z.object({
  id: z.string(),
  flagKey: z.string(),
  changedBy: z.string(),
  changedAt: TimestampSchema,
  previousValue: z.unknown(),
  newValue: z.unknown(),
  changeType: z.enum(['created', 'updated', 'deleted', 'toggled']),
  fieldChanged: z.string().optional(),
});
export type FlagChange = z.infer<typeof FlagChangeSchema>;

export const UserContextSchema = z.object({
  userId: z.string(),
  email: z.string().optional(),
  plan: z.string().optional(),
  role: z.string().optional(),
  orgId: z.string().optional(),
  properties: z.record(z.unknown()).default({}),
});
export type UserContext = z.infer<typeof UserContextSchema>;

// ─── Billing / Metering (BILL-001 to BILL-006) ──────────────────────────────

export const UsageMetricSchema = z.enum([
  'api_calls', 'renders', 'storage_bytes', 'compute_minutes', 'bandwidth_bytes', 'seats',
]);
export type UsageMetric = z.infer<typeof UsageMetricSchema>;

export const UsageRecordSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  metric: UsageMetricSchema,
  quantity: z.number().min(0),
  timestamp: TimestampSchema,
  metadata: z.record(z.string()).default({}),
});
export type UsageRecord = z.infer<typeof UsageRecordSchema>;

export const PricingTierSchema = z.object({
  upTo: z.number().nullable(), // null = unlimited
  unitPrice: z.number().min(0), // price per unit in cents
  flatFee: z.number().min(0).default(0),
});
export type PricingTier = z.infer<typeof PricingTierSchema>;

export const PricingPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  basePriceCents: z.number().min(0),
  billingPeriod: z.enum(['monthly', 'yearly']),
  metrics: z.record(UsageMetricSchema, z.object({
    included: z.number().min(0),
    tiers: z.array(PricingTierSchema),
    overageEnabled: z.boolean().default(true),
  })),
});
export type PricingPlan = z.infer<typeof PricingPlanSchema>;

export const InvoiceLineItemSchema = z.object({
  description: z.string(),
  metric: UsageMetricSchema.optional(),
  quantity: z.number(),
  unitPriceCents: z.number(),
  totalCents: z.number(),
});
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;

export const DiscountSchema = z.object({
  id: z.string(),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().min(0),
  description: z.string(),
});
export type Discount = z.infer<typeof DiscountSchema>;

export const InvoiceSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  planId: z.string(),
  periodStart: TimestampSchema,
  periodEnd: TimestampSchema,
  lineItems: z.array(InvoiceLineItemSchema),
  subtotalCents: z.number(),
  discounts: z.array(DiscountSchema).default([]),
  discountAmountCents: z.number().default(0),
  taxRate: z.number().min(0).max(1).default(0),
  taxAmountCents: z.number().default(0),
  totalCents: z.number(),
  status: z.enum(['draft', 'issued', 'paid', 'void', 'overdue']),
  issuedAt: TimestampSchema.optional(),
  paidAt: TimestampSchema.optional(),
  dueDate: TimestampSchema.optional(),
  createdAt: TimestampSchema,
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const PaymentMethodTypeSchema = z.enum(['card', 'bank_account']);
export type PaymentMethodType = z.infer<typeof PaymentMethodTypeSchema>;

export const PaymentMethodSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  type: PaymentMethodTypeSchema,
  isDefault: z.boolean().default(false),
  // Card fields
  cardBrand: z.string().optional(),
  cardLast4: z.string().length(4).optional(),
  cardExpMonth: z.number().min(1).max(12).optional(),
  cardExpYear: z.number().min(2020).optional(),
  // Bank fields
  bankName: z.string().optional(),
  bankLast4: z.string().length(4).optional(),
  bankAccountType: z.enum(['checking', 'savings']).optional(),
  // Common
  billingName: z.string().optional(),
  billingEmail: z.string().email().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const SubscriptionStatusSchema = z.enum([
  'trialing', 'active', 'past_due', 'canceled', 'paused', 'expired',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  planId: z.string(),
  status: SubscriptionStatusSchema,
  currentPeriodStart: TimestampSchema,
  currentPeriodEnd: TimestampSchema,
  trialStart: TimestampSchema.optional(),
  trialEnd: TimestampSchema.optional(),
  canceledAt: TimestampSchema.optional(),
  cancelAtPeriodEnd: z.boolean().default(false),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

export const RevenueMetricsSchema = z.object({
  mrrCents: z.number(),
  arrCents: z.number(),
  churnRate: z.number().min(0).max(1),
  avgLtvCents: z.number(),
  activeSubscriptions: z.number(),
  trialingSubscriptions: z.number(),
  canceledThisPeriod: z.number(),
  newThisPeriod: z.number(),
  calculatedAt: TimestampSchema,
});
export type RevenueMetrics = z.infer<typeof RevenueMetricsSchema>;

// ─── AI Orchestration (AI-001 to AI-006) ─────────────────────────────────────

export const AIProviderNameSchema = z.enum(['openai', 'anthropic', 'local']);
export type AIProviderName = z.infer<typeof AIProviderNameSchema>;

export const AIModelConfigSchema = z.object({
  provider: AIProviderNameSchema,
  model: z.string(),
  maxTokens: z.number().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  costPer1kInputTokens: z.number().min(0).default(0),
  costPer1kOutputTokens: z.number().min(0).default(0),
});
export type AIModelConfig = z.infer<typeof AIModelConfigSchema>;

export const AIRequestSchema = z.object({
  prompt: z.string(),
  systemPrompt: z.string().optional(),
  maxTokens: z.number().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  metadata: z.record(z.string()).default({}),
});
export type AIRequest = z.infer<typeof AIRequestSchema>;

export const AIResponseSchema = z.object({
  content: z.string(),
  provider: AIProviderNameSchema,
  model: z.string(),
  inputTokens: z.number().min(0),
  outputTokens: z.number().min(0),
  latencyMs: z.number().min(0),
  cached: z.boolean().default(false),
  costCents: z.number().min(0).default(0),
  metadata: z.record(z.string()).default({}),
});
export type AIResponse = z.infer<typeof AIResponseSchema>;

export const PromptTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.number().min(1),
  template: z.string(),
  variables: z.array(z.string()),
  isActive: z.boolean().default(true),
  abTestGroup: z.string().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type PromptTemplate = z.infer<typeof PromptTemplateSchema>;

export const AICacheEntrySchema = z.object({
  key: z.string(),
  response: AIResponseSchema,
  createdAt: TimestampSchema,
  ttlMs: z.number().min(0),
  expiresAt: TimestampSchema,
  hitCount: z.number().min(0).default(0),
});
export type AICacheEntry = z.infer<typeof AICacheEntrySchema>;

export const TokenBudgetSchema = z.object({
  id: z.string(),
  scope: z.enum(['request', 'daily', 'monthly']),
  maxTokens: z.number().min(1),
  maxCostCents: z.number().min(0),
  usedTokens: z.number().min(0).default(0),
  usedCostCents: z.number().min(0).default(0),
  periodStart: TimestampSchema,
  periodEnd: TimestampSchema,
});
export type TokenBudget = z.infer<typeof TokenBudgetSchema>;

export const FallbackChainSchema = z.object({
  id: z.string(),
  name: z.string(),
  providers: z.array(z.object({
    config: AIModelConfigSchema,
    timeoutMs: z.number().min(100).default(30000),
    priority: z.number().min(0),
  })),
  maxRetries: z.number().min(0).default(2),
});
export type FallbackChain = z.infer<typeof FallbackChainSchema>;

// ─── Cost Tracking (COST-001 to COST-003) ────────────────────────────────────

export const CostCategorySchema = z.enum([
  'api', 'compute', 'storage', 'bandwidth', 'ai', 'third_party', 'other',
]);
export type CostCategory = z.infer<typeof CostCategorySchema>;

export const CostEntrySchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  category: CostCategorySchema,
  amountCents: z.number(),
  description: z.string(),
  timestamp: TimestampSchema,
  metadata: z.record(z.string()).default({}),
});
export type CostEntry = z.infer<typeof CostEntrySchema>;

export const CostAllocationSchema = z.object({
  id: z.string(),
  costEntryId: z.string(),
  productId: z.string(),
  allocationPercentage: z.number().min(0).max(100),
  allocatedAmountCents: z.number(),
  timestamp: TimestampSchema,
});
export type CostAllocation = z.infer<typeof CostAllocationSchema>;

export const CostAlertSchema = z.object({
  id: z.string(),
  serviceId: z.string().optional(),
  category: CostCategorySchema.optional(),
  budgetCents: z.number().min(0),
  thresholdPercent: z.number().min(0).max(100).default(80),
  currentSpendCents: z.number().min(0).default(0),
  periodStart: TimestampSchema,
  periodEnd: TimestampSchema,
  triggered: z.boolean().default(false),
  triggeredAt: TimestampSchema.optional(),
  notificationCallback: z.string().optional(), // callback identifier
});
export type CostAlert = z.infer<typeof CostAlertSchema>;

// ─── Compliance / GDPR (COMP-001 to COMP-006) ───────────────────────────────

export const DataCategorySchema = z.enum([
  'personal', 'financial', 'health', 'behavioral', 'technical', 'communications', 'preferences',
]);
export type DataCategory = z.infer<typeof DataCategorySchema>;

export const DataSubjectRecordSchema = z.object({
  userId: z.string(),
  email: z.string().email().optional(),
  dataEntries: z.array(z.object({
    tableName: z.string(),
    recordId: z.string(),
    category: DataCategorySchema,
    description: z.string(),
    createdAt: TimestampSchema,
  })),
  registeredAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type DataSubjectRecord = z.infer<typeof DataSubjectRecordSchema>;

export const DataExportFormatSchema = z.enum(['json', 'csv']);
export type DataExportFormat = z.infer<typeof DataExportFormatSchema>;

export const DataExportSchema = z.object({
  id: z.string(),
  userId: z.string(),
  format: DataExportFormatSchema,
  data: z.record(z.unknown()),
  requestedAt: TimestampSchema,
  completedAt: TimestampSchema.optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
});
export type DataExport = z.infer<typeof DataExportSchema>;

export const DeletionLogEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  tableName: z.string(),
  recordId: z.string(),
  deletedAt: TimestampSchema,
  deletedBy: z.string(),
  reason: z.string().optional(),
});
export type DeletionLogEntry = z.infer<typeof DeletionLogEntrySchema>;

export const ConsentCategorySchema = z.enum([
  'essential', 'analytics', 'marketing', 'personalization', 'third_party',
]);
export type ConsentCategory = z.infer<typeof ConsentCategorySchema>;

export const ConsentRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  category: ConsentCategorySchema,
  granted: z.boolean(),
  grantedAt: TimestampSchema,
  revokedAt: TimestampSchema.optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  version: z.number().min(1).default(1),
});
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;

export const RetentionPolicySchema = z.object({
  id: z.string(),
  tableName: z.string(),
  retentionDays: z.number().min(1),
  dataCategory: DataCategorySchema,
  autoDelete: z.boolean().default(false),
  lastCleanup: TimestampSchema.optional(),
  nextScheduledCleanup: TimestampSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>;

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  timestamp: TimestampSchema,
  actorId: z.string(),
  action: z.enum(['create', 'read', 'update', 'delete', 'export', 'access']),
  resourceType: z.string(),
  resourceId: z.string(),
  details: z.record(z.unknown()).default({}),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  // Immutability: once written, entries cannot be modified
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
