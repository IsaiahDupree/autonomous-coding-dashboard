/**
 * @module sessions
 * MON-007: Session Monitoring.
 * Active sessions, session duration tracking, and concurrent session limits.
 */

import {
  Session,
  SessionSchema,
  SessionStats,
  SessionConfig,
  SessionConfigSchema,
} from './types';

/** Callback invoked on session limit events. */
export type SessionLimitHandler = (event: {
  type: 'max_concurrent' | 'max_per_user';
  userId: string;
  currentCount: number;
  limit: number;
}) => void;

/**
 * Session Monitor.
 * Tracks active sessions, enforces concurrent limits, and provides session statistics.
 *
 * @example
 * ```ts
 * const monitor = new SessionMonitor({
 *   maxConcurrentSessions: 100,
 *   maxSessionsPerUser: 3,
 *   sessionTimeoutMs: 3600000,
 * });
 *
 * const session = monitor.startSession('user-123');
 * monitor.recordActivity(session.id);
 * const stats = monitor.getStats();
 * monitor.endSession(session.id);
 * ```
 */
export class SessionMonitor {
  private readonly config: SessionConfig;
  private readonly sessions: Map<string, Session> = new Map();
  private readonly endedSessions: Session[] = [];
  private concurrentPeak: number = 0;
  private readonly limitHandlers: SessionLimitHandler[] = [];

  constructor(config?: Partial<SessionConfig>) {
    this.config = SessionConfigSchema.parse(config ?? {});
  }

  /** Register a handler for session limit events. */
  onLimitReached(handler: SessionLimitHandler): void {
    this.limitHandlers.push(handler);
  }

  /** Start a new session for a user. Returns the session or null if limits are exceeded. */
  startSession(
    userId: string,
    metadata?: Record<string, unknown>
  ): Session | null {
    // Check concurrent session limit
    if (this.sessions.size >= this.config.maxConcurrentSessions) {
      this.emitLimitEvent({
        type: 'max_concurrent',
        userId,
        currentCount: this.sessions.size,
        limit: this.config.maxConcurrentSessions,
      });
      return null;
    }

    // Check per-user session limit
    const userSessionCount = this.getActiveSessionsForUser(userId).length;
    if (userSessionCount >= this.config.maxSessionsPerUser) {
      this.emitLimitEvent({
        type: 'max_per_user',
        userId,
        currentCount: userSessionCount,
        limit: this.config.maxSessionsPerUser,
      });
      return null;
    }

    const now = new Date().toISOString();
    const session: Session = SessionSchema.parse({
      id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      startedAt: now,
      lastActivityAt: now,
      metadata,
    });

    this.sessions.set(session.id, session);

    // Track peak
    if (this.sessions.size > this.concurrentPeak) {
      this.concurrentPeak = this.sessions.size;
    }

    return session;
  }

  /** Record activity on a session (updates lastActivityAt). */
  recordActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.lastActivityAt = new Date().toISOString();
    return true;
  }

  /** End a session. */
  endSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const now = new Date();
    session.endedAt = now.toISOString();
    session.durationMs = now.getTime() - new Date(session.startedAt).getTime();

    this.sessions.delete(sessionId);
    this.endedSessions.push(session);

    return session;
  }

  /** Get an active session by ID. */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /** Get all active sessions. */
  getActiveSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /** Get active sessions for a specific user. */
  getActiveSessionsForUser(userId: string): Session[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.userId === userId
    );
  }

  /** Expire sessions that have been inactive for longer than the timeout. */
  expireInactiveSessions(): Session[] {
    const now = Date.now();
    const expired: Session[] = [];

    for (const [id, session] of this.sessions) {
      const lastActivity = new Date(session.lastActivityAt).getTime();
      if (now - lastActivity > this.config.sessionTimeoutMs) {
        session.endedAt = new Date().toISOString();
        session.durationMs = now - new Date(session.startedAt).getTime();
        this.sessions.delete(id);
        this.endedSessions.push(session);
        expired.push(session);
      }
    }

    return expired;
  }

  /** Get session statistics. */
  getStats(): SessionStats {
    const allSessions = [...this.endedSessions];
    const durations = allSessions
      .filter((s) => s.durationMs !== undefined)
      .map((s) => s.durationMs as number);

    const avgDurationMs =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    const sessionsByUser: Record<string, number> = {};
    for (const session of this.sessions.values()) {
      sessionsByUser[session.userId] = (sessionsByUser[session.userId] ?? 0) + 1;
    }

    return {
      activeSessions: this.sessions.size,
      totalSessions: this.sessions.size + this.endedSessions.length,
      avgDurationMs: Math.round(avgDurationMs),
      concurrentPeak: this.concurrentPeak,
      sessionsByUser,
      timestamp: new Date().toISOString(),
    };
  }

  /** Get the number of active sessions. */
  getActiveCount(): number {
    return this.sessions.size;
  }

  /** Clear all session data. */
  clear(): void {
    this.sessions.clear();
    this.endedSessions.length = 0;
    this.concurrentPeak = 0;
  }

  private emitLimitEvent(event: {
    type: 'max_concurrent' | 'max_per_user';
    userId: string;
    currentCount: number;
    limit: number;
  }): void {
    for (const handler of this.limitHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }
}
