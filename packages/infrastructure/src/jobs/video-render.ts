/**
 * JOB-003: Video Render Job Processor
 *
 * Specialized processor for Remotion-based video render jobs.
 * Manages render lifecycle: validation -> render -> upload -> notify.
 */

import { Job } from '../types';
import { JobQueue, JobHandler } from './queue';

// ── Types ────────────────────────────────────────────────────────────────────

export interface VideoRenderInput {
  compositionId: string;
  inputProps: Record<string, unknown>;
  outputFormat: 'mp4' | 'webm' | 'gif';
  resolution: { width: number; height: number };
  fps: number;
  durationFrames: number;
  callbackUrl?: string;
}

export interface VideoRenderResult {
  outputUrl: string;
  durationMs: number;
  fileSizeBytes: number;
  renderedAt: Date;
}

// ── Processor ────────────────────────────────────────────────────────────────

export class VideoRenderJobProcessor {
  private queue: JobQueue;

  constructor(queue?: JobQueue) {
    this.queue = queue ?? new JobQueue('video-render', {
      maxConcurrency: 2,
      maxRetries: 3,
      retryDelayMs: 5000,
    });

    this.queue.process(this.handle.bind(this));
  }

  async submit(input: VideoRenderInput): Promise<Job> {
    return this.queue.add(input, { priority: 'high' });
  }

  getQueue(): JobQueue {
    return this.queue;
  }

  // ── Handler ──────────────────────────────────────────────────────────────

  private async handle(job: Job): Promise<VideoRenderResult> {
    const input = job.data as VideoRenderInput;

    // Step 1: Validate composition
    this.validateInput(input);

    // Step 2: Simulate render (in production, call Remotion Lambda/CLI)
    const renderStart = Date.now();
    await this.simulateRender(input);
    const durationMs = Date.now() - renderStart;

    // Step 3: Build result
    const result: VideoRenderResult = {
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

  private validateInput(input: VideoRenderInput): void {
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

  private async simulateRender(_input: VideoRenderInput): Promise<void> {
    // In production, this would invoke Remotion's renderMedia or Lambda render
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  private async notifyCallback(
    _url: string,
    _jobId: string,
    _result: VideoRenderResult,
  ): Promise<void> {
    // In production, POST to the callback URL
    // await fetch(url, { method: 'POST', body: JSON.stringify({ jobId, result }) });
  }
}
