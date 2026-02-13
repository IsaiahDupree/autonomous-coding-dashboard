"use strict";
/**
 * JWT Utilities
 * =============
 *
 * Shared helpers for creating, verifying, decoding, and rotating JSON Web
 * Tokens across all ACD products. Wraps `jsonwebtoken` with consistent
 * error handling, Zod-validated payloads, and token-pair rotation.
 */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTError = exports.JWTPayloadSchema = void 0;
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyToken = verifyToken;
exports.decodeToken = decodeToken;
exports.rotateTokenPair = rotateTokenPair;
const jsonwebtoken_1 = __importStar(require("jsonwebtoken"));
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
/**
 * Standard JWT payload shape used across all ACD services.
 * Mirrors the canonical `JWTPayload` from `@acd/types` but kept local to
 * avoid a hard dependency when the types package is not available.
 */
exports.JWTPayloadSchema = zod_1.z.object({
    /** Subject - typically the user ID. */
    sub: zod_1.z.string(),
    /** Issuer. */
    iss: zod_1.z.string().optional(),
    /** Audience (product IDs or service names). */
    aud: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
    /** Expiration time (unix epoch seconds). */
    exp: zod_1.z.number().int().positive().optional(),
    /** Issued at (unix epoch seconds). */
    iat: zod_1.z.number().int().positive().optional(),
    /** Not before (unix epoch seconds). */
    nbf: zod_1.z.number().int().positive().optional(),
    /** JWT ID (unique token identifier). */
    jti: zod_1.z.string().optional(),
    /** User email. */
    email: zod_1.z.string().email().optional(),
    /** User display name. */
    name: zod_1.z.string().optional(),
    /** User role. */
    role: zod_1.z.string().optional(),
    /** Products the user has active entitlements for. */
    products: zod_1.z.array(zod_1.z.string()).optional(),
    /** Stripe customer ID. */
    stripeCustomerId: zod_1.z.string().optional(),
    /** Auth provider. */
    provider: zod_1.z.string().optional(),
    /** Organization / team ID. */
    orgId: zod_1.z.string().optional(),
    /** Custom metadata claims. */
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
class JWTError extends Error {
    constructor(code, message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'JWTError';
        this.code = code;
    }
}
exports.JWTError = JWTError;
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
function generateAccessToken(payload, secret, expiresIn = '15m') {
    if (!secret) {
        throw new JWTError('VERIFICATION_FAILED', 'JWT secret is required to generate a token.');
    }
    const jti = crypto_1.default.randomUUID();
    const options = {
        expiresIn: expiresIn,
        jwtid: jti,
    };
    return jsonwebtoken_1.default.sign(payload, secret, options);
}
/**
 * Generate a refresh token (long-lived).
 *
 * @param payload - Claims to include (typically minimal: `{ sub, jti }`)
 * @param secret  - Signing secret (can differ from the access-token secret)
 * @param expiresIn - Defaults to `"7d"`.
 */
function generateRefreshToken(payload, secret, expiresIn = '7d') {
    if (!secret) {
        throw new JWTError('VERIFICATION_FAILED', 'JWT secret is required to generate a refresh token.');
    }
    const jti = crypto_1.default.randomUUID();
    const options = {
        expiresIn: expiresIn,
        jwtid: jti,
    };
    return jsonwebtoken_1.default.sign({ ...payload, type: 'refresh' }, secret, options);
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
function verifyToken(token, secret) {
    if (!token) {
        throw new JWTError('TOKEN_MALFORMED', 'Token string is required.');
    }
    if (!secret) {
        throw new JWTError('VERIFICATION_FAILED', 'JWT secret is required to verify a token.');
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        return exports.JWTPayloadSchema.parse(decoded);
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.TokenExpiredError) {
            throw new JWTError('TOKEN_EXPIRED', 'Token has expired.', err);
        }
        if (err instanceof jsonwebtoken_1.JsonWebTokenError) {
            throw new JWTError('TOKEN_INVALID', `Token verification failed: ${err.message}`, err);
        }
        if (err instanceof zod_1.z.ZodError) {
            throw new JWTError('TOKEN_MALFORMED', `Token payload failed validation: ${err.errors.map((e) => e.message).join(', ')}`, err);
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
function decodeToken(token) {
    if (!token) {
        return null;
    }
    try {
        const decoded = jsonwebtoken_1.default.decode(token, { complete: false });
        if (!decoded || typeof decoded === 'string') {
            return null;
        }
        // Best-effort parse; we intentionally do not throw on validation failure
        const result = exports.JWTPayloadSchema.safeParse(decoded);
        return result.success ? result.data : decoded;
    }
    catch {
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
function rotateTokenPair(refreshToken, secret, accessTokenExpiry = '15m', refreshTokenExpiry = '7d') {
    const payload = verifyToken(refreshToken, secret);
    // Verify this is actually a refresh token
    const raw = jsonwebtoken_1.default.decode(refreshToken);
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
//# sourceMappingURL=jwt.js.map