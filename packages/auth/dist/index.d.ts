/**
 * @acd/auth - Shared Authentication Utilities
 * ============================================
 *
 * Barrel export for the @acd/auth package. Provides shared authentication,
 * authorization, cryptography, session management, OAuth, and Stripe
 * integrations for all ACD products.
 *
 * @example
 * ```ts
 * import {
 *   createSession,
 *   validateSession,
 *   authMiddleware,
 *   hashPassword,
 *   verifyPassword,
 *   createSupabaseClient,
 * } from '@acd/auth';
 * ```
 */
export { createSupabaseClient, createSupabaseAdmin, getSharedSupabaseConfig, } from './supabase';
export type { SupabaseConfig } from './supabase';
export { generateAccessToken, generateRefreshToken, verifyToken, decodeToken, rotateTokenPair, JWTPayloadSchema, JWTError, } from './jwt';
export type { JWTPayload, JWTErrorCode, TokenPair, } from './jwt';
export { hashPassword, verifyPassword, encryptApiKey, decryptApiKey, generateApiKey, hashForMeta, generateHmac, verifyHmac, } from './crypto';
export type { GeneratedApiKey } from './crypto';
export { createSession, validateSession, refreshSession, revokeSession, getCookieConfig, } from './session';
export type { SessionMetadata, SessionTokens, CookieOptions, } from './session';
export { authMiddleware, requireRole, requireProduct, rateLimitMiddleware, csrfProtection, cspHeaders, } from './middleware';
export type { AuthenticatedRequest, AuthMiddlewareOptions, RateLimitConfig, } from './middleware';
export { buildOAuthUrl, exchangeCode, refreshOAuthToken, revokeOAuthToken, getOAuthUserInfo, generatePkceChallenge, } from './oauth';
export type { OAuthProviderConfig, OAuthTokenResponse, OAuthUserInfo, PkceChallenge, } from './oauth';
export { getOrCreateStripeCustomer, linkStripeCustomer, createSubscription, cancelSubscription, getBillingPortalUrl, handleStripeWebhook, syncEntitlementFromStripe, } from './stripe';
export type { StripeSubscription, StripeEvent, SyncedEntitlement, } from './stripe';
//# sourceMappingURL=index.d.ts.map