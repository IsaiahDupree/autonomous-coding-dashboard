/**
 * JOB-002: Job Scheduler
 *
 * Simple interval-based scheduler that supports cron-like expressions
 * for recurring job execution.
 */
export interface ScheduledJob {
    name: string;
    cronExpression: string;
    intervalMs: number;
    handler: () => Promise<void>;
    lastRunAt?: Date;
    nextRunAt: Date;
    running: boolean;
}
export declare class JobScheduler {
    private schedules;
    private started;
    /**
     * Register a recurring job.
     */
    schedule(name: string, cronExpression: string, handler: () => Promise<void>): ScheduledJob;
    /**
     * Remove a scheduled job.
     */
    unschedule(name: string): boolean;
    /**
     * List all scheduled jobs.
     */
    getScheduled(): ScheduledJob[];
    /**
     * Start the scheduler (begins executing all registered jobs on their intervals).
     */
    start(): void;
    /**
     * Stop the scheduler (clears all timers).
     */
    stop(): void;
    private startEntry;
}
