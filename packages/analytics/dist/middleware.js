"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichWithTimestamp = enrichWithTimestamp;
exports.enrichWithSessionId = enrichWithSessionId;
exports.filterSensitiveData = filterSensitiveData;
exports.samplingMiddleware = samplingMiddleware;
exports.deduplicationMiddleware = deduplicationMiddleware;
const crypto_1 = require("crypto");
// ---------------------------------------------------------------------------
// enrichWithTimestamp
// Ensures every event has a server-side timestamp.
// ---------------------------------------------------------------------------
function enrichWithTimestamp() {
    return (event, next) => {
        if (!event.timestamp) {
            next({ ...event, timestamp: new Date().toISOString() });
        }
        else {
            next(event);
        }
    };
}
// ---------------------------------------------------------------------------
// enrichWithSessionId
// Generates a UUID-based session ID and attaches it to every event's context.
// The session ID is stable for the lifetime of the middleware instance.
// ---------------------------------------------------------------------------
function enrichWithSessionId() {
    const sessionId = (0, crypto_1.randomUUID)();
    return (event, next) => {
        const context = event.context ?? {};
        const properties = { ...event.properties, sessionId };
        next({ ...event, properties, context });
    };
}
// ---------------------------------------------------------------------------
// filterSensitiveData
// Removes specified field names from event properties (shallow).
// ---------------------------------------------------------------------------
function filterSensitiveData(fields) {
    const fieldSet = new Set(fields);
    return (event, next) => {
        const cleaned = {};
        for (const [key, value] of Object.entries(event.properties)) {
            if (!fieldSet.has(key)) {
                cleaned[key] = value;
            }
        }
        next({ ...event, properties: cleaned });
    };
}
// ---------------------------------------------------------------------------
// samplingMiddleware
// Only forwards a fraction of events (rate between 0 and 1).
// ---------------------------------------------------------------------------
function samplingMiddleware(rate) {
    if (rate < 0 || rate > 1) {
        throw new RangeError(`Sampling rate must be between 0 and 1, received ${rate}`);
    }
    return (event, next) => {
        if (Math.random() < rate) {
            next(event);
        }
        // else: event is silently dropped
    };
}
// ---------------------------------------------------------------------------
// deduplicationMiddleware
// Prevents duplicate events within a configurable time window.
// Uses a SHA-256 hash of event name + JSON-serialised properties.
// ---------------------------------------------------------------------------
function deduplicationMiddleware(windowMs) {
    const seen = new Map();
    // Periodically prune expired entries to avoid unbounded growth.
    const prune = () => {
        const now = Date.now();
        for (const [hash, ts] of seen.entries()) {
            if (now - ts > windowMs) {
                seen.delete(hash);
            }
        }
    };
    return (event, next) => {
        const raw = event.event + JSON.stringify(event.properties);
        const hash = (0, crypto_1.createHash)('sha256').update(raw).digest('hex');
        const now = Date.now();
        prune();
        const lastSeen = seen.get(hash);
        if (lastSeen !== undefined && now - lastSeen < windowMs) {
            // Duplicate within window -- drop
            return;
        }
        seen.set(hash, now);
        next(event);
    };
}
//# sourceMappingURL=middleware.js.map