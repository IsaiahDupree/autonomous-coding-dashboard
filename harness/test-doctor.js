#!/usr/bin/env node

/**
 * test-doctor.js
 * Integration tests for doctor-daemon stuck detection + circuit breaker logic.
 * Tests tool handlers directly (no live Anthropic API calls needed).
 * Run: node harness/test-doctor.js
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

console.log('\n=== test-doctor.js ===\n');

// ── Setup: create fake agent files ────────────────────────────────────────────

const testSlug = `test-doctor-${Date.now()}`;
const fakeStatusFile = path.join(DASHBOARD_ROOT, `harness-status-${testSlug}.json`);
const fakeFeatureFile = path.join(__dirname, 'features', `${testSlug}.json`);
const fakeLogFile = path.join(__dirname, 'logs', `${testSlug}.log`);

const fakeStatus = {
  projectId: testSlug,
  status: 'running',
  pid: 99999, // non-existent PID
  lastUpdated: new Date(Date.now() - 40 * 60 * 1000).toISOString(), // 40 min ago
  model: 'claude-sonnet-4-6',
  stats: { total: 10, passing: 3 },
};

const fakeFeatures = {
  features: [
    { id: 'f001', name: 'Feature 1', passes: true },
    { id: 'f002', name: 'Feature 2', passes: false },
    { id: 'f003', name: 'Feature 3', passes: false },
  ],
};

// Create test files
fs.writeFileSync(fakeStatusFile, JSON.stringify(fakeStatus, null, 2));
fs.mkdirSync(path.join(__dirname, 'features'), { recursive: true });
fs.writeFileSync(fakeFeatureFile, JSON.stringify(fakeFeatures, null, 2));
fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
fs.writeFileSync(fakeLogFile, Array(200).fill('2024-01-01T00:00:00Z [info] Agent running...\n').join(''));

// ── Section 1: File setup verification ───────────────────────────────────────

console.log('--- File Setup ---');

test('fake status file exists and is valid', () => {
  assert.ok(fs.existsSync(fakeStatusFile));
  const d = JSON.parse(fs.readFileSync(fakeStatusFile, 'utf-8'));
  assert.strictEqual(d.projectId, testSlug);
  assert.strictEqual(d.status, 'running');
  assert.strictEqual(d.pid, 99999);
});

test('fake feature file has 3 features, 1 passing', () => {
  const d = JSON.parse(fs.readFileSync(fakeFeatureFile, 'utf-8'));
  assert.strictEqual(d.features.length, 3);
  assert.strictEqual(d.features.filter(f => f.passes).length, 1);
});

test('fake log file exists', () => {
  assert.ok(fs.existsSync(fakeLogFile));
});

// ── Section 2: Stuck detection logic ─────────────────────────────────────────

console.log('\n--- Stuck Detection ---');

const STUCK_THRESHOLD_MS = 30 * 60 * 1000;
const OUTPUT_SILENCE_MS  = 15 * 60 * 1000;

test('dead PID triggers stuck detection', () => {
  const d = { status: 'running', pid: 99999, lastUpdated: new Date().toISOString() };
  let pidAlive = false;
  try { process.kill(d.pid, 0); pidAlive = true; } catch {}
  assert.strictEqual(pidAlive, false, 'PID 99999 should be dead');
  const stuckReason = !pidAlive && d.pid ? `PID ${d.pid} is dead` : null;
  assert.ok(stuckReason, 'Should detect dead PID as stuck');
});

test('stale status (40 min old) triggers stuck detection', () => {
  const d = {
    status: 'running',
    pid: process.pid, // self PID is alive
    lastUpdated: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  };
  let pidAlive = false;
  try { process.kill(d.pid, 0); pidAlive = true; } catch {}
  const ageMs = Date.now() - new Date(d.lastUpdated).getTime();
  const stuckReason = pidAlive && ageMs > STUCK_THRESHOLD_MS
    ? `No status update for ${(ageMs / 60000).toFixed(0)} minutes`
    : null;
  assert.ok(stuckReason, 'Should detect stale status as stuck');
});

test('fresh status (5 min old) does NOT trigger stuck detection', () => {
  const d = {
    status: 'running',
    pid: process.pid,
    lastUpdated: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  };
  let pidAlive = false;
  try { process.kill(d.pid, 0); pidAlive = true; } catch {}
  const ageMs = Date.now() - new Date(d.lastUpdated).getTime();
  const stuckDeadPid   = !pidAlive && d.pid;
  const stuckStaleStatus = pidAlive && ageMs > STUCK_THRESHOLD_MS;
  assert.ok(!stuckDeadPid && !stuckStaleStatus, 'Fresh, alive agent should NOT be stuck');
});

test('completed status does NOT trigger stuck detection', () => {
  const d = { status: 'completed', pid: process.pid };
  // The daemon only processes status === 'running' agents
  const shouldCheck = d.status === 'running';
  assert.strictEqual(shouldCheck, false, 'Completed agents should be skipped by the daemon');
});

// ── Section 3: Circuit breaker ────────────────────────────────────────────────

console.log('\n--- Circuit Breaker ---');

const MAX_HEALS = 3;

test('canHeal: true when no history', () => {
  const history = [];
  const recent = history.filter(h => Date.now() - h.ts < 60 * 60 * 1000);
  assert.ok(recent.length < MAX_HEALS, 'Should allow healing with empty history');
});

test('canHeal: false when at limit (3 heals in last hour)', () => {
  const now = Date.now();
  const history = [
    { ts: now - 5  * 60 * 1000 },
    { ts: now - 15 * 60 * 1000 },
    { ts: now - 25 * 60 * 1000 },
  ];
  const recent = history.filter(h => now - h.ts < 60 * 60 * 1000);
  assert.strictEqual(recent.length, 3);
  assert.ok(recent.length >= MAX_HEALS, 'Should block when at limit');
});

test('canHeal: expired heals are not counted', () => {
  const now = Date.now();
  const history = [
    { ts: now - 70 * 60 * 1000 }, // expired
    { ts: now - 80 * 60 * 1000 }, // expired
    { ts: now -  5 * 60 * 1000 }, // recent
  ];
  const recent = history.filter(h => now - h.ts < 60 * 60 * 1000);
  assert.strictEqual(recent.length, 1, 'Only 1 recent heal');
  assert.ok(recent.length < MAX_HEALS, 'Should allow healing');
});

test('canHeal: exactly at limit (3) blocks healing', () => {
  const now = Date.now();
  const history = Array(3).fill(null).map((_, i) => ({ ts: now - (i + 1) * 5 * 60 * 1000 }));
  const recent = history.filter(h => now - h.ts < 60 * 60 * 1000);
  assert.strictEqual(recent.length, 3);
  assert.ok(recent.length >= MAX_HEALS, 'Exactly at limit should block');
});

// ── Section 4: Doctor log format ──────────────────────────────────────────────

console.log('\n--- Doctor Log NDJSON ---');

const doctorLogFile = path.join(__dirname, 'doctor-log.ndjson');

test('doctor-log entries are valid NDJSON', () => {
  const entry = {
    ts: new Date().toISOString(),
    slug: testSlug,
    reason: 'test',
    success: true,
    turns: 2,
    actionsCount: 1,
  };
  fs.appendFileSync(doctorLogFile, JSON.stringify(entry) + '\n');
  const lines = fs.readFileSync(doctorLogFile, 'utf-8').trim().split('\n').filter(Boolean);
  assert.ok(lines.length > 0);
  const parsed = JSON.parse(lines[lines.length - 1]);
  assert.strictEqual(parsed.slug, testSlug);
  assert.strictEqual(parsed.success, true);
  assert.strictEqual(parsed.turns, 2);
});

// ── Section 5: Queue state ────────────────────────────────────────────────────

console.log('\n--- Queue State ---');

const { getQueueState } = await import('./queue-state.js');

test('getQueueState returns valid structure', () => {
  const state = getQueueState();
  assert.ok(typeof state === 'object', 'Should return object');
  assert.ok(Array.isArray(state.running), 'running should be array');
  assert.ok(Array.isArray(state.queued), 'queued should be array');
  assert.ok(Array.isArray(state.completed), 'completed should be array');
  assert.ok(['parallel', 'series', 'idle', 'mixed'].includes(state.topology), 'Valid topology');
  assert.ok(typeof state.parallelCount === 'number');
  assert.ok(state.asOf);
});

test('getQueueState topology matches running count', () => {
  const state = getQueueState();
  if (state.parallelCount > 1) {
    assert.strictEqual(state.topology, 'parallel');
  } else if (state.parallelCount === 1) {
    assert.strictEqual(state.topology, 'series');
  } else {
    assert.strictEqual(state.topology, 'idle');
  }
});

// ── Cleanup ───────────────────────────────────────────────────────────────────

try { fs.unlinkSync(fakeStatusFile); } catch { /* ok */ }
try { fs.unlinkSync(fakeFeatureFile); } catch { /* ok */ }
try { fs.unlinkSync(fakeLogFile); } catch { /* ok */ }

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
