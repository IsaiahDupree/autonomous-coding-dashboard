import { createHash, randomUUID } from 'crypto';
import type { AnalyticsEvent } from './types';
import type { EventMiddleware } from './tracker';

// ---------------------------------------------------------------------------
// enrichWithTimestamp
// Ensures every event has a server-side timestamp.
// ---------------------------------------------------------------------------

export function enrichWithTimestamp(): EventMiddleware {
  return (event: AnalyticsEvent, next: (event: AnalyticsEvent) => void): void => {
    if (!event.timestamp) {
      next({ ...event, timestamp: new Date().toISOString() });
    } else {
      next(event);
    }
  };
}

// ---------------------------------------------------------------------------
// enrichWithSessionId
// Generates a UUID-based session ID and attaches it to every event's context.
// The session ID is stable for the lifetime of the middleware instance.
// ---------------------------------------------------------------------------

export function enrichWithSessionId(): EventMiddleware {
  const sessionId = randomUUID();

  return (event: AnalyticsEvent, next: (event: AnalyticsEvent) => void): void => {
    const context = event.context ?? {};
    const properties = { ...event.properties, sessionId };
    next({ ...event, properties, context });
  };
}

// ---------------------------------------------------------------------------
// filterSensitiveData
// Removes specified field names from event properties (shallow).
// ---------------------------------------------------------------------------

export function filterSensitiveData(fields: string[]): EventMiddleware {
  const fieldSet = new Set(fields);

  return (event: AnalyticsEvent, next: (event: AnalyticsEvent) => void): void => {
    const cleaned: Record<string, unknown> = {};
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

export function samplingMiddleware(rate: number): EventMiddleware {
  if (rate < 0 || rate > 1) {
    throw new RangeError(`Sampling rate must be between 0 and 1, received ${rate}`);
  }

  return (event: AnalyticsEvent, next: (event: AnalyticsEvent) => void): void => {
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

export function deduplicationMiddleware(windowMs: number): EventMiddleware {
  const seen = new Map<string, number>();

  // Periodically prune expired entries to avoid unbounded growth.
  const prune = (): void => {
    const now = Date.now();
    for (const [hash, ts] of seen.entries()) {
      if (now - ts > windowMs) {
        seen.delete(hash);
      }
    }
  };

  return (event: AnalyticsEvent, next: (event: AnalyticsEvent) => void): void => {
    const raw = event.event + JSON.stringify(event.properties);
    const hash = createHash('sha256').update(raw).digest('hex');
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
