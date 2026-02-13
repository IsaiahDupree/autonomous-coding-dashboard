import { PoolConfig, PoolFactory } from './types';
export interface PoolStats {
    total: number;
    idle: number;
    active: number;
    waiting: number;
    maxSize: number;
}
/**
 * RES-005: Generic connection pool.
 *
 * Manages a pool of reusable connections with:
 *   - Min/max pool size
 *   - FIFO waiting queue for clients when pool is exhausted
 *   - Idle timeout: connections returned to the pool are destroyed after idleTimeoutMs
 *   - Optional validation before handing out connections
 *   - Acquire timeout for waiting clients
 */
export declare class ConnectionPool<T> {
    private readonly factory;
    private readonly config;
    private readonly idle;
    private readonly active;
    private readonly waiting;
    private draining;
    private initialized;
    constructor(factory: PoolFactory<T>, config?: Partial<PoolConfig>);
    /**
     * Acquire a connection from the pool.
     * Creates a new connection if the pool has room, or waits in a FIFO queue.
     */
    acquire(): Promise<T>;
    /**
     * Return a connection to the pool.
     */
    release(conn: T): void;
    /**
     * Destroy a specific connection (remove from pool entirely).
     */
    destroy(conn: T): Promise<void>;
    /**
     * Drain the pool: reject waiting clients, close all connections, stop accepting new requests.
     */
    drain(): Promise<void>;
    /**
     * Get current pool statistics.
     */
    getStats(): PoolStats;
    private ensureMinimum;
    private destroyConnection;
    private clearIdleTimer;
}
/**
 * Helper: safely acquire a connection, run a function, and release it.
 *
 * Guarantees the connection is released (or destroyed on error) via try/finally.
 */
export declare function withConnection<T, R>(pool: ConnectionPool<T>, fn: (conn: T) => Promise<R>): Promise<R>;
//# sourceMappingURL=pool.d.ts.map