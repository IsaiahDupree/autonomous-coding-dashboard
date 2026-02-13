/**
 * Express Middleware
 * =================
 *
 * Shared Express middleware for JWT authentication, role/product authorization,
 * rate limiting, CSRF protection, and Content Security Policy headers.
 *
 * These middleware functions can be dropped into any ACD product's Express
 * server to enforce consistent security policies.
 */
import { Request, Response, NextFunction } from 'express';
import type { JWTPayload } from './jwt';
/**
 * Extends Express Request with the authenticated user payload.
 */
export interface AuthenticatedRequest extends Request {
    /** Decoded JWT payload (set by `authMiddleware`). */
    user?: JWTPayload;
    /** Resolved session ID. */
    sessionId?: string;
}
/** Options accepted by `authMiddleware`. */
export interface AuthMiddlewareOptions {
    /** JWT signing secret. Defaults to `process.env.JWT_SECRET`. */
    secret?: string;
    /** If `true`, do not reject unauthenticated requests (attach user if present). */
    optional?: boolean;
    /** Header name containing the bearer token (default `"authorization"`). */
    headerName?: string;
    /** Cookie name to read the token from (checked when header is absent). */
    cookieName?: string;
}
/** Configuration for `rateLimitMiddleware`. */
export interface RateLimitConfig {
    /** Time window in milliseconds (default `60_000` = 1 min). */
    windowMs?: number;
    /** Maximum requests per window (default `100`). */
    maxRequests?: number;
    /** Key function to determine the rate-limit bucket. */
    keyFn?: (req: Request) => string;
    /** Custom message for rate-limited responses. */
    message?: string;
}
/**
 * Middleware that validates a JWT from the `Authorization: Bearer <token>`
 * header (or an optional cookie) and attaches the decoded payload to
 * `req.user`.
 *
 * @param options - Configuration options
 * @returns Express middleware
 */
export declare function authMiddleware(options?: AuthMiddlewareOptions): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware that checks if the authenticated user has one of the required
 * roles. Must be used **after** `authMiddleware`.
 *
 * @param roles - One or more allowed roles
 * @returns Express middleware
 */
export declare function requireRole(...roles: string[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware that checks if the authenticated user has access to a specific
 * product. Must be used **after** `authMiddleware`.
 *
 * @param productId - The product identifier to check
 * @returns Express middleware
 */
export declare function requireProduct(productId: string): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Rate limiting middleware.
 *
 * By default, limits are per-IP address. You can provide a custom `keyFn`
 * to rate-limit per user, API key, or any other discriminator.
 *
 * @param config - Rate limit configuration
 * @returns Express middleware
 */
export declare function rateLimitMiddleware(config?: RateLimitConfig): (req: Request, res: Response, next: NextFunction) => void;
/**
 * CSRF token middleware.
 *
 * On GET requests, generates a CSRF token and sets it as a cookie.
 * On state-changing requests (POST, PUT, PATCH, DELETE), validates that the
 * `x-csrf-token` header matches the cookie value.
 *
 * @returns Express middleware
 */
export declare function csrfProtection(): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware that sets Content Security Policy (CSP) headers.
 *
 * Provides a sensible default policy for ACD products. Override individual
 * directives via the `overrides` parameter.
 *
 * @param overrides - Partial directive overrides
 * @returns Express middleware
 */
export declare function cspHeaders(overrides?: Record<string, string>): (_req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=middleware.d.ts.map