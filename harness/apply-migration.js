#!/usr/bin/env node
/**
 * apply-migration.js — Apply actp_browser_sessions schema via Supabase REST
 * Uses raw SQL batches sent through the Supabase pg connection string
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv(file) {
  if (!existsSync(file)) return;
  readFileSync(file, 'utf8').split('\n').forEach(line => {
    const [k, ...rest] = line.trim().split('=');
    if (k && !k.startsWith('#') && rest.length && !process.env[k]) {
      process.env[k] = rest.join('=').replace(/^["']|["']$/g, '');
    }
  });
}
loadEnv('/Users/isaiahdupree/Documents/Software/actp-worker/.env');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTable(name) {
  const { error } = await db.from(name).select('id').limit(1);
  return !error;
}

async function applyViaMgmtApi(sql) {
  // Supabase Management API — requires personal access token stored in ~/.supabase/access-token
  const tokenPath = `${process.env.HOME}/.supabase/access-token`;
  if (!existsSync(tokenPath)) return false;
  const token = readFileSync(tokenPath, 'utf8').trim();
  const projectRef = 'ivhfuhxorppptyuofbgq';
  const resp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  return resp.ok;
}

async function insertStrategySeeds() {
  const seeds = [
    { strategy_name: 'instagram:prospect_hunt', platform: 'instagram', params: { keywords: ['ai automation', 'saas growth', 'build in public'], max_per_session: 20 }, performance: {}, version: 1, active: true },
    { strategy_name: 'twitter:prospect_hunt',   platform: 'twitter',   params: { keywords: ['ai tools', 'saas founder', 'automation'], max_per_session: 30 }, performance: {}, version: 1, active: true },
    { strategy_name: 'tiktok:prospect_hunt',    platform: 'tiktok',    params: { keywords: ['ai automation', 'productivity tools'], max_per_session: 20 }, performance: {}, version: 1, active: true },
    { strategy_name: 'threads:prospect_hunt',   platform: 'threads',   params: { keywords: ['saas', 'ai tools', 'entrepreneur'], max_per_session: 15 }, performance: {}, version: 1, active: true },
    { strategy_name: 'linkedin:prospect_hunt',  platform: 'linkedin',  params: { strategies: ['recent_posts', 'company_search', 'icp_filter'], max_per_session: 10 }, performance: {}, version: 1, active: true },
    { strategy_name: 'upwork:job_scan',         platform: 'upwork',    params: { max_hours: 4, skills: ['react', 'nextjs', 'api', 'automation', 'claude'], budget_min: 50 }, performance: {}, version: 1, active: true },
  ];

  const { data, error } = await db
    .from('actp_strategy_configs')
    .upsert(seeds, { onConflict: 'strategy_name', ignoreDuplicates: true });

  if (error) console.log('  Seed insert note:', error.message);
  else console.log('  ✅ Strategy seeds inserted/verified');
}

async function main() {
  console.log('\n=== Applying Browser Session Migration ===\n');

  // Step 1: Connection check
  const { error: connErr } = await db.from('crm_contacts').select('id').limit(1);
  if (connErr) { console.error('❌ Supabase connection failed:', connErr.message); process.exit(1); }
  console.log('✅ Supabase connected\n');

  // Step 2: Check which tables already exist
  const tables = ['actp_browser_sessions', 'actp_strategy_configs', 'actp_improvement_events', 'actp_orchestrator_events', 'actp_failure_events'];
  const tableStatus = {};
  for (const t of tables) {
    tableStatus[t] = await checkTable(t);
    console.log(`  ${tableStatus[t] ? '✅' : '⚠️ '} ${t}: ${tableStatus[t] ? 'EXISTS' : 'MISSING — needs creation'}`);
  }

  const missingTables = tables.filter(t => !tableStatus[t]);

  if (missingTables.length === 0) {
    console.log('\n✅ All tables already exist!');
    await insertStrategySeeds();
    await runTestBooking();
    return;
  }

  console.log(`\n⚠️  ${missingTables.length} tables need creation.`);
  console.log('\nTo apply the migration, use ONE of these methods:\n');
  console.log('METHOD 1 — Supabase Dashboard (recommended):');
  console.log('  1. Open: https://supabase.com/dashboard/project/ivhfuhxorppptyuofbgq/sql/new');
  console.log('  2. Paste the SQL from: harness/migrations/20260305_browser_sessions.sql');
  console.log('  3. Click Run');
  console.log('  4. Re-run: node harness/apply-migration.js\n');
  console.log('METHOD 2 — CLI (if you have a personal access token):');
  console.log('  supabase db execute --project-ref ivhfuhxorppptyuofbgq < harness/migrations/20260305_browser_sessions.sql\n');

  // Try mgmt API as last resort
  console.log('Trying Management API...');
  const sql = readFileSync(path.join(__dirname, 'migrations/20260305_browser_sessions.sql'), 'utf8');
  const mgmtOk = await applyViaMgmtApi(sql);
  if (mgmtOk) {
    console.log('✅ Applied via Management API!');
    await insertStrategySeeds();
    await runTestBooking();
  } else {
    console.log('⚠️  Management API not available (no access token).');
    console.log('\n👉 Please paste the SQL into the Supabase dashboard and re-run this script.');
    console.log('   URL: https://supabase.com/dashboard/project/ivhfuhxorppptyuofbgq/sql/new');
    console.log('\n--- SQL to run ---');
    console.log(sql);
    process.exit(2);
  }
}

async function runTestBooking() {
  console.log('\n=== Test Booking Cycle ===\n');

  // Book 1 test session
  const scheduledAt = new Date(Date.now() + 2 * 60_000);  // 2 min from now
  const expiresAt   = new Date(Date.now() + 30 * 60_000); // expires in 30 min

  const { data: booked, error: bookErr } = await db
    .from('actp_browser_sessions')
    .insert({
      platform: 'instagram',
      browser: 'safari',
      action: 'prospect_hunt',
      params: { keywords: ['ai automation'], test: true },
      scheduled_at: scheduledAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: 'scheduled',
      priority: 5,
      goal_tag: 'audience',
    })
    .select()
    .single();

  if (bookErr) {
    console.error('❌ Test booking failed:', bookErr.message);
    return;
  }
  console.log('✅ Test session booked:', booked.id);
  console.log('   Platform: instagram | Action: prospect_hunt');
  console.log(`   Scheduled: ${scheduledAt.toLocaleTimeString()} (2 min from now)`);
  console.log(`   Status: ${booked.status}`);

  // Verify it appears in queue
  const { data: queue } = await db
    .from('actp_browser_sessions')
    .select('id, platform, action, status, scheduled_at')
    .eq('status', 'scheduled')
    .order('scheduled_at');

  console.log(`\n✅ Session queue (${queue?.length || 0} pending):`);
  for (const s of (queue || [])) {
    const t = new Date(s.scheduled_at).toLocaleTimeString();
    console.log(`   [${s.status}] ${s.platform}:${s.action} @ ${t} (${s.id.slice(0,8)})`);
  }

  // Run cloud orchestrator preview
  console.log('\n=== Cloud Orchestrator Preview ===\n');
  const { runOrchestratorCycle } = await import('./cloud-orchestrator.js');
  const result = await runOrchestratorCycle({ preview: true });
  console.log(`\n✅ Orchestrator preview: would book ${result.booked.length} sessions, skip ${result.skipped.length}`);
  if (result.booked.length > 0) {
    console.log('\nSessions that would be booked:');
    for (const s of result.booked) {
      const t = new Date(s.scheduled_at).toLocaleTimeString();
      console.log(`   ${s.platform}:${s.action} @ ${t} [${s.goal_tag}]`);
    }
  }

  console.log('\n🎯 Migration and test booking complete!');
  console.log('\nNext steps:');
  console.log('  1. Start everything: bash harness/launch-browser-session-daemon.sh start');
  console.log('  2. Check status:     bash harness/launch-browser-session-daemon.sh status');
  console.log('  3. Watch it run:     bash harness/launch-browser-session-daemon.sh attach');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
