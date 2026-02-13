"use strict";
/**
 * Supabase Client Factory
 * =======================
 *
 * Shared Supabase client creation for browser (anon) and server (service_role)
 * contexts. Every ACD product that needs Supabase should use these helpers
 * rather than constructing clients directly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupabaseClient = createSupabaseClient;
exports.createSupabaseAdmin = createSupabaseAdmin;
exports.getSharedSupabaseConfig = getSharedSupabaseConfig;
const supabase_js_1 = require("@supabase/supabase-js");
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Configuration schema
// ---------------------------------------------------------------------------
const SupabaseConfigSchema = zod_1.z.object({
    url: zod_1.z.string().url('SUPABASE_URL must be a valid URL'),
    anonKey: zod_1.z.string().min(1, 'SUPABASE_ANON_KEY is required'),
    serviceKey: zod_1.z.string().min(1).optional(),
});
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
function createSupabaseClient(url, anonKey, options) {
    if (!url || !anonKey) {
        throw new Error('[acd/auth] Supabase URL and anon key are required to create a client.');
    }
    return (0, supabase_js_1.createClient)(url, anonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            ...options?.auth,
        },
        ...options,
    });
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
function createSupabaseAdmin(url, serviceKey, options) {
    if (!url || !serviceKey) {
        throw new Error('[acd/auth] Supabase URL and service_role key are required to create an admin client.');
    }
    return (0, supabase_js_1.createClient)(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            ...options?.auth,
        },
        ...options,
    });
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
function getSharedSupabaseConfig(env = process.env) {
    return SupabaseConfigSchema.parse({
        url: env.SUPABASE_URL,
        anonKey: env.SUPABASE_ANON_KEY,
        serviceKey: env.SUPABASE_SERVICE_KEY,
    });
}
//# sourceMappingURL=supabase.js.map