/**
 * @module health
 * MON-003: Health Check System.
 * Component health registration, overall status computation, and HTTP health endpoint handler.
 */

import {
  ComponentStatus,
  ComponentHealth,
  HealthReport,
  HealthReportSchema,
} from './types';

/** A health check function that returns the component's current status. */
export type HealthCheckFn = () => Promise<ComponentHealth> | ComponentHealth;

/** Status code mapping for HTTP responses. */
const STATUS_HTTP_CODES: Record<ComponentStatus, number> = {
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
export class HealthCheckRegistry {
  private readonly checks: Map<string, HealthCheckFn> = new Map();
  private readonly startTime: number = Date.now();
  private readonly version?: string;

  constructor(options?: { version?: string }) {
    this.version = options?.version;
  }

  /** Register a health check for a named component. */
  register(name: string, checkFn: HealthCheckFn): void {
    this.checks.set(name, checkFn);
  }

  /** Unregister a component's health check. */
  unregister(name: string): boolean {
    return this.checks.delete(name);
  }

  /** Get all registered component names. */
  getRegisteredComponents(): string[] {
    return Array.from(this.checks.keys());
  }

  /** Run all health checks and produce an aggregate report. */
  async check(): Promise<HealthReport> {
    const components: ComponentHealth[] = [];

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
      } catch (error) {
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
    const report: HealthReport = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      components,
      version: this.version,
    };

    return HealthReportSchema.parse(report);
  }

  /**
   * HTTP handler function that can be used with any HTTP framework.
   * Returns an object with statusCode and body suitable for HTTP responses.
   */
  async handleHttpRequest(): Promise<{ statusCode: number; body: HealthReport }> {
    const report = await this.check();
    return {
      statusCode: STATUS_HTTP_CODES[report.status],
      body: report,
    };
  }

  /** Compute the overall system status from individual component statuses. */
  private computeOverallStatus(components: ComponentHealth[]): ComponentStatus {
    if (components.length === 0) return 'healthy';

    const hasUnhealthy = components.some((c) => c.status === 'unhealthy');
    if (hasUnhealthy) return 'unhealthy';

    const hasDegraded = components.some((c) => c.status === 'degraded');
    if (hasDegraded) return 'degraded';

    return 'healthy';
  }
}

/**
 * Create a simple health check function from a ping/test function.
 * Useful for wrapping database connections, external services, etc.
 */
export function createHealthCheck(
  name: string,
  pingFn: () => Promise<boolean> | boolean,
  options?: { timeoutMs?: number }
): HealthCheckFn {
  const timeoutMs = options?.timeoutMs ?? 5000;

  return async (): Promise<ComponentHealth> => {
    const start = Date.now();

    try {
      const result = await Promise.race([
        Promise.resolve(pingFn()),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timed out')), timeoutMs)
        ),
      ]);

      const elapsed = Date.now() - start;

      return {
        name,
        status: result ? 'healthy' : 'unhealthy',
        lastChecked: new Date().toISOString(),
        responseTimeMs: elapsed,
      };
    } catch (error) {
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
