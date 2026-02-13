/**
 * Cross-Product Session Management
 * =================================
 *
 * Provides session creation, validation, refresh, and revocation for the
 * ACD platform. Sessions are JWT-based and can span multiple products so
 * that a single login grants access to all entitled ACD products.
 */

import crypto from 'crypto';
import { z } from 'zod';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  JWTError,
} from './jwt';
import type { JWTPayload, TokenPair } from './jwt';

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
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn(
      '[acd/auth] JWT_SECRET is not set. Using insecure default. Do NOT use this in production.',
    );
    return 'acd-dev-secret-CHANGE-ME';
  }
  return secret;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

/** Zod schema for validating `createSession` input. */
const CreateSessionInputSchema = z.object({
  userId: z.string().min(1),
  products: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
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
const revokedSessions = new Set<string>();

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
export function createSession(
  userId: string,
  products: string[] = [],
  metadata: SessionMetadata = {},
): SessionTokens {
  const input = CreateSessionInputSchema.parse({ userId, products, metadata });

  const secret = getSecret();
  const sessionId = crypto.randomUUID();

  const accessExpiresIn = parseExpiryToSeconds(DEFAULT_ACCESS_EXPIRY);
  const refreshExpiresIn = parseExpiryToSeconds(DEFAULT_REFRESH_EXPIRY);

  const baseClaims: Record<string, unknown> = {
    sub: input.userId,
    sessionId,
    products: input.products,
    ...(input.metadata.provider ? { provider: input.metadata.provider } : {}),
  };

  const accessToken = generateAccessToken(baseClaims, secret, DEFAULT_ACCESS_EXPIRY);
  const refreshToken = generateRefreshToken(
    { sub: input.userId, sessionId },
    secret,
    DEFAULT_REFRESH_EXPIRY,
  );

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
export function validateSession(token: string): JWTPayload {
  const secret = getSecret();
  const payload = verifyToken(token, secret);

  // Check if the session was revoked
  const decoded = decodeToken(token);
  const sessionId = (decoded as Record<string, unknown> | null)?.sessionId as string | undefined;

  if (sessionId && revokedSessions.has(sessionId)) {
    throw new JWTError('TOKEN_INVALID', 'Session has been revoked.');
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
export function refreshSession(refreshTokenStr: string): SessionTokens {
  const secret = getSecret();

  // Verify the refresh token
  const payload = verifyToken(refreshTokenStr, secret);

  const decoded = decodeToken(refreshTokenStr) as Record<string, unknown> | null;
  const sessionId = (decoded?.sessionId as string) || crypto.randomUUID();

  // Check revocation
  if (revokedSessions.has(sessionId)) {
    throw new JWTError('TOKEN_INVALID', 'Session has been revoked.');
  }

  const accessExpiresIn = parseExpiryToSeconds(DEFAULT_ACCESS_EXPIRY);
  const refreshExpiresIn = parseExpiryToSeconds(DEFAULT_REFRESH_EXPIRY);

  const baseClaims: Record<string, unknown> = {
    sub: payload.sub,
    sessionId,
    products: payload.products || [],
  };

  const accessToken = generateAccessToken(baseClaims, secret, DEFAULT_ACCESS_EXPIRY);
  const newRefreshToken = generateRefreshToken(
    { sub: payload.sub, sessionId },
    secret,
    DEFAULT_REFRESH_EXPIRY,
  );

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
export function revokeSession(sessionId: string): void {
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
export function getCookieConfig(domain?: string): CookieOptions {
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
function parseExpiryToSeconds(expiry: string): number {
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
