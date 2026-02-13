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
import { JobCallback } from "./types";
export interface WebhookPayload {
    id: string;
    type: "job.completed" | "job.failed" | "job.progress";
    timestamp: string;
    payload: {
        jobId: string;
        status: string;
        progress?: number;
        outputUrl?: string;
        error?: {
            code: string;
            message: string;
        };
        metadata?: Record<string, unknown>;
    };
}
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
export declare class JobWebhookManager {
    private readonly persistence;
    private readonly maxRetries;
    constructor(options?: {
        persistence?: CallbackPersistence;
        maxRetries?: number;
    });
    /**
     * Register a callback to be invoked when the specified job emits events.
     */
    registerCallback(jobId: string, callback: JobCallback): Promise<void>;
    /**
     * Process an incoming Remotion webhook event. Verifies the signature,
     * parses the payload, and dispatches to all registered callbacks for
     * the associated job.
     *
     * @param rawPayload - The raw request body (string or Buffer).
     * @param signature  - The `x-remotion-signature` header value.
     * @param secret     - The shared webhook secret for signature verification.
     */
    processWebhook(rawPayload: string | Buffer, signature: string, secret: string): Promise<void>;
    /**
     * Retry all failed callback deliveries for a specific job.
     */
    retryFailedCallbacks(jobId: string): Promise<void>;
    /**
     * Verify HMAC-SHA256 signature using timing-safe comparison.
     */
    private verifySignature;
    /**
     * Deliver a webhook payload to a single callback endpoint.
     */
    private deliverCallback;
    /**
     * Send an HTTP POST to the callback URL with the event payload.
     */
    private sendCallback;
}
export {};
//# sourceMappingURL=webhooks.d.ts.map