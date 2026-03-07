#!/usr/bin/env node

/**
 * safari-tab-watchdog.js — Tests
 * ================================
 * Tests the pure logic functions: parseTabRef and getLayoutEntry.
 * Does NOT start Safari, daemons, or AppleScript.
 *
 * Run:
 *   node harness/test-safari-tab-watchdog.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { parseTabRef, getLayoutEntry } from './safari-tab-watchdog.js';

// ── parseTabRef ──────────────────────────────────────────────────────────────
describe('parseTabRef', () => {
  it('parses "w1t1" → { windowIndex: 1, tabIndex: 1 }', () => {
    const r = parseTabRef('w1t1');
    assert.deepEqual(r, { windowIndex: 1, tabIndex: 1 });
  });

  it('parses "w2t8" → { windowIndex: 2, tabIndex: 8 }', () => {
    const r = parseTabRef('w2t8');
    assert.deepEqual(r, { windowIndex: 2, tabIndex: 8 });
  });

  it('parses "w10t3" correctly (multi-digit window)', () => {
    const r = parseTabRef('w10t3');
    assert.deepEqual(r, { windowIndex: 10, tabIndex: 3 });
  });

  it('parses "w1t12" correctly (multi-digit tab)', () => {
    const r = parseTabRef('w1t12');
    assert.deepEqual(r, { windowIndex: 1, tabIndex: 12 });
  });

  it('returns null for null input', () => {
    assert.equal(parseTabRef(null), null);
  });

  it('returns null for undefined input', () => {
    assert.equal(parseTabRef(undefined), null);
  });

  it('returns null for empty string', () => {
    assert.equal(parseTabRef(''), null);
  });

  it('returns null for non-matching string', () => {
    assert.equal(parseTabRef('invalid'), null);
  });

  it('returns null for partial match "w1"', () => {
    assert.equal(parseTabRef('w1'), null);
  });

  it('returns null for partial match "t1"', () => {
    assert.equal(parseTabRef('t1'), null);
  });

  it('windowIndex and tabIndex are integers not strings', () => {
    const r = parseTabRef('w3t7');
    assert.equal(typeof r.windowIndex, 'number');
    assert.equal(typeof r.tabIndex, 'number');
  });

  it('parses ref embedded inside a longer string', () => {
    // The regex uses match(), not fullMatch — "prefix_w2t5_suffix" should still parse
    const r = parseTabRef('prefix_w2t5_suffix');
    assert.deepEqual(r, { windowIndex: 2, tabIndex: 5 });
  });
});

// ── getLayoutEntry ────────────────────────────────────────────────────────────
describe('getLayoutEntry', () => {
  const LAYOUT_FILE = path.join(__dirname, 'safari-tab-layout.json');
  let originalLayout = null;

  before(() => {
    // Back up existing layout
    try { originalLayout = fs.readFileSync(LAYOUT_FILE, 'utf-8'); } catch {}
  });

  after(() => {
    // Restore original layout
    if (originalLayout !== null) {
      fs.writeFileSync(LAYOUT_FILE, originalLayout);
    } else {
      try { fs.unlinkSync(LAYOUT_FILE); } catch {}
    }
  });

  function writeLayout(platforms) {
    fs.writeFileSync(LAYOUT_FILE, JSON.stringify({
      coordinatedAt: new Date().toISOString(),
      platforms,
    }));
  }

  it('returns null when layout file does not exist', () => {
    try { fs.unlinkSync(LAYOUT_FILE); } catch {}
    const result = getLayoutEntry(3100);
    assert.equal(result, null);
  });

  it('returns the correct entry when port matches', () => {
    writeLayout([
      { platform: 'Instagram DM', port: 3100, tab: 'w2t1', claimed: true },
      { platform: 'Twitter DM',   port: 3003, tab: 'w2t2', claimed: true },
    ]);
    const entry = getLayoutEntry(3100);
    assert.notEqual(entry, null);
    assert.equal(entry.port, 3100);
    assert.equal(entry.tab, 'w2t1');
    assert.equal(entry.claimed, true);
  });

  it('returns null when port does not match any entry', () => {
    writeLayout([
      { platform: 'Instagram DM', port: 3100, tab: 'w2t1', claimed: true },
    ]);
    const result = getLayoutEntry(9999);
    assert.equal(result, null);
  });

  it('returns the correct entry among multiple platforms', () => {
    writeLayout([
      { platform: 'Instagram DM', port: 3100, tab: 'w2t1', claimed: true },
      { platform: 'Twitter DM',   port: 3003, tab: 'w2t2', claimed: true },
      { platform: 'TikTok DM',    port: 3102, tab: 'w2t3', claimed: true },
      { platform: 'LinkedIn DM',  port: 3105, tab: 'w1t2', claimed: true },
      { platform: 'Threads',      port: 3004, tab: 'w2t8', claimed: true },
    ]);
    const li = getLayoutEntry(3105);
    assert.equal(li.tab, 'w1t2');
    assert.equal(li.platform, 'LinkedIn DM');
  });

  it('returns null when layout has no platforms array', () => {
    fs.writeFileSync(LAYOUT_FILE, JSON.stringify({ coordinatedAt: new Date().toISOString() }));
    const result = getLayoutEntry(3100);
    assert.equal(result, null);
  });

  it('returns null when layout file is corrupt JSON', () => {
    fs.writeFileSync(LAYOUT_FILE, 'not valid json{{{');
    const result = getLayoutEntry(3100);
    assert.equal(result, null);
  });

  it('returns entry with claimed=false when tab not claimed', () => {
    writeLayout([
      { platform: 'Instagram DM', port: 3100, tab: null, claimed: false, error: 'service DOWN' },
    ]);
    const entry = getLayoutEntry(3100);
    assert.notEqual(entry, null);
    assert.equal(entry.claimed, false);
  });
});

// ── Integration: parseTabRef + getLayoutEntry ────────────────────────────────
describe('parseTabRef + getLayoutEntry integration', () => {
  const LAYOUT_FILE = path.join(__dirname, 'safari-tab-layout.json');
  let originalLayout = null;

  before(() => {
    try { originalLayout = fs.readFileSync(LAYOUT_FILE, 'utf-8'); } catch {}
  });

  after(() => {
    if (originalLayout !== null) {
      fs.writeFileSync(LAYOUT_FILE, originalLayout);
    } else {
      try { fs.unlinkSync(LAYOUT_FILE); } catch {}
    }
  });

  it('full round-trip: layout entry tab ref can be parsed into window/tab indices', () => {
    fs.writeFileSync(LAYOUT_FILE, JSON.stringify({
      coordinatedAt: new Date().toISOString(),
      platforms: [
        { platform: 'LinkedIn DM', port: 3105, tab: 'w1t2', claimed: true },
      ],
    }));
    const entry = getLayoutEntry(3105);
    assert.notEqual(entry, null);
    assert.equal(entry.claimed, true);

    const ref = parseTabRef(entry.tab);
    assert.deepEqual(ref, { windowIndex: 1, tabIndex: 2 });
  });
});

console.log('\n✅ safari-tab-watchdog tests complete.\n');
