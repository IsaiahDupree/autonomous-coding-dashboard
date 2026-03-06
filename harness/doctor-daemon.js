#!/usr/bin/env node

/**
 * ACD Doctor Daemon
 * =================
 * Background polling process that detects stuck agents and invokes the doctor engine.
 *
 * Start alongside watchdog in watchdog-queue.sh:
 *   node harness/doctor-daemon.js &
 *
 * Thresholds (env-configurable):
 *   DOCTOR_POLL_MS       = 300000  (5 min)
 *   STUCK_THRESHOLD_MS   = 1800000 (30 min — no status update)
 *   OUTPUT_SILENCE_MS    = 900000  (15 min — no log file activity)
 *   MAX_HEALS_PER_HOUR   = 3       (per agent)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { diagnoseAndHeal } from './doctor-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_ROOT = path.resolve(__dirname, '..');
const DOCTOR_LOG_FILE = path.join(__dirname, 'doctor-log.ndjson');
const LOGS_DIR = path.join(__dirname, 'logs');

const POLL_INTERVAL_MS  = parseInt(process.env.DOCTOR_POLL_MS      || '300000',  10);
const STUCK_THRESHOLD_MS = parseInt(process.env.STUCK_THRESHOLD_MS  || '1800000', 10);
const OUTPUT_SILENCE_MS  = parseInt(process.env.OUTPUT_SILENCE_MS   || '900000',  10);
const MAX_HEALS_PER_HOUR = parseInt(process.env.MAX_HEALS_PER_HOUR  || '3',       10);

// Circuit breaker: track doctor calls per agent (slug → [{ts}])
const healHistory = new Map();

// ── Logging ───────────────────────────────────────────────────────────────────

function log(msg) {
  const line = `${new Date().toISOString()} [doctor-daemon] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(path.join(LOGS_DIR, 'doctor-daemon.log'), line + '\n');
  } catch { /* non-fatal */ }
}

function logDoctorResult(slug, reason, result) {
  const entry = {
    ts: new Date().toISOString(),
    slug,
    reason,
    diagnosis: result.diagnosis,
    success: result.success,
    turns: result.turns,
    actionsCount: result.actions_taken?.length || 0,
  };
  try {
    fs.appendFileSync(DOCTOR_LOG_FILE, JSON.stringify(entry) + '\n');
  } catch { /* non-fatal */ }
}

// ── Circuit breaker ───────────────────────────────────────────────────────────

function canHeal(slug) {
  const now = Date.now();
  const history = (healHistory.get(slug) || []).filter(h => now - h.ts < 60 * 60 * 1000);
  healHistory.set(slug, history); // prune old entries
  if (history.length >= MAX_HEALS_PER_HOUR) {
    log(`Circuit breaker: ${slug} has ${history.length}/${MAX_HEALS_PER_HOUR} heals this hour`);
    return false;
  }
  return true;
}

function recordHeal(slug) {
  const history = healHistory.get(slug) || [];
  history.push({ ts: Date.now() });
  healHistory.set(slug, history);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return null; }
}

function isPidAlive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

// ── Poll loop ─────────────────────────────────────────────────────────────────

async function checkAndHeal() {
  log('Polling agents...');

  let files = [];
  try {
    files = fs.readdirSync(DASHBOARD_ROOT).filter(
      f => f.startsWith('harness-status-') && f.endsWith('.json')
    );
  } catch (e) {
    log(`Failed to read dashboard root: ${e.message}`);
    return;
  }

  for (const file of files) {
    const d = readJson(path.join(DASHBOARD_ROOT, file));
    if (!d?.projectId) continue;
    if (d.status !== 'running') continue;

    const slug = d.projectId;
    const pidAlive = isPidAlive(d.pid);
    const ageMs = d.lastUpdated
      ? Date.now() - new Date(d.lastUpdated).getTime()
      : Infinity;

    let stuckReason = null;

    if (!pidAlive && d.pid) {
      stuckReason = `PID ${d.pid} is dead but status shows running`;
    } else if (ageMs > STUCK_THRESHOLD_MS) {
      stuckReason = `No status update for ${(ageMs / 60000).toFixed(0)} minutes`;
    } else {
      // Check output silence via log file mtime
      const logFile = path.join(LOGS_DIR, `${slug}.log`);
      if (fs.existsSync(logFile)) {
        try {
          const { mtimeMs } = fs.statSync(logFile);
          const silenceMs = Date.now() - mtimeMs;
          if (silenceMs > OUTPUT_SILENCE_MS) {
            stuckReason = `Log silent for ${(silenceMs / 60000).toFixed(0)} minutes`;
          }
        } catch { /* ok */ }
      }
    }

    if (!stuckReason) continue;

    log(`Stuck agent: ${slug} — ${stuckReason}`);

    if (!canHeal(slug)) continue;

    log(`Calling doctor for ${slug}...`);
    recordHeal(slug);

    try {
      const result = await diagnoseAndHeal(slug, stuckReason);
      log(`Doctor result for ${slug}: success=${result.success}, turns=${result.turns}`);
      logDoctorResult(slug, stuckReason, result);
    } catch (e) {
      log(`Doctor error for ${slug}: ${e.message}`);
      logDoctorResult(slug, stuckReason, { error: e.message, success: false, turns: 0, actions_taken: [] });
    }
  }
}

// ── Start daemon ──────────────────────────────────────────────────────────────

async function startDaemon() {
  log(`Starting — poll=${POLL_INTERVAL_MS}ms stuck=${STUCK_THRESHOLD_MS}ms silence=${OUTPUT_SILENCE_MS}ms maxHeals=${MAX_HEALS_PER_HOUR}/hr`);

  fs.mkdirSync(LOGS_DIR, { recursive: true });

  // Run immediately, then on interval
  await checkAndHeal();

  setInterval(() => {
    checkAndHeal().catch(e => log(`Poll error: ${e.message}`));
  }, POLL_INTERVAL_MS);
}

startDaemon().catch(e => {
  console.error(`Doctor daemon fatal: ${e.message}`);
  process.exit(1);
});
