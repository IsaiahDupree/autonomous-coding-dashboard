import { GatewayConfig } from './types';
import { ApiKeyManager } from './api-keys';
import { GatewayRateLimiter } from './rate-limiter';
import { RequestLogger } from './logger';
import { ApiVersionManager } from './versioning';
export interface MiddlewareRequest {
    method: string;
    url?: string;
    path?: string;
    headers: Record<string, string | string[] | undefined>;
    ip?: string;
    socket?: {
        remoteAddress?: string;
    };
    query?: Record<string, string | string[] | undefined>;
    /** Attached by apiKeyMiddleware after successful validation */
    apiKey?: {
        id: string;
        ownerId: string;
        orgId: string;
        scopes: string[];
        product: string | null;
    };
    /** Attached by versionMiddleware */
    apiVersion?: string;
}
export interface MiddlewareResponse {
    statusCode: number;
    getHeader?(name: string): string | number | string[] | undefined;
    setHeader(name: string, value: string | number): void;
    status(code: number): MiddlewareResponse;
    json(body: unknown): void;
    end?(data?: string): void;
}
export type NextFunction = (err?: unknown) => void;
export type Middleware = (req: MiddlewareRequest, res: MiddlewareResponse, next: NextFunction) => void;
/**
 * Express middleware that extracts and validates the API key from the X-API-Key header.
 * On success, attaches key metadata to req.apiKey.
 * On failure, responds with 401 Unauthorized.
 */
export declare function apiKeyMiddleware(manager: ApiKeyManager): Middleware;
/**
 * Express middleware that applies per-consumer rate limiting.
 * Uses the API key ID (if available), falling back to IP address.
 * Sets X-RateLimit-* headers on the response.
 * Returns 429 Too Many Requests when limit is exceeded.
 */
export declare function rateLimitMiddleware(limiter: GatewayRateLimiter): Middleware;
/**
 * Express middleware that logs request/response details.
 * Captures timing, status code, and metadata from earlier middleware.
 */
export declare function loggingMiddleware(logger: RequestLogger): Middleware;
/**
 * Express middleware that resolves the API version from the request.
 * Sets the resolved version on req.apiVersion and adds version headers to the response.
 * Returns 400 if an unsupported version is requested.
 */
export declare function versionMiddleware(versioner: ApiVersionManager): Middleware;
/**
 * Creates a full gateway middleware chain from a GatewayConfig.
 * Returns an array of middleware functions to be applied in order:
 * 1. API Key validation
 * 2. Rate limiting
 * 3. Request logging
 * 4. API version resolution
 */
export declare function createGatewayMiddleware(config: GatewayConfig): {
    middlewares: Middleware[];
    apiKeyManager: ApiKeyManager;
    rateLimiter: GatewayRateLimiter;
    requestLogger: RequestLogger;
    versionManager: ApiVersionManager;
};
//# sourceMappingURL=middleware.d.ts.map