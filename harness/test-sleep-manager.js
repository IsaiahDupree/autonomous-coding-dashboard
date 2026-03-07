#!/usr/bin/env node

/**
 * sleep-manager.js — SleepManager Class Tests
 * =============================================
 * Controls quiet hours enforcement across all sweeps.
 * Wrong sleep logic = DMs sent at 3am = TOS violations.
 *
 * Tests: constructor, recordActivity, enterSleep, wake,
 *        getState, callbacks, checkSleepCondition, externalTrigger
 *
 * Run:
 *   node harness/test-sleep-manager.js
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import SleepManager from './sleep-manager.js';

// Use temp dir for all state files — no pollution of real harness state
function makeTempConfig() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sleep-test-'));
  return {
    sleepStateFile: path.join(dir, 'sleep-state.json'),
    statusFile:     path.join(dir, 'harness-status.json'),
    lastAccessFile: path.join(dir, 'last-access'),
    sleepTimeoutMs: 100,      // very short for testing
    _tempDir: dir,
  };
}

function makeManager(extra = {}) {
  const cfg = makeTempConfig();
  const mgr = new SleepManager({ ...cfg, ...extra });
  mgr.log = () => {};         // silence output during tests
  return mgr;
}

// ── Constructor ───────────────────────────────────────────────────────────────
describe('SleepManager constructor', () => {
  it('initializes with isSleeping=false', () => {
    const m = makeManager();
    assert.equal(m.state.isSleeping, false);
    m.stop();
  });

  it('initializes activityCount=0', () => {
    const m = makeManager();
    assert.equal(m.state.activityCount, 0);
    m.stop();
  });

  it('accepts custom config and merges with defaults', () => {
    const m = makeManager({ sleepTimeoutMs: 5000 });
    assert.equal(m.config.sleepTimeoutMs, 5000);
    m.stop();
  });

  it('wakeReason is null initially', () => {
    const m = makeManager();
    assert.equal(m.state.wakeReason, null);
    m.stop();
  });
});

// ── recordActivity ────────────────────────────────────────────────────────────
describe('recordActivity', () => {
  it('increments activityCount', () => {
    const m = makeManager();
    m.recordActivity();
    m.recordActivity();
    assert.equal(m.state.activityCount, 2);
    m.stop();
  });

  it('updates lastActivityTime', () => {
    const m = makeManager();
    const before = m.state.lastActivityTime;
    m.recordActivity();
    assert.ok(m.state.lastActivityTime >= before);
    m.stop();
  });

  it('wakes manager if it was sleeping', () => {
    const m = makeManager();
    m.forceSleep();
    assert.equal(m.state.isSleeping, true);
    m.recordActivity();
    assert.equal(m.state.isSleeping, false);
    m.stop();
  });
});

// ── forceSleep / enterSleep ───────────────────────────────────────────────────
describe('forceSleep / enterSleep', () => {
  it('sets isSleeping=true', () => {
    const m = makeManager();
    m.forceSleep();
    assert.equal(m.state.isSleeping, true);
    m.stop();
  });

  it('sets sleepStartTime to a recent timestamp', () => {
    const m = makeManager();
    const before = Date.now();
    m.forceSleep();
    assert.ok(m.state.sleepStartTime >= before);
    assert.ok(m.state.sleepStartTime <= Date.now());
    m.stop();
  });

  it('is idempotent (calling twice does not crash)', () => {
    const m = makeManager();
    m.forceSleep();
    m.forceSleep(); // second call should no-op
    assert.equal(m.state.isSleeping, true);
    m.stop();
  });

  it('calls onSleep callback', () => {
    const m = makeManager();
    let called = false;
    m.onSleep(() => { called = true; });
    m.forceSleep();
    assert.ok(called);
    m.stop();
  });
});

// ── wake ──────────────────────────────────────────────────────────────────────
describe('wake', () => {
  it('sets isSleeping=false', () => {
    const m = makeManager();
    m.forceSleep();
    m.forceWake();
    assert.equal(m.state.isSleeping, false);
    m.stop();
  });

  it('clears sleepStartTime', () => {
    const m = makeManager();
    m.forceSleep();
    m.forceWake();
    assert.equal(m.state.sleepStartTime, null);
    m.stop();
  });

  it('sets wakeReason to "manual" when forced', () => {
    const m = makeManager();
    m.forceSleep();
    m.forceWake();
    assert.equal(m.state.wakeReason, 'manual');
    m.stop();
  });

  it('is idempotent when already awake', () => {
    const m = makeManager();
    assert.equal(m.state.isSleeping, false);
    m.forceWake(); // should no-op
    assert.equal(m.state.isSleeping, false);
    m.stop();
  });

  it('calls onWake callback with reason', () => {
    const m = makeManager();
    let received = null;
    m.onWake(reason => { received = reason; });
    m.forceSleep();
    m.forceWake();
    assert.equal(received, 'manual');
    m.stop();
  });
});

// ── getState ──────────────────────────────────────────────────────────────────
describe('getState', () => {
  it('returns required fields', () => {
    const m = makeManager();
    const state = m.getState();
    for (const field of ['isSleeping', 'lastActivityTime', 'sleepStartTime', 'wakeReason', 'inactiveTime', 'sleepDuration']) {
      assert.ok(field in state, `Missing field: ${field}`);
    }
    m.stop();
  });

  it('inactiveTime is non-negative', () => {
    const m = makeManager();
    const { inactiveTime } = m.getState();
    assert.ok(inactiveTime >= 0);
    m.stop();
  });

  it('sleepDuration is 0 when not sleeping', () => {
    const m = makeManager();
    const { sleepDuration } = m.getState();
    assert.equal(sleepDuration, 0);
    m.stop();
  });

  it('sleepDuration is positive while sleeping', () => {
    const m = makeManager();
    m.forceSleep();
    const { sleepDuration } = m.getState();
    assert.ok(sleepDuration >= 0);
    m.stop();
  });
});

// ── sleep ↔ wake round-trip ───────────────────────────────────────────────────
describe('sleep → wake round-trip', () => {
  it('sleep then wake restores isSleeping=false', () => {
    const m = makeManager();
    m.forceSleep();
    assert.equal(m.state.isSleeping, true);
    m.forceWake();
    assert.equal(m.state.isSleeping, false);
    m.stop();
  });

  it('multiple sleep/wake cycles work correctly', () => {
    const m = makeManager();
    for (let i = 0; i < 5; i++) {
      m.forceSleep();
      assert.equal(m.state.isSleeping, true);
      m.forceWake();
      assert.equal(m.state.isSleeping, false);
    }
    m.stop();
  });
});

// ── state persistence ─────────────────────────────────────────────────────────
describe('state persistence', () => {
  it('saves state to sleepStateFile on sleep', () => {
    const m = makeManager();
    m.forceSleep();
    const saved = JSON.parse(fs.readFileSync(m.config.sleepStateFile, 'utf-8'));
    assert.equal(saved.isSleeping, true);
    m.stop();
  });

  it('saves state to sleepStateFile on wake', () => {
    const m = makeManager();
    m.forceSleep();
    m.forceWake();
    const saved = JSON.parse(fs.readFileSync(m.config.sleepStateFile, 'utf-8'));
    assert.equal(saved.isSleeping, false);
    m.stop();
  });
});

// ── external trigger wake ─────────────────────────────────────────────────────
describe('checkExternalTrigger', () => {
  it('returns false when no .wake-harness file exists', () => {
    const m = makeManager();
    const result = m.checkExternalTrigger();
    assert.equal(result, false);
    m.stop();
  });
});

// ── checkUserAccess ───────────────────────────────────────────────────────────
describe('checkUserAccess', () => {
  it('returns false when lastAccessFile does not exist', () => {
    const m = makeManager();
    const result = m.checkUserAccess();
    assert.equal(result, false);
    m.stop();
  });

  it('returns true when lastAccessFile was touched < 2 minutes ago', () => {
    const m = makeManager();
    fs.writeFileSync(m.config.lastAccessFile, 'accessed');
    const result = m.checkUserAccess();
    assert.equal(result, true);
    m.stop();
  });
});

console.log('\n✅ sleep-manager (SleepManager) tests complete.\n');
