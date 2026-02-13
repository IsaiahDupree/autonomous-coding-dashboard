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
export declare class DeadLetterQueue {
    private entries;
    private readonly maxSize;
    private readonly onAdd?;
    private readonly persistFn?;
    constructor(options?: DeadLetterQueueOptions);
    /**
     * Add a failed item to the dead letter queue.
     */
    add(originalQueue: string, payload: unknown, error: Error | {
        message: string;
        stack?: string;
    }, metadata?: Record<string, unknown>): Promise<DeadLetterEntry>;
    /**
     * List all entries, optionally filtered by queue name.
     */
    getAll(queue?: string): DeadLetterEntry[];
    /**
     * Get a specific entry by ID.
     */
    getById(id: string): DeadLetterEntry | undefined;
    /**
     * Retry a dead letter entry. Removes it on success, increments attempt count on failure.
     */
    retry(id: string, processor: (payload: unknown) => Promise<void>): Promise<boolean>;
    /**
     * Retry all entries for a specific queue.
     * Returns an object with counts of succeeded and failed retries.
     */
    retryAll(queue: string, processor: (payload: unknown) => Promise<void>): Promise<{
        succeeded: number;
        failed: number;
    }>;
    /**
     * Manually remove an entry.
     */
    remove(id: string): Promise<boolean>;
    /**
     * Bulk cleanup: remove entries matching optional queue and/or age.
     */
    purge(queue?: string, olderThanMs?: number): Promise<number>;
    /**
     * Get statistics about the dead letter queue.
     */
    getStats(): DeadLetterStats;
    private evictOldest;
    private persist;
}
//# sourceMappingURL=dead-letter.d.ts.map