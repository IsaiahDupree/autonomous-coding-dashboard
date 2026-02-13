/**
 * @module health
 * MON-003: Health Check System.
 * Component health registration, overall status computation, and HTTP health endpoint handler.
 */
import { ComponentHealth, HealthReport } from './types';
/** A health check function that returns the component's current status. */
export type HealthCheckFn = () => Promise<ComponentHealth> | ComponentHealth;
/**
 * Health Check Registry.
 * Register component health checks and compute the overall system status.
 *
 * @example
 * ```ts
 * const health = new HealthCheckRegistry({ version: '1.0.0' });
 *
 * health.register('database', async () => ({
 *   name: 'database',
 *   status: 'healthy',
 *   lastChecked: new Date().toISOString(),
 *   responseTimeMs: 5,
 * }));
 *
 * const report = await health.check();
 * console.log(report.status); // 'healthy'
 * ```
 */
export declare class HealthCheckRegistry {
    private readonly checks;
    private readonly startTime;
    private readonly version?;
    constructor(options?: {
        version?: string;
    });
    /** Register a health check for a named component. */
    register(name: string, checkFn: HealthCheckFn): void;
    /** Unregister a component's health check. */
    unregister(name: string): boolean;
    /** Get all registered component names. */
    getRegisteredComponents(): string[];
    /** Run all health checks and produce an aggregate report. */
    check(): Promise<HealthReport>;
    /**
     * HTTP handler function that can be used with any HTTP framework.
     * Returns an object with statusCode and body suitable for HTTP responses.
     */
    handleHttpRequest(): Promise<{
        statusCode: number;
        body: HealthReport;
    }>;
    /** Compute the overall system status from individual component statuses. */
    private computeOverallStatus;
}
/**
 * Create a simple health check function from a ping/test function.
 * Useful for wrapping database connections, external services, etc.
 */
export declare function createHealthCheck(name: string, pingFn: () => Promise<boolean> | boolean, options?: {
    timeoutMs?: number;
}): HealthCheckFn;
//# sourceMappingURL=health.d.ts.map