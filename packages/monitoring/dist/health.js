"use strict";
/**
 * @module health
 * MON-003: Health Check System.
 * Component health registration, overall status computation, and HTTP health endpoint handler.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthCheckRegistry = void 0;
exports.createHealthCheck = createHealthCheck;
const types_1 = require("./types");
/** Status code mapping for HTTP responses. */
const STATUS_HTTP_CODES = {
    healthy: 200,
    degraded: 200,
    unhealthy: 503,
};
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
class HealthCheckRegistry {
    constructor(options) {
        this.checks = new Map();
        this.startTime = Date.now();
        this.version = options?.version;
    }
    /** Register a health check for a named component. */
    register(name, checkFn) {
        this.checks.set(name, checkFn);
    }
    /** Unregister a component's health check. */
    unregister(name) {
        return this.checks.delete(name);
    }
    /** Get all registered component names. */
    getRegisteredComponents() {
        return Array.from(this.checks.keys());
    }
    /** Run all health checks and produce an aggregate report. */
    async check() {
        const components = [];
        for (const [name, checkFn] of this.checks) {
            try {
                const start = Date.now();
                const result = await checkFn();
                const elapsed = Date.now() - start;
                components.push({
                    ...result,
                    name,
                    responseTimeMs: result.responseTimeMs ?? elapsed,
                    lastChecked: result.lastChecked ?? new Date().toISOString(),
                });
            }
            catch (error) {
                const errMessage = error instanceof Error ? error.message : String(error);
                components.push({
                    name,
                    status: 'unhealthy',
                    message: `Health check failed: ${errMessage}`,
                    lastChecked: new Date().toISOString(),
                });
            }
        }
        const overallStatus = this.computeOverallStatus(components);
        const report = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.startTime,
            components,
            version: this.version,
        };
        return types_1.HealthReportSchema.parse(report);
    }
    /**
     * HTTP handler function that can be used with any HTTP framework.
     * Returns an object with statusCode and body suitable for HTTP responses.
     */
    async handleHttpRequest() {
        const report = await this.check();
        return {
            statusCode: STATUS_HTTP_CODES[report.status],
            body: report,
        };
    }
    /** Compute the overall system status from individual component statuses. */
    computeOverallStatus(components) {
        if (components.length === 0)
            return 'healthy';
        const hasUnhealthy = components.some((c) => c.status === 'unhealthy');
        if (hasUnhealthy)
            return 'unhealthy';
        const hasDegraded = components.some((c) => c.status === 'degraded');
        if (hasDegraded)
            return 'degraded';
        return 'healthy';
    }
}
exports.HealthCheckRegistry = HealthCheckRegistry;
/**
 * Create a simple health check function from a ping/test function.
 * Useful for wrapping database connections, external services, etc.
 */
function createHealthCheck(name, pingFn, options) {
    const timeoutMs = options?.timeoutMs ?? 5000;
    return async () => {
        const start = Date.now();
        try {
            const result = await Promise.race([
                Promise.resolve(pingFn()),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timed out')), timeoutMs)),
            ]);
            const elapsed = Date.now() - start;
            return {
                name,
                status: result ? 'healthy' : 'unhealthy',
                lastChecked: new Date().toISOString(),
                responseTimeMs: elapsed,
            };
        }
        catch (error) {
            const elapsed = Date.now() - start;
            const errMessage = error instanceof Error ? error.message : String(error);
            return {
                name,
                status: 'unhealthy',
                message: errMessage,
                lastChecked: new Date().toISOString(),
                responseTimeMs: elapsed,
            };
        }
    };
}
//# sourceMappingURL=health.js.map