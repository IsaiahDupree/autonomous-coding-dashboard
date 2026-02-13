/**
 * Meta integration barrel export.
 *
 * Re-exports all Meta-related integration types and services.
 */
export type { MetaIntegrationConfig, WaitlistLabMetaConfig, CampaignCreateRequest, CampaignObjective, CampaignStatusValue, BidStrategy, AdSetCreateRequest, OptimizationGoal, BillingEventValue, TargetingSpec, AdCreateRequest, InsightQuery, InsightLevel, DatePreset, CAPIUserData, CAPICustomData, CAPIEventPayload, Touchpoint, AttributionModel, AttributionWeight, AttributionResult, PoolAccount, AccountUsage, RateLimitSlot, WLApiResponse, CreativeUploadResult, CreativePerformance, } from "./types";
export { PCTMetaService } from "./pct-meta";
export type { PCTCampaignInput, PCTAdSetInput, PCTCreativeInput, PCTInsightResult, } from "./pct-meta";
export { ContentFactoryMetaService } from "./cf-meta";
export { SharedPixelCAPIService } from "./pixel-capi";
export type { PixelCAPIConfig } from "./pixel-capi";
export { CrossProductAttributionService } from "./attribution";
export type { AttributionConfig, TouchpointStore, } from "./attribution";
export { MetaRateLimitPool } from "./rate-pool";
//# sourceMappingURL=index.d.ts.map