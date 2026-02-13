import { z } from 'zod';
import 'dotenv/config';
declare const supabaseSchema: z.ZodObject<{
    SUPABASE_URL: z.ZodString;
    SUPABASE_ANON_KEY: z.ZodString;
    SUPABASE_SERVICE_KEY: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_KEY?: string | undefined;
}, {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_KEY?: string | undefined;
}>;
export type SupabaseEnv = z.infer<typeof supabaseSchema>;
export declare function parseSupabaseEnv(env?: Record<string, string | undefined>): SupabaseEnv;
declare const stripeSchema: z.ZodObject<{
    STRIPE_SECRET_KEY: z.ZodString;
    STRIPE_WEBHOOK_SECRET: z.ZodOptional<z.ZodString>;
    STRIPE_PUBLISHABLE_KEY: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET?: string | undefined;
    STRIPE_PUBLISHABLE_KEY?: string | undefined;
}, {
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET?: string | undefined;
    STRIPE_PUBLISHABLE_KEY?: string | undefined;
}>;
export type StripeEnv = z.infer<typeof stripeSchema>;
export declare function parseStripeEnv(env?: Record<string, string | undefined>): StripeEnv;
declare const remotionSchema: z.ZodObject<{
    REMOTION_API_URL: z.ZodOptional<z.ZodString>;
    REMOTION_API_KEY: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    REMOTION_API_URL?: string | undefined;
    REMOTION_API_KEY?: string | undefined;
}, {
    REMOTION_API_URL?: string | undefined;
    REMOTION_API_KEY?: string | undefined;
}>;
export type RemotionEnv = z.infer<typeof remotionSchema>;
export declare function parseRemotionEnv(env?: Record<string, string | undefined>): RemotionEnv;
declare const metaSchema: z.ZodObject<{
    META_HUB_URL: z.ZodOptional<z.ZodString>;
    META_HUB_KEY: z.ZodOptional<z.ZodString>;
    META_ACCESS_TOKEN: z.ZodOptional<z.ZodString>;
    META_PIXEL_ID: z.ZodOptional<z.ZodString>;
    META_APP_SECRET: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    META_HUB_URL?: string | undefined;
    META_HUB_KEY?: string | undefined;
    META_ACCESS_TOKEN?: string | undefined;
    META_PIXEL_ID?: string | undefined;
    META_APP_SECRET?: string | undefined;
}, {
    META_HUB_URL?: string | undefined;
    META_HUB_KEY?: string | undefined;
    META_ACCESS_TOKEN?: string | undefined;
    META_PIXEL_ID?: string | undefined;
    META_APP_SECRET?: string | undefined;
}>;
export type MetaEnv = z.infer<typeof metaSchema>;
export declare function parseMetaEnv(env?: Record<string, string | undefined>): MetaEnv;
declare const emailSchema: z.ZodObject<{
    RESEND_API_KEY: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    RESEND_API_KEY?: string | undefined;
}, {
    RESEND_API_KEY?: string | undefined;
}>;
export type EmailEnv = z.infer<typeof emailSchema>;
export declare function parseEmailEnv(env?: Record<string, string | undefined>): EmailEnv;
declare const storageSchema: z.ZodObject<{
    R2_BUCKET: z.ZodOptional<z.ZodString>;
    R2_ACCESS_KEY: z.ZodOptional<z.ZodString>;
    R2_SECRET_KEY: z.ZodOptional<z.ZodString>;
    CDN_URL: z.ZodOptional<z.ZodString>;
    R2_ENDPOINT: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    R2_BUCKET?: string | undefined;
    R2_ACCESS_KEY?: string | undefined;
    R2_SECRET_KEY?: string | undefined;
    CDN_URL?: string | undefined;
    R2_ENDPOINT?: string | undefined;
}, {
    R2_BUCKET?: string | undefined;
    R2_ACCESS_KEY?: string | undefined;
    R2_SECRET_KEY?: string | undefined;
    CDN_URL?: string | undefined;
    R2_ENDPOINT?: string | undefined;
}>;
export type StorageEnv = z.infer<typeof storageSchema>;
export declare function parseStorageEnv(env?: Record<string, string | undefined>): StorageEnv;
declare const redisSchema: z.ZodObject<{
    REDIS_URL: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    REDIS_URL?: string | undefined;
}, {
    REDIS_URL?: string | undefined;
}>;
export type RedisEnv = z.infer<typeof redisSchema>;
export declare function parseRedisEnv(env?: Record<string, string | undefined>): RedisEnv;
declare const authSchema: z.ZodObject<{
    JWT_SECRET: z.ZodString;
    JWT_EXPIRES_IN: z.ZodDefault<z.ZodString>;
    COOKIE_DOMAIN: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    COOKIE_DOMAIN?: string | undefined;
}, {
    JWT_SECRET: string;
    JWT_EXPIRES_IN?: string | undefined;
    COOKIE_DOMAIN?: string | undefined;
}>;
export type AuthEnv = z.infer<typeof authSchema>;
export declare function parseAuthEnv(env?: Record<string, string | undefined>): AuthEnv;
declare const tiktokSchema: z.ZodObject<{
    TIKTOK_CLIENT_KEY: z.ZodOptional<z.ZodString>;
    TIKTOK_CLIENT_SECRET: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    TIKTOK_CLIENT_KEY?: string | undefined;
    TIKTOK_CLIENT_SECRET?: string | undefined;
}, {
    TIKTOK_CLIENT_KEY?: string | undefined;
    TIKTOK_CLIENT_SECRET?: string | undefined;
}>;
export type TikTokEnv = z.infer<typeof tiktokSchema>;
export declare function parseTikTokEnv(env?: Record<string, string | undefined>): TikTokEnv;
declare const generalSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    LOG_LEVEL: "debug" | "info" | "warn" | "error";
}, {
    NODE_ENV?: "development" | "production" | "test" | undefined;
    PORT?: number | undefined;
    LOG_LEVEL?: "debug" | "info" | "warn" | "error" | undefined;
}>;
export type GeneralEnv = z.infer<typeof generalSchema>;
export declare function parseGeneralEnv(env?: Record<string, string | undefined>): GeneralEnv;
declare const featureFlagsSchema: z.ZodObject<{
    META_CAPI_INGEST_ENABLED: z.ZodDefault<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, boolean, string>, z.ZodBoolean>, z.ZodBoolean]>>;
    SEGMENT_ENGINE_META_CAPI_ENABLED: z.ZodDefault<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, boolean, string>, z.ZodBoolean>, z.ZodBoolean]>>;
    SHARED_PERSON_TABLE_ENABLED: z.ZodDefault<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, boolean, string>, z.ZodBoolean>, z.ZodBoolean]>>;
    META_PIXEL_ENABLED: z.ZodDefault<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, boolean, string>, z.ZodBoolean>, z.ZodBoolean]>>;
    CONVERSION_TRACKING_ENABLED: z.ZodDefault<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, boolean, string>, z.ZodBoolean>, z.ZodBoolean]>>;
    META_CAPI_FORWARD_ENABLED: z.ZodDefault<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, boolean, string>, z.ZodBoolean>, z.ZodBoolean]>>;
    META_CUSTOM_AUDIENCE_SYNC_ENABLED: z.ZodDefault<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, boolean, string>, z.ZodBoolean>, z.ZodBoolean]>>;
    ACD_META_INSIGHTS_ENABLED: z.ZodDefault<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, boolean, string>, z.ZodBoolean>, z.ZodBoolean]>>;
}, "strip", z.ZodTypeAny, {
    META_CAPI_INGEST_ENABLED: boolean;
    SEGMENT_ENGINE_META_CAPI_ENABLED: boolean;
    SHARED_PERSON_TABLE_ENABLED: boolean;
    META_PIXEL_ENABLED: boolean;
    CONVERSION_TRACKING_ENABLED: boolean;
    META_CAPI_FORWARD_ENABLED: boolean;
    META_CUSTOM_AUDIENCE_SYNC_ENABLED: boolean;
    ACD_META_INSIGHTS_ENABLED: boolean;
}, {
    META_CAPI_INGEST_ENABLED?: string | boolean | undefined;
    SEGMENT_ENGINE_META_CAPI_ENABLED?: string | boolean | undefined;
    SHARED_PERSON_TABLE_ENABLED?: string | boolean | undefined;
    META_PIXEL_ENABLED?: string | boolean | undefined;
    CONVERSION_TRACKING_ENABLED?: string | boolean | undefined;
    META_CAPI_FORWARD_ENABLED?: string | boolean | undefined;
    META_CUSTOM_AUDIENCE_SYNC_ENABLED?: string | boolean | undefined;
    ACD_META_INSIGHTS_ENABLED?: string | boolean | undefined;
}>;
export type FeatureFlagsEnv = z.infer<typeof featureFlagsSchema>;
export declare function parseFeatureFlagsEnv(env?: Record<string, string | undefined>): FeatureFlagsEnv;
declare const fullEnvSchema: z.ZodObject<{
    META_CAPI_INGEST_ENABLED: z.ZodDefault<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, boolean, string>, z.ZodBoolean>, z.ZodBoolean]>>;
    SEGMENT_ENGINE_META_CAPI_ENABLED: z.ZodDefault<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, boolean, string>, z.ZodBoolean>, z.ZodBoolean]>>;
    SHARED_PERSON_TABLE_ENABLED: z.ZodDefault<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, boolean, string>, z.ZodBoolean>, z.ZodBoolean]>>;
    META_PIXEL_ENABLED: z.ZodDefault<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, boolean, string>, z.ZodBoolean>, z.ZodBoolean]>>;
    CONVERSION_TRACKING_ENABLED: z.ZodDefault<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, boolean, string>, z.ZodBoolean>, z.ZodBoolean]>>;
    META_CAPI_FORWARD_ENABLED: z.ZodDefault<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, boolean, string>, z.ZodBoolean>, z.ZodBoolean]>>;
    META_CUSTOM_AUDIENCE_SYNC_ENABLED: z.ZodDefault<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, boolean, string>, z.ZodBoolean>, z.ZodBoolean]>>;
    ACD_META_INSIGHTS_ENABLED: z.ZodDefault<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodString, boolean, string>, z.ZodBoolean>, z.ZodBoolean]>>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    TIKTOK_CLIENT_KEY: z.ZodOptional<z.ZodString>;
    TIKTOK_CLIENT_SECRET: z.ZodOptional<z.ZodString>;
    JWT_SECRET: z.ZodString;
    JWT_EXPIRES_IN: z.ZodDefault<z.ZodString>;
    COOKIE_DOMAIN: z.ZodOptional<z.ZodString>;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    R2_BUCKET: z.ZodOptional<z.ZodString>;
    R2_ACCESS_KEY: z.ZodOptional<z.ZodString>;
    R2_SECRET_KEY: z.ZodOptional<z.ZodString>;
    CDN_URL: z.ZodOptional<z.ZodString>;
    R2_ENDPOINT: z.ZodOptional<z.ZodString>;
    RESEND_API_KEY: z.ZodOptional<z.ZodString>;
    META_HUB_URL: z.ZodOptional<z.ZodString>;
    META_HUB_KEY: z.ZodOptional<z.ZodString>;
    META_ACCESS_TOKEN: z.ZodOptional<z.ZodString>;
    META_PIXEL_ID: z.ZodOptional<z.ZodString>;
    META_APP_SECRET: z.ZodOptional<z.ZodString>;
    REMOTION_API_URL: z.ZodOptional<z.ZodString>;
    REMOTION_API_KEY: z.ZodOptional<z.ZodString>;
    STRIPE_SECRET_KEY: z.ZodString;
    STRIPE_WEBHOOK_SECRET: z.ZodOptional<z.ZodString>;
    STRIPE_PUBLISHABLE_KEY: z.ZodOptional<z.ZodString>;
    SUPABASE_URL: z.ZodString;
    SUPABASE_ANON_KEY: z.ZodString;
    SUPABASE_SERVICE_KEY: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    STRIPE_SECRET_KEY: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    LOG_LEVEL: "debug" | "info" | "warn" | "error";
    META_CAPI_INGEST_ENABLED: boolean;
    SEGMENT_ENGINE_META_CAPI_ENABLED: boolean;
    SHARED_PERSON_TABLE_ENABLED: boolean;
    META_PIXEL_ENABLED: boolean;
    CONVERSION_TRACKING_ENABLED: boolean;
    META_CAPI_FORWARD_ENABLED: boolean;
    META_CUSTOM_AUDIENCE_SYNC_ENABLED: boolean;
    ACD_META_INSIGHTS_ENABLED: boolean;
    SUPABASE_SERVICE_KEY?: string | undefined;
    STRIPE_WEBHOOK_SECRET?: string | undefined;
    STRIPE_PUBLISHABLE_KEY?: string | undefined;
    REMOTION_API_URL?: string | undefined;
    REMOTION_API_KEY?: string | undefined;
    META_HUB_URL?: string | undefined;
    META_HUB_KEY?: string | undefined;
    META_ACCESS_TOKEN?: string | undefined;
    META_PIXEL_ID?: string | undefined;
    META_APP_SECRET?: string | undefined;
    RESEND_API_KEY?: string | undefined;
    R2_BUCKET?: string | undefined;
    R2_ACCESS_KEY?: string | undefined;
    R2_SECRET_KEY?: string | undefined;
    CDN_URL?: string | undefined;
    R2_ENDPOINT?: string | undefined;
    REDIS_URL?: string | undefined;
    COOKIE_DOMAIN?: string | undefined;
    TIKTOK_CLIENT_KEY?: string | undefined;
    TIKTOK_CLIENT_SECRET?: string | undefined;
}, {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    STRIPE_SECRET_KEY: string;
    JWT_SECRET: string;
    SUPABASE_SERVICE_KEY?: string | undefined;
    STRIPE_WEBHOOK_SECRET?: string | undefined;
    STRIPE_PUBLISHABLE_KEY?: string | undefined;
    REMOTION_API_URL?: string | undefined;
    REMOTION_API_KEY?: string | undefined;
    META_HUB_URL?: string | undefined;
    META_HUB_KEY?: string | undefined;
    META_ACCESS_TOKEN?: string | undefined;
    META_PIXEL_ID?: string | undefined;
    META_APP_SECRET?: string | undefined;
    RESEND_API_KEY?: string | undefined;
    R2_BUCKET?: string | undefined;
    R2_ACCESS_KEY?: string | undefined;
    R2_SECRET_KEY?: string | undefined;
    CDN_URL?: string | undefined;
    R2_ENDPOINT?: string | undefined;
    REDIS_URL?: string | undefined;
    JWT_EXPIRES_IN?: string | undefined;
    COOKIE_DOMAIN?: string | undefined;
    TIKTOK_CLIENT_KEY?: string | undefined;
    TIKTOK_CLIENT_SECRET?: string | undefined;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    PORT?: number | undefined;
    LOG_LEVEL?: "debug" | "info" | "warn" | "error" | undefined;
    META_CAPI_INGEST_ENABLED?: string | boolean | undefined;
    SEGMENT_ENGINE_META_CAPI_ENABLED?: string | boolean | undefined;
    SHARED_PERSON_TABLE_ENABLED?: string | boolean | undefined;
    META_PIXEL_ENABLED?: string | boolean | undefined;
    CONVERSION_TRACKING_ENABLED?: string | boolean | undefined;
    META_CAPI_FORWARD_ENABLED?: string | boolean | undefined;
    META_CUSTOM_AUDIENCE_SYNC_ENABLED?: string | boolean | undefined;
    ACD_META_INSIGHTS_ENABLED?: string | boolean | undefined;
}>;
export type FullEnv = z.infer<typeof fullEnvSchema>;
export declare function parseFullEnv(env?: Record<string, string | undefined>): FullEnv;
export {};
//# sourceMappingURL=env.d.ts.map