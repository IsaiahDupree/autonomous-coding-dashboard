import { HealthStatus } from './types';
type HealthCheckFn = () => Promise<HealthStatus>;
/**
 * Health checker that manages and runs health checks for multiple services.
 */
export declare class HealthChecker {
    private readonly checks;
    /**
     * Register a health check function for a named service.
     */
    register(name: string, checkFn: HealthCheckFn): void;
    /**
     * Unregister a health check.
     */
    unregister(name: string): void;
    /**
     * Run all health checks in parallel and return results.
     */
    checkAll(): Promise<Map<string, HealthStatus>>;
    /**
     * Run a single named health check.
     */
    checkOne(name: string): Promise<HealthStatus>;
    /**
     * Returns true if all registered services are healthy.
     */
    isHealthy(): Promise<boolean>;
    /**
     * Returns all unhealthy services.
     */
    getUnhealthy(): Promise<HealthStatus[]>;
}
/**
 * Create a health check that verifies an HTTP endpoint returns 200.
 */
export declare function httpHealthCheck(url: string, timeoutMs?: number): HealthCheckFn;
/**
 * Create a health check that verifies a TCP connection can be established.
 */
export declare function tcpHealthCheck(host: string, port: number, timeoutMs?: number): HealthCheckFn;
/**
 * Create a health check that verifies DNS resolution.
 */
export declare function dnsHealthCheck(hostname: string): HealthCheckFn;
export {};
//# sourceMappingURL=health.d.ts.map