/**
 * Meta integration barrel export.
 *
 * Re-exports all Meta-related integration types and services.
 */

// Types
export type {
  MetaIntegrationConfig,
  WaitlistLabMetaConfig,
  CampaignCreateRequest,
  CampaignObjective,
  CampaignStatusValue,
  BidStrategy,
  AdSetCreateRequest,
  OptimizationGoal,
  BillingEventValue,
  TargetingSpec,
  AdCreateRequest,
  InsightQuery,
  InsightLevel,
  DatePreset,
  CAPIUserData,
  CAPICustomData,
  CAPIEventPayload,
  Touchpoint,
  AttributionModel,
  AttributionWeight,
  AttributionResult,
  PoolAccount,
  AccountUsage,
  RateLimitSlot,
  WLApiResponse,
  CreativeUploadResult,
  CreativePerformance,
} from "./types";

// PCT Meta Service (MH-002)
export { PCTMetaService } from "./pct-meta";
export type {
  PCTCampaignInput,
  PCTAdSetInput,
  PCTCreativeInput,
  PCTInsightResult,
} from "./pct-meta";

// Content Factory Meta Service (MH-003)
export { ContentFactoryMetaService } from "./cf-meta";

// Shared Pixel / CAPI Service (MH-004, GAP-001, GAP-005)
export { SharedPixelCAPIService } from "./pixel-capi";
export type { PixelCAPIConfig } from "./pixel-capi";

// Cross-Product Attribution (MH-005, GAP-002)
export { CrossProductAttributionService } from "./attribution";
export type {
  AttributionConfig,
  TouchpointStore,
} from "./attribution";

// Rate Limit Pool (MH-006)
export { MetaRateLimitPool } from "./rate-pool";
