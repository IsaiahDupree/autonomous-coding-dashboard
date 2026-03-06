#!/usr/bin/env node

/**
 * Multi-Platform DM Outreach Daemon
 * ===================================
 * Runs 24/7 — every 30 min sends DMs for IG, TW, TT from prospect queues.
 *
 * Features:
 *   - Daily limits per platform (env / --limit-ig / --limit-tw / --limit-tt)
 *   - Safari tab claim: IG→tab1, TW→tab2, TK→navigate
 *   - Syncs sent DM events to Supabase safari_command_queue (cloud visibility)
 *   - Updates CRMLite contact stage to dm_sent after each send
 *
 * Usage:
 *   node harness/dm-outreach-daemon.js              # run 24/7
 *   node harness/dm-outreach-daemon.js --once       # single cycle, exit
 *   node harness/dm-outreach-daemon.js --test       # preflight only
 *   node harness/dm-outreach-daemon.js --dry-run    # log, don't send
 *
 * Env overrides:
 *   DM_DAILY_LIMIT_IG=10   DM_DAILY_LIMIT_TW=15   DM_DAILY_LIMIT_TT=8
 *   DM_CYCLE_MIN=30        DM_ACTIVE_HOURS_START=8  DM_ACTIVE_HOURS_END=20
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;

// File paths
const STATE_FILE = path.join(HARNESS_DIR, 'dm-outreach-state.json');
const LOG_FILE   = path.join(HARNESS_DIR, 'dm-outreach-log.ndjson');
const LOGS_DIR   = path.join(HARNESS_DIR, 'logs');
const ACTP_ENV   = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const SAFARI_ENV = '/Users/isaiahdupree/Documents/Software/Safari Automation/.env';
const HOME_ENV   = `${process.env.HOME}/.env`;

// Per-platform prospect queue files (written by prospect-pipeline.js)
const QUEUE_FILES = {
  ig: path.join(HARNESS_DIR, 'prospect-ig-queue.json'),
  tw: path.join(HARNESS_DIR, 'prospect-tw-queue.json'),
  tt: path.join(HARNESS_DIR, 'prospect-tt-queue.json'),
};

// Bootstrap env
const ENV_OVERRIDE_KEYS = new Set(['CRMLITE_API_KEY', 'CRMLITE_URL']);
function loadEnvFile(filePath) {
  try {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([A-Z0-9_]+)=(.+)/);
      if (m && (!process.env[m[1]] || ENV_OVERRIDE_KEYS.has(m[1]))) {
        process.env[m[1]] = m[2].trim();
      }
    }
  } catch { /* non-fatal */ }
}
loadEnvFile(HOME_ENV);
loadEnvFile(SAFARI_ENV);
loadEnvFile(ACTP_ENV);

// Config
const DAILY_LIMITS = {
  ig: parseInt(process.env.DM_DAILY_LIMIT_IG || '10'),
  tw: parseInt(process.env.DM_DAILY_LIMIT_TW || '15'),
  tt: parseInt(process.env.DM_DAILY_LIMIT_TT || '8'),
};
const CYCLE_MS           = parseInt(process.env.DM_CYCLE_MIN || '30') * 60 * 1000;
const ACTIVE_HOURS_START = parseInt(process.env.DM_ACTIVE_HOURS_START || '8');
const ACTIVE_HOURS_END   = parseInt(process.env.DM_ACTIVE_HOURS_END   || '20');
const BETWEEN_DM_MS      = 8000; // 8s between DMs on same platform
const CRMLITE_URL        = 'https://crmlite-isaiahduprees-projects.vercel.app';
const SUPABASE_URL       = process.env.SUPABASE_URL || 'https://ivhfuhxorppptyuofbgq.supabase.co';
const SUPABASE_KEY       = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CRMLITE_KEY        = process.env.CRMLITE_API_KEY || '';

// Platform DM config
// tabPath: endpoint to claim a Safari tab for this platform (null = use navigate only)
// tabNum: which Safari tab number to claim
const PLATFORMS = {
  ig: {
    name: 'Instagram',
    port: 3100,
    sendPath: '/api/messages/send-to',       // POST { username, text }
    msgKey: 'text',
    tabPath: '/api/inbox/tab',                // POST { tab: 1 }
    tabNum: 1,
    navigatePath: '/api/inbox/navigate',
  },
  tw: {
    name: 'Twitter',
    port: 3003,
    sendPath: '/api/twitter/messages/send-to', // POST { username, text }
    msgKey: 'text',
    tabPath: '/api/twitter/inbox/tab',          // POST { tab: 2 }
    tabNum: 2,
    navigatePath: '/api/twitter/inbox/navigate',
  },
  tt: {
    name: 'TikTok',
    port: 3102,
    sendPath: '/api/tiktok/messages/send-to',  // POST { username, message }
    msgKey: 'message',
    tabPath: null,                              // TikTok: navigate only, no tab claim
    tabNum: null,
    navigatePath: '/api/tiktok/inbox/navigate',
  },
};

// CLI args
const args = process.argv.slice(2);
const MODE    = args.includes('--once') ? 'once' : args.includes('--test') ? 'test' : 'daemon';
const DRY_RUN = args.includes('--dry-run');

for (const p of ['ig', 'tw', 'tt']) {
  const idx = args.indexOf(`--limit-${p}`);
  if (idx !== -1 && args[idx + 1]) DAILY_LIMITS[p] = parseInt(args[idx + 1], 10);
}

// Helpers
function log(msg) {
  const ts = new Date().toISOString();
  const line = `${ts} [dm-outreach] ${msg}`;
  console.log(line);
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOGS_DIR, 'dm-outreach.log'), line + '\n');
  } catch { /* non-fatal */ }
}

function appendLog(entry) {
  try { fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n'); } catch { /* non-fatal */ }
}

function readJson(fp, fallback = null) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return fallback; }
}

function writeJson(fp, data) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
}

function isActiveHours() {
  const h = new Date().getHours();
  return h >= ACTIVE_HOURS_START && h < ACTIVE_HOURS_END;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchWithTimeout(url, opts = {}, ms = 10000) {
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(ms) });
    return res;
  } catch { return null; }
}

// State management
function loadState() {
  return readJson(STATE_FILE, {
    startedAt: null,
    running: false,
    cycleCount: 0,
    lastCycleAt: null,
    nextCycleAt: null,
    totalSent: 0,
    totalFailed: 0,
    dailyCounts: {
      ig: { date: todayDate(), sent: 0 },
      tw: { date: todayDate(), sent: 0 },
      tt: { date: todayDate(), sent: 0 },
    },
  });
}

function saveState(state) {
  try { writeJson(STATE_FILE, state); } catch { /* non-fatal */ }
}

function getDailyCount(state, platform) {
  const today = todayDate();
  if (!state.dailyCounts) state.dailyCounts = {};
  if (!state.dailyCounts[platform] || state.dailyCounts[platform].date !== today) {
    state.dailyCounts[platform] = { date: today, sent: 0 };
  }
  return state.dailyCounts[platform];
}

// Queue management
function loadQueue(platform) {
  return readJson(QUEUE_FILES[platform], []);
}

function saveQueue(platform, queue) {
  writeJson(QUEUE_FILES[platform], queue);
}

// Safari tab claim
async function claimTab(platform) {
  const cfg = PLATFORMS[platform];

  if (cfg.tabPath && cfg.tabNum !== null) {
    log(`  Claiming Safari tab ${cfg.tabNum} for ${cfg.name}...`);
    const res = await fetchWithTimeout(
      `http://localhost:${cfg.port}${cfg.tabPath}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tab: cfg.tabNum }) },
      10000
    );
    if (res?.ok) {
      log(`  Tab ${cfg.tabNum} claimed for ${cfg.name}`);
      return true;
    }
    log(`  Tab claim HTTP ${res?.status || 'timeout'} — falling back to navigate`);
  }

  if (cfg.navigatePath) {
    const res = await fetchWithTimeout(
      `http://localhost:${cfg.port}${cfg.navigatePath}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) },
      15000
    );
    if (res?.ok) {
      log(`  Navigated to ${cfg.name} inbox`);
      return true;
    }
    log(`  Navigate failed HTTP ${res?.status || 'timeout'}`);
    return false;
  }

  return false;
}

// Send a single DM
async function sendDM(platform, username, message) {
  const cfg = PLATFORMS[platform];

  if (DRY_RUN) {
    log(`  [DRY RUN] Would send to @${username} on ${cfg.name}: "${message.slice(0, 60)}..."`);
    return { ok: true, dryRun: true };
  }

  const body = { username, [cfg.msgKey]: message };
  try {
    const res = await fetch(`http://localhost:${cfg.port}${cfg.sendPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    let data;
    try { data = await res.json(); } catch { data = { raw: await res.text() }; }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Supabase cloud sync — writes a dm_sent event for cloud visibility
const SB_HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function syncToCloud(platform, username, message, result, queueItem) {
  if (!SUPABASE_KEY) return;
  try {
    const platformName = { ig: 'instagram', tw: 'twitter', tt: 'tiktok' }[platform] || platform;
    const row = {
      platform: platformName,
      action: 'dm_sent',
      params: { username, message: message.slice(0, 200) },
      status: result.ok ? 'completed' : 'failed',
      result: {
        username,
        platform,
        sentAt: new Date().toISOString(),
        dryRun: result.dryRun || false,
        queueId: queueItem.id,
        crmId: queueItem.crm_id || null,
        icpScore: queueItem.prospect?.icp_score || null,
      },
      error: result.ok ? null : (result.error || `HTTP ${result.status}`),
      priority: 5,
      created_at: new Date().toISOString(),
    };
    await fetch(`${SUPABASE_URL}/rest/v1/safari_command_queue`, {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(8000),
    });
  } catch { /* non-fatal */ }
}

// CRMLite stage update
async function updateCRMLiteStage(crmId, stage, note) {
  if (!CRMLITE_KEY || !crmId) return;
  try {
    await fetchWithTimeout(
      `${CRMLITE_URL}/api/contacts/${crmId}`,
      {
        method: 'PATCH',
        headers: { 'x-api-key': CRMLITE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_stage: stage, notes: note }),
      },
      8000
    );
  } catch { /* non-fatal */ }
}

// Process one platform per cycle
async function processPlatform(platform, state) {
  const cfg = PLATFORMS[platform];
  const dailyCount = getDailyCount(state, platform);
  const limit = DAILY_LIMITS[platform];

  log(`── ${cfg.name}: ${dailyCount.sent}/${limit} sent today ──`);

  if (dailyCount.sent >= limit) {
    log(`  Daily limit reached (${limit}). Skipping.`);
    return { platform, skipped: true, reason: 'daily_limit' };
  }

  if (!isActiveHours()) {
    log(`  Outside active hours ${ACTIVE_HOURS_START}:00–${ACTIVE_HOURS_END}:00. Skipping.`);
    return { platform, skipped: true, reason: 'outside_hours' };
  }

  // Health check
  const health = await fetchWithTimeout(`http://localhost:${cfg.port}/health`, {}, 3000);
  if (!health?.ok) {
    log(`  ${cfg.name} service DOWN on port ${cfg.port}. Skipping.`);
    return { platform, skipped: true, reason: 'service_down' };
  }

  const queue = loadQueue(platform);
  const cycleResult = { platform, sent: 0, failed: 0, skipped: 0 };
  const canSend = limit - dailyCount.sent;
  let sentThisCycle = 0;
  let tabClaimed = false;

  for (let i = 0; i < queue.length && sentThisCycle < canSend; i++) {
    const item = queue[i];
    if (item.status !== 'pending_approval' && item.status !== 'approved') continue;

    const username = item.prospect?.username;
    const message  = item.drafted_message;

    if (!username || !message) {
      item.status = 'invalid';
      cycleResult.skipped++;
      continue;
    }

    // Claim the Safari tab once per platform per cycle
    if (!tabClaimed) {
      tabClaimed = await claimTab(platform);
      if (!tabClaimed) {
        log(`  Could not open ${cfg.name} inbox — skipping platform`);
        break;
      }
      await new Promise(r => setTimeout(r, 2000));
    }

    log(`  Sending DM to @${username} on ${cfg.name}...`);
    const result = await sendDM(platform, username, message);

    if (result.ok) {
      log(`  Sent to @${username}`);
      item.status = DRY_RUN ? 'dry_run' : 'sent';
      item.sent_at = new Date().toISOString();
      dailyCount.sent++;
      sentThisCycle++;
      cycleResult.sent++;
      state.totalSent++;

      await syncToCloud(platform, username, message, result, item);
      if (item.crm_id) {
        await updateCRMLiteStage(item.crm_id, 'dm_sent',
          `DM sent via ${cfg.name} at ${new Date().toISOString()}`);
      }
      appendLog({ ts: new Date().toISOString(), event: 'dm_sent', platform, username, queueId: item.id, crmId: item.crm_id, icpScore: item.prospect?.icp_score, dryRun: DRY_RUN });
    } else {
      const errMsg = result.error || `HTTP ${result.status}`;
      log(`  Failed @${username}: ${errMsg}`);
      item.status = 'failed';
      item.error = errMsg;
      item.failed_at = new Date().toISOString();
      cycleResult.failed++;
      state.totalFailed++;
      await syncToCloud(platform, username, message, result, item);
      appendLog({ ts: new Date().toISOString(), event: 'dm_failed', platform, username, queueId: item.id, error: errMsg });
    }

    if (sentThisCycle < canSend) {
      await new Promise(r => setTimeout(r, BETWEEN_DM_MS));
    }
  }

  saveQueue(platform, queue);
  log(`  ${cfg.name} done: ${cycleResult.sent} sent, ${cycleResult.failed} failed`);
  return cycleResult;
}

// Preflight
async function preflight() {
  const state = loadState();
  const report = { platforms: {}, queues: {}, config: {} };

  for (const [p, cfg] of Object.entries(PLATFORMS)) {
    const health = await fetchWithTimeout(`http://localhost:${cfg.port}/health`, {}, 3000);
    const dc = getDailyCount(state, p);
    report.platforms[p] = { name: cfg.name, port: cfg.port, up: health?.ok === true, tabNum: cfg.tabNum, dailySent: dc.sent, dailyLimit: DAILY_LIMITS[p] };
    const q = loadQueue(p);
    report.queues[p] = { total: q.length, pending: q.filter(i => i.status === 'pending_approval' || i.status === 'approved').length, sent: q.filter(i => i.status === 'sent').length };
  }

  report.config = { cycleMin: CYCLE_MS / 60000, activeHours: `${ACTIVE_HOURS_START}:00-${ACTIVE_HOURS_END}:00`, dailyLimits: DAILY_LIMITS, dryRun: DRY_RUN, crmlite: !!CRMLITE_KEY, supabase: !!SUPABASE_KEY };

  console.log('\nDM Outreach Preflight:');
  console.log(JSON.stringify(report, null, 2));
  const anyPending = Object.values(report.queues).some(q => q.pending > 0);
  console.log(`\nQueues have pending DMs: ${anyPending ? 'YES' : 'NO — run prospect-pipeline.js first'}`);
  return report;
}

// One full cycle (IG → TW → TT)
async function runCycle(state) {
  const cycleNum = state.cycleCount + 1;
  const start = Date.now();
  log(`\u2550\u2550\u2550 Cycle #${cycleNum} starting \u2550\u2550\u2550`);

  const results = [];
  for (const platform of ['ig', 'tw', 'tt']) {
    try {
      results.push(await processPlatform(platform, state));
      await new Promise(r => setTimeout(r, 3000));
    } catch (e) {
      log(`Platform ${platform} error: ${e.message}`);
      results.push({ platform, error: e.message });
    }
  }

  state.cycleCount++;
  state.lastCycleAt = new Date().toISOString();
  state.nextCycleAt = new Date(Date.now() + CYCLE_MS).toISOString();
  saveState(state);

  const totalSent = results.reduce((s, r) => s + (r.sent || 0), 0);
  log(`\u2550\u2550\u2550 Cycle #${cycleNum} done in ${((Date.now() - start) / 1000).toFixed(1)}s | sent: ${totalSent} DMs \u2550\u2550\u2550`);
  return results;
}

// Main
async function main() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  log(`Starting DM Outreach Daemon (mode: ${MODE}${DRY_RUN ? ', DRY RUN' : ''})`);
  log(`Daily limits — IG: ${DAILY_LIMITS.ig}, TW: ${DAILY_LIMITS.tw}, TT: ${DAILY_LIMITS.tt}`);
  log(`Active hours: ${ACTIVE_HOURS_START}:00-${ACTIVE_HOURS_END}:00 | Cycle: ${CYCLE_MS / 60000} min`);

  if (MODE === 'test') { await preflight(); return; }

  const state = loadState();
  state.running = true;
  state.startedAt = state.startedAt || new Date().toISOString();
  saveState(state);

  if (MODE === 'once') {
    try { await runCycle(state); }
    finally { state.running = false; saveState(state); }
    return;
  }

  log(`Daemon running. SIGTERM to stop.`);

  const shutdown = () => {
    log('Shutting down cleanly...');
    const s = loadState();
    s.running = false;
    saveState(s);
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  while (true) {
    try {
      await runCycle(loadState());
    } catch (e) {
      log(`Cycle error: ${e.message}`);
      appendLog({ ts: new Date().toISOString(), event: 'cycle_error', error: e.message });
    }
    log(`Next cycle in ${CYCLE_MS / 60000} min (${new Date(Date.now() + CYCLE_MS).toLocaleTimeString()})`);
    await new Promise(r => setTimeout(r, CYCLE_MS));
  }
}

main().catch(e => {
  console.error('Fatal:', e.message);
  try { const s = readJson(STATE_FILE, {}); s.running = false; writeJson(STATE_FILE, s); } catch { /* non-fatal */ }
  process.exit(1);
});
