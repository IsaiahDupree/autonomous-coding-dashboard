import { z } from "zod";
/**
 * Auth provider type.
 */
export declare const AuthProviderSchema: z.ZodEnum<["supabase", "clerk", "firebase", "auth0", "nextauth", "custom"]>;
export type AuthProvider = z.infer<typeof AuthProviderSchema>;
/**
 * Authentication method used.
 */
export declare const AuthMethodSchema: z.ZodEnum<["password", "magic_link", "oauth_google", "oauth_github", "oauth_facebook", "oauth_apple", "oauth_linkedin", "oauth_twitter", "sso_saml", "sso_oidc", "api_key", "service_token", "refresh_token"]>;
export type AuthMethod = z.infer<typeof AuthMethodSchema>;
/**
 * Session status.
 */
export declare const SessionStatusSchema: z.ZodEnum<["active", "expired", "revoked", "refreshing"]>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
/**
 * AuthSession - Represents an active user authentication session.
 */
export declare const AuthSessionSchema: z.ZodObject<{
    /** Unique session identifier (UUID v4). */
    id: z.ZodString;
    /** The authenticated user's ID. */
    userId: z.ZodString;
    /** Auth provider used. */
    provider: z.ZodEnum<["supabase", "clerk", "firebase", "auth0", "nextauth", "custom"]>;
    /** Authentication method. */
    method: z.ZodEnum<["password", "magic_link", "oauth_google", "oauth_github", "oauth_facebook", "oauth_apple", "oauth_linkedin", "oauth_twitter", "sso_saml", "sso_oidc", "api_key", "service_token", "refresh_token"]>;
    /** Current session status. */
    status: z.ZodDefault<z.ZodEnum<["active", "expired", "revoked", "refreshing"]>>;
    /** Access token (JWT or opaque). */
    accessToken: z.ZodString;
    /** Refresh token for obtaining new access tokens. */
    refreshToken: z.ZodOptional<z.ZodString>;
    /** Access token expiry (ISO 8601). */
    accessTokenExpiresAt: z.ZodString;
    /** Refresh token expiry (ISO 8601). */
    refreshTokenExpiresAt: z.ZodOptional<z.ZodString>;
    /** IP address the session was created from. */
    ipAddress: z.ZodOptional<z.ZodString>;
    /** User agent of the session. */
    userAgent: z.ZodOptional<z.ZodString>;
    /** Device fingerprint. */
    deviceFingerprint: z.ZodOptional<z.ZodString>;
    /** Products the session has access to. */
    authorizedProducts: z.ZodOptional<z.ZodArray<z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>, "many">>;
    /** ISO 8601 timestamp of session creation. */
    createdAt: z.ZodString;
    /** ISO 8601 timestamp of last activity. */
    lastActiveAt: z.ZodString;
    /** ISO 8601 timestamp of session revocation. */
    revokedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "revoked" | "expired" | "refreshing";
    id: string;
    userId: string;
    createdAt: string;
    provider: "custom" | "supabase" | "clerk" | "firebase" | "auth0" | "nextauth";
    method: "api_key" | "password" | "magic_link" | "oauth_google" | "oauth_github" | "oauth_facebook" | "oauth_apple" | "oauth_linkedin" | "oauth_twitter" | "sso_saml" | "sso_oidc" | "service_token" | "refresh_token";
    accessToken: string;
    accessTokenExpiresAt: string;
    lastActiveAt: string;
    revokedAt?: string | undefined;
    refreshToken?: string | undefined;
    refreshTokenExpiresAt?: string | undefined;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
    deviceFingerprint?: string | undefined;
    authorizedProducts?: ("portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach")[] | undefined;
}, {
    id: string;
    userId: string;
    createdAt: string;
    provider: "custom" | "supabase" | "clerk" | "firebase" | "auth0" | "nextauth";
    method: "api_key" | "password" | "magic_link" | "oauth_google" | "oauth_github" | "oauth_facebook" | "oauth_apple" | "oauth_linkedin" | "oauth_twitter" | "sso_saml" | "sso_oidc" | "service_token" | "refresh_token";
    accessToken: string;
    accessTokenExpiresAt: string;
    lastActiveAt: string;
    status?: "active" | "revoked" | "expired" | "refreshing" | undefined;
    revokedAt?: string | undefined;
    refreshToken?: string | undefined;
    refreshTokenExpiresAt?: string | undefined;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
    deviceFingerprint?: string | undefined;
    authorizedProducts?: ("portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach")[] | undefined;
}>;
export type AuthSession = z.infer<typeof AuthSessionSchema>;
/**
 * JWTPayload - Standard claims + ACD custom claims in the access token.
 */
export declare const JWTPayloadSchema: z.ZodObject<{
    /** Subject (user ID). */
    sub: z.ZodString;
    /** Issuer. */
    iss: z.ZodString;
    /** Audience (product IDs or service names). */
    aud: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
    /** Expiration time (unix epoch seconds). */
    exp: z.ZodNumber;
    /** Issued at (unix epoch seconds). */
    iat: z.ZodNumber;
    /** Not before (unix epoch seconds). */
    nbf: z.ZodOptional<z.ZodNumber>;
    /** JWT ID (unique token identifier). */
    jti: z.ZodOptional<z.ZodString>;
    /** User email. */
    email: z.ZodString;
    /** User display name. */
    name: z.ZodOptional<z.ZodString>;
    /** User role. */
    role: z.ZodEnum<["owner", "admin", "member", "viewer", "guest"]>;
    /** Products the user has active entitlements for. */
    products: z.ZodDefault<z.ZodArray<z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>, "many">>;
    /** Stripe customer ID. */
    stripeCustomerId: z.ZodOptional<z.ZodString>;
    /** Auth provider. */
    provider: z.ZodOptional<z.ZodEnum<["supabase", "clerk", "firebase", "auth0", "nextauth", "custom"]>>;
    /** Organization / team ID (for multi-tenant). */
    orgId: z.ZodOptional<z.ZodString>;
    /** Custom metadata claims. */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    sub: string;
    iss: string;
    aud: string | string[];
    exp: number;
    iat: number;
    email: string;
    role: "owner" | "admin" | "member" | "viewer" | "guest";
    products: ("portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach")[];
    orgId?: string | undefined;
    name?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    provider?: "custom" | "supabase" | "clerk" | "firebase" | "auth0" | "nextauth" | undefined;
    nbf?: number | undefined;
    jti?: string | undefined;
    stripeCustomerId?: string | undefined;
}, {
    sub: string;
    iss: string;
    aud: string | string[];
    exp: number;
    iat: number;
    email: string;
    role: "owner" | "admin" | "member" | "viewer" | "guest";
    orgId?: string | undefined;
    name?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    provider?: "custom" | "supabase" | "clerk" | "firebase" | "auth0" | "nextauth" | undefined;
    nbf?: number | undefined;
    jti?: string | undefined;
    products?: ("portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach")[] | undefined;
    stripeCustomerId?: string | undefined;
}>;
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;
/**
 * OAuth grant type.
 */
export declare const OAuthGrantTypeSchema: z.ZodEnum<["authorization_code", "client_credentials", "refresh_token", "device_code"]>;
export type OAuthGrantType = z.infer<typeof OAuthGrantTypeSchema>;
/**
 * OAuthConfig - Configuration for an OAuth 2.0 integration.
 */
export declare const OAuthConfigSchema: z.ZodObject<{
    /** Unique config identifier (UUID v4). */
    id: z.ZodString;
    /** Human-readable name for this OAuth config. */
    name: z.ZodString;
    /** The provider/service this config connects to. */
    provider: z.ZodString;
    /** OAuth client ID. */
    clientId: z.ZodString;
    /** OAuth client secret (should be stored encrypted). */
    clientSecret: z.ZodString;
    /** Authorization endpoint URL. */
    authorizationUrl: z.ZodString;
    /** Token endpoint URL. */
    tokenUrl: z.ZodString;
    /** Revocation endpoint URL. */
    revocationUrl: z.ZodOptional<z.ZodString>;
    /** User info endpoint URL. */
    userInfoUrl: z.ZodOptional<z.ZodString>;
    /** JWKS endpoint URL (for token verification). */
    jwksUrl: z.ZodOptional<z.ZodString>;
    /** Redirect URI after authorization. */
    redirectUri: z.ZodString;
    /** Requested scopes. */
    scopes: z.ZodArray<z.ZodString, "many">;
    /** Supported grant types. */
    grantTypes: z.ZodArray<z.ZodEnum<["authorization_code", "client_credentials", "refresh_token", "device_code"]>, "many">;
    /** Whether PKCE is required. */
    pkceRequired: z.ZodDefault<z.ZodBoolean>;
    /** State parameter for CSRF protection. */
    stateRequired: z.ZodDefault<z.ZodBoolean>;
    /** Whether this config is currently enabled. */
    enabled: z.ZodDefault<z.ZodBoolean>;
    /** Product this config belongs to. */
    productId: z.ZodOptional<z.ZodEnum<["portal28", "remotion", "waitlist_lab", "media_poster", "content_factory", "pct", "software_hub", "gap_radar", "blog_canvas", "canvas_cast", "shorts_linker", "vello_pad", "velvet_hold", "steady_letters", "ever_reach"]>>;
    /** ISO 8601 timestamp of creation. */
    createdAt: z.ZodString;
    /** ISO 8601 timestamp of last update. */
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    enabled: boolean;
    provider: string;
    clientId: string;
    clientSecret: string;
    authorizationUrl: string;
    tokenUrl: string;
    redirectUri: string;
    scopes: string[];
    grantTypes: ("refresh_token" | "authorization_code" | "client_credentials" | "device_code")[];
    pkceRequired: boolean;
    stateRequired: boolean;
    productId?: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach" | undefined;
    revocationUrl?: string | undefined;
    userInfoUrl?: string | undefined;
    jwksUrl?: string | undefined;
}, {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    provider: string;
    clientId: string;
    clientSecret: string;
    authorizationUrl: string;
    tokenUrl: string;
    redirectUri: string;
    scopes: string[];
    grantTypes: ("refresh_token" | "authorization_code" | "client_credentials" | "device_code")[];
    productId?: "portal28" | "remotion" | "waitlist_lab" | "media_poster" | "content_factory" | "pct" | "software_hub" | "gap_radar" | "blog_canvas" | "canvas_cast" | "shorts_linker" | "vello_pad" | "velvet_hold" | "steady_letters" | "ever_reach" | undefined;
    enabled?: boolean | undefined;
    revocationUrl?: string | undefined;
    userInfoUrl?: string | undefined;
    jwksUrl?: string | undefined;
    pkceRequired?: boolean | undefined;
    stateRequired?: boolean | undefined;
}>;
export type OAuthConfig = z.infer<typeof OAuthConfigSchema>;
//# sourceMappingURL=auth.d.ts.map