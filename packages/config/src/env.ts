import { z } from 'zod';
import 'dotenv/config';

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------
const supabaseSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1).optional(),
});

export type SupabaseEnv = z.infer<typeof supabaseSchema>;

export function parseSupabaseEnv(env: Record<string, string | undefined> = process.env): SupabaseEnv {
  return supabaseSchema.parse(env);
}

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------
const stripeSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
});

export type StripeEnv = z.infer<typeof stripeSchema>;

export function parseStripeEnv(env: Record<string, string | undefined> = process.env): StripeEnv {
  return stripeSchema.parse(env);
}

// ---------------------------------------------------------------------------
// Remotion API
// ---------------------------------------------------------------------------
const remotionSchema = z.object({
  REMOTION_API_URL: z.string().url().optional(),
  REMOTION_API_KEY: z.string().min(1).optional(),
});

export type RemotionEnv = z.infer<typeof remotionSchema>;

export function parseRemotionEnv(env: Record<string, string | undefined> = process.env): RemotionEnv {
  return remotionSchema.parse(env);
}

// ---------------------------------------------------------------------------
// Meta API
// ---------------------------------------------------------------------------
const metaSchema = z.object({
  META_HUB_URL: z.string().url().optional(),
  META_HUB_KEY: z.string().min(1).optional(),
  META_ACCESS_TOKEN: z.string().min(1).optional(),
  META_PIXEL_ID: z.string().min(1).optional(),
  META_APP_SECRET: z.string().min(1).optional(),
});

export type MetaEnv = z.infer<typeof metaSchema>;

export function parseMetaEnv(env: Record<string, string | undefined> = process.env): MetaEnv {
  return metaSchema.parse(env);
}

// ---------------------------------------------------------------------------
// Email (Resend)
// ---------------------------------------------------------------------------
const emailSchema = z.object({
  RESEND_API_KEY: z.string().min(1).optional(),
});

export type EmailEnv = z.infer<typeof emailSchema>;

export function parseEmailEnv(env: Record<string, string | undefined> = process.env): EmailEnv {
  return emailSchema.parse(env);
}

// ---------------------------------------------------------------------------
// Storage (R2 / CDN)
// ---------------------------------------------------------------------------
const storageSchema = z.object({
  R2_BUCKET: z.string().min(1).optional(),
  R2_ACCESS_KEY: z.string().min(1).optional(),
  R2_SECRET_KEY: z.string().min(1).optional(),
  CDN_URL: z.string().url().optional(),
  R2_ENDPOINT: z.string().url().optional(),
});

export type StorageEnv = z.infer<typeof storageSchema>;

export function parseStorageEnv(env: Record<string, string | undefined> = process.env): StorageEnv {
  return storageSchema.parse(env);
}

// ---------------------------------------------------------------------------
// Redis
// ---------------------------------------------------------------------------
const redisSchema = z.object({
  REDIS_URL: z.string().url().optional(),
});

export type RedisEnv = z.infer<typeof redisSchema>;

export function parseRedisEnv(env: Record<string, string | undefined> = process.env): RedisEnv {
  return redisSchema.parse(env);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
const authSchema = z.object({
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_DOMAIN: z.string().optional(),
});

export type AuthEnv = z.infer<typeof authSchema>;

export function parseAuthEnv(env: Record<string, string | undefined> = process.env): AuthEnv {
  return authSchema.parse(env);
}

// ---------------------------------------------------------------------------
// TikTok
// ---------------------------------------------------------------------------
const tiktokSchema = z.object({
  TIKTOK_CLIENT_KEY: z.string().min(1).optional(),
  TIKTOK_CLIENT_SECRET: z.string().min(1).optional(),
});

export type TikTokEnv = z.infer<typeof tiktokSchema>;

export function parseTikTokEnv(env: Record<string, string | undefined> = process.env): TikTokEnv {
  return tiktokSchema.parse(env);
}

// ---------------------------------------------------------------------------
// General
// ---------------------------------------------------------------------------
const generalSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type GeneralEnv = z.infer<typeof generalSchema>;

export function parseGeneralEnv(env: Record<string, string | undefined> = process.env): GeneralEnv {
  return generalSchema.parse(env);
}

// ---------------------------------------------------------------------------
// Feature Flags
// ---------------------------------------------------------------------------
const boolFlag = z
  .string()
  .transform((v) => v === 'true' || v === '1')
  .pipe(z.boolean())
  .or(z.boolean())
  .default(false);

const featureFlagsSchema = z.object({
  META_CAPI_INGEST_ENABLED: boolFlag,
  SEGMENT_ENGINE_META_CAPI_ENABLED: boolFlag,
  SHARED_PERSON_TABLE_ENABLED: boolFlag,
  META_PIXEL_ENABLED: boolFlag,
  CONVERSION_TRACKING_ENABLED: boolFlag,
  META_CAPI_FORWARD_ENABLED: boolFlag,
  META_CUSTOM_AUDIENCE_SYNC_ENABLED: boolFlag,
  ACD_META_INSIGHTS_ENABLED: boolFlag,
});

export type FeatureFlagsEnv = z.infer<typeof featureFlagsSchema>;

export function parseFeatureFlagsEnv(env: Record<string, string | undefined> = process.env): FeatureFlagsEnv {
  return featureFlagsSchema.parse(env);
}

// ---------------------------------------------------------------------------
// Full environment (all schemas combined)
// ---------------------------------------------------------------------------
const fullEnvSchema = z.object({
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

export type FullEnv = z.infer<typeof fullEnvSchema>;

export function parseFullEnv(env: Record<string, string | undefined> = process.env): FullEnv {
  return fullEnvSchema.parse(env);
}
