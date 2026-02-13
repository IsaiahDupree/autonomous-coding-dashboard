"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthChecker = void 0;
exports.httpHealthCheck = httpHealthCheck;
exports.tcpHealthCheck = tcpHealthCheck;
exports.dnsHealthCheck = dnsHealthCheck;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const net = __importStar(require("net"));
const dns = __importStar(require("dns"));
/**
 * Health checker that manages and runs health checks for multiple services.
 */
class HealthChecker {
    constructor() {
        this.checks = new Map();
    }
    /**
     * Register a health check function for a named service.
     */
    register(name, checkFn) {
        this.checks.set(name, checkFn);
    }
    /**
     * Unregister a health check.
     */
    unregister(name) {
        this.checks.delete(name);
    }
    /**
     * Run all health checks in parallel and return results.
     */
    async checkAll() {
        const results = new Map();
        const entries = Array.from(this.checks.entries());
        const settled = await Promise.allSettled(entries.map(async ([name, checkFn]) => {
            const status = await checkFn();
            return { name, status };
        }));
        for (const result of settled) {
            if (result.status === 'fulfilled') {
                results.set(result.value.name, result.value.status);
            }
            else {
                // If the check itself threw, mark as unhealthy
                const name = entries[settled.indexOf(result)]?.[0] ?? 'unknown';
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
    async checkOne(name) {
        const checkFn = this.checks.get(name);
        if (!checkFn) {
            throw new Error(`No health check registered for "${name}"`);
        }
        return checkFn();
    }
    /**
     * Returns true if all registered services are healthy.
     */
    async isHealthy() {
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
    async getUnhealthy() {
        const results = await this.checkAll();
        return Array.from(results.values()).filter((s) => s.status === 'unhealthy');
    }
}
exports.HealthChecker = HealthChecker;
// ── Built-in check factories ────────────────────────────────────
/**
 * Create a health check that verifies an HTTP endpoint returns 200.
 */
function httpHealthCheck(url, timeoutMs = 5000) {
    return async () => {
        const start = Date.now();
        const parsedUrl = new URL(url);
        const client = parsedUrl.protocol === 'https:' ? https : http;
        return new Promise((resolve) => {
            const req = client.get(url, { timeout: timeoutMs }, (res) => {
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
            });
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
function tcpHealthCheck(host, port, timeoutMs = 5000) {
    return async () => {
        const start = Date.now();
        const service = `${host}:${port}`;
        return new Promise((resolve) => {
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
function dnsHealthCheck(hostname) {
    return async () => {
        const start = Date.now();
        return new Promise((resolve) => {
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
                }
                else {
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
//# sourceMappingURL=health.js.map