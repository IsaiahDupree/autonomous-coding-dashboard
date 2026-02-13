"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = exports.RetentionPolicyManager = exports.ConsentManager = exports.DataDeletionService = exports.DataExportService = exports.DataSubjectRegistry = exports.CostTrackingService = exports.AIValidationError = exports.AIOutputValidator = exports.FallbackChainExhaustedError = exports.AIFallbackChainManager = exports.TokenBudgetManager = exports.AIResponseCache = exports.PromptTemplateManager = exports.LocalModelProvider = exports.AnthropicProvider = exports.OpenAIProvider = exports.AIProviderRegistry = exports.SubscriptionService = exports.PaymentService = exports.prorateCharge = exports.calculateMetricBilling = exports.calculateTieredUsage = exports.BillingService = exports.MeteringService = exports.FlagSDK = exports.FeatureFlagStore = void 0;
// ─── Types & Schemas ─────────────────────────────────────────────────────────
__exportStar(require("./types"), exports);
// ─── Feature Flags (FF-001 to FF-006) ────────────────────────────────────────
var feature_flags_1 = require("./feature-flags");
Object.defineProperty(exports, "FeatureFlagStore", { enumerable: true, get: function () { return feature_flags_1.FeatureFlagStore; } });
Object.defineProperty(exports, "FlagSDK", { enumerable: true, get: function () { return feature_flags_1.FlagSDK; } });
// ─── Billing / Metering (BILL-001 to BILL-006) ──────────────────────────────
var metering_1 = require("./metering");
Object.defineProperty(exports, "MeteringService", { enumerable: true, get: function () { return metering_1.MeteringService; } });
var billing_1 = require("./billing");
Object.defineProperty(exports, "BillingService", { enumerable: true, get: function () { return billing_1.BillingService; } });
Object.defineProperty(exports, "calculateTieredUsage", { enumerable: true, get: function () { return billing_1.calculateTieredUsage; } });
Object.defineProperty(exports, "calculateMetricBilling", { enumerable: true, get: function () { return billing_1.calculateMetricBilling; } });
Object.defineProperty(exports, "prorateCharge", { enumerable: true, get: function () { return billing_1.prorateCharge; } });
var payments_1 = require("./payments");
Object.defineProperty(exports, "PaymentService", { enumerable: true, get: function () { return payments_1.PaymentService; } });
var subscriptions_1 = require("./subscriptions");
Object.defineProperty(exports, "SubscriptionService", { enumerable: true, get: function () { return subscriptions_1.SubscriptionService; } });
// ─── AI Orchestration (AI-001 to AI-006) ─────────────────────────────────────
var ai_provider_1 = require("./ai-provider");
Object.defineProperty(exports, "AIProviderRegistry", { enumerable: true, get: function () { return ai_provider_1.AIProviderRegistry; } });
Object.defineProperty(exports, "OpenAIProvider", { enumerable: true, get: function () { return ai_provider_1.OpenAIProvider; } });
Object.defineProperty(exports, "AnthropicProvider", { enumerable: true, get: function () { return ai_provider_1.AnthropicProvider; } });
Object.defineProperty(exports, "LocalModelProvider", { enumerable: true, get: function () { return ai_provider_1.LocalModelProvider; } });
var ai_prompts_1 = require("./ai-prompts");
Object.defineProperty(exports, "PromptTemplateManager", { enumerable: true, get: function () { return ai_prompts_1.PromptTemplateManager; } });
var ai_cache_1 = require("./ai-cache");
Object.defineProperty(exports, "AIResponseCache", { enumerable: true, get: function () { return ai_cache_1.AIResponseCache; } });
var ai_budget_1 = require("./ai-budget");
Object.defineProperty(exports, "TokenBudgetManager", { enumerable: true, get: function () { return ai_budget_1.TokenBudgetManager; } });
var ai_fallback_1 = require("./ai-fallback");
Object.defineProperty(exports, "AIFallbackChainManager", { enumerable: true, get: function () { return ai_fallback_1.AIFallbackChainManager; } });
Object.defineProperty(exports, "FallbackChainExhaustedError", { enumerable: true, get: function () { return ai_fallback_1.FallbackChainExhaustedError; } });
var ai_validation_1 = require("./ai-validation");
Object.defineProperty(exports, "AIOutputValidator", { enumerable: true, get: function () { return ai_validation_1.AIOutputValidator; } });
Object.defineProperty(exports, "AIValidationError", { enumerable: true, get: function () { return ai_validation_1.AIValidationError; } });
// ─── Cost Tracking (COST-001 to COST-003) ────────────────────────────────────
var cost_tracking_1 = require("./cost-tracking");
Object.defineProperty(exports, "CostTrackingService", { enumerable: true, get: function () { return cost_tracking_1.CostTrackingService; } });
// ─── Compliance / GDPR (COMP-001 to COMP-006) ───────────────────────────────
var data_registry_1 = require("./data-registry");
Object.defineProperty(exports, "DataSubjectRegistry", { enumerable: true, get: function () { return data_registry_1.DataSubjectRegistry; } });
var data_export_1 = require("./data-export");
Object.defineProperty(exports, "DataExportService", { enumerable: true, get: function () { return data_export_1.DataExportService; } });
var data_deletion_1 = require("./data-deletion");
Object.defineProperty(exports, "DataDeletionService", { enumerable: true, get: function () { return data_deletion_1.DataDeletionService; } });
var consent_1 = require("./consent");
Object.defineProperty(exports, "ConsentManager", { enumerable: true, get: function () { return consent_1.ConsentManager; } });
var retention_1 = require("./retention");
Object.defineProperty(exports, "RetentionPolicyManager", { enumerable: true, get: function () { return retention_1.RetentionPolicyManager; } });
var audit_log_1 = require("./audit-log");
Object.defineProperty(exports, "AuditLogService", { enumerable: true, get: function () { return audit_log_1.AuditLogService; } });
//# sourceMappingURL=index.js.map