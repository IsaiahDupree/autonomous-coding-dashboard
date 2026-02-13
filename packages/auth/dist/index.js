"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncEntitlementFromStripe = exports.handleStripeWebhook = exports.getBillingPortalUrl = exports.cancelSubscription = exports.createSubscription = exports.linkStripeCustomer = exports.getOrCreateStripeCustomer = exports.generatePkceChallenge = exports.getOAuthUserInfo = exports.revokeOAuthToken = exports.refreshOAuthToken = exports.exchangeCode = exports.buildOAuthUrl = exports.cspHeaders = exports.csrfProtection = exports.rateLimitMiddleware = exports.requireProduct = exports.requireRole = exports.authMiddleware = exports.getCookieConfig = exports.revokeSession = exports.refreshSession = exports.validateSession = exports.createSession = exports.verifyHmac = exports.generateHmac = exports.hashForMeta = exports.generateApiKey = exports.decryptApiKey = exports.encryptApiKey = exports.verifyPassword = exports.hashPassword = exports.JWTError = exports.JWTPayloadSchema = exports.rotateTokenPair = exports.decodeToken = exports.verifyToken = exports.generateRefreshToken = exports.generateAccessToken = exports.getSharedSupabaseConfig = exports.createSupabaseAdmin = exports.createSupabaseClient = void 0;
// ---------------------------------------------------------------------------
// Supabase client factory
// ---------------------------------------------------------------------------
var supabase_1 = require("./supabase");
Object.defineProperty(exports, "createSupabaseClient", { enumerable: true, get: function () { return supabase_1.createSupabaseClient; } });
Object.defineProperty(exports, "createSupabaseAdmin", { enumerable: true, get: function () { return supabase_1.createSupabaseAdmin; } });
Object.defineProperty(exports, "getSharedSupabaseConfig", { enumerable: true, get: function () { return supabase_1.getSharedSupabaseConfig; } });
// ---------------------------------------------------------------------------
// JWT utilities
// ---------------------------------------------------------------------------
var jwt_1 = require("./jwt");
Object.defineProperty(exports, "generateAccessToken", { enumerable: true, get: function () { return jwt_1.generateAccessToken; } });
Object.defineProperty(exports, "generateRefreshToken", { enumerable: true, get: function () { return jwt_1.generateRefreshToken; } });
Object.defineProperty(exports, "verifyToken", { enumerable: true, get: function () { return jwt_1.verifyToken; } });
Object.defineProperty(exports, "decodeToken", { enumerable: true, get: function () { return jwt_1.decodeToken; } });
Object.defineProperty(exports, "rotateTokenPair", { enumerable: true, get: function () { return jwt_1.rotateTokenPair; } });
Object.defineProperty(exports, "JWTPayloadSchema", { enumerable: true, get: function () { return jwt_1.JWTPayloadSchema; } });
Object.defineProperty(exports, "JWTError", { enumerable: true, get: function () { return jwt_1.JWTError; } });
// ---------------------------------------------------------------------------
// Cryptographic utilities
// ---------------------------------------------------------------------------
var crypto_1 = require("./crypto");
Object.defineProperty(exports, "hashPassword", { enumerable: true, get: function () { return crypto_1.hashPassword; } });
Object.defineProperty(exports, "verifyPassword", { enumerable: true, get: function () { return crypto_1.verifyPassword; } });
Object.defineProperty(exports, "encryptApiKey", { enumerable: true, get: function () { return crypto_1.encryptApiKey; } });
Object.defineProperty(exports, "decryptApiKey", { enumerable: true, get: function () { return crypto_1.decryptApiKey; } });
Object.defineProperty(exports, "generateApiKey", { enumerable: true, get: function () { return crypto_1.generateApiKey; } });
Object.defineProperty(exports, "hashForMeta", { enumerable: true, get: function () { return crypto_1.hashForMeta; } });
Object.defineProperty(exports, "generateHmac", { enumerable: true, get: function () { return crypto_1.generateHmac; } });
Object.defineProperty(exports, "verifyHmac", { enumerable: true, get: function () { return crypto_1.verifyHmac; } });
// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------
var session_1 = require("./session");
Object.defineProperty(exports, "createSession", { enumerable: true, get: function () { return session_1.createSession; } });
Object.defineProperty(exports, "validateSession", { enumerable: true, get: function () { return session_1.validateSession; } });
Object.defineProperty(exports, "refreshSession", { enumerable: true, get: function () { return session_1.refreshSession; } });
Object.defineProperty(exports, "revokeSession", { enumerable: true, get: function () { return session_1.revokeSession; } });
Object.defineProperty(exports, "getCookieConfig", { enumerable: true, get: function () { return session_1.getCookieConfig; } });
// ---------------------------------------------------------------------------
// Express middleware
// ---------------------------------------------------------------------------
var middleware_1 = require("./middleware");
Object.defineProperty(exports, "authMiddleware", { enumerable: true, get: function () { return middleware_1.authMiddleware; } });
Object.defineProperty(exports, "requireRole", { enumerable: true, get: function () { return middleware_1.requireRole; } });
Object.defineProperty(exports, "requireProduct", { enumerable: true, get: function () { return middleware_1.requireProduct; } });
Object.defineProperty(exports, "rateLimitMiddleware", { enumerable: true, get: function () { return middleware_1.rateLimitMiddleware; } });
Object.defineProperty(exports, "csrfProtection", { enumerable: true, get: function () { return middleware_1.csrfProtection; } });
Object.defineProperty(exports, "cspHeaders", { enumerable: true, get: function () { return middleware_1.cspHeaders; } });
// ---------------------------------------------------------------------------
// OAuth utilities
// ---------------------------------------------------------------------------
var oauth_1 = require("./oauth");
Object.defineProperty(exports, "buildOAuthUrl", { enumerable: true, get: function () { return oauth_1.buildOAuthUrl; } });
Object.defineProperty(exports, "exchangeCode", { enumerable: true, get: function () { return oauth_1.exchangeCode; } });
Object.defineProperty(exports, "refreshOAuthToken", { enumerable: true, get: function () { return oauth_1.refreshOAuthToken; } });
Object.defineProperty(exports, "revokeOAuthToken", { enumerable: true, get: function () { return oauth_1.revokeOAuthToken; } });
Object.defineProperty(exports, "getOAuthUserInfo", { enumerable: true, get: function () { return oauth_1.getOAuthUserInfo; } });
Object.defineProperty(exports, "generatePkceChallenge", { enumerable: true, get: function () { return oauth_1.generatePkceChallenge; } });
// ---------------------------------------------------------------------------
// Stripe customer management
// ---------------------------------------------------------------------------
var stripe_1 = require("./stripe");
Object.defineProperty(exports, "getOrCreateStripeCustomer", { enumerable: true, get: function () { return stripe_1.getOrCreateStripeCustomer; } });
Object.defineProperty(exports, "linkStripeCustomer", { enumerable: true, get: function () { return stripe_1.linkStripeCustomer; } });
Object.defineProperty(exports, "createSubscription", { enumerable: true, get: function () { return stripe_1.createSubscription; } });
Object.defineProperty(exports, "cancelSubscription", { enumerable: true, get: function () { return stripe_1.cancelSubscription; } });
Object.defineProperty(exports, "getBillingPortalUrl", { enumerable: true, get: function () { return stripe_1.getBillingPortalUrl; } });
Object.defineProperty(exports, "handleStripeWebhook", { enumerable: true, get: function () { return stripe_1.handleStripeWebhook; } });
Object.defineProperty(exports, "syncEntitlementFromStripe", { enumerable: true, get: function () { return stripe_1.syncEntitlementFromStripe; } });
//# sourceMappingURL=index.js.map