"use strict";
/**
 * CACHE-002: Session Cache
 *
 * Specialized cache for user session data with configurable
 * TTL, sliding expiration, and session metadata tracking.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionCache = void 0;
const cache_1 = require("./cache");
// ── SessionCache ─────────────────────────────────────────────────────────────
class SessionCache {
    constructor(options = {}) {
        this.ttlMs = options.ttlMs ?? 3600000; // 1 hour default
        this.slidingExpiration = options.slidingExpiration ?? true;
        this.cache = new cache_1.CacheManager({
            defaultTtlMs: this.ttlMs,
            maxSize: options.maxSessions ?? 10000,
            prefix: 'session',
        });
    }
    /**
     * Create a new session.
     */
    create(sessionId, userId, data) {
        const now = new Date();
        const session = {
            userId,
            email: data?.email,
            roles: data?.roles ?? [],
            metadata: data?.metadata ?? {},
            createdAt: now,
            lastAccessedAt: now,
        };
        this.cache.set(sessionId, session, this.ttlMs);
        return session;
    }
    /**
     * Get a session. Updates lastAccessedAt and refreshes TTL
     * if sliding expiration is enabled.
     */
    get(sessionId) {
        const session = this.cache.get(sessionId);
        if (!session)
            return null;
        session.lastAccessedAt = new Date();
        if (this.slidingExpiration) {
            // Re-set to refresh TTL
            this.cache.set(sessionId, session, this.ttlMs);
        }
        return session;
    }
    /**
     * Update session metadata.
     */
    update(sessionId, updates) {
        const session = this.get(sessionId);
        if (!session)
            return null;
        if (updates.email !== undefined)
            session.email = updates.email;
        if (updates.roles !== undefined)
            session.roles = updates.roles;
        if (updates.metadata !== undefined) {
            session.metadata = { ...session.metadata, ...updates.metadata };
        }
        this.cache.set(sessionId, session, this.ttlMs);
        return session;
    }
    /**
     * Destroy a session.
     */
    destroy(sessionId) {
        return this.cache.delete(sessionId);
    }
    /**
     * Check if a session exists and is valid.
     */
    exists(sessionId) {
        return this.cache.has(sessionId);
    }
    /**
     * Get cache stats.
     */
    getStats() {
        return this.cache.getStats();
    }
    /**
     * Clear all sessions.
     */
    clear() {
        this.cache.clear();
    }
}
exports.SessionCache = SessionCache;
