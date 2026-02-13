/**
 * Job Webhook Manager (RC-007)
 *
 * Manages job status webhook callbacks for Remotion render jobs. When a job
 * completes, fails, or reports progress, the webhook manager dispatches
 * notifications to all registered callback URLs.
 *
 * Features:
 *  - HMAC-SHA256 signature verification for incoming Remotion webhooks
 *  - Callback registration per job ID
 *  - Automatic retry for failed callback deliveries
 *  - Pluggable persistence interface (defaults to in-memory storage)
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { JobCallback, jobCallbackSchema } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WebhookPayload {
  id: string;
  type: "job.completed" | "job.failed" | "job.progress";
  timestamp: string;
  payload: {
    jobId: string;
    status: string;
    progress?: number;
    outputUrl?: string;
    error?: { code: string; message: string };
    metadata?: Record<string, unknown>;
  };
}

const webhookPayloadSchema = z.object({
  id: z.string(),
  type: z.enum(["job.completed", "job.failed", "job.progress"]),
  timestamp: z.string(),
  payload: z.object({
    jobId: z.string(),
    status: z.string(),
    progress: z.number().optional(),
    outputUrl: z.string().optional(),
    error: z
      .object({ code: z.string(), message: z.string() })
      .optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

interface CallbackRecord {
  jobId: string;
  callback: JobCallback;
  failedAttempts: number;
  lastAttemptAt?: string;
  lastError?: string;
}

/**
 * Persistence interface for callback storage. Implement this to use a
 * database or external store instead of the default in-memory map.
 */
export interface CallbackPersistence {
  get(jobId: string): Promise<CallbackRecord[]>;
  set(jobId: string, records: CallbackRecord[]): Promise<void>;
  delete(jobId: string): Promise<void>;
  getAll(): Promise<Map<string, CallbackRecord[]>>;
}

// ---------------------------------------------------------------------------
// Default in-memory persistence
// ---------------------------------------------------------------------------

class InMemoryCallbackPersistence implements CallbackPersistence {
  private store = new Map<string, CallbackRecord[]>();

  async get(jobId: string): Promise<CallbackRecord[]> {
    return this.store.get(jobId) ?? [];
  }

  async set(jobId: string, records: CallbackRecord[]): Promise<void> {
    this.store.set(jobId, records);
  }

  async delete(jobId: string): Promise<void> {
    this.store.delete(jobId);
  }

  async getAll(): Promise<Map<string, CallbackRecord[]>> {
    return new Map(this.store);
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class JobWebhookManager {
  private readonly persistence: CallbackPersistence;
  private readonly maxRetries: number;

  constructor(options?: {
    persistence?: CallbackPersistence;
    maxRetries?: number;
  }) {
    this.persistence = options?.persistence ?? new InMemoryCallbackPersistence();
    this.maxRetries = options?.maxRetries ?? 3;
  }

  /**
   * Register a callback to be invoked when the specified job emits events.
   */
  async registerCallback(jobId: string, callback: JobCallback): Promise<void> {
    const validated = jobCallbackSchema.parse(callback);
    const existing = await this.persistence.get(jobId);

    existing.push({
      jobId,
      callback: validated,
      failedAttempts: 0,
    });

    await this.persistence.set(jobId, existing);
  }

  /**
   * Process an incoming Remotion webhook event. Verifies the signature,
   * parses the payload, and dispatches to all registered callbacks for
   * the associated job.
   *
   * @param rawPayload - The raw request body (string or Buffer).
   * @param signature  - The `x-remotion-signature` header value.
   * @param secret     - The shared webhook secret for signature verification.
   */
  async processWebhook(
    rawPayload: string | Buffer,
    signature: string,
    secret: string,
  ): Promise<void> {
    // Verify signature
    if (!this.verifySignature(rawPayload, signature, secret)) {
      throw new Error("Invalid webhook signature");
    }

    // Parse payload
    const body =
      typeof rawPayload === "string"
        ? rawPayload
        : rawPayload.toString("utf-8");
    const parsed = webhookPayloadSchema.parse(JSON.parse(body));

    const jobId = parsed.payload.jobId;
    const records = await this.persistence.get(jobId);

    if (records.length === 0) {
      return; // No callbacks registered for this job
    }

    // Dispatch to all matching callbacks
    const deliveryPromises = records
      .filter((record) =>
        record.callback.events.includes(parsed.type),
      )
      .map((record) => this.deliverCallback(record, parsed));

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Retry all failed callback deliveries for a specific job.
   */
  async retryFailedCallbacks(jobId: string): Promise<void> {
    const records = await this.persistence.get(jobId);
    const failed = records.filter(
      (r) => r.failedAttempts > 0 && r.failedAttempts < this.maxRetries,
    );

    if (failed.length === 0) {
      return;
    }

    // Re-attempt delivery with a synthetic retry event
    const retryPromises = failed.map(async (record) => {
      try {
        await this.sendCallback(record.callback, {
          event: "retry",
          jobId,
          attempt: record.failedAttempts + 1,
          lastError: record.lastError,
        });

        // Reset failure count on success
        record.failedAttempts = 0;
        record.lastError = undefined;
      } catch (err) {
        record.failedAttempts += 1;
        record.lastAttemptAt = new Date().toISOString();
        record.lastError =
          err instanceof Error ? err.message : String(err);
      }
    });

    await Promise.allSettled(retryPromises);
    await this.persistence.set(jobId, records);
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Verify HMAC-SHA256 signature using timing-safe comparison.
   */
  private verifySignature(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): boolean {
    if (!payload || !signature || !secret) {
      return false;
    }

    try {
      const hmac = createHmac("sha256", secret);
      hmac.update(
        typeof payload === "string" ? payload : payload.toString("utf-8"),
      );
      const expected = `sha256=${hmac.digest("hex")}`;

      const sigBuf = Buffer.from(signature, "utf-8");
      const expBuf = Buffer.from(expected, "utf-8");

      if (sigBuf.length !== expBuf.length) {
        return false;
      }

      return timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  }

  /**
   * Deliver a webhook payload to a single callback endpoint.
   */
  private async deliverCallback(
    record: CallbackRecord,
    event: WebhookPayload,
  ): Promise<void> {
    try {
      await this.sendCallback(record.callback, event);
      // Reset on success
      record.failedAttempts = 0;
      record.lastError = undefined;
    } catch (err) {
      record.failedAttempts += 1;
      record.lastAttemptAt = new Date().toISOString();
      record.lastError =
        err instanceof Error ? err.message : String(err);
    }

    // Persist updated state
    const records = await this.persistence.get(record.jobId);
    const index = records.findIndex(
      (r) => r.callback.url === record.callback.url,
    );
    if (index >= 0) {
      records[index] = record;
      await this.persistence.set(record.jobId, records);
    }
  }

  /**
   * Send an HTTP POST to the callback URL with the event payload.
   */
  private async sendCallback(
    callback: JobCallback,
    payload: unknown,
  ): Promise<void> {
    const body = JSON.stringify(payload);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...callback.headers,
    };

    // If a shared secret is configured, sign the payload
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
      const errorBody = await response.text();
      throw new Error(
        `Callback delivery failed (${response.status}): ${errorBody}`,
      );
    }
  }
}
