/**
 * Batch Job Service (RC-008)
 *
 * Provides batch submission, status tracking, and cancellation of Remotion
 * render jobs. Controls concurrency using a simple promise-pool pattern so
 * that only N jobs run simultaneously, preventing API overload.
 */
import { BatchJobRequest, BatchJobResult, RemotionServiceConfig } from "./types";
export declare class BatchJobService {
    private readonly apiUrl;
    private readonly apiKey;
    private readonly timeout;
    private readonly defaultParallelism;
    /** In-memory batch registry. */
    private readonly batches;
    constructor(config: RemotionServiceConfig, options?: {
        defaultParallelism?: number;
    });
    /**
     * Submit a batch of render jobs. Jobs are executed with controlled
     * parallelism -- only `parallelism` jobs run concurrently.
     *
     * Returns immediately with a `BatchJobResult` containing the batch ID
     * and the list of queued jobs.
     */
    submitBatch(request: BatchJobRequest): Promise<BatchJobResult>;
    /**
     * Get the current status of a batch, including the status of each
     * individual job within it.
     */
    getBatchStatus(batchId: string): Promise<BatchJobResult>;
    /**
     * Cancel all pending/rendering jobs in a batch.
     */
    cancelBatch(batchId: string): Promise<void>;
    private executeWithPool;
    private submitSingleJob;
    private getJobFromApi;
    private cancelJobOnApi;
    private notifyCallback;
}
//# sourceMappingURL=batch.d.ts.map