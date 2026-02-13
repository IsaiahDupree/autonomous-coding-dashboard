import { randomUUID } from 'crypto';
import { DeadLetterEntry } from './types';

export interface DeadLetterQueueOptions {
  /** Maximum number of entries to keep in the queue (default: 10000). */
  maxSize?: number;
  /** Callback invoked when a new entry is added. */
  onAdd?: (entry: DeadLetterEntry) => void;
  /** Optional persistence function called after mutations. */
  persistFn?: (entries: DeadLetterEntry[]) => Promise<void>;
}

export interface DeadLetterStats {
  total: number;
  byQueue: Map<string, number>;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

/**
 * RES-003: In-memory dead letter queue with optional persistence.
 *
 * Stores failed messages that could not be processed so they can be
 * inspected, retried, or purged later.
 */
export class DeadLetterQueue {
  private entries = new Map<string, DeadLetterEntry>();
  private readonly maxSize: number;
  private readonly onAdd?: (entry: DeadLetterEntry) => void;
  private readonly persistFn?: (entries: DeadLetterEntry[]) => Promise<void>;

  constructor(options: DeadLetterQueueOptions = {}) {
    this.maxSize = options.maxSize ?? 10000;
    this.onAdd = options.onAdd;
    this.persistFn = options.persistFn;
  }

  /**
   * Add a failed item to the dead letter queue.
   */
  async add(
    originalQueue: string,
    payload: unknown,
    error: Error | { message: string; stack?: string },
    metadata?: Record<string, unknown>,
  ): Promise<DeadLetterEntry> {
    // Evict oldest if at capacity
    if (this.entries.size >= this.maxSize) {
      this.evictOldest();
    }

    const now = new Date();
    const entry: DeadLetterEntry = {
      id: randomUUID(),
      originalQueue,
      payload,
      error: {
        message: error.message,
        stack: error instanceof Error ? error.stack : error.stack,
      },
      attempts: 1,
      firstFailedAt: now,
      lastFailedAt: now,
      metadata,
    };

    this.entries.set(entry.id, entry);
    this.onAdd?.(entry);
    await this.persist();

    return entry;
  }

  /**
   * List all entries, optionally filtered by queue name.
   */
  getAll(queue?: string): DeadLetterEntry[] {
    const all = Array.from(this.entries.values());
    if (queue) {
      return all.filter((e) => e.originalQueue === queue);
    }
    return all;
  }

  /**
   * Get a specific entry by ID.
   */
  getById(id: string): DeadLetterEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Retry a dead letter entry. Removes it on success, increments attempt count on failure.
   */
  async retry(
    id: string,
    processor: (payload: unknown) => Promise<void>,
  ): Promise<boolean> {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`Dead letter entry not found: ${id}`);
    }

    try {
      await processor(entry.payload);
      this.entries.delete(id);
      await this.persist();
      return true;
    } catch (error) {
      entry.attempts++;
      entry.lastFailedAt = new Date();
      if (error instanceof Error) {
        entry.error = { message: error.message, stack: error.stack };
      }
      await this.persist();
      return false;
    }
  }

  /**
   * Retry all entries for a specific queue.
   * Returns an object with counts of succeeded and failed retries.
   */
  async retryAll(
    queue: string,
    processor: (payload: unknown) => Promise<void>,
  ): Promise<{ succeeded: number; failed: number }> {
    const entries = this.getAll(queue);
    let succeeded = 0;
    let failed = 0;

    for (const entry of entries) {
      const success = await this.retry(entry.id, processor);
      if (success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    return { succeeded, failed };
  }

  /**
   * Manually remove an entry.
   */
  async remove(id: string): Promise<boolean> {
    const deleted = this.entries.delete(id);
    if (deleted) {
      await this.persist();
    }
    return deleted;
  }

  /**
   * Bulk cleanup: remove entries matching optional queue and/or age.
   */
  async purge(queue?: string, olderThanMs?: number): Promise<number> {
    let count = 0;
    const now = Date.now();

    for (const [id, entry] of this.entries) {
      const matchesQueue = !queue || entry.originalQueue === queue;
      const matchesAge =
        !olderThanMs ||
        now - entry.lastFailedAt.getTime() > olderThanMs;

      if (matchesQueue && matchesAge) {
        this.entries.delete(id);
        count++;
      }
    }

    if (count > 0) {
      await this.persist();
    }

    return count;
  }

  /**
   * Get statistics about the dead letter queue.
   */
  getStats(): DeadLetterStats {
    const byQueue = new Map<string, number>();
    let oldestEntry: Date | null = null;
    let newestEntry: Date | null = null;

    for (const entry of this.entries.values()) {
      byQueue.set(
        entry.originalQueue,
        (byQueue.get(entry.originalQueue) ?? 0) + 1,
      );

      if (!oldestEntry || entry.firstFailedAt < oldestEntry) {
        oldestEntry = entry.firstFailedAt;
      }
      if (!newestEntry || entry.lastFailedAt > newestEntry) {
        newestEntry = entry.lastFailedAt;
      }
    }

    return {
      total: this.entries.size,
      byQueue,
      oldestEntry,
      newestEntry,
    };
  }

  // ── Private helpers ────────────────────────────────────────────

  private evictOldest(): void {
    let oldestId: string | null = null;
    let oldestTime: number = Infinity;

    for (const [id, entry] of this.entries) {
      const time = entry.firstFailedAt.getTime();
      if (time < oldestTime) {
        oldestTime = time;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.entries.delete(oldestId);
    }
  }

  private async persist(): Promise<void> {
    if (this.persistFn) {
      await this.persistFn(Array.from(this.entries.values()));
    }
  }
}
