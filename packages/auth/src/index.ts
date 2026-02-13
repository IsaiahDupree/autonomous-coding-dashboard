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

// ---------------------------------------------------------------------------
// Supabase client factory
// ---------------------------------------------------------------------------
export {
  createSupabaseClient,
  createSupabaseAdmin,
  getSharedSupabaseConfig,
} from './supabase';

export type { SupabaseConfig } from './supabase';

// ---------------------------------------------------------------------------
// JWT utilities
// ---------------------------------------------------------------------------
export {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  rotateTokenPair,
  JWTPayloadSchema,
  JWTError,
} from './jwt';

export type {
  JWTPayload,
  JWTErrorCode,
  TokenPair,
} from './jwt';

// ---------------------------------------------------------------------------
// Cryptographic utilities
// ---------------------------------------------------------------------------
export {
  hashPassword,
  verifyPassword,
  encryptApiKey,
  decryptApiKey,
  generateApiKey,
  hashForMeta,
  generateHmac,
  verifyHmac,
} from './crypto';

export type { GeneratedApiKey } from './crypto';

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------
export {
  createSession,
  validateSession,
  refreshSession,
  revokeSession,
  getCookieConfig,
} from './session';

export type {
  SessionMetadata,
  SessionTokens,
  CookieOptions,
} from './session';

// ---------------------------------------------------------------------------
// Express middleware
// ---------------------------------------------------------------------------
export {
  authMiddleware,
  requireRole,
  requireProduct,
  rateLimitMiddleware,
  csrfProtection,
  cspHeaders,
} from './middleware';

export type {
  AuthenticatedRequest,
  AuthMiddlewareOptions,
  RateLimitConfig,
} from './middleware';

// ---------------------------------------------------------------------------
// OAuth utilities
// ---------------------------------------------------------------------------
export {
  buildOAuthUrl,
  exchangeCode,
  refreshOAuthToken,
  revokeOAuthToken,
  getOAuthUserInfo,
  generatePkceChallenge,
} from './oauth';

export type {
  OAuthProviderConfig,
  OAuthTokenResponse,
  OAuthUserInfo,
  PkceChallenge,
} from './oauth';

// ---------------------------------------------------------------------------
// Stripe customer management
// ---------------------------------------------------------------------------
export {
  getOrCreateStripeCustomer,
  linkStripeCustomer,
  createSubscription,
  cancelSubscription,
  getBillingPortalUrl,
  handleStripeWebhook,
  syncEntitlementFromStripe,
} from './stripe';

export type {
  StripeSubscription,
  StripeEvent,
  SyncedEntitlement,
} from './stripe';
