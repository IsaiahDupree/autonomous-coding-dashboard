"use strict";
/**
 * JOB-001: Job Queue System
 *
 * In-memory priority job queue with concurrency control,
 * retry logic, and lifecycle hooks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobQueue = void 0;
// ── Priority Weights ─────────────────────────────────────────────────────────
const PRIORITY_WEIGHT = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
};
// ── Helpers ──────────────────────────────────────────────────────────────────
let globalJobCounter = 0;
function generateJobId() {
    globalJobCounter += 1;
    return `job_${Date.now()}_${globalJobCounter}`;
}
// ── JobQueue ─────────────────────────────────────────────────────────────────
class JobQueue {
    constructor(name, options = {}) {
        this.jobs = new Map();
        this.waiting = [];
        this.activeCount = 0;
        this.handler = null;
        this.paused = false;
        this.draining = false;
        this.name = name;
        this.maxConcurrency = options.maxConcurrency ?? 5;
        this.maxRetries = options.maxRetries ?? 3;
        this.retryDelayMs = options.retryDelayMs ?? 1000;
        this.onComplete = options.onComplete;
        this.onFailed = options.onFailed;
    }
    // ── Public API ───────────────────────────────────────────────────────────
    async add(data, options = {}) {
        const id = options.jobId ?? generateJobId();
        const now = new Date();
        const priority = options.priority ?? 'normal';
        const delay = options.delay ?? 0;
        const job = {
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
        }
        else {
            this.enqueue(job);
            this.tick();
        }
        return job;
    }
    process(handler) {
        this.handler = handler;
        this.tick();
    }
    async getJob(id) {
        return this.jobs.get(id) ?? null;
    }
    pause() {
        this.paused = true;
    }
    resume() {
        this.paused = false;
        this.tick();
    }
    async drain() {
        this.draining = true;
        return new Promise((resolve) => {
            const check = () => {
                if (this.waiting.length === 0 && this.activeCount === 0) {
                    this.draining = false;
                    resolve();
                }
                else {
                    setTimeout(check, 50);
                }
            };
            check();
        });
    }
    getStats() {
        let completed = 0;
        let failed = 0;
        for (const job of this.jobs.values()) {
            if (job.status === 'completed')
                completed++;
            if (job.status === 'failed')
                failed++;
        }
        return {
            waiting: this.waiting.length,
            active: this.activeCount,
            completed,
            failed,
        };
    }
    // ── Internal ─────────────────────────────────────────────────────────────
    enqueue(job) {
        // Insert in sorted position (priority first, then createdAt)
        const idx = this.waiting.findIndex((w) => PRIORITY_WEIGHT[w.priority] > PRIORITY_WEIGHT[job.priority] ||
            (PRIORITY_WEIGHT[w.priority] === PRIORITY_WEIGHT[job.priority] &&
                w.createdAt.getTime() > job.createdAt.getTime()));
        if (idx === -1) {
            this.waiting.push(job);
        }
        else {
            this.waiting.splice(idx, 0, job);
        }
    }
    tick() {
        if (this.paused || !this.handler)
            return;
        while (this.activeCount < this.maxConcurrency && this.waiting.length > 0) {
            const job = this.waiting.shift();
            this.runJob(job);
        }
    }
    runJob(job) {
        if (!this.handler)
            return;
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
            .catch((err) => {
            const reason = err instanceof Error ? err.message : String(err);
            if (job.attempts < job.maxAttempts) {
                job.status = 'pending';
                job.failedReason = reason;
                setTimeout(() => {
                    this.enqueue(job);
                    this.tick();
                }, this.retryDelayMs * job.attempts);
            }
            else {
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
exports.JobQueue = JobQueue;
