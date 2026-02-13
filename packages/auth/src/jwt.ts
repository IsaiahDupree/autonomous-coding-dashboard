/**
 * JWT Utilities
 * =============
 *
 * Shared helpers for creating, verifying, decoding, and rotating JSON Web
 * Tokens across all ACD products. Wraps `jsonwebtoken` with consistent
 * error handling, Zod-validated payloads, and token-pair rotation.
 */

import jwt, { SignOptions, JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Standard JWT payload shape used across all ACD services.
 * Mirrors the canonical `JWTPayload` from `@acd/types` but kept local to
 * avoid a hard dependency when the types package is not available.
 */
export const JWTPayloadSchema = z.object({
  /** Subject - typically the user ID. */
  sub: z.string(),

  /** Issuer. */
  iss: z.string().optional(),

  /** Audience (product IDs or service names). */
  aud: z.union([z.string(), z.array(z.string())]).optional(),

  /** Expiration time (unix epoch seconds). */
  exp: z.number().int().positive().optional(),

  /** Issued at (unix epoch seconds). */
  iat: z.number().int().positive().optional(),

  /** Not before (unix epoch seconds). */
  nbf: z.number().int().positive().optional(),

  /** JWT ID (unique token identifier). */
  jti: z.string().optional(),

  /** User email. */
  email: z.string().email().optional(),

  /** User display name. */
  name: z.string().optional(),

  /** User role. */
  role: z.string().optional(),

  /** Products the user has active entitlements for. */
  products: z.array(z.string()).optional(),

  /** Stripe customer ID. */
  stripeCustomerId: z.string().optional(),

  /** Auth provider. */
  provider: z.string().optional(),

  /** Organization / team ID. */
  orgId: z.string().optional(),

  /** Custom metadata claims. */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type JWTPayload = z.infer<typeof JWTPayloadSchema>;

/** Error codes returned by JWT operations. */
export type JWTErrorCode =
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'TOKEN_MALFORMED'
  | 'VERIFICATION_FAILED';

export class JWTError extends Error {
  public readonly code: JWTErrorCode;

  constructor(code: JWTErrorCode, message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'JWTError';
    this.code = code;
  }
}

/** Shape returned by `rotateTokenPair`. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ---------------------------------------------------------------------------
// Token generation
// ---------------------------------------------------------------------------

/**
 * Generate an access token (short-lived).
 *
 * @param payload   - Claims to include in the token
 * @param secret    - Signing secret
 * @param expiresIn - Expiration expressed as a string (e.g. `"15m"`, `"1h"`)
 *                    or number of seconds. Defaults to `"15m"`.
 */
export function generateAccessToken(
  payload: Record<string, unknown>,
  secret: string,
  expiresIn: string | number = '15m',
): string {
  if (!secret) {
    throw new JWTError('VERIFICATION_FAILED', 'JWT secret is required to generate a token.');
  }

  const jti = crypto.randomUUID();

  const options: SignOptions = {
    expiresIn: expiresIn as any,
    jwtid: jti,
  };

  return jwt.sign(payload, secret, options);
}

/**
 * Generate a refresh token (long-lived).
 *
 * @param payload - Claims to include (typically minimal: `{ sub, jti }`)
 * @param secret  - Signing secret (can differ from the access-token secret)
 * @param expiresIn - Defaults to `"7d"`.
 */
export function generateRefreshToken(
  payload: Record<string, unknown>,
  secret: string,
  expiresIn: string | number = '7d',
): string {
  if (!secret) {
    throw new JWTError('VERIFICATION_FAILED', 'JWT secret is required to generate a refresh token.');
  }

  const jti = crypto.randomUUID();

  const options: SignOptions = {
    expiresIn: expiresIn as any,
    jwtid: jti,
  };

  return jwt.sign({ ...payload, type: 'refresh' }, secret, options);
}

// ---------------------------------------------------------------------------
// Token verification & decoding
// ---------------------------------------------------------------------------

/**
 * Verify a token signature and expiration, returning the decoded payload.
 *
 * @param token  - The raw JWT string
 * @param secret - The signing secret
 * @returns Parsed and validated `JWTPayload`
 * @throws {JWTError} on expired, invalid, or malformed tokens
 */
export function verifyToken(token: string, secret: string): JWTPayload {
  if (!token) {
    throw new JWTError('TOKEN_MALFORMED', 'Token string is required.');
  }
  if (!secret) {
    throw new JWTError('VERIFICATION_FAILED', 'JWT secret is required to verify a token.');
  }

  try {
    const decoded = jwt.verify(token, secret) as Record<string, unknown>;
    return JWTPayloadSchema.parse(decoded);
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw new JWTError('TOKEN_EXPIRED', 'Token has expired.', err);
    }
    if (err instanceof JsonWebTokenError) {
      throw new JWTError('TOKEN_INVALID', `Token verification failed: ${err.message}`, err);
    }
    if (err instanceof z.ZodError) {
      throw new JWTError(
        'TOKEN_MALFORMED',
        `Token payload failed validation: ${err.errors.map((e) => e.message).join(', ')}`,
        err,
      );
    }
    throw new JWTError('VERIFICATION_FAILED', 'Unexpected error verifying token.', err);
  }
}

/**
 * Decode a token **without** verifying its signature.
 * Useful for reading claims from an expired token (e.g. to extract the `sub`
 * before issuing a new pair via refresh).
 *
 * @param token - The raw JWT string
 * @returns The decoded payload (unverified!) or `null` if malformed
 */
export function decodeToken(token: string): JWTPayload | null {
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.decode(token, { complete: false });
    if (!decoded || typeof decoded === 'string') {
      return null;
    }
    // Best-effort parse; we intentionally do not throw on validation failure
    const result = JWTPayloadSchema.safeParse(decoded);
    return result.success ? result.data : (decoded as unknown as JWTPayload);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Token rotation
// ---------------------------------------------------------------------------

/**
 * Rotate a token pair by verifying the existing refresh token and issuing
 * fresh access + refresh tokens.
 *
 * @param refreshToken       - The current refresh token
 * @param secret             - Signing secret
 * @param accessTokenExpiry  - New access token expiry (default `"15m"`)
 * @param refreshTokenExpiry - New refresh token expiry (default `"7d"`)
 * @returns A new `TokenPair`
 * @throws {JWTError} if the refresh token is invalid or expired
 */
export function rotateTokenPair(
  refreshToken: string,
  secret: string,
  accessTokenExpiry: string | number = '15m',
  refreshTokenExpiry: string | number = '7d',
): TokenPair {
  const payload = verifyToken(refreshToken, secret);

  // Verify this is actually a refresh token
  const raw = jwt.decode(refreshToken) as Record<string, unknown> | null;
  if (raw?.type !== 'refresh') {
    throw new JWTError('TOKEN_INVALID', 'Provided token is not a refresh token.');
  }

  // Build the claims for the new tokens (strip timing claims)
  const { exp, iat, nbf, jti, ...claims } = payload;

  const newAccessToken = generateAccessToken(claims, secret, accessTokenExpiry);
  const newRefreshToken = generateRefreshToken(claims, secret, refreshTokenExpiry);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}
