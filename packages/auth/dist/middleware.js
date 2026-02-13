"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireRole = requireRole;
exports.requireProduct = requireProduct;
exports.rateLimitMiddleware = rateLimitMiddleware;
exports.csrfProtection = csrfProtection;
exports.cspHeaders = cspHeaders;
const crypto_1 = __importDefault(require("crypto"));
const jwt_1 = require("./jwt");
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
function authMiddleware(options = {}) {
    const { secret, optional = false, headerName = 'authorization', cookieName, } = options;
    return (req, res, next) => {
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
        let token;
        const authHeader = req.headers[headerName.toLowerCase()];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        }
        else if (cookieName && req.cookies) {
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
            const payload = (0, jwt_1.verifyToken)(token, jwtSecret);
            req.user = payload;
            // Attach session ID if present in claims
            const decoded = (0, jwt_1.decodeToken)(token);
            if (decoded?.sessionId && typeof decoded.sessionId === 'string') {
                req.sessionId = decoded.sessionId;
            }
            next();
        }
        catch (err) {
            if (optional) {
                return next();
            }
            if (err instanceof jwt_1.JWTError) {
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
function requireRole(...roles) {
    return (req, res, next) => {
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
function requireProduct(productId) {
    return (req, res, next) => {
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
const rateLimitStore = new Map();
/** Periodically clean up expired entries (every 5 minutes). */
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer = null;
function ensureCleanup() {
    if (cleanupTimer)
        return;
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
function rateLimitMiddleware(config = {}) {
    const { windowMs = 60000, maxRequests = 100, keyFn = (req) => req.ip || req.socket.remoteAddress || 'unknown', message = 'Too many requests. Please try again later.', } = config;
    ensureCleanup();
    return (req, res, next) => {
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
function csrfProtection() {
    const COOKIE_NAME = 'acd-csrf-token';
    const HEADER_NAME = 'x-csrf-token';
    return (req, res, next) => {
        const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
        if (!isStateChanging) {
            // Generate and set CSRF token for safe methods
            const token = crypto_1.default.randomBytes(32).toString('hex');
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
        const headerToken = req.headers[HEADER_NAME];
        if (!cookieToken || !headerToken) {
            res.status(403).json({
                error: { code: 'CSRF_MISSING', message: 'CSRF token is missing.' },
            });
            return;
        }
        // Timing-safe comparison
        const cookieBuf = Buffer.from(cookieToken);
        const headerBuf = Buffer.from(headerToken);
        if (cookieBuf.length !== headerBuf.length || !crypto_1.default.timingSafeEqual(cookieBuf, headerBuf)) {
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
function cspHeaders(overrides = {}) {
    const defaultDirectives = {
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
    return (_req, res, next) => {
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
//# sourceMappingURL=middleware.js.map