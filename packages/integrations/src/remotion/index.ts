/**
 * @acd/integrations - Remotion subpackage
 *
 * Barrel export for all product-specific Remotion integration modules.
 */

// ---- Shared types ----
export {
  RenderTemplate,
  jobCallbackSchema,
  batchJobItemSchema,
  batchJobRequestSchema,
} from "./types";
export type {
  RenderJob,
  ProductRenderConfig,
  JobCallback,
  BatchJobRequest,
  BatchJobResult,
  RemotionServiceConfig,
} from "./types";

// ---- Content Factory (RC-002) ----
export { ContentFactoryRemotionService } from "./content-factory";
export type {
  UGCVideoInput,
  ProductShowcaseInput,
  TestimonialInput,
} from "./content-factory";

// ---- PCT (RC-003, RC-004) ----
export { PCTRemotionService } from "./pct";
export type {
  StaticAdInput,
  MiniVSLInput,
  BeforeAfterInput,
  AdDimension,
} from "./pct";

// ---- MediaPoster (RC-005) ----
export { MediaPosterRemotionService } from "./mediaposter";
export type {
  SocialVideoInput,
  CarouselInput,
  StoryInput,
} from "./mediaposter";

// ---- WaitlistLab (RC-006) ----
export { WaitlistLabRemotionService } from "./waitlistlab";
export type {
  AdCreativeInput,
  VariationsInput,
} from "./waitlistlab";

// ---- Webhooks (RC-007) ----
export { JobWebhookManager } from "./webhooks";
export type {
  WebhookPayload,
  CallbackPersistence,
} from "./webhooks";

// ---- Batch (RC-008) ----
export { BatchJobService } from "./batch";
