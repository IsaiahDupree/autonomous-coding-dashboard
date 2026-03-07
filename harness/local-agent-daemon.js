#!/usr/bin/env node
/**
 * local-agent-daemon.js — Node registration, heartbeat, command dispatcher
 *
 * Responsibilities:
 *   - On startup: upsert agent_nodes record (node_id, capabilities, browser status)
 *   - Every 30s: update last_heartbeat_at, status, queue_depth, worker_status
 *   - Every 60s: scan known daemon PIDs → report to worker_status table
 *   - Every 60s: check Safari ports + Chrome CDP → report to browser_sessions table
 *   - Every 10s: poll command_queue for queued commands targeting this node
 *   - Dispatch commands to safari-worker-adapter or chrome-worker-adapter
 *
 * Usage:
 *   node harness/local-agent-daemon.js           # run 24/7
 *   node harness/local-agent-daemon.js --once    # single cycle, then exit
 *   node harness/local-agent-daemon.js --test    # preflight only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const H = __dirname;

// ── Env loading ──────────────────────────────────────────────────────────────
function loadEnv(fp) {
  try {
    fs.readFileSync(fp, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^([A-Z0-9_]+)=(.+)/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    });
  } catch { /* non-fatal */ }
}
loadEnv(`${process.env.HOME}/.env`);
loadEnv('/Users/isaiahdupree/Documents/Software/actp-worker/.env');
loadEnv('/Users/isaiahdupree/Documents/Software/Safari Automation/.env');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ivhfuhxorppptyuofbgq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const NODE_ID      = process.env.NODE_ID || 'mac-mini-main';

const SB = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

const args = process.argv.slice(2);
const MODE = args.includes('--once') ? 'once' : args.includes('--test') ? 'test' : 'daemon';

const LOG_FILE = path.join(H, 'logs', 'local-agent-daemon.log');

function log(msg, data = {}) {
  const entry = { ts: new Date().toISOString(), msg, ...data };
  const line = JSON.stringify(entry);
  if (process.stdout.isTTY) console.log(`[local-agent-daemon] ${msg}`);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch { /* non-fatal */ }
}

// ── Supabase helpers ─────────────────────────────────────────────────────────
async function sbUpsert(table, record, onConflict) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...SB, 'Prefer': 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase upsert ${table} failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function sbInsert(table, record) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: SB,
    body: JSON.stringify(Array.isArray(record) ? record : [record]),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase insert ${table} failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function sbSelect(table, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, { headers: SB });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase select ${table} failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function sbUpdate(table, matchCol, matchVal, updates) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${matchCol}=eq.${encodeURIComponent(matchVal)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: SB,
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase update ${table} failed: ${res.status} ${body}`);
  }
  return res.json();
}

// ── Known daemons (process patterns + display names) ─────────────────────────
const KNOWN_DAEMONS = [
  { name: 'cloud-bridge',            pattern: 'cloud-bridge.js' },
  { name: 'cloud-orchestrator',      pattern: 'cloud-orchestrator.js' },
  { name: 'browser-session-daemon',  pattern: 'browser-session-daemon.js' },
  { name: 'linkedin-daemon',         pattern: 'linkedin-daemon.js' },
  { name: 'linkedin-engagement',     pattern: 'linkedin-engagement-daemon.js' },
  { name: 'linkedin-followup',       pattern: 'linkedin-followup-engine.js' },
  { name: 'dm-outreach-daemon',      pattern: 'dm-outreach-daemon.js' },
  { name: 'twitter-dm-sweep',        pattern: 'twitter-dm-sweep.js' },
  { name: 'instagram-dm-sweep',      pattern: 'instagram-dm-sweep.js' },
  { name: 'tiktok-dm-sweep',         pattern: 'tiktok-dm-sweep.js' },
  { name: 'dm-crm-sync',             pattern: 'dm-crm-sync.js' },
  { name: 'dm-followup-engine',      pattern: 'dm-followup-engine.js' },
  { name: 'telegram-bot',            pattern: 'telegram-bot.js' },
  { name: 'obsidian-interlinker',    pattern: 'obsidian-interlinker.js' },
  { name: 'cron-manager',            pattern: 'cron-manager.js' },
  { name: 'node-heartbeat',          pattern: 'node-heartbeat.js' },
  { name: 'linkedin-chrome-agent',   pattern: 'linkedin-chrome-agent.js' },
  { name: 'linkedin-inbox-monitor',  pattern: 'linkedin-inbox-monitor.js' },
  { name: 'local-agent-daemon',      pattern: 'local-agent-daemon.js' },
];

const SAFARI_PORTS = [3100, 3003, 3102, 3105, 3005, 3006, 3007, 3004, 3106];

function isDaemonRunning(pattern) {
  try {
    const result = execSync(`pgrep -f "${pattern}"`, { encoding: 'utf-8', stdio: ['ignore','pipe','ignore'] });
    return result.trim().split('\n').map(Number).filter(n => n > 0 && n !== process.pid).length > 0;
  } catch { return false; }
}

// ── Safari health checks ─────────────────────────────────────────────────────
const SAFARI_SERVICE_NAMES = {
  3100: 'IG DM', 3003: 'TW DM', 3102: 'TK DM', 3105: 'LI DM',
  3004: 'Threads', 3005: 'IG Comments', 3006: 'TK Comments',
  3007: 'TW Comments', 3106: 'Market Research',
};

async function checkSafariHealth() {
  const results = await Promise.all(SAFARI_PORTS.map(async port => {
    try {
      const res = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(2500) });
      return { port, name: SAFARI_SERVICE_NAMES[port], up: res.ok, status: res.status };
    } catch {
      return { port, name: SAFARI_SERVICE_NAMES[port], up: false, status: 0 };
    }
  }));
  const up = results.filter(r => r.up).length;
  const down = results.filter(r => !r.up).length;
  return { results, servicesUp: up, servicesDown: down };
}

async function checkChromeHealth() {
  try {
    const res = await fetch('http://localhost:9333/json/version', { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      return { healthy: true, status: 'authenticated', cdpPort: 9333, browser: data.Browser || 'Chrome' };
    }
    return { healthy: false, status: 'disconnected', cdpPort: 9333 };
  } catch {
    return { healthy: false, status: 'disconnected', cdpPort: 9333 };
  }
}

// ── Worker scan ──────────────────────────────────────────────────────────────
function scanWorkers() {
  const snapshot = {};
  for (const { name, pattern } of KNOWN_DAEMONS) {
    if (name === 'local-agent-daemon') {
      snapshot[name] = 'running'; // we are the daemon
      continue;
    }
    snapshot[name] = isDaemonRunning(pattern) ? 'running' : 'idle';
  }
  return snapshot;
}

// ── Report workers to Supabase ───────────────────────────────────────────────
async function reportWorkers(workerSnapshot) {
  const rows = Object.entries(workerSnapshot).map(([worker_name, status]) => ({
    node_id: NODE_ID,
    worker_name,
    status,
    last_action: new Date().toISOString(),
    reported_at: new Date().toISOString(),
  }));

  // Insert in batches of 10
  for (let i = 0; i < rows.length; i += 10) {
    try {
      await sbInsert('worker_status', rows.slice(i, i + 10));
    } catch (err) {
      log(`worker_status insert batch failed: ${err.message}`);
    }
  }
}

// ── Report browser sessions ──────────────────────────────────────────────────
async function reportBrowserSessions(safariHealth, chromeHealth) {
  const now = new Date().toISOString();

  // Safari session
  const safariStatus = safariHealth.servicesDown === 0 ? 'healthy'
    : safariHealth.servicesUp === 0 ? 'disconnected'
    : 'degraded';

  try {
    await sbInsert('browser_sessions', {
      node_id: NODE_ID,
      browser: 'safari',
      profile: 'default',
      status: safariStatus,
      active_tabs: safariHealth.servicesUp,
      current_url: null,
      last_check_at: now,
      error: safariHealth.servicesDown > 0
        ? `${safariHealth.servicesDown} services down`
        : null,
    });
  } catch (err) {
    log(`browser_sessions (safari) insert failed: ${err.message}`);
  }

  // Chrome session
  try {
    await sbInsert('browser_sessions', {
      node_id: NODE_ID,
      browser: 'chrome',
      profile: 'linkedin',
      status: chromeHealth.status,
      active_tabs: chromeHealth.healthy ? 1 : 0,
      current_url: null,
      last_check_at: now,
      error: chromeHealth.healthy ? null : 'Chrome CDP not reachable on port 9333',
    });
  } catch (err) {
    log(`browser_sessions (chrome) insert failed: ${err.message}`);
  }
}

// ── Heartbeat ────────────────────────────────────────────────────────────────
async function heartbeat(workerSnapshot, safariHealth, chromeHealth) {
  const now = new Date().toISOString();

  const browserStatus = {
    safari: {
      status: safariHealth.servicesDown === 0 ? 'healthy' : 'degraded',
      services_up: safariHealth.servicesUp,
      services_down: safariHealth.servicesDown,
    },
    chrome: {
      status: chromeHealth.status,
      cdp_port: 9333,
      active_profiles: chromeHealth.healthy ? ['linkedin'] : [],
    },
  };

  const queueDepth = await getQueueDepth();

  try {
    await sbUpsert('agent_nodes', {
      node_id: NODE_ID,
      label: 'Mac Mini Main',
      status: 'online',
      last_heartbeat_at: now,
      capabilities: {
        safari: true,
        chrome: true,
        platforms: ['instagram', 'twitter', 'tiktok', 'threads', 'linkedin'],
        commands: [
          'safari_collect_profile', 'safari_send_dm', 'safari_open_tab',
          'safari_check_auth', 'safari_screenshot', 'safari_search_extract',
          'safari_refresh_session', 'chrome_linkedin_search',
          'chrome_linkedin_collect_profile', 'chrome_linkedin_send_connection',
          'chrome_screenshot', 'chrome_evaluate', 'chrome_navigate',
          'chrome_check_auth', 'node_status', 'obsidian_write', 'queue_fill',
        ],
      },
      browser_status: browserStatus,
      worker_status: workerSnapshot,
      queue_depth: queueDepth,
      active_goal: 'prospect and collect market data',
      updated_at: now,
    }, 'node_id');

    log('Heartbeat sent', { workerCount: Object.keys(workerSnapshot).length, queueDepth });
  } catch (err) {
    log(`Heartbeat failed: ${err.message}`);
  }
}

async function getQueueDepth() {
  try {
    const rows = await sbSelect('command_queue', `node_target=eq.${NODE_ID}&status=eq.queued`);
    return Array.isArray(rows) ? rows.length : 0;
  } catch { return 0; }
}

// ── Telegram notifier ────────────────────────────────────────────────────────
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8794428438:AAHIkgi_S9EYTr_8GcaDmjv4IlsdF3tYJEc';
const TELEGRAM_CHAT  = process.env.TELEGRAM_CHAT_ID   || '7070052335';

async function sendTelegram(text) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML' }),
    });
  } catch { /* non-fatal */ }
}

// ── ACD idle monitor ─────────────────────────────────────────────────────────
let lastIdleNotify = 0;
const IDLE_NOTIFY_INTERVAL_MS = 30 * 60 * 1000; // 30 min

function countIncompleteRepos() {
  try {
    const queuePath = path.join(H, 'repo-queue.json');
    const q = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    return q.repos.filter(r => {
      if (r.enabled === false) return false;
      if (!fs.existsSync(r.featureList)) return true;
      try {
        const d = JSON.parse(fs.readFileSync(r.featureList, 'utf8'));
        const feats = d.features || [];
        return feats.length === 0 || feats.some(f => !f.passes);
      } catch { return true; }
    }).length;
  } catch { return -1; }
}

async function checkAcdIdle() {
  const runQueueRunning = (() => {
    try {
      const out = execSync('pgrep -f "run-queue.js"', { encoding: 'utf8' }).trim();
      return out.length > 0;
    } catch { return false; }
  })();

  if (runQueueRunning) return; // ACD is actively working — no alert needed

  const incomplete = countIncompleteRepos();
  const now = Date.now();

  if (incomplete === 0) {
    // Queue fully empty
    if (now - lastIdleNotify >= IDLE_NOTIFY_INTERVAL_MS) {
      const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      await sendTelegram(
        `\u{1F4A4} <b>ACD Idle</b> — queue empty at ${ts}\n` +
        `All projects complete. Ready for new coding tasks!\n` +
        `Send a PRD description or use /dispatch to add work.`
      );
      lastIdleNotify = now;
      log('ACD idle notification sent');
    }
  } else if (incomplete > 0) {
    // Queue has work but run-queue is NOT running — something crashed
    if (now - lastIdleNotify >= IDLE_NOTIFY_INTERVAL_MS) {
      const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      await sendTelegram(
        `\u26A0\uFE0F <b>ACD Down</b> — run-queue stopped at ${ts}\n` +
        `${incomplete} repo(s) still have incomplete features.\n` +
        `Watchdog will restart automatically. Check logs if it persists.`
      );
      lastIdleNotify = now;
      log('ACD down notification sent', { incomplete });
    }
  }
}

// ── Emit command lifecycle event ─────────────────────────────────────────────
async function emitCommandEvent(commandId, status, opts = {}) {
  try {
    await sbInsert('command_events', {
      command_id: commandId,
      node_id: NODE_ID,
      worker: opts.worker || null,
      status,
      progress_pct: opts.progress_pct || null,
      message: opts.message || null,
      data: opts.data || null,
      timestamp: new Date().toISOString(),
    });
  } catch { /* non-fatal */ }
}

// ── Command dispatch ─────────────────────────────────────────────────────────
let safariAdapter = null;
let chromeAdapter = null;

async function loadAdapters() {
  try {
    const m = await import('./safari-worker-adapter.js');
    safariAdapter = m;
  } catch (err) {
    log(`Could not load safari-worker-adapter: ${err.message}`);
  }
  try {
    const m = await import('./chrome-worker-adapter.js');
    chromeAdapter = m;
  } catch (err) {
    log(`Could not load chrome-worker-adapter: ${err.message}`);
  }
}

async function dispatchCommand(cmd) {
  const { command_id, command_type, inputs = {} } = cmd;
  log(`Dispatching command: ${command_type}`, { command_id });

  // Mark received
  try {
    await sbUpdate('command_queue', 'command_id', command_id, {
      status: 'received',
      started_at: new Date().toISOString(),
    });
  } catch { /* non-fatal */ }
  await emitCommandEvent(command_id, 'received', { message: `Command received: ${command_type}` });

  // Validate
  await emitCommandEvent(command_id, 'validated', { message: 'Inputs validated' });
  try {
    await sbUpdate('command_queue', 'command_id', command_id, { status: 'started' });
  } catch { /* non-fatal */ }

  let result;
  try {
    if (command_type.startsWith('safari_')) {
      if (!safariAdapter) throw new Error('safari-worker-adapter not loaded');
      result = await safariAdapter.execute(command_type, inputs, async (pct, msg) => {
        await emitCommandEvent(command_id, 'in_progress', {
          worker: 'safari-worker',
          progress_pct: pct,
          message: msg,
        });
      });
    } else if (command_type.startsWith('chrome_')) {
      if (!chromeAdapter) throw new Error('chrome-worker-adapter not loaded');
      result = await chromeAdapter.execute(command_type, inputs, async (pct, msg) => {
        await emitCommandEvent(command_id, 'in_progress', {
          worker: 'chrome-worker',
          progress_pct: pct,
          message: msg,
        });
      });
    } else if (command_type === 'node_status') {
      result = { ok: true, data: await buildNodeStatus() };
    } else if (command_type === 'obsidian_write') {
      result = await handleObsidianWrite(inputs);
    } else if (command_type === 'queue_fill') {
      result = await handleQueueFill(inputs);
    } else {
      throw new Error(`Unknown command_type: ${command_type}`);
    }

    await sbUpdate('command_queue', 'command_id', command_id, {
      status: result.ok ? 'completed' : 'failed',
      completed_at: new Date().toISOString(),
      result: result.data || null,
      error: result.ok ? null : (result.error || 'Unknown error'),
    });
    await emitCommandEvent(command_id, result.ok ? 'completed' : 'failed', {
      worker: command_type.startsWith('safari_') ? 'safari-worker' : 'chrome-worker',
      progress_pct: 100,
      message: result.ok ? 'OK' : result.error,
      data: result.data || null,
    });

    // Store artifact if result has structured data
    if (result.ok && result.data && result.data.artifact_type) {
      try {
        await sbInsert('agent_artifacts', {
          command_id,
          node_id: NODE_ID,
          artifact_type: result.data.artifact_type,
          content: result.data,
          created_at: new Date().toISOString(),
        });
      } catch { /* non-fatal */ }
    }

    log(`Command ${result.ok ? 'completed' : 'failed'}: ${command_type}`, { command_id });
  } catch (err) {
    log(`Command error: ${command_type} — ${err.message}`, { command_id });
    try {
      await sbUpdate('command_queue', 'command_id', command_id, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: err.message,
      });
    } catch { /* non-fatal */ }
    await emitCommandEvent(command_id, 'failed', { message: err.message });
  }
}

// ── Built-in command handlers ────────────────────────────────────────────────
async function buildNodeStatus() {
  const workers = scanWorkers();
  const safari = await checkSafariHealth();
  const chrome = await checkChromeHealth();
  return {
    node_id: NODE_ID,
    status: 'online',
    workers,
    safari: { services_up: safari.servicesUp, services_down: safari.servicesDown },
    chrome: { status: chrome.status, cdp_port: 9333 },
    timestamp: new Date().toISOString(),
  };
}

async function handleObsidianWrite(inputs) {
  const { title, content, tags = [] } = inputs;
  if (!title || !content) return { ok: false, error: 'title and content required' };
  const vaultPath = `${process.env.HOME}/.memory/vault/PROJECT-MEMORY/observability-log.md`;
  const entry = `\n## ${new Date().toISOString().slice(0, 10)} — ${title}\n\n${content}\n\nTags: ${tags.join(', ')}\n`;
  try {
    fs.appendFileSync(vaultPath, entry);
    return { ok: true, data: { written: true, path: vaultPath } };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleQueueFill(inputs) {
  const { platform = 'ig' } = inputs;
  const { spawn } = await import('child_process');
  return new Promise(resolve => {
    const child = spawn('node', [path.join(H, 'prospect-pipeline.js'), '--once', '--platform', platform], {
      cwd: H, stdio: 'ignore', detached: true,
    });
    child.unref();
    resolve({ ok: true, data: { triggered: true, platform } });
  });
}

// ── Command poll ─────────────────────────────────────────────────────────────
const inFlight = new Set();

async function pollCommands() {
  try {
    const commands = await sbSelect('command_queue',
      `node_target=eq.${NODE_ID}&status=eq.queued&order=priority.asc,issued_at.asc&limit=5`);

    for (const cmd of (commands || [])) {
      if (inFlight.has(cmd.command_id)) continue;

      // Atomic claim
      try {
        const claimRes = await fetch(
          `${SUPABASE_URL}/rest/v1/command_queue?command_id=eq.${encodeURIComponent(cmd.command_id)}&status=eq.queued`,
          {
            method: 'PATCH',
            headers: { ...SB, 'Prefer': 'return=representation' },
            body: JSON.stringify({ status: 'received', started_at: new Date().toISOString() }),
          }
        );
        const claimed = await claimRes.json();
        if (!Array.isArray(claimed) || claimed.length === 0) continue;
      } catch { continue; }

      inFlight.add(cmd.command_id);
      dispatchCommand(cmd).finally(() => inFlight.delete(cmd.command_id));
    }
  } catch (err) {
    log(`Command poll error: ${err.message}`);
  }
}

// ── Preflight ────────────────────────────────────────────────────────────────
async function preflight() {
  console.log('=== Local Agent Daemon Preflight ===\n');
  if (!SUPABASE_KEY) { console.log('FAIL: SUPABASE_SERVICE_ROLE_KEY not set'); return false; }
  console.log('OK: Supabase key loaded');

  try {
    await sbSelect('agent_nodes', 'limit=1');
    console.log('OK: agent_nodes table accessible');
  } catch (err) {
    console.log(`FAIL: agent_nodes — ${err.message}`);
    return false;
  }

  const safari = await checkSafariHealth();
  console.log(`OK: Safari services — ${safari.servicesUp}/${SAFARI_PORTS.length} up`);

  const chrome = await checkChromeHealth();
  console.log(`${chrome.healthy ? 'OK' : 'WARN'}: Chrome CDP port 9333 — ${chrome.status}`);

  const workers = scanWorkers();
  const running = Object.values(workers).filter(s => s === 'running').length;
  console.log(`OK: ${running}/${KNOWN_DAEMONS.length} daemons running`);

  console.log('\nPreflight complete.');
  return true;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  try { fs.mkdirSync(path.join(H, 'logs'), { recursive: true }); } catch {}

  if (MODE === 'test') {
    const ok = await preflight();
    process.exit(ok ? 0 : 1);
  }

  if (!SUPABASE_KEY) {
    console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY not set');
    process.exit(1);
  }

  await loadAdapters();
  log(`local-agent-daemon started (PID ${process.pid}, node_id=${NODE_ID})`);

  // Initial registration
  let workers = scanWorkers();
  let safari = await checkSafariHealth();
  let chrome = await checkChromeHealth();
  await heartbeat(workers, safari, chrome);
  await reportWorkers(workers);
  await reportBrowserSessions(safari, chrome);

  if (MODE === 'once') {
    await pollCommands();
    log('Single cycle complete, exiting');
    process.exit(0);
  }

  // ── Timers ────────────────────────────────────────────────────────────────
  // Every 10s: poll command_queue
  setInterval(pollCommands, 10_000);

  // Every 30s: heartbeat
  setInterval(async () => {
    workers = scanWorkers();
    safari = await checkSafariHealth();
    chrome = await checkChromeHealth();
    await heartbeat(workers, safari, chrome);
  }, 30_000);

  // Every 60s: full worker + browser reports
  setInterval(async () => {
    await reportWorkers(workers);
    await reportBrowserSessions(safari, chrome);
  }, 60_000);

  // Every 5min: check if ACD is idle or down — notify Telegram
  setInterval(checkAcdIdle, 5 * 60 * 1000);

  const shutdown = () => {
    log('Shutting down...');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Export for observability-api
export { buildNodeStatus, scanWorkers, checkSafariHealth, checkChromeHealth, NODE_ID };

// Only auto-start when run directly (not when imported as a module)
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch(err => {
    console.error(`local-agent-daemon fatal: ${err.message}`);
    process.exit(1);
  });
}
