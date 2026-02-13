"use strict";
/**
 * Main RemotionClient class -- the public entry point for the SDK.
 *
 * This is the class that ALL products import to interact with the Remotion
 * rendering API.  It delegates HTTP calls to the internal `HttpClient` which
 * handles auth, retries, circuit breaking, timeouts and logging.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemotionClient = void 0;
const zod_1 = require("zod");
const http_1 = require("./http");
// ---------------------------------------------------------------------------
// Input / output types (Zod schemas + inferred TS types)
// ---------------------------------------------------------------------------
// ---- Render Video ----
const renderVideoInputSchema = zod_1.z.object({
    compositionId: zod_1.z.string().min(1),
    inputProps: zod_1.z.record(zod_1.z.unknown()).optional(),
    codec: zod_1.z.enum(["h264", "h265", "vp8", "vp9", "prores"]).optional(),
    width: zod_1.z.number().int().positive().optional(),
    height: zod_1.z.number().int().positive().optional(),
    fps: zod_1.z.number().positive().optional(),
    durationInFrames: zod_1.z.number().int().positive().optional(),
    outputFormat: zod_1.z.enum(["mp4", "webm", "mov"]).optional(),
    quality: zod_1.z.number().min(0).max(100).optional(),
    webhookUrl: zod_1.z.string().url().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// ---- Render Static ----
const renderStaticInputSchema = zod_1.z.object({
    compositionId: zod_1.z.string().min(1),
    inputProps: zod_1.z.record(zod_1.z.unknown()).optional(),
    format: zod_1.z.enum(["png", "jpeg", "webp", "pdf"]).optional(),
    width: zod_1.z.number().int().positive().optional(),
    height: zod_1.z.number().int().positive().optional(),
    quality: zod_1.z.number().min(0).max(100).optional(),
    frames: zod_1.z.array(zod_1.z.number().int().nonnegative()).optional(),
});
// ---- Voice Clone ----
const voiceCloneInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    audioSamples: zod_1.z.array(zod_1.z.string().url()).min(1),
    language: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
});
// ---- Speech Synthesis ----
const speechSynthesisInputSchema = zod_1.z.object({
    text: zod_1.z.string().min(1),
    voiceId: zod_1.z.string().min(1),
    emotion: zod_1.z.string().optional(),
});
// ---- Captions ----
const captionInputSchema = zod_1.z.object({
    audioUrl: zod_1.z.string().url(),
    language: zod_1.z.string().optional(),
    maxCharsPerLine: zod_1.z.number().int().positive().optional(),
    style: zod_1.z
        .enum(["word-by-word", "sentence", "paragraph"])
        .optional(),
});
// ---- Veo (Google AI video generation) ----
const veoInputSchema = zod_1.z.object({
    prompt: zod_1.z.string().min(1),
    duration: zod_1.z.number().positive().optional(),
    aspectRatio: zod_1.z.enum(["16:9", "9:16", "1:1", "4:3"]).optional(),
    style: zod_1.z.string().optional(),
    negativePrompt: zod_1.z.string().optional(),
    webhookUrl: zod_1.z.string().url().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// ---- NanoBanana (image gen) ----
const nanoBananaInputSchema = zod_1.z.object({
    prompt: zod_1.z.string().min(1),
    count: zod_1.z.number().int().min(1).max(10).optional(),
    width: zod_1.z.number().int().positive().optional(),
    height: zod_1.z.number().int().positive().optional(),
    style: zod_1.z.string().optional(),
    negativePrompt: zod_1.z.string().optional(),
});
// ---- Before / After ----
const beforeAfterInputSchema = zod_1.z.object({
    beforeMediaUrl: zod_1.z.string().url(),
    afterMediaUrl: zod_1.z.string().url(),
    transitionStyle: zod_1.z
        .enum(["slide", "fade", "wipe", "split"])
        .optional(),
    duration: zod_1.z.number().positive().optional(),
    labelBefore: zod_1.z.string().optional(),
    labelAfter: zod_1.z.string().optional(),
    webhookUrl: zod_1.z.string().url().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// ---------------------------------------------------------------------------
// RemotionClient
// ---------------------------------------------------------------------------
class RemotionClient {
    http;
    constructor(config) {
        const httpConfig = {
            apiUrl: config.apiUrl,
            apiKey: config.apiKey,
            timeoutMs: config.timeout,
            maxRetries: config.maxRetries,
            circuitBreaker: config.circuitBreaker,
            logger: config.logger,
        };
        this.http = new http_1.HttpClient(httpConfig);
    }
    // -----------------------------------------------------------------------
    // Video Generation
    // -----------------------------------------------------------------------
    /**
     * Submit a new video render job.
     *
     * @returns The created `RenderJob` with an initial status of `"queued"`.
     */
    async renderVideo(input) {
        const validated = renderVideoInputSchema.parse(input);
        return this.http.post("/v1/render/video", validated);
    }
    /**
     * Render one or more static frames from a composition.
     */
    async renderStatic(input) {
        const validated = renderStaticInputSchema.parse(input);
        return this.http.post("/v1/render/static", validated);
    }
    // -----------------------------------------------------------------------
    // Voice
    // -----------------------------------------------------------------------
    /**
     * Create a cloned voice from audio samples.
     */
    async cloneVoice(input) {
        const validated = voiceCloneInputSchema.parse(input);
        return this.http.post("/v1/voice/clone", validated);
    }
    /**
     * Synthesize speech from text using a specified voice.
     */
    async synthesizeSpeech(input) {
        const validated = speechSynthesisInputSchema.parse(input);
        return this.http.post("/v1/voice/synthesize", validated);
    }
    // -----------------------------------------------------------------------
    // Captions
    // -----------------------------------------------------------------------
    /**
     * Generate time-stamped captions / word-level transcription for an audio
     * file.
     */
    async generateCaptions(input) {
        const validated = captionInputSchema.parse(input);
        return this.http.post("/v1/captions/generate", validated);
    }
    // -----------------------------------------------------------------------
    // AI Providers
    // -----------------------------------------------------------------------
    /**
     * Generate video using Google Veo AI.
     */
    async generateVeo(input) {
        const validated = veoInputSchema.parse(input);
        return this.http.post("/v1/ai/veo", validated);
    }
    /**
     * Generate images using the NanoBanana model.
     */
    async generateNanoBanana(input) {
        const validated = nanoBananaInputSchema.parse(input);
        return this.http.post("/v1/ai/nanobanana", validated);
    }
    /**
     * Create a before/after comparison video.
     */
    async renderBeforeAfter(input) {
        const validated = beforeAfterInputSchema.parse(input);
        return this.http.post("/v1/render/before-after", validated);
    }
    // -----------------------------------------------------------------------
    // Job Management
    // -----------------------------------------------------------------------
    /**
     * Get the current status and details of a render job.
     */
    async getJobStatus(jobId) {
        if (!jobId)
            throw new Error("jobId is required");
        return this.http.get(`/v1/jobs/${encodeURIComponent(jobId)}`);
    }
    /**
     * Cancel a running or queued render job.
     */
    async cancelJob(jobId) {
        if (!jobId)
            throw new Error("jobId is required");
        await this.http.post(`/v1/jobs/${encodeURIComponent(jobId)}/cancel`);
    }
    /**
     * List render jobs with optional filters.
     */
    async listJobs(filters) {
        const query = {};
        if (filters?.status)
            query.status = filters.status;
        if (filters?.type)
            query.type = filters.type;
        if (filters?.limit)
            query.limit = filters.limit;
        return this.http.get("/v1/jobs", query);
    }
    /**
     * Submit a batch of render jobs atomically.
     *
     * @param jobs - Array of render job inputs (same shape as `renderVideo` input).
     * @returns An array of created `RenderJob` objects.
     */
    async submitBatch(jobs) {
        if (!jobs.length)
            throw new Error("At least one job is required");
        const validated = jobs.map((j) => renderVideoInputSchema.parse(j));
        return this.http.post("/v1/jobs/batch", {
            jobs: validated,
        });
    }
    // -----------------------------------------------------------------------
    // Templates
    // -----------------------------------------------------------------------
    /**
     * List all available composition templates.
     */
    async listTemplates() {
        return this.http.get("/v1/templates");
    }
    /**
     * Get full details of a specific template.
     */
    async getTemplate(id) {
        if (!id)
            throw new Error("template id is required");
        return this.http.get(`/v1/templates/${encodeURIComponent(id)}`);
    }
    // -----------------------------------------------------------------------
    // Health
    // -----------------------------------------------------------------------
    /**
     * Ping the API to check availability and retrieve the server version.
     */
    async healthCheck() {
        return this.http.get("/v1/health");
    }
    // -----------------------------------------------------------------------
    // Utilities exposed for advanced users
    // -----------------------------------------------------------------------
    /**
     * Access the underlying HTTP client (e.g. to inspect the circuit breaker).
     */
    getHttpClient() {
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
    async waitForJob(jobId, options) {
        const intervalMs = options?.intervalMs ?? 2_000;
        const maxWaitMs = options?.maxWaitMs ?? 300_000;
        const deadline = Date.now() + maxWaitMs;
        while (Date.now() < deadline) {
            const job = await this.getJobStatus(jobId);
            options?.onProgress?.(job);
            if (job.status === "completed" ||
                job.status === "failed" ||
                job.status === "cancelled") {
                return job;
            }
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
        throw new Error(`Job ${jobId} did not complete within ${maxWaitMs}ms`);
    }
}
exports.RemotionClient = RemotionClient;
//# sourceMappingURL=client.js.map