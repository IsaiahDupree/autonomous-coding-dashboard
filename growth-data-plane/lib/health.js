import { supabase } from './supabase.js';

export async function healthCheck() {
  const results = { ok: true, checks: {} };

  // Check Supabase connectivity
  try {
    const { count, error } = await supabase.from('gdp_person').select('id', { count: 'exact', head: true });
    results.checks.supabase = { ok: !error, persons: count || 0 };
  } catch (e) {
    results.checks.supabase = { ok: false, error: e.message };
    results.ok = false;
  }

  // Check tables exist
  const tables = [
    'gdp_person', 'gdp_identity_link', 'gdp_event', 'gdp_email_message',
    'gdp_email_event', 'gdp_subscription', 'gdp_deal', 'gdp_person_features',
    'gdp_segment', 'gdp_segment_member',
  ];
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('id', { head: true, count: 'exact' });
      results.checks[table] = { ok: !error };
      if (error) results.ok = false;
    } catch (e) {
      results.checks[table] = { ok: false, error: e.message };
      results.ok = false;
    }
  }

  // Check env vars
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const optionalEnvVars = [
    'RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET', 'POSTHOG_API_KEY',
    'META_PIXEL_ID', 'META_CAPI_ACCESS_TOKEN', 'STRIPE_WEBHOOK_SECRET',
  ];

  results.checks.env = {
    required: requiredEnvVars.reduce((acc, v) => ({ ...acc, [v]: !!process.env[v] }), {}),
    optional: optionalEnvVars.reduce((acc, v) => ({ ...acc, [v]: !!process.env[v] }), {}),
  };

  // Check segment counts
  try {
    const { count } = await supabase.from('gdp_segment').select('id', { count: 'exact', head: true });
    results.checks.segments = { count: count || 0 };
  } catch {
    results.checks.segments = { count: 0 };
  }

  return results;
}

if (process.argv[1]?.endsWith('health.js')) {
  healthCheck().then((r) => console.log(JSON.stringify(r, null, 2))).catch(console.error);
}
