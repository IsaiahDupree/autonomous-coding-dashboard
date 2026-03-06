#!/usr/bin/env node
// Book one test session due in 30 seconds to verify daemon routing
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

function loadEnv(f) {
  if (!existsSync(f)) return;
  readFileSync(f, 'utf8').split('\n').forEach(l => {
    const [k, ...r] = l.trim().split('=');
    if (k && !k.startsWith('#') && r.length && !process.env[k]) process.env[k] = r.join('=').replace(/^["']|["']$/g, '');
  });
}
loadEnv('/Users/isaiahdupree/Documents/Software/actp-worker/.env');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const scheduled = new Date(Date.now() + 30_000);
const expires = new Date(Date.now() + 10 * 60_000);

// Use correct market-research API params: niche + keyword
const { data, error } = await db.from('actp_browser_sessions').insert({
  platform: 'instagram', browser: 'safari', action: 'prospect_hunt',
  params: { niche: 'ai automation', keyword: 'saas growth', maxPosts: 5 },
  scheduled_at: scheduled.toISOString(), expires_at: expires.toISOString(),
  status: 'scheduled', priority: 1, goal_tag: 'test-routing-v2',
}).select().single();

if (error) { console.error('Error:', error.message); process.exit(1); }
console.log('Booked test session:', data.id);
console.log('Scheduled:', scheduled.toLocaleTimeString(), '(30s from now)');
console.log('Action: instagram:prospect_hunt → POST http://localhost:3106/api/research/instagram/niche');
console.log('Daemon will claim within 60s poll cycle');
