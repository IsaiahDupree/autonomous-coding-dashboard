"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthConfigSchema = exports.OAuthGrantTypeSchema = exports.JWTPayloadSchema = exports.AuthSessionSchema = exports.SessionStatusSchema = exports.AuthMethodSchema = exports.AuthProviderSchema = void 0;
const zod_1 = require("zod");
const product_1 = require("./product");
const user_1 = require("./user");
// ---------------------------------------------------------------------------
// Auth Session
// ---------------------------------------------------------------------------
/**
 * Auth provider type.
 */
exports.AuthProviderSchema = zod_1.z.enum([
    "supabase",
    "clerk",
    "firebase",
    "auth0",
    "nextauth",
    "custom",
]);
/**
 * Authentication method used.
 */
exports.AuthMethodSchema = zod_1.z.enum([
    "password",
    "magic_link",
    "oauth_google",
    "oauth_github",
    "oauth_facebook",
    "oauth_apple",
    "oauth_linkedin",
    "oauth_twitter",
    "sso_saml",
    "sso_oidc",
    "api_key",
    "service_token",
    "refresh_token",
]);
/**
 * Session status.
 */
exports.SessionStatusSchema = zod_1.z.enum([
    "active",
    "expired",
    "revoked",
    "refreshing",
]);
/**
 * AuthSession - Represents an active user authentication session.
 */
exports.AuthSessionSchema = zod_1.z.object({
    /** Unique session identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** The authenticated user's ID. */
    userId: zod_1.z.string().uuid(),
    /** Auth provider used. */
    provider: exports.AuthProviderSchema,
    /** Authentication method. */
    method: exports.AuthMethodSchema,
    /** Current session status. */
    status: exports.SessionStatusSchema.default("active"),
    /** Access token (JWT or opaque). */
    accessToken: zod_1.z.string().min(1),
    /** Refresh token for obtaining new access tokens. */
    refreshToken: zod_1.z.string().optional(),
    /** Access token expiry (ISO 8601). */
    accessTokenExpiresAt: zod_1.z.string().datetime(),
    /** Refresh token expiry (ISO 8601). */
    refreshTokenExpiresAt: zod_1.z.string().datetime().optional(),
    /** IP address the session was created from. */
    ipAddress: zod_1.z.string().ip().optional(),
    /** User agent of the session. */
    userAgent: zod_1.z.string().max(2048).optional(),
    /** Device fingerprint. */
    deviceFingerprint: zod_1.z.string().max(256).optional(),
    /** Products the session has access to. */
    authorizedProducts: zod_1.z.array(product_1.ProductIdSchema).optional(),
    /** ISO 8601 timestamp of session creation. */
    createdAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last activity. */
    lastActiveAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of session revocation. */
    revokedAt: zod_1.z.string().datetime().optional(),
});
// ---------------------------------------------------------------------------
// JWT Payload
// ---------------------------------------------------------------------------
/**
 * JWTPayload - Standard claims + ACD custom claims in the access token.
 */
exports.JWTPayloadSchema = zod_1.z.object({
    /** Subject (user ID). */
    sub: zod_1.z.string().uuid(),
    /** Issuer. */
    iss: zod_1.z.string().min(1),
    /** Audience (product IDs or service names). */
    aud: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]),
    /** Expiration time (unix epoch seconds). */
    exp: zod_1.z.number().int().positive(),
    /** Issued at (unix epoch seconds). */
    iat: zod_1.z.number().int().positive(),
    /** Not before (unix epoch seconds). */
    nbf: zod_1.z.number().int().positive().optional(),
    /** JWT ID (unique token identifier). */
    jti: zod_1.z.string().uuid().optional(),
    // -- ACD Custom Claims --
    /** User email. */
    email: zod_1.z.string().email(),
    /** User display name. */
    name: zod_1.z.string().optional(),
    /** User role. */
    role: user_1.UserRoleSchema,
    /** Products the user has active entitlements for. */
    products: zod_1.z.array(product_1.ProductIdSchema).default([]),
    /** Stripe customer ID. */
    stripeCustomerId: zod_1.z.string().optional(),
    /** Auth provider. */
    provider: exports.AuthProviderSchema.optional(),
    /** Organization / team ID (for multi-tenant). */
    orgId: zod_1.z.string().uuid().optional(),
    /** Custom metadata claims. */
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
// ---------------------------------------------------------------------------
// OAuth Config
// ---------------------------------------------------------------------------
/**
 * OAuth grant type.
 */
exports.OAuthGrantTypeSchema = zod_1.z.enum([
    "authorization_code",
    "client_credentials",
    "refresh_token",
    "device_code",
]);
/**
 * OAuthConfig - Configuration for an OAuth 2.0 integration.
 */
exports.OAuthConfigSchema = zod_1.z.object({
    /** Unique config identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** Human-readable name for this OAuth config. */
    name: zod_1.z.string().min(1).max(256),
    /** The provider/service this config connects to. */
    provider: zod_1.z.string().min(1).max(128),
    /** OAuth client ID. */
    clientId: zod_1.z.string().min(1),
    /** OAuth client secret (should be stored encrypted). */
    clientSecret: zod_1.z.string().min(1),
    /** Authorization endpoint URL. */
    authorizationUrl: zod_1.z.string().url(),
    /** Token endpoint URL. */
    tokenUrl: zod_1.z.string().url(),
    /** Revocation endpoint URL. */
    revocationUrl: zod_1.z.string().url().optional(),
    /** User info endpoint URL. */
    userInfoUrl: zod_1.z.string().url().optional(),
    /** JWKS endpoint URL (for token verification). */
    jwksUrl: zod_1.z.string().url().optional(),
    /** Redirect URI after authorization. */
    redirectUri: zod_1.z.string().url(),
    /** Requested scopes. */
    scopes: zod_1.z.array(zod_1.z.string().max(128)),
    /** Supported grant types. */
    grantTypes: zod_1.z.array(exports.OAuthGrantTypeSchema).min(1),
    /** Whether PKCE is required. */
    pkceRequired: zod_1.z.boolean().default(false),
    /** State parameter for CSRF protection. */
    stateRequired: zod_1.z.boolean().default(true),
    /** Whether this config is currently enabled. */
    enabled: zod_1.z.boolean().default(true),
    /** Product this config belongs to. */
    productId: product_1.ProductIdSchema.optional(),
    /** ISO 8601 timestamp of creation. */
    createdAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last update. */
    updatedAt: zod_1.z.string().datetime(),
});
//# sourceMappingURL=auth.js.map