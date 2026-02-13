"use strict";
/**
 * @module queues
 * MON-006: Queue Monitoring.
 * Track job queue depths, processing rates, failure rates, and stale job detection.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueMonitor = void 0;
const types_1 = require("./types");
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
class QueueMonitor {
    constructor(config) {
        this.trackers = new Map();
        this.alerts = [];
        this.alertHandlers = [];
        this.config = types_1.QueueConfigSchema.parse(config ?? {});
    }
    /** Register an alert handler. */
    onAlert(handler) {
        this.alertHandlers.push(handler);
    }
    /** Record a successfully processed job. */
    recordProcessed(queue, processingTimeMs) {
        const tracker = this.ensureTracker(queue);
        tracker.processedCount++;
        tracker.processingTimes.push(processingTimeMs);
        // Keep a rolling window of processing times (last 1000)
        if (tracker.processingTimes.length > 1000) {
            tracker.processingTimes.shift();
        }
        this.checkAlerts(queue);
    }
    /** Record a failed job. */
    recordFailed(queue, processingTimeMs) {
        const tracker = this.ensureTracker(queue);
        tracker.failedCount++;
        if (processingTimeMs !== undefined) {
            tracker.processingTimes.push(processingTimeMs);
            if (tracker.processingTimes.length > 1000) {
                tracker.processingTimes.shift();
            }
        }
        this.checkAlerts(queue);
    }
    /** Update the current depth of a queue. */
    updateDepth(queue, depth) {
        const tracker = this.ensureTracker(queue);
        tracker.depth = depth;
        this.checkAlerts(queue);
    }
    /** Set the oldest job timestamp for stale job detection. */
    setOldestJobTimestamp(queue, timestamp) {
        const tracker = this.ensureTracker(queue);
        tracker.oldestJobTimestamp = timestamp;
        this.checkAlerts(queue);
    }
    /** Get stats for a specific queue. */
    getStats(queue) {
        const tracker = this.ensureTracker(queue);
        const elapsedSeconds = (Date.now() - tracker.windowStartTime) / 1000;
        const totalProcessed = tracker.processedCount + tracker.failedCount;
        const processingRate = elapsedSeconds > 0 ? tracker.processedCount / elapsedSeconds : 0;
        const failureRate = elapsedSeconds > 0 ? tracker.failedCount / elapsedSeconds : 0;
        const avgProcessingTimeMs = tracker.processingTimes.length > 0
            ? tracker.processingTimes.reduce((a, b) => a + b, 0) / tracker.processingTimes.length
            : 0;
        const oldestJobAge = tracker.oldestJobTimestamp
            ? Date.now() - tracker.oldestJobTimestamp
            : undefined;
        const hasStaleJobs = oldestJobAge !== undefined && oldestJobAge > this.config.staleThresholdMs;
        return types_1.QueueStatsSchema.parse({
            name: queue,
            depth: tracker.depth,
            processingRate: Math.round(processingRate * 1000) / 1000,
            failureRate: Math.round(failureRate * 1000) / 1000,
            avgProcessingTimeMs: Math.round(avgProcessingTimeMs),
            oldestJobAge,
            staleThresholdMs: this.config.staleThresholdMs,
            hasStaleJobs,
            lastUpdated: new Date().toISOString(),
        });
    }
    /** Get stats for all tracked queues. */
    getAllStats() {
        return Array.from(this.trackers.keys()).map((q) => this.getStats(q));
    }
    /** Get all alerts, optionally filtered by queue. */
    getAlerts(queue) {
        if (!queue)
            return [...this.alerts];
        return this.alerts.filter((a) => a.queue === queue);
    }
    /** Get names of all tracked queues. */
    getTrackedQueues() {
        return Array.from(this.trackers.keys());
    }
    /** Reset tracking for a specific queue. */
    resetQueue(queue) {
        this.trackers.delete(queue);
    }
    /** Clear all trackers and alerts. */
    clear() {
        this.trackers.clear();
        this.alerts.length = 0;
    }
    ensureTracker(queue) {
        let tracker = this.trackers.get(queue);
        if (!tracker) {
            tracker = {
                processedCount: 0,
                failedCount: 0,
                processingTimes: [],
                windowStartTime: Date.now(),
                depth: 0,
            };
            this.trackers.set(queue, tracker);
        }
        return tracker;
    }
    checkAlerts(queue) {
        const tracker = this.trackers.get(queue);
        if (!tracker)
            return;
        // Check depth threshold
        if (tracker.depth > this.config.depthThreshold) {
            this.emitAlert({
                queue,
                alertType: 'depth_exceeded',
                message: `Queue depth ${tracker.depth} exceeds threshold ${this.config.depthThreshold}`,
                value: tracker.depth,
                threshold: this.config.depthThreshold,
                timestamp: new Date().toISOString(),
            });
        }
        // Check failure rate
        const total = tracker.processedCount + tracker.failedCount;
        if (total > 0) {
            const failureRatio = tracker.failedCount / total;
            if (failureRatio > this.config.failureRateThreshold) {
                this.emitAlert({
                    queue,
                    alertType: 'high_failure_rate',
                    message: `Failure rate ${(failureRatio * 100).toFixed(1)}% exceeds threshold ${(this.config.failureRateThreshold * 100).toFixed(1)}%`,
                    value: failureRatio,
                    threshold: this.config.failureRateThreshold,
                    timestamp: new Date().toISOString(),
                });
            }
        }
        // Check stale jobs
        if (tracker.oldestJobTimestamp) {
            const age = Date.now() - tracker.oldestJobTimestamp;
            if (age > this.config.staleThresholdMs) {
                this.emitAlert({
                    queue,
                    alertType: 'stale_jobs',
                    message: `Oldest job age ${age}ms exceeds stale threshold ${this.config.staleThresholdMs}ms`,
                    value: age,
                    threshold: this.config.staleThresholdMs,
                    timestamp: new Date().toISOString(),
                });
            }
        }
        // Check processing time
        if (tracker.processingTimes.length > 0) {
            const avg = tracker.processingTimes.reduce((a, b) => a + b, 0) / tracker.processingTimes.length;
            if (avg > this.config.processingTimeThresholdMs) {
                this.emitAlert({
                    queue,
                    alertType: 'processing_slow',
                    message: `Average processing time ${avg.toFixed(0)}ms exceeds threshold ${this.config.processingTimeThresholdMs}ms`,
                    value: avg,
                    threshold: this.config.processingTimeThresholdMs,
                    timestamp: new Date().toISOString(),
                });
            }
        }
    }
    emitAlert(alert) {
        this.alerts.push(alert);
        for (const handler of this.alertHandlers) {
            try {
                handler(alert);
            }
            catch {
                // Ignore handler errors
            }
        }
    }
}
exports.QueueMonitor = QueueMonitor;
//# sourceMappingURL=queues.js.map