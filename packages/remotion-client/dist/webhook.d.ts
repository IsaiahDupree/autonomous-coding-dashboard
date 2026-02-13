/**
 * Webhook utilities for the Remotion API.
 *
 * Provides:
 *  - HMAC-SHA256 signature verification.
 *  - Typed webhook event parsing.
 *  - An enum of all known webhook event types.
 */
import { z } from "zod";
export declare enum WebhookEventType {
    /** A render job completed successfully. */
    JobCompleted = "job.completed",
    /** A render job failed. */
    JobFailed = "job.failed",
    /** Periodic progress update for a running job. */
    JobProgress = "job.progress"
}
declare const jobCompletedPayloadSchema: z.ZodObject<{
    jobId: z.ZodString;
    status: z.ZodLiteral<"completed">;
    outputUrl: z.ZodString;
    durationMs: z.ZodNumber;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status: "completed";
    durationMs: number;
    jobId: string;
    outputUrl: string;
    metadata?: Record<string, unknown> | undefined;
}, {
    status: "completed";
    durationMs: number;
    jobId: string;
    outputUrl: string;
    metadata?: Record<string, unknown> | undefined;
}>;
declare const jobFailedPayloadSchema: z.ZodObject<{
    jobId: z.ZodString;
    status: z.ZodLiteral<"failed">;
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: string;
        code: string;
    }, {
        message: string;
        code: string;
    }>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status: "failed";
    error: {
        message: string;
        code: string;
    };
    jobId: string;
    metadata?: Record<string, unknown> | undefined;
}, {
    status: "failed";
    error: {
        message: string;
        code: string;
    };
    jobId: string;
    metadata?: Record<string, unknown> | undefined;
}>;
declare const jobProgressPayloadSchema: z.ZodObject<{
    jobId: z.ZodString;
    status: z.ZodLiteral<"progress">;
    progress: z.ZodNumber;
    currentStep: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status: "progress";
    jobId: string;
    progress: number;
    metadata?: Record<string, unknown> | undefined;
    currentStep?: string | undefined;
}, {
    status: "progress";
    jobId: string;
    progress: number;
    metadata?: Record<string, unknown> | undefined;
    currentStep?: string | undefined;
}>;
declare const webhookEventSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodNativeEnum<typeof WebhookEventType>;
    timestamp: z.ZodString;
    payload: z.ZodUnion<[z.ZodObject<{
        jobId: z.ZodString;
        status: z.ZodLiteral<"completed">;
        outputUrl: z.ZodString;
        durationMs: z.ZodNumber;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        status: "completed";
        durationMs: number;
        jobId: string;
        outputUrl: string;
        metadata?: Record<string, unknown> | undefined;
    }, {
        status: "completed";
        durationMs: number;
        jobId: string;
        outputUrl: string;
        metadata?: Record<string, unknown> | undefined;
    }>, z.ZodObject<{
        jobId: z.ZodString;
        status: z.ZodLiteral<"failed">;
        error: z.ZodObject<{
            code: z.ZodString;
            message: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            message: string;
            code: string;
        }, {
            message: string;
            code: string;
        }>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        status: "failed";
        error: {
            message: string;
            code: string;
        };
        jobId: string;
        metadata?: Record<string, unknown> | undefined;
    }, {
        status: "failed";
        error: {
            message: string;
            code: string;
        };
        jobId: string;
        metadata?: Record<string, unknown> | undefined;
    }>, z.ZodObject<{
        jobId: z.ZodString;
        status: z.ZodLiteral<"progress">;
        progress: z.ZodNumber;
        currentStep: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        status: "progress";
        jobId: string;
        progress: number;
        metadata?: Record<string, unknown> | undefined;
        currentStep?: string | undefined;
    }, {
        status: "progress";
        jobId: string;
        progress: number;
        metadata?: Record<string, unknown> | undefined;
        currentStep?: string | undefined;
    }>]>;
}, "strip", z.ZodTypeAny, {
    type: WebhookEventType;
    id: string;
    timestamp: string;
    payload: {
        status: "completed";
        durationMs: number;
        jobId: string;
        outputUrl: string;
        metadata?: Record<string, unknown> | undefined;
    } | {
        status: "failed";
        error: {
            message: string;
            code: string;
        };
        jobId: string;
        metadata?: Record<string, unknown> | undefined;
    } | {
        status: "progress";
        jobId: string;
        progress: number;
        metadata?: Record<string, unknown> | undefined;
        currentStep?: string | undefined;
    };
}, {
    type: WebhookEventType;
    id: string;
    timestamp: string;
    payload: {
        status: "completed";
        durationMs: number;
        jobId: string;
        outputUrl: string;
        metadata?: Record<string, unknown> | undefined;
    } | {
        status: "failed";
        error: {
            message: string;
            code: string;
        };
        jobId: string;
        metadata?: Record<string, unknown> | undefined;
    } | {
        status: "progress";
        jobId: string;
        progress: number;
        metadata?: Record<string, unknown> | undefined;
        currentStep?: string | undefined;
    };
}>;
export type JobCompletedPayload = z.infer<typeof jobCompletedPayloadSchema>;
export type JobFailedPayload = z.infer<typeof jobFailedPayloadSchema>;
export type JobProgressPayload = z.infer<typeof jobProgressPayloadSchema>;
export type WebhookEvent = z.infer<typeof webhookEventSchema>;
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
export type TypedWebhookEvent = JobCompletedEvent | JobFailedEvent | JobProgressEvent;
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
export declare function verifyWebhookSignature(payload: string | Buffer, signature: string, secret: string): boolean;
/**
 * Parse and validate an incoming webhook event payload.
 *
 * @param payload - The parsed JSON body of the webhook request (object),
 *                  or a raw JSON string.
 * @returns A fully-typed `WebhookEvent`.
 * @throws `z.ZodError` if the payload does not match the expected schema.
 */
export declare function parseWebhookEvent(payload: unknown | string): TypedWebhookEvent;
/**
 * Safely attempt to parse a webhook event. Returns `null` instead of throwing
 * when validation fails.
 */
export declare function safeParseWebhookEvent(payload: unknown | string): TypedWebhookEvent | null;
export {};
//# sourceMappingURL=webhook.d.ts.map