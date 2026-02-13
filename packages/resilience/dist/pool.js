"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionPool = void 0;
exports.withConnection = withConnection;
const types_1 = require("./types");
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
class ConnectionPool {
    constructor(factory, config = {}) {
        this.idle = [];
        this.active = new Set();
        this.waiting = [];
        this.draining = false;
        this.initialized = false;
        this.factory = factory;
        const parsed = types_1.PoolConfigSchema.parse(config);
        this.config = {
            min: parsed.min,
            max: parsed.max,
            acquireTimeoutMs: parsed.acquireTimeoutMs,
            idleTimeoutMs: parsed.idleTimeoutMs,
            maxWaitingClients: parsed.maxWaitingClients,
        };
    }
    /**
     * Acquire a connection from the pool.
     * Creates a new connection if the pool has room, or waits in a FIFO queue.
     */
    async acquire() {
        if (this.draining) {
            throw new Error('Pool is draining, cannot acquire new connections');
        }
        // Ensure minimum connections are created on first acquire
        if (!this.initialized) {
            await this.ensureMinimum();
            this.initialized = true;
        }
        // Try to get an idle connection
        while (this.idle.length > 0) {
            const pooled = this.idle.shift();
            this.clearIdleTimer(pooled);
            // Validate the connection if a validator is provided
            if (this.factory.validate) {
                try {
                    const valid = await this.factory.validate(pooled.connection);
                    if (!valid) {
                        await this.destroyConnection(pooled.connection);
                        continue;
                    }
                }
                catch {
                    await this.destroyConnection(pooled.connection);
                    continue;
                }
            }
            this.active.add(pooled.connection);
            return pooled.connection;
        }
        // No idle connections available - can we create a new one?
        const totalSize = this.active.size + this.idle.length;
        if (totalSize < this.config.max) {
            const conn = await this.factory.create();
            this.active.add(conn);
            return conn;
        }
        // Pool is at max capacity, wait in queue
        if (this.waiting.length >= this.config.maxWaitingClients) {
            throw new Error(`Pool waiting queue is full (${this.config.maxWaitingClients} clients waiting)`);
        }
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                const idx = this.waiting.findIndex((w) => w.resolve === resolve);
                if (idx !== -1) {
                    this.waiting.splice(idx, 1);
                }
                reject(new Error(`Acquire timeout after ${this.config.acquireTimeoutMs}ms`));
            }, this.config.acquireTimeoutMs);
            this.waiting.push({ resolve, reject, timer });
        });
    }
    /**
     * Return a connection to the pool.
     */
    release(conn) {
        if (!this.active.has(conn)) {
            return; // Connection was already released or destroyed
        }
        this.active.delete(conn);
        // If draining, destroy instead of returning to pool
        if (this.draining) {
            void this.destroyConnection(conn);
            return;
        }
        // If there are waiting clients, hand the connection directly to the next one
        if (this.waiting.length > 0) {
            const waiter = this.waiting.shift();
            clearTimeout(waiter.timer);
            this.active.add(conn);
            waiter.resolve(conn);
            return;
        }
        // Return to idle pool with a timeout
        const pooled = {
            connection: conn,
            idleTimer: null,
            createdAt: new Date(),
        };
        pooled.idleTimer = setTimeout(() => {
            const idx = this.idle.indexOf(pooled);
            if (idx !== -1) {
                this.idle.splice(idx, 1);
                void this.destroyConnection(pooled.connection);
            }
        }, this.config.idleTimeoutMs);
        this.idle.push(pooled);
    }
    /**
     * Destroy a specific connection (remove from pool entirely).
     */
    async destroy(conn) {
        this.active.delete(conn);
        // Also check idle pool
        const idx = this.idle.findIndex((p) => p.connection === conn);
        if (idx !== -1) {
            this.clearIdleTimer(this.idle[idx]);
            this.idle.splice(idx, 1);
        }
        await this.destroyConnection(conn);
    }
    /**
     * Drain the pool: reject waiting clients, close all connections, stop accepting new requests.
     */
    async drain() {
        this.draining = true;
        // Reject all waiting clients
        for (const waiter of this.waiting) {
            clearTimeout(waiter.timer);
            waiter.reject(new Error('Pool is draining'));
        }
        this.waiting.length = 0;
        // Destroy all idle connections
        for (const pooled of this.idle) {
            this.clearIdleTimer(pooled);
            await this.destroyConnection(pooled.connection);
        }
        this.idle.length = 0;
        // Destroy all active connections
        for (const conn of this.active) {
            await this.destroyConnection(conn);
        }
        this.active.clear();
    }
    /**
     * Get current pool statistics.
     */
    getStats() {
        return {
            total: this.active.size + this.idle.length,
            idle: this.idle.length,
            active: this.active.size,
            waiting: this.waiting.length,
            maxSize: this.config.max,
        };
    }
    // ── Private helpers ────────────────────────────────────────────
    async ensureMinimum() {
        const toCreate = this.config.min - (this.idle.length + this.active.size);
        for (let i = 0; i < toCreate; i++) {
            try {
                const conn = await this.factory.create();
                const pooled = {
                    connection: conn,
                    idleTimer: null,
                    createdAt: new Date(),
                };
                pooled.idleTimer = setTimeout(() => {
                    const idx = this.idle.indexOf(pooled);
                    if (idx !== -1) {
                        this.idle.splice(idx, 1);
                        void this.destroyConnection(pooled.connection);
                    }
                }, this.config.idleTimeoutMs);
                this.idle.push(pooled);
            }
            catch {
                // Best-effort: continue creating remaining minimum connections
            }
        }
    }
    async destroyConnection(conn) {
        try {
            await this.factory.destroy(conn);
        }
        catch {
            // Suppress destroy errors
        }
    }
    clearIdleTimer(pooled) {
        if (pooled.idleTimer) {
            clearTimeout(pooled.idleTimer);
            pooled.idleTimer = null;
        }
    }
}
exports.ConnectionPool = ConnectionPool;
/**
 * Helper: safely acquire a connection, run a function, and release it.
 *
 * Guarantees the connection is released (or destroyed on error) via try/finally.
 */
async function withConnection(pool, fn) {
    const conn = await pool.acquire();
    try {
        const result = await fn(conn);
        pool.release(conn);
        return result;
    }
    catch (error) {
        // On error, destroy instead of releasing (connection may be in bad state)
        await pool.destroy(conn);
        throw error;
    }
}
//# sourceMappingURL=pool.js.map