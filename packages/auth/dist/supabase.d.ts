/**
 * Supabase Client Factory
 * =======================
 *
 * Shared Supabase client creation for browser (anon) and server (service_role)
 * contexts. Every ACD product that needs Supabase should use these helpers
 * rather than constructing clients directly.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
declare const SupabaseConfigSchema: z.ZodObject<{
    url: z.ZodString;
    anonKey: z.ZodString;
    serviceKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    url: string;
    anonKey: string;
    serviceKey?: string | undefined;
}, {
    url: string;
    anonKey: string;
    serviceKey?: string | undefined;
}>;
export type SupabaseConfig = z.infer<typeof SupabaseConfigSchema>;
/**
 * Create a Supabase client using the **anon / public** key.
 * Suitable for browser-side usage and authenticated user requests
 * where Row Level Security (RLS) should apply.
 *
 * @param url      - Supabase project URL
 * @param anonKey  - Supabase anon/public key
 * @param options  - Optional overrides passed to `createClient`
 */
export declare function createSupabaseClient(url: string, anonKey: string, options?: Parameters<typeof createClient>[2]): SupabaseClient;
/**
 * Create a Supabase **admin / service-role** client.
 * This client bypasses RLS and should only be used on the server
 * for administrative operations (user management, migrations, etc.).
 *
 * @param url         - Supabase project URL
 * @param serviceKey  - Supabase service_role secret key
 * @param options     - Optional overrides passed to `createClient`
 */
export declare function createSupabaseAdmin(url: string, serviceKey: string, options?: Parameters<typeof createClient>[2]): SupabaseClient;
/**
 * Read Supabase configuration from environment variables.
 *
 * Expected env vars:
 *   - `SUPABASE_URL`
 *   - `SUPABASE_ANON_KEY`
 *   - `SUPABASE_SERVICE_KEY` (optional, server-only)
 *
 * @param env - Defaults to `process.env`
 * @throws {z.ZodError} if required variables are missing
 */
export declare function getSharedSupabaseConfig(env?: Record<string, string | undefined>): SupabaseConfig;
export {};
//# sourceMappingURL=supabase.d.ts.map