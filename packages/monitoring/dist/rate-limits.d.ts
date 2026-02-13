/**
 * @module rate-limits
 * MON-004: Rate Limit Monitoring.
 * Track rate limit usage across services and alert when approaching limits.
 */
import { RateLimitEntry, RateLimitAlert, RateLimitConfig } from './types';
/** Callback invoked when a rate limit alert is triggered. */
export type RateLimitAlertHandler = (alert: RateLimitAlert) => void;
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
export declare class RateLimitMonitor {
    private readonly config;
    private readonly entries;
    private readonly alerts;
    private readonly alertHandlers;
    constructor(config?: Partial<RateLimitConfig>);
    /** Register an alert handler. */
    onAlert(handler: RateLimitAlertHandler): void;
    /** Record rate limit usage for a service/endpoint. */
    recordUsage(entry: Omit<RateLimitEntry, 'usagePercent'> & {
        usagePercent?: number;
    }): RateLimitEntry;
    /** Get current rate limit status for a service. */
    getStatus(service: string, endpoint?: string): RateLimitEntry | undefined;
    /** Get all current rate limit entries. */
    getAllStatus(): RateLimitEntry[];
    /** Get entries that are above the alert threshold. */
    getCriticalServices(): RateLimitEntry[];
    /** Get all alerts that have been triggered. */
    getAlerts(since?: string): RateLimitAlert[];
    /** Clear expired rate limit entries (past their reset time). */
    clearExpired(): number;
    /** Check if a service is near its rate limit. */
    isNearLimit(service: string, endpoint?: string): boolean;
    /** Get the current alert threshold (0-1). */
    getAlertThreshold(): number;
    /** Clear all entries and alerts. */
    clear(): void;
    private makeKey;
    private triggerAlert;
}
//# sourceMappingURL=rate-limits.d.ts.map