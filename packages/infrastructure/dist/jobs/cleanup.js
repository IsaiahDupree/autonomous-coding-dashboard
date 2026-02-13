"use strict";
/**
 * JOB-007: Cleanup Job
 *
 * Periodic maintenance tasks: purge expired assets, rotate logs,
 * clear stale sessions, and manage temporary files.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanupJob = void 0;
const scheduler_1 = require("./scheduler");
// ── Cleanup Job ──────────────────────────────────────────────────────────────
class CleanupJob {
    constructor(scheduler) {
        this.targets = new Map();
        this.reports = [];
        this.scheduler = scheduler ?? new scheduler_1.JobScheduler();
        // Register default cleanup targets
        this.registerDefaultTargets();
    }
    /**
     * Add a cleanup target.
     */
    addTarget(target) {
        this.targets.set(target.name, target);
    }
    /**
     * Remove a cleanup target.
     */
    removeTarget(name) {
        return this.targets.delete(name);
    }
    /**
     * Get all registered targets.
     */
    getTargets() {
        return Array.from(this.targets.values());
    }
    /**
     * Run cleanup for all enabled targets.
     */
    async runAll() {
        const runAt = new Date();
        const start = Date.now();
        const results = [];
        for (const target of this.targets.values()) {
            if (!target.enabled)
                continue;
            try {
                const result = await target.handler();
                results.push(result);
            }
            catch (err) {
                results.push({
                    target: target.name,
                    itemsScanned: 0,
                    itemsRemoved: 0,
                    bytesFreed: 0,
                    durationMs: 0,
                    errors: [err instanceof Error ? err.message : String(err)],
                });
            }
        }
        const report = {
            runAt,
            targets: results,
            totalItemsRemoved: results.reduce((sum, r) => sum + r.itemsRemoved, 0),
            totalBytesFreed: results.reduce((sum, r) => sum + r.bytesFreed, 0),
            totalDurationMs: Date.now() - start,
        };
        this.reports.push(report);
        return report;
    }
    /**
     * Run cleanup for a single target by name.
     */
    async runTarget(name) {
        const target = this.targets.get(name);
        if (!target) {
            throw new Error(`Cleanup target "${name}" not found`);
        }
        return target.handler();
    }
    /**
     * Get previous cleanup reports.
     */
    getReports() {
        return [...this.reports];
    }
    /**
     * Start scheduled cleanup (runs daily by default).
     */
    start(interval = 'every 1 day') {
        this.scheduler.schedule('cleanup', interval, () => this.runAll().then(() => { }));
        this.scheduler.start();
    }
    /**
     * Stop scheduled cleanup.
     */
    stop() {
        this.scheduler.stop();
    }
    // ── Default Targets ──────────────────────────────────────────────────────
    registerDefaultTargets() {
        this.addTarget({
            name: 'expired-assets',
            description: 'Remove expired temporary render assets',
            enabled: true,
            retentionDays: 7,
            handler: async () => this.cleanExpiredAssets(7),
        });
        this.addTarget({
            name: 'old-logs',
            description: 'Rotate and purge old application logs',
            enabled: true,
            retentionDays: 30,
            handler: async () => this.cleanOldLogs(30),
        });
        this.addTarget({
            name: 'stale-sessions',
            description: 'Clear stale user sessions',
            enabled: true,
            retentionDays: 1,
            handler: async () => this.cleanStaleSessions(1),
        });
        this.addTarget({
            name: 'temp-files',
            description: 'Remove temporary upload and processing files',
            enabled: true,
            retentionDays: 1,
            handler: async () => this.cleanTempFiles(1),
        });
        this.addTarget({
            name: 'failed-jobs',
            description: 'Archive and remove old failed job records',
            enabled: true,
            retentionDays: 14,
            handler: async () => this.cleanFailedJobs(14),
        });
    }
    async cleanExpiredAssets(_retentionDays) {
        // In production: scan asset storage, check expiration dates, delete
        return {
            target: 'expired-assets',
            itemsScanned: 0,
            itemsRemoved: 0,
            bytesFreed: 0,
            durationMs: 0,
            errors: [],
        };
    }
    async cleanOldLogs(_retentionDays) {
        // In production: rotate log files, compress old ones, delete expired
        return {
            target: 'old-logs',
            itemsScanned: 0,
            itemsRemoved: 0,
            bytesFreed: 0,
            durationMs: 0,
            errors: [],
        };
    }
    async cleanStaleSessions(_retentionDays) {
        // In production: query session store, remove expired sessions
        return {
            target: 'stale-sessions',
            itemsScanned: 0,
            itemsRemoved: 0,
            bytesFreed: 0,
            durationMs: 0,
            errors: [],
        };
    }
    async cleanTempFiles(_retentionDays) {
        // In production: scan temp directories, remove old files
        return {
            target: 'temp-files',
            itemsScanned: 0,
            itemsRemoved: 0,
            bytesFreed: 0,
            durationMs: 0,
            errors: [],
        };
    }
    async cleanFailedJobs(_retentionDays) {
        // In production: query job store, archive and remove old failed jobs
        return {
            target: 'failed-jobs',
            itemsScanned: 0,
            itemsRemoved: 0,
            bytesFreed: 0,
            durationMs: 0,
            errors: [],
        };
    }
}
exports.CleanupJob = CleanupJob;
