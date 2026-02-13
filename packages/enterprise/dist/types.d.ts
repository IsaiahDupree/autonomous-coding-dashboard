/**
 * @acd/enterprise - Shared Zod schemas and TypeScript types
 * Covers: Feature Flags, Billing/Metering, AI Orchestration, Cost Tracking, Compliance/GDPR
 */
import { z } from 'zod';
export declare const TimestampSchema: z.ZodNumber;
export declare const FlagTypeSchema: z.ZodEnum<["boolean", "string", "number", "json"]>;
export type FlagType = z.infer<typeof FlagTypeSchema>;
export declare const TargetingRuleOperatorSchema: z.ZodEnum<["equals", "not_equals", "in", "not_in", "gt", "lt", "gte", "lte", "contains", "regex"]>;
export type TargetingRuleOperator = z.infer<typeof TargetingRuleOperatorSchema>;
export declare const TargetingRuleSchema: z.ZodObject<{
    attribute: z.ZodString;
    operator: z.ZodEnum<["equals", "not_equals", "in", "not_in", "gt", "lt", "gte", "lte", "contains", "regex"]>;
    value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodString, "many">]>;
}, "strip", z.ZodTypeAny, {
    value: string | number | boolean | string[];
    attribute: string;
    operator: "equals" | "not_equals" | "in" | "not_in" | "gt" | "lt" | "gte" | "lte" | "contains" | "regex";
}, {
    value: string | number | boolean | string[];
    attribute: string;
    operator: "equals" | "not_equals" | "in" | "not_in" | "gt" | "lt" | "gte" | "lte" | "contains" | "regex";
}>;
export type TargetingRule = z.infer<typeof TargetingRuleSchema>;
export declare const UserSegmentSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    rules: z.ZodArray<z.ZodObject<{
        attribute: z.ZodString;
        operator: z.ZodEnum<["equals", "not_equals", "in", "not_in", "gt", "lt", "gte", "lte", "contains", "regex"]>;
        value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodString, "many">]>;
    }, "strip", z.ZodTypeAny, {
        value: string | number | boolean | string[];
        attribute: string;
        operator: "equals" | "not_equals" | "in" | "not_in" | "gt" | "lt" | "gte" | "lte" | "contains" | "regex";
    }, {
        value: string | number | boolean | string[];
        attribute: string;
        operator: "equals" | "not_equals" | "in" | "not_in" | "gt" | "lt" | "gte" | "lte" | "contains" | "regex";
    }>, "many">;
    matchAll: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    rules: {
        value: string | number | boolean | string[];
        attribute: string;
        operator: "equals" | "not_equals" | "in" | "not_in" | "gt" | "lt" | "gte" | "lte" | "contains" | "regex";
    }[];
    matchAll: boolean;
    createdAt: number;
    updatedAt: number;
    description?: string | undefined;
}, {
    id: string;
    name: string;
    rules: {
        value: string | number | boolean | string[];
        attribute: string;
        operator: "equals" | "not_equals" | "in" | "not_in" | "gt" | "lt" | "gte" | "lte" | "contains" | "regex";
    }[];
    createdAt: number;
    updatedAt: number;
    description?: string | undefined;
    matchAll?: boolean | undefined;
}>;
export type UserSegment = z.infer<typeof UserSegmentSchema>;
export declare const FeatureFlagSchema: z.ZodObject<{
    key: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["boolean", "string", "number", "json"]>;
    defaultValue: z.ZodUnknown;
    enabled: z.ZodDefault<z.ZodBoolean>;
    targetingRules: z.ZodDefault<z.ZodArray<z.ZodObject<{
        attribute: z.ZodString;
        operator: z.ZodEnum<["equals", "not_equals", "in", "not_in", "gt", "lt", "gte", "lte", "contains", "regex"]>;
        value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodString, "many">]>;
    }, "strip", z.ZodTypeAny, {
        value: string | number | boolean | string[];
        attribute: string;
        operator: "equals" | "not_equals" | "in" | "not_in" | "gt" | "lt" | "gte" | "lte" | "contains" | "regex";
    }, {
        value: string | number | boolean | string[];
        attribute: string;
        operator: "equals" | "not_equals" | "in" | "not_in" | "gt" | "lt" | "gte" | "lte" | "contains" | "regex";
    }>, "many">>;
    segmentIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    rolloutPercentage: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
    createdBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "string" | "number" | "boolean" | "json";
    createdAt: number;
    updatedAt: number;
    key: string;
    enabled: boolean;
    targetingRules: {
        value: string | number | boolean | string[];
        attribute: string;
        operator: "equals" | "not_equals" | "in" | "not_in" | "gt" | "lt" | "gte" | "lte" | "contains" | "regex";
    }[];
    segmentIds: string[];
    description?: string | undefined;
    defaultValue?: unknown;
    rolloutPercentage?: number | undefined;
    createdBy?: string | undefined;
}, {
    type: "string" | "number" | "boolean" | "json";
    createdAt: number;
    updatedAt: number;
    key: string;
    description?: string | undefined;
    defaultValue?: unknown;
    enabled?: boolean | undefined;
    targetingRules?: {
        value: string | number | boolean | string[];
        attribute: string;
        operator: "equals" | "not_equals" | "in" | "not_in" | "gt" | "lt" | "gte" | "lte" | "contains" | "regex";
    }[] | undefined;
    segmentIds?: string[] | undefined;
    rolloutPercentage?: number | undefined;
    createdBy?: string | undefined;
}>;
export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;
export declare const FlagChangeSchema: z.ZodObject<{
    id: z.ZodString;
    flagKey: z.ZodString;
    changedBy: z.ZodString;
    changedAt: z.ZodNumber;
    previousValue: z.ZodUnknown;
    newValue: z.ZodUnknown;
    changeType: z.ZodEnum<["created", "updated", "deleted", "toggled"]>;
    fieldChanged: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    flagKey: string;
    changedBy: string;
    changedAt: number;
    changeType: "created" | "updated" | "deleted" | "toggled";
    previousValue?: unknown;
    newValue?: unknown;
    fieldChanged?: string | undefined;
}, {
    id: string;
    flagKey: string;
    changedBy: string;
    changedAt: number;
    changeType: "created" | "updated" | "deleted" | "toggled";
    previousValue?: unknown;
    newValue?: unknown;
    fieldChanged?: string | undefined;
}>;
export type FlagChange = z.infer<typeof FlagChangeSchema>;
export declare const UserContextSchema: z.ZodObject<{
    userId: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    plan: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    orgId: z.ZodOptional<z.ZodString>;
    properties: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    properties: Record<string, unknown>;
    email?: string | undefined;
    plan?: string | undefined;
    role?: string | undefined;
    orgId?: string | undefined;
}, {
    userId: string;
    email?: string | undefined;
    plan?: string | undefined;
    role?: string | undefined;
    orgId?: string | undefined;
    properties?: Record<string, unknown> | undefined;
}>;
export type UserContext = z.infer<typeof UserContextSchema>;
export declare const UsageMetricSchema: z.ZodEnum<["api_calls", "renders", "storage_bytes", "compute_minutes", "bandwidth_bytes", "seats"]>;
export type UsageMetric = z.infer<typeof UsageMetricSchema>;
export declare const UsageRecordSchema: z.ZodObject<{
    id: z.ZodString;
    customerId: z.ZodString;
    metric: z.ZodEnum<["api_calls", "renders", "storage_bytes", "compute_minutes", "bandwidth_bytes", "seats"]>;
    quantity: z.ZodNumber;
    timestamp: z.ZodNumber;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    customerId: string;
    metric: "api_calls" | "renders" | "storage_bytes" | "compute_minutes" | "bandwidth_bytes" | "seats";
    quantity: number;
    timestamp: number;
    metadata: Record<string, string>;
}, {
    id: string;
    customerId: string;
    metric: "api_calls" | "renders" | "storage_bytes" | "compute_minutes" | "bandwidth_bytes" | "seats";
    quantity: number;
    timestamp: number;
    metadata?: Record<string, string> | undefined;
}>;
export type UsageRecord = z.infer<typeof UsageRecordSchema>;
export declare const PricingTierSchema: z.ZodObject<{
    upTo: z.ZodNullable<z.ZodNumber>;
    unitPrice: z.ZodNumber;
    flatFee: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    upTo: number | null;
    unitPrice: number;
    flatFee: number;
}, {
    upTo: number | null;
    unitPrice: number;
    flatFee?: number | undefined;
}>;
export type PricingTier = z.infer<typeof PricingTierSchema>;
export declare const PricingPlanSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    basePriceCents: z.ZodNumber;
    billingPeriod: z.ZodEnum<["monthly", "yearly"]>;
    metrics: z.ZodRecord<z.ZodEnum<["api_calls", "renders", "storage_bytes", "compute_minutes", "bandwidth_bytes", "seats"]>, z.ZodObject<{
        included: z.ZodNumber;
        tiers: z.ZodArray<z.ZodObject<{
            upTo: z.ZodNullable<z.ZodNumber>;
            unitPrice: z.ZodNumber;
            flatFee: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            upTo: number | null;
            unitPrice: number;
            flatFee: number;
        }, {
            upTo: number | null;
            unitPrice: number;
            flatFee?: number | undefined;
        }>, "many">;
        overageEnabled: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        included: number;
        tiers: {
            upTo: number | null;
            unitPrice: number;
            flatFee: number;
        }[];
        overageEnabled: boolean;
    }, {
        included: number;
        tiers: {
            upTo: number | null;
            unitPrice: number;
            flatFee?: number | undefined;
        }[];
        overageEnabled?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    basePriceCents: number;
    billingPeriod: "monthly" | "yearly";
    metrics: Partial<Record<"api_calls" | "renders" | "storage_bytes" | "compute_minutes" | "bandwidth_bytes" | "seats", {
        included: number;
        tiers: {
            upTo: number | null;
            unitPrice: number;
            flatFee: number;
        }[];
        overageEnabled: boolean;
    }>>;
}, {
    id: string;
    name: string;
    basePriceCents: number;
    billingPeriod: "monthly" | "yearly";
    metrics: Partial<Record<"api_calls" | "renders" | "storage_bytes" | "compute_minutes" | "bandwidth_bytes" | "seats", {
        included: number;
        tiers: {
            upTo: number | null;
            unitPrice: number;
            flatFee?: number | undefined;
        }[];
        overageEnabled?: boolean | undefined;
    }>>;
}>;
export type PricingPlan = z.infer<typeof PricingPlanSchema>;
export declare const InvoiceLineItemSchema: z.ZodObject<{
    description: z.ZodString;
    metric: z.ZodOptional<z.ZodEnum<["api_calls", "renders", "storage_bytes", "compute_minutes", "bandwidth_bytes", "seats"]>>;
    quantity: z.ZodNumber;
    unitPriceCents: z.ZodNumber;
    totalCents: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    description: string;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
    metric?: "api_calls" | "renders" | "storage_bytes" | "compute_minutes" | "bandwidth_bytes" | "seats" | undefined;
}, {
    description: string;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
    metric?: "api_calls" | "renders" | "storage_bytes" | "compute_minutes" | "bandwidth_bytes" | "seats" | undefined;
}>;
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;
export declare const DiscountSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["percentage", "fixed"]>;
    value: z.ZodNumber;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: number;
    type: "percentage" | "fixed";
    id: string;
    description: string;
}, {
    value: number;
    type: "percentage" | "fixed";
    id: string;
    description: string;
}>;
export type Discount = z.infer<typeof DiscountSchema>;
export declare const InvoiceSchema: z.ZodObject<{
    id: z.ZodString;
    customerId: z.ZodString;
    planId: z.ZodString;
    periodStart: z.ZodNumber;
    periodEnd: z.ZodNumber;
    lineItems: z.ZodArray<z.ZodObject<{
        description: z.ZodString;
        metric: z.ZodOptional<z.ZodEnum<["api_calls", "renders", "storage_bytes", "compute_minutes", "bandwidth_bytes", "seats"]>>;
        quantity: z.ZodNumber;
        unitPriceCents: z.ZodNumber;
        totalCents: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        description: string;
        quantity: number;
        unitPriceCents: number;
        totalCents: number;
        metric?: "api_calls" | "renders" | "storage_bytes" | "compute_minutes" | "bandwidth_bytes" | "seats" | undefined;
    }, {
        description: string;
        quantity: number;
        unitPriceCents: number;
        totalCents: number;
        metric?: "api_calls" | "renders" | "storage_bytes" | "compute_minutes" | "bandwidth_bytes" | "seats" | undefined;
    }>, "many">;
    subtotalCents: z.ZodNumber;
    discounts: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["percentage", "fixed"]>;
        value: z.ZodNumber;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: number;
        type: "percentage" | "fixed";
        id: string;
        description: string;
    }, {
        value: number;
        type: "percentage" | "fixed";
        id: string;
        description: string;
    }>, "many">>;
    discountAmountCents: z.ZodDefault<z.ZodNumber>;
    taxRate: z.ZodDefault<z.ZodNumber>;
    taxAmountCents: z.ZodDefault<z.ZodNumber>;
    totalCents: z.ZodNumber;
    status: z.ZodEnum<["draft", "issued", "paid", "void", "overdue"]>;
    issuedAt: z.ZodOptional<z.ZodNumber>;
    paidAt: z.ZodOptional<z.ZodNumber>;
    dueDate: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    status: "void" | "draft" | "issued" | "paid" | "overdue";
    id: string;
    createdAt: number;
    customerId: string;
    totalCents: number;
    planId: string;
    periodStart: number;
    periodEnd: number;
    lineItems: {
        description: string;
        quantity: number;
        unitPriceCents: number;
        totalCents: number;
        metric?: "api_calls" | "renders" | "storage_bytes" | "compute_minutes" | "bandwidth_bytes" | "seats" | undefined;
    }[];
    subtotalCents: number;
    discounts: {
        value: number;
        type: "percentage" | "fixed";
        id: string;
        description: string;
    }[];
    discountAmountCents: number;
    taxRate: number;
    taxAmountCents: number;
    issuedAt?: number | undefined;
    paidAt?: number | undefined;
    dueDate?: number | undefined;
}, {
    status: "void" | "draft" | "issued" | "paid" | "overdue";
    id: string;
    createdAt: number;
    customerId: string;
    totalCents: number;
    planId: string;
    periodStart: number;
    periodEnd: number;
    lineItems: {
        description: string;
        quantity: number;
        unitPriceCents: number;
        totalCents: number;
        metric?: "api_calls" | "renders" | "storage_bytes" | "compute_minutes" | "bandwidth_bytes" | "seats" | undefined;
    }[];
    subtotalCents: number;
    discounts?: {
        value: number;
        type: "percentage" | "fixed";
        id: string;
        description: string;
    }[] | undefined;
    discountAmountCents?: number | undefined;
    taxRate?: number | undefined;
    taxAmountCents?: number | undefined;
    issuedAt?: number | undefined;
    paidAt?: number | undefined;
    dueDate?: number | undefined;
}>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export declare const PaymentMethodTypeSchema: z.ZodEnum<["card", "bank_account"]>;
export type PaymentMethodType = z.infer<typeof PaymentMethodTypeSchema>;
export declare const PaymentMethodSchema: z.ZodObject<{
    id: z.ZodString;
    customerId: z.ZodString;
    type: z.ZodEnum<["card", "bank_account"]>;
    isDefault: z.ZodDefault<z.ZodBoolean>;
    cardBrand: z.ZodOptional<z.ZodString>;
    cardLast4: z.ZodOptional<z.ZodString>;
    cardExpMonth: z.ZodOptional<z.ZodNumber>;
    cardExpYear: z.ZodOptional<z.ZodNumber>;
    bankName: z.ZodOptional<z.ZodString>;
    bankLast4: z.ZodOptional<z.ZodString>;
    bankAccountType: z.ZodOptional<z.ZodEnum<["checking", "savings"]>>;
    billingName: z.ZodOptional<z.ZodString>;
    billingEmail: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "card" | "bank_account";
    id: string;
    createdAt: number;
    updatedAt: number;
    customerId: string;
    isDefault: boolean;
    cardBrand?: string | undefined;
    cardLast4?: string | undefined;
    cardExpMonth?: number | undefined;
    cardExpYear?: number | undefined;
    bankName?: string | undefined;
    bankLast4?: string | undefined;
    bankAccountType?: "checking" | "savings" | undefined;
    billingName?: string | undefined;
    billingEmail?: string | undefined;
}, {
    type: "card" | "bank_account";
    id: string;
    createdAt: number;
    updatedAt: number;
    customerId: string;
    isDefault?: boolean | undefined;
    cardBrand?: string | undefined;
    cardLast4?: string | undefined;
    cardExpMonth?: number | undefined;
    cardExpYear?: number | undefined;
    bankName?: string | undefined;
    bankLast4?: string | undefined;
    bankAccountType?: "checking" | "savings" | undefined;
    billingName?: string | undefined;
    billingEmail?: string | undefined;
}>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export declare const SubscriptionStatusSchema: z.ZodEnum<["trialing", "active", "past_due", "canceled", "paused", "expired"]>;
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;
export declare const SubscriptionSchema: z.ZodObject<{
    id: z.ZodString;
    customerId: z.ZodString;
    planId: z.ZodString;
    status: z.ZodEnum<["trialing", "active", "past_due", "canceled", "paused", "expired"]>;
    currentPeriodStart: z.ZodNumber;
    currentPeriodEnd: z.ZodNumber;
    trialStart: z.ZodOptional<z.ZodNumber>;
    trialEnd: z.ZodOptional<z.ZodNumber>;
    canceledAt: z.ZodOptional<z.ZodNumber>;
    cancelAtPeriodEnd: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    status: "trialing" | "active" | "past_due" | "canceled" | "paused" | "expired";
    id: string;
    createdAt: number;
    updatedAt: number;
    customerId: string;
    planId: string;
    currentPeriodStart: number;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
    trialStart?: number | undefined;
    trialEnd?: number | undefined;
    canceledAt?: number | undefined;
}, {
    status: "trialing" | "active" | "past_due" | "canceled" | "paused" | "expired";
    id: string;
    createdAt: number;
    updatedAt: number;
    customerId: string;
    planId: string;
    currentPeriodStart: number;
    currentPeriodEnd: number;
    trialStart?: number | undefined;
    trialEnd?: number | undefined;
    canceledAt?: number | undefined;
    cancelAtPeriodEnd?: boolean | undefined;
}>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export declare const RevenueMetricsSchema: z.ZodObject<{
    mrrCents: z.ZodNumber;
    arrCents: z.ZodNumber;
    churnRate: z.ZodNumber;
    avgLtvCents: z.ZodNumber;
    activeSubscriptions: z.ZodNumber;
    trialingSubscriptions: z.ZodNumber;
    canceledThisPeriod: z.ZodNumber;
    newThisPeriod: z.ZodNumber;
    calculatedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    mrrCents: number;
    arrCents: number;
    churnRate: number;
    avgLtvCents: number;
    activeSubscriptions: number;
    trialingSubscriptions: number;
    canceledThisPeriod: number;
    newThisPeriod: number;
    calculatedAt: number;
}, {
    mrrCents: number;
    arrCents: number;
    churnRate: number;
    avgLtvCents: number;
    activeSubscriptions: number;
    trialingSubscriptions: number;
    canceledThisPeriod: number;
    newThisPeriod: number;
    calculatedAt: number;
}>;
export type RevenueMetrics = z.infer<typeof RevenueMetricsSchema>;
export declare const AIProviderNameSchema: z.ZodEnum<["openai", "anthropic", "local"]>;
export type AIProviderName = z.infer<typeof AIProviderNameSchema>;
export declare const AIModelConfigSchema: z.ZodObject<{
    provider: z.ZodEnum<["openai", "anthropic", "local"]>;
    model: z.ZodString;
    maxTokens: z.ZodOptional<z.ZodNumber>;
    temperature: z.ZodOptional<z.ZodNumber>;
    apiKey: z.ZodOptional<z.ZodString>;
    baseUrl: z.ZodOptional<z.ZodString>;
    costPer1kInputTokens: z.ZodDefault<z.ZodNumber>;
    costPer1kOutputTokens: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    provider: "openai" | "anthropic" | "local";
    model: string;
    costPer1kInputTokens: number;
    costPer1kOutputTokens: number;
    maxTokens?: number | undefined;
    temperature?: number | undefined;
    apiKey?: string | undefined;
    baseUrl?: string | undefined;
}, {
    provider: "openai" | "anthropic" | "local";
    model: string;
    maxTokens?: number | undefined;
    temperature?: number | undefined;
    apiKey?: string | undefined;
    baseUrl?: string | undefined;
    costPer1kInputTokens?: number | undefined;
    costPer1kOutputTokens?: number | undefined;
}>;
export type AIModelConfig = z.infer<typeof AIModelConfigSchema>;
export declare const AIRequestSchema: z.ZodObject<{
    prompt: z.ZodString;
    systemPrompt: z.ZodOptional<z.ZodString>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
    temperature: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    metadata: Record<string, string>;
    prompt: string;
    maxTokens?: number | undefined;
    temperature?: number | undefined;
    systemPrompt?: string | undefined;
}, {
    prompt: string;
    metadata?: Record<string, string> | undefined;
    maxTokens?: number | undefined;
    temperature?: number | undefined;
    systemPrompt?: string | undefined;
}>;
export type AIRequest = z.infer<typeof AIRequestSchema>;
export declare const AIResponseSchema: z.ZodObject<{
    content: z.ZodString;
    provider: z.ZodEnum<["openai", "anthropic", "local"]>;
    model: z.ZodString;
    inputTokens: z.ZodNumber;
    outputTokens: z.ZodNumber;
    latencyMs: z.ZodNumber;
    cached: z.ZodDefault<z.ZodBoolean>;
    costCents: z.ZodDefault<z.ZodNumber>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    metadata: Record<string, string>;
    provider: "openai" | "anthropic" | "local";
    model: string;
    content: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    cached: boolean;
    costCents: number;
}, {
    provider: "openai" | "anthropic" | "local";
    model: string;
    content: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    metadata?: Record<string, string> | undefined;
    cached?: boolean | undefined;
    costCents?: number | undefined;
}>;
export type AIResponse = z.infer<typeof AIResponseSchema>;
export declare const PromptTemplateSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    version: z.ZodNumber;
    template: z.ZodString;
    variables: z.ZodArray<z.ZodString, "many">;
    isActive: z.ZodDefault<z.ZodBoolean>;
    abTestGroup: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    version: number;
    template: string;
    variables: string[];
    isActive: boolean;
    abTestGroup?: string | undefined;
}, {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    version: number;
    template: string;
    variables: string[];
    isActive?: boolean | undefined;
    abTestGroup?: string | undefined;
}>;
export type PromptTemplate = z.infer<typeof PromptTemplateSchema>;
export declare const AICacheEntrySchema: z.ZodObject<{
    key: z.ZodString;
    response: z.ZodObject<{
        content: z.ZodString;
        provider: z.ZodEnum<["openai", "anthropic", "local"]>;
        model: z.ZodString;
        inputTokens: z.ZodNumber;
        outputTokens: z.ZodNumber;
        latencyMs: z.ZodNumber;
        cached: z.ZodDefault<z.ZodBoolean>;
        costCents: z.ZodDefault<z.ZodNumber>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        metadata: Record<string, string>;
        provider: "openai" | "anthropic" | "local";
        model: string;
        content: string;
        inputTokens: number;
        outputTokens: number;
        latencyMs: number;
        cached: boolean;
        costCents: number;
    }, {
        provider: "openai" | "anthropic" | "local";
        model: string;
        content: string;
        inputTokens: number;
        outputTokens: number;
        latencyMs: number;
        metadata?: Record<string, string> | undefined;
        cached?: boolean | undefined;
        costCents?: number | undefined;
    }>;
    createdAt: z.ZodNumber;
    ttlMs: z.ZodNumber;
    expiresAt: z.ZodNumber;
    hitCount: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    createdAt: number;
    key: string;
    response: {
        metadata: Record<string, string>;
        provider: "openai" | "anthropic" | "local";
        model: string;
        content: string;
        inputTokens: number;
        outputTokens: number;
        latencyMs: number;
        cached: boolean;
        costCents: number;
    };
    ttlMs: number;
    expiresAt: number;
    hitCount: number;
}, {
    createdAt: number;
    key: string;
    response: {
        provider: "openai" | "anthropic" | "local";
        model: string;
        content: string;
        inputTokens: number;
        outputTokens: number;
        latencyMs: number;
        metadata?: Record<string, string> | undefined;
        cached?: boolean | undefined;
        costCents?: number | undefined;
    };
    ttlMs: number;
    expiresAt: number;
    hitCount?: number | undefined;
}>;
export type AICacheEntry = z.infer<typeof AICacheEntrySchema>;
export declare const TokenBudgetSchema: z.ZodObject<{
    id: z.ZodString;
    scope: z.ZodEnum<["request", "daily", "monthly"]>;
    maxTokens: z.ZodNumber;
    maxCostCents: z.ZodNumber;
    usedTokens: z.ZodDefault<z.ZodNumber>;
    usedCostCents: z.ZodDefault<z.ZodNumber>;
    periodStart: z.ZodNumber;
    periodEnd: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    periodStart: number;
    periodEnd: number;
    maxTokens: number;
    scope: "monthly" | "request" | "daily";
    maxCostCents: number;
    usedTokens: number;
    usedCostCents: number;
}, {
    id: string;
    periodStart: number;
    periodEnd: number;
    maxTokens: number;
    scope: "monthly" | "request" | "daily";
    maxCostCents: number;
    usedTokens?: number | undefined;
    usedCostCents?: number | undefined;
}>;
export type TokenBudget = z.infer<typeof TokenBudgetSchema>;
export declare const FallbackChainSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    providers: z.ZodArray<z.ZodObject<{
        config: z.ZodObject<{
            provider: z.ZodEnum<["openai", "anthropic", "local"]>;
            model: z.ZodString;
            maxTokens: z.ZodOptional<z.ZodNumber>;
            temperature: z.ZodOptional<z.ZodNumber>;
            apiKey: z.ZodOptional<z.ZodString>;
            baseUrl: z.ZodOptional<z.ZodString>;
            costPer1kInputTokens: z.ZodDefault<z.ZodNumber>;
            costPer1kOutputTokens: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            provider: "openai" | "anthropic" | "local";
            model: string;
            costPer1kInputTokens: number;
            costPer1kOutputTokens: number;
            maxTokens?: number | undefined;
            temperature?: number | undefined;
            apiKey?: string | undefined;
            baseUrl?: string | undefined;
        }, {
            provider: "openai" | "anthropic" | "local";
            model: string;
            maxTokens?: number | undefined;
            temperature?: number | undefined;
            apiKey?: string | undefined;
            baseUrl?: string | undefined;
            costPer1kInputTokens?: number | undefined;
            costPer1kOutputTokens?: number | undefined;
        }>;
        timeoutMs: z.ZodDefault<z.ZodNumber>;
        priority: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        config: {
            provider: "openai" | "anthropic" | "local";
            model: string;
            costPer1kInputTokens: number;
            costPer1kOutputTokens: number;
            maxTokens?: number | undefined;
            temperature?: number | undefined;
            apiKey?: string | undefined;
            baseUrl?: string | undefined;
        };
        timeoutMs: number;
        priority: number;
    }, {
        config: {
            provider: "openai" | "anthropic" | "local";
            model: string;
            maxTokens?: number | undefined;
            temperature?: number | undefined;
            apiKey?: string | undefined;
            baseUrl?: string | undefined;
            costPer1kInputTokens?: number | undefined;
            costPer1kOutputTokens?: number | undefined;
        };
        priority: number;
        timeoutMs?: number | undefined;
    }>, "many">;
    maxRetries: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    providers: {
        config: {
            provider: "openai" | "anthropic" | "local";
            model: string;
            costPer1kInputTokens: number;
            costPer1kOutputTokens: number;
            maxTokens?: number | undefined;
            temperature?: number | undefined;
            apiKey?: string | undefined;
            baseUrl?: string | undefined;
        };
        timeoutMs: number;
        priority: number;
    }[];
    maxRetries: number;
}, {
    id: string;
    name: string;
    providers: {
        config: {
            provider: "openai" | "anthropic" | "local";
            model: string;
            maxTokens?: number | undefined;
            temperature?: number | undefined;
            apiKey?: string | undefined;
            baseUrl?: string | undefined;
            costPer1kInputTokens?: number | undefined;
            costPer1kOutputTokens?: number | undefined;
        };
        priority: number;
        timeoutMs?: number | undefined;
    }[];
    maxRetries?: number | undefined;
}>;
export type FallbackChain = z.infer<typeof FallbackChainSchema>;
export declare const CostCategorySchema: z.ZodEnum<["api", "compute", "storage", "bandwidth", "ai", "third_party", "other"]>;
export type CostCategory = z.infer<typeof CostCategorySchema>;
export declare const CostEntrySchema: z.ZodObject<{
    id: z.ZodString;
    serviceId: z.ZodString;
    category: z.ZodEnum<["api", "compute", "storage", "bandwidth", "ai", "third_party", "other"]>;
    amountCents: z.ZodNumber;
    description: z.ZodString;
    timestamp: z.ZodNumber;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    timestamp: number;
    metadata: Record<string, string>;
    serviceId: string;
    category: "api" | "compute" | "storage" | "bandwidth" | "ai" | "third_party" | "other";
    amountCents: number;
}, {
    id: string;
    description: string;
    timestamp: number;
    serviceId: string;
    category: "api" | "compute" | "storage" | "bandwidth" | "ai" | "third_party" | "other";
    amountCents: number;
    metadata?: Record<string, string> | undefined;
}>;
export type CostEntry = z.infer<typeof CostEntrySchema>;
export declare const CostAllocationSchema: z.ZodObject<{
    id: z.ZodString;
    costEntryId: z.ZodString;
    productId: z.ZodString;
    allocationPercentage: z.ZodNumber;
    allocatedAmountCents: z.ZodNumber;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    timestamp: number;
    costEntryId: string;
    productId: string;
    allocationPercentage: number;
    allocatedAmountCents: number;
}, {
    id: string;
    timestamp: number;
    costEntryId: string;
    productId: string;
    allocationPercentage: number;
    allocatedAmountCents: number;
}>;
export type CostAllocation = z.infer<typeof CostAllocationSchema>;
export declare const CostAlertSchema: z.ZodObject<{
    id: z.ZodString;
    serviceId: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodEnum<["api", "compute", "storage", "bandwidth", "ai", "third_party", "other"]>>;
    budgetCents: z.ZodNumber;
    thresholdPercent: z.ZodDefault<z.ZodNumber>;
    currentSpendCents: z.ZodDefault<z.ZodNumber>;
    periodStart: z.ZodNumber;
    periodEnd: z.ZodNumber;
    triggered: z.ZodDefault<z.ZodBoolean>;
    triggeredAt: z.ZodOptional<z.ZodNumber>;
    notificationCallback: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    periodStart: number;
    periodEnd: number;
    budgetCents: number;
    thresholdPercent: number;
    currentSpendCents: number;
    triggered: boolean;
    serviceId?: string | undefined;
    category?: "api" | "compute" | "storage" | "bandwidth" | "ai" | "third_party" | "other" | undefined;
    triggeredAt?: number | undefined;
    notificationCallback?: string | undefined;
}, {
    id: string;
    periodStart: number;
    periodEnd: number;
    budgetCents: number;
    serviceId?: string | undefined;
    category?: "api" | "compute" | "storage" | "bandwidth" | "ai" | "third_party" | "other" | undefined;
    thresholdPercent?: number | undefined;
    currentSpendCents?: number | undefined;
    triggered?: boolean | undefined;
    triggeredAt?: number | undefined;
    notificationCallback?: string | undefined;
}>;
export type CostAlert = z.infer<typeof CostAlertSchema>;
export declare const DataCategorySchema: z.ZodEnum<["personal", "financial", "health", "behavioral", "technical", "communications", "preferences"]>;
export type DataCategory = z.infer<typeof DataCategorySchema>;
export declare const DataSubjectRecordSchema: z.ZodObject<{
    userId: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    dataEntries: z.ZodArray<z.ZodObject<{
        tableName: z.ZodString;
        recordId: z.ZodString;
        category: z.ZodEnum<["personal", "financial", "health", "behavioral", "technical", "communications", "preferences"]>;
        description: z.ZodString;
        createdAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        description: string;
        createdAt: number;
        category: "personal" | "financial" | "health" | "behavioral" | "technical" | "communications" | "preferences";
        tableName: string;
        recordId: string;
    }, {
        description: string;
        createdAt: number;
        category: "personal" | "financial" | "health" | "behavioral" | "technical" | "communications" | "preferences";
        tableName: string;
        recordId: string;
    }>, "many">;
    registeredAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    updatedAt: number;
    userId: string;
    dataEntries: {
        description: string;
        createdAt: number;
        category: "personal" | "financial" | "health" | "behavioral" | "technical" | "communications" | "preferences";
        tableName: string;
        recordId: string;
    }[];
    registeredAt: number;
    email?: string | undefined;
}, {
    updatedAt: number;
    userId: string;
    dataEntries: {
        description: string;
        createdAt: number;
        category: "personal" | "financial" | "health" | "behavioral" | "technical" | "communications" | "preferences";
        tableName: string;
        recordId: string;
    }[];
    registeredAt: number;
    email?: string | undefined;
}>;
export type DataSubjectRecord = z.infer<typeof DataSubjectRecordSchema>;
export declare const DataExportFormatSchema: z.ZodEnum<["json", "csv"]>;
export type DataExportFormat = z.infer<typeof DataExportFormatSchema>;
export declare const DataExportSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    format: z.ZodEnum<["json", "csv"]>;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    requestedAt: z.ZodNumber;
    completedAt: z.ZodOptional<z.ZodNumber>;
    status: z.ZodEnum<["pending", "processing", "completed", "failed"]>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "processing" | "completed" | "failed";
    id: string;
    userId: string;
    format: "json" | "csv";
    data: Record<string, unknown>;
    requestedAt: number;
    completedAt?: number | undefined;
}, {
    status: "pending" | "processing" | "completed" | "failed";
    id: string;
    userId: string;
    format: "json" | "csv";
    data: Record<string, unknown>;
    requestedAt: number;
    completedAt?: number | undefined;
}>;
export type DataExport = z.infer<typeof DataExportSchema>;
export declare const DeletionLogEntrySchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    tableName: z.ZodString;
    recordId: z.ZodString;
    deletedAt: z.ZodNumber;
    deletedBy: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    userId: string;
    tableName: string;
    recordId: string;
    deletedAt: number;
    deletedBy: string;
    reason?: string | undefined;
}, {
    id: string;
    userId: string;
    tableName: string;
    recordId: string;
    deletedAt: number;
    deletedBy: string;
    reason?: string | undefined;
}>;
export type DeletionLogEntry = z.infer<typeof DeletionLogEntrySchema>;
export declare const ConsentCategorySchema: z.ZodEnum<["essential", "analytics", "marketing", "personalization", "third_party"]>;
export type ConsentCategory = z.infer<typeof ConsentCategorySchema>;
export declare const ConsentRecordSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    category: z.ZodEnum<["essential", "analytics", "marketing", "personalization", "third_party"]>;
    granted: z.ZodBoolean;
    grantedAt: z.ZodNumber;
    revokedAt: z.ZodOptional<z.ZodNumber>;
    ipAddress: z.ZodOptional<z.ZodString>;
    userAgent: z.ZodOptional<z.ZodString>;
    version: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    userId: string;
    version: number;
    category: "third_party" | "essential" | "analytics" | "marketing" | "personalization";
    granted: boolean;
    grantedAt: number;
    revokedAt?: number | undefined;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
}, {
    id: string;
    userId: string;
    category: "third_party" | "essential" | "analytics" | "marketing" | "personalization";
    granted: boolean;
    grantedAt: number;
    version?: number | undefined;
    revokedAt?: number | undefined;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
}>;
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;
export declare const RetentionPolicySchema: z.ZodObject<{
    id: z.ZodString;
    tableName: z.ZodString;
    retentionDays: z.ZodNumber;
    dataCategory: z.ZodEnum<["personal", "financial", "health", "behavioral", "technical", "communications", "preferences"]>;
    autoDelete: z.ZodDefault<z.ZodBoolean>;
    lastCleanup: z.ZodOptional<z.ZodNumber>;
    nextScheduledCleanup: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: number;
    updatedAt: number;
    tableName: string;
    retentionDays: number;
    dataCategory: "personal" | "financial" | "health" | "behavioral" | "technical" | "communications" | "preferences";
    autoDelete: boolean;
    lastCleanup?: number | undefined;
    nextScheduledCleanup?: number | undefined;
}, {
    id: string;
    createdAt: number;
    updatedAt: number;
    tableName: string;
    retentionDays: number;
    dataCategory: "personal" | "financial" | "health" | "behavioral" | "technical" | "communications" | "preferences";
    autoDelete?: boolean | undefined;
    lastCleanup?: number | undefined;
    nextScheduledCleanup?: number | undefined;
}>;
export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>;
export declare const AuditLogEntrySchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodNumber;
    actorId: z.ZodString;
    action: z.ZodEnum<["create", "read", "update", "delete", "export", "access"]>;
    resourceType: z.ZodString;
    resourceId: z.ZodString;
    details: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    ipAddress: z.ZodOptional<z.ZodString>;
    userAgent: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    timestamp: number;
    actorId: string;
    action: "create" | "read" | "update" | "delete" | "export" | "access";
    resourceType: string;
    resourceId: string;
    details: Record<string, unknown>;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
}, {
    id: string;
    timestamp: number;
    actorId: string;
    action: "create" | "read" | "update" | "delete" | "export" | "access";
    resourceType: string;
    resourceId: string;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
    details?: Record<string, unknown> | undefined;
}>;
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
//# sourceMappingURL=types.d.ts.map