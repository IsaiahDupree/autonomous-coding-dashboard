"use strict";
/**
 * @module rate-limits
 * MON-004: Rate Limit Monitoring.
 * Track rate limit usage across services and alert when approaching limits.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitMonitor = void 0;
const types_1 = require("./types");
/**
 * Rate Limit Monitor.
 * Tracks rate limit usage across multiple services and endpoints,
 * raises alerts when usage approaches configured thresholds.
 *
 * @example
 * ```ts
 * const monitor = new RateLimitMonitor({ alertThreshold: 0.8 });
 *
 * monitor.onAlert((alert) => {
 *   console.warn(`Rate limit warning: ${alert.service} at ${alert.usagePercent}%`);
 * });
 *
 * monitor.recordUsage({
 *   service: 'openai',
 *   limit: 10000,
 *   remaining: 1500,
 *   resetAt: new Date(Date.now() + 60000).toISOString(),
 *   usagePercent: 85,
 * });
 * ```
 */
class RateLimitMonitor {
    constructor(config) {
        this.entries = new Map();
        this.alerts = [];
        this.alertHandlers = [];
        this.config = types_1.RateLimitConfigSchema.parse(config ?? {});
    }
    /** Register an alert handler. */
    onAlert(handler) {
        this.alertHandlers.push(handler);
    }
    /** Record rate limit usage for a service/endpoint. */
    recordUsage(entry) {
        const usagePercent = entry.usagePercent ?? ((entry.limit - entry.remaining) / entry.limit) * 100;
        const key = this.makeKey(entry.service, entry.endpoint);
        const validated = types_1.RateLimitEntrySchema.parse({
            ...entry,
            usagePercent,
        });
        this.entries.set(key, validated);
        // Check if alert threshold is exceeded
        if (usagePercent / 100 >= this.config.alertThreshold) {
            this.triggerAlert(validated);
        }
        return validated;
    }
    /** Get current rate limit status for a service. */
    getStatus(service, endpoint) {
        const key = this.makeKey(service, endpoint);
        return this.entries.get(key);
    }
    /** Get all current rate limit entries. */
    getAllStatus() {
        return Array.from(this.entries.values());
    }
    /** Get entries that are above the alert threshold. */
    getCriticalServices() {
        const threshold = this.config.alertThreshold * 100;
        return Array.from(this.entries.values()).filter((e) => e.usagePercent >= threshold);
    }
    /** Get all alerts that have been triggered. */
    getAlerts(since) {
        if (!since)
            return [...this.alerts];
        const sinceTime = new Date(since).getTime();
        return this.alerts.filter((a) => new Date(a.timestamp).getTime() >= sinceTime);
    }
    /** Clear expired rate limit entries (past their reset time). */
    clearExpired() {
        const now = Date.now();
        let cleared = 0;
        for (const [key, entry] of this.entries) {
            if (new Date(entry.resetAt).getTime() <= now) {
                this.entries.delete(key);
                cleared++;
            }
        }
        return cleared;
    }
    /** Check if a service is near its rate limit. */
    isNearLimit(service, endpoint) {
        const entry = this.getStatus(service, endpoint);
        if (!entry)
            return false;
        return entry.usagePercent / 100 >= this.config.alertThreshold;
    }
    /** Get the current alert threshold (0-1). */
    getAlertThreshold() {
        return this.config.alertThreshold;
    }
    /** Clear all entries and alerts. */
    clear() {
        this.entries.clear();
        this.alerts.length = 0;
    }
    makeKey(service, endpoint) {
        return endpoint ? `${service}:${endpoint}` : service;
    }
    triggerAlert(entry) {
        const alert = {
            service: entry.service,
            endpoint: entry.endpoint,
            usagePercent: entry.usagePercent,
            limit: entry.limit,
            remaining: entry.remaining,
            threshold: this.config.alertThreshold,
            timestamp: new Date().toISOString(),
        };
        this.alerts.push(alert);
        for (const handler of this.alertHandlers) {
            try {
                handler(alert);
            }
            catch {
                // Ignore handler errors
            }
        }
    }
}
exports.RateLimitMonitor = RateLimitMonitor;
//# sourceMappingURL=rate-limits.js.map