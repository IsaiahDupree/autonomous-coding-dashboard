/**
 * JOB-007: Cleanup Job
 *
 * Periodic maintenance tasks: purge expired assets, rotate logs,
 * clear stale sessions, and manage temporary files.
 */
import { JobScheduler } from './scheduler';
export interface CleanupTarget {
    name: string;
    description: string;
    enabled: boolean;
    retentionDays: number;
    handler: () => Promise<CleanupResult>;
}
export interface CleanupResult {
    target: string;
    itemsScanned: number;
    itemsRemoved: number;
    bytesFreed: number;
    durationMs: number;
    errors: string[];
}
export interface CleanupReport {
    runAt: Date;
    targets: CleanupResult[];
    totalItemsRemoved: number;
    totalBytesFreed: number;
    totalDurationMs: number;
}
export declare class CleanupJob {
    private targets;
    private scheduler;
    private reports;
    constructor(scheduler?: JobScheduler);
    /**
     * Add a cleanup target.
     */
    addTarget(target: CleanupTarget): void;
    /**
     * Remove a cleanup target.
     */
    removeTarget(name: string): boolean;
    /**
     * Get all registered targets.
     */
    getTargets(): CleanupTarget[];
    /**
     * Run cleanup for all enabled targets.
     */
    runAll(): Promise<CleanupReport>;
    /**
     * Run cleanup for a single target by name.
     */
    runTarget(name: string): Promise<CleanupResult>;
    /**
     * Get previous cleanup reports.
     */
    getReports(): CleanupReport[];
    /**
     * Start scheduled cleanup (runs daily by default).
     */
    start(interval?: string): void;
    /**
     * Stop scheduled cleanup.
     */
    stop(): void;
    private registerDefaultTargets;
    private cleanExpiredAssets;
    private cleanOldLogs;
    private cleanStaleSessions;
    private cleanTempFiles;
    private cleanFailedJobs;
}
