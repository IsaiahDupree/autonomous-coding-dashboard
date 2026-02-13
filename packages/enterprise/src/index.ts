/**
 * @acd/enterprise - Enterprise features package
 *
 * Feature Flags (FF-001 to FF-006)
 * Billing/Metering (BILL-001 to BILL-006)
 * AI Orchestration (AI-001 to AI-006)
 * Cost Tracking (COST-001 to COST-003)
 * Compliance/GDPR (COMP-001 to COMP-006)
 *
 * Total: 27 features
 */

// ─── Types & Schemas ─────────────────────────────────────────────────────────
export * from './types';

// ─── Feature Flags (FF-001 to FF-006) ────────────────────────────────────────
export { FeatureFlagStore, FlagSDK } from './feature-flags';
export type { FlagSDKOptions } from './feature-flags';

// ─── Billing / Metering (BILL-001 to BILL-006) ──────────────────────────────
export { MeteringService } from './metering';
export type { UsageSummary, MeteringOptions } from './metering';

export {
  BillingService,
  calculateTieredUsage,
  calculateMetricBilling,
  prorateCharge,
} from './billing';
export type { BillingCalculationResult, InvoiceGenerationInput } from './billing';

export { PaymentService } from './payments';
export type { AddPaymentMethodInput, PaymentMethodValidationResult } from './payments';

export { SubscriptionService } from './subscriptions';
export type { CreateSubscriptionInput, SubscriptionChangeResult } from './subscriptions';

// ─── AI Orchestration (AI-001 to AI-006) ─────────────────────────────────────
export {
  AIProviderRegistry,
  OpenAIProvider,
  AnthropicProvider,
  LocalModelProvider,
} from './ai-provider';
export type { IAIProvider } from './ai-provider';

export { PromptTemplateManager } from './ai-prompts';
export type { CreateTemplateInput } from './ai-prompts';

export { AIResponseCache } from './ai-cache';
export type { AICacheOptions } from './ai-cache';

export { TokenBudgetManager } from './ai-budget';
export type { CreateBudgetInput, BudgetCheckResult, ModelCostTracker } from './ai-budget';

export { AIFallbackChainManager, FallbackChainExhaustedError } from './ai-fallback';
export type { FallbackExecutionResult } from './ai-fallback';

export { AIOutputValidator, AIValidationError } from './ai-validation';
export type { ValidationResult, ValidatedAIResponse, AIValidationOptions } from './ai-validation';

// ─── Cost Tracking (COST-001 to COST-003) ────────────────────────────────────
export { CostTrackingService } from './cost-tracking';
export type { CostSummary } from './cost-tracking';

// ─── Compliance / GDPR (COMP-001 to COMP-006) ───────────────────────────────
export { DataSubjectRegistry } from './data-registry';
export type { RegisterDataEntryInput } from './data-registry';

export { DataExportService } from './data-export';
export type { ExportableDataSource } from './data-export';

export { DataDeletionService } from './data-deletion';
export type { DeletionTarget, DeletionResult } from './data-deletion';

export { ConsentManager } from './consent';
export type { GrantConsentInput, ConsentStatus } from './consent';

export { RetentionPolicyManager } from './retention';
export type { CreateRetentionPolicyInput, CleanupResult, CleanupHandler } from './retention';

export { AuditLogService } from './audit-log';
export type { CreateAuditLogInput, AuditLogQuery } from './audit-log';
