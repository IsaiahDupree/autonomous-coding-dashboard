#!/usr/bin/env node

/**
 * test-telemetry.js
 * Unit tests for agent-telemetry.js — no test framework required.
 * Run: node harness/test-telemetry.js
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { emit, getEvents, clearEvents, createTelemetry, TELEMETRY_DIR } =
  await import('./agent-telemetry.js');

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

const testSlug = `test-telemetry-${Date.now()}`;
const testFile = path.join(TELEMETRY_DIR, `${testSlug}.ndjson`);

console.log('\n=== test-telemetry.js ===\n');

// 1. emit returns event with ts, slug, event
test('emit returns structured entry', () => {
  const e = emit(testSlug, 'session_start', { sessionNum: 1 });
  assert.strictEqual(e.slug, testSlug);
  assert.strictEqual(e.event, 'session_start');
  assert.ok(e.ts, 'should have ts');
  assert.strictEqual(e.sessionNum, 1);
});

// 2. Ring buffer stores event
test('getEvents returns emitted event', () => {
  const events = getEvents(testSlug);
  assert.ok(events.length > 0);
  assert.strictEqual(events[events.length - 1].event, 'session_start');
});

// 3. NDJSON written to disk
test('NDJSON file created on disk', () => {
  assert.ok(fs.existsSync(testFile), `Expected ${testFile} to exist`);
  const lines = fs.readFileSync(testFile, 'utf-8').trim().split('\n');
  assert.ok(lines.length >= 1, 'Should have at least 1 line');
  const first = JSON.parse(lines[0]);
  assert.strictEqual(first.slug, testSlug);
  assert.strictEqual(first.event, 'session_start');
});

// 4. Ring buffer truncates at 200
test('ring buffer truncates at 200 events', () => {
  const slug2 = `test-ring-${Date.now()}`;
  for (let i = 0; i < 210; i++) {
    emit(slug2, 'tool_call', { i });
  }
  const events = getEvents(slug2);
  assert.strictEqual(events.length, 200, `Expected 200, got ${events.length}`);
  // First 10 events (i=0..9) were shifted off; first remaining should be i=10
  assert.strictEqual(events[0].i, 10, `Expected first event to have i=10`);
  clearEvents(slug2);
});

// 5. clearEvents removes from ring
test('clearEvents removes from ring buffer', () => {
  const slug3 = `test-clear-${Date.now()}`;
  emit(slug3, 'session_start', {});
  assert.strictEqual(getEvents(slug3).length, 1);
  clearEvents(slug3);
  assert.strictEqual(getEvents(slug3).length, 0);
});

// 6. createTelemetry factory
test('createTelemetry returns bound emitter', () => {
  const slug4 = `test-factory-${Date.now()}`;
  const t = createTelemetry(slug4);
  const e = t.emit('feature_passed', { featureId: 'f001' });
  assert.strictEqual(e.slug, slug4);
  assert.strictEqual(e.event, 'feature_passed');
  const events = t.getEvents();
  assert.strictEqual(events.length, 1);
  t.clear();
});

// 7. Multiple event types accumulate in order
test('multiple events accumulate in order', () => {
  const slug5 = `test-order-${Date.now()}`;
  emit(slug5, 'session_start', { session: 1 });
  emit(slug5, 'feature_passed', { featureId: 'f001' });
  emit(slug5, 'feature_passed', { featureId: 'f002' });
  emit(slug5, 'session_end', { duration_ms: 5000 });
  const events = getEvents(slug5);
  assert.strictEqual(events.length, 4);
  assert.strictEqual(events[0].event, 'session_start');
  assert.strictEqual(events[3].event, 'session_end');
  clearEvents(slug5);
});

// 8. getEvents respects limit
test('getEvents limit parameter', () => {
  const slug6 = `test-limit-${Date.now()}`;
  for (let i = 0; i < 10; i++) emit(slug6, 'progress_snap', { i });
  const events = getEvents(slug6, 3);
  assert.strictEqual(events.length, 3);
  assert.strictEqual(events[0].i, 7); // last 3 of 10
  clearEvents(slug6);
});

// Cleanup test file
try { fs.unlinkSync(testFile); } catch { /* ok */ }

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
