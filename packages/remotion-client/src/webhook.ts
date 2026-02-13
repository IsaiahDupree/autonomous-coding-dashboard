/**
 * Webhook utilities for the Remotion API.
 *
 * Provides:
 *  - HMAC-SHA256 signature verification.
 *  - Typed webhook event parsing.
 *  - An enum of all known webhook event types.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Webhook event types
// ---------------------------------------------------------------------------

export enum WebhookEventType {
  /** A render job completed successfully. */
  JobCompleted = "job.completed",
  /** A render job failed. */
  JobFailed = "job.failed",
  /** Periodic progress update for a running job. */
  JobProgress = "job.progress",
}

// ---------------------------------------------------------------------------
// Zod schemas for webhook payloads
// ---------------------------------------------------------------------------

const jobCompletedPayloadSchema = z.object({
  jobId: z.string(),
  status: z.literal("completed"),
  outputUrl: z.string().url(),
  durationMs: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

const jobFailedPayloadSchema = z.object({
  jobId: z.string(),
  status: z.literal("failed"),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  metadata: z.record(z.unknown()).optional(),
});

const jobProgressPayloadSchema = z.object({
  jobId: z.string(),
  status: z.literal("progress"),
  progress: z.number().min(0).max(100),
  currentStep: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const webhookEventSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(WebhookEventType),
  timestamp: z.string().datetime(),
  payload: z.union([
    jobCompletedPayloadSchema,
    jobFailedPayloadSchema,
    jobProgressPayloadSchema,
  ]),
});

// ---------------------------------------------------------------------------
// Inferred TypeScript types from schemas
// ---------------------------------------------------------------------------

export type JobCompletedPayload = z.infer<typeof jobCompletedPayloadSchema>;
export type JobFailedPayload = z.infer<typeof jobFailedPayloadSchema>;
export type JobProgressPayload = z.infer<typeof jobProgressPayloadSchema>;
export type WebhookEvent = z.infer<typeof webhookEventSchema>;

// Discriminated union helpers for consumers.
export interface JobCompletedEvent {
  id: string;
  type: WebhookEventType.JobCompleted;
  timestamp: string;
  payload: JobCompletedPayload;
}

export interface JobFailedEvent {
  id: string;
  type: WebhookEventType.JobFailed;
  timestamp: string;
  payload: JobFailedPayload;
}

export interface JobProgressEvent {
  id: string;
  type: WebhookEventType.JobProgress;
  timestamp: string;
  payload: JobProgressPayload;
}

export type TypedWebhookEvent =
  | JobCompletedEvent
  | JobFailedEvent
  | JobProgressEvent;

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

/**
 * Verify the HMAC-SHA256 signature of an incoming webhook payload.
 *
 * The expected signature format is `sha256=<hex digest>`.
 *
 * @param payload  - The raw request body (string or Buffer).
 * @param signature - The value of the `x-remotion-signature` header.
 * @param secret   - The webhook secret shared between you and the API.
 * @returns `true` if the signature is valid, `false` otherwise.
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  if (!payload || !signature || !secret) {
    return false;
  }

  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(typeof payload === "string" ? payload : payload.toString("utf-8"));
    const expected = `sha256=${hmac.digest("hex")}`;

    // Use timing-safe comparison to prevent timing attacks.
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

// ---------------------------------------------------------------------------
// Event parsing
// ---------------------------------------------------------------------------

/**
 * Parse and validate an incoming webhook event payload.
 *
 * @param payload - The parsed JSON body of the webhook request (object),
 *                  or a raw JSON string.
 * @returns A fully-typed `WebhookEvent`.
 * @throws `z.ZodError` if the payload does not match the expected schema.
 */
export function parseWebhookEvent(
  payload: unknown | string,
): TypedWebhookEvent {
  const data =
    typeof payload === "string" ? JSON.parse(payload) : payload;
  const parsed = webhookEventSchema.parse(data);
  return parsed as TypedWebhookEvent;
}

/**
 * Safely attempt to parse a webhook event. Returns `null` instead of throwing
 * when validation fails.
 */
export function safeParseWebhookEvent(
  payload: unknown | string,
): TypedWebhookEvent | null {
  try {
    const data =
      typeof payload === "string" ? JSON.parse(payload) : payload;
    const result = webhookEventSchema.safeParse(data);
    if (result.success) {
      return result.data as TypedWebhookEvent;
    }
    return null;
  } catch {
    return null;
  }
}
