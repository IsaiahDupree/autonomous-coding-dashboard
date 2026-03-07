#!/usr/bin/env node

/**
 * Service Monitor (SH-003 + SH-004)
 * ==================================
 * Polls all Safari service ports every 30s and tracks health.
 * Auto-restarts downed services after 2+ consecutive failures.
 * Escalates to code-fixer-agent after 3 restart failures per hour.
 *
 * Usage:
 *   node harness/service-monitor.js
 *
 * Writes: harness/service-health.json, harness/healing-stats.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HEALTH_FILE = path.join(__dirname, 'service-health.json');
const STATS_FILE = path.join(__dirname, 'healing-stats.json');
const LOGS_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOGS_DIR, 'service-monitor.log');
const PID_FILE = path.join(__dirname, 'service-monitor.pid');

const POLL_INTERVAL_MS = parseInt(process.env.SVC_POLL_MS || '30000', 10);
const DOWN_THRESHOLD = 2; // consecutive failures before restart
const MAX_RESTARTS_PER_HOUR = 3;

const SERVICES = [
  { name: 'ig-dm',        port: 3100 },
  { name: 'tw-dm',        port: 3003 },
  { name: 'tk-dm',        port: 3102 },
  { name: 'li-dm',        port: 3105 },
  { name: 'ig-comments',  port: 3005 },
  { name: 'tk-comments',  port: 3006 },
  { name: 'tw-comments',  port: 3007 },
  { name: 'threads',      port: 3004 },
  { name: 'market-res',   port: 3106 },
];

// State per service
const state = {};
for (const svc of SERVICES) {
  state[svc.port] = {
    name: svc.name,
    port: svc.port,
    status: 'unknown',
    consecutiveFailures: 0,
    lastUp: null,
    lastDown: null,
    restartAttempts: [], // timestamps
    totalChecks: 0,
    totalUp: 0,
  };
}

// Healing stats
let healingStats = loadJson(STATS_FILE, {
  total_attempts: 0,
  successes: 0,
  failures: 0,
  mttr_seconds: 0,
  recent_heals: [],
  by_service: {},
});

// ── Logging ──────────────────────────────────────────────────────────────────

function log(msg) {
  const line = `${new Date().toISOString()} [service-monitor] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch { /* non-fatal */ }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadJson(fp, fallback) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return fallback; }
}

function writeJson(fp, data) {
  try { fs.writeFileSync(fp, JSON.stringify(data, null, 2)); } catch (e) { log(`Write error: ${e.message}`); }
}

async function checkPort(port, timeoutMs = 3000) {
  try {
    const res = await fetch(`http://localhost:${port}/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Restart logic ────────────────────────────────────────────────────────────

function canRestart(svcState) {
  const now = Date.now();
  svcState.restartAttempts = svcState.restartAttempts.filter(t => now - t < 3600000);
  return svcState.restartAttempts.length < MAX_RESTARTS_PER_HOUR;
}

function restartService(svcState) {
  const watchdogScript = path.join(__dirname, '..', 'Safari Automation', 'watchdog-safari.sh');
  const fallbackScript = '/Users/isaiahdupree/Documents/Software/Safari Automation/watchdog-safari.sh';
  const script = fs.existsSync(watchdogScript) ? watchdogScript : fallbackScript;

  log(`Restarting ${svcState.name} (port ${svcState.port})...`);
  svcState.restartAttempts.push(Date.now());

  try {
    // Try to restart the specific service via Safari Automation's package start
    const pkgMap = {
      'ig-dm': 'instagram-dm',
      'tw-dm': 'twitter-dm',
      'tk-dm': 'tiktok-dm',
      'li-dm': 'linkedin-dm',
      'ig-comments': 'instagram-comments',
      'tk-comments': 'tiktok-comments',
      'tw-comments': 'twitter-comments',
      'threads': 'threads-comments',
      'market-res': 'market-research',
    };
    const pkg = pkgMap[svcState.name];
    if (pkg) {
      const saDir = '/Users/isaiahdupree/Documents/Software/Safari Automation';
      const proc = spawn('/bin/zsh', ['-l', '-c', `npm run --prefix packages/${pkg} start:server`], {
        cwd: saDir,
        detached: true,
        stdio: 'ignore',
      });
      proc.unref();
      log(`Spawned restart for ${svcState.name} (PID ${proc.pid})`);
      return true;
    }
  } catch (e) {
    log(`Restart failed for ${svcState.name}: ${e.message}`);
  }
  return false;
}

// ── Record heal event ─────────────────────────────────────────────────────────

function recordHeal(svcName, success, mttrMs) {
  healingStats.total_attempts++;
  if (success) {
    healingStats.successes++;
  } else {
    healingStats.failures++;
  }

  if (mttrMs > 0 && success) {
    const prev = healingStats.mttr_seconds * (healingStats.successes - 1);
    healingStats.mttr_seconds = Math.round((prev + mttrMs / 1000) / healingStats.successes);
  }

  if (!healingStats.by_service[svcName]) {
    healingStats.by_service[svcName] = { attempts: 0, successes: 0, failures: 0 };
  }
  const svcStats = healingStats.by_service[svcName];
  svcStats.attempts++;
  if (success) svcStats.successes++;
  else svcStats.failures++;

  healingStats.recent_heals = healingStats.recent_heals.slice(-49);
  healingStats.recent_heals.push({
    ts: new Date().toISOString(),
    service: svcName,
    success,
    mttr_ms: mttrMs,
  });

  // Alert if success rate < 50%
  if (healingStats.total_attempts >= 4) {
    const rate = healingStats.successes / healingStats.total_attempts;
    if (rate < 0.5) {
      log(`WARNING: Heal success rate is ${(rate * 100).toFixed(0)}% (${healingStats.successes}/${healingStats.total_attempts})`);
    }
  }

  writeJson(STATS_FILE, healingStats);
}

// ── Escalate to code-fixer-agent ──────────────────────────────────────────────

function escalateToCodeFixer(svcState) {
  const fixerScript = path.join(__dirname, 'code-fixer-agent.js');
  if (!fs.existsSync(fixerScript)) {
    log(`code-fixer-agent.js not found — cannot escalate for ${svcState.name}`);
    return;
  }

  log(`Escalating ${svcState.name} to code-fixer-agent (3+ restart failures)`);

  const errorContext = JSON.stringify({
    service: svcState.name,
    port: svcState.port,
    consecutiveFailures: svcState.consecutiveFailures,
    lastDown: svcState.lastDown,
  });

  const proc = spawn('node', [fixerScript, '--service', svcState.name, '--context', errorContext], {
    cwd: __dirname,
    detached: true,
    stdio: 'ignore',
  });
  proc.unref();
  log(`Spawned code-fixer-agent for ${svcState.name} (PID ${proc.pid})`);
}

// ── Poll loop ─────────────────────────────────────────────────────────────────

async function poll() {
  const results = await Promise.all(
    SERVICES.map(async (svc) => {
      const up = await checkPort(svc.port);
      return { port: svc.port, up };
    })
  );

  for (const { port, up } of results) {
    const s = state[port];
    s.totalChecks++;

    if (up) {
      // Service is up
      if (s.status === 'down' && s.lastDown) {
        const mttr = Date.now() - new Date(s.lastDown).getTime();
        log(`${s.name} recovered after ${(mttr / 1000).toFixed(0)}s`);
        recordHeal(s.name, true, mttr);
      }
      s.status = 'up';
      s.consecutiveFailures = 0;
      s.lastUp = new Date().toISOString();
      s.totalUp++;
    } else {
      // Service is down
      s.consecutiveFailures++;
      if (s.status !== 'down') {
        s.status = 'down';
        s.lastDown = new Date().toISOString();
        log(`${s.name} (port ${port}) is DOWN (failure #${s.consecutiveFailures})`);
      }

      // Auto-restart after DOWN_THRESHOLD consecutive failures
      if (s.consecutiveFailures === DOWN_THRESHOLD) {
        if (canRestart(s)) {
          const restarted = restartService(s);
          if (!restarted) {
            recordHeal(s.name, false, 0);
          }
        } else {
          log(`${s.name}: max restarts/hr reached — escalating to code-fixer`);
          escalateToCodeFixer(s);
          recordHeal(s.name, false, 0);
        }
      }

      // Re-check after restart attempt: escalate if still down after 3 restart cycles
      if (s.consecutiveFailures > 0 && s.consecutiveFailures % (DOWN_THRESHOLD * 3) === 0) {
        if (!canRestart(s)) {
          escalateToCodeFixer(s);
        }
      }
    }
  }

  // Write health state
  const healthData = {
    ts: new Date().toISOString(),
    services: SERVICES.map(svc => {
      const s = state[svc.port];
      return {
        name: s.name,
        port: s.port,
        status: s.status,
        uptime_pct: s.totalChecks > 0 ? Math.round((s.totalUp / s.totalChecks) * 100) : 0,
        consecutive_failures: s.consecutiveFailures,
        last_up: s.lastUp,
        last_down: s.lastDown,
        last_restart: s.restartAttempts.length > 0
          ? new Date(s.restartAttempts[s.restartAttempts.length - 1]).toISOString()
          : null,
      };
    }),
  };
  writeJson(HEALTH_FILE, healthData);
}

// ── Start ─────────────────────────────────────────────────────────────────────

async function start() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.writeFileSync(PID_FILE, String(process.pid));

  log(`Starting service-monitor — polling ${SERVICES.length} services every ${POLL_INTERVAL_MS / 1000}s`);
  log(`Down threshold: ${DOWN_THRESHOLD} checks, max restarts/hr: ${MAX_RESTARTS_PER_HOUR}`);

  await poll();
  setInterval(() => poll().catch(e => log(`Poll error: ${e.message}`)), POLL_INTERVAL_MS);
}

// ── Exports (for testing and API) ─────────────────────────────────────────────

export { state, healingStats, SERVICES, poll, checkPort };

// ── CLI entry ─────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch(e => {
    console.error(`service-monitor fatal: ${e.message}`);
    process.exit(1);
  });
}
