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
import crypto from 'crypto';
import { validateSession } from './session';
import { verifyToken, decodeToken, JWTError } from './jwt';
import type { JWTPayload } from './jwt';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

/**
 * Middleware that validates a JWT from the `Authorization: Bearer <token>`
 * header (or an optional cookie) and attaches the decoded payload to
 * `req.user`.
 *
 * @param options - Configuration options
 * @returns Express middleware
 */
export function authMiddleware(options: AuthMiddlewareOptions = {}) {
  const {
    secret,
    optional = false,
    headerName = 'authorization',
    cookieName,
  } = options;

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const jwtSecret = secret || process.env.JWT_SECRET;

    if (!jwtSecret) {
      if (optional) {
        return next();
      }
      res.status(500).json({
        error: { code: 'SERVER_ERROR', message: 'JWT secret is not configured.' },
      });
      return;
    }

    // Extract token from header or cookie
    let token: string | undefined;

    const authHeader = req.headers[headerName.toLowerCase()] as string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (cookieName && req.cookies) {
      token = req.cookies[cookieName];
    }

    if (!token) {
      if (optional) {
        return next();
      }
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header.' },
      });
      return;
    }

    try {
      const payload = verifyToken(token, jwtSecret);
      req.user = payload;

      // Attach session ID if present in claims
      const decoded = decodeToken(token) as Record<string, unknown> | null;
      if (decoded?.sessionId && typeof decoded.sessionId === 'string') {
        req.sessionId = decoded.sessionId;
      }

      next();
    } catch (err) {
      if (optional) {
        return next();
      }

      if (err instanceof JWTError) {
        const status = err.code === 'TOKEN_EXPIRED' ? 401 : 401;
        res.status(status).json({
          error: { code: err.code, message: err.message },
        });
        return;
      }

      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication failed.' },
      });
    }
  };
}

// ---------------------------------------------------------------------------
// Role-based authorization
// ---------------------------------------------------------------------------

/**
 * Middleware that checks if the authenticated user has one of the required
 * roles. Must be used **after** `authMiddleware`.
 *
 * @param roles - One or more allowed roles
 * @returns Express middleware
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
      return;
    }

    const userRole = req.user.role;
    if (!userRole || !roles.includes(userRole)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Insufficient role. Required: ${roles.join(', ')}.`,
        },
      });
      return;
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// Product entitlement check
// ---------------------------------------------------------------------------

/**
 * Middleware that checks if the authenticated user has access to a specific
 * product. Must be used **after** `authMiddleware`.
 *
 * @param productId - The product identifier to check
 * @returns Express middleware
 */
export function requireProduct(productId: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
      return;
    }

    const products = req.user.products || [];
    if (!products.includes(productId)) {
      res.status(403).json({
        error: {
          code: 'PRODUCT_NOT_ENTITLED',
          message: `User does not have access to product "${productId}".`,
        },
      });
      return;
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

/**
 * In-memory rate limiter store.
 * For production, replace with Redis-backed storage.
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/** Periodically clean up expired entries (every 5 minutes). */
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (now >= entry.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
  // Allow the process to exit even if the timer is active
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

/**
 * Rate limiting middleware.
 *
 * By default, limits are per-IP address. You can provide a custom `keyFn`
 * to rate-limit per user, API key, or any other discriminator.
 *
 * @param config - Rate limit configuration
 * @returns Express middleware
 */
export function rateLimitMiddleware(config: RateLimitConfig = {}) {
  const {
    windowMs = 60_000,
    maxRequests = 100,
    keyFn = (req: Request) => req.ip || req.socket.remoteAddress || 'unknown',
    message = 'Too many requests. Please try again later.',
  } = config;

  ensureCleanup();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyFn(req);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    // Set rate-limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetSeconds.toString());

    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', resetSeconds.toString());
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message },
      });
      return;
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// CSRF protection
// ---------------------------------------------------------------------------

/**
 * CSRF token middleware.
 *
 * On GET requests, generates a CSRF token and sets it as a cookie.
 * On state-changing requests (POST, PUT, PATCH, DELETE), validates that the
 * `x-csrf-token` header matches the cookie value.
 *
 * @returns Express middleware
 */
export function csrfProtection() {
  const COOKIE_NAME = 'acd-csrf-token';
  const HEADER_NAME = 'x-csrf-token';

  return (req: Request, res: Response, next: NextFunction): void => {
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

    if (!isStateChanging) {
      // Generate and set CSRF token for safe methods
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie(COOKIE_NAME, token, {
        httpOnly: false, // Must be readable by JS to include in header
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      // Also expose via response header for SPAs
      res.setHeader(HEADER_NAME, token);
      return next();
    }

    // Validate CSRF token on state-changing requests
    const cookieToken = req.cookies?.[COOKIE_NAME];
    const headerToken = req.headers[HEADER_NAME] as string | undefined;

    if (!cookieToken || !headerToken) {
      res.status(403).json({
        error: { code: 'CSRF_MISSING', message: 'CSRF token is missing.' },
      });
      return;
    }

    // Timing-safe comparison
    const cookieBuf = Buffer.from(cookieToken);
    const headerBuf = Buffer.from(headerToken);

    if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
      res.status(403).json({
        error: { code: 'CSRF_INVALID', message: 'CSRF token is invalid.' },
      });
      return;
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// Content Security Policy headers
// ---------------------------------------------------------------------------

/**
 * Middleware that sets Content Security Policy (CSP) headers.
 *
 * Provides a sensible default policy for ACD products. Override individual
 * directives via the `overrides` parameter.
 *
 * @param overrides - Partial directive overrides
 * @returns Express middleware
 */
export function cspHeaders(
  overrides: Record<string, string> = {},
) {
  const defaultDirectives: Record<string, string> = {
    'default-src': "'self'",
    'script-src': "'self'",
    'style-src': "'self' 'unsafe-inline'",
    'img-src': "'self' data: https:",
    'font-src': "'self' data:",
    'connect-src': "'self' https:",
    'frame-ancestors': "'none'",
    'base-uri': "'self'",
    'form-action': "'self'",
    'object-src': "'none'",
    'upgrade-insecure-requests': '',
    ...overrides,
  };

  const policy = Object.entries(defaultDirectives)
    .map(([directive, value]) => (value ? `${directive} ${value}` : directive))
    .join('; ');

  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Content-Security-Policy', policy);
    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0'); // Prefer CSP over legacy XSS filter
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  };
}
