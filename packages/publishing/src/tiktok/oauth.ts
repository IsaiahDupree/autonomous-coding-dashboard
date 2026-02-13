/**
 * CF-TIKTOK-001: TikTok OAuth Service
 *
 * Implements TikTok Login Kit v2 OAuth flow for obtaining
 * access tokens on behalf of TikTok creators.
 */

import type { TikTokTokenResponse, TikTokUserInfo } from '../types';

const TIKTOK_AUTH_BASE = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

export class TikTokOAuthService {
  private readonly clientKey: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(config: { clientKey: string; clientSecret: string; redirectUri: string }) {
    this.clientKey = config.clientKey;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
  }

  /**
   * Builds the TikTok OAuth authorization URL that the user should be
   * redirected to in order to grant permission.
   */
  getAuthorizationUrl(scopes: string[], state: string): string {
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
  async exchangeCode(code: string): Promise<TikTokTokenResponse> {
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

    const data = (await response.json()) as { data: TikTokTokenResponse };
    return data.data;
  }

  /**
   * Refreshes an expired access token using a refresh token.
   */
  async refreshToken(refreshToken: string): Promise<TikTokTokenResponse> {
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

    const data = (await response.json()) as { data: TikTokTokenResponse };
    return data.data;
  }

  /**
   * Fetches the authenticated TikTok user's profile information.
   */
  async getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
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

    const response = await fetch(
      `${TIKTOK_API_BASE}/user/info/?fields=${fields}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`TikTok getUserInfo failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as { data: { user: TikTokUserInfo } };
    return data.data.user;
  }

  /**
   * Revokes a previously issued access token.
   */
  async revokeToken(accessToken: string): Promise<void> {
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
