/**
 * CF-TIKTOK-001: TikTok OAuth Service
 *
 * Implements TikTok Login Kit v2 OAuth flow for obtaining
 * access tokens on behalf of TikTok creators.
 */
import type { TikTokTokenResponse, TikTokUserInfo } from '../types';
export declare class TikTokOAuthService {
    private readonly clientKey;
    private readonly clientSecret;
    private readonly redirectUri;
    constructor(config: {
        clientKey: string;
        clientSecret: string;
        redirectUri: string;
    });
    /**
     * Builds the TikTok OAuth authorization URL that the user should be
     * redirected to in order to grant permission.
     */
    getAuthorizationUrl(scopes: string[], state: string): string;
    /**
     * Exchanges an authorization code for an access token.
     */
    exchangeCode(code: string): Promise<TikTokTokenResponse>;
    /**
     * Refreshes an expired access token using a refresh token.
     */
    refreshToken(refreshToken: string): Promise<TikTokTokenResponse>;
    /**
     * Fetches the authenticated TikTok user's profile information.
     */
    getUserInfo(accessToken: string): Promise<TikTokUserInfo>;
    /**
     * Revokes a previously issued access token.
     */
    revokeToken(accessToken: string): Promise<void>;
}
//# sourceMappingURL=oauth.d.ts.map