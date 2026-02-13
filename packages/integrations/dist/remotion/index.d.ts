/**
 * @acd/integrations - Remotion subpackage
 *
 * Barrel export for all product-specific Remotion integration modules.
 */
export { RenderTemplate, jobCallbackSchema, batchJobItemSchema, batchJobRequestSchema, } from "./types";
export type { RenderJob, ProductRenderConfig, JobCallback, BatchJobRequest, BatchJobResult, RemotionServiceConfig, } from "./types";
export { ContentFactoryRemotionService } from "./content-factory";
export type { UGCVideoInput, ProductShowcaseInput, TestimonialInput, } from "./content-factory";
export { PCTRemotionService } from "./pct";
export type { StaticAdInput, MiniVSLInput, BeforeAfterInput, AdDimension, } from "./pct";
export { MediaPosterRemotionService } from "./mediaposter";
export type { SocialVideoInput, CarouselInput, StoryInput, } from "./mediaposter";
export { WaitlistLabRemotionService } from "./waitlistlab";
export type { AdCreativeInput, VariationsInput, } from "./waitlistlab";
export { JobWebhookManager } from "./webhooks";
export type { WebhookPayload, CallbackPersistence, } from "./webhooks";
export { BatchJobService } from "./batch";
//# sourceMappingURL=index.d.ts.map