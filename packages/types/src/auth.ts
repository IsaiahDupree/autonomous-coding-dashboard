import { z } from "zod";
import { ProductIdSchema } from "./product";
import { UserRoleSchema } from "./user";

// ---------------------------------------------------------------------------
// Auth Session
// ---------------------------------------------------------------------------

/**
 * Auth provider type.
 */
export const AuthProviderSchema = z.enum([
  "supabase",
  "clerk",
  "firebase",
  "auth0",
  "nextauth",
  "custom",
]);
export type AuthProvider = z.infer<typeof AuthProviderSchema>;

/**
 * Authentication method used.
 */
export const AuthMethodSchema = z.enum([
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
export type AuthMethod = z.infer<typeof AuthMethodSchema>;

/**
 * Session status.
 */
export const SessionStatusSchema = z.enum([
  "active",
  "expired",
  "revoked",
  "refreshing",
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

/**
 * AuthSession - Represents an active user authentication session.
 */
export const AuthSessionSchema = z.object({
  /** Unique session identifier (UUID v4). */
  id: z.string().uuid(),

  /** The authenticated user's ID. */
  userId: z.string().uuid(),

  /** Auth provider used. */
  provider: AuthProviderSchema,

  /** Authentication method. */
  method: AuthMethodSchema,

  /** Current session status. */
  status: SessionStatusSchema.default("active"),

  /** Access token (JWT or opaque). */
  accessToken: z.string().min(1),

  /** Refresh token for obtaining new access tokens. */
  refreshToken: z.string().optional(),

  /** Access token expiry (ISO 8601). */
  accessTokenExpiresAt: z.string().datetime(),

  /** Refresh token expiry (ISO 8601). */
  refreshTokenExpiresAt: z.string().datetime().optional(),

  /** IP address the session was created from. */
  ipAddress: z.string().ip().optional(),

  /** User agent of the session. */
  userAgent: z.string().max(2048).optional(),

  /** Device fingerprint. */
  deviceFingerprint: z.string().max(256).optional(),

  /** Products the session has access to. */
  authorizedProducts: z.array(ProductIdSchema).optional(),

  /** ISO 8601 timestamp of session creation. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last activity. */
  lastActiveAt: z.string().datetime(),

  /** ISO 8601 timestamp of session revocation. */
  revokedAt: z.string().datetime().optional(),
});

export type AuthSession = z.infer<typeof AuthSessionSchema>;

// ---------------------------------------------------------------------------
// JWT Payload
// ---------------------------------------------------------------------------

/**
 * JWTPayload - Standard claims + ACD custom claims in the access token.
 */
export const JWTPayloadSchema = z.object({
  /** Subject (user ID). */
  sub: z.string().uuid(),

  /** Issuer. */
  iss: z.string().min(1),

  /** Audience (product IDs or service names). */
  aud: z.union([z.string(), z.array(z.string())]),

  /** Expiration time (unix epoch seconds). */
  exp: z.number().int().positive(),

  /** Issued at (unix epoch seconds). */
  iat: z.number().int().positive(),

  /** Not before (unix epoch seconds). */
  nbf: z.number().int().positive().optional(),

  /** JWT ID (unique token identifier). */
  jti: z.string().uuid().optional(),

  // -- ACD Custom Claims --

  /** User email. */
  email: z.string().email(),

  /** User display name. */
  name: z.string().optional(),

  /** User role. */
  role: UserRoleSchema,

  /** Products the user has active entitlements for. */
  products: z.array(ProductIdSchema).default([]),

  /** Stripe customer ID. */
  stripeCustomerId: z.string().optional(),

  /** Auth provider. */
  provider: AuthProviderSchema.optional(),

  /** Organization / team ID (for multi-tenant). */
  orgId: z.string().uuid().optional(),

  /** Custom metadata claims. */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type JWTPayload = z.infer<typeof JWTPayloadSchema>;

// ---------------------------------------------------------------------------
// OAuth Config
// ---------------------------------------------------------------------------

/**
 * OAuth grant type.
 */
export const OAuthGrantTypeSchema = z.enum([
  "authorization_code",
  "client_credentials",
  "refresh_token",
  "device_code",
]);
export type OAuthGrantType = z.infer<typeof OAuthGrantTypeSchema>;

/**
 * OAuthConfig - Configuration for an OAuth 2.0 integration.
 */
export const OAuthConfigSchema = z.object({
  /** Unique config identifier (UUID v4). */
  id: z.string().uuid(),

  /** Human-readable name for this OAuth config. */
  name: z.string().min(1).max(256),

  /** The provider/service this config connects to. */
  provider: z.string().min(1).max(128),

  /** OAuth client ID. */
  clientId: z.string().min(1),

  /** OAuth client secret (should be stored encrypted). */
  clientSecret: z.string().min(1),

  /** Authorization endpoint URL. */
  authorizationUrl: z.string().url(),

  /** Token endpoint URL. */
  tokenUrl: z.string().url(),

  /** Revocation endpoint URL. */
  revocationUrl: z.string().url().optional(),

  /** User info endpoint URL. */
  userInfoUrl: z.string().url().optional(),

  /** JWKS endpoint URL (for token verification). */
  jwksUrl: z.string().url().optional(),

  /** Redirect URI after authorization. */
  redirectUri: z.string().url(),

  /** Requested scopes. */
  scopes: z.array(z.string().max(128)),

  /** Supported grant types. */
  grantTypes: z.array(OAuthGrantTypeSchema).min(1),

  /** Whether PKCE is required. */
  pkceRequired: z.boolean().default(false),

  /** State parameter for CSRF protection. */
  stateRequired: z.boolean().default(true),

  /** Whether this config is currently enabled. */
  enabled: z.boolean().default(true),

  /** Product this config belongs to. */
  productId: ProductIdSchema.optional(),

  /** ISO 8601 timestamp of creation. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last update. */
  updatedAt: z.string().datetime(),
});

export type OAuthConfig = z.infer<typeof OAuthConfigSchema>;
