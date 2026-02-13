/**
 * JWT Utilities
 * =============
 *
 * Shared helpers for creating, verifying, decoding, and rotating JSON Web
 * Tokens across all ACD products. Wraps `jsonwebtoken` with consistent
 * error handling, Zod-validated payloads, and token-pair rotation.
 */
import { z } from 'zod';
/**
 * Standard JWT payload shape used across all ACD services.
 * Mirrors the canonical `JWTPayload` from `@acd/types` but kept local to
 * avoid a hard dependency when the types package is not available.
 */
export declare const JWTPayloadSchema: z.ZodObject<{
    /** Subject - typically the user ID. */
    sub: z.ZodString;
    /** Issuer. */
    iss: z.ZodOptional<z.ZodString>;
    /** Audience (product IDs or service names). */
    aud: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    /** Expiration time (unix epoch seconds). */
    exp: z.ZodOptional<z.ZodNumber>;
    /** Issued at (unix epoch seconds). */
    iat: z.ZodOptional<z.ZodNumber>;
    /** Not before (unix epoch seconds). */
    nbf: z.ZodOptional<z.ZodNumber>;
    /** JWT ID (unique token identifier). */
    jti: z.ZodOptional<z.ZodString>;
    /** User email. */
    email: z.ZodOptional<z.ZodString>;
    /** User display name. */
    name: z.ZodOptional<z.ZodString>;
    /** User role. */
    role: z.ZodOptional<z.ZodString>;
    /** Products the user has active entitlements for. */
    products: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Stripe customer ID. */
    stripeCustomerId: z.ZodOptional<z.ZodString>;
    /** Auth provider. */
    provider: z.ZodOptional<z.ZodString>;
    /** Organization / team ID. */
    orgId: z.ZodOptional<z.ZodString>;
    /** Custom metadata claims. */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    sub: string;
    iss?: string | undefined;
    aud?: string | string[] | undefined;
    exp?: number | undefined;
    iat?: number | undefined;
    nbf?: number | undefined;
    jti?: string | undefined;
    email?: string | undefined;
    name?: string | undefined;
    role?: string | undefined;
    products?: string[] | undefined;
    stripeCustomerId?: string | undefined;
    provider?: string | undefined;
    orgId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    sub: string;
    iss?: string | undefined;
    aud?: string | string[] | undefined;
    exp?: number | undefined;
    iat?: number | undefined;
    nbf?: number | undefined;
    jti?: string | undefined;
    email?: string | undefined;
    name?: string | undefined;
    role?: string | undefined;
    products?: string[] | undefined;
    stripeCustomerId?: string | undefined;
    provider?: string | undefined;
    orgId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;
/** Error codes returned by JWT operations. */
export type JWTErrorCode = 'TOKEN_EXPIRED' | 'TOKEN_INVALID' | 'TOKEN_MALFORMED' | 'VERIFICATION_FAILED';
export declare class JWTError extends Error {
    readonly cause?: unknown | undefined;
    readonly code: JWTErrorCode;
    constructor(code: JWTErrorCode, message: string, cause?: unknown | undefined);
}
/** Shape returned by `rotateTokenPair`. */
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
/**
 * Generate an access token (short-lived).
 *
 * @param payload   - Claims to include in the token
 * @param secret    - Signing secret
 * @param expiresIn - Expiration expressed as a string (e.g. `"15m"`, `"1h"`)
 *                    or number of seconds. Defaults to `"15m"`.
 */
export declare function generateAccessToken(payload: Record<string, unknown>, secret: string, expiresIn?: string | number): string;
/**
 * Generate a refresh token (long-lived).
 *
 * @param payload - Claims to include (typically minimal: `{ sub, jti }`)
 * @param secret  - Signing secret (can differ from the access-token secret)
 * @param expiresIn - Defaults to `"7d"`.
 */
export declare function generateRefreshToken(payload: Record<string, unknown>, secret: string, expiresIn?: string | number): string;
/**
 * Verify a token signature and expiration, returning the decoded payload.
 *
 * @param token  - The raw JWT string
 * @param secret - The signing secret
 * @returns Parsed and validated `JWTPayload`
 * @throws {JWTError} on expired, invalid, or malformed tokens
 */
export declare function verifyToken(token: string, secret: string): JWTPayload;
/**
 * Decode a token **without** verifying its signature.
 * Useful for reading claims from an expired token (e.g. to extract the `sub`
 * before issuing a new pair via refresh).
 *
 * @param token - The raw JWT string
 * @returns The decoded payload (unverified!) or `null` if malformed
 */
export declare function decodeToken(token: string): JWTPayload | null;
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
export declare function rotateTokenPair(refreshToken: string, secret: string, accessTokenExpiry?: string | number, refreshTokenExpiry?: string | number): TokenPair;
//# sourceMappingURL=jwt.d.ts.map