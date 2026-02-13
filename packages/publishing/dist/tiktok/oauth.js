"use strict";
/**
 * CF-TIKTOK-001: TikTok OAuth Service
 *
 * Implements TikTok Login Kit v2 OAuth flow for obtaining
 * access tokens on behalf of TikTok creators.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokOAuthService = void 0;
const TIKTOK_AUTH_BASE = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';
class TikTokOAuthService {
    constructor(config) {
        this.clientKey = config.clientKey;
        this.clientSecret = config.clientSecret;
        this.redirectUri = config.redirectUri;
    }
    /**
     * Builds the TikTok OAuth authorization URL that the user should be
     * redirected to in order to grant permission.
     */
    getAuthorizationUrl(scopes, state) {
        const params = new URLSearchParams({
            client_key: this.clientKey,
            scope: scopes.join(','),
            response_type: 'code',
            redirect_uri: this.redirectUri,
            state,
        });
        return `${TIKTOK_AUTH_BASE}?${params.toString()}`;
    }
    /**
     * Exchanges an authorization code for an access token.
     */
    async exchangeCode(code) {
        const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_key: this.clientKey,
                client_secret: this.clientSecret,
                code,
                grant_type: 'authorization_code',
                redirect_uri: this.redirectUri,
            }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`TikTok token exchange failed (${response.status}): ${errorBody}`);
        }
        const data = (await response.json());
        return data.data;
    }
    /**
     * Refreshes an expired access token using a refresh token.
     */
    async refreshToken(refreshToken) {
        const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_key: this.clientKey,
                client_secret: this.clientSecret,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`TikTok token refresh failed (${response.status}): ${errorBody}`);
        }
        const data = (await response.json());
        return data.data;
    }
    /**
     * Fetches the authenticated TikTok user's profile information.
     */
    async getUserInfo(accessToken) {
        const fields = [
            'open_id',
            'union_id',
            'avatar_url',
            'display_name',
            'bio_description',
            'profile_deep_link',
            'is_verified',
            'follower_count',
            'following_count',
            'likes_count',
            'video_count',
        ].join(',');
        const response = await fetch(`${TIKTOK_API_BASE}/user/info/?fields=${fields}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`TikTok getUserInfo failed (${response.status}): ${errorBody}`);
        }
        const data = (await response.json());
        return data.data.user;
    }
    /**
     * Revokes a previously issued access token.
     */
    async revokeToken(accessToken) {
        const response = await fetch(`${TIKTOK_API_BASE}/oauth/revoke/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_key: this.clientKey,
                token: accessToken,
            }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`TikTok token revoke failed (${response.status}): ${errorBody}`);
        }
    }
}
exports.TikTokOAuthService = TikTokOAuthService;
//# sourceMappingURL=oauth.js.map