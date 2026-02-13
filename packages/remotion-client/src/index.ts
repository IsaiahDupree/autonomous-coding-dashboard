/**
 * @acd/remotion-client
 *
 * TypeScript client SDK for consuming the Remotion API.
 *
 * @example
 * ```ts
 * import { RemotionClient } from "@acd/remotion-client";
 *
 * const client = new RemotionClient({
 *   apiUrl: "https://api.remotion.example.com",
 *   apiKey: process.env.REMOTION_API_KEY!,
 * });
 *
 * const job = await client.renderVideo({
 *   compositionId: "my-comp",
 *   inputProps: { title: "Hello World" },
 * });
 *
 * const completed = await client.waitForJob(job.id);
 * console.log("Output:", completed.outputUrl);
 * ```
 */

// ---- Main client ----
export { RemotionClient } from "./client";
export type {
  RemotionClientConfig,
  RenderVideoInput,
  RenderStaticInput,
  RenderStaticOutput,
  RenderJob,
  VoiceCloneInput,
  VoiceCloneOutput,
  SpeechSynthesisInput,
  SpeechSynthesisOutput,
  CaptionInput,
  CaptionOutput,
  VeoInput,
  NanoBananaInput,
  NanoBananaOutput,
  BeforeAfterInput,
  Template,
  TemplateDetail,
  HealthCheckResult,
  JobFilters,
} from "./client";

// ---- HTTP transport ----
export { HttpClient } from "./http";
export type { HttpClientConfig, RequestOptions, Logger } from "./http";

// ---- Circuit breaker ----
export { CircuitBreaker, CircuitBreakerState } from "./circuit-breaker";
export type { CircuitBreakerOptions } from "./circuit-breaker";

// ---- Errors ----
export {
  RemotionApiError,
  RemotionTimeoutError,
  RemotionRateLimitError,
  CircuitBreakerOpenError,
} from "./errors";
export type { RemotionApiErrorDetails } from "./errors";

// ---- Webhooks ----
export {
  verifyWebhookSignature,
  parseWebhookEvent,
  safeParseWebhookEvent,
  WebhookEventType,
} from "./webhook";
export type {
  WebhookEvent,
  TypedWebhookEvent,
  JobCompletedEvent,
  JobFailedEvent,
  JobProgressEvent,
  JobCompletedPayload,
  JobFailedPayload,
  JobProgressPayload,
} from "./webhook";
