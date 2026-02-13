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

import crypto from 'crypto';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

/** Zod schema for validating provider config. */
const OAuthProviderConfigSchema = z.object({
  clientId: z.string().min(1, 'clientId is required'),
  clientSecret: z.string().min(1, 'clientSecret is required'),
  authorizationUrl: z.string().url('authorizationUrl must be a valid URL'),
  tokenUrl: z.string().url('tokenUrl must be a valid URL'),
  redirectUri: z.string().url('redirectUri must be a valid URL'),
  scopes: z.array(z.string()).default([]),
  revocationUrl: z.string().url().optional(),
  userInfoUrl: z.string().url().optional(),
  usePkce: z.boolean().optional().default(false),
});

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

/**
 * Generate a PKCE code verifier and challenge pair.
 *
 * @returns `PkceChallenge` with verifier, challenge, and method
 */
export function generatePkceChallenge(): PkceChallenge {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  };
}

// ---------------------------------------------------------------------------
// Authorization URL
// ---------------------------------------------------------------------------

/**
 * Build the OAuth 2.0 authorization URL that the user should be redirected to.
 *
 * @param config  - Provider configuration
 * @param options - Additional options (state, PKCE challenge, extra params)
 * @returns The fully-formed authorization URL string
 */
export function buildOAuthUrl(
  config: OAuthProviderConfig,
  options: {
    state?: string;
    pkceChallenge?: PkceChallenge;
    extraParams?: Record<string, string>;
  } = {},
): string {
  const validated = OAuthProviderConfigSchema.parse(config);

  const url = new URL(validated.authorizationUrl);

  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', validated.clientId);
  url.searchParams.set('redirect_uri', validated.redirectUri);

  if (validated.scopes.length > 0) {
    url.searchParams.set('scope', validated.scopes.join(' '));
  }

  // State parameter for CSRF protection
  const state = options.state || crypto.randomBytes(16).toString('hex');
  url.searchParams.set('state', state);

  // PKCE parameters
  if (validated.usePkce || options.pkceChallenge) {
    const pkce = options.pkceChallenge || generatePkceChallenge();
    url.searchParams.set('code_challenge', pkce.codeChallenge);
    url.searchParams.set('code_challenge_method', pkce.codeChallengeMethod);
  }

  // Merge any extra parameters
  if (options.extraParams) {
    for (const [key, value] of Object.entries(options.extraParams)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

/**
 * Exchange an authorization code for tokens.
 *
 * @param config       - Provider configuration
 * @param code         - The authorization code received from the callback
 * @param codeVerifier - PKCE code verifier (required if PKCE was used)
 * @returns `OAuthTokenResponse` with access token and optional refresh token
 */
export async function exchangeCode(
  config: OAuthProviderConfig,
  code: string,
  codeVerifier?: string,
): Promise<OAuthTokenResponse> {
  const validated = OAuthProviderConfigSchema.parse(config);

  if (!code) {
    throw new Error('[acd/auth] Authorization code is required.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: validated.redirectUri,
    client_id: validated.clientId,
    client_secret: validated.clientSecret,
  });

  if (codeVerifier) {
    body.set('code_verifier', codeVerifier);
  }

  const response = await fetch(validated.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `[acd/auth] OAuth token exchange failed (${response.status}): ${errorBody}`,
    );
  }

  const data = (await response.json()) as Record<string, unknown>;

  return normalizeTokenResponse(data);
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

/**
 * Refresh an OAuth access token using a refresh token.
 *
 * @param config       - Provider configuration
 * @param refreshToken - The current refresh token
 * @returns `OAuthTokenResponse` with fresh tokens
 */
export async function refreshOAuthToken(
  config: OAuthProviderConfig,
  refreshToken: string,
): Promise<OAuthTokenResponse> {
  const validated = OAuthProviderConfigSchema.parse(config);

  if (!refreshToken) {
    throw new Error('[acd/auth] Refresh token is required.');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: validated.clientId,
    client_secret: validated.clientSecret,
  });

  const response = await fetch(validated.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `[acd/auth] OAuth token refresh failed (${response.status}): ${errorBody}`,
    );
  }

  const data = (await response.json()) as Record<string, unknown>;

  return normalizeTokenResponse(data);
}

// ---------------------------------------------------------------------------
// Token revocation
// ---------------------------------------------------------------------------

/**
 * Revoke an OAuth token (access or refresh).
 *
 * @param config - Provider configuration (must have `revocationUrl`)
 * @param token  - The token to revoke
 * @param tokenTypeHint - `"access_token"` or `"refresh_token"` (optional)
 */
export async function revokeOAuthToken(
  config: OAuthProviderConfig,
  token: string,
  tokenTypeHint?: 'access_token' | 'refresh_token',
): Promise<void> {
  const validated = OAuthProviderConfigSchema.parse(config);

  if (!validated.revocationUrl) {
    throw new Error(
      '[acd/auth] Revocation URL is not configured for this OAuth provider.',
    );
  }

  if (!token) {
    throw new Error('[acd/auth] Token is required for revocation.');
  }

  const body = new URLSearchParams({
    token,
    client_id: validated.clientId,
    client_secret: validated.clientSecret,
  });

  if (tokenTypeHint) {
    body.set('token_type_hint', tokenTypeHint);
  }

  const response = await fetch(validated.revocationUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  // RFC 7009: revocation endpoint SHOULD return 200 even if token is invalid
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `[acd/auth] OAuth token revocation failed (${response.status}): ${errorBody}`,
    );
  }
}

// ---------------------------------------------------------------------------
// User info
// ---------------------------------------------------------------------------

/**
 * Retrieve the authenticated user's profile from the OAuth provider.
 *
 * @param config      - Provider configuration (must have `userInfoUrl`)
 * @param accessToken - A valid access token
 * @returns `OAuthUserInfo` with the user's profile data
 */
export async function getOAuthUserInfo(
  config: OAuthProviderConfig,
  accessToken: string,
): Promise<OAuthUserInfo> {
  const validated = OAuthProviderConfigSchema.parse(config);

  if (!validated.userInfoUrl) {
    throw new Error(
      '[acd/auth] User info URL is not configured for this OAuth provider.',
    );
  }

  if (!accessToken) {
    throw new Error('[acd/auth] Access token is required to fetch user info.');
  }

  const response = await fetch(validated.userInfoUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `[acd/auth] Failed to fetch OAuth user info (${response.status}): ${errorBody}`,
    );
  }

  const data = (await response.json()) as Record<string, unknown>;

  return normalizeUserInfo(data);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a token response from various provider formats to our standard shape.
 */
function normalizeTokenResponse(data: Record<string, unknown>): OAuthTokenResponse {
  return {
    accessToken: (data.access_token as string) || '',
    tokenType: (data.token_type as string) || 'Bearer',
    expiresIn: data.expires_in != null ? Number(data.expires_in) : undefined,
    refreshToken: (data.refresh_token as string) || undefined,
    scope: (data.scope as string) || undefined,
    idToken: (data.id_token as string) || undefined,
  };
}

/**
 * Normalize user info from various provider formats to our standard shape.
 *
 * Handles common field name variations across Google, GitHub, Facebook,
 * LinkedIn, and generic OIDC providers.
 */
function normalizeUserInfo(data: Record<string, unknown>): OAuthUserInfo {
  return {
    id: String(
      data.sub || data.id || data.user_id || '',
    ),
    email: (data.email as string) || undefined,
    emailVerified:
      data.email_verified != null ? Boolean(data.email_verified) : undefined,
    name: (data.name as string) || (data.display_name as string) || undefined,
    firstName:
      (data.given_name as string) ||
      (data.first_name as string) ||
      (data.firstName as string) ||
      undefined,
    lastName:
      (data.family_name as string) ||
      (data.last_name as string) ||
      (data.lastName as string) ||
      undefined,
    avatarUrl:
      (data.picture as string) ||
      (data.avatar_url as string) ||
      (data.profile_image_url as string) ||
      undefined,
    locale: (data.locale as string) || undefined,
    raw: data,
  };
}
