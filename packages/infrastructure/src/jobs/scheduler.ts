/**
 * JOB-002: Job Scheduler
 *
 * Simple interval-based scheduler that supports cron-like expressions
 * for recurring job execution.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ScheduledJob {
  name: string;
  cronExpression: string;
  intervalMs: number;
  handler: () => Promise<void>;
  lastRunAt?: Date;
  nextRunAt: Date;
  running: boolean;
}

interface ScheduleEntry {
  job: ScheduledJob;
  timerId: ReturnType<typeof setInterval> | null;
}

// ── Cron Parser ──────────────────────────────────────────────────────────────

/**
 * Parses simple cron/interval expressions into milliseconds.
 *
 * Supported formats:
 *   "every 5 minutes"  -> 5 * 60_000
 *   "every 2 hours"    -> 2 * 3_600_000
 *   "every 1 day"      -> 86_400_000
 *   "* /5 * * * *"     -> every 5 minutes (standard cron shorthand)
 *   Raw number string  -> treated as ms
 */
function parseCronExpression(expr: string): number {
  // "every N unit" pattern
  const intervalMatch = expr.match(
    /^every\s+(\d+)\s+(second|minute|hour|day|week)s?$/i,
  );
  if (intervalMatch) {
    const value = parseInt(intervalMatch[1], 10);
    const unit = intervalMatch[2].toLowerCase();
    const multipliers: Record<string, number> = {
      second: 1_000,
      minute: 60_000,
      hour: 3_600_000,
      day: 86_400_000,
      week: 604_800_000,
    };
    return value * (multipliers[unit] ?? 60_000);
  }

  // Simple cron shorthand: */N in minutes field
  const cronMinMatch = expr.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
  if (cronMinMatch) {
    return parseInt(cronMinMatch[1], 10) * 60_000;
  }

  // Raw number (milliseconds)
  const raw = parseInt(expr, 10);
  if (!isNaN(raw) && raw > 0) {
    return raw;
  }

  // Default: 1 hour
  return 3_600_000;
}

// ── JobScheduler ─────────────────────────────────────────────────────────────

export class JobScheduler {
  private schedules: Map<string, ScheduleEntry> = new Map();
  private started = false;

  /**
   * Register a recurring job.
   */
  schedule(
    name: string,
    cronExpression: string,
    handler: () => Promise<void>,
  ): ScheduledJob {
    if (this.schedules.has(name)) {
      this.unschedule(name);
    }

    const intervalMs = parseCronExpression(cronExpression);
    const now = new Date();

    const job: ScheduledJob = {
      name,
      cronExpression,
      intervalMs,
      handler,
      nextRunAt: new Date(now.getTime() + intervalMs),
      running: false,
    };

    const entry: ScheduleEntry = { job, timerId: null };
    this.schedules.set(name, entry);

    if (this.started) {
      this.startEntry(entry);
    }

    return job;
  }

  /**
   * Remove a scheduled job.
   */
  unschedule(name: string): boolean {
    const entry = this.schedules.get(name);
    if (!entry) return false;

    if (entry.timerId !== null) {
      clearInterval(entry.timerId);
    }
    this.schedules.delete(name);
    return true;
  }

  /**
   * List all scheduled jobs.
   */
  getScheduled(): ScheduledJob[] {
    return Array.from(this.schedules.values()).map((e) => e.job);
  }

  /**
   * Start the scheduler (begins executing all registered jobs on their intervals).
   */
  start(): void {
    if (this.started) return;
    this.started = true;

    for (const entry of this.schedules.values()) {
      this.startEntry(entry);
    }
  }

  /**
   * Stop the scheduler (clears all timers).
   */
  stop(): void {
    this.started = false;
    for (const entry of this.schedules.values()) {
      if (entry.timerId !== null) {
        clearInterval(entry.timerId);
        entry.timerId = null;
      }
    }
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private startEntry(entry: ScheduleEntry): void {
    const { job } = entry;

    entry.timerId = setInterval(() => {
      if (job.running) return; // skip if previous run hasn't finished

      job.running = true;
      job.lastRunAt = new Date();
      job.nextRunAt = new Date(Date.now() + job.intervalMs);

      job
        .handler()
        .catch(() => {
          /* swallow – individual job should handle its own errors */
        })
        .finally(() => {
          job.running = false;
        });
    }, job.intervalMs);
  }
}
