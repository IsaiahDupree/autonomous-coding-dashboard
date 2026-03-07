/**
 * chrome-lock.js — Shared Chrome page lock for LinkedIn scrapers
 * ==============================================================
 * All scripts that connect to Chrome CDP :9333 and navigate the LinkedIn page
 * must acquire this lock before doing so. This prevents race conditions where
 * two scrapers navigate the shared page simultaneously.
 *
 * Lock file: /tmp/chrome-linkedin.lock
 * Format:    { pid, script, acquired, expires }
 *
 * Usage:
 *   import { acquireLock, releaseLock } from './chrome-lock.js';
 *
 *   const locked = await acquireLock('my-script');
 *   if (!locked) { err('Could not acquire Chrome lock — timed out'); process.exit(1); }
 *   try {
 *     // ... do Chrome work ...
 *   } finally {
 *     releaseLock();
 *   }
 */

import fs from 'fs';

const LOCK_FILE = '/tmp/chrome-linkedin.lock';
const STALE_MS  = 12 * 60 * 1000;  // 12 min — max realistic Chrome session
const RETRY_MS  = 2_000;            // poll every 2s while waiting

/**
 * Acquire the Chrome page lock.
 * @param {string} scriptName  - identifier logged in the lock file
 * @param {number} timeoutMs   - how long to wait before giving up (default 90s)
 * @returns {Promise<boolean>} - true if acquired, false if timed out
 */
export async function acquireLock(scriptName, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    // Clear stale lock if present
    const existing = _readLock();
    if (existing && _isStale(existing)) {
      try { fs.unlinkSync(LOCK_FILE); } catch {}
    }

    // Atomic exclusive-create — fails with EEXIST if another process got there first
    if (_tryWriteLock(scriptName)) {
      // Register cleanup handlers so lock is always released on exit
      const release = () => releaseLock();
      process.once('exit',   release);
      process.once('SIGTERM', () => { release(); process.exit(0); });
      process.once('SIGINT',  () => { release(); process.exit(0); });
      process.once('uncaughtException', (e) => { release(); throw e; });
      return true;
    }

    // Lock held — log who has it and wait
    const holder = _readLock();
    if (holder) {
      process.stderr.write(
        `[chrome-lock] Waiting for Chrome page — held by ${holder.script} (pid ${holder.pid}), expires ${holder.expires}\n`
      );
    }
    await _sleep(RETRY_MS);
  }

  process.stderr.write(`[chrome-lock] TIMEOUT: could not acquire Chrome lock after ${timeoutMs / 1000}s\n`);
  return false;
}

/**
 * Release the Chrome page lock.
 * Safe to call multiple times — only removes if WE own it.
 */
export function releaseLock() {
  try {
    const lock = _readLock();
    if (lock && lock.pid === process.pid) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch {}
}

/**
 * Read lock status without acquiring.
 * @returns {{ pid, script, acquired, expires } | null}
 */
export function lockStatus() {
  const lock = _readLock();
  if (!lock) return null;
  return { ...lock, stale: _isStale(lock) };
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function _tryWriteLock(scriptName) {
  try {
    const now = Date.now();
    const data = JSON.stringify({
      pid: process.pid,
      script: scriptName,
      acquired: new Date(now).toISOString(),
      expires:  new Date(now + STALE_MS).toISOString(),
    });
    // 'wx' = exclusive create: throws EEXIST if file already exists → atomic
    const fd = fs.openSync(LOCK_FILE, 'wx');
    fs.writeSync(fd, data);
    fs.closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

function _readLock() {
  try { return JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8')); } catch { return null; }
}

function _isStale(lock) {
  if (!lock || !lock.pid || !lock.expires) return true;
  if (new Date(lock.expires) < new Date()) return true;
  // Check if the pid is still alive — ESRCH = no such process = stale
  try { process.kill(lock.pid, 0); return false; }
  catch { return true; }
}

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
