/**
 * Main RemotionClient class -- the public entry point for the SDK.
 *
 * This is the class that ALL products import to interact with the Remotion
 * rendering API.  It delegates HTTP calls to the internal `HttpClient` which
 * handles auth, retries, circuit breaking, timeouts and logging.
 */
import { z } from "zod";
import { HttpClient, Logger } from "./http";
import { CircuitBreakerOptions } from "./circuit-breaker";
declare const renderVideoInputSchema: z.ZodObject<{
    compositionId: z.ZodString;
    inputProps: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    codec: z.ZodOptional<z.ZodEnum<["h264", "h265", "vp8", "vp9", "prores"]>>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    fps: z.ZodOptional<z.ZodNumber>;
    durationInFrames: z.ZodOptional<z.ZodNumber>;
    outputFormat: z.ZodOptional<z.ZodEnum<["mp4", "webm", "mov"]>>;
    quality: z.ZodOptional<z.ZodNumber>;
    webhookUrl: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    compositionId: string;
    inputProps?: Record<string, unknown> | undefined;
    codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
    width?: number | undefined;
    height?: number | undefined;
    fps?: number | undefined;
    durationInFrames?: number | undefined;
    outputFormat?: "mp4" | "webm" | "mov" | undefined;
    quality?: number | undefined;
    webhookUrl?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    compositionId: string;
    inputProps?: Record<string, unknown> | undefined;
    codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
    width?: number | undefined;
    height?: number | undefined;
    fps?: number | undefined;
    durationInFrames?: number | undefined;
    outputFormat?: "mp4" | "webm" | "mov" | undefined;
    quality?: number | undefined;
    webhookUrl?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type RenderVideoInput = z.infer<typeof renderVideoInputSchema>;
declare const renderStaticInputSchema: z.ZodObject<{
    compositionId: z.ZodString;
    inputProps: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    format: z.ZodOptional<z.ZodEnum<["png", "jpeg", "webp", "pdf"]>>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    quality: z.ZodOptional<z.ZodNumber>;
    frames: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    compositionId: string;
    inputProps?: Record<string, unknown> | undefined;
    width?: number | undefined;
    height?: number | undefined;
    quality?: number | undefined;
    format?: "png" | "jpeg" | "webp" | "pdf" | undefined;
    frames?: number[] | undefined;
}, {
    compositionId: string;
    inputProps?: Record<string, unknown> | undefined;
    width?: number | undefined;
    height?: number | undefined;
    quality?: number | undefined;
    format?: "png" | "jpeg" | "webp" | "pdf" | undefined;
    frames?: number[] | undefined;
}>;
export type RenderStaticInput = z.infer<typeof renderStaticInputSchema>;
export interface RenderStaticOutput {
    images: Array<{
        url: string;
        size: string;
    }>;
}
export interface RenderJob {
    id: string;
    status: "queued" | "rendering" | "completed" | "failed" | "cancelled";
    progress: number;
    outputUrl?: string;
    error?: {
        code: string;
        message: string;
    };
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, unknown>;
}
declare const voiceCloneInputSchema: z.ZodObject<{
    name: z.ZodString;
    audioSamples: z.ZodArray<z.ZodString, "many">;
    language: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    audioSamples: string[];
    language?: string | undefined;
    description?: string | undefined;
}, {
    name: string;
    audioSamples: string[];
    language?: string | undefined;
    description?: string | undefined;
}>;
export type VoiceCloneInput = z.infer<typeof voiceCloneInputSchema>;
export interface VoiceCloneOutput {
    voiceId: string;
    previewUrl: string;
}
declare const speechSynthesisInputSchema: z.ZodObject<{
    text: z.ZodString;
    voiceId: z.ZodString;
    emotion: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    text: string;
    voiceId: string;
    emotion?: string | undefined;
}, {
    text: string;
    voiceId: string;
    emotion?: string | undefined;
}>;
export type SpeechSynthesisInput = z.infer<typeof speechSynthesisInputSchema>;
export interface SpeechSynthesisOutput {
    audioUrl: string;
    durationMs: number;
}
declare const captionInputSchema: z.ZodObject<{
    audioUrl: z.ZodString;
    language: z.ZodOptional<z.ZodString>;
    maxCharsPerLine: z.ZodOptional<z.ZodNumber>;
    style: z.ZodOptional<z.ZodEnum<["word-by-word", "sentence", "paragraph"]>>;
}, "strip", z.ZodTypeAny, {
    audioUrl: string;
    language?: string | undefined;
    maxCharsPerLine?: number | undefined;
    style?: "word-by-word" | "sentence" | "paragraph" | undefined;
}, {
    audioUrl: string;
    language?: string | undefined;
    maxCharsPerLine?: number | undefined;
    style?: "word-by-word" | "sentence" | "paragraph" | undefined;
}>;
export type CaptionInput = z.infer<typeof captionInputSchema>;
export interface CaptionOutput {
    words: Array<{
        word: string;
        start: number;
        end: number;
    }>;
}
declare const veoInputSchema: z.ZodObject<{
    prompt: z.ZodString;
    duration: z.ZodOptional<z.ZodNumber>;
    aspectRatio: z.ZodOptional<z.ZodEnum<["16:9", "9:16", "1:1", "4:3"]>>;
    style: z.ZodOptional<z.ZodString>;
    negativePrompt: z.ZodOptional<z.ZodString>;
    webhookUrl: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    webhookUrl?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    style?: string | undefined;
    duration?: number | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | undefined;
    negativePrompt?: string | undefined;
}, {
    prompt: string;
    webhookUrl?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    style?: string | undefined;
    duration?: number | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | undefined;
    negativePrompt?: string | undefined;
}>;
export type VeoInput = z.infer<typeof veoInputSchema>;
declare const nanoBananaInputSchema: z.ZodObject<{
    prompt: z.ZodString;
    count: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    style: z.ZodOptional<z.ZodString>;
    negativePrompt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    width?: number | undefined;
    height?: number | undefined;
    style?: string | undefined;
    negativePrompt?: string | undefined;
    count?: number | undefined;
}, {
    prompt: string;
    width?: number | undefined;
    height?: number | undefined;
    style?: string | undefined;
    negativePrompt?: string | undefined;
    count?: number | undefined;
}>;
export type NanoBananaInput = z.infer<typeof nanoBananaInputSchema>;
export interface NanoBananaOutput {
    images: Array<{
        url: string;
        type: string;
    }>;
}
declare const beforeAfterInputSchema: z.ZodObject<{
    beforeMediaUrl: z.ZodString;
    afterMediaUrl: z.ZodString;
    transitionStyle: z.ZodOptional<z.ZodEnum<["slide", "fade", "wipe", "split"]>>;
    duration: z.ZodOptional<z.ZodNumber>;
    labelBefore: z.ZodOptional<z.ZodString>;
    labelAfter: z.ZodOptional<z.ZodString>;
    webhookUrl: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    beforeMediaUrl: string;
    afterMediaUrl: string;
    webhookUrl?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    duration?: number | undefined;
    transitionStyle?: "slide" | "fade" | "wipe" | "split" | undefined;
    labelBefore?: string | undefined;
    labelAfter?: string | undefined;
}, {
    beforeMediaUrl: string;
    afterMediaUrl: string;
    webhookUrl?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    duration?: number | undefined;
    transitionStyle?: "slide" | "fade" | "wipe" | "split" | undefined;
    labelBefore?: string | undefined;
    labelAfter?: string | undefined;
}>;
export type BeforeAfterInput = z.infer<typeof beforeAfterInputSchema>;
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
export interface HealthCheckResult {
    status: string;
    version: string;
}
export interface JobFilters {
    status?: string;
    type?: string;
    limit?: number;
}
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
export declare class RemotionClient {
    private readonly http;
    constructor(config: RemotionClientConfig);
    /**
     * Submit a new video render job.
     *
     * @returns The created `RenderJob` with an initial status of `"queued"`.
     */
    renderVideo(input: RenderVideoInput): Promise<RenderJob>;
    /**
     * Render one or more static frames from a composition.
     */
    renderStatic(input: RenderStaticInput): Promise<RenderStaticOutput>;
    /**
     * Create a cloned voice from audio samples.
     */
    cloneVoice(input: VoiceCloneInput): Promise<VoiceCloneOutput>;
    /**
     * Synthesize speech from text using a specified voice.
     */
    synthesizeSpeech(input: SpeechSynthesisInput): Promise<SpeechSynthesisOutput>;
    /**
     * Generate time-stamped captions / word-level transcription for an audio
     * file.
     */
    generateCaptions(input: CaptionInput): Promise<CaptionOutput>;
    /**
     * Generate video using Google Veo AI.
     */
    generateVeo(input: VeoInput): Promise<RenderJob>;
    /**
     * Generate images using the NanoBanana model.
     */
    generateNanoBanana(input: NanoBananaInput): Promise<NanoBananaOutput>;
    /**
     * Create a before/after comparison video.
     */
    renderBeforeAfter(input: BeforeAfterInput): Promise<RenderJob>;
    /**
     * Get the current status and details of a render job.
     */
    getJobStatus(jobId: string): Promise<RenderJob>;
    /**
     * Cancel a running or queued render job.
     */
    cancelJob(jobId: string): Promise<void>;
    /**
     * List render jobs with optional filters.
     */
    listJobs(filters?: JobFilters): Promise<RenderJob[]>;
    /**
     * Submit a batch of render jobs atomically.
     *
     * @param jobs - Array of render job inputs (same shape as `renderVideo` input).
     * @returns An array of created `RenderJob` objects.
     */
    submitBatch(jobs: Array<RenderVideoInput>): Promise<Array<RenderJob>>;
    /**
     * List all available composition templates.
     */
    listTemplates(): Promise<Array<Template>>;
    /**
     * Get full details of a specific template.
     */
    getTemplate(id: string): Promise<TemplateDetail>;
    /**
     * Ping the API to check availability and retrieve the server version.
     */
    healthCheck(): Promise<HealthCheckResult>;
    /**
     * Access the underlying HTTP client (e.g. to inspect the circuit breaker).
     */
    getHttpClient(): HttpClient;
    /**
     * Poll a job until it reaches a terminal state.
     *
     * @param jobId       - The job to poll.
     * @param intervalMs  - Polling interval in ms (default 2000).
     * @param maxWaitMs   - Maximum total wait time in ms (default 300 000 = 5 min).
     * @param onProgress  - Optional callback invoked on each poll with the latest job.
     * @returns The job once it reaches "completed", "failed", or "cancelled".
     */
    waitForJob(jobId: string, options?: {
        intervalMs?: number;
        maxWaitMs?: number;
        onProgress?: (job: RenderJob) => void;
    }): Promise<RenderJob>;
}
export {};
//# sourceMappingURL=client.d.ts.map