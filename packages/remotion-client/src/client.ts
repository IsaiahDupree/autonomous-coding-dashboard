/**
 * Main RemotionClient class -- the public entry point for the SDK.
 *
 * This is the class that ALL products import to interact with the Remotion
 * rendering API.  It delegates HTTP calls to the internal `HttpClient` which
 * handles auth, retries, circuit breaking, timeouts and logging.
 */

import { z } from "zod";
import { HttpClient, HttpClientConfig, Logger } from "./http";
import { CircuitBreakerOptions } from "./circuit-breaker";

// ---------------------------------------------------------------------------
// Input / output types (Zod schemas + inferred TS types)
// ---------------------------------------------------------------------------

// ---- Render Video ----

const renderVideoInputSchema = z.object({
  compositionId: z.string().min(1),
  inputProps: z.record(z.unknown()).optional(),
  codec: z.enum(["h264", "h265", "vp8", "vp9", "prores"]).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  fps: z.number().positive().optional(),
  durationInFrames: z.number().int().positive().optional(),
  outputFormat: z.enum(["mp4", "webm", "mov"]).optional(),
  quality: z.number().min(0).max(100).optional(),
  webhookUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type RenderVideoInput = z.infer<typeof renderVideoInputSchema>;

// ---- Render Static ----

const renderStaticInputSchema = z.object({
  compositionId: z.string().min(1),
  inputProps: z.record(z.unknown()).optional(),
  format: z.enum(["png", "jpeg", "webp", "pdf"]).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  quality: z.number().min(0).max(100).optional(),
  frames: z.array(z.number().int().nonnegative()).optional(),
});

export type RenderStaticInput = z.infer<typeof renderStaticInputSchema>;

export interface RenderStaticOutput {
  images: Array<{ url: string; size: string }>;
}

// ---- Render Job ----

export interface RenderJob {
  id: string;
  status: "queued" | "rendering" | "completed" | "failed" | "cancelled";
  progress: number;
  outputUrl?: string;
  error?: { code: string; message: string };
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

// ---- Voice Clone ----

const voiceCloneInputSchema = z.object({
  name: z.string().min(1),
  audioSamples: z.array(z.string().url()).min(1),
  language: z.string().optional(),
  description: z.string().optional(),
});

export type VoiceCloneInput = z.infer<typeof voiceCloneInputSchema>;

export interface VoiceCloneOutput {
  voiceId: string;
  previewUrl: string;
}

// ---- Speech Synthesis ----

const speechSynthesisInputSchema = z.object({
  text: z.string().min(1),
  voiceId: z.string().min(1),
  emotion: z.string().optional(),
});

export type SpeechSynthesisInput = z.infer<typeof speechSynthesisInputSchema>;

export interface SpeechSynthesisOutput {
  audioUrl: string;
  durationMs: number;
}

// ---- Captions ----

const captionInputSchema = z.object({
  audioUrl: z.string().url(),
  language: z.string().optional(),
  maxCharsPerLine: z.number().int().positive().optional(),
  style: z
    .enum(["word-by-word", "sentence", "paragraph"])
    .optional(),
});

export type CaptionInput = z.infer<typeof captionInputSchema>;

export interface CaptionOutput {
  words: Array<{ word: string; start: number; end: number }>;
}

// ---- Veo (Google AI video generation) ----

const veoInputSchema = z.object({
  prompt: z.string().min(1),
  duration: z.number().positive().optional(),
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:3"]).optional(),
  style: z.string().optional(),
  negativePrompt: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type VeoInput = z.infer<typeof veoInputSchema>;

// ---- NanoBanana (image gen) ----

const nanoBananaInputSchema = z.object({
  prompt: z.string().min(1),
  count: z.number().int().min(1).max(10).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  style: z.string().optional(),
  negativePrompt: z.string().optional(),
});

export type NanoBananaInput = z.infer<typeof nanoBananaInputSchema>;

export interface NanoBananaOutput {
  images: Array<{ url: string; type: string }>;
}

// ---- Before / After ----

const beforeAfterInputSchema = z.object({
  beforeMediaUrl: z.string().url(),
  afterMediaUrl: z.string().url(),
  transitionStyle: z
    .enum(["slide", "fade", "wipe", "split"])
    .optional(),
  duration: z.number().positive().optional(),
  labelBefore: z.string().optional(),
  labelAfter: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type BeforeAfterInput = z.infer<typeof beforeAfterInputSchema>;

// ---- Templates ----

export interface Template {
  id: string;
  name: string;
  description: string;
}

export interface TemplateDetail extends Template {
  compositionId: string;
  defaultProps: Record<string, unknown>;
  previewUrl?: string;
  tags?: string[];
}

// ---- Health ----

export interface HealthCheckResult {
  status: string;
  version: string;
}

// ---- Job filters ----

export interface JobFilters {
  status?: string;
  type?: string;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Client configuration
// ---------------------------------------------------------------------------

export interface RemotionClientConfig {
  /** Remotion API base URL (e.g. "https://api.remotion.example.com"). */
  apiUrl: string;
  /** API key for authentication. */
  apiKey: string;
  /** Global request timeout in ms. Default: 30 000 */
  timeout?: number;
  /** Maximum automatic retries for transient failures. Default: 3 */
  maxRetries?: number;
  /** Circuit breaker overrides. */
  circuitBreaker?: CircuitBreakerOptions;
  /** Custom logger. Set to `null` to silence all logging. */
  logger?: Logger | null;
}

// ---------------------------------------------------------------------------
// RemotionClient
// ---------------------------------------------------------------------------

export class RemotionClient {
  private readonly http: HttpClient;

  constructor(config: RemotionClientConfig) {
    const httpConfig: HttpClientConfig = {
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      timeoutMs: config.timeout,
      maxRetries: config.maxRetries,
      circuitBreaker: config.circuitBreaker,
      logger: config.logger,
    };
    this.http = new HttpClient(httpConfig);
  }

  // -----------------------------------------------------------------------
  // Video Generation
  // -----------------------------------------------------------------------

  /**
   * Submit a new video render job.
   *
   * @returns The created `RenderJob` with an initial status of `"queued"`.
   */
  async renderVideo(input: RenderVideoInput): Promise<RenderJob> {
    const validated = renderVideoInputSchema.parse(input);
    return this.http.post<RenderJob>("/v1/render/video", validated);
  }

  /**
   * Render one or more static frames from a composition.
   */
  async renderStatic(input: RenderStaticInput): Promise<RenderStaticOutput> {
    const validated = renderStaticInputSchema.parse(input);
    return this.http.post<RenderStaticOutput>("/v1/render/static", validated);
  }

  // -----------------------------------------------------------------------
  // Voice
  // -----------------------------------------------------------------------

  /**
   * Create a cloned voice from audio samples.
   */
  async cloneVoice(input: VoiceCloneInput): Promise<VoiceCloneOutput> {
    const validated = voiceCloneInputSchema.parse(input);
    return this.http.post<VoiceCloneOutput>("/v1/voice/clone", validated);
  }

  /**
   * Synthesize speech from text using a specified voice.
   */
  async synthesizeSpeech(
    input: SpeechSynthesisInput,
  ): Promise<SpeechSynthesisOutput> {
    const validated = speechSynthesisInputSchema.parse(input);
    return this.http.post<SpeechSynthesisOutput>(
      "/v1/voice/synthesize",
      validated,
    );
  }

  // -----------------------------------------------------------------------
  // Captions
  // -----------------------------------------------------------------------

  /**
   * Generate time-stamped captions / word-level transcription for an audio
   * file.
   */
  async generateCaptions(input: CaptionInput): Promise<CaptionOutput> {
    const validated = captionInputSchema.parse(input);
    return this.http.post<CaptionOutput>("/v1/captions/generate", validated);
  }

  // -----------------------------------------------------------------------
  // AI Providers
  // -----------------------------------------------------------------------

  /**
   * Generate video using Google Veo AI.
   */
  async generateVeo(input: VeoInput): Promise<RenderJob> {
    const validated = veoInputSchema.parse(input);
    return this.http.post<RenderJob>("/v1/ai/veo", validated);
  }

  /**
   * Generate images using the NanoBanana model.
   */
  async generateNanoBanana(input: NanoBananaInput): Promise<NanoBananaOutput> {
    const validated = nanoBananaInputSchema.parse(input);
    return this.http.post<NanoBananaOutput>("/v1/ai/nanobanana", validated);
  }

  /**
   * Create a before/after comparison video.
   */
  async renderBeforeAfter(input: BeforeAfterInput): Promise<RenderJob> {
    const validated = beforeAfterInputSchema.parse(input);
    return this.http.post<RenderJob>("/v1/render/before-after", validated);
  }

  // -----------------------------------------------------------------------
  // Job Management
  // -----------------------------------------------------------------------

  /**
   * Get the current status and details of a render job.
   */
  async getJobStatus(jobId: string): Promise<RenderJob> {
    if (!jobId) throw new Error("jobId is required");
    return this.http.get<RenderJob>(`/v1/jobs/${encodeURIComponent(jobId)}`);
  }

  /**
   * Cancel a running or queued render job.
   */
  async cancelJob(jobId: string): Promise<void> {
    if (!jobId) throw new Error("jobId is required");
    await this.http.post<void>(
      `/v1/jobs/${encodeURIComponent(jobId)}/cancel`,
    );
  }

  /**
   * List render jobs with optional filters.
   */
  async listJobs(filters?: JobFilters): Promise<RenderJob[]> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.type) query.type = filters.type;
    if (filters?.limit) query.limit = filters.limit;
    return this.http.get<RenderJob[]>("/v1/jobs", query);
  }

  /**
   * Submit a batch of render jobs atomically.
   *
   * @param jobs - Array of render job inputs (same shape as `renderVideo` input).
   * @returns An array of created `RenderJob` objects.
   */
  async submitBatch(
    jobs: Array<RenderVideoInput>,
  ): Promise<Array<RenderJob>> {
    if (!jobs.length) throw new Error("At least one job is required");
    const validated = jobs.map((j) => renderVideoInputSchema.parse(j));
    return this.http.post<Array<RenderJob>>("/v1/jobs/batch", {
      jobs: validated,
    });
  }

  // -----------------------------------------------------------------------
  // Templates
  // -----------------------------------------------------------------------

  /**
   * List all available composition templates.
   */
  async listTemplates(): Promise<Array<Template>> {
    return this.http.get<Array<Template>>("/v1/templates");
  }

  /**
   * Get full details of a specific template.
   */
  async getTemplate(id: string): Promise<TemplateDetail> {
    if (!id) throw new Error("template id is required");
    return this.http.get<TemplateDetail>(
      `/v1/templates/${encodeURIComponent(id)}`,
    );
  }

  // -----------------------------------------------------------------------
  // Health
  // -----------------------------------------------------------------------

  /**
   * Ping the API to check availability and retrieve the server version.
   */
  async healthCheck(): Promise<HealthCheckResult> {
    return this.http.get<HealthCheckResult>("/v1/health");
  }

  // -----------------------------------------------------------------------
  // Utilities exposed for advanced users
  // -----------------------------------------------------------------------

  /**
   * Access the underlying HTTP client (e.g. to inspect the circuit breaker).
   */
  getHttpClient(): HttpClient {
    return this.http;
  }

  /**
   * Poll a job until it reaches a terminal state.
   *
   * @param jobId       - The job to poll.
   * @param intervalMs  - Polling interval in ms (default 2000).
   * @param maxWaitMs   - Maximum total wait time in ms (default 300 000 = 5 min).
   * @param onProgress  - Optional callback invoked on each poll with the latest job.
   * @returns The job once it reaches "completed", "failed", or "cancelled".
   */
  async waitForJob(
    jobId: string,
    options?: {
      intervalMs?: number;
      maxWaitMs?: number;
      onProgress?: (job: RenderJob) => void;
    },
  ): Promise<RenderJob> {
    const intervalMs = options?.intervalMs ?? 2_000;
    const maxWaitMs = options?.maxWaitMs ?? 300_000;
    const deadline = Date.now() + maxWaitMs;

    while (Date.now() < deadline) {
      const job = await this.getJobStatus(jobId);
      options?.onProgress?.(job);

      if (
        job.status === "completed" ||
        job.status === "failed" ||
        job.status === "cancelled"
      ) {
        return job;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(
      `Job ${jobId} did not complete within ${maxWaitMs}ms`,
    );
  }
}
