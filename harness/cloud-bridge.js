#!/usr/bin/env node

/**
 * Cloud <-> Local Request Bridge Daemon (PRD-083)
 * ================================================
 * PRIMARY:  Supabase Realtime websocket subscription — ~100ms latency.
 *           New rows inserted into safari_command_queue trigger instant processing.
 * FALLBACK: Poll every 60s to catch any events missed during reconnects.
 *
 * Uses the existing safari_command_queue table (platform, action,
 * params, status, result, error, priority columns).
 *
 * Usage:
 *   node harness/cloud-bridge.js              # run 24/7
 *   node harness/cloud-bridge.js --once       # single poll cycle, then exit
 *   node harness/cloud-bridge.js --test       # preflight connectivity check
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;

// ── File paths ──────────────────────────────────────────────────────────────
const STATE_FILE = path.join(HARNESS_DIR, 'cloud-bridge-state.json');
const LOG_FILE   = path.join(HARNESS_DIR, 'cloud-bridge-log.ndjson');
const LOGS_DIR   = path.join(HARNESS_DIR, 'logs');
const ACTP_ENV   = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const HOME_ENV   = `${process.env.HOME}/.env`;
const SAFARI_ENV = '/Users/isaiahdupree/Documents/Software/Safari Automation/.env';

// ── Bootstrap env ───────────────────────────────────────────────────────────
function loadEnvFile(filePath) {
  try {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([A-Z0-9_]+)=(.+)/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim();
      }
    }
  } catch { /* non-fatal */ }
}
loadEnvFile(HOME_ENV);
loadEnvFile(SAFARI_ENV);
loadEnvFile(ACTP_ENV);

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ivhfuhxorppptyuofbgq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const FALLBACK_POLL_MS = 60_000;       // 60s fallback poll (catches missed realtime events)
const MAX_COMMANDS_PER_HOUR = 100;     // per platform
const BATCH_SIZE = 5;                  // commands per fallback poll cycle

// Table name: reuses existing safari_command_queue
const TABLE = 'safari_command_queue';

// Supabase JS client — used for Realtime subscription
let supabase = null;

const args = process.argv.slice(2);
const MODE = args.includes('--once') ? 'once'
  : args.includes('--test') ? 'test'
  : 'daemon';

// ── Supabase REST helpers ───────────────────────────────────────────────────
const SB_HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function sbSelect(table, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, { headers: SB_HEADERS });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase SELECT ${table} failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function sbUpdate(table, matchCol, matchVal, updates) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${matchCol}=eq.${matchVal}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: SB_HEADERS,
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase UPDATE ${table} failed: ${res.status} ${body}`);
  }
  return res.json();
}

// ── Command Allowlist ───────────────────────────────────────────────────────
// DM send actions are included — the dm-outreach-daemon also handles local
// sending, but cloud can trigger DMs via safari_command_queue Realtime.
export const COMMAND_ALLOWLIST = new Set([
  'instagram:search',
  'instagram:profile',
  'instagram:followers',
  'instagram:posts',
  'instagram:enrich',
  'instagram:scrape',    // scrape IG profile/posts (same as enrich, different alias)
  'instagram:navigate',
  'instagram:status',
  'instagram:dm',        // send DM via IG DM service (port 3100)
  'twitter:search',
  'twitter:profile',
  'twitter:followers',
  'twitter:dm',          // send DM via TW DM service (port 3003)
  'tiktok:search',
  'tiktok:profile',
  'tiktok:posts',
  'tiktok:dm',           // send DM via TK DM service (port 3102)
  'threads:search',
  'threads:profile',
  'linkedin:search',
  'linkedin:profile',
]);

// ── Route Handlers ──────────────────────────────────────────────────────────
export const ROUTES = {
  'instagram:search': (params) =>
    localPost('http://localhost:3005/api/instagram/search/hashtag', params),
  'instagram:profile': (params) =>
    localPost('http://localhost:3005/api/instagram/profile', params),
  'instagram:followers': (params) =>
    localPost('http://localhost:3005/api/instagram/followers', params),
  'instagram:posts': (params) =>
    localPost('http://localhost:3005/api/instagram/posts', params),
  'instagram:enrich': (params) =>
    localPost('http://localhost:3005/api/instagram/profile', params),
  'instagram:scrape': (params) =>
    localPost('http://localhost:3005/api/instagram/profile', params),
  'instagram:navigate': (params) =>
    localPost('http://localhost:3005/api/instagram/navigate', params),
  'instagram:status': (params) =>
    localGet('http://localhost:3005/health'),
  // Cloud-triggered DM: params = { username, text }
  'instagram:dm': (params) =>
    localPost('http://localhost:3100/api/messages/send-to', params),

  'twitter:search': (params) =>
    localPost('http://localhost:3003/api/twitter/search', params),
  'twitter:profile': (params) =>
    localPost('http://localhost:3003/api/twitter/profile', params),
  'twitter:followers': (params) =>
    localPost('http://localhost:3003/api/twitter/followers', params),
  // Cloud-triggered DM: params = { username, text }
  'twitter:dm': (params) =>
    localPost('http://localhost:3003/api/twitter/messages/send-to', params),

  'tiktok:search': (params) =>
    localPost('http://localhost:3006/api/tiktok/search/keyword', params),
  'tiktok:profile': (params) =>
    localPost('http://localhost:3006/api/tiktok/profile', params),
  'tiktok:posts': (params) =>
    localPost('http://localhost:3006/api/tiktok/posts', params),
  // Cloud-triggered DM: params = { username, message }
  'tiktok:dm': (params) =>
    localPost('http://localhost:3102/api/tiktok/messages/send-to', params),

  'threads:search': (params) =>
    localPost('http://localhost:3004/api/threads/search', params),
  'threads:profile': (params) =>
    localPost('http://localhost:3004/api/threads/profile', params),

  'linkedin:search': (params) => spawnChromeSearch(params),
  'linkedin:profile': (params) => spawnChromeSearch({ ...params, mode: 'profile' }),
};

async function localGet(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    let body;
    try { body = await res.json(); } catch { body = await res.text(); }
    return { ok: res.ok, status: res.status, data: body };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

async function localPost(url, params) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    let body;
    try { body = await res.json(); } catch { body = { raw: await res.text() }; }
    return { ok: res.ok, status: res.status, data: body };
  } catch (err) {
    clearTimeout(timeout);
    return { ok: false, status: 0, error: err.message };
  }
}

function spawnChromeSearch(params) {
  return new Promise((resolve) => {
    const script = path.join(HARNESS_DIR, 'linkedin-chrome-search.js');
    const child = spawn('node', [script, JSON.stringify(params)], {
      cwd: HARNESS_DIR,
      timeout: 120_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      try {
        const data = JSON.parse(stdout);
        resolve({ ok: code === 0, status: code, data });
      } catch {
        resolve({ ok: code === 0, status: code, data: { stdout, stderr } });
      }
    });

    child.on('error', (err) => {
      resolve({ ok: false, status: -1, error: err.message });
    });
  });
}

// ── Rate Limiter ────────────────────────────────────────────────────────────
// rateLimits persisted to STATE_FILE so restarts don't reset hourly counters.
let rateLimits = {};

function loadRateLimitsFromState() {
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (state.rateLimits && typeof state.rateLimits === 'object') {
      rateLimits = state.rateLimits;
    }
  } catch { /* first run — start empty */ }
}

function saveRateLimitsToState() {
  try {
    let state = {};
    try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { /* ok */ }
    fs.writeFileSync(STATE_FILE, JSON.stringify({ ...state, rateLimits }, null, 2));
  } catch { /* non-fatal */ }
}

// Load on startup
loadRateLimitsFromState();

function checkRateLimit(platform) {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;

  if (!rateLimits[platform]) {
    rateLimits[platform] = { windowStart: now, count: 0 };
  }

  const entry = rateLimits[platform];
  if (now - entry.windowStart > hourMs) {
    entry.windowStart = now;
    entry.count = 0;
  }

  if (entry.count >= MAX_COMMANDS_PER_HOUR) {
    return { allowed: false, remaining: 0, resetMs: hourMs - (now - entry.windowStart) };
  }

  return { allowed: true, remaining: MAX_COMMANDS_PER_HOUR - entry.count, resetMs: hourMs - (now - entry.windowStart) };
}

function consumeRateLimit(platform) {
  if (!rateLimits[platform]) {
    rateLimits[platform] = { windowStart: Date.now(), count: 0 };
  }
  rateLimits[platform].count++;
  saveRateLimitsToState();
}

function getRateLimitSnapshot() {
  const snap = {};
  for (const [platform, entry] of Object.entries(rateLimits)) {
    snap[platform] = {
      count: entry.count,
      remaining: Math.max(0, MAX_COMMANDS_PER_HOUR - entry.count),
      windowStart: new Date(entry.windowStart).toISOString(),
    };
  }
  return snap;
}

// ── Logging ─────────────────────────────────────────────────────────────────
function log(msg, data = {}) {
  const entry = { ts: new Date().toISOString(), msg, ...data };
  const line = JSON.stringify(entry);
  if (process.stdout.isTTY || !process.env.NOHUP) {
    console.log(`[CloudBridge] ${msg}`);
  }
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch { /* non-fatal */ }
}

// ── State Management ────────────────────────────────────────────────────────
function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { startedAt: null, lastPoll: null, totalProcessed: 0, totalFailed: 0, totalRateLimited: 0, realtimeEvents: 0 };
  }
}

function writeState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch { /* non-fatal */ }
}

// ── Emit command lifecycle event to command_events table ─────────────────────
const NODE_ID = process.env.NODE_ID || 'mac-mini-main';
async function emitCommandEvent(commandId, eventType, data = {}) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/command_events`, {
      method: 'POST',
      headers: { ...SB_HEADERS },
      body: JSON.stringify([{
        command_id: commandId,
        node_id: NODE_ID,
        worker_id: data.worker_id || null,
        event_type: eventType,
        status: data.status || eventType,
        message: data.message || null,
        metadata: data.metadata || {},
      }]),
    });
  } catch { /* non-fatal — don't break command execution */ }
}

// ── Process a single command row ─────────────────────────────────────────────
// Called by both Realtime handler and fallback poll cycle.
async function processCommand(cmd) {
  const state = readState();
  const key = `${cmd.platform}:${cmd.action}`;

  // Claim the row atomically: only process if still 'pending'
  // (prevents double-processing when realtime + fallback poll overlap)
  let claimed;
  try {
    const claimRes = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${cmd.id}&status=eq.pending`,
      {
        method: 'PATCH',
        headers: { ...SB_HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify({ status: 'running', updated_at: new Date().toISOString() }),
      }
    );
    const rows = await claimRes.json();
    claimed = Array.isArray(rows) && rows.length > 0;
  } catch (err) {
    log(`Claim failed for ${cmd.id}: ${err.message}`);
    return;
  }

  if (!claimed) {
    // Already claimed by another process or already processed
    return;
  }

  // Allowlist check
  if (!COMMAND_ALLOWLIST.has(key)) {
    log(`Rejected unknown command: ${key}`, { commandId: cmd.id });
    await sbUpdate(TABLE, 'id', cmd.id, {
      status: 'failed',
      error: `Rejected: unknown command ${key}`,
      updated_at: new Date().toISOString(),
    });
    return;
  }

  // Rate limit check
  const rl = checkRateLimit(cmd.platform);
  if (!rl.allowed) {
    log(`Rate limited: ${cmd.platform}`, { commandId: cmd.id });
    await sbUpdate(TABLE, 'id', cmd.id, {
      status: 'failed',
      error: `Rate limited: ${MAX_COMMANDS_PER_HOUR}/hr exceeded for ${cmd.platform}`,
      updated_at: new Date().toISOString(),
    });
    state.totalRateLimited++;
    writeState(state);
    return;
  }

  // Route to local service
  const handler = ROUTES[key];
  if (!handler) {
    log(`No route handler for ${key}`, { commandId: cmd.id });
    await sbUpdate(TABLE, 'id', cmd.id, {
      status: 'failed',
      error: `No route handler for ${key}`,
      updated_at: new Date().toISOString(),
    });
    state.totalFailed++;
    writeState(state);
    return;
  }

  try {
    consumeRateLimit(cmd.platform);
    // Emit 'started' lifecycle event
    await emitCommandEvent(cmd.id, 'started', { worker_id: cmd.platform, message: `Routing ${key}` });

    const result = await handler(cmd.params || {});
    const finalStatus = result.ok ? 'completed' : 'failed';
    await sbUpdate(TABLE, 'id', cmd.id, {
      status: finalStatus,
      result: JSON.stringify(result.data || result),
      error: result.ok ? null : (result.error || JSON.stringify(result.data)),
      updated_at: new Date().toISOString(),
    });

    // Emit terminal lifecycle event
    await emitCommandEvent(cmd.id, finalStatus, {
      worker_id: cmd.platform,
      message: result.ok ? `OK` : result.error,
      metadata: { key, result_summary: result.ok ? 'success' : 'failure' },
    });

    if (finalStatus === 'completed') {
      state.totalProcessed++;
      log(`Completed: ${key}`, { commandId: cmd.id });
    } else {
      state.totalFailed++;
      log(`Failed: ${key}`, { commandId: cmd.id, error: result.error });
    }
  } catch (err) {
    state.totalFailed++;
    log(`Error executing ${key}: ${err.message}`, { commandId: cmd.id });
    await sbUpdate(TABLE, 'id', cmd.id, {
      status: 'failed',
      error: err.message,
      updated_at: new Date().toISOString(),
    }).catch(() => {});
    await emitCommandEvent(cmd.id, 'failed', {
      worker_id: cmd.platform, message: err.message,
    }).catch(() => {});
  }

  writeState(state);
}

// ── Fallback Poll Cycle ───────────────────────────────────────────────────────
// Drains any 'pending' rows not yet claimed — covers missed realtime events.
async function pollCycle(inFlight = new Set()) {
  const state = readState();
  state.lastPoll = new Date().toISOString();

  try {
    const commands = await sbSelect(
      TABLE,
      'status=eq.pending&order=priority.asc,created_at.asc&limit=' + BATCH_SIZE
    );

    if (commands.length === 0) {
      writeState(state);
      return;
    }

    log(`Fallback poll: found ${commands.length} pending commands`);

    // Process each, skipping any already being handled by Realtime
    await Promise.all(
      commands
        .filter((cmd) => !inFlight.has(cmd.id))
        .map((cmd) => processCommand(cmd).catch((e) => log(`Poll handler error: ${e.message}`)))
    );
  } catch (err) {
    log(`Poll cycle error: ${err.message}`);
  }

  writeState(state);
}

// ── Preflight Check ─────────────────────────────────────────────────────────
async function preflight() {
  console.log('=== Cloud Bridge Preflight ===\n');

  if (!SUPABASE_KEY) {
    console.log('FAIL: SUPABASE_SERVICE_ROLE_KEY not found');
    return false;
  }
  console.log('OK: Supabase service role key loaded');

  try {
    const rows = await sbSelect(TABLE, 'limit=1');
    console.log(`OK: ${TABLE} table exists (${rows.length} sample rows)`);
  } catch (err) {
    console.log(`FAIL: ${TABLE} - ${err.message}`);
    return false;
  }

  const services = [
    { name: 'Instagram (comments)', port: 3005 },
    { name: 'Twitter (DM)', port: 3003 },
    { name: 'TikTok (comments)', port: 3006 },
    { name: 'Threads', port: 3004 },
    { name: 'LinkedIn', port: 3105 },
  ];

  for (const svc of services) {
    try {
      const res = await fetch(`http://localhost:${svc.port}/health`, { signal: AbortSignal.timeout(2000) });
      console.log(`${res.ok ? 'OK' : 'WARN'}: ${svc.name} :${svc.port} — ${res.status}`);
    } catch {
      console.log(`DOWN: ${svc.name} :${svc.port}`);
    }
  }

  console.log('\nPreflight complete.');
  return true;
}

// ── Status (for external callers) ───────────────────────────────────────────
export function getStatus() {
  const state = readState();
  return {
    ...state,
    rateLimits: getRateLimitSnapshot(),
    mode: MODE,
    pid: process.pid,
  };
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  if (MODE === 'test') {
    const ok = await preflight();
    process.exit(ok ? 0 : 1);
  }

  try { fs.mkdirSync(LOGS_DIR, { recursive: true }); } catch {}

  if (!SUPABASE_KEY) {
    console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY not set. Check env files.');
    process.exit(1);
  }

  try {
    await sbSelect(TABLE, 'limit=0');
  } catch (err) {
    console.error(`FATAL: Cannot access ${TABLE}: ${err.message}`);
    process.exit(1);
  }

  const state = readState();
  state.startedAt = new Date().toISOString();
  writeState(state);

  if (MODE === 'once') {
    await pollCycle();
    log('Single cycle complete, exiting');
    process.exit(0);
  }

  // ── Realtime subscription ─────────────────────────────────────────────────
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    realtime: { params: { eventsPerSecond: 10 } },
  });

  // In-flight dedup: prevent double-processing if realtime + fallback poll both fire
  const inFlight = new Set();

  async function handleRealtimeRow(row) {
    if (inFlight.has(row.id)) return;
    inFlight.add(row.id);
    try {
      await processCommand(row);
    } finally {
      inFlight.delete(row.id);
    }
  }

  let realtimeStatus = 'connecting';

  const channel = supabase
    .channel('cloud-bridge-commands')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: TABLE },
      (payload) => {
        // Only process if pending (inserts from other sources may have different status)
        if (payload.new?.status !== 'pending') return;
        log(`Realtime INSERT: ${payload.new?.platform}:${payload.new?.action}`, { commandId: payload.new?.id });
        handleRealtimeRow(payload.new).catch((e) => log(`Realtime handler error: ${e.message}`));
      }
    )
    .subscribe((status) => {
      realtimeStatus = status;
      if (status === 'SUBSCRIBED') {
        log('Realtime subscribed — instant command delivery active (<100ms latency)');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        log(`Realtime ${status} — falling back to ${FALLBACK_POLL_MS / 1000}s polling`);
      }
    });

  // ── Observability mesh: command_queue subscription ────────────────────────
  // Subscribe to new typed commands targeting this node (separate from safari_command_queue).
  // local-agent-daemon polls command_queue every 10s — Realtime here provides faster notification
  // but no direct dispatch needed (the daemon handles its own polling loop).
  supabase
    .channel('cloud-bridge-command-queue')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'command_queue' },
      (payload) => {
        const row = payload.new;
        if (!row) return;
        if (row.node_target !== NODE_ID) return;
        if (row.status !== 'queued') return;
        log(`Realtime command_queue INSERT: ${row.command_type}`, { commandId: row.command_id });
        // local-agent-daemon polls every 10s and will pick this up.
        // No further action needed here — Realtime just ensures fast delivery.
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        log('Observability command_queue Realtime subscribed — typed commands will be relayed to local-agent-daemon');
      }
    });

  // ── Node heartbeat relay ──────────────────────────────────────────────────
  // Emit a lightweight heartbeat to agent_nodes from cloud-bridge so the node
  // shows as 'online' even if local-agent-daemon hasn't started yet.
  const SB_HEADERS_OBS = { ...SB_HEADERS };
  async function cloudBridgeHeartbeat() {
    if (!SUPABASE_KEY) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/agent_nodes?on_conflict=node_id`, {
        method: 'POST',
        headers: { ...SB_HEADERS_OBS, 'Prefer': 'return=minimal,resolution=merge-duplicates' },
        body: JSON.stringify({
          node_id: NODE_ID,
          label: 'Mac Mini Main',
          status: 'online',
          last_heartbeat_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    } catch { /* non-fatal — table may not exist yet */ }
  }

  // Initial heartbeat + 30s interval
  cloudBridgeHeartbeat();
  setInterval(cloudBridgeHeartbeat, 30_000);

  // ── Cron job trigger relay (SDPA-004) ────────────────────────────────────
  // Subscribes to automation_cron_jobs changes. When trigger_requested=true,
  // relays to local cron-manager and resets the flag.
  const CRON_MANAGER_PORT = 3302;

  async function relayCronTrigger(slug) {
    try {
      const res = await fetch(`http://localhost:${CRON_MANAGER_PORT}/api/cron/${slug}/run-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
      const ok = res.ok;
      log(`Cron trigger relayed: ${slug} → cron-manager (${res.status})`);
      // Reset trigger_requested flag in Supabase
      await sbUpdate('automation_cron_jobs', 'slug', slug, {
        trigger_requested: false,
        updated_at: new Date().toISOString(),
      }).catch(err => log(`Failed to reset trigger for ${slug}: ${err.message}`));
      return ok;
    } catch (err) {
      log(`Failed to relay cron trigger for ${slug}: ${err.message}`);
      return false;
    }
  }

  supabase
    .channel('cloud-bridge-cron-jobs')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'automation_cron_jobs' },
      (payload) => {
        const row = payload.new;
        if (!row?.slug) return;
        if (row.trigger_requested === true || row.last_run_status === 'trigger_requested') {
          log(`Cron trigger detected via Realtime: ${row.slug}`);
          relayCronTrigger(row.slug).catch(err => log(`Relay error: ${err.message}`));
        }
        // If schedule/enabled changed, cron-manager will reload on its next 60s cycle
        // No extra action needed here
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        log('Cron job Realtime subscription active — cloud triggers will relay to cron-manager');
      }
    });

  // ── Fallback poll ─────────────────────────────────────────────────────────
  // When realtime is SUBSCRIBED: 60s safety net.
  // When realtime is disconnected: 5s active poll (degraded but functional).
  const fallbackPoll = async () => {
    const degraded = realtimeStatus !== 'SUBSCRIBED';
    if (degraded) log('Fallback poll running (realtime not active — degraded 5s poll mode)');
    await pollCycle(inFlight);
    setTimeout(fallbackPoll, degraded ? 5_000 : FALLBACK_POLL_MS);
  };

  // Initial drain on startup (catch any commands queued while offline)
  log(`Cloud Bridge daemon started (PID ${process.pid}) — Realtime primary, ${FALLBACK_POLL_MS / 1000}s fallback poll`);
  log('NOTE: Realtime requires safari_command_queue in supabase_realtime publication.');
  log('  If not enabled: Dashboard → Database → Replication → enable safari_command_queue');
  await pollCycle(inFlight);
  setTimeout(fallbackPoll, FALLBACK_POLL_MS);

  const shutdown = async () => {
    log('Shutting down...');
    await supabase.removeAllChannels().catch(() => {});
    const s = readState();
    s.stoppedAt = new Date().toISOString();
    writeState(s);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`Cloud Bridge fatal: ${err.message}`);
    process.exit(1);
  });
}
