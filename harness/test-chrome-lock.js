#!/usr/bin/env node

/**
 * chrome-lock.js — Tests
 * ======================
 * Tests the shared Chrome CDP mutex: acquire, release, stale detection, timeout.
 *
 * Run:
 *   node harness/test-chrome-lock.js
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

// Use a temp lock file so tests never interfere with a real running session
const TEST_LOCK = '/tmp/chrome-linkedin-test.lock';

// Monkey-patch the lock file path before importing
// chrome-lock reads LOCK_FILE at module level so we override via env-like approach:
// Since LOCK_FILE is a module constant, we test against the real /tmp/chrome-linkedin.lock
// but clean it up before and after each test.
const REAL_LOCK = '/tmp/chrome-linkedin.lock';

import { acquireLock, releaseLock, lockStatus } from './chrome-lock.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
function removeLock() {
  try { fs.unlinkSync(REAL_LOCK); } catch {}
}

function writeFakeLock(overrides = {}) {
  const now = Date.now();
  const data = {
    pid: process.pid,
    script: 'test',
    acquired: new Date(now).toISOString(),
    expires: new Date(now + 12 * 60 * 1000).toISOString(),
    ...overrides,
  };
  fs.writeFileSync(REAL_LOCK, JSON.stringify(data));
}

// ── Setup / teardown ─────────────────────────────────────────────────────────
before(() => removeLock());
after(() => removeLock());
afterEach(() => removeLock());

// ── lockStatus ───────────────────────────────────────────────────────────────
describe('lockStatus', () => {
  it('returns null when no lock file exists', () => {
    removeLock();
    assert.equal(lockStatus(), null);
  });

  it('returns lock info when lock exists', async () => {
    await acquireLock('test-status', 5000);
    const status = lockStatus();
    assert.notEqual(status, null);
    assert.equal(status.script, 'test-status');
    assert.equal(status.pid, process.pid);
    assert.ok('stale' in status);
    releaseLock();
  });

  it('stale=false for a fresh lock held by own pid', async () => {
    await acquireLock('test-fresh', 5000);
    const status = lockStatus();
    assert.equal(status.stale, false);
    releaseLock();
  });

  it('stale=true for a lock with expired timestamp', () => {
    writeFakeLock({ expires: new Date(Date.now() - 1000).toISOString() });
    const status = lockStatus();
    assert.equal(status.stale, true);
  });

  it('stale=true for a lock held by a dead pid', () => {
    writeFakeLock({ pid: 999999999, expires: new Date(Date.now() + 60_000).toISOString() });
    const status = lockStatus();
    assert.equal(status.stale, true);
  });
});

// ── acquireLock ──────────────────────────────────────────────────────────────
describe('acquireLock', () => {
  it('returns true when no lock exists', async () => {
    removeLock();
    const result = await acquireLock('test-acquire', 5000);
    assert.equal(result, true);
    releaseLock();
  });

  it('creates the lock file after acquiring', async () => {
    removeLock();
    await acquireLock('test-creates-file', 5000);
    assert.ok(fs.existsSync(REAL_LOCK), 'lock file should exist after acquire');
    releaseLock();
  });

  it('lock file contains correct pid and script name', async () => {
    removeLock();
    await acquireLock('test-content', 5000);
    const data = JSON.parse(fs.readFileSync(REAL_LOCK, 'utf-8'));
    assert.equal(data.pid, process.pid);
    assert.equal(data.script, 'test-content');
    assert.ok(data.acquired);
    assert.ok(data.expires);
    releaseLock();
  });

  it('expires timestamp is ~12 minutes in the future', async () => {
    removeLock();
    const before = Date.now();
    await acquireLock('test-expires', 5000);
    const data = JSON.parse(fs.readFileSync(REAL_LOCK, 'utf-8'));
    const expiresMs = new Date(data.expires).getTime();
    const diff = expiresMs - before;
    assert.ok(diff > 11 * 60_000, `expires should be >11min away, got ${diff}ms`);
    assert.ok(diff < 13 * 60_000, `expires should be <13min away, got ${diff}ms`);
    releaseLock();
  });

  it('returns true and clears a stale lock (expired timestamp)', async () => {
    writeFakeLock({
      pid: 999999999,
      expires: new Date(Date.now() - 1000).toISOString(),
    });
    const result = await acquireLock('test-clears-stale', 5000);
    assert.equal(result, true);
    releaseLock();
  });

  it('returns true and clears a stale lock (dead pid)', async () => {
    writeFakeLock({ pid: 999999999 }); // dead pid, but not expired
    const result = await acquireLock('test-clears-dead-pid', 5000);
    assert.equal(result, true);
    releaseLock();
  });

  it('returns false when lock is held by a live process and timeout expires', async () => {
    // Simulate a live lock held by our own pid (so process.kill(pid, 0) succeeds)
    // but we write it as a different script so we can test timeout
    writeFakeLock({ pid: process.pid, script: 'other-script', expires: new Date(Date.now() + 60_000).toISOString() });
    // releaseLock() only removes if our pid owns it — we DO own it pid-wise
    // So we need a different approach: write a raw valid-looking lock and test timeout
    // Actually since pid matches, acquireLock will see it as a live lock held by us
    // and try to acquire — but the file already exists (EEXIST), so it waits.
    // With a 500ms timeout, it should return false.
    const result = await acquireLock('test-timeout', 500);
    assert.equal(result, false);
    // Clean up the fake lock
    removeLock();
  });
});

// ── releaseLock ──────────────────────────────────────────────────────────────
describe('releaseLock', () => {
  it('removes the lock file when called after acquire', async () => {
    removeLock();
    await acquireLock('test-release', 5000);
    assert.ok(fs.existsSync(REAL_LOCK));
    releaseLock();
    assert.ok(!fs.existsSync(REAL_LOCK), 'lock file should be removed after release');
  });

  it('is safe to call when no lock exists (no throw)', () => {
    removeLock();
    assert.doesNotThrow(() => releaseLock());
  });

  it('does not remove a lock owned by a different pid', () => {
    writeFakeLock({ pid: process.pid + 1 });
    releaseLock(); // should not remove it (different pid)
    assert.ok(fs.existsSync(REAL_LOCK), 'lock owned by other pid should remain');
    removeLock();
  });

  it('is idempotent — safe to call twice', async () => {
    removeLock();
    await acquireLock('test-idempotent', 5000);
    releaseLock();
    assert.doesNotThrow(() => releaseLock());
  });
});

// ── Acquire → Release → Re-acquire cycle ────────────────────────────────────
describe('acquire → release cycle', () => {
  it('can acquire, release, and re-acquire sequentially', async () => {
    removeLock();

    const r1 = await acquireLock('cycle-1', 5000);
    assert.equal(r1, true);
    releaseLock();

    const r2 = await acquireLock('cycle-2', 5000);
    assert.equal(r2, true);
    releaseLock();
  });
});

console.log('\n✅ chrome-lock tests complete.\n');
