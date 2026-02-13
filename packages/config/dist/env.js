"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSupabaseEnv = parseSupabaseEnv;
exports.parseStripeEnv = parseStripeEnv;
exports.parseRemotionEnv = parseRemotionEnv;
exports.parseMetaEnv = parseMetaEnv;
exports.parseEmailEnv = parseEmailEnv;
exports.parseStorageEnv = parseStorageEnv;
exports.parseRedisEnv = parseRedisEnv;
exports.parseAuthEnv = parseAuthEnv;
exports.parseTikTokEnv = parseTikTokEnv;
exports.parseGeneralEnv = parseGeneralEnv;
exports.parseFeatureFlagsEnv = parseFeatureFlagsEnv;
exports.parseFullEnv = parseFullEnv;
const zod_1 = require("zod");
require("dotenv/config");
// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------
const supabaseSchema = zod_1.z.object({
    SUPABASE_URL: zod_1.z.string().url(),
    SUPABASE_ANON_KEY: zod_1.z.string().min(1),
    SUPABASE_SERVICE_KEY: zod_1.z.string().min(1).optional(),
});
function parseSupabaseEnv(env = process.env) {
    return supabaseSchema.parse(env);
}
// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------
const stripeSchema = zod_1.z.object({
    STRIPE_SECRET_KEY: zod_1.z.string().min(1),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string().min(1).optional(),
    STRIPE_PUBLISHABLE_KEY: zod_1.z.string().min(1).optional(),
});
function parseStripeEnv(env = process.env) {
    return stripeSchema.parse(env);
}
// ---------------------------------------------------------------------------
// Remotion API
// ---------------------------------------------------------------------------
const remotionSchema = zod_1.z.object({
    REMOTION_API_URL: zod_1.z.string().url().optional(),
    REMOTION_API_KEY: zod_1.z.string().min(1).optional(),
});
function parseRemotionEnv(env = process.env) {
    return remotionSchema.parse(env);
}
// ---------------------------------------------------------------------------
// Meta API
// ---------------------------------------------------------------------------
const metaSchema = zod_1.z.object({
    META_HUB_URL: zod_1.z.string().url().optional(),
    META_HUB_KEY: zod_1.z.string().min(1).optional(),
    META_ACCESS_TOKEN: zod_1.z.string().min(1).optional(),
    META_PIXEL_ID: zod_1.z.string().min(1).optional(),
    META_APP_SECRET: zod_1.z.string().min(1).optional(),
});
function parseMetaEnv(env = process.env) {
    return metaSchema.parse(env);
}
// ---------------------------------------------------------------------------
// Email (Resend)
// ---------------------------------------------------------------------------
const emailSchema = zod_1.z.object({
    RESEND_API_KEY: zod_1.z.string().min(1).optional(),
});
function parseEmailEnv(env = process.env) {
    return emailSchema.parse(env);
}
// ---------------------------------------------------------------------------
// Storage (R2 / CDN)
// ---------------------------------------------------------------------------
const storageSchema = zod_1.z.object({
    R2_BUCKET: zod_1.z.string().min(1).optional(),
    R2_ACCESS_KEY: zod_1.z.string().min(1).optional(),
    R2_SECRET_KEY: zod_1.z.string().min(1).optional(),
    CDN_URL: zod_1.z.string().url().optional(),
    R2_ENDPOINT: zod_1.z.string().url().optional(),
});
function parseStorageEnv(env = process.env) {
    return storageSchema.parse(env);
}
// ---------------------------------------------------------------------------
// Redis
// ---------------------------------------------------------------------------
const redisSchema = zod_1.z.object({
    REDIS_URL: zod_1.z.string().url().optional(),
});
function parseRedisEnv(env = process.env) {
    return redisSchema.parse(env);
}
// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
const authSchema = zod_1.z.object({
    JWT_SECRET: zod_1.z.string().min(1),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    COOKIE_DOMAIN: zod_1.z.string().optional(),
});
function parseAuthEnv(env = process.env) {
    return authSchema.parse(env);
}
// ---------------------------------------------------------------------------
// TikTok
// ---------------------------------------------------------------------------
const tiktokSchema = zod_1.z.object({
    TIKTOK_CLIENT_KEY: zod_1.z.string().min(1).optional(),
    TIKTOK_CLIENT_SECRET: zod_1.z.string().min(1).optional(),
});
function parseTikTokEnv(env = process.env) {
    return tiktokSchema.parse(env);
}
// ---------------------------------------------------------------------------
// General
// ---------------------------------------------------------------------------
const generalSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: zod_1.z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});
function parseGeneralEnv(env = process.env) {
    return generalSchema.parse(env);
}
// ---------------------------------------------------------------------------
// Feature Flags
// ---------------------------------------------------------------------------
const boolFlag = zod_1.z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .pipe(zod_1.z.boolean())
    .or(zod_1.z.boolean())
    .default(false);
const featureFlagsSchema = zod_1.z.object({
    META_CAPI_INGEST_ENABLED: boolFlag,
    SEGMENT_ENGINE_META_CAPI_ENABLED: boolFlag,
    SHARED_PERSON_TABLE_ENABLED: boolFlag,
    META_PIXEL_ENABLED: boolFlag,
    CONVERSION_TRACKING_ENABLED: boolFlag,
    META_CAPI_FORWARD_ENABLED: boolFlag,
    META_CUSTOM_AUDIENCE_SYNC_ENABLED: boolFlag,
    ACD_META_INSIGHTS_ENABLED: boolFlag,
});
function parseFeatureFlagsEnv(env = process.env) {
    return featureFlagsSchema.parse(env);
}
// ---------------------------------------------------------------------------
// Full environment (all schemas combined)
// ---------------------------------------------------------------------------
const fullEnvSchema = zod_1.z.object({
    ...supabaseSchema.shape,
    ...stripeSchema.shape,
    ...remotionSchema.shape,
    ...metaSchema.shape,
    ...emailSchema.shape,
    ...storageSchema.shape,
    ...redisSchema.shape,
    ...authSchema.shape,
    ...tiktokSchema.shape,
    ...generalSchema.shape,
    ...featureFlagsSchema.shape,
});
function parseFullEnv(env = process.env) {
    return fullEnvSchema.parse(env);
}
//# sourceMappingURL=env.js.map