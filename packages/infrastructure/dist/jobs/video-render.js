"use strict";
/**
 * JOB-003: Video Render Job Processor
 *
 * Specialized processor for Remotion-based video render jobs.
 * Manages render lifecycle: validation -> render -> upload -> notify.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoRenderJobProcessor = void 0;
const queue_1 = require("./queue");
// ── Processor ────────────────────────────────────────────────────────────────
class VideoRenderJobProcessor {
    constructor(queue) {
        this.queue = queue ?? new queue_1.JobQueue('video-render', {
            maxConcurrency: 2,
            maxRetries: 3,
            retryDelayMs: 5000,
        });
        this.queue.process(this.handle.bind(this));
    }
    async submit(input) {
        return this.queue.add(input, { priority: 'high' });
    }
    getQueue() {
        return this.queue;
    }
    // ── Handler ──────────────────────────────────────────────────────────────
    async handle(job) {
        const input = job.data;
        // Step 1: Validate composition
        this.validateInput(input);
        // Step 2: Simulate render (in production, call Remotion Lambda/CLI)
        const renderStart = Date.now();
        await this.simulateRender(input);
        const durationMs = Date.now() - renderStart;
        // Step 3: Build result
        const result = {
            outputUrl: `https://cdn.example.com/renders/${job.id}.${input.outputFormat}`,
            durationMs,
            fileSizeBytes: input.durationFrames * input.resolution.width * input.resolution.height * 0.05,
            renderedAt: new Date(),
        };
        // Step 4: Notify callback if provided
        if (input.callbackUrl) {
            await this.notifyCallback(input.callbackUrl, job.id, result);
        }
        return result;
    }
    validateInput(input) {
        if (!input.compositionId) {
            throw new Error('compositionId is required');
        }
        if (input.durationFrames <= 0) {
            throw new Error('durationFrames must be positive');
        }
        if (input.fps <= 0 || input.fps > 120) {
            throw new Error('fps must be between 1 and 120');
        }
    }
    async simulateRender(_input) {
        // In production, this would invoke Remotion's renderMedia or Lambda render
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    async notifyCallback(_url, _jobId, _result) {
        // In production, POST to the callback URL
        // await fetch(url, { method: 'POST', body: JSON.stringify({ jobId, result }) });
    }
}
exports.VideoRenderJobProcessor = VideoRenderJobProcessor;
