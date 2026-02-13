"use strict";
/**
 * @module sessions
 * MON-007: Session Monitoring.
 * Active sessions, session duration tracking, and concurrent session limits.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionMonitor = void 0;
const types_1 = require("./types");
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
class SessionMonitor {
    constructor(config) {
        this.sessions = new Map();
        this.endedSessions = [];
        this.concurrentPeak = 0;
        this.limitHandlers = [];
        this.config = types_1.SessionConfigSchema.parse(config ?? {});
    }
    /** Register a handler for session limit events. */
    onLimitReached(handler) {
        this.limitHandlers.push(handler);
    }
    /** Start a new session for a user. Returns the session or null if limits are exceeded. */
    startSession(userId, metadata) {
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
        const session = types_1.SessionSchema.parse({
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
    recordActivity(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return false;
        session.lastActivityAt = new Date().toISOString();
        return true;
    }
    /** End a session. */
    endSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return null;
        const now = new Date();
        session.endedAt = now.toISOString();
        session.durationMs = now.getTime() - new Date(session.startedAt).getTime();
        this.sessions.delete(sessionId);
        this.endedSessions.push(session);
        return session;
    }
    /** Get an active session by ID. */
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    /** Get all active sessions. */
    getActiveSessions() {
        return Array.from(this.sessions.values());
    }
    /** Get active sessions for a specific user. */
    getActiveSessionsForUser(userId) {
        return Array.from(this.sessions.values()).filter((s) => s.userId === userId);
    }
    /** Expire sessions that have been inactive for longer than the timeout. */
    expireInactiveSessions() {
        const now = Date.now();
        const expired = [];
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
    getStats() {
        const allSessions = [...this.endedSessions];
        const durations = allSessions
            .filter((s) => s.durationMs !== undefined)
            .map((s) => s.durationMs);
        const avgDurationMs = durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0;
        const sessionsByUser = {};
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
    getActiveCount() {
        return this.sessions.size;
    }
    /** Clear all session data. */
    clear() {
        this.sessions.clear();
        this.endedSessions.length = 0;
        this.concurrentPeak = 0;
    }
    emitLimitEvent(event) {
        for (const handler of this.limitHandlers) {
            try {
                handler(event);
            }
            catch {
                // Ignore handler errors
            }
        }
    }
}
exports.SessionMonitor = SessionMonitor;
//# sourceMappingURL=sessions.js.map