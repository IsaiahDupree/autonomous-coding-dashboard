#!/usr/bin/env node

/**
 * rate-limit-coordinator.js — Tests
 * ===================================
 * This is the most critical utility in the harness: when Claude hits a rate
 * limit, ALL concurrent processes must back off or they compound the problem.
 * If any of these tests fail, agents will waste quota and pile on rate limits.
 *
 * Run:
 *   node harness/test-rate-limit-coordinator.js
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, '.rate-limit-state.json');
const LOCK_FILE  = path.join(__dirname, '.rate-limit-state.lock');

import {
  register,
  deregister,
  reportRateLimit,
  reportSuccess,
  checkGlobalState,
  getSnapshot,
  waitIfRateLimited,
} from './rate-limit-coordinator.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function clearState() {
  try { fs.unlinkSync(STATE_FILE); } catch {}
  try { fs.unlinkSync(LOCK_FILE);  } catch {}
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function readStateRaw() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch { return null; }
}

// Small delay to let async register/deregister writes complete
const tick = () => new Promise(r => setTimeout(r, 100));

before(() => clearState());
after(() => clearState());
beforeEach(() => clearState());

// ── checkGlobalState ──────────────────────────────────────────────────────────
describe('checkGlobalState', () => {
  it('returns limited=false when no state file exists', () => {
    clearState();
    const result = checkGlobalState();
    assert.equal(result.limited, false);
    assert.equal(result.waitMs, 0);
    assert.equal(result.until, null);
  });

  it('returns limited=false when state has no globalPause', () => {
    writeState({ processes: {}, globalPause: null });
    const result = checkGlobalState();
    assert.equal(result.limited, false);
  });

  it('returns limited=true when globalPause is set in the future', () => {
    const until = new Date(Date.now() + 10 * 60_000).toISOString(); // 10 min from now
    writeState({ processes: {}, globalPause: { until, reason: 'test', setBy: 99999, setAt: new Date().toISOString() } });
    const result = checkGlobalState();
    assert.equal(result.limited, true);
    assert.ok(result.waitMs > 0);
    assert.ok(result.until instanceof Date);
    assert.ok(typeof result.reason === 'string');
  });

  it('returns limited=false when globalPause is in the past (expired)', () => {
    const until = new Date(Date.now() - 1000).toISOString(); // 1s ago
    writeState({ processes: {}, globalPause: { until, reason: 'old', setBy: 99999, setAt: new Date().toISOString() } });
    const result = checkGlobalState();
    assert.equal(result.limited, false);
  });

  it('includes peerCount of active processes', () => {
    writeState({ processes: { '1111': { status: 'running' }, '2222': { status: 'running' } }, globalPause: null });
    const result = checkGlobalState();
    assert.equal(result.peerCount, 2);
  });

  it('caps waitMs at MAX_GLOBAL_WAIT_MS (25 min)', () => {
    const until = new Date(Date.now() + 60 * 60_000).toISOString(); // 1 hour — exceeds cap
    writeState({ processes: {}, globalPause: { until, reason: 'test', setBy: 99999, setAt: new Date().toISOString() } });
    const result = checkGlobalState();
    assert.ok(result.waitMs <= 25 * 60_000, `waitMs ${result.waitMs} should be <= 25min`);
  });
});

// ── reportRateLimit ───────────────────────────────────────────────────────────
describe('reportRateLimit', () => {
  it('sets globalPause in state file', async () => {
    clearState();
    await reportRateLimit('claude-sonnet-4-5');
    await tick();
    const state = readStateRaw();
    assert.ok(state?.globalPause, 'globalPause should be set');
    assert.ok(state.globalPause.until, 'until should be set');
    assert.ok(new Date(state.globalPause.until) > new Date(), 'until should be in the future');
  });

  it('sets process entry to rate_limited status', async () => {
    clearState();
    await reportRateLimit('claude-haiku-4-5', { projectId: 'test-proj' });
    await tick();
    const state = readStateRaw();
    const entry = state?.processes?.[process.pid];
    assert.ok(entry, 'process entry should exist');
    assert.equal(entry.status, 'rate_limited');
    assert.equal(entry.rateLimited, true);
    assert.equal(entry.model, 'claude-haiku-4-5');
  });

  it('uses resetAt when provided — adds 60s buffer', async () => {
    clearState();
    const resetAt = new Date(Date.now() + 5 * 60_000).toISOString(); // 5min from now
    await reportRateLimit('claude-sonnet-4-5', { resetAt });
    await tick();
    const state = readStateRaw();
    const until = new Date(state.globalPause.until).getTime();
    const expected = new Date(resetAt).getTime() + 60_000; // resetAt + 60s
    assert.ok(Math.abs(until - expected) < 2000, `until should be resetAt+60s ±2s`);
  });

  it('uses default 20min backoff when no resetAt provided', async () => {
    clearState();
    const before = Date.now();
    await reportRateLimit('claude-sonnet-4-5');
    await tick();
    const state = readStateRaw();
    const until = new Date(state.globalPause.until).getTime();
    const diff = until - before;
    assert.ok(diff >= 19 * 60_000, `diff ${diff}ms should be >= 19min`);
    assert.ok(diff <= 21 * 60_000, `diff ${diff}ms should be <= 21min`);
  });

  it('extends globalPause when a later reset is reported', async () => {
    clearState();
    await reportRateLimit('claude-sonnet-4-5'); // sets 20min pause
    await tick();
    const state1 = readStateRaw();
    const until1 = new Date(state1.globalPause.until).getTime();

    // Report another limit 30 min from now — should extend the pause
    const laterReset = new Date(Date.now() + 30 * 60_000).toISOString();
    await reportRateLimit('claude-opus-4-6', { resetAt: laterReset });
    await tick();
    const state2 = readStateRaw();
    const until2 = new Date(state2.globalPause.until).getTime();
    assert.ok(until2 > until1, 'globalPause should be extended to the later reset');
  });

  it('makes checkGlobalState return limited=true immediately after reporting', async () => {
    clearState();
    await reportRateLimit('claude-sonnet-4-5');
    await tick();
    const result = checkGlobalState();
    assert.equal(result.limited, true);
    assert.ok(result.waitMs > 0);
  });
});

// ── reportSuccess ─────────────────────────────────────────────────────────────
describe('reportSuccess', () => {
  it('clears rateLimited flag for the process', async () => {
    clearState();
    await reportRateLimit('claude-sonnet-4-5');
    await tick();
    await register('test-proj');
    await tick();
    await reportSuccess('claude-sonnet-4-5');
    await tick();
    const state = readStateRaw();
    const entry = state?.processes?.[process.pid];
    if (entry) {
      assert.equal(entry.rateLimited, false);
      assert.equal(entry.status, 'running');
    }
  });

  it('clears globalPause when no other process is rate limited', async () => {
    // Set up state with our process as the only rate-limited one
    const fakePid = 999999998; // dead pid
    writeState({
      processes: {
        [process.pid]: { status: 'rate_limited', rateLimited: true, model: 'claude-sonnet-4-5', updatedAt: new Date().toISOString() },
        [fakePid]: { status: 'rate_limited', rateLimited: true, model: 'claude-sonnet-4-5', updatedAt: new Date(Date.now() - 10 * 60_000).toISOString() },
      },
      globalPause: { until: new Date(Date.now() + 15 * 60_000).toISOString(), reason: 'test', setBy: process.pid, setAt: new Date().toISOString() },
    });
    await reportSuccess('claude-sonnet-4-5');
    await tick();
    const state = readStateRaw();
    // Dead process (fakePid) gets pruned, our process is now not rate-limited
    // globalPause should be cleared since no live rate-limited processes remain
    assert.equal(state?.globalPause, null);
  });
});

// ── register / deregister ─────────────────────────────────────────────────────
describe('register / deregister', () => {
  it('register adds current process to state', async () => {
    clearState();
    register('test-project-id');
    await tick();
    const state = readStateRaw();
    assert.ok(state?.processes?.[process.pid], 'own pid should be in processes');
    assert.equal(state.processes[process.pid].projectId, 'test-project-id');
    assert.equal(state.processes[process.pid].status, 'running');
    assert.equal(state.processes[process.pid].rateLimited, false);
  });

  it('deregister removes current process from state', async () => {
    clearState();
    register('test-project-id');
    await tick();
    deregister();
    await tick();
    const state = readStateRaw();
    assert.ok(!state?.processes?.[process.pid], 'own pid should be removed');
  });
});

// ── getSnapshot ───────────────────────────────────────────────────────────────
describe('getSnapshot', () => {
  it('returns object with processes and globalPause', () => {
    writeState({ processes: { 1234: { status: 'running' } }, globalPause: null });
    const snap = getSnapshot();
    assert.ok(typeof snap === 'object');
    assert.ok('processes' in snap);
    assert.ok('globalPause' in snap);
  });

  it('prunes dead processes when reading', () => {
    const deadPid = 999999997;
    writeState({
      processes: {
        [deadPid]: { status: 'running', updatedAt: new Date(Date.now() - 10 * 60_000).toISOString() },
      },
      globalPause: null,
    });
    const snap = getSnapshot();
    assert.ok(!snap.processes[deadPid], 'dead process should be pruned from snapshot');
  });

  it('does not prune our own process (it is alive)', async () => {
    clearState();
    register('keep-me');
    await tick();
    const snap = getSnapshot();
    assert.ok(snap.processes[process.pid], 'own process should remain in snapshot');
  });
});

// ── waitIfRateLimited ─────────────────────────────────────────────────────────
describe('waitIfRateLimited', () => {
  it('returns 0 immediately when no global rate limit', async () => {
    clearState();
    const waited = await waitIfRateLimited(() => {});
    assert.equal(waited, 0);
  });

  it('returns 0 when WE are the process that set the rate limit', async () => {
    clearState();
    await reportRateLimit('claude-sonnet-4-5');
    await tick();
    // Our process set the limit — waitIfRateLimited should skip (we handle our own wait)
    const waited = await waitIfRateLimited(() => {});
    assert.equal(waited, 0);
  });

  it('does not throw when rate limit is active (non-blocking test)', async () => {
    // Write a rate limit set by a different (dead) pid, expiring very soon
    writeState({
      processes: {},
      globalPause: {
        until: new Date(Date.now() + 100).toISOString(), // expires in 100ms
        reason: 'test',
        setBy: 99999990, // different pid (dead)
        setAt: new Date().toISOString(),
      },
    });
    // Should resolve (the pause expires immediately)
    const logLines = [];
    await assert.doesNotReject(async () => {
      await waitIfRateLimited((msg) => logLines.push(msg));
    });
  });
});

console.log('\n✅ rate-limit-coordinator tests complete.\n');
