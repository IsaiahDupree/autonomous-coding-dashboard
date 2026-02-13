/**
 * JOB-007: Cleanup Job
 *
 * Periodic maintenance tasks: purge expired assets, rotate logs,
 * clear stale sessions, and manage temporary files.
 */

import { JobScheduler } from './scheduler';

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Cleanup Job ──────────────────────────────────────────────────────────────

export class CleanupJob {
  private targets: Map<string, CleanupTarget> = new Map();
  private scheduler: JobScheduler;
  private reports: CleanupReport[] = [];

  constructor(scheduler?: JobScheduler) {
    this.scheduler = scheduler ?? new JobScheduler();

    // Register default cleanup targets
    this.registerDefaultTargets();
  }

  /**
   * Add a cleanup target.
   */
  addTarget(target: CleanupTarget): void {
    this.targets.set(target.name, target);
  }

  /**
   * Remove a cleanup target.
   */
  removeTarget(name: string): boolean {
    return this.targets.delete(name);
  }

  /**
   * Get all registered targets.
   */
  getTargets(): CleanupTarget[] {
    return Array.from(this.targets.values());
  }

  /**
   * Run cleanup for all enabled targets.
   */
  async runAll(): Promise<CleanupReport> {
    const runAt = new Date();
    const start = Date.now();
    const results: CleanupResult[] = [];

    for (const target of this.targets.values()) {
      if (!target.enabled) continue;

      try {
        const result = await target.handler();
        results.push(result);
      } catch (err) {
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

    const report: CleanupReport = {
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
  async runTarget(name: string): Promise<CleanupResult> {
    const target = this.targets.get(name);
    if (!target) {
      throw new Error(`Cleanup target "${name}" not found`);
    }
    return target.handler();
  }

  /**
   * Get previous cleanup reports.
   */
  getReports(): CleanupReport[] {
    return [...this.reports];
  }

  /**
   * Start scheduled cleanup (runs daily by default).
   */
  start(interval = 'every 1 day'): void {
    this.scheduler.schedule('cleanup', interval, () => this.runAll().then(() => {}));
    this.scheduler.start();
  }

  /**
   * Stop scheduled cleanup.
   */
  stop(): void {
    this.scheduler.stop();
  }

  // ── Default Targets ──────────────────────────────────────────────────────

  private registerDefaultTargets(): void {
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

  private async cleanExpiredAssets(_retentionDays: number): Promise<CleanupResult> {
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

  private async cleanOldLogs(_retentionDays: number): Promise<CleanupResult> {
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

  private async cleanStaleSessions(_retentionDays: number): Promise<CleanupResult> {
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

  private async cleanTempFiles(_retentionDays: number): Promise<CleanupResult> {
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

  private async cleanFailedJobs(_retentionDays: number): Promise<CleanupResult> {
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
