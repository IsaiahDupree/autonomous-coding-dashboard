#!/usr/bin/env node

/**
 * agent-telemetry.js — emit, getEvents, getAllSlugs, clearEvents, createTelemetry Tests
 * =======================================================================================
 * In-memory ring buffer (200 events/slug) + NDJSON flush to disk.
 * Broken telemetry = blind observability = no stuck-agent detection.
 *
 * Run:
 *   node harness/test-agent-telemetry.js
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { emit, getEvents, getAllSlugs, clearEvents, createTelemetry } from './agent-telemetry.js';

// Clean state before each test group
function cleanSlug(slug) {
  clearEvents(slug);
}

// ── emit — return shape ───────────────────────────────────────────────────────
describe('emit — return shape', () => {
  beforeEach(() => cleanSlug('test-emit'));

  it('returns an object with ts, slug, event', () => {
    const e = emit('test-emit', 'session_start');
    assert.ok('ts' in e, 'missing ts');
    assert.ok('slug' in e, 'missing slug');
    assert.ok('event' in e, 'missing event');
  });

  it('ts is a valid ISO string', () => {
    const e = emit('test-emit', 'session_start');
    assert.ok(!isNaN(Date.parse(e.ts)), `invalid ISO ts: ${e.ts}`);
  });

  it('slug matches argument', () => {
    const e = emit('test-emit', 'session_start');
    assert.equal(e.slug, 'test-emit');
  });

  it('event matches argument', () => {
    const e = emit('test-emit', 'feature_passed');
    assert.equal(e.event, 'feature_passed');
  });

  it('extra data fields are spread into the entry', () => {
    const e = emit('test-emit', 'tool_call', { tool: 'Read', duration_ms: 42 });
    assert.equal(e.tool, 'Read');
    assert.equal(e.duration_ms, 42);
  });

  it('data defaults to {} when omitted', () => {
    assert.doesNotThrow(() => emit('test-emit', 'session_end'));
  });
});

// ── emit — ring buffer ────────────────────────────────────────────────────────
describe('emit — ring buffer', () => {
  beforeEach(() => cleanSlug('test-ring'));

  it('events accumulate in order', () => {
    emit('test-ring', 'ev1');
    emit('test-ring', 'ev2');
    emit('test-ring', 'ev3');
    const events = getEvents('test-ring');
    assert.equal(events.length, 3);
    assert.equal(events[0].event, 'ev1');
    assert.equal(events[2].event, 'ev3');
  });

  it('ring caps at 200 — oldest entry is dropped', () => {
    for (let i = 0; i < 210; i++) {
      emit('test-ring', `ev-${i}`);
    }
    const events = getEvents('test-ring');
    assert.equal(events.length, 200);
    assert.equal(events[0].event, 'ev-10', 'first 10 should have been shifted out');
    assert.equal(events[199].event, 'ev-209');
  });

  it('getEvents limit trims from the tail', () => {
    for (let i = 0; i < 10; i++) emit('test-ring', `ev-${i}`);
    const events = getEvents('test-ring', 3);
    assert.equal(events.length, 3);
    assert.equal(events[0].event, 'ev-7');
    assert.equal(events[2].event, 'ev-9');
  });

  it('getEvents returns [] for unknown slug', () => {
    const events = getEvents('no-such-slug-xyz');
    assert.deepEqual(events, []);
  });
});

// ── getAllSlugs ───────────────────────────────────────────────────────────────
describe('getAllSlugs', () => {
  it('returns all slugs that have received events', () => {
    cleanSlug('slug-a'); cleanSlug('slug-b');
    emit('slug-a', 'ev');
    emit('slug-b', 'ev');
    const slugs = getAllSlugs();
    assert.ok(slugs.includes('slug-a'), 'slug-a missing');
    assert.ok(slugs.includes('slug-b'), 'slug-b missing');
  });

  it('returns an array', () => {
    assert.ok(Array.isArray(getAllSlugs()));
  });
});

// ── clearEvents ───────────────────────────────────────────────────────────────
describe('clearEvents', () => {
  it('removes all events for a slug', () => {
    cleanSlug('test-clear');
    emit('test-clear', 'ev1');
    emit('test-clear', 'ev2');
    clearEvents('test-clear');
    assert.deepEqual(getEvents('test-clear'), []);
  });

  it('removes slug from getAllSlugs after clear', () => {
    cleanSlug('clear-slug-test');
    emit('clear-slug-test', 'ev');
    assert.ok(getAllSlugs().includes('clear-slug-test'));
    clearEvents('clear-slug-test');
    assert.ok(!getAllSlugs().includes('clear-slug-test'), 'slug should be gone after clear');
  });

  it('is a no-op for unknown slug (no crash)', () => {
    assert.doesNotThrow(() => clearEvents('never-existed-abc'));
  });
});

// ── createTelemetry (factory) ─────────────────────────────────────────────────
describe('createTelemetry factory', () => {
  beforeEach(() => cleanSlug('test-factory'));

  it('returns object with emit, getEvents, clear', () => {
    const t = createTelemetry('test-factory');
    assert.ok(typeof t.emit === 'function', 'missing emit');
    assert.ok(typeof t.getEvents === 'function', 'missing getEvents');
    assert.ok(typeof t.clear === 'function', 'missing clear');
  });

  it('bound emit stores under the factory slug', () => {
    const t = createTelemetry('test-factory');
    t.emit('session_start', { pid: 123 });
    const events = t.getEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].event, 'session_start');
    assert.equal(events[0].pid, 123);
    assert.equal(events[0].slug, 'test-factory');
  });

  it('bound getEvents respects limit', () => {
    const t = createTelemetry('test-factory');
    for (let i = 0; i < 5; i++) t.emit('ev', { i });
    const events = t.getEvents(2);
    assert.equal(events.length, 2);
  });

  it('bound clear removes all events', () => {
    const t = createTelemetry('test-factory');
    t.emit('ev');
    t.clear();
    assert.deepEqual(t.getEvents(), []);
  });

  it('two factory instances for different slugs are isolated', () => {
    cleanSlug('factory-x'); cleanSlug('factory-y');
    const x = createTelemetry('factory-x');
    const y = createTelemetry('factory-y');
    x.emit('only-in-x');
    assert.equal(y.getEvents().length, 0, 'factory-y should see no events from factory-x');
    x.clear(); y.clear();
  });
});

// ── multi-slug isolation ──────────────────────────────────────────────────────
describe('multi-slug isolation', () => {
  it('events for slug A do not appear in slug B', () => {
    cleanSlug('iso-a'); cleanSlug('iso-b');
    emit('iso-a', 'event-a', { unique: 'value-a' });
    emit('iso-b', 'event-b', { unique: 'value-b' });
    const evA = getEvents('iso-a');
    const evB = getEvents('iso-b');
    assert.equal(evA.length, 1);
    assert.equal(evB.length, 1);
    assert.equal(evA[0].unique, 'value-a');
    assert.equal(evB[0].unique, 'value-b');
    cleanSlug('iso-a'); cleanSlug('iso-b');
  });
});

console.log('\n✅ agent-telemetry (emit, getEvents, getAllSlugs, clearEvents, createTelemetry) tests complete.\n');
