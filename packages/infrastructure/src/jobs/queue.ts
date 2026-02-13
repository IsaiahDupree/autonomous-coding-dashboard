/**
 * JOB-001: Job Queue System
 *
 * In-memory priority job queue with concurrency control,
 * retry logic, and lifecycle hooks.
 */

import { Job, JobPriority, JobStatus } from '../types';

// ── Priority Weights ─────────────────────────────────────────────────────────

const PRIORITY_WEIGHT: Record<JobPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────────

let globalJobCounter = 0;

function generateJobId(): string {
  globalJobCounter += 1;
  return `job_${Date.now()}_${globalJobCounter}`;
}

// ── JobQueue ─────────────────────────────────────────────────────────────────

export class JobQueue {
  readonly name: string;

  private readonly maxConcurrency: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly onComplete?: (job: Job) => void;
  private readonly onFailed?: (job: Job) => void;

  private jobs: Map<string, Job> = new Map();
  private waiting: Job[] = [];
  private activeCount = 0;
  private handler: JobHandler | null = null;
  private paused = false;
  private draining = false;

  constructor(name: string, options: JobQueueOptions = {}) {
    this.name = name;
    this.maxConcurrency = options.maxConcurrency ?? 5;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
    this.onComplete = options.onComplete;
    this.onFailed = options.onFailed;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  async add(data: unknown, options: AddJobOptions = {}): Promise<Job> {
    const id = options.jobId ?? generateJobId();
    const now = new Date();
    const priority = options.priority ?? 'normal';
    const delay = options.delay ?? 0;

    const job: Job = {
      id,
      queue: this.name,
      data,
      status: delay > 0 ? 'delayed' : 'pending',
      priority,
      attempts: 0,
      maxAttempts: this.maxRetries,
      createdAt: now,
    };

    this.jobs.set(id, job);

    if (delay > 0) {
      setTimeout(() => {
        const j = this.jobs.get(id);
        if (j && j.status === 'delayed') {
          j.status = 'pending';
          this.enqueue(j);
          this.tick();
        }
      }, delay);
    } else {
      this.enqueue(job);
      this.tick();
    }

    return job;
  }

  process(handler: JobHandler): void {
    this.handler = handler;
    this.tick();
  }

  async getJob(id: string): Promise<Job | null> {
    return this.jobs.get(id) ?? null;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.tick();
  }

  async drain(): Promise<void> {
    this.draining = true;

    return new Promise<void>((resolve) => {
      const check = (): void => {
        if (this.waiting.length === 0 && this.activeCount === 0) {
          this.draining = false;
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  getStats(): { waiting: number; active: number; completed: number; failed: number } {
    let completed = 0;
    let failed = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'completed') completed++;
      if (job.status === 'failed') failed++;
    }
    return {
      waiting: this.waiting.length,
      active: this.activeCount,
      completed,
      failed,
    };
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private enqueue(job: Job): void {
    // Insert in sorted position (priority first, then createdAt)
    const idx = this.waiting.findIndex(
      (w) =>
        PRIORITY_WEIGHT[w.priority] > PRIORITY_WEIGHT[job.priority] ||
        (PRIORITY_WEIGHT[w.priority] === PRIORITY_WEIGHT[job.priority] &&
          w.createdAt.getTime() > job.createdAt.getTime()),
    );
    if (idx === -1) {
      this.waiting.push(job);
    } else {
      this.waiting.splice(idx, 0, job);
    }
  }

  private tick(): void {
    if (this.paused || !this.handler) return;

    while (this.activeCount < this.maxConcurrency && this.waiting.length > 0) {
      const job = this.waiting.shift()!;
      this.runJob(job);
    }
  }

  private runJob(job: Job): void {
    if (!this.handler) return;

    this.activeCount++;
    job.status = 'active';
    job.startedAt = new Date();
    job.attempts++;

    const handler = this.handler;

    Promise.resolve()
      .then(() => handler(job))
      .then((result) => {
        job.status = 'completed';
        job.completedAt = new Date();
        job.result = result;
        this.activeCount--;
        this.onComplete?.(job);
        this.tick();
      })
      .catch((err: unknown) => {
        const reason = err instanceof Error ? err.message : String(err);

        if (job.attempts < job.maxAttempts) {
          job.status = 'pending';
          job.failedReason = reason;
          setTimeout(() => {
            this.enqueue(job);
            this.tick();
          }, this.retryDelayMs * job.attempts);
        } else {
          job.status = 'failed';
          job.failedReason = reason;
          job.completedAt = new Date();
          this.onFailed?.(job);
        }

        this.activeCount--;
        this.tick();
      });
  }
}
