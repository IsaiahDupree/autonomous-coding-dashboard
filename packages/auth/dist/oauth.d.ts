/**
 * OAuth Utilities
 * ===============
 *
 * Shared helpers for OAuth 2.0 authorization code flow, token exchange,
 * refresh, revocation, and user info retrieval. Supports PKCE and state
 * parameters for CSRF protection.
 *
 * These utilities are provider-agnostic and work with any OAuth 2.0
 * compliant provider (Google, GitHub, Facebook, Apple, LinkedIn, etc.).
 */
/**
 * OAuth 2.0 provider configuration.
 */
export interface OAuthProviderConfig {
    /** OAuth client ID. */
    clientId: string;
    /** OAuth client secret. */
    clientSecret: string;
    /** Authorization endpoint URL. */
    authorizationUrl: string;
    /** Token endpoint URL. */
    tokenUrl: string;
    /** Redirect URI registered with the provider. */
    redirectUri: string;
    /** Requested scopes. */
    scopes: string[];
    /** Revocation endpoint URL (optional). */
    revocationUrl?: string;
    /** User info endpoint URL (optional). */
    userInfoUrl?: string;
    /** Whether to use PKCE (Proof Key for Code Exchange). */
    usePkce?: boolean;
}
/**
 * OAuth token response.
 */
export interface OAuthTokenResponse {
    /** Access token. */
    accessToken: string;
    /** Token type (typically "Bearer"). */
    tokenType: string;
    /** Access token expiry in seconds. */
    expiresIn?: number;
    /** Refresh token (if granted). */
    refreshToken?: string;
    /** Granted scopes (space-separated). */
    scope?: string;
    /** ID token (OpenID Connect). */
    idToken?: string;
}
/**
 * OAuth user profile.
 */
export interface OAuthUserInfo {
    /** Provider-specific user ID. */
    id: string;
    /** Email address. */
    email?: string;
    /** Whether email is verified. */
    emailVerified?: boolean;
    /** Display name. */
    name?: string;
    /** First / given name. */
    firstName?: string;
    /** Last / family name. */
    lastName?: string;
    /** Avatar / profile image URL. */
    avatarUrl?: string;
    /** Locale (e.g. "en-US"). */
    locale?: string;
    /** Raw profile data from the provider. */
    raw?: Record<string, unknown>;
}
/**
 * PKCE challenge pair.
 */
export interface PkceChallenge {
    /** The code verifier (random string). */
    codeVerifier: string;
    /** The code challenge (SHA-256 hash of verifier, base64url-encoded). */
    codeChallenge: string;
    /** Challenge method (always "S256"). */
    codeChallengeMethod: 'S256';
}
/**
 * Generate a PKCE code verifier and challenge pair.
 *
 * @returns `PkceChallenge` with verifier, challenge, and method
 */
export declare function generatePkceChallenge(): PkceChallenge;
/**
 * Build the OAuth 2.0 authorization URL that the user should be redirected to.
 *
 * @param config  - Provider configuration
 * @param options - Additional options (state, PKCE challenge, extra params)
 * @returns The fully-formed authorization URL string
 */
export declare function buildOAuthUrl(config: OAuthProviderConfig, options?: {
    state?: string;
    pkceChallenge?: PkceChallenge;
    extraParams?: Record<string, string>;
}): string;
/**
 * Exchange an authorization code for tokens.
 *
 * @param config       - Provider configuration
 * @param code         - The authorization code received from the callback
 * @param codeVerifier - PKCE code verifier (required if PKCE was used)
 * @returns `OAuthTokenResponse` with access token and optional refresh token
 */
export declare function exchangeCode(config: OAuthProviderConfig, code: string, codeVerifier?: string): Promise<OAuthTokenResponse>;
/**
 * Refresh an OAuth access token using a refresh token.
 *
 * @param config       - Provider configuration
 * @param refreshToken - The current refresh token
 * @returns `OAuthTokenResponse` with fresh tokens
 */
export declare function refreshOAuthToken(config: OAuthProviderConfig, refreshToken: string): Promise<OAuthTokenResponse>;
/**
 * Revoke an OAuth token (access or refresh).
 *
 * @param config - Provider configuration (must have `revocationUrl`)
 * @param token  - The token to revoke
 * @param tokenTypeHint - `"access_token"` or `"refresh_token"` (optional)
 */
export declare function revokeOAuthToken(config: OAuthProviderConfig, token: string, tokenTypeHint?: 'access_token' | 'refresh_token'): Promise<void>;
/**
 * Retrieve the authenticated user's profile from the OAuth provider.
 *
 * @param config      - Provider configuration (must have `userInfoUrl`)
 * @param accessToken - A valid access token
 * @returns `OAuthUserInfo` with the user's profile data
 */
export declare function getOAuthUserInfo(config: OAuthProviderConfig, accessToken: string): Promise<OAuthUserInfo>;
//# sourceMappingURL=oauth.d.ts.map