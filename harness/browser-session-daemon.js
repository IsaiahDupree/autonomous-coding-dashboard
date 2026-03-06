#!/usr/bin/env node
/**
 * browser-session-daemon.js — Local 24/7 browser session executor
 *
 * The cloud orchestrator books sessions in Supabase `actp_browser_sessions`.
 * This daemon claims those sessions and executes them against local Safari/Chrome services.
 *
 * Flow:
 *   Cloud books session → Supabase row (status=scheduled)
 *   Daemon claims it     → status=running, claimed_at=now
 *   Daemon executes      → routes to correct local service port
 *   Daemon posts result  → status=completed|failed, result=JSONB
 *   Improvement loop     → every 6h, sends batch to Claude Haiku for analysis
 *
 * Usage:
 *   node harness/browser-session-daemon.js           # 24/7 daemon
 *   node harness/browser-session-daemon.js --once    # claim+run 1 batch then exit
 *   node harness/browser-session-daemon.js --test    # preflight only
 *   node harness/browser-session-daemon.js --improve # run improvement analysis now
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;
const ACTP_ENV    = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const GOALS_FILE  = '/Users/isaiahdupree/Documents/Software/business-goals.json';

// ── Load env ─────────────────────────────────────────────────────────────────
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
loadEnv('/Users/isaiahdupree/Documents/Software/Safari Automation/.env');

const SUPABASE_URL    = process.env.SUPABASE_URL;
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY   = process.env.ANTHROPIC_API_KEY;
const TELEGRAM_TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT   = process.env.TELEGRAM_CHAT_ID;

// ── Telegram notifier ─────────────────────────────────────────────────────────
async function sendTelegram(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(8000),
    });
  } catch { /* non-fatal — never block daemon on Telegram */ }
}

// ── Platform → local service routing ─────────────────────────────────────────
const PLATFORM_ROUTES = {
  instagram: { port: 3100, browser: 'safari', healthPath: '/health' },
  twitter:   { port: 3003, browser: 'safari', healthPath: '/health' },
  tiktok:    { port: 3102, browser: 'safari', healthPath: '/health' },
  threads:   { port: 3004, browser: 'safari', healthPath: '/health' },
  linkedin:  { port: 3105, browser: 'safari', healthPath: '/health', chromeFallback: 9333 },
  upwork:    { port: 3104, browser: 'safari', healthPath: '/health' },
  market:    { port: 3106, browser: 'safari', healthPath: '/health' },
};

// Action → endpoint mapping. Prospect/comment actions use market-research (3106).
// Inbox/DM actions use each platform's own service. LinkedIn has unique path prefixes.
const ACTION_ENDPOINTS = {
  // Research actions → market-research hub on 3106 (GET for inbox_check, POST for others)
  prospect_hunt:    (_p, platform) => `http://localhost:3106/api/research/${platform}/niche`,
  comment_harvest:  (_p, platform) => `http://localhost:3106/api/research/${platform}/search`,

  // Inbox check — platform-specific paths
  inbox_check: (p, platform) => {
    if (platform === 'twitter')   return `http://localhost:${p}/api/twitter/conversations/unread`;
    if (platform === 'linkedin')  return `http://localhost:${p}/api/linkedin/connections/pending`;
    return `http://localhost:${p}/api/conversations/unread`;  // instagram, threads
  },

  // DM send
  dm_send: (p, platform) => {
    if (platform === 'twitter')  return `http://localhost:${p}/api/twitter/messages/send`;
    if (platform === 'linkedin') return `http://localhost:${p}/api/linkedin/messages/send`;
    return `http://localhost:${p}/api/messages/send`;
  },

  // Profile extraction
  profile_extract: (p, platform) => {
    if (platform === 'linkedin') return `http://localhost:${p}/api/linkedin/profile/extract-current`;
    return `http://localhost:${p}/api/profile/extract`;
  },

  // Upwork
  job_scan: (p) => `http://localhost:${p}/api/upwork/jobs/search`,
};

const args = process.argv.slice(2);
const MODE = args.includes('--once') ? 'once'
  : args.includes('--test') ? 'test'
  : args.includes('--improve') ? 'improve'
  : 'daemon';

const POLL_INTERVAL_MS = 60_000;       // check for new sessions every 60s
const IMPROVE_INTERVAL_MS = 6 * 3600_000;  // run improvement every 6h
const CLAIM_WINDOW_MINUTES = 10;        // claim sessions due within next 10 min

// ── Supabase client ───────────────────────────────────────────────────────────
let supabase;
function getSupabase() {
  if (!supabase) {
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabase;
}

// ── Logging ───────────────────────────────────────────────────────────────────
function log(level, msg, data = {}) {
  const entry = { ts: new Date().toISOString(), level, msg, ...data };
  if (!process.stdout.isTTY) {
    process.stdout.write(JSON.stringify(entry) + '\n');
  } else {
    const icon = { info: '📡', warn: '⚠️', error: '❌', success: '✅', improve: '🧠' }[level] || '•';
    console.log(`${icon} [${entry.ts.slice(11,19)}] ${msg}`, Object.keys(data).length ? data : '');
  }
}

// ── Preflight ─────────────────────────────────────────────────────────────────
async function preflight() {
  const fatal = [];
  const warnings = [];

  if (!SUPABASE_URL || !SUPABASE_KEY) fatal.push('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  if (!ANTHROPIC_KEY) warnings.push('Missing ANTHROPIC_API_KEY — self-improvement loop disabled');
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) warnings.push('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID — session notifications disabled');

  // Check Chrome CDP (needed for LinkedIn sessions)
  try {
    const cdp = await fetch('http://localhost:9333/json', { signal: AbortSignal.timeout(2000) });
    if (!cdp.ok) warnings.push('Chrome CDP at :9333 responded but not OK — LinkedIn Chrome sessions may fail');
  } catch {
    warnings.push('Chrome CDP at :9333 not reachable — LinkedIn connection/DM sessions will fail (run: harness/start-chrome-debug.sh start)');
  }

  // Check live platforms
  const platformResults = {};
  await Promise.all(Object.entries(PLATFORM_ROUTES).map(async ([platform, cfg]) => {
    try {
      const r = await fetch(`http://localhost:${cfg.port}${cfg.healthPath}`, { signal: AbortSignal.timeout(3000) });
      platformResults[platform] = r.ok ? 'up' : `HTTP ${r.status}`;
    } catch {
      platformResults[platform] = 'down';
    }
  }));

  const upCount = Object.values(platformResults).filter(v => v === 'up').length;
  if (warnings.length) log('warn', 'Preflight warnings', { warnings });
  log('info', 'Preflight complete', { platforms: platformResults, upCount });

  if (fatal.length > 0) {
    log('error', 'Preflight failed', { fatal });
    return false;
  }
  if (upCount === 0) {
    log('warn', 'No browser services up — sessions will fail until services start');
  }
  return true;
}

// ── Claim pending sessions ────────────────────────────────────────────────────
async function claimPendingSessions() {
  const db = getSupabase();
  const windowEnd = new Date(Date.now() + CLAIM_WINDOW_MINUTES * 60_000).toISOString();
  const now = new Date().toISOString();

  // Fetch scheduled sessions due soon
  const { data: sessions, error } = await db
    .from('actp_browser_sessions')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', windowEnd)
    .gt('expires_at', now)
    .order('priority', { ascending: true })
    .order('scheduled_at', { ascending: true })
    .limit(5);

  if (error) throw new Error(`Supabase fetch error: ${error.message}`);
  if (!sessions?.length) return [];

  // Claim each session atomically
  const claimed = [];
  for (const session of sessions) {
    const { data, error: claimErr } = await db
      .from('actp_browser_sessions')
      .update({ status: 'running', claimed_at: now, started_at: now })
      .eq('id', session.id)
      .eq('status', 'scheduled')  // optimistic lock
      .select()
      .single();

    if (!claimErr && data) {
      claimed.push(data);
      log('info', `Claimed session`, { id: session.id, platform: session.platform, action: session.action });
    }
  }
  return claimed;
}

// ── Execute a browser session ─────────────────────────────────────────────────
async function executeSession(session) {
  const route = PLATFORM_ROUTES[session.platform];
  if (!route) throw new Error(`Unknown platform: ${session.platform}`);

  // Chrome-native actions bypass the Safari REST routing entirely
  if (session.action === 'linkedin_connection_send') {
    return executeLinkedInConnectionSend(session);
  }
  if (session.action === 'linkedin_dm_send') {
    return executeLinkedInDmSend(session);
  }
  // LinkedIn prospect_hunt: market-research doesn't support linkedin platform.
  // Route through Chrome CDP instead (same as linkedin-daemon.js).
  if (session.action === 'prospect_hunt' && session.platform === 'linkedin') {
    return executeLinkedInChrome(session);
  }

  const endpointFn = ACTION_ENDPOINTS[session.action];
  if (!endpointFn) throw new Error(`Unknown action: ${session.action}`);

  const url = endpointFn(route.port, session.platform);

  // Normalize params for market-research endpoints before sending.
  // prospect_hunt expects { niche, keyword } — orchestrator may send { keywords: [] }
  // comment_harvest expects { query } — orchestrator may send { niche, keyword }
  if (session.action === 'prospect_hunt') {
    const p = session.params || {};
    if (!p.niche) {
      const kws = p.keywords || (p.keyword ? [p.keyword] : []);
      session = { ...session, params: { ...p, niche: kws[0] || 'ai automation', keyword: kws[1] || kws[0] || '' } };
    }
  }
  if (session.action === 'comment_harvest') {
    const p = session.params || {};
    if (!p.query && (p.niche || p.keyword)) {
      const q = [p.niche, p.keyword].filter(Boolean).join(' ');
      session = { ...session, params: { ...p, query: q } };
    }
  }
  log('info', `Executing session`, { id: session.id, platform: session.platform, action: session.action, url });

  // Health check first
  try {
    const health = await fetch(`http://localhost:${route.port}${route.healthPath}`, { signal: AbortSignal.timeout(5000) });
    if (!health.ok) throw new Error(`Service unhealthy: HTTP ${health.status}`);

    // For Safari actions: ensure the target service has an active tab claimed before
    // executing. Derive the port from the actual endpoint URL — prospect_hunt and
    // comment_harvest route to market-research :3106, not the platform port — so we
    // cannot use route.port here.
    // Skip for port 3106 (market-research) — it manages its own Safari tab internally.
    const ensurePort = parseInt(url.match(/:(\d+)\//)?.[1] || '0', 10);
    const SKIP_ENSURE_PORTS = new Set([3106]);
    if (ensurePort > 0 && route.browser === 'safari' && !SKIP_ENSURE_PORTS.has(ensurePort)) {
      let ensureResp;
      try {
        ensureResp = await fetch(`http://localhost:${ensurePort}/api/session/ensure`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
          signal: AbortSignal.timeout(15_000),
        });
      } catch (ensureErr) {
        throw new Error(`Tab claim failed for port ${ensurePort}: ${ensureErr.message}`);
      }
      if (!ensureResp.ok) {
        const body = await ensureResp.text().catch(() => '');
        throw new Error(`Tab claim failed for port ${ensurePort}: HTTP ${ensureResp.status} — ${body.slice(0, 200)}`);
      }
      const ensureData = await ensureResp.json().catch(() => ({}));
      if (ensureData.ok === false) {
        throw new Error(`Tab claim failed for port ${ensurePort}: no active Safari tab — open ${session.platform} in Safari first`);
      }
      log('info', `Tab claimed`, { platform: session.platform, port: ensurePort, tab: ensureData.tabIndex ?? '?' });
    }
  } catch (err) {
    // Try Chrome fallback for LinkedIn
    if (session.platform === 'linkedin' && route.chromeFallback) {
      log('warn', 'LinkedIn Safari down — using Chrome CDP fallback', { id: session.id });
      return executeLinkedInChrome(session);
    }
    throw new Error(`Service at port ${route.port} not available: ${err.message}`);
  }

  // GET actions: inbox_check, profile_extract (read-only, no body)
  const GET_ACTIONS = new Set(['inbox_check', 'profile_extract']);
  const method = GET_ACTIONS.has(session.action) ? 'GET' : 'POST';
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token-12345' },
    ...(method === 'POST' ? { body: JSON.stringify(session.params || {}) } : {}),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    // 409 = job already running on this platform → skip gracefully
    if (response.status === 409) {
      log('warn', `Platform busy (409) — skipping`, { id: session.id, platform: session.platform });
      return { skipped: true, reason: 'platform_busy' };
    }
    // inbox_check 5xx = Safari tab not open for this platform → skip gracefully (not a daemon bug)
    if (response.status >= 500 && session.action === 'inbox_check') {
      log('warn', `inbox_check Safari tab not available — skipping (open ${session.platform} in Safari to enable)`, { id: session.id });
      return { count: 0, conversations: [], skipped: true, reason: 'safari_tab_not_open' };
    }
    throw new Error(`Service returned ${response.status}: ${text.slice(0, 200)}`);
  }

  return response.json();
}

// ── LinkedIn Chrome: send connection requests (spawns linkedin-connection-sender.js) ──
async function executeLinkedInConnectionSend(session) {
  const limit  = session.params?.limit ?? 7;  // default: half of daily max (15)
  const dryRun = session.params?.dry_run ?? false;
  const script = path.join(HARNESS_DIR, 'linkedin-connection-sender.js');

  log('info', `Running connection sender`, { limit, dryRun });

  return new Promise((resolve, reject) => {

    const args = [script, '--limit', String(limit)];
    if (dryRun) args.push('--dry-run');

    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });

    const timer = setTimeout(() => { child.kill(); reject(new Error('connection-sender timed out after 10min')); }, 600_000);
    child.on('close', code => {
      clearTimeout(timer);
      const lastLogLine = stderr.trim().split('\n').pop() || '';
      if (code !== 0) { reject(new Error(`connection-sender exited ${code}: ${lastLogLine}`)); return; }
      // Parse summary from last log line (e.g. "Done — sent: 5, skipped: 1, failed: 0")
      const match = lastLogLine.match(/sent:\s*(\d+).*skipped:\s*(\d+).*failed:\s*(\d+)/);
      resolve({
        sent:    match ? parseInt(match[1]) : 0,
        skipped: match ? parseInt(match[2]) : 0,
        failed:  match ? parseInt(match[3]) : 0,
        log:     lastLogLine,
      });
    });
  });
}

// ── LinkedIn Chrome: send DMs (spawns linkedin-dm-sender.js) ─────────────────
async function executeLinkedInDmSend(session) {
  const limit  = session.params?.limit ?? 5;
  const dryRun = session.params?.dry_run ?? false;
  const script = path.join(HARNESS_DIR, 'linkedin-dm-sender.js');

  log('info', `Running DM sender`, { limit, dryRun });

  return new Promise((resolve, reject) => {

    const args = [script, '--limit', String(limit)];
    if (dryRun) args.push('--dry-run');

    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', d => { stderr += d; });

    const timer = setTimeout(() => { child.kill(); reject(new Error('dm-sender timed out after 10min')); }, 600_000);
    child.on('close', code => {
      clearTimeout(timer);
      const lastLogLine = stderr.trim().split('\n').pop() || '';
      if (code !== 0) { reject(new Error(`dm-sender exited ${code}: ${lastLogLine}`)); return; }
      const match = lastLogLine.match(/sent:\s*(\d+).*skipped:\s*(\d+).*failed:\s*(\d+)/);
      resolve({
        sent:    match ? parseInt(match[1]) : 0,
        skipped: match ? parseInt(match[2]) : 0,
        failed:  match ? parseInt(match[3]) : 0,
        log:     lastLogLine,
      });
    });
  });
}

// ── LinkedIn Chrome CDP fallback ──────────────────────────────────────────────
// linkedin-chrome-search.js is designed as a standalone CLI script (auto-executes,
// never exports). Spawn it as a subprocess — stdout is JSON, stderr is log lines.
async function executeLinkedInChrome(session) {
  const cdpUrl = `http://localhost:9333`;
  try {
    const health = await fetch(`${cdpUrl}/json`, { signal: AbortSignal.timeout(3000) });
    if (!health.ok) throw new Error('Chrome CDP not available');
  } catch {
    throw new Error('Both LinkedIn Safari and Chrome CDP are unavailable');
  }

  const script = path.join(HARNESS_DIR, 'linkedin-chrome-search.js');
  const params = session.params || {};
  const spawnArgs = [script];
  if (params.keywords || params.keyword) spawnArgs.push('--keywords', params.keywords || params.keyword);
  if (params.title)   spawnArgs.push('--title', params.title);
  if (params.niche)   spawnArgs.push('--keywords', params.niche);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, spawnArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });

    const timer = setTimeout(() => { child.kill(); reject(new Error('linkedin-chrome-search timed out after 5min')); }, 300_000);
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) {
        const errLine = stderr.trim().split('\n').pop() || '';
        reject(new Error(`linkedin-chrome-search exited ${code}: ${errLine}`));
        return;
      }
      try {
        const raw = stdout.trim() || '[]';
        const results = JSON.parse(raw);
        resolve({ profiles: Array.isArray(results) ? results : [results] });
      } catch {
        reject(new Error(`linkedin-chrome-search returned non-JSON: ${stdout.slice(0, 200)}`));
      }
    });
  });
}

// ── Post result back to Supabase ──────────────────────────────────────────────
async function postResult(sessionId, result, error = null) {
  const db = getSupabase();
  const now = new Date().toISOString();
  const update = {
    status: error ? 'failed' : 'completed',
    completed_at: now,
    result: error ? null : result,
    error: error ? String(error) : null,
  };

  const { error: updateErr } = await db
    .from('actp_browser_sessions')
    .update(update)
    .eq('id', sessionId);

  if (updateErr) log('error', 'Failed to post result', { sessionId, updateErr: updateErr.message });
  else log(error ? 'error' : 'success', 'Session complete', { sessionId, status: update.status });
  // Telegram notification (fire-and-forget)
  return { status: update.status, error };
}

// ── Self-improvement analysis ─────────────────────────────────────────────────
async function runSelfImprovement() {
  if (!ANTHROPIC_KEY) { log('warn', 'Skipping improvement — no ANTHROPIC_API_KEY'); return; }

  log('improve', 'Running self-improvement analysis...');
  const db = getSupabase();

  // Pull last 24h of completed sessions
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: sessions } = await db
    .from('actp_browser_sessions')
    .select('platform, action, status, result, error, goal_tag, params')
    .gte('completed_at', since)
    .in('status', ['completed', 'failed']);

  if (!sessions?.length) { log('improve', 'No completed sessions to analyze'); return; }

  // Summarize by platform+action
  const summary = {};
  for (const s of sessions) {
    const key = `${s.platform}:${s.action}`;
    if (!summary[key]) summary[key] = { total: 0, success: 0, failure: 0, errors: [], resultSamples: [] };
    summary[key].total++;
    if (s.status === 'completed') {
      summary[key].success++;
      if (s.result && summary[key].resultSamples.length < 3) {
        summary[key].resultSamples.push(s.result);
      }
    } else {
      summary[key].failure++;
      if (s.error) summary[key].errors.push(s.error.slice(0, 200));
    }
  }

  const goals = JSON.parse(readFileSync(GOALS_FILE, 'utf8'));

  // Ask Claude Haiku for analysis + strategy updates
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const prompt = `You are the self-improvement loop for an autonomous business system.

Business Goals:
${JSON.stringify({ revenue: goals.revenue, growth: goals.growth }, null, 2)}

Last 24h Browser Session Results (${sessions.length} total):
${JSON.stringify(summary, null, 2)}

Analyze:
1. Which platform+action combos have low success rates? What might be causing it?
2. Which are working well and should be increased in frequency?
3. For failing combos, what param changes might fix them?
4. Given the business goals, what new session types should we be booking?

Return a JSON object with:
{
  "insights": ["string"],
  "strategy_updates": [{ "key": "platform:action", "recommendation": "string", "param_changes": {} }],
  "new_session_types": [{ "platform": "string", "action": "string", "frequency": "3x daily|daily|weekly", "params": {} }],
  "code_fixes_needed": ["component: description"]
}`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  let analysis;
  try {
    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { insights: [text], strategy_updates: [], new_session_types: [], code_fixes_needed: [] };
  } catch {
    log('warn', 'Could not parse Haiku response as JSON');
    return;
  }

  log('improve', 'Analysis complete', { insights: analysis.insights?.length, updates: analysis.strategy_updates?.length });

  // Store strategy updates in Supabase
  for (const update of (analysis.strategy_updates || [])) {
    const [platform, action] = update.key.split(':');
    await db.from('actp_strategy_configs').upsert({
      strategy_name: update.key,
      platform,
      active: true,   // required: orchestrator filters by active=true when reading back
      params: update.param_changes || {},
      performance: summary[update.key] || {},
      updated_at: new Date().toISOString(),
    }, { onConflict: 'strategy_name' });
  }

  // Log insights to Supabase for dashboard visibility
  await db.from('actp_improvement_events').insert({
    ts: new Date().toISOString(),
    sessions_analyzed: sessions.length,
    insights: analysis.insights,
    strategy_updates: analysis.strategy_updates,
    new_session_types: analysis.new_session_types,
    code_fixes_needed: analysis.code_fixes_needed,
  }).then(() => {}, () => {}); // table may not exist yet

  // If code fixes needed, emit failure events for self-healer to pick up
  for (const fix of (analysis.code_fixes_needed || [])) {
    const [component, ...rest] = fix.split(': ');
    await db.from('actp_failure_events').insert({
      component: component?.trim() || 'unknown',
      error_type: 'improvement_needed',
      error_message: rest.join(': '),
      severity: 'medium',
      created_at: new Date().toISOString(),
    }).then(() => {}, () => {});
  }

  log('improve', 'Self-improvement cycle complete', {
    newSessionTypes: analysis.new_session_types?.length,
    codeFixes: analysis.code_fixes_needed?.length,
  });

  return analysis;
}

// ── Expire overdue sessions ───────────────────────────────────────────────────
async function expireOverdueSessions() {
  const db = getSupabase();
  const now = new Date().toISOString();
  const { count } = await db
    .from('actp_browser_sessions')
    .update({ status: 'expired' })
    .eq('status', 'scheduled')
    .lt('expires_at', now)
    .select('id', { count: 'exact', head: true });
  if (count > 0) log('warn', `Expired ${count} overdue sessions`);
}

// ── Format session result for Telegram ───────────────────────────────────────
function formatSessionResult(session, result) {
  const tag = `<b>${session.platform}:${session.action}</b>`;
  if (!result || result.skipped) return `⏭️ ${tag} — platform busy (skipped)`;

  const { platform, action } = session;

  // Async job started (market research returns jobId immediately)
  if (result.jobId && result.status === 'running') {
    return `🔄 ${tag} — job started (results async)`;
  }

  // prospect_hunt / comment_harvest — array of profiles or posts
  if (action === 'prospect_hunt' || action === 'comment_harvest') {
    const items = result.profiles ?? result.results ?? result.data ?? [];
    if (items.length > 0) {
      const preview = items.slice(0, 3).map(p =>
        `    • ${p.name || p.username || p.author || p.title || JSON.stringify(p).slice(0, 60)}`
      ).join('\n');
      return `✅ ${tag} — ${items.length} found\n${preview}${items.length > 3 ? `\n    … +${items.length - 3} more` : ''}`;
    }
    return `✅ ${tag} — 0 results`;
  }

  // inbox_check — unread conversations
  if (action === 'inbox_check') {
    const msgs = result.conversations ?? result.messages ?? result.unread ?? result.data ?? [];
    const count = Array.isArray(msgs) ? msgs.length : (result.count ?? result.total ?? 0);
    if (count > 0) {
      const preview = (Array.isArray(msgs) ? msgs : []).slice(0, 3).map(m =>
        `    💬 ${m.sender || m.from || m.name || '?'}: ${(m.snippet || m.text || m.lastMessage || '').slice(0, 60)}`
      ).join('\n');
      return `📬 ${tag} — ${count} unread\n${preview}`;
    }
    return `✅ ${tag} — inbox clear`;
  }

  // linkedin_connection_send — show how many requests went out
  if (action === 'linkedin_connection_send') {
    const sent = result.sent ?? 0;
    const skipped = result.skipped ?? 0;
    const failed = result.failed ?? 0;
    if (sent > 0) {
      return `🤝 <b>LinkedIn Connections</b> — ${sent} sent, ${skipped} skipped${failed ? `, ${failed} failed` : ''}`;
    }
    return `⏭️ <b>LinkedIn Connections</b> — none sent (${skipped} skipped)`;
  }

  // linkedin_dm_send — show how many DMs went out
  if (action === 'linkedin_dm_send') {
    const sent = result.sent ?? 0;
    const skipped = result.skipped ?? 0;
    const failed = result.failed ?? 0;
    if (sent > 0) {
      return `💬 <b>LinkedIn DMs</b> — ${sent} sent, ${skipped} skipped${failed ? `, ${failed} failed` : ''}`;
    }
    return `⏭️ <b>LinkedIn DMs</b> — none sent (${skipped} skipped, no approved items?)`;
  }

  // job_scan (Upwork)
  if (action === 'job_scan') {
    const jobs = result.jobs ?? result.results ?? result.data ?? [];
    if (jobs.length > 0) {
      const preview = jobs.slice(0, 3).map(j =>
        `    💼 ${(j.title || j.name || '?').slice(0, 70)} ${j.budget ? '($' + j.budget + ')' : ''}`
      ).join('\n');
      return `✅ ${tag} — ${jobs.length} jobs found\n${preview}`;
    }
    return `✅ ${tag} — no new jobs`;
  }

  // Generic fallback
  const countKeys = ['count', 'total', 'found', 'length'];
  for (const k of countKeys) {
    if (typeof result[k] === 'number' && result[k] > 0) return `✅ ${tag} — ${result[k]} ${k}`;
  }
  return `✅ ${tag}`;
}

// ── Main execution loop ───────────────────────────────────────────────────────
async function runCycle() {
  await expireOverdueSessions();
  const sessions = await claimPendingSessions();
  if (!sessions.length) { log('info', 'No sessions due — waiting'); return 0; }

  let succeeded = 0;
  const telegramLines = [];
  for (const session of sessions) {
    try {
      const result = await executeSession(session);
      await postResult(session.id, result);
      succeeded++;
      telegramLines.push(formatSessionResult(session, result));
    } catch (err) {
      log('error', 'Session failed', { id: session.id, error: err.message });
      await postResult(session.id, null, err.message);
      telegramLines.push(`❌ <b>${session.platform}:${session.action}</b> — ${err.message.slice(0, 80)}`);

      // Emit failure event for self-healer
      getSupabase().from('actp_failure_events').insert({
        component: `browser_${session.platform}`,
        error_type: 'session_execution_failed',
        error_message: err.message,
        context: { session_id: session.id, platform: session.platform, action: session.action },
        severity: 'medium',
        created_at: new Date().toISOString(),
      }).then(() => {}, () => {});
    }
  }

  log('info', `Cycle complete`, { total: sessions.length, succeeded });

  // Send Telegram batch summary with inline buttons
  if (telegramLines.length > 0) {
    const rate = Math.round(100 * succeeded / sessions.length);
    const hasFailed = succeeded < sessions.length;
    const text = `🤖 <b>Browser Session Cycle</b> — ${succeeded}/${sessions.length} (${rate}%)\n` + telegramLines.join('\n');
    const buttons = { inline_keyboard: [[
      { text: '📊 Status',    callback_data: 'status' },
      { text: '📋 DM Queue', callback_data: 'queue' },
      ...(hasFailed ? [{ text: '🔁 Retry Failed', callback_data: 'boost:instagram' }] : []),
    ]]};
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML', reply_markup: buttons }),
        signal: AbortSignal.timeout(8000),
      });
    } catch { /* non-fatal */ }
  }

  return succeeded;
}

// ── Entry point ───────────────────────────────────────────────────────────────
async function main() {
  log('info', `Browser session daemon starting`, { mode: MODE, pid: process.pid });

  const ok = await preflight();
  if (MODE === 'test') { process.exit(ok ? 0 : 1); }
  if (!ok) { log('error', 'Preflight failed — exiting'); process.exit(1); }

  if (MODE === 'improve') {
    await runSelfImprovement();
    process.exit(0);
  }

  if (MODE === 'once') {
    await runCycle();
    process.exit(0);
  }

  // Daemon mode — poll forever
  let lastImproveTime = Date.now();
  log('info', `Daemon started — polling every ${POLL_INTERVAL_MS / 1000}s`);

  const poll = async () => {
    try {
      await runCycle();
    } catch (err) {
      log('error', 'Cycle error', { error: err.message });
    }

    // Self-improvement every 6h
    if (Date.now() - lastImproveTime > IMPROVE_INTERVAL_MS) {
      lastImproveTime = Date.now();
      runSelfImprovement().catch(err => log('error', 'Improvement failed', { error: err.message }));
    }

    setTimeout(poll, POLL_INTERVAL_MS);
  };

  poll();
}

main().catch(err => { log('error', 'Fatal', { error: err.message }); process.exit(1); });
