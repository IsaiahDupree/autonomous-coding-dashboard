/**
 * CACHE-002: Session Cache
 *
 * Specialized cache for user session data with configurable
 * TTL, sliding expiration, and session metadata tracking.
 */

import { CacheManager } from './cache';

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── SessionCache ─────────────────────────────────────────────────────────────

export class SessionCache {
  private cache: CacheManager;
  private ttlMs: number;
  private slidingExpiration: boolean;

  constructor(options: SessionCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 3_600_000; // 1 hour default
    this.slidingExpiration = options.slidingExpiration ?? true;

    this.cache = new CacheManager({
      defaultTtlMs: this.ttlMs,
      maxSize: options.maxSessions ?? 10_000,
      prefix: 'session',
    });
  }

  /**
   * Create a new session.
   */
  create(sessionId: string, userId: string, data?: Partial<SessionData>): SessionData {
    const now = new Date();
    const session: SessionData = {
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
  get(sessionId: string): SessionData | null {
    const session = this.cache.get<SessionData>(sessionId);
    if (!session) return null;

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
  update(sessionId: string, updates: Partial<Pick<SessionData, 'email' | 'roles' | 'metadata'>>): SessionData | null {
    const session = this.get(sessionId);
    if (!session) return null;

    if (updates.email !== undefined) session.email = updates.email;
    if (updates.roles !== undefined) session.roles = updates.roles;
    if (updates.metadata !== undefined) {
      session.metadata = { ...session.metadata, ...updates.metadata };
    }

    this.cache.set(sessionId, session, this.ttlMs);
    return session;
  }

  /**
   * Destroy a session.
   */
  destroy(sessionId: string): boolean {
    return this.cache.delete(sessionId);
  }

  /**
   * Check if a session exists and is valid.
   */
  exists(sessionId: string): boolean {
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
  clear(): void {
    this.cache.clear();
  }
}
