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

// ---------------------------------------------------------------------------
// Configuration schema
// ---------------------------------------------------------------------------

const SupabaseConfigSchema = z.object({
  url: z.string().url('SUPABASE_URL must be a valid URL'),
  anonKey: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  serviceKey: z.string().min(1).optional(),
});

export type SupabaseConfig = z.infer<typeof SupabaseConfigSchema>;

// ---------------------------------------------------------------------------
// Client factories
// ---------------------------------------------------------------------------

/**
 * Create a Supabase client using the **anon / public** key.
 * Suitable for browser-side usage and authenticated user requests
 * where Row Level Security (RLS) should apply.
 *
 * @param url      - Supabase project URL
 * @param anonKey  - Supabase anon/public key
 * @param options  - Optional overrides passed to `createClient`
 */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: Parameters<typeof createClient>[2],
): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('[acd/auth] Supabase URL and anon key are required to create a client.');
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      ...options?.auth,
    },
    ...options,
  }) as SupabaseClient;
}

/**
 * Create a Supabase **admin / service-role** client.
 * This client bypasses RLS and should only be used on the server
 * for administrative operations (user management, migrations, etc.).
 *
 * @param url         - Supabase project URL
 * @param serviceKey  - Supabase service_role secret key
 * @param options     - Optional overrides passed to `createClient`
 */
export function createSupabaseAdmin(
  url: string,
  serviceKey: string,
  options?: Parameters<typeof createClient>[2],
): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error(
      '[acd/auth] Supabase URL and service_role key are required to create an admin client.',
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      ...options?.auth,
    },
    ...options,
  }) as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Environment helper
// ---------------------------------------------------------------------------

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
export function getSharedSupabaseConfig(
  env: Record<string, string | undefined> = process.env,
): SupabaseConfig {
  return SupabaseConfigSchema.parse({
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceKey: env.SUPABASE_SERVICE_KEY,
  });
}
