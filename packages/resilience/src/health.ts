import * as http from 'http';
import * as https from 'https';
import * as net from 'net';
import * as dns from 'dns';
import { HealthStatus } from './types';

type HealthCheckFn = () => Promise<HealthStatus>;

/**
 * Health checker that manages and runs health checks for multiple services.
 */
export class HealthChecker {
  private readonly checks = new Map<string, HealthCheckFn>();

  /**
   * Register a health check function for a named service.
   */
  register(name: string, checkFn: HealthCheckFn): void {
    this.checks.set(name, checkFn);
  }

  /**
   * Unregister a health check.
   */
  unregister(name: string): void {
    this.checks.delete(name);
  }

  /**
   * Run all health checks in parallel and return results.
   */
  async checkAll(): Promise<Map<string, HealthStatus>> {
    const results = new Map<string, HealthStatus>();
    const entries = Array.from(this.checks.entries());

    const settled = await Promise.allSettled(
      entries.map(async ([name, checkFn]) => {
        const status = await checkFn();
        return { name, status };
      }),
    );

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.set(result.value.name, result.value.status);
      } else {
        // If the check itself threw, mark as unhealthy
        const name =
          entries[settled.indexOf(result)]?.[0] ?? 'unknown';
        results.set(name, {
          service: name,
          status: 'unhealthy',
          latencyMs: 0,
          lastCheck: new Date(),
          details: { error: String(result.reason) },
        });
      }
    }

    return results;
  }

  /**
   * Run a single named health check.
   */
  async checkOne(name: string): Promise<HealthStatus> {
    const checkFn = this.checks.get(name);
    if (!checkFn) {
      throw new Error(`No health check registered for "${name}"`);
    }
    return checkFn();
  }

  /**
   * Returns true if all registered services are healthy.
   */
  async isHealthy(): Promise<boolean> {
    const results = await this.checkAll();
    for (const status of results.values()) {
      if (status.status === 'unhealthy') {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns all unhealthy services.
   */
  async getUnhealthy(): Promise<HealthStatus[]> {
    const results = await this.checkAll();
    return Array.from(results.values()).filter(
      (s) => s.status === 'unhealthy',
    );
  }
}

// ── Built-in check factories ────────────────────────────────────

/**
 * Create a health check that verifies an HTTP endpoint returns 200.
 */
export function httpHealthCheck(
  url: string,
  timeoutMs: number = 5000,
): HealthCheckFn {
  return async (): Promise<HealthStatus> => {
    const start = Date.now();
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    return new Promise<HealthStatus>((resolve) => {
      const req = client.get(
        url,
        { timeout: timeoutMs },
        (res) => {
          const latencyMs = Date.now() - start;
          // Consume the response to free the socket
          res.resume();

          const statusCode = res.statusCode ?? 0;
          const isHealthy = statusCode >= 200 && statusCode < 300;

          resolve({
            service: url,
            status: isHealthy ? 'healthy' : 'unhealthy',
            latencyMs,
            lastCheck: new Date(),
            details: { statusCode },
          });
        },
      );

      req.on('error', (err) => {
        resolve({
          service: url,
          status: 'unhealthy',
          latencyMs: Date.now() - start,
          lastCheck: new Date(),
          details: { error: err.message },
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          service: url,
          status: 'unhealthy',
          latencyMs: Date.now() - start,
          lastCheck: new Date(),
          details: { error: `Timeout after ${timeoutMs}ms` },
        });
      });
    });
  };
}

/**
 * Create a health check that verifies a TCP connection can be established.
 */
export function tcpHealthCheck(
  host: string,
  port: number,
  timeoutMs: number = 5000,
): HealthCheckFn {
  return async (): Promise<HealthStatus> => {
    const start = Date.now();
    const service = `${host}:${port}`;

    return new Promise<HealthStatus>((resolve) => {
      const socket = net.createConnection({ host, port, timeout: timeoutMs });

      socket.on('connect', () => {
        const latencyMs = Date.now() - start;
        socket.destroy();
        resolve({
          service,
          status: 'healthy',
          latencyMs,
          lastCheck: new Date(),
        });
      });

      socket.on('error', (err) => {
        resolve({
          service,
          status: 'unhealthy',
          latencyMs: Date.now() - start,
          lastCheck: new Date(),
          details: { error: err.message },
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          service,
          status: 'unhealthy',
          latencyMs: Date.now() - start,
          lastCheck: new Date(),
          details: { error: `TCP timeout after ${timeoutMs}ms` },
        });
      });
    });
  };
}

/**
 * Create a health check that verifies DNS resolution.
 */
export function dnsHealthCheck(hostname: string): HealthCheckFn {
  return async (): Promise<HealthStatus> => {
    const start = Date.now();

    return new Promise<HealthStatus>((resolve) => {
      dns.resolve(hostname, (err, addresses) => {
        const latencyMs = Date.now() - start;

        if (err) {
          resolve({
            service: `dns:${hostname}`,
            status: 'unhealthy',
            latencyMs,
            lastCheck: new Date(),
            details: { error: err.message, code: err.code },
          });
        } else {
          resolve({
            service: `dns:${hostname}`,
            status: 'healthy',
            latencyMs,
            lastCheck: new Date(),
            details: { addresses },
          });
        }
      });
    });
  };
}
