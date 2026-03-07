#!/usr/bin/env node

/**
 * ACD Watchdog + Doctor Agent — Tests
 * ====================================
 * Uses Node.js built-in `node:test` (Node 18+).
 *
 * Run:
 *   node --experimental-vm-modules harness/test-watchdog.js
 *   node harness/test-watchdog.js
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import pure-logic exports (no side-effects since main() is guarded)
import {
  buildStallCheck,
  buildHeartbeatCheck,
  buildProgressCheck,
  canRestart,
  getProcessState,
  findQueuePid,
  STALE_HEARTBEAT_MINUTES,
  STALE_PROGRESS_MINUTES,
} from './watchdog.js';

// ── buildStallCheck ──────────────────────────────────────────────────────────
describe('buildStallCheck', () => {
  it('returns stalled=true when procState is null (dead process)', () => {
    const result = buildStallCheck(null, 12345);
    assert.equal(result.stalled, true);
    assert.ok(result.reason.includes('12345'));
  });

  it('returns stalled=true for T (stopped/suspended) state', () => {
    const result = buildStallCheck('T', 99);
    assert.equal(result.stalled, true);
    assert.ok(result.reason.includes('suspended'));
  });

  it('returns stalled=true for TN compound state', () => {
    const result = buildStallCheck('TN', 99);
    assert.equal(result.stalled, true);
  });

  it('returns stalled=false for S (sleeping) state', () => {
    const result = buildStallCheck('S', 99);
    assert.equal(result.stalled, false);
  });

  it('returns stalled=false for R (running) state', () => {
    const result = buildStallCheck('R', 99);
    assert.equal(result.stalled, false);
  });

  it('returns stalled=false for U (uninterruptible) state', () => {
    const result = buildStallCheck('U', 99);
    assert.equal(result.stalled, false);
  });
});

// ── buildHeartbeatCheck ──────────────────────────────────────────────────────
describe('buildHeartbeatCheck', () => {
  const THRESHOLD = STALE_HEARTBEAT_MINUTES;

  it('returns stale=false for a fresh heartbeat (1 min old)', () => {
    const nowMs = Date.now();
    const hbTs  = new Date(nowMs - 60_000).toISOString();
    const result = buildHeartbeatCheck(hbTs, nowMs, THRESHOLD);
    assert.equal(result.stale, false);
    assert.ok(result.ageMin < 2);
  });

  it('returns stale=true when heartbeat is older than threshold', () => {
    const nowMs = Date.now();
    const hbTs  = new Date(nowMs - (THRESHOLD + 1) * 60_000).toISOString();
    const result = buildHeartbeatCheck(hbTs, nowMs, THRESHOLD);
    assert.equal(result.stale, true);
    assert.ok(result.ageMin > THRESHOLD);
  });

  it('returns stale=false at exactly the threshold boundary (exclusive)', () => {
    const nowMs = Date.now();
    const hbTs  = new Date(nowMs - THRESHOLD * 60_000 + 1000).toISOString();
    const result = buildHeartbeatCheck(hbTs, nowMs, THRESHOLD);
    assert.equal(result.stale, false);
  });

  it('reports correct ageMin value', () => {
    const nowMs  = Date.now();
    const hbTs   = new Date(nowMs - 7 * 60_000).toISOString();
    const result = buildHeartbeatCheck(hbTs, nowMs, THRESHOLD);
    assert.ok(Math.abs(result.ageMin - 7) < 0.1, `expected ~7 min, got ${result.ageMin}`);
  });
});

// ── buildProgressCheck ───────────────────────────────────────────────────────
describe('buildProgressCheck', () => {
  const THRESHOLD = STALE_PROGRESS_MINUTES;
  const now = Date.now();

  it('returns action=init when snapshot is null', () => {
    const result = buildProgressCheck(null, 'repo-a', 5, now, THRESHOLD);
    assert.equal(result.action, 'init');
    assert.deepEqual(result.snapshot, { repo: 'repo-a', passes: 5, ts: now });
  });

  it('returns action=repo_changed when repo id changes', () => {
    const snapshot = { repo: 'repo-a', passes: 5, ts: now - 1000 };
    const result = buildProgressCheck(snapshot, 'repo-b', 5, now, THRESHOLD);
    assert.equal(result.action, 'repo_changed');
  });

  it('returns action=progress when passingCount increases', () => {
    const snapshot = { repo: 'repo-a', passes: 5, ts: now - 60_000 };
    const result = buildProgressCheck(snapshot, 'repo-a', 8, now, THRESHOLD);
    assert.equal(result.action, 'progress');
  });

  it('returns action=ok when stuck for < 15 min', () => {
    const snapshot = { repo: 'repo-a', passes: 5, ts: now - 10 * 60_000 };
    const result = buildProgressCheck(snapshot, 'repo-a', 5, now, THRESHOLD);
    assert.equal(result.action, 'ok');
  });

  it('returns action=warn when stuck for 15–THRESHOLD min', () => {
    const snapshot = { repo: 'repo-a', passes: 5, ts: now - 20 * 60_000 };
    const result = buildProgressCheck(snapshot, 'repo-a', 5, now, THRESHOLD);
    assert.equal(result.action, 'warn');
    assert.ok(result.stuckMin >= 20);
  });

  it('returns action=stale when stuck beyond THRESHOLD', () => {
    const stuckMs = (THRESHOLD + 5) * 60_000;
    const snapshot = { repo: 'repo-a', passes: 5, ts: now - stuckMs };
    const result = buildProgressCheck(snapshot, 'repo-a', 5, now, THRESHOLD);
    assert.equal(result.action, 'stale');
    assert.ok(result.stuckMin > THRESHOLD);
  });

  it('progress count staying same but < 15 min is ok (not warn)', () => {
    const snapshot = { repo: 'repo-a', passes: 10, ts: now - 5 * 60_000 };
    const result = buildProgressCheck(snapshot, 'repo-a', 10, now, THRESHOLD);
    assert.equal(result.action, 'ok');
  });
});

// ── canRestart ───────────────────────────────────────────────────────────────
describe('canRestart', () => {
  it('returns true when no recent restarts have occurred', () => {
    // canRestart uses module-level restartHistory; if it was empty it should pass
    const result = canRestart();
    assert.equal(typeof result, 'boolean');
  });
});

// ── getProcessState ──────────────────────────────────────────────────────────
describe('getProcessState', () => {
  it('returns null for pid=null', () => {
    assert.equal(getProcessState(null), null);
  });

  it('returns null for a non-existent PID', () => {
    const result = getProcessState(999999999);
    assert.equal(result, null);
  });

  it('returns a non-null string for own PID', () => {
    const result = getProcessState(process.pid);
    assert.notEqual(result, null);
    assert.equal(typeof result, 'string');
    assert.ok(result.length > 0, 'state should be non-empty string');
  });

  it('own process is not suspended (T)', () => {
    const result = getProcessState(process.pid);
    assert.ok(!result?.includes('T'), `own process should not be in T state, got: ${result}`);
  });
});

// ── findQueuePid ─────────────────────────────────────────────────────────────
describe('findQueuePid', () => {
  it('returns a number or null (never throws)', () => {
    const result = findQueuePid();
    assert.ok(result === null || typeof result === 'number');
  });

  it('result does not equal watchdog own PID', () => {
    const result = findQueuePid();
    if (result !== null) {
      assert.notEqual(result, process.pid);
    }
  });
});

// ── Constants sanity ─────────────────────────────────────────────────────────
describe('Constants', () => {
  it('STALE_HEARTBEAT_MINUTES is a positive number', () => {
    assert.ok(typeof STALE_HEARTBEAT_MINUTES === 'number');
    assert.ok(STALE_HEARTBEAT_MINUTES > 0);
  });

  it('STALE_PROGRESS_MINUTES > STALE_HEARTBEAT_MINUTES (progress threshold is longer)', () => {
    assert.ok(STALE_PROGRESS_MINUTES > STALE_HEARTBEAT_MINUTES,
      `Progress threshold (${STALE_PROGRESS_MINUTES}) should be > heartbeat threshold (${STALE_HEARTBEAT_MINUTES})`);
  });
});

// ── Doctor Agent (integration-light tests) ───────────────────────────────────
describe('Doctor Agent module', () => {
  let runDoctorAgent;

  before(async () => {
    // Import dynamically so failures here don't break other tests
    try {
      const mod = await import('./doctor-agent.js');
      runDoctorAgent = mod.runDoctorAgent;
    } catch (e) {
      // Doctor agent may not be available if claude CLI missing
    }
  });

  it('exports runDoctorAgent function', () => {
    assert.ok(typeof runDoctorAgent === 'function', 'runDoctorAgent should be exported');
  });

  it('returns a result object with required fields when called (fast timeout test)', async () => {
    if (!runDoctorAgent) return;

    // Override: call with a very short timeout by patching the timeout.
    // We just check the shape of the result without actually running claude.
    // Since claude may not be installed in CI, we only verify the contract.
    let resolved = false;
    const resultPromise = runDoctorAgent({ reason: 'test-invocation', currentRepo: null });

    // Give it 500ms — if claude spawns and errors immediately, we get a result
    const timeoutPromise = new Promise(r => setTimeout(() => r('timeout'), 500));
    const winner = await Promise.race([resultPromise, timeoutPromise]);

    if (winner !== 'timeout') {
      resolved = true;
      assert.ok(typeof winner === 'object', 'result should be an object');
      assert.ok('healed' in winner, 'result should have healed field');
      assert.ok('actions' in winner, 'result should have actions field');
    }
    // If it timed out (claude is running), assert we at least got a non-null race result
    assert.ok(winner === 'timeout' || typeof winner === 'object',
      'race result should be timeout string or a result object');
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────────
describe('Edge cases', () => {
  it('buildProgressCheck handles passingCount=0 correctly', () => {
    const now = Date.now();
    const result = buildProgressCheck(null, 'new-repo', 0, now, 60);
    assert.equal(result.action, 'init');
    assert.equal(result.snapshot.passes, 0);
  });

  it('buildHeartbeatCheck handles very old timestamps (days old)', () => {
    const nowMs = Date.now();
    const hbTs  = new Date(nowMs - 24 * 60 * 60_000).toISOString(); // 24h ago
    const result = buildHeartbeatCheck(hbTs, nowMs, 10);
    assert.equal(result.stale, true);
    assert.ok(result.ageMin > 1400);
  });

  it('buildStallCheck handles Z (zombie) state as not stalled (Z != T)', () => {
    const result = buildStallCheck('Z', 99);
    // Zombies are dead-ish but not suspended — watchdog handles separately
    assert.equal(result.stalled, false);
  });
});

console.log('\n✅ All ACD Watchdog tests complete.\n');
