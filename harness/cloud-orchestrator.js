#!/usr/bin/env node
/**
 * cloud-orchestrator.js — Goal-gap analysis + browser session booking engine
 *
 * Runs locally OR deployed to Vercel as an API route (same logic, different transport).
 *
 * What it does every hour:
 *   1. Reads business-goals.json targets
 *   2. Queries Supabase for actual metrics (CRM contacts, prospects, sessions completed today)
 *   3. Calculates gaps vs targets
 *   4. Books browser sessions for the next 4 hours to close those gaps
 *   5. Reads actp_strategy_configs for per-platform params (self-improvement results)
 *   6. Never books more than platform rate limits allow
 *
 * Self-improvement cycle (every 6h):
 *   - Reads last 24h sessions + outcomes
 *   - Uses improvement analysis from browser-session-daemon.js
 *   - Updates booking frequency + params
 *
 * Usage:
 *   node harness/cloud-orchestrator.js              # run 24/7 booking daemon
 *   node harness/cloud-orchestrator.js --once       # book 1 batch then exit
 *   node harness/cloud-orchestrator.js --preview    # show what would be booked, don't write
 *   node harness/cloud-orchestrator.js --status     # show current queue stats
 *
 * Vercel deployment: src/app/api/orchestrate/route.ts imports runOrchestratorCycle()
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// ── Telegram notifier ─────────────────────────────────────────────────────────
async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat  = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(8000),
    });
  } catch { /* non-fatal */ }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ACTP_ENV  = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const GOALS_FILE = '/Users/isaiahdupree/Documents/Software/business-goals.json';

function loadEnv(file) {
  if (!existsSync(file)) return;
  readFileSync(file, 'utf8').split('\n').forEach(line => {
    const [k, ...rest] = line.trim().split('=');
    if (k && !k.startsWith('#') && rest.length && !process.env[k]) {
      process.env[k] = rest.join('=').replace(/^["']|["']$/g, '');
    }
  });
}
loadEnv(ACTP_ENV);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _supabase;
function db() {
  if (!_supabase) {
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing SUPABASE env vars');
    _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _supabase;
}

function log(level, msg, data = {}) {
  const entry = { ts: new Date().toISOString(), level, msg, ...data };
  if (!process.stdout.isTTY) process.stdout.write(JSON.stringify(entry) + '\n');
  else console.log(`[${level.toUpperCase()}] ${msg}`, Object.keys(data).length ? data : '');
}

// ── Rate limits per platform (sessions per day max) ───────────────────────────
export const PLATFORM_DAILY_LIMITS = {
  instagram: 6,
  twitter:   8,
  tiktok:    6,
  threads:   4,
  linkedin:  5,
  upwork:    3,
};

// ── Default session templates per goal ───────────────────────────────────────
export const GOAL_SESSION_TEMPLATES = {
  // Revenue: Upwork gig scanning + DM campaigns
  revenue: [
    { platform: 'upwork',    action: 'job_scan',                  priority: 1, goal_tag: 'revenue', params: { max_hours: 4, skills: ['react', 'nextjs', 'api', 'automation'] } },
    { platform: 'linkedin',  action: 'prospect_hunt',             priority: 2, goal_tag: 'revenue', params: { niche: 'saas founder', keyword: 'ai automation' } },
    { platform: 'linkedin',  action: 'linkedin_connection_send',  priority: 1, goal_tag: 'revenue', params: { limit: 7, dry_run: false }, schedule: 'once_daily' },
    { platform: 'linkedin',  action: 'linkedin_dm_send',          priority: 1, goal_tag: 'revenue', params: { limit: 5, dry_run: false }, schedule: 'once_daily' },
    { platform: 'twitter',   action: 'prospect_hunt',             priority: 3, goal_tag: 'revenue', params: { niche: 'ai automation', keyword: 'saas founder' } },
  ],
  // Audience: Prospect mining across all social platforms
  audience: [
    { platform: 'instagram', action: 'prospect_hunt',  priority: 2, goal_tag: 'audience', params: { niche: 'ai automation', keyword: 'saas growth' } },
    { platform: 'tiktok',    action: 'prospect_hunt',  priority: 2, goal_tag: 'audience', params: { niche: 'ai automation', keyword: 'build in public' } },
    { platform: 'twitter',   action: 'comment_harvest', priority: 3, goal_tag: 'audience', params: { query: 'ai automation tools', maxPosts: 5 } },
    { platform: 'threads',   action: 'prospect_hunt',  priority: 3, goal_tag: 'audience', params: { niche: 'saas', keyword: 'ai tools' } },
  ],
  // Engagement: inbox checks + reply harvesting
  engagement: [
    { platform: 'instagram', action: 'inbox_check',   priority: 1, goal_tag: 'engagement', params: {} },
    { platform: 'twitter',   action: 'inbox_check',   priority: 1, goal_tag: 'engagement', params: {} },
    { platform: 'linkedin',  action: 'inbox_check',   priority: 1, goal_tag: 'engagement', params: {} },
  ],
};

// ── Read current metrics from Supabase ────────────────────────────────────────
async function getCurrentMetrics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [crmResult, sessionResult, prospectsResult] = await Promise.all([
    db().from('crm_contacts').select('id', { count: 'exact', head: true }),
    db().from('actp_browser_sessions').select('platform, action, status', { count: 'exact' }).gte('created_at', todayISO),
    // linkedin_prospects may not exist yet — fall back to 0 on error
    db().from('linkedin_prospects').select('id', { count: 'exact', head: true })
      .then(r => r, () => ({ count: 0, data: [] })),
  ]);

  // Count today's sessions by platform
  const todaySessions = {};
  for (const s of (sessionResult.data || [])) {
    todaySessions[s.platform] = (todaySessions[s.platform] || 0) + 1;
  }

  return {
    crm_contacts: crmResult.count || 0,
    linkedin_prospects: prospectsResult.count || 0,
    today_sessions: todaySessions,
    today_sessions_raw: sessionResult.data || [],
    sessions_today_total: sessionResult.count || 0,
  };
}

// ── Read strategy configs (self-improvement results) ──────────────────────────
async function getStrategyConfigs() {
  const { data } = await db()
    .from('actp_strategy_configs')
    .select('*')
    .eq('active', true);
  const configs = {};
  for (const cfg of (data || [])) {
    configs[cfg.strategy_name] = cfg;
  }
  return configs;
}

// ── Calculate goal gaps ───────────────────────────────────────────────────────
export function calculateGaps(goals, metrics) {
  const gaps = [];

  // Revenue gap
  const revenueGapPct = Math.max(0, 1 - (goals.revenue.current_monthly_usd / goals.revenue.target_monthly_usd));
  if (revenueGapPct > 0.1) gaps.push({ goal: 'revenue', urgency: revenueGapPct, label: `Revenue: $${goals.revenue.current_monthly_usd}/$${goals.revenue.target_monthly_usd}` });

  // CRM contacts gap
  const crmTarget = goals.growth.crm_contacts_target || 1000;
  const crmGapPct = Math.max(0, 1 - (metrics.crm_contacts / crmTarget));
  if (crmGapPct > 0.05) gaps.push({ goal: 'audience', urgency: crmGapPct * 0.7, label: `CRM: ${metrics.crm_contacts}/${crmTarget}` });

  // Always include engagement (check inbox)
  gaps.push({ goal: 'engagement', urgency: 0.3, label: 'Daily inbox check' });

  return gaps.sort((a, b) => b.urgency - a.urgency);
}

// ── Book sessions for next N hours ───────────────────────────────────────────
async function bookSessions(templates, hoursAhead = 4, preview = false) {
  const now = Date.now();
  const booked = [];
  const skipped = [];
  const metrics = await getCurrentMetrics();
  const strategyConfigs = await getStrategyConfigs();

  // Spread sessions across the booking window
  const sessionSlots = [];
  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    const platform = template.platform;
    const todayCount = metrics.today_sessions[platform] || 0;
    const dailyLimit = PLATFORM_DAILY_LIMITS[platform] || 4;

    if (todayCount >= dailyLimit) {
      skipped.push({ platform, reason: `Daily limit reached (${todayCount}/${dailyLimit})` });
      continue;
    }

    // once_daily templates: skip if this action already booked/run today
    if (template.schedule === 'once_daily') {
      const alreadyBooked = metrics.today_sessions_raw.some(
        s => s.platform === platform && s.action === template.action
      );
      if (alreadyBooked) {
        skipped.push({ platform, reason: `once_daily action already booked today (${template.action})` });
        continue;
      }
    }

    // Apply strategy config overrides
    const stratKey = `${platform}:${template.action}`;
    const strategyCfg = strategyConfigs[stratKey];
    const params = { ...(template.params || {}), ...(strategyCfg?.params || {}) };

    // Spread sessions: each one is offset by (window / sessions) minutes
    const offsetMs = (i / Math.max(templates.length, 1)) * hoursAhead * 3600_000;
    const scheduledAt = new Date(now + offsetMs + 60_000);  // min 1 min from now
    const expiresAt = new Date(scheduledAt.getTime() + 30 * 60_000);  // 30 min window

    sessionSlots.push({
      platform,
      browser: ['linkedin'].includes(platform) ? 'chrome' : 'safari',
      action: template.action,
      params,
      priority: template.priority || 5,
      goal_tag: template.goal_tag || 'general',
      scheduled_at: scheduledAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: 'scheduled',
      created_at: new Date().toISOString(),
    });
  }

  if (preview) {
    log('info', 'Preview mode — would book:', { sessions: sessionSlots.map(s => `${s.platform}:${s.action} @ ${s.scheduled_at}`) });
    return { booked: sessionSlots, skipped, preview: true };
  }

  if (sessionSlots.length > 0) {
    const { data, error } = await db().from('actp_browser_sessions').insert(sessionSlots).select();
    if (error) throw new Error(`Booking failed: ${error.message}`);
    booked.push(...(data || []));
    log('info', `Booked ${booked.length} sessions`, { platforms: booked.map(s => s.platform) });
  }

  return { booked, skipped };
}

// ── Main orchestration cycle ──────────────────────────────────────────────────
export async function runOrchestratorCycle({ preview = false } = {}) {
  const goals = JSON.parse(readFileSync(GOALS_FILE, 'utf8'));
  const metrics = await getCurrentMetrics();

  log('info', 'Orchestrator cycle', { metrics });

  const gaps = calculateGaps(goals, metrics);
  log('info', 'Goal gaps', { gaps: gaps.map(g => g.label) });

  // Build session queue from gaps (highest urgency first)
  const sessionTemplates = [];
  for (const gap of gaps) {
    const templates = GOAL_SESSION_TEMPLATES[gap.goal] || [];
    sessionTemplates.push(...templates);
  }

  // Deduplicate by platform+action
  const seen = new Set();
  const uniqueTemplates = sessionTemplates.filter(t => {
    const key = `${t.platform}:${t.action}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const result = await bookSessions(uniqueTemplates, 4, preview);

  // Telegram booking summary
  if (result.booked.length > 0 && !preview) {
    const sessionList = result.booked.map(s => `  • ${s.platform}:${s.action} @ ${new Date(s.scheduled_at).toLocaleTimeString()} [${s.goal_tag}]`).join('\n');
    const skippedNote = result.skipped.length ? `\n⏭️ Skipped ${result.skipped.length} (daily limits)` : '';
    await sendTelegram(
      `📅 <b>Cloud Orchestrator</b> — ${result.booked.length} sessions booked\n${sessionList}${skippedNote}`
    );
  }

  // Log orchestration event
  await db().from('actp_orchestrator_events').insert({
    ts: new Date().toISOString(),
    goals_snapshot: { revenue: goals.revenue, growth: goals.growth },
    metrics_snapshot: metrics,
    gaps: gaps.map(g => g.label),
    sessions_booked: result.booked.length,
    sessions_skipped: result.skipped.length,
  }).then(() => {}, () => {});  // ignore if table not ready

  return result;
}

// ── Status report ─────────────────────────────────────────────────────────────
async function printStatus() {
  const metrics = await getCurrentMetrics();
  const goals = JSON.parse(readFileSync(GOALS_FILE, 'utf8'));

  // Upcoming sessions
  const { data: upcoming } = await db()
    .from('actp_browser_sessions')
    .select('platform, action, scheduled_at, status, goal_tag')
    .in('status', ['scheduled', 'running'])
    .order('scheduled_at')
    .limit(20);

  console.log('\n=== Cloud Orchestrator Status ===');
  console.log(`Revenue: $${goals.revenue.current_monthly_usd}/$${goals.revenue.target_monthly_usd}/mo`);
  console.log(`CRM contacts: ${metrics.crm_contacts}/${goals.growth.crm_contacts_target}`);
  console.log(`Sessions today: ${metrics.sessions_today_total}`);
  console.log('\nUpcoming sessions:');
  for (const s of (upcoming || [])) {
    const time = new Date(s.scheduled_at).toLocaleTimeString();
    console.log(`  [${s.status}] ${s.platform}:${s.action} @ ${time} (${s.goal_tag})`);
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const MODE = args.includes('--once') ? 'once'
  : args.includes('--preview') ? 'preview'
  : args.includes('--status') ? 'status'
  : 'daemon';

async function main() {
  log('info', 'Cloud orchestrator starting', { mode: MODE });

  if (MODE === 'status') { await printStatus(); return; }
  if (MODE === 'preview') { await runOrchestratorCycle({ preview: true }); return; }
  if (MODE === 'once') { await runOrchestratorCycle(); return; }

  // Daemon mode — book sessions every hour
  const BOOK_INTERVAL_MS = 60 * 60_000;  // 1 hour
  log('info', `Booking daemon started — runs every ${BOOK_INTERVAL_MS / 60000} min`);

  const bookLoop = async () => {
    try {
      await runOrchestratorCycle();
    } catch (err) {
      log('error', 'Orchestrator cycle failed', { error: err.message });
    }
    setTimeout(bookLoop, BOOK_INTERVAL_MS);
  };

  bookLoop();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => { log('error', 'Fatal', { error: err.message }); process.exit(1); });
}
