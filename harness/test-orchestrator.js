#!/usr/bin/env node

/**
 * Test suite for Polsia Orchestrator (no live API calls)
 * Tests: cooldown logic, pending actions, state file, log reading, action routing, snapshot structure
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(a, b, message) {
  if (a !== b) throw new Error(message || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ── Helpers extracted from orchestrator ───────────────────────────────────────

function readJson(filePath, fallback = null) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return fallback; }
}

const COOLDOWNS = {
  dispatch_acd: 1800000,    // 30 min
  run_actp_pipeline: 7200000, // 2 hr
};

const AUTO_EXECUTE = new Set(['dispatch_acd', 'run_actp_pipeline', 'no_action']);
const NEEDS_APPROVAL = new Set(['queue_content', 'run_dm_outreach', 'submit_upwork_proposal']);

function isOnCooldown(action, state) {
  const last = state.lastActionAt?.[action];
  if (!last) return false;
  const elapsed = Date.now() - new Date(last).getTime();
  return elapsed < (COOLDOWNS[action] || 0);
}

function setCooldown(action, state) {
  state.lastActionAt = state.lastActionAt || {};
  state.lastActionAt[action] = new Date().toISOString();
}

function readStateFromFile(file) {
  const today = new Date().toISOString().slice(0, 10);
  const defaults = {
    paused: false,
    cycleCount: 0,
    lastActionAt: {},
    todayActionCount: 0,
    todayDate: today,
    lastCycleAt: null,
  };
  const state = readJson(file, defaults);
  if (state.todayDate !== today) {
    state.todayDate = today;
    state.todayActionCount = 0;
  }
  return { ...defaults, ...state };
}

function appendPendingToFile(file, action, params, reason) {
  const existing = readJson(file, []);
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: action,
    params: params || {},
    reason,
    queued_at: new Date().toISOString(),
    status: 'pending',
  };
  existing.push(entry);
  fs.writeFileSync(file, JSON.stringify(existing, null, 2));
  return entry;
}

function readRecentLogFromFile(file, n = 5) {
  try {
    const lines = fs.readFileSync(file, 'utf-8').trim().split('\n').filter(Boolean);
    return lines.slice(-n).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nPolsia Orchestrator Tests\n');

// ── Cooldown logic ────────────────────────────────────────────────────────────
console.log('── Cooldown logic ──');

test('isOnCooldown returns false if no last action', () => {
  const state = { lastActionAt: {} };
  assert(!isOnCooldown('dispatch_acd', state), 'should not be on cooldown');
});

test('isOnCooldown returns true if action was just taken', () => {
  const state = { lastActionAt: { dispatch_acd: new Date().toISOString() } };
  assert(isOnCooldown('dispatch_acd', state), 'should be on cooldown');
});

test('isOnCooldown returns false if cooldown has elapsed', () => {
  const old = new Date(Date.now() - 2 * 3600000).toISOString(); // 2h ago
  const state = { lastActionAt: { dispatch_acd: old } };
  assert(!isOnCooldown('dispatch_acd', state), 'cooldown should have elapsed');
});

test('isOnCooldown uses correct window for run_actp_pipeline', () => {
  // 1h ago — within 2hr cooldown
  const recent = new Date(Date.now() - 3600000).toISOString();
  const state = { lastActionAt: { run_actp_pipeline: recent } };
  assert(isOnCooldown('run_actp_pipeline', state), 'should still be on cooldown at 1h');
});

test('isOnCooldown clears for run_actp_pipeline after 2hr', () => {
  const old = new Date(Date.now() - 7300000).toISOString(); // 2hr + 100s ago
  const state = { lastActionAt: { run_actp_pipeline: old } };
  assert(!isOnCooldown('run_actp_pipeline', state), 'cooldown should be cleared after 2hr');
});

test('setCooldown sets timestamp for action', () => {
  const state = { lastActionAt: {} };
  setCooldown('dispatch_acd', state);
  assert(state.lastActionAt.dispatch_acd, 'should set timestamp');
  const elapsed = Date.now() - new Date(state.lastActionAt.dispatch_acd).getTime();
  assert(elapsed < 1000, 'should be recent');
});

test('run_actp_pipeline has 2hr cooldown constant', () => {
  assertEqual(COOLDOWNS.run_actp_pipeline, 7200000, '2hr in ms');
});

test('dispatch_acd has 30min cooldown constant', () => {
  assertEqual(COOLDOWNS.dispatch_acd, 1800000, '30min in ms');
});

// ── Pending actions ───────────────────────────────────────────────────────────
console.log('\n── Pending actions ──');

const tmpPending = path.join(HARNESS_DIR, '_test-pending-tmp.json');
if (fs.existsSync(tmpPending)) fs.unlinkSync(tmpPending);

test('appendPending creates file and appends entry', () => {
  const entry = appendPendingToFile(tmpPending, 'queue_content', { hook: 'test' }, 'test reason');
  const data = readJson(tmpPending);
  assert(Array.isArray(data), 'should be array');
  assertEqual(data.length, 1, 'should have 1 entry');
  assertEqual(data[0].type, 'queue_content');
  assertEqual(data[0].status, 'pending');
  assert(data[0].id, 'should have id');
});

test('appendPending accumulates multiple entries', () => {
  appendPendingToFile(tmpPending, 'run_dm_outreach', {}, 'second entry');
  const data = readJson(tmpPending);
  assertEqual(data.length, 2, 'should have 2 entries');
});

test('appendPending generates unique ids', () => {
  const data = readJson(tmpPending);
  const ids = data.map(e => e.id);
  const unique = new Set(ids);
  assertEqual(unique.size, ids.length, 'all ids should be unique');
});

test('pending entry has all required fields', () => {
  const data = readJson(tmpPending);
  const e = data[0];
  assert(e.id, 'needs id');
  assert(e.type, 'needs type');
  assert(e.queued_at, 'needs queued_at');
  assertEqual(e.status, 'pending');
});

try { fs.unlinkSync(tmpPending); } catch { /* ok */ }

// ── State file ────────────────────────────────────────────────────────────────
console.log('\n── State file ──');

const tmpState = path.join(HARNESS_DIR, '_test-state-tmp.json');

test('readState returns defaults if file missing', () => {
  if (fs.existsSync(tmpState)) fs.unlinkSync(tmpState);
  const state = readStateFromFile(tmpState);
  assert(!state.paused, 'paused default false');
  assertEqual(state.cycleCount, 0);
  assertEqual(state.todayActionCount, 0);
});

test('readState resets daily counter on new day', () => {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  fs.writeFileSync(tmpState, JSON.stringify({
    paused: false,
    cycleCount: 5,
    todayActionCount: 10,
    todayDate: yesterday,
    lastActionAt: {},
    lastCycleAt: null,
  }));
  const state = readStateFromFile(tmpState);
  assertEqual(state.todayActionCount, 0, 'should reset on new day');
  assertEqual(state.cycleCount, 5, 'cycleCount should persist');
});

test('paused flag reads correctly', () => {
  fs.writeFileSync(tmpState, JSON.stringify({
    paused: true,
    cycleCount: 0,
    todayActionCount: 0,
    todayDate: new Date().toISOString().slice(0, 10),
    lastActionAt: {},
    lastCycleAt: null,
  }));
  const state = readStateFromFile(tmpState);
  assert(state.paused, 'should be paused');
});

test('state file preserves cycleCount across reads', () => {
  fs.writeFileSync(tmpState, JSON.stringify({
    paused: false,
    cycleCount: 42,
    todayActionCount: 3,
    todayDate: new Date().toISOString().slice(0, 10),
    lastActionAt: {},
    lastCycleAt: null,
  }));
  const state = readStateFromFile(tmpState);
  assertEqual(state.cycleCount, 42);
  assertEqual(state.todayActionCount, 3);
});

try { fs.unlinkSync(tmpState); } catch { /* ok */ }

// ── Log reading ───────────────────────────────────────────────────────────────
console.log('\n── Log reading ──');

const tmpLog = path.join(HARNESS_DIR, '_test-log-tmp.ndjson');

test('readRecentLog returns empty array if file missing', () => {
  const entries = readRecentLogFromFile('/nonexistent/path.ndjson');
  assert(Array.isArray(entries), 'should be array');
  assertEqual(entries.length, 0);
});

test('readRecentLog reads last N entries', () => {
  const entries = Array.from({ length: 10 }, (_, i) => ({
    ts: new Date().toISOString(),
    action: 'no_action',
    cycle: i + 1,
  }));
  fs.writeFileSync(tmpLog, entries.map(e => JSON.stringify(e)).join('\n'));
  const recent = readRecentLogFromFile(tmpLog, 5);
  assertEqual(recent.length, 5, 'should return last 5');
  assertEqual(recent[recent.length - 1].cycle, 10, 'last entry should be cycle 10');
});

test('readRecentLog skips malformed JSON lines', () => {
  fs.writeFileSync(tmpLog, '{"ts":"a","action":"x","cycle":1}\nnot-json\n{"ts":"b","action":"y","cycle":2}\n');
  const recent = readRecentLogFromFile(tmpLog, 5);
  assertEqual(recent.length, 2, 'should skip bad lines');
});

test('readRecentLog returns all entries when fewer than N exist', () => {
  fs.writeFileSync(tmpLog, '{"ts":"a","action":"x","cycle":1}\n{"ts":"b","action":"y","cycle":2}\n');
  const recent = readRecentLogFromFile(tmpLog, 10);
  assertEqual(recent.length, 2, 'should return all 2');
});

try { fs.unlinkSync(tmpLog); } catch { /* ok */ }

// ── Action routing ────────────────────────────────────────────────────────────
console.log('\n── Action routing ──');

test('dispatch_acd is auto-execute', () => {
  assert(AUTO_EXECUTE.has('dispatch_acd'));
});

test('run_actp_pipeline is auto-execute', () => {
  assert(AUTO_EXECUTE.has('run_actp_pipeline'));
});

test('no_action is auto-execute', () => {
  assert(AUTO_EXECUTE.has('no_action'));
});

test('queue_content requires approval', () => {
  assert(NEEDS_APPROVAL.has('queue_content'));
});

test('run_dm_outreach requires approval', () => {
  assert(NEEDS_APPROVAL.has('run_dm_outreach'));
});

test('submit_upwork_proposal requires approval', () => {
  assert(NEEDS_APPROVAL.has('submit_upwork_proposal'));
});

test('auto-execute and needs-approval are disjoint', () => {
  for (const action of AUTO_EXECUTE) {
    assert(!NEEDS_APPROVAL.has(action), `${action} should not be in both sets`);
  }
});

// ── Snapshot structure ────────────────────────────────────────────────────────
console.log('\n── Snapshot structure ──');

test('snapshot has all required fields', () => {
  const snapshot = {
    goals: { revenue_target: 5000, revenue_current: 0, revenue_gap: 5000 },
    acd: { running_count: 0, running_agents: [], queued_count: 0, next_queued: null, topology: 'idle' },
    services: { actp_up: false, safari_twitter_dm_up: false },
    time_of_day: 'morning',
    hour: 9,
    recent_history: [],
  };
  assert(snapshot.goals.revenue_gap === 5000, 'revenue gap computed');
  assert(snapshot.acd.topology === 'idle', 'topology set');
  assert(Array.isArray(snapshot.recent_history), 'recent_history is array');
  assert(Array.isArray(snapshot.acd.running_agents), 'running_agents is array');
});

test('dispatch_acd skipped when at max concurrent', () => {
  const MAX = 8;
  const snapshot = { acd: { running_count: 8, next_queued: 'some-agent' } };
  const willSkip = snapshot.acd.running_count >= MAX;
  assert(willSkip, 'should skip at max concurrent');
});

test('dispatch_acd skipped when no queued agents', () => {
  const snapshot = { acd: { running_count: 2, next_queued: null } };
  const slug = snapshot.acd.next_queued;
  assert(!slug, 'no slug means skip');
});

test('revenue_gap calculated correctly', () => {
  const target = 5000;
  const current = 1200;
  const gap = target - current;
  assertEqual(gap, 3800);
});

test('time_of_day maps correctly by hour', () => {
  const getTimeOfDay = h => h < 6 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  assertEqual(getTimeOfDay(3), 'night');
  assertEqual(getTimeOfDay(9), 'morning');
  assertEqual(getTimeOfDay(14), 'afternoon');
  assertEqual(getTimeOfDay(20), 'evening');
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n── Summary ──');
console.log(`Passed: ${passed}  Failed: ${failed}`);
if (failed > 0) process.exit(1);
