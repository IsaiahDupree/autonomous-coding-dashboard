/**
 * CACHE-002: Session Cache
 *
 * Specialized cache for user session data with configurable
 * TTL, sliding expiration, and session metadata tracking.
 */
export interface SessionData {
    userId: string;
    email?: string;
    roles: string[];
    metadata: Record<string, unknown>;
    createdAt: Date;
    lastAccessedAt: Date;
}
export interface SessionCacheOptions {
    ttlMs?: number;
    maxSessions?: number;
    slidingExpiration?: boolean;
}
export declare class SessionCache {
    private cache;
    private ttlMs;
    private slidingExpiration;
    constructor(options?: SessionCacheOptions);
    /**
     * Create a new session.
     */
    create(sessionId: string, userId: string, data?: Partial<SessionData>): SessionData;
    /**
     * Get a session. Updates lastAccessedAt and refreshes TTL
     * if sliding expiration is enabled.
     */
    get(sessionId: string): SessionData | null;
    /**
     * Update session metadata.
     */
    update(sessionId: string, updates: Partial<Pick<SessionData, 'email' | 'roles' | 'metadata'>>): SessionData | null;
    /**
     * Destroy a session.
     */
    destroy(sessionId: string): boolean;
    /**
     * Check if a session exists and is valid.
     */
    exists(sessionId: string): boolean;
    /**
     * Get cache stats.
     */
    getStats(): import("./cache").CacheStats;
    /**
     * Clear all sessions.
     */
    clear(): void;
}
