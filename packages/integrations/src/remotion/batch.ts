/**
 * Batch Job Service (RC-008)
 *
 * Provides batch submission, status tracking, and cancellation of Remotion
 * render jobs. Controls concurrency using a simple promise-pool pattern so
 * that only N jobs run simultaneously, preventing API overload.
 */

import { z } from "zod";
import { createHmac, randomUUID } from "node:crypto";
import {
  RenderJob,
  RenderTemplate,
  BatchJobRequest,
  BatchJobResult,
  JobCallback,
  RemotionServiceConfig,
  batchJobRequestSchema,
} from "./types";

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface BatchRecord {
  batchId: string;
  request: BatchJobRequest;
  jobs: Array<{
    jobId: string;
    status: "queued" | "rendering" | "completed" | "failed" | "cancelled";
    template: RenderTemplate;
  }>;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class BatchJobService {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly defaultParallelism: number;

  /** In-memory batch registry. */
  private readonly batches = new Map<string, BatchRecord>();

  constructor(
    config: RemotionServiceConfig,
    options?: { defaultParallelism?: number },
  ) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30_000;
    this.defaultParallelism = options?.defaultParallelism ?? 5;
  }

  /**
   * Submit a batch of render jobs. Jobs are executed with controlled
   * parallelism -- only `parallelism` jobs run concurrently.
   *
   * Returns immediately with a `BatchJobResult` containing the batch ID
   * and the list of queued jobs.
   */
  async submitBatch(request: BatchJobRequest): Promise<BatchJobResult> {
    const validated = batchJobRequestSchema.parse(request);
    const batchId = randomUUID();
    const parallelism = validated.parallelism ?? this.defaultParallelism;

    // Initialize batch record with placeholder job entries
    const batchRecord: BatchRecord = {
      batchId,
      request: validated,
      jobs: validated.jobs.map((job) => ({
        jobId: "", // Will be set when job is submitted
        status: "queued",
        template: job.template,
      })),
      createdAt: new Date().toISOString(),
    };

    this.batches.set(batchId, batchRecord);

    // Submit all jobs with concurrency control (fire-and-forget)
    this.executeWithPool(batchId, validated, parallelism).catch(() => {
      // Pool errors are tracked per-job in the batch record
    });

    return {
      batchId,
      jobs: batchRecord.jobs.map((j) => ({
        jobId: j.jobId || `pending-${randomUUID().slice(0, 8)}`,
        status: j.status,
        template: j.template,
      })),
    };
  }

  /**
   * Get the current status of a batch, including the status of each
   * individual job within it.
   */
  async getBatchStatus(batchId: string): Promise<BatchJobResult> {
    const batch = this.batches.get(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    // Refresh job statuses from the Remotion API
    const refreshPromises = batch.jobs
      .filter((j) => j.jobId && j.status !== "completed" && j.status !== "failed" && j.status !== "cancelled")
      .map(async (j) => {
        try {
          const job = await this.getJobFromApi(j.jobId);
          j.status = job.status;
        } catch {
          // If we can't reach the API, keep existing status
        }
      });

    await Promise.allSettled(refreshPromises);

    return {
      batchId: batch.batchId,
      jobs: batch.jobs.map((j) => ({
        jobId: j.jobId,
        status: j.status,
        template: j.template,
      })),
    };
  }

  /**
   * Cancel all pending/rendering jobs in a batch.
   */
  async cancelBatch(batchId: string): Promise<void> {
    const batch = this.batches.get(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    const cancellable = batch.jobs.filter(
      (j) => j.jobId && (j.status === "queued" || j.status === "rendering"),
    );

    const cancelPromises = cancellable.map(async (j) => {
      try {
        await this.cancelJobOnApi(j.jobId);
        j.status = "cancelled";
      } catch {
        // Best-effort cancellation -- log but don't fail
      }
    });

    await Promise.allSettled(cancelPromises);
  }

  // -----------------------------------------------------------------------
  // Promise pool: concurrency-limited job execution
  // -----------------------------------------------------------------------

  private async executeWithPool(
    batchId: string,
    request: BatchJobRequest,
    parallelism: number,
  ): Promise<void> {
    const batch = this.batches.get(batchId);
    if (!batch) return;

    const queue = [...request.jobs.entries()];
    const executing = new Set<Promise<void>>();

    for (const [index, jobSpec] of queue) {
      const task = (async () => {
        try {
          const renderJob = await this.submitSingleJob(jobSpec);
          batch.jobs[index].jobId = renderJob.id;
          batch.jobs[index].status = renderJob.status;

          // Notify per-job callback if registered
          if (jobSpec.callback) {
            await this.notifyCallback(jobSpec.callback, renderJob).catch(
              () => {
                // Best-effort callback delivery
              },
            );
          }
        } catch {
          batch.jobs[index].status = "failed";
        }
      })();

      executing.add(task);
      task.finally(() => executing.delete(task));

      // When pool is full, wait for one to complete
      if (executing.size >= parallelism) {
        await Promise.race(executing);
      }
    }

    // Wait for all remaining tasks
    await Promise.allSettled(executing);

    // Notify batch-level webhook if registered
    if (request.webhook) {
      const result: BatchJobResult = {
        batchId,
        jobs: batch.jobs.map((j) => ({
          jobId: j.jobId,
          status: j.status,
          template: j.template,
        })),
      };

      await this.notifyCallback(request.webhook, result).catch(() => {
        // Best-effort
      });
    }
  }

  // -----------------------------------------------------------------------
  // API helpers
  // -----------------------------------------------------------------------

  private async submitSingleJob(
    jobSpec: z.infer<typeof batchJobRequestSchema>["jobs"][number],
  ): Promise<RenderJob> {
    const body = {
      compositionId: jobSpec.template,
      inputProps: jobSpec.input,
      metadata: {
        template: jobSpec.template,
        priority: jobSpec.priority ?? 5,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.apiUrl}/v1/render/video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Remotion API error (${response.status}): ${errorBody}`,
        );
      }

      return (await response.json()) as RenderJob;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async getJobFromApi(jobId: string): Promise<RenderJob> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(
        `${this.apiUrl}/v1/jobs/${encodeURIComponent(jobId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get job ${jobId}: ${response.status}`);
      }

      return (await response.json()) as RenderJob;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async cancelJobOnApi(jobId: string): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(
        `${this.apiUrl}/v1/jobs/${encodeURIComponent(jobId)}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to cancel job ${jobId}: ${response.status}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async notifyCallback(
    callback: JobCallback,
    payload: unknown,
  ): Promise<void> {
    const body = JSON.stringify(payload);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...callback.headers,
    };

    if (callback.secret) {
      const hmac = createHmac("sha256", callback.secret);
      hmac.update(body);
      headers["x-webhook-signature"] = `sha256=${hmac.digest("hex")}`;
    }

    const response = await fetch(callback.url, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(
        `Callback delivery failed (${response.status})`,
      );
    }
  }
}
