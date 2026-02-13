/**
 * @module sessions
 * MON-007: Session Monitoring.
 * Active sessions, session duration tracking, and concurrent session limits.
 */
import { Session, SessionStats, SessionConfig } from './types';
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
export declare class SessionMonitor {
    private readonly config;
    private readonly sessions;
    private readonly endedSessions;
    private concurrentPeak;
    private readonly limitHandlers;
    constructor(config?: Partial<SessionConfig>);
    /** Register a handler for session limit events. */
    onLimitReached(handler: SessionLimitHandler): void;
    /** Start a new session for a user. Returns the session or null if limits are exceeded. */
    startSession(userId: string, metadata?: Record<string, unknown>): Session | null;
    /** Record activity on a session (updates lastActivityAt). */
    recordActivity(sessionId: string): boolean;
    /** End a session. */
    endSession(sessionId: string): Session | null;
    /** Get an active session by ID. */
    getSession(sessionId: string): Session | undefined;
    /** Get all active sessions. */
    getActiveSessions(): Session[];
    /** Get active sessions for a specific user. */
    getActiveSessionsForUser(userId: string): Session[];
    /** Expire sessions that have been inactive for longer than the timeout. */
    expireInactiveSessions(): Session[];
    /** Get session statistics. */
    getStats(): SessionStats;
    /** Get the number of active sessions. */
    getActiveCount(): number;
    /** Clear all session data. */
    clear(): void;
    private emitLimitEvent;
}
//# sourceMappingURL=sessions.d.ts.map