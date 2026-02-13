"use strict";
/**
 * @acd/types - Shared Zod schemas and TypeScript types for all ACD products.
 *
 * This package provides the canonical type definitions used across the entire
 * ACD ecosystem. Every schema is defined with Zod for runtime validation,
 * and each has a corresponding inferred TypeScript type export.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticOutputFormatSchema = exports.VideoOutputFormatSchema = exports.RenderJobStatusSchema = exports.ApiErrorResponseSchema = exports.ApiSuccessResponseSchema = exports.ApiResponseSchema = exports.ApiErrorDetailSchema = exports.PaginationMetaSchema = exports.RateLimitConfigSchema = exports.RateLimitAlgorithmSchema = exports.ApiKeySchema = exports.ApiPermissionSchema = exports.ApiKeyStatusSchema = exports.ApiKeyTypeSchema = exports.OAuthConfigSchema = exports.OAuthGrantTypeSchema = exports.JWTPayloadSchema = exports.AuthSessionSchema = exports.SessionStatusSchema = exports.AuthMethodSchema = exports.AuthProviderSchema = exports.PersonSchema = exports.UtmParametersSchema = exports.LifecycleStageSchema = exports.LeadSourceSchema = exports.IdentityLinkSchema = exports.IdentityProviderSchema = exports.BatchTrackInputSchema = exports.TrackEventInputSchema = exports.SharedEventSchema = exports.EventContextSchema = exports.EventSeveritySchema = exports.EventCategorySchema = exports.SharedAssetSchema = exports.AudioMetadataSchema = exports.VideoMetadataSchema = exports.AssetDimensionsSchema = exports.StorageProviderSchema = exports.AssetStatusSchema = exports.AssetTypeSchema = exports.SharedEntitlementSchema = exports.EntitlementStatusSchema = exports.SharedUserSchema = exports.AccountStatusSchema = exports.UserRoleSchema = exports.ProductDisplayNames = exports.ProductDefinitionSchema = exports.ProductStatusSchema = exports.ProductTierSchema = exports.ProductIdSchema = void 0;
exports.BundlePricingSchema = exports.ProductSubscriptionSchema = exports.CancelReasonSchema = exports.SubscriptionStatusSchema = exports.BillingIntervalSchema = exports.SharedStripeCustomerSchema = exports.PaymentMethodSummarySchema = exports.PaymentMethodTypeSchema = exports.PaymentStatusSchema = exports.CAPIEventSchema = exports.CAPIActionSourceSchema = exports.PixelEventSchema = exports.StandardPixelEventSchema = exports.InsightSchema = exports.AdSchema = exports.AdCreativeSchema = exports.CallToActionSchema = exports.CreativeFormatSchema = exports.AdSetSchema = exports.TargetingSchema = exports.BillingEventSchema = exports.OptimizationGoalSchema = exports.CampaignSchema = exports.BudgetTypeSchema = exports.BuyingTypeSchema = exports.CampaignStatusSchema = exports.CampaignObjectiveSchema = exports.RenderJobSchema = exports.RenderTypeSchema = exports.BeforeAfterInputSchema = exports.BeforeAfterTransitionSchema = exports.NanoBananaInputSchema = exports.VeoInputSchema = exports.CaptionInputSchema = exports.CaptionStyleSchema = exports.VoiceCloneInputSchema = exports.VoiceCloneProviderSchema = exports.RenderStaticInputSchema = exports.RenderVideoInputSchema = exports.ResolutionPresetSchema = exports.AspectRatioSchema = exports.AudioCodecSchema = exports.VideoCodecSchema = void 0;
// Product definitions and enums
var product_1 = require("./product");
Object.defineProperty(exports, "ProductIdSchema", { enumerable: true, get: function () { return product_1.ProductIdSchema; } });
Object.defineProperty(exports, "ProductTierSchema", { enumerable: true, get: function () { return product_1.ProductTierSchema; } });
Object.defineProperty(exports, "ProductStatusSchema", { enumerable: true, get: function () { return product_1.ProductStatusSchema; } });
Object.defineProperty(exports, "ProductDefinitionSchema", { enumerable: true, get: function () { return product_1.ProductDefinitionSchema; } });
Object.defineProperty(exports, "ProductDisplayNames", { enumerable: true, get: function () { return product_1.ProductDisplayNames; } });
// User and entitlement types
var user_1 = require("./user");
Object.defineProperty(exports, "UserRoleSchema", { enumerable: true, get: function () { return user_1.UserRoleSchema; } });
Object.defineProperty(exports, "AccountStatusSchema", { enumerable: true, get: function () { return user_1.AccountStatusSchema; } });
Object.defineProperty(exports, "SharedUserSchema", { enumerable: true, get: function () { return user_1.SharedUserSchema; } });
Object.defineProperty(exports, "EntitlementStatusSchema", { enumerable: true, get: function () { return user_1.EntitlementStatusSchema; } });
Object.defineProperty(exports, "SharedEntitlementSchema", { enumerable: true, get: function () { return user_1.SharedEntitlementSchema; } });
// Asset types
var asset_1 = require("./asset");
Object.defineProperty(exports, "AssetTypeSchema", { enumerable: true, get: function () { return asset_1.AssetTypeSchema; } });
Object.defineProperty(exports, "AssetStatusSchema", { enumerable: true, get: function () { return asset_1.AssetStatusSchema; } });
Object.defineProperty(exports, "StorageProviderSchema", { enumerable: true, get: function () { return asset_1.StorageProviderSchema; } });
Object.defineProperty(exports, "AssetDimensionsSchema", { enumerable: true, get: function () { return asset_1.AssetDimensionsSchema; } });
Object.defineProperty(exports, "VideoMetadataSchema", { enumerable: true, get: function () { return asset_1.VideoMetadataSchema; } });
Object.defineProperty(exports, "AudioMetadataSchema", { enumerable: true, get: function () { return asset_1.AudioMetadataSchema; } });
Object.defineProperty(exports, "SharedAssetSchema", { enumerable: true, get: function () { return asset_1.SharedAssetSchema; } });
// Event and tracking types
var event_1 = require("./event");
Object.defineProperty(exports, "EventCategorySchema", { enumerable: true, get: function () { return event_1.EventCategorySchema; } });
Object.defineProperty(exports, "EventSeveritySchema", { enumerable: true, get: function () { return event_1.EventSeveritySchema; } });
Object.defineProperty(exports, "EventContextSchema", { enumerable: true, get: function () { return event_1.EventContextSchema; } });
Object.defineProperty(exports, "SharedEventSchema", { enumerable: true, get: function () { return event_1.SharedEventSchema; } });
Object.defineProperty(exports, "TrackEventInputSchema", { enumerable: true, get: function () { return event_1.TrackEventInputSchema; } });
Object.defineProperty(exports, "BatchTrackInputSchema", { enumerable: true, get: function () { return event_1.BatchTrackInputSchema; } });
// Person and identity types (Meta/lead data)
var person_1 = require("./person");
Object.defineProperty(exports, "IdentityProviderSchema", { enumerable: true, get: function () { return person_1.IdentityProviderSchema; } });
Object.defineProperty(exports, "IdentityLinkSchema", { enumerable: true, get: function () { return person_1.IdentityLinkSchema; } });
Object.defineProperty(exports, "LeadSourceSchema", { enumerable: true, get: function () { return person_1.LeadSourceSchema; } });
Object.defineProperty(exports, "LifecycleStageSchema", { enumerable: true, get: function () { return person_1.LifecycleStageSchema; } });
Object.defineProperty(exports, "UtmParametersSchema", { enumerable: true, get: function () { return person_1.UtmParametersSchema; } });
Object.defineProperty(exports, "PersonSchema", { enumerable: true, get: function () { return person_1.PersonSchema; } });
// Auth types
var auth_1 = require("./auth");
Object.defineProperty(exports, "AuthProviderSchema", { enumerable: true, get: function () { return auth_1.AuthProviderSchema; } });
Object.defineProperty(exports, "AuthMethodSchema", { enumerable: true, get: function () { return auth_1.AuthMethodSchema; } });
Object.defineProperty(exports, "SessionStatusSchema", { enumerable: true, get: function () { return auth_1.SessionStatusSchema; } });
Object.defineProperty(exports, "AuthSessionSchema", { enumerable: true, get: function () { return auth_1.AuthSessionSchema; } });
Object.defineProperty(exports, "JWTPayloadSchema", { enumerable: true, get: function () { return auth_1.JWTPayloadSchema; } });
Object.defineProperty(exports, "OAuthGrantTypeSchema", { enumerable: true, get: function () { return auth_1.OAuthGrantTypeSchema; } });
Object.defineProperty(exports, "OAuthConfigSchema", { enumerable: true, get: function () { return auth_1.OAuthConfigSchema; } });
// API types
var api_1 = require("./api");
Object.defineProperty(exports, "ApiKeyTypeSchema", { enumerable: true, get: function () { return api_1.ApiKeyTypeSchema; } });
Object.defineProperty(exports, "ApiKeyStatusSchema", { enumerable: true, get: function () { return api_1.ApiKeyStatusSchema; } });
Object.defineProperty(exports, "ApiPermissionSchema", { enumerable: true, get: function () { return api_1.ApiPermissionSchema; } });
Object.defineProperty(exports, "ApiKeySchema", { enumerable: true, get: function () { return api_1.ApiKeySchema; } });
Object.defineProperty(exports, "RateLimitAlgorithmSchema", { enumerable: true, get: function () { return api_1.RateLimitAlgorithmSchema; } });
Object.defineProperty(exports, "RateLimitConfigSchema", { enumerable: true, get: function () { return api_1.RateLimitConfigSchema; } });
Object.defineProperty(exports, "PaginationMetaSchema", { enumerable: true, get: function () { return api_1.PaginationMetaSchema; } });
Object.defineProperty(exports, "ApiErrorDetailSchema", { enumerable: true, get: function () { return api_1.ApiErrorDetailSchema; } });
Object.defineProperty(exports, "ApiResponseSchema", { enumerable: true, get: function () { return api_1.ApiResponseSchema; } });
Object.defineProperty(exports, "ApiSuccessResponseSchema", { enumerable: true, get: function () { return api_1.ApiSuccessResponseSchema; } });
Object.defineProperty(exports, "ApiErrorResponseSchema", { enumerable: true, get: function () { return api_1.ApiErrorResponseSchema; } });
// Remotion / rendering types
var remotion_1 = require("./remotion");
Object.defineProperty(exports, "RenderJobStatusSchema", { enumerable: true, get: function () { return remotion_1.RenderJobStatusSchema; } });
Object.defineProperty(exports, "VideoOutputFormatSchema", { enumerable: true, get: function () { return remotion_1.VideoOutputFormatSchema; } });
Object.defineProperty(exports, "StaticOutputFormatSchema", { enumerable: true, get: function () { return remotion_1.StaticOutputFormatSchema; } });
Object.defineProperty(exports, "VideoCodecSchema", { enumerable: true, get: function () { return remotion_1.VideoCodecSchema; } });
Object.defineProperty(exports, "AudioCodecSchema", { enumerable: true, get: function () { return remotion_1.AudioCodecSchema; } });
Object.defineProperty(exports, "AspectRatioSchema", { enumerable: true, get: function () { return remotion_1.AspectRatioSchema; } });
Object.defineProperty(exports, "ResolutionPresetSchema", { enumerable: true, get: function () { return remotion_1.ResolutionPresetSchema; } });
Object.defineProperty(exports, "RenderVideoInputSchema", { enumerable: true, get: function () { return remotion_1.RenderVideoInputSchema; } });
Object.defineProperty(exports, "RenderStaticInputSchema", { enumerable: true, get: function () { return remotion_1.RenderStaticInputSchema; } });
Object.defineProperty(exports, "VoiceCloneProviderSchema", { enumerable: true, get: function () { return remotion_1.VoiceCloneProviderSchema; } });
Object.defineProperty(exports, "VoiceCloneInputSchema", { enumerable: true, get: function () { return remotion_1.VoiceCloneInputSchema; } });
Object.defineProperty(exports, "CaptionStyleSchema", { enumerable: true, get: function () { return remotion_1.CaptionStyleSchema; } });
Object.defineProperty(exports, "CaptionInputSchema", { enumerable: true, get: function () { return remotion_1.CaptionInputSchema; } });
Object.defineProperty(exports, "VeoInputSchema", { enumerable: true, get: function () { return remotion_1.VeoInputSchema; } });
Object.defineProperty(exports, "NanoBananaInputSchema", { enumerable: true, get: function () { return remotion_1.NanoBananaInputSchema; } });
Object.defineProperty(exports, "BeforeAfterTransitionSchema", { enumerable: true, get: function () { return remotion_1.BeforeAfterTransitionSchema; } });
Object.defineProperty(exports, "BeforeAfterInputSchema", { enumerable: true, get: function () { return remotion_1.BeforeAfterInputSchema; } });
Object.defineProperty(exports, "RenderTypeSchema", { enumerable: true, get: function () { return remotion_1.RenderTypeSchema; } });
Object.defineProperty(exports, "RenderJobSchema", { enumerable: true, get: function () { return remotion_1.RenderJobSchema; } });
// Meta Marketing API types
var meta_1 = require("./meta");
Object.defineProperty(exports, "CampaignObjectiveSchema", { enumerable: true, get: function () { return meta_1.CampaignObjectiveSchema; } });
Object.defineProperty(exports, "CampaignStatusSchema", { enumerable: true, get: function () { return meta_1.CampaignStatusSchema; } });
Object.defineProperty(exports, "BuyingTypeSchema", { enumerable: true, get: function () { return meta_1.BuyingTypeSchema; } });
Object.defineProperty(exports, "BudgetTypeSchema", { enumerable: true, get: function () { return meta_1.BudgetTypeSchema; } });
Object.defineProperty(exports, "CampaignSchema", { enumerable: true, get: function () { return meta_1.CampaignSchema; } });
Object.defineProperty(exports, "OptimizationGoalSchema", { enumerable: true, get: function () { return meta_1.OptimizationGoalSchema; } });
Object.defineProperty(exports, "BillingEventSchema", { enumerable: true, get: function () { return meta_1.BillingEventSchema; } });
Object.defineProperty(exports, "TargetingSchema", { enumerable: true, get: function () { return meta_1.TargetingSchema; } });
Object.defineProperty(exports, "AdSetSchema", { enumerable: true, get: function () { return meta_1.AdSetSchema; } });
Object.defineProperty(exports, "CreativeFormatSchema", { enumerable: true, get: function () { return meta_1.CreativeFormatSchema; } });
Object.defineProperty(exports, "CallToActionSchema", { enumerable: true, get: function () { return meta_1.CallToActionSchema; } });
Object.defineProperty(exports, "AdCreativeSchema", { enumerable: true, get: function () { return meta_1.AdCreativeSchema; } });
Object.defineProperty(exports, "AdSchema", { enumerable: true, get: function () { return meta_1.AdSchema; } });
Object.defineProperty(exports, "InsightSchema", { enumerable: true, get: function () { return meta_1.InsightSchema; } });
Object.defineProperty(exports, "StandardPixelEventSchema", { enumerable: true, get: function () { return meta_1.StandardPixelEventSchema; } });
Object.defineProperty(exports, "PixelEventSchema", { enumerable: true, get: function () { return meta_1.PixelEventSchema; } });
Object.defineProperty(exports, "CAPIActionSourceSchema", { enumerable: true, get: function () { return meta_1.CAPIActionSourceSchema; } });
Object.defineProperty(exports, "CAPIEventSchema", { enumerable: true, get: function () { return meta_1.CAPIEventSchema; } });
// Stripe / billing types
var stripe_1 = require("./stripe");
Object.defineProperty(exports, "PaymentStatusSchema", { enumerable: true, get: function () { return stripe_1.PaymentStatusSchema; } });
Object.defineProperty(exports, "PaymentMethodTypeSchema", { enumerable: true, get: function () { return stripe_1.PaymentMethodTypeSchema; } });
Object.defineProperty(exports, "PaymentMethodSummarySchema", { enumerable: true, get: function () { return stripe_1.PaymentMethodSummarySchema; } });
Object.defineProperty(exports, "SharedStripeCustomerSchema", { enumerable: true, get: function () { return stripe_1.SharedStripeCustomerSchema; } });
Object.defineProperty(exports, "BillingIntervalSchema", { enumerable: true, get: function () { return stripe_1.BillingIntervalSchema; } });
Object.defineProperty(exports, "SubscriptionStatusSchema", { enumerable: true, get: function () { return stripe_1.SubscriptionStatusSchema; } });
Object.defineProperty(exports, "CancelReasonSchema", { enumerable: true, get: function () { return stripe_1.CancelReasonSchema; } });
Object.defineProperty(exports, "ProductSubscriptionSchema", { enumerable: true, get: function () { return stripe_1.ProductSubscriptionSchema; } });
Object.defineProperty(exports, "BundlePricingSchema", { enumerable: true, get: function () { return stripe_1.BundlePricingSchema; } });
//# sourceMappingURL=index.js.map