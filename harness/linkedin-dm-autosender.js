#!/usr/bin/env node

/**
 * LinkedIn DM Auto-Sender Daemon
 * ================================
 * Reads linkedin-dm-queue.json approved entries and sends connection requests
 * + follow-up messages via the LinkedIn Safari service (port 3105).
 *
 * Features:
 *   - Daily limits: max 20 connections, max 30 messages (env LI_DAILY_CONNECTIONS/LI_DAILY_MESSAGES)
 *   - Active hours: 08:00–19:00 (env LI_ACTIVE_HOURS_START/LI_ACTIVE_HOURS_END)
 *   - CRMLite sync after each send
 *   - Telegram notifications
 *   - SIGTERM graceful shutdown
 *
 * Usage:
 *   node harness/linkedin-dm-autosender.js              # run 24/7
 *   node harness/linkedin-dm-autosender.js --once       # single cycle, exit
 *   node harness/linkedin-dm-autosender.js --dry-run    # log only, no sends
 *   node harness/linkedin-dm-autosender.js --send-approved  # alias for --once
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;

// ── File paths ────────────────────────────────────────────────────────────────
const QUEUE_FILE   = path.join(HARNESS_DIR, 'linkedin-dm-queue.json');
const STATE_FILE   = path.join(HARNESS_DIR, 'linkedin-dm-state.json');
const LOG_FILE     = path.join(HARNESS_DIR, 'linkedin-dm-autosender-log.ndjson');
const LOGS_DIR     = path.join(HARNESS_DIR, 'logs');
const ACTP_ENV     = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const SAFARI_ENV   = '/Users/isaiahdupree/Documents/Software/Safari Automation/.env';
const HOME_ENV     = `${process.env.HOME}/.env`;

// ── Load environment ──────────────────────────────────────────────────────────
const ENV_OVERRIDE_KEYS = new Set(['CRMLITE_API_KEY', 'CRMLITE_URL', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']);

function loadEnvFile(filePath) {
  try {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([A-Z0-9_]+)=(.+)/);
      if (m && (!process.env[m[1]] || ENV_OVERRIDE_KEYS.has(m[1]))) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch { /* non-fatal */ }
}

loadEnvFile(HOME_ENV);
loadEnvFile(SAFARI_ENV);
loadEnvFile(ACTP_ENV);

// ── Config ────────────────────────────────────────────────────────────────────
const LI_PORT              = 3105;
const LI_AUTH_TOKEN        = process.env.LINKEDIN_AUTH_TOKEN || 'test-token-12345';
const DAILY_CONNECTIONS    = parseInt(process.env.LI_DAILY_CONNECTIONS || '20');
const DAILY_MESSAGES       = parseInt(process.env.LI_DAILY_MESSAGES    || '30');
const ACTIVE_HOURS_START   = parseInt(process.env.LI_ACTIVE_HOURS_START || '8');
const ACTIVE_HOURS_END     = parseInt(process.env.LI_ACTIVE_HOURS_END   || '19');
const INTERVAL_MS          = parseInt(process.env.LI_SEND_INTERVAL_MINUTES || '30') * 60 * 1000;
const FOLLOWUP_DELAY_HOURS = 24;
const CRMLITE_URL          = 'https://crmlite-isaiahduprees-projects.vercel.app';
const TELEGRAM_BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID     = process.env.TELEGRAM_CHAT_ID;

// ── CLI flags ─────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const MODE    = (args.includes('--once') || args.includes('--send-approved')) ? 'once' : 'daemon';

// ── Logging ───────────────────────────────────────────────────────────────────
function log(msg) {
  const ts   = new Date().toISOString();
  const line = `${ts} [li-dm-sender] ${msg}`;
  console.log(line);
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOGS_DIR, 'linkedin-dm-autosender.log'), line + '\n');
  } catch { /* non-fatal */ }
}

function appendLog(entry) {
  try { fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n'); } catch { /* non-fatal */ }
}

// ── JSON helpers ──────────────────────────────────────────────────────────────
function readJson(fp, fallback = null) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return fallback; }
}

function writeJson(fp, data) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
}

// ── Time helpers ──────────────────────────────────────────────────────────────
function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function isActiveHours() {
  const h = new Date().getHours();
  return h >= ACTIVE_HOURS_START && h < ACTIVE_HOURS_END;
}

function isOlderThan(isoString, hours) {
  if (!isoString) return false;
  return (Date.now() - new Date(isoString).getTime()) > hours * 60 * 60 * 1000;
}

// ── Fetch helper ──────────────────────────────────────────────────────────────
async function fetchWithTimeout(url, opts = {}, ms = 15000) {
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(ms) });
    return res;
  } catch { return null; }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(minMs, maxMs) {
  return delay(minMs + Math.floor(Math.random() * (maxMs - minMs)));
}

// ── Telegram ──────────────────────────────────────────────────────────────────
async function sendTelegram(msg) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetchWithTimeout(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg }),
      },
      10000
    );
  } catch { /* non-fatal */ }
}

// ── State management ──────────────────────────────────────────────────────────
function loadState() {
  const today   = todayDate();
  const defaults = {
    date: today,
    connectionsSent: 0,
    messagesSent: 0,
    totalConnectionsSent: 0,
    totalMessagesSent: 0,
    lastRunAt: null,
    startedAt: null,
  };
  const saved = readJson(STATE_FILE, {});
  if (saved.date !== today) {
    // New day — reset daily counters
    return { ...defaults, ...saved, date: today, connectionsSent: 0, messagesSent: 0 };
  }
  return { ...defaults, ...saved };
}

function saveState(state) {
  try { writeJson(STATE_FILE, state); } catch (e) { log(`WARN: could not save state: ${e.message}`); }
}

// ── Queue management ──────────────────────────────────────────────────────────
function loadQueue() {
  const raw = readJson(QUEUE_FILE, []);
  return Array.isArray(raw) ? raw : [];
}

function saveQueue(queue) {
  writeJson(QUEUE_FILE, queue);
}

// ── LinkedIn service health check ─────────────────────────────────────────────
async function checkLinkedInHealth() {
  const res = await fetchWithTimeout(`http://localhost:${LI_PORT}/health`, {}, 5000);
  return res?.ok === true;
}

// ── Safari tab claim check ────────────────────────────────────────────────────
async function checkTabClaim() {
  const res = await fetchWithTimeout(
    `http://localhost:${LI_PORT}/api/tabs/status`,
    { headers: { Authorization: `Bearer ${LI_AUTH_TOKEN}` } },
    5000
  );
  if (!res) return true; // assume ok if endpoint doesn't exist
  if (res.status === 404) return true; // endpoint not implemented — assume ok
  try {
    const data = await res.json();
    if (data.claimed === false) return false;
  } catch { /* non-fatal */ }
  return true;
}

// ── CRMLite sync ──────────────────────────────────────────────────────────────
async function syncToCRMLite(action, entry) {
  const CRMLITE_KEY = process.env.CRMLITE_API_KEY || '';
  if (!CRMLITE_KEY) {
    log('WARN: CRMLITE_API_KEY not set — skipping CRM sync');
    return null;
  }

  const prospect = entry.prospect || {};
  const body = {
    action,
    platform: 'linkedin',
    contact: {
      name: prospect.name || '',
      profileUrl: prospect.profileUrl || '',
      handle: prospect.handle || prospect.profileUrl || '',
    },
    message: entry.drafted_message || entry.message || '',
  };

  try {
    const res = await fetchWithTimeout(
      `${CRMLITE_URL}/api/actions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CRMLITE_KEY,
        },
        body: JSON.stringify(body),
      },
      10000
    );
    if (!res?.ok) {
      log(`WARN: CRMLite sync returned ${res?.status || 'timeout'} for action=${action}`);
      return null;
    }
    const data = await res.json().catch(() => ({}));
    return data;
  } catch (e) {
    log(`WARN: CRMLite sync error: ${e.message}`);
    return null;
  }
}

// ── Connection request sender ─────────────────────────────────────────────────
async function sendConnectionRequest(entry) {
  const prospect = entry.prospect || {};
  const profileUrl = prospect.profileUrl || '';
  const note       = entry.drafted_message || entry.message || '';
  const name       = prospect.name || profileUrl;

  if (DRY_RUN) {
    log(`  [DRY RUN] Would send connection to ${name} (${profileUrl}) note="${note.slice(0, 60)}..."`);
    return { ok: true, dryRun: true };
  }

  try {
    const res = await fetch(`http://localhost:${LI_PORT}/api/linkedin/connections/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LI_AUTH_TOKEN}`,
      },
      body: JSON.stringify({ profileUrl, note }),
      signal: AbortSignal.timeout(60000),
    });
    let data;
    try { data = await res.json(); } catch { data = {}; }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Follow-up message sender ──────────────────────────────────────────────────
async function sendFollowUpMessage(entry) {
  const prospect   = entry.prospect || {};
  const profileUrl = prospect.profileUrl || '';
  const message    = entry.followUpMessage || entry.drafted_message || entry.message || '';
  const name       = prospect.name || profileUrl;

  if (DRY_RUN) {
    log(`  [DRY RUN] Would send follow-up to ${name} (${profileUrl}) msg="${message.slice(0, 60)}..."`);
    return { ok: true, dryRun: true };
  }

  try {
    const res = await fetch(`http://localhost:${LI_PORT}/api/linkedin/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LI_AUTH_TOKEN}`,
      },
      body: JSON.stringify({ profileUrl, message }),
      signal: AbortSignal.timeout(60000),
    });
    let data;
    try { data = await res.json(); } catch { data = {}; }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Main send cycle ───────────────────────────────────────────────────────────
async function runCycle(state) {
  log('--- Starting send cycle ---');

  // Health check
  const healthy = await checkLinkedInHealth();
  if (!healthy) {
    log(`SKIP: LinkedIn service at :${LI_PORT} not healthy`);
    return state;
  }

  // Tab claim check
  const tabOk = await checkTabClaim();
  if (!tabOk) {
    log('SKIP: No Safari tab claimed for LinkedIn');
    return state;
  }

  // Active hours check
  if (!isActiveHours()) {
    const h = new Date().getHours();
    log(`SKIP: Outside active hours (current=${h}h, window=${ACTIVE_HOURS_START}-${ACTIVE_HOURS_END}h)`);
    return state;
  }

  // Load queue
  const queue    = loadQueue();
  const approved = queue.filter(e => e.status === 'approved');
  const connRemaining = DAILY_CONNECTIONS - state.connectionsSent;
  const msgRemaining  = DAILY_MESSAGES    - state.messagesSent;

  log(`Queue: ${approved.length} approved entries — ${connRemaining} connections + ${msgRemaining} messages remaining today`);

  if (connRemaining <= 0 && msgRemaining <= 0) {
    log('Daily limits reached — skipping cycle');
    await sendTelegram(`📊 LinkedIn daily limit reached — ${state.connectionsSent} connections, ${state.messagesSent} messages sent today`);
    return state;
  }

  let connSentThisCycle = 0;
  let msgSentThisCycle  = 0;

  // ── Phase 1: Send connection requests ─────────────────────────────────────
  for (const entry of queue) {
    if (entry.status !== 'approved') continue;
    if (entry.connection_requested_at) continue; // already attempted
    if (state.connectionsSent >= DAILY_CONNECTIONS) break;

    const name   = entry.prospect?.name || entry.prospect?.profileUrl || 'unknown';
    const handle = entry.prospect?.handle || entry.prospect?.profileUrl || '';

    log(`  Sending connection request → ${name}`);
    const result = await sendConnectionRequest(entry);

    if (result.ok) {
      entry.status                  = 'connection_requested';
      entry.connection_requested_at = new Date().toISOString();
      state.connectionsSent++;
      state.totalConnectionsSent = (state.totalConnectionsSent || 0) + 1;
      connSentThisCycle++;

      // CRMLite sync
      const crmResult = await syncToCRMLite('first_touch', entry);
      if (crmResult) {
        entry.crm_synced = true;
        entry.crm_id     = crmResult.id || crmResult.contact_id || entry.crm_id;
      }

      saveQueue(queue);
      saveState(state);
      appendLog({ ts: new Date().toISOString(), action: 'connection_sent', name, handle, dryRun: !!result.dryRun });

      if (!result.dryRun) {
        await sendTelegram(`✅ LinkedIn connection sent → ${name} (${handle})`);
        log(`  Connection sent to ${name}`);
      }
    } else {
      const errMsg = result.error || `HTTP ${result.status}`;
      entry.status = 'failed';
      entry.error  = errMsg;
      saveQueue(queue);
      log(`  Connection FAILED for ${name}: ${errMsg}`);
      await sendTelegram(`⚠️ LinkedIn DM sender error: connection to ${name} failed — ${errMsg}`);
      appendLog({ ts: new Date().toISOString(), action: 'connection_failed', name, error: errMsg });
    }

    // Random delay between requests
    await randomDelay(10000, 20000);
  }

  // ── Phase 2: Send follow-up messages ─────────────────────────────────────
  for (const entry of queue) {
    if (entry.status !== 'connection_requested') continue;
    if (!isOlderThan(entry.connection_requested_at, FOLLOWUP_DELAY_HOURS)) continue;
    if (state.messagesSent >= DAILY_MESSAGES) break;

    const name   = entry.prospect?.name || entry.prospect?.profileUrl || 'unknown';
    const handle = entry.prospect?.handle || entry.prospect?.profileUrl || '';

    log(`  Sending follow-up message → ${name} (connection ${Math.round((Date.now() - new Date(entry.connection_requested_at).getTime()) / 3600000)}h ago)`);
    const result = await sendFollowUpMessage(entry);

    if (result.ok) {
      entry.status  = 'sent';
      entry.sent_at = new Date().toISOString();
      state.messagesSent++;
      state.totalMessagesSent = (state.totalMessagesSent || 0) + 1;
      msgSentThisCycle++;

      // CRMLite sync
      const crmResult = await syncToCRMLite('dm_sent', entry);
      if (crmResult) {
        entry.crm_synced = true;
        entry.crm_id     = crmResult.id || crmResult.contact_id || entry.crm_id;
      }

      saveQueue(queue);
      saveState(state);
      appendLog({ ts: new Date().toISOString(), action: 'message_sent', name, handle, dryRun: !!result.dryRun });

      if (!result.dryRun) {
        await sendTelegram(`💬 LinkedIn DM sent → ${name}`);
        log(`  Follow-up sent to ${name}`);
      }
    } else {
      const errMsg = result.error || `HTTP ${result.status}`;
      log(`  Follow-up WARN for ${name}: ${errMsg} — will retry next cycle`);
      appendLog({ ts: new Date().toISOString(), action: 'message_failed', name, error: errMsg });
    }

    // Random delay between messages
    await randomDelay(15000, 30000);
  }

  log(`Cycle done — connections: ${connSentThisCycle}, messages: ${msgSentThisCycle}`);
  state.lastRunAt = new Date().toISOString();
  saveState(state);
  return state;
}

// ── Main entry ────────────────────────────────────────────────────────────────
let shuttingDown = false;

process.on('SIGTERM', () => {
  log('SIGTERM received — finishing current cycle then exiting');
  shuttingDown = true;
  if (MODE === 'once') process.exit(0);
});
process.on('SIGINT', () => {
  log('SIGINT received — exiting');
  process.exit(0);
});

async function main() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });

  let state = loadState();
  state.startedAt = new Date().toISOString();
  saveState(state);

  const queue    = loadQueue();
  const approved = queue.filter(e => e.status === 'approved');
  const connRem  = DAILY_CONNECTIONS - state.connectionsSent;

  log(`LinkedIn DM Auto-Sender starting — mode=${MODE}${DRY_RUN ? ' [DRY RUN]' : ''}`);
  log(`Queue: ${queue.length} total, ${approved.length} approved`);
  log(`Today: ${state.connectionsSent}/${DAILY_CONNECTIONS} connections, ${state.messagesSent}/${DAILY_MESSAGES} messages`);

  await sendTelegram(
    `🔗 LinkedIn DM sender started — ${approved.length} approved in queue, ${connRem} connections remaining today`
  );

  if (MODE === 'once') {
    state = await runCycle(state);
    log('Done (--once mode)');
    process.exit(0);
  }

  // Daemon mode
  while (!shuttingDown) {
    state = await runCycle(state);
    if (shuttingDown) break;
    log(`Sleeping ${INTERVAL_MS / 60000}min until next cycle...`);
    await delay(INTERVAL_MS);
  }

  log('Exiting gracefully');
  process.exit(0);
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  sendTelegram(`⚠️ LinkedIn DM sender error: ${err.message}`).finally(() => process.exit(1));
});
