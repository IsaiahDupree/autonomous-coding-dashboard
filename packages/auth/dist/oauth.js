"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePkceChallenge = generatePkceChallenge;
exports.buildOAuthUrl = buildOAuthUrl;
exports.exchangeCode = exchangeCode;
exports.refreshOAuthToken = refreshOAuthToken;
exports.revokeOAuthToken = revokeOAuthToken;
exports.getOAuthUserInfo = getOAuthUserInfo;
const crypto_1 = __importDefault(require("crypto"));
const zod_1 = require("zod");
/** Zod schema for validating provider config. */
const OAuthProviderConfigSchema = zod_1.z.object({
    clientId: zod_1.z.string().min(1, 'clientId is required'),
    clientSecret: zod_1.z.string().min(1, 'clientSecret is required'),
    authorizationUrl: zod_1.z.string().url('authorizationUrl must be a valid URL'),
    tokenUrl: zod_1.z.string().url('tokenUrl must be a valid URL'),
    redirectUri: zod_1.z.string().url('redirectUri must be a valid URL'),
    scopes: zod_1.z.array(zod_1.z.string()).default([]),
    revocationUrl: zod_1.z.string().url().optional(),
    userInfoUrl: zod_1.z.string().url().optional(),
    usePkce: zod_1.z.boolean().optional().default(false),
});
// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------
/**
 * Generate a PKCE code verifier and challenge pair.
 *
 * @returns `PkceChallenge` with verifier, challenge, and method
 */
function generatePkceChallenge() {
    const codeVerifier = crypto_1.default.randomBytes(32).toString('base64url');
    const codeChallenge = crypto_1.default
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
function buildOAuthUrl(config, options = {}) {
    const validated = OAuthProviderConfigSchema.parse(config);
    const url = new URL(validated.authorizationUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', validated.clientId);
    url.searchParams.set('redirect_uri', validated.redirectUri);
    if (validated.scopes.length > 0) {
        url.searchParams.set('scope', validated.scopes.join(' '));
    }
    // State parameter for CSRF protection
    const state = options.state || crypto_1.default.randomBytes(16).toString('hex');
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
async function exchangeCode(config, code, codeVerifier) {
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
        throw new Error(`[acd/auth] OAuth token exchange failed (${response.status}): ${errorBody}`);
    }
    const data = (await response.json());
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
async function refreshOAuthToken(config, refreshToken) {
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
        throw new Error(`[acd/auth] OAuth token refresh failed (${response.status}): ${errorBody}`);
    }
    const data = (await response.json());
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
async function revokeOAuthToken(config, token, tokenTypeHint) {
    const validated = OAuthProviderConfigSchema.parse(config);
    if (!validated.revocationUrl) {
        throw new Error('[acd/auth] Revocation URL is not configured for this OAuth provider.');
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
        throw new Error(`[acd/auth] OAuth token revocation failed (${response.status}): ${errorBody}`);
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
async function getOAuthUserInfo(config, accessToken) {
    const validated = OAuthProviderConfigSchema.parse(config);
    if (!validated.userInfoUrl) {
        throw new Error('[acd/auth] User info URL is not configured for this OAuth provider.');
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
        throw new Error(`[acd/auth] Failed to fetch OAuth user info (${response.status}): ${errorBody}`);
    }
    const data = (await response.json());
    return normalizeUserInfo(data);
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
/**
 * Normalize a token response from various provider formats to our standard shape.
 */
function normalizeTokenResponse(data) {
    return {
        accessToken: data.access_token || '',
        tokenType: data.token_type || 'Bearer',
        expiresIn: data.expires_in != null ? Number(data.expires_in) : undefined,
        refreshToken: data.refresh_token || undefined,
        scope: data.scope || undefined,
        idToken: data.id_token || undefined,
    };
}
/**
 * Normalize user info from various provider formats to our standard shape.
 *
 * Handles common field name variations across Google, GitHub, Facebook,
 * LinkedIn, and generic OIDC providers.
 */
function normalizeUserInfo(data) {
    return {
        id: String(data.sub || data.id || data.user_id || ''),
        email: data.email || undefined,
        emailVerified: data.email_verified != null ? Boolean(data.email_verified) : undefined,
        name: data.name || data.display_name || undefined,
        firstName: data.given_name ||
            data.first_name ||
            data.firstName ||
            undefined,
        lastName: data.family_name ||
            data.last_name ||
            data.lastName ||
            undefined,
        avatarUrl: data.picture ||
            data.avatar_url ||
            data.profile_image_url ||
            undefined,
        locale: data.locale || undefined,
        raw: data,
    };
}
//# sourceMappingURL=oauth.js.map