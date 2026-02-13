/**
 * @module queues
 * MON-006: Queue Monitoring.
 * Track job queue depths, processing rates, failure rates, and stale job detection.
 */
import { QueueStats, QueueAlert, QueueConfig } from './types';
/** Callback invoked when a queue alert is triggered. */
export type QueueAlertHandler = (alert: QueueAlert) => void;
/**
 * Queue Monitor.
 * Tracks multiple named queues and raises alerts for anomalous conditions.
 *
 * @example
 * ```ts
 * const monitor = new QueueMonitor({
 *   depthThreshold: 500,
 *   failureRateThreshold: 0.05,
 *   staleThresholdMs: 300000,
 * });
 *
 * monitor.onAlert((alert) => {
 *   console.warn(`Queue alert: ${alert.queue} - ${alert.alertType}`);
 * });
 *
 * monitor.recordProcessed('email-queue', 150);
 * monitor.recordFailed('email-queue');
 * monitor.updateDepth('email-queue', 42);
 *
 * const stats = monitor.getStats('email-queue');
 * ```
 */
export declare class QueueMonitor {
    private readonly config;
    private readonly trackers;
    private readonly alerts;
    private readonly alertHandlers;
    constructor(config?: Partial<QueueConfig>);
    /** Register an alert handler. */
    onAlert(handler: QueueAlertHandler): void;
    /** Record a successfully processed job. */
    recordProcessed(queue: string, processingTimeMs: number): void;
    /** Record a failed job. */
    recordFailed(queue: string, processingTimeMs?: number): void;
    /** Update the current depth of a queue. */
    updateDepth(queue: string, depth: number): void;
    /** Set the oldest job timestamp for stale job detection. */
    setOldestJobTimestamp(queue: string, timestamp: number): void;
    /** Get stats for a specific queue. */
    getStats(queue: string): QueueStats;
    /** Get stats for all tracked queues. */
    getAllStats(): QueueStats[];
    /** Get all alerts, optionally filtered by queue. */
    getAlerts(queue?: string): QueueAlert[];
    /** Get names of all tracked queues. */
    getTrackedQueues(): string[];
    /** Reset tracking for a specific queue. */
    resetQueue(queue: string): void;
    /** Clear all trackers and alerts. */
    clear(): void;
    private ensureTracker;
    private checkAlerts;
    private emitAlert;
}
//# sourceMappingURL=queues.d.ts.map