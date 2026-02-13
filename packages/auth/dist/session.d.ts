/**
 * Cross-Product Session Management
 * =================================
 *
 * Provides session creation, validation, refresh, and revocation for the
 * ACD platform. Sessions are JWT-based and can span multiple products so
 * that a single login grants access to all entitled ACD products.
 */
import type { JWTPayload } from './jwt';
/** Metadata attached to a session at creation time. */
export interface SessionMetadata {
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
    provider?: string;
    [key: string]: unknown;
}
/** The tokens returned when a session is created or refreshed. */
export interface SessionTokens {
    /** Opaque session identifier. */
    sessionId: string;
    /** Short-lived access token. */
    accessToken: string;
    /** Long-lived refresh token. */
    refreshToken: string;
    /** Access token expiry in seconds from now. */
    accessExpiresIn: number;
    /** Refresh token expiry in seconds from now. */
    refreshExpiresIn: number;
}
/** Options for cookie configuration. */
export interface CookieOptions {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    domain: string;
    path: string;
    maxAge: number;
}
/**
 * Create a new cross-product session for a user.
 *
 * @param userId   - The authenticated user's ID
 * @param products - Array of product IDs the user is entitled to
 * @param metadata - Optional metadata (IP, user agent, etc.)
 * @returns `SessionTokens` containing access and refresh tokens
 */
export declare function createSession(userId: string, products?: string[], metadata?: SessionMetadata): SessionTokens;
/**
 * Validate a session by verifying the access token and checking revocation.
 *
 * @param token - The access token (JWT)
 * @returns The decoded `JWTPayload` if valid
 * @throws {JWTError} if the token is invalid, expired, or the session was revoked
 */
export declare function validateSession(token: string): JWTPayload;
/**
 * Refresh a session by exchanging a valid refresh token for a new token pair.
 *
 * @param refreshTokenStr - The current refresh token
 * @returns Fresh `SessionTokens`
 * @throws {JWTError} if the refresh token is invalid or the session was revoked
 */
export declare function refreshSession(refreshTokenStr: string): SessionTokens;
/**
 * Revoke a session so that its tokens can no longer be used.
 *
 * @param sessionId - The session identifier to revoke
 */
export declare function revokeSession(sessionId: string): void;
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
export declare function getCookieConfig(domain?: string): CookieOptions;
//# sourceMappingURL=session.d.ts.map