#!/usr/bin/env node
/**
 * test-live-sessions.js — Fire sessions across all platforms and watch results
 *
 * Books a batch of real sessions staggered 30s apart, then tails the daemon
 * log and Supabase until all complete. Prints a summary table.
 *
 * Usage:
 *   node harness/test-live-sessions.js              # all platforms, ~5 min
 *   node harness/test-live-sessions.js --quick      # 3 sessions, ~2 min
 *   node harness/test-live-sessions.js --platform instagram
 *   node harness/test-live-sessions.js --action inbox_check
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv(f) {
  if (!existsSync(f)) return;
  readFileSync(f, 'utf8').split('\n').forEach(l => {
    const [k, ...r] = l.trim().split('=');
    if (k && !k.startsWith('#') && r.length && !process.env[k])
      process.env[k] = r.join('=').replace(/^["']|["']$/g, '');
  });
}
loadEnv('/Users/isaiahdupree/Documents/Software/actp-worker/.env');
loadEnv('/Users/isaiahdupree/Documents/Software/Safari Automation/.env');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const args = process.argv.slice(2);
const QUICK     = args.includes('--quick');
const PLATFORM  = args.find((_, i) => args[i - 1] === '--platform');
const ACTION    = args.find((_, i) => args[i - 1] === '--action');

// ── Test session definitions ─────────────────────────────────────────────────
const ALL_TESTS = [
  // Prospect hunting via market-research service (3106)
  { platform: 'instagram', action: 'prospect_hunt', params: { niche: 'ai automation',    keyword: 'saas founders',   maxPosts: 5 }, label: 'IG Prospect Hunt' },
  { platform: 'twitter',   action: 'prospect_hunt', params: { niche: 'build in public',  keyword: 'ai tools',        maxPosts: 5 }, label: 'TW Prospect Hunt' },
  { platform: 'threads',   action: 'prospect_hunt', params: { niche: 'saas growth',      keyword: 'automation',      maxPosts: 5 }, label: 'TH Prospect Hunt' },
  { platform: 'tiktok',    action: 'prospect_hunt', params: { niche: 'ai automation',    keyword: 'productivity',    maxPosts: 5 }, label: 'TK Prospect Hunt' },
  { platform: 'twitter',   action: 'comment_harvest', params: { query: 'ai automation saas', maxPosts: 5 }, label: 'TW Comment Harvest' },

  // Inbox checks via platform DM services
  { platform: 'instagram', action: 'inbox_check',   params: {},                                                                      label: 'IG Inbox Check'   },
  { platform: 'twitter',   action: 'inbox_check',   params: {},                                                                      label: 'TW Inbox Check'   },
  { platform: 'linkedin',  action: 'inbox_check',   params: {},                                                                      label: 'LI Inbox Check'   },
];

const QUICK_TESTS = [
  { platform: 'instagram', action: 'prospect_hunt', params: { niche: 'ai automation', keyword: 'saas', maxPosts: 3 }, label: 'IG Prospect Hunt' },
  { platform: 'twitter',   action: 'inbox_check',   params: {},                                                        label: 'TW Inbox Check'   },
  { platform: 'threads',   action: 'prospect_hunt', params: { niche: 'ai tools', keyword: 'automation', maxPosts: 3 }, label: 'TH Prospect Hunt' },
];

let tests = QUICK ? QUICK_TESTS : ALL_TESTS;
if (PLATFORM) tests = tests.filter(t => t.platform === PLATFORM);
if (ACTION)   tests = tests.filter(t => t.action === ACTION);

const STAGGER_SEC = 25;  // seconds between sessions
const POLL_SEC    = 8;   // poll Supabase every N seconds for results
const TIMEOUT_SEC = 240; // give up after 4 min (LinkedIn takes ~67s)

// ── Book all test sessions ────────────────────────────────────────────────────
async function bookSessions() {
  console.log(`\n📋 Booking ${tests.length} test sessions (staggered ${STAGGER_SEC}s apart)\n`);
  const now = Date.now();
  const ids = [];

  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    const scheduledAt = new Date(now + (i * STAGGER_SEC + 15) * 1000);
    const expiresAt   = new Date(now + 10 * 60_000);

    const { data, error } = await db.from('actp_browser_sessions').insert({
      platform:     t.platform,
      browser:      t.platform === 'linkedin' ? 'chrome' : 'safari',
      action:       t.action,
      params:       t.params,
      scheduled_at: scheduledAt.toISOString(),
      expires_at:   expiresAt.toISOString(),
      status:       'scheduled',
      priority:     1,
      goal_tag:     'live-test',
    }).select().single();

    if (error) {
      console.log(`  ❌ ${t.label}: booking failed — ${error.message}`);
      continue;
    }

    ids.push({ id: data.id, ...t, scheduledAt, status: 'scheduled', result: null });
    const t_str = scheduledAt.toLocaleTimeString();
    console.log(`  ⏰ ${t.label.padEnd(22)} @ ${t_str}  [${data.id.slice(0, 8)}]`);
  }

  return ids;
}

// ── Poll until all complete ───────────────────────────────────────────────────
async function watchSessions(sessions) {
  console.log(`\n⏳ Watching ${sessions.length} sessions (timeout ${TIMEOUT_SEC}s)...\n`);

  const start = Date.now();
  const pending = new Map(sessions.map(s => [s.id, s]));
  const done = [];
  let lastPrint = '';

  while (pending.size > 0 && (Date.now() - start) < TIMEOUT_SEC * 1000) {
    await new Promise(r => setTimeout(r, POLL_SEC * 1000));

    const ids = [...pending.keys()];
    const { data } = await db.from('actp_browser_sessions')
      .select('id, status, result, error, started_at, completed_at, platform, action')
      .in('id', ids);

    for (const row of (data || [])) {
      if (row.status === 'completed' || row.status === 'failed' || row.status === 'expired') {
        const session = pending.get(row.id);
        pending.delete(row.id);
        const elapsed = row.completed_at
          ? Math.round((new Date(row.completed_at) - new Date(row.started_at || row.completed_at)) / 100) / 10
          : '?';
        const icon = row.status === 'completed' ? '✅' : row.status === 'failed' ? '❌' : '⏱️';
        const errorSnip = row.error ? ` — ${row.error.slice(0, 80)}` : '';
        console.log(`  ${icon} ${session.label.padEnd(22)} ${row.status.toUpperCase().padEnd(10)} ${elapsed}s${errorSnip}`);
        done.push({ ...session, status: row.status, result: row.result, error: row.error, elapsed });
      }
    }

    // Live pending status
    if (pending.size > 0) {
      const claimed = (data || []).filter(r => r.status === 'running').map(r => r.platform);
      const statusLine = `  ⏳ ${pending.size} pending${claimed.length ? ` | running: ${claimed.join(', ')}` : ''}`;
      if (statusLine !== lastPrint) { process.stdout.write(`\r${statusLine}   `); lastPrint = statusLine; }
    }
  }

  // Expired sessions still pending
  for (const [id, session] of pending) {
    console.log(`\n  ⏱️  ${session.label.padEnd(22)} TIMED_OUT (daemon not claimed within ${TIMEOUT_SEC}s)`);
    done.push({ ...session, status: 'timeout', result: null });
  }

  return done;
}

// ── Print summary ─────────────────────────────────────────────────────────────
function printSummary(results) {
  const total   = results.length;
  const passed  = results.filter(r => r.status === 'completed').length;
  const failed  = results.filter(r => r.status === 'failed').length;
  const timeout = results.filter(r => r.status === 'timeout').length;
  const rate    = total ? Math.round(100 * passed / total) : 0;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Results: ${passed}/${total} completed (${rate}% success rate)`);
  if (failed)  console.log(`  Failed: ${failed}`);
  if (timeout) console.log(`  Timed out: ${timeout} (daemon not running or platform down)`);

  // Per-platform breakdown
  const byPlatform = {};
  for (const r of results) {
    if (!byPlatform[r.platform]) byPlatform[r.platform] = { pass: 0, fail: 0 };
    if (r.status === 'completed') byPlatform[r.platform].pass++;
    else byPlatform[r.platform].fail++;
  }
  console.log('\nPer platform:');
  for (const [plat, counts] of Object.entries(byPlatform)) {
    const icon = counts.fail === 0 ? '✅' : counts.pass === 0 ? '❌' : '⚠️ ';
    console.log(`  ${icon} ${plat.padEnd(12)} ${counts.pass}/${counts.pass + counts.fail}`);
  }

  // Sample a result
  const success = results.find(r => r.status === 'completed' && r.result);
  if (success?.result) {
    console.log(`\nSample result (${success.label}):`);
    const snippet = JSON.stringify(success.result).slice(0, 300);
    console.log(`  ${snippet}${snippet.length >= 300 ? '...' : ''}`);
  }

  // Improvements needed
  const errors = results.filter(r => r.error).map(r => `${r.platform}:${r.action} — ${r.error?.slice(0, 100)}`);
  if (errors.length) {
    console.log('\nFailed sessions (fix these endpoints):');
    errors.forEach(e => console.log(`  • ${e}`));
  }

  console.log(`\n${'─'.repeat(60)}`);
  if (rate >= 80) console.log('✅ System healthy — 80%+ success rate');
  else if (rate >= 50) console.log('⚠️  Partial — check failed endpoints above');
  else console.log('❌ Low success rate — daemon may need restart or endpoints need updating');
}

// ── Pre-flight: verify Safari tab claims on all active service ports ──────────
async function preflightTabClaims(sessions) {
  // Collect unique service ports that will be used (market-research 3106 for research actions,
  // platform port for inbox/DM actions, LinkedIn 3105 for Chrome — skip LinkedIn Chrome)
  const platformPorts = {
    instagram: 3100, twitter: 3003, tiktok: 3102, threads: 3004,
    linkedin: 3105, upwork: 3108,
  };
  const researchActions = new Set(['prospect_hunt', 'comment_harvest']);
  const portsNeeded = new Set();

  for (const s of sessions) {
    if (s.platform === 'linkedin') continue;  // Chrome — no Safari tab claim needed
    if (researchActions.has(s.action)) {
      portsNeeded.add(3106);  // market-research hub
    } else {
      const port = platformPorts[s.platform];
      if (port) portsNeeded.add(port);
    }
  }

  if (portsNeeded.size === 0) return;

  console.log(`\n🔍 Pre-flight: claiming Safari tabs on ports [${[...portsNeeded].join(', ')}]...\n`);
  const portLabels = { 3100: 'instagram', 3003: 'twitter', 3102: 'tiktok', 3004: 'threads', 3108: 'upwork', 3106: 'market-research' };

  for (const port of portsNeeded) {
    const label = portLabels[port] || `port:${port}`;
    try {
      const r = await fetch(`http://localhost:${port}/api/session/ensure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(12_000),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok !== false) {
        console.log(`  ✅ ${label.padEnd(18)} tab claimed (tab ${data.tabIndex ?? '?'})`);
      } else {
        console.log(`  ⚠️  ${label.padEnd(18)} ensure returned ok=false — open ${label} in Safari`);
      }
    } catch (err) {
      console.log(`  ❌ ${label.padEnd(18)} tab claim failed: ${err.message}`);
      console.log(`     → Open Safari and navigate to ${label} before running tests`);
    }
  }
  console.log('');
}

// ── Check daemon is running ───────────────────────────────────────────────────
async function checkDaemon() {
  const { data } = await db.from('actp_browser_sessions')
    .select('id, status, completed_at')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1);

  const last = data?.[0];
  if (!last) return { running: false, lastSec: null };
  const lastSec = Math.round((Date.now() - new Date(last.completed_at)) / 1000);
  return { running: lastSec < 300, lastSec };  // 5 min threshold
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\n🚀 Live Browser Session Test Suite\n');

const { running, lastSec } = await checkDaemon();
if (running) console.log(`✅ Daemon active — last completion ${lastSec}s ago\n`);
else console.log(`⚠️  Daemon may be idle (no completion in last 5 min) — sessions will be claimed at next poll\n`);

await preflightTabClaims(tests);

const sessions = await bookSessions();
if (sessions.length === 0) { console.log('No sessions booked — check filters.'); process.exit(1); }

const results = await watchSessions(sessions);
printSummary(results);
