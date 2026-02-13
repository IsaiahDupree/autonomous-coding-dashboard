"use strict";
/**
 * Cross-Product Session Management
 * =================================
 *
 * Provides session creation, validation, refresh, and revocation for the
 * ACD platform. Sessions are JWT-based and can span multiple products so
 * that a single login grants access to all entitled ACD products.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.validateSession = validateSession;
exports.refreshSession = refreshSession;
exports.revokeSession = revokeSession;
exports.getCookieConfig = getCookieConfig;
const crypto_1 = __importDefault(require("crypto"));
const zod_1 = require("zod");
const jwt_1 = require("./jwt");
// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
/** Default access token lifetime. */
const DEFAULT_ACCESS_EXPIRY = '15m';
/** Default refresh token lifetime. */
const DEFAULT_REFRESH_EXPIRY = '7d';
/**
 * Read the JWT secret from environment.
 * Falls back to a clearly-insecure value so development works out of the box,
 * but production deployments **must** set `JWT_SECRET`.
 */
function getSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.warn('[acd/auth] JWT_SECRET is not set. Using insecure default. Do NOT use this in production.');
        return 'acd-dev-secret-CHANGE-ME';
    }
    return secret;
}
/** Zod schema for validating `createSession` input. */
const CreateSessionInputSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
    products: zod_1.z.array(zod_1.z.string()).optional().default([]),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional().default({}),
});
// ---------------------------------------------------------------------------
// In-memory revocation set (replace with Redis / DB in production)
// ---------------------------------------------------------------------------
/**
 * In-memory set of revoked session IDs.
 *
 * In a production deployment this should be backed by Redis or a database
 * table so that revocations are shared across instances.
 */
const revokedSessions = new Set();
// ---------------------------------------------------------------------------
// Session operations
// ---------------------------------------------------------------------------
/**
 * Create a new cross-product session for a user.
 *
 * @param userId   - The authenticated user's ID
 * @param products - Array of product IDs the user is entitled to
 * @param metadata - Optional metadata (IP, user agent, etc.)
 * @returns `SessionTokens` containing access and refresh tokens
 */
function createSession(userId, products = [], metadata = {}) {
    const input = CreateSessionInputSchema.parse({ userId, products, metadata });
    const secret = getSecret();
    const sessionId = crypto_1.default.randomUUID();
    const accessExpiresIn = parseExpiryToSeconds(DEFAULT_ACCESS_EXPIRY);
    const refreshExpiresIn = parseExpiryToSeconds(DEFAULT_REFRESH_EXPIRY);
    const baseClaims = {
        sub: input.userId,
        sessionId,
        products: input.products,
        ...(input.metadata.provider ? { provider: input.metadata.provider } : {}),
    };
    const accessToken = (0, jwt_1.generateAccessToken)(baseClaims, secret, DEFAULT_ACCESS_EXPIRY);
    const refreshToken = (0, jwt_1.generateRefreshToken)({ sub: input.userId, sessionId }, secret, DEFAULT_REFRESH_EXPIRY);
    return {
        sessionId,
        accessToken,
        refreshToken,
        accessExpiresIn,
        refreshExpiresIn,
    };
}
/**
 * Validate a session by verifying the access token and checking revocation.
 *
 * @param token - The access token (JWT)
 * @returns The decoded `JWTPayload` if valid
 * @throws {JWTError} if the token is invalid, expired, or the session was revoked
 */
function validateSession(token) {
    const secret = getSecret();
    const payload = (0, jwt_1.verifyToken)(token, secret);
    // Check if the session was revoked
    const decoded = (0, jwt_1.decodeToken)(token);
    const sessionId = decoded?.sessionId;
    if (sessionId && revokedSessions.has(sessionId)) {
        throw new jwt_1.JWTError('TOKEN_INVALID', 'Session has been revoked.');
    }
    return payload;
}
/**
 * Refresh a session by exchanging a valid refresh token for a new token pair.
 *
 * @param refreshTokenStr - The current refresh token
 * @returns Fresh `SessionTokens`
 * @throws {JWTError} if the refresh token is invalid or the session was revoked
 */
function refreshSession(refreshTokenStr) {
    const secret = getSecret();
    // Verify the refresh token
    const payload = (0, jwt_1.verifyToken)(refreshTokenStr, secret);
    const decoded = (0, jwt_1.decodeToken)(refreshTokenStr);
    const sessionId = decoded?.sessionId || crypto_1.default.randomUUID();
    // Check revocation
    if (revokedSessions.has(sessionId)) {
        throw new jwt_1.JWTError('TOKEN_INVALID', 'Session has been revoked.');
    }
    const accessExpiresIn = parseExpiryToSeconds(DEFAULT_ACCESS_EXPIRY);
    const refreshExpiresIn = parseExpiryToSeconds(DEFAULT_REFRESH_EXPIRY);
    const baseClaims = {
        sub: payload.sub,
        sessionId,
        products: payload.products || [],
    };
    const accessToken = (0, jwt_1.generateAccessToken)(baseClaims, secret, DEFAULT_ACCESS_EXPIRY);
    const newRefreshToken = (0, jwt_1.generateRefreshToken)({ sub: payload.sub, sessionId }, secret, DEFAULT_REFRESH_EXPIRY);
    return {
        sessionId,
        accessToken,
        refreshToken: newRefreshToken,
        accessExpiresIn,
        refreshExpiresIn,
    };
}
/**
 * Revoke a session so that its tokens can no longer be used.
 *
 * @param sessionId - The session identifier to revoke
 */
function revokeSession(sessionId) {
    if (!sessionId) {
        throw new Error('[acd/auth] Session ID is required to revoke a session.');
    }
    revokedSessions.add(sessionId);
}
// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------
/**
 * Get cookie configuration for a shared auth domain.
 *
 * This enables cross-product SSO by setting cookies on a shared parent
 * domain (e.g. `.yourdomain.com`) so that all `*.yourdomain.com` products
 * can read the session cookie.
 *
 * @param domain - The cookie domain (e.g. `.yourdomain.com`). Pass an empty
 *                 string or omit to use the default from `COOKIE_DOMAIN` env.
 * @returns Cookie configuration object
 */
function getCookieConfig(domain) {
    const cookieDomain = domain || process.env.COOKIE_DOMAIN || 'localhost';
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        domain: cookieDomain,
        path: '/',
        maxAge: parseExpiryToSeconds(DEFAULT_REFRESH_EXPIRY) * 1000, // ms for Express
    };
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
/**
 * Parse a human-readable duration string (e.g. `"15m"`, `"7d"`, `"1h"`)
 * into seconds.
 */
function parseExpiryToSeconds(expiry) {
    const match = expiry.match(/^(\d+)(s|m|h|d|w)$/);
    if (!match) {
        // Assume it is already in seconds
        const parsed = parseInt(expiry, 10);
        return isNaN(parsed) ? 900 : parsed; // default 15 min
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
        case 's':
            return value;
        case 'm':
            return value * 60;
        case 'h':
            return value * 3600;
        case 'd':
            return value * 86400;
        case 'w':
            return value * 604800;
        default:
            return value;
    }
}
//# sourceMappingURL=session.js.map