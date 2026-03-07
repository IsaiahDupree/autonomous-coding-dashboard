#!/usr/bin/env node
/**
 * node-heartbeat.js
 * =================
 * Registers this machine as a named local_node in Supabase and emits
 * heartbeats every 30 seconds with full worker + browser health.
 *
 * What it reports:
 *   - Per safari service port: HTTP /health ping, auth state, queue depth
 *   - Chrome CDP port status
 *   - Local queue depths (DM queues, prospect queues, LinkedIn queue)
 *   - Rate-limit state per platform
 *   - Watchdog daemon PIDs (which daemons are running)
 *   - Business mode (from business-goals.json)
 *
 * Upserts to:
 *   - local_nodes   (one row per machine, updated every heartbeat)
 *   - worker_status (one row per worker, upserted every heartbeat)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS   = __dirname;
const HOME      = process.env.HOME;

// ── Config ────────────────────────────────────────────────────────────────────
const NODE_ID        = process.env.NODE_ID || 'mac-mini-main';
const SUPABASE_URL   = process.env.SUPABASE_URL   || 'https://ivhfuhxorppptyuofbgq.supabase.co';
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '';
const HEARTBEAT_MS   = 30_000;
const HEALTH_TIMEOUT = 3_000;

// ── Safari service registry ───────────────────────────────────────────────────
const SAFARI_WORKERS = [
  { worker_id: 'instagram-dm',       platform: 'instagram', port: 3100 },
  { worker_id: 'twitter-dm',         platform: 'twitter',   port: 3003 },
  { worker_id: 'tiktok-dm',          platform: 'tiktok',    port: 3102 },
  { worker_id: 'linkedin-dm',        platform: 'linkedin',  port: 3105 },
  { worker_id: 'instagram-comments', platform: 'instagram', port: 3005 },
  { worker_id: 'tiktok-comments',    platform: 'tiktok',    port: 3006 },
  { worker_id: 'twitter-comments',   platform: 'twitter',   port: 3007 },
  { worker_id: 'threads-comments',   platform: 'threads',   port: 3004 },
  { worker_id: 'market-research',    platform: 'research',  port: 3106 },
  { worker_id: 'upwork',             platform: 'upwork',    port: 3104 },
  { worker_id: 'upwork-hunter',      platform: 'upwork',    port: 3107 },
  { worker_id: 'linkedin-hub',       platform: 'linkedin',  port: 3434 },
];

// ── Logging ───────────────────────────────────────────────────────────────────
const LOG = path.join(HARNESS, 'node-heartbeat-log.ndjson');
function log(event, data = {}) {
  const entry = { ts: new Date().toISOString(), event, ...data };
  console.log(`[${entry.ts.slice(11, 19)}] ${event}`, data.message || data.error || '');
  try { fs.appendFileSync(LOG, JSON.stringify(entry) + '\n'); } catch {}
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function httpGet(url, timeoutMs = HEALTH_TIMEOUT) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const text = await res.text();
    clearTimeout(timer);
    return { ok: res.ok, status: res.status, body: text };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, status: 0, error: err.message };
  }
}

async function supabaseUpsert(table, data, onConflict) {
  if (!SUPABASE_KEY) return { ok: false, error: 'no SUPABASE_KEY' };
  const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(Array.isArray(data) ? data : [data]),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Read local state files ────────────────────────────────────────────────────
function readJson(filePath, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}

function getQueueDepth(queueFile) {
  const data = readJson(path.join(HARNESS, queueFile), []);
  if (Array.isArray(data)) return data.filter(x => x.status === 'pending' || !x.status).length;
  if (data.queue && Array.isArray(data.queue)) return data.queue.filter(x => x.status === 'pending' || !x.status).length;
  return 0;
}

function getRateLimitState() {
  return readJson(path.join(HARNESS, '.rate-limit-state.json'), {});
}

function getWatchdogPids() {
  const daemons = [
    'cloud-bridge', 'browser-session-daemon', 'dm-outreach-daemon',
    'linkedin-daemon', 'linkedin-engagement', 'linkedin-followup',
    'twitter-dm-sweep', 'instagram-dm-sweep', 'tiktok-dm-sweep',
    'dm-crm-sync', 'dm-followup-engine', 'telegram-bot',
    'obsidian-interlinker', 'doctor-daemon', 'polsia-orchestrator',
  ];
  const result = {};
  for (const name of daemons) {
    const pidFile = path.join(HARNESS, `${name}.pid`);
    try {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
      try { process.kill(pid, 0); result[name] = { pid, running: true }; }
      catch { result[name] = { pid, running: false }; }
    } catch {
      result[name] = { running: false };
    }
  }
  return result;
}

function getBusinessGoals() {
  try {
    const g = readJson(path.join(HOME, 'Documents/Software/business-goals.json'));
    return {
      revenue_target: g.revenue_target,
      priority_platforms: g.priority_platforms,
      active_goal: g.active_goal || 'prospecting',
    };
  } catch { return {}; }
}

// ── Ping a single safari worker ───────────────────────────────────────────────
async function pingWorker(worker) {
  const start = Date.now();
  const healthUrl = `http://localhost:${worker.port}/health`;
  const res = await httpGet(healthUrl);
  const responseMs = Date.now() - start;

  let status = 'offline';
  let authState = 'unknown';
  let activeTabs = 0;
  let lastAction = null;
  let queueDepth = 0;

  if (res.ok || res.status === 200) {
    status = 'healthy';
    try {
      const body = JSON.parse(res.body);
      // Normalize across different service response shapes
      if (body.status === 'ok' || body.status === 'running' || body.status === 'healthy') {
        status = 'healthy';
      } else if (body.status === 'degraded') {
        status = 'degraded';
      }
      authState    = body.authenticated === true ? 'authenticated'
                   : body.authenticated === false ? 'expired'
                   : body.auth_state || 'unknown';
      activeTabs   = body.active_tabs || body.tabs || 0;
      lastAction   = body.last_action || body.lastAction || null;
      queueDepth   = body.queue_depth || body.queueDepth || 0;
    } catch {}
  } else if (res.status === 503) {
    status = 'degraded';
  }

  // Override queue depth from local queue files for DM workers
  const queueMap = {
    'instagram-dm': 'instagram-dm-queue.json',
    'twitter-dm':   'linkedin-dm-queue.json',  // twitter uses same pattern
    'tiktok-dm':    'tiktok-dm-queue.json',
    'linkedin-hub': 'linkedin-dm-queue.json',
  };
  if (queueMap[worker.worker_id]) {
    queueDepth = getQueueDepth(queueMap[worker.worker_id]);
  }

  // Check rate limit state
  const rlState = getRateLimitState();
  const rateLimit = rlState[worker.platform] || {};

  return {
    node_id: NODE_ID,
    worker_id: worker.worker_id,
    platform: worker.platform,
    port: worker.port,
    status,
    last_ping_at: new Date().toISOString(),
    queue_depth: queueDepth,
    auth_state: authState,
    active_tabs: activeTabs,
    last_action: lastAction,
    rate_limit_state: rateLimit,
    response_ms: responseMs,
    updated_at: new Date().toISOString(),
  };
}

// ── Check Chrome CDP ──────────────────────────────────────────────────────────
async function checkChrome() {
  const res = await httpGet('http://localhost:9333/json/version', 2000);
  if (res.ok) {
    try {
      const info = JSON.parse(res.body);
      return { status: 'healthy', version: info.Browser, wsUrl: info.webSocketDebuggerUrl };
    } catch {}
  }
  return { status: 'offline' };
}

// ── Build full node snapshot ──────────────────────────────────────────────────
async function buildNodeSnapshot(workerRows) {
  const chrome = await checkChrome();
  const daemons = getWatchdogPids();
  const goals = getBusinessGoals();
  const rlState = getRateLimitState();

  const runningDaemons = Object.entries(daemons)
    .filter(([, v]) => v.running).map(([k]) => k);

  const workerStateMap = {};
  for (const w of workerRows) {
    workerStateMap[w.worker_id] = { status: w.status, auth: w.auth_state, queue: w.queue_depth };
  }

  const onlineWorkers   = workerRows.filter(w => w.status !== 'offline').length;
  const degradedWorkers = workerRows.filter(w => w.status === 'degraded').length;
  const overallStatus   = onlineWorkers === 0 ? 'offline'
                        : degradedWorkers > 3  ? 'degraded'
                        : 'healthy';

  const totalQueueDepth = workerRows.reduce((s, w) => s + (w.queue_depth || 0), 0);

  return {
    node_id: NODE_ID,
    hostname: os.hostname(),
    status: overallStatus,
    last_heartbeat_at: new Date().toISOString(),
    queue_depth: totalQueueDepth,
    active_goal: goals.active_goal,
    business_mode: 'autonomous',
    capabilities: {
      browsers: ['safari', chrome.status === 'healthy' ? 'chrome' : null].filter(Boolean),
      skills: ['instagram_dm', 'twitter_dm', 'tiktok_dm', 'linkedin_search',
               'upwork_proposals', 'market_research', 'comment_sweep'],
      mcps: ['obsidian', 'supabase', 'playwright', 'adlite', 'gtm', 'video-studio'],
      safari_services: SAFARI_WORKERS.map(w => w.worker_id),
      ports: SAFARI_WORKERS.map(w => w.port),
      platform_targets: goals.priority_platforms || [],
    },
    browser_state: {
      safari: {
        status: onlineWorkers > 0 ? 'healthy' : 'offline',
        active_workers: onlineWorkers,
        tabs: workerRows.reduce((s, w) => s + (w.active_tabs || 0), 0),
      },
      chrome: chrome,
    },
    worker_state: workerStateMap,
    metadata: {
      daemons_running: runningDaemons,
      daemon_count: runningDaemons.length,
      rate_limits: Object.keys(rlState),
      platform_targets: goals.priority_platforms,
    },
    updated_at: new Date().toISOString(),
  };
}

// ── Emit command event ────────────────────────────────────────────────────────
export async function emitCommandEvent(commandId, eventType, data = {}) {
  return supabaseUpsert('command_events', {
    command_id: commandId,
    node_id: NODE_ID,
    worker_id: data.worker_id,
    event_type: eventType,
    status: data.status,
    progress_pct: data.progress_pct,
    message: data.message,
    metadata: data.metadata || {},
  }, 'id');
}

// ── Emit automation artifact ──────────────────────────────────────────────────
export async function emitArtifact(commandId, workerId, artifactType, data, metadata = {}) {
  return supabaseUpsert('automation_artifacts', {
    command_id: commandId,
    node_id: NODE_ID,
    worker_id: workerId,
    artifact_type: artifactType,
    result_type: metadata.result_type,
    data,
    file_url: metadata.file_url,
    metadata,
  }, 'id');
}

// ── Main heartbeat loop ───────────────────────────────────────────────────────
async function heartbeat() {
  // Ping all safari workers in parallel
  const workerRows = await Promise.all(SAFARI_WORKERS.map(pingWorker));

  // Build node snapshot
  const nodeRow = await buildNodeSnapshot(workerRows);

  // Upsert node row
  const nodeResult = await supabaseUpsert('local_nodes', nodeRow, 'node_id');

  // Upsert all worker rows in one call
  const workerResult = await supabaseUpsert('worker_status', workerRows, 'node_id,worker_id');

  const onlineCount = workerRows.filter(w => w.status !== 'offline').length;
  log('heartbeat', {
    status: nodeRow.status,
    workers_online: onlineCount,
    workers_total: workerRows.length,
    queue_depth: nodeRow.queue_depth,
    daemons: nodeRow.metadata.daemon_count,
    node_ok: nodeResult.ok,
    workers_ok: workerResult.ok,
  });

  if (!nodeResult.ok || !workerResult.ok) {
    log('heartbeat_warn', { node_err: nodeResult.error, worker_err: workerResult.error });
  }
}

async function main() {
  log('startup', { node_id: NODE_ID, workers: SAFARI_WORKERS.length, interval_ms: HEARTBEAT_MS });

  if (!SUPABASE_KEY) {
    log('warn', { message: 'SUPABASE_KEY not set — heartbeats will fail silently. Set SUPABASE_SERVICE_KEY env var.' });
  }

  // First heartbeat immediately
  await heartbeat();

  // Then every HEARTBEAT_MS
  setInterval(heartbeat, HEARTBEAT_MS);

  process.on('SIGINT',  () => { log('shutdown', { signal: 'SIGINT' });  process.exit(0); });
  process.on('SIGTERM', () => { log('shutdown', { signal: 'SIGTERM' }); process.exit(0); });

  console.log(`\nNode Heartbeat running — ${NODE_ID} — reporting every ${HEARTBEAT_MS / 1000}s`);
}

main().catch(err => { log('fatal', { error: err.message }); process.exit(1); });
