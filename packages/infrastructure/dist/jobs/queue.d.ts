/**
 * JOB-001: Job Queue System
 *
 * In-memory priority job queue with concurrency control,
 * retry logic, and lifecycle hooks.
 */
import { Job, JobPriority } from '../types';
export interface JobQueueOptions {
    maxConcurrency?: number;
    maxRetries?: number;
    retryDelayMs?: number;
    onComplete?: (job: Job) => void;
    onFailed?: (job: Job) => void;
}
export interface AddJobOptions {
    priority?: JobPriority;
    delay?: number;
    jobId?: string;
}
export type JobHandler = (job: Job) => Promise<unknown>;
export declare class JobQueue {
    readonly name: string;
    private readonly maxConcurrency;
    private readonly maxRetries;
    private readonly retryDelayMs;
    private readonly onComplete?;
    private readonly onFailed?;
    private jobs;
    private waiting;
    private activeCount;
    private handler;
    private paused;
    private draining;
    constructor(name: string, options?: JobQueueOptions);
    add(data: unknown, options?: AddJobOptions): Promise<Job>;
    process(handler: JobHandler): void;
    getJob(id: string): Promise<Job | null>;
    pause(): void;
    resume(): void;
    drain(): Promise<void>;
    getStats(): {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
    };
    private enqueue;
    private tick;
    private runJob;
}
