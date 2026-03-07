#!/usr/bin/env node

/**
 * Overstory Bridge (SH-001)
 * =========================
 * Tails doctor-log.ndjson for entries with diagnosis=confirmed_bug or diagnosis=code_bug.
 * When found, spawns code-fixer-agent.js with the error context.
 *
 * Debounce: max 1 fix attempt per file per 10 minutes.
 *
 * Usage:
 *   node harness/overstory-bridge.js
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCTOR_LOG = path.join(__dirname, 'doctor-log.ndjson');
const LOG_FILE = path.join(__dirname, 'logs', 'overstory-bridge.log');
const PID_FILE = path.join(__dirname, 'overstory-bridge.pid');
const STATS_FILE = path.join(__dirname, 'healing-stats.json');

const DEBOUNCE_MS = 10 * 60 * 1000; // 10 minutes per file
const POLL_MS = parseInt(process.env.BRIDGE_POLL_MS || '15000', 10); // check every 15s

const BUG_DIAGNOSES = ['confirmed_bug', 'code_bug', 'syntax_error', 'runtime_error'];

// Track recent fix attempts: key=slug+file → timestamp
const recentFixes = new Map();

// Track file position for tailing
let lastReadPos = 0;

// ── Logging ──────────────────────────────────────────────────────────────────

function log(msg) {
  const line = `${new Date().toISOString()} [overstory-bridge] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch { /* non-fatal */ }
}

// ── Debounce check ───────────────────────────────────────────────────────────

function canFix(slug, filePath) {
  const key = `${slug}:${filePath || 'unknown'}`;
  const last = recentFixes.get(key);
  if (last && Date.now() - last < DEBOUNCE_MS) {
    log(`Debounced: ${key} was attempted ${((Date.now() - last) / 1000).toFixed(0)}s ago`);
    return false;
  }
  return true;
}

function recordAttempt(slug, filePath) {
  const key = `${slug}:${filePath || 'unknown'}`;
  recentFixes.set(key, Date.now());
}

// ── Spawn code-fixer ─────────────────────────────────────────────────────────

function spawnCodeFixer(entry) {
  const fixerScript = path.join(__dirname, 'code-fixer-agent.js');
  if (!fs.existsSync(fixerScript)) {
    log('code-fixer-agent.js not found — skipping');
    return;
  }

  const context = {
    service: entry.slug || 'unknown',
    diagnosis: entry.diagnosis,
    reason: entry.reason,
    file_path: entry.filePath || null,
    error_message: entry.error || null,
    source: 'overstory-bridge',
  };

  log(`Spawning code-fixer for ${entry.slug} (diagnosis: ${entry.diagnosis})`);

  const proc = spawn('node', [
    fixerScript,
    '--service', entry.slug || 'unknown',
    '--context', JSON.stringify(context),
  ], {
    cwd: __dirname,
    detached: true,
    stdio: 'ignore',
  });
  proc.unref();

  log(`code-fixer spawned (PID ${proc.pid}) for ${entry.slug}`);
}

// ── Tail doctor-log.ndjson ───────────────────────────────────────────────────

function readNewEntries() {
  if (!fs.existsSync(DOCTOR_LOG)) return [];

  let size;
  try { size = fs.statSync(DOCTOR_LOG).size; } catch { return []; }

  // Initialize position on first run: start from current end
  if (lastReadPos === 0 && size > 0) {
    lastReadPos = size;
    log(`Initialized tail position at byte ${size}`);
    return [];
  }

  if (size <= lastReadPos) {
    if (size < lastReadPos) lastReadPos = size; // file was truncated
    return [];
  }

  const entries = [];
  try {
    const fd = fs.openSync(DOCTOR_LOG, 'r');
    const buf = Buffer.alloc(size - lastReadPos);
    fs.readSync(fd, buf, 0, buf.length, lastReadPos);
    fs.closeSync(fd);
    lastReadPos = size;

    const lines = buf.toString('utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch { /* skip malformed lines */ }
    }
  } catch (e) {
    log(`Error reading doctor-log: ${e.message}`);
  }

  return entries;
}

// ── Poll loop ─────────────────────────────────────────────────────────────────

function poll() {
  const entries = readNewEntries();

  for (const entry of entries) {
    if (!entry.diagnosis) continue;

    const isBug = BUG_DIAGNOSES.some(d =>
      entry.diagnosis.toLowerCase().includes(d.toLowerCase())
    );

    if (!isBug) {
      log(`Skipping non-bug entry: ${entry.slug} diagnosis=${entry.diagnosis}`);
      continue;
    }

    const slug = entry.slug || 'unknown';
    const filePath = entry.filePath || null;

    if (!canFix(slug, filePath)) continue;

    recordAttempt(slug, filePath);
    spawnCodeFixer(entry);
  }
}

// ── Bridge status (for API) ──────────────────────────────────────────────────

export function getBridgeStatus() {
  return {
    running: true,
    pid: process.pid,
    lastReadPos,
    debounceMs: DEBOUNCE_MS,
    activeDebounces: Array.from(recentFixes.entries()).map(([key, ts]) => ({
      key,
      expiresIn: Math.max(0, DEBOUNCE_MS - (Date.now() - ts)),
    })),
  };
}

// ── Start ─────────────────────────────────────────────────────────────────────

function start() {
  fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
  fs.writeFileSync(PID_FILE, String(process.pid));

  log(`Starting overstory-bridge — watching ${DOCTOR_LOG}`);
  log(`Debounce: ${DEBOUNCE_MS / 1000}s per file, poll interval: ${POLL_MS / 1000}s`);
  log(`Bug diagnoses: ${BUG_DIAGNOSES.join(', ')}`);

  poll();
  setInterval(poll, POLL_MS);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
