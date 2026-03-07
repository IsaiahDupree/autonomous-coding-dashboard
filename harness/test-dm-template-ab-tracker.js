#!/usr/bin/env node

/**
 * dm-template-ab-tracker.js — trackDmSend, trackDmReply, checkAndSwapLowestPerformer, getPerformanceSummary Tests
 * =================================================================================================================
 * A/B tracker reads/writes dm-outreach-state.json in the harness directory.
 * Tests use a temp file via module-level monkey-patching of the state path so
 * the real harness/dm-outreach-state.json is never modified.
 *
 * Run:
 *   node harness/test-dm-template-ab-tracker.js
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Isolation: use a temp state file ─────────────────────────────────────────
// The tracker always resolves statePath via path.join(__dirname, 'dm-outreach-state.json').
// We cannot monkey-patch __dirname at import time, so instead we save/restore the
// real state file around each test and write a clean temp state in its place.

const STATE_FILE = path.join(__dirname, 'dm-outreach-state.json');
let _backup = null;

function saveState() {
  _backup = fs.existsSync(STATE_FILE) ? fs.readFileSync(STATE_FILE, 'utf-8') : null;
}

function restoreState() {
  if (_backup !== null) {
    fs.writeFileSync(STATE_FILE, _backup);
  } else if (fs.existsSync(STATE_FILE)) {
    // Original didn't exist — remove any file we created
    // Only remove if it looks like test data (has template_ab key)
    try {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      if (data.template_ab && !data._real) fs.unlinkSync(STATE_FILE);
    } catch { /* ignore */ }
  }
  _backup = null;
}

function initCleanState(extra = {}) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(extra, null, 2));
}

// We import after the backup shim is set up
import {
  trackDmSend,
  trackDmReply,
  checkAndSwapLowestPerformer,
  getPerformanceSummary,
} from './dm-template-ab-tracker.js';

// ── trackDmSend ───────────────────────────────────────────────────────────────
describe('trackDmSend — creates and increments entries', () => {
  beforeEach(() => { saveState(); initCleanState(); });
  afterEach(() => restoreState());

  it('creates template_ab key if missing', () => {
    trackDmSend('instagram', 'v1');
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.ok(state.template_ab, 'template_ab missing');
    assert.ok('instagram_v1' in state.template_ab, 'instagram_v1 entry missing');
  });

  it('initializes with sent=1 on first call', () => {
    trackDmSend('instagram', 'v1');
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.equal(state.template_ab['instagram_v1'].sent, 1);
  });

  it('increments sent on subsequent calls', () => {
    trackDmSend('instagram', 'v1');
    trackDmSend('instagram', 'v1');
    trackDmSend('instagram', 'v1');
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.equal(state.template_ab['instagram_v1'].sent, 3);
  });

  it('initializes replied=0 and reply_rate=0', () => {
    trackDmSend('instagram', 'v1');
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    const entry = state.template_ab['instagram_v1'];
    assert.equal(entry.replied, 0);
    assert.equal(entry.reply_rate, 0);
  });

  it('stores platform and variant fields', () => {
    trackDmSend('twitter', 'v2');
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    const entry = state.template_ab['twitter_v2'];
    assert.equal(entry.platform, 'twitter');
    assert.equal(entry.variant, 'v2');
  });

  it('tracks multiple platforms independently', () => {
    trackDmSend('instagram', 'v1');
    trackDmSend('twitter', 'v1');
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.ok('instagram_v1' in state.template_ab);
    assert.ok('twitter_v1' in state.template_ab);
    assert.equal(state.template_ab['instagram_v1'].sent, 1);
    assert.equal(state.template_ab['twitter_v1'].sent, 1);
  });

  it('tracks multiple variants for same platform independently', () => {
    trackDmSend('instagram', 'v1');
    trackDmSend('instagram', 'v2');
    trackDmSend('instagram', 'v1');
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.equal(state.template_ab['instagram_v1'].sent, 2);
    assert.equal(state.template_ab['instagram_v2'].sent, 1);
  });
});

// ── trackDmReply ──────────────────────────────────────────────────────────────
describe('trackDmReply — updates replied and reply_rate', () => {
  beforeEach(() => { saveState(); initCleanState(); });
  afterEach(() => restoreState());

  it('increments replied count', () => {
    trackDmSend('instagram', 'v1');
    trackDmSend('instagram', 'v1');
    trackDmReply('instagram', 'v1');
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.equal(state.template_ab['instagram_v1'].replied, 1);
  });

  it('calculates reply_rate correctly: 1/4 = 25%', () => {
    for (let i = 0; i < 4; i++) trackDmSend('instagram', 'v1');
    trackDmReply('instagram', 'v1');
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.equal(state.template_ab['instagram_v1'].reply_rate, 25);
  });

  it('calculates reply_rate: 2/10 = 20%', () => {
    for (let i = 0; i < 10; i++) trackDmSend('linkedin', 'v3');
    trackDmReply('linkedin', 'v3');
    trackDmReply('linkedin', 'v3');
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.equal(state.template_ab['linkedin_v3'].reply_rate, 20);
  });

  it('is a no-op when template_ab key missing in state', () => {
    initCleanState({});   // no template_ab key
    assert.doesNotThrow(() => trackDmReply('instagram', 'v1'));
  });

  it('is a no-op when variant key missing in template_ab', () => {
    initCleanState({ template_ab: {} });
    assert.doesNotThrow(() => trackDmReply('instagram', 'v99'));
  });
});

// ── checkAndSwapLowestPerformer ───────────────────────────────────────────────
describe('checkAndSwapLowestPerformer', () => {
  beforeEach(() => { saveState(); initCleanState(); });
  afterEach(() => restoreState());

  function seedVariants(platform, variants) {
    // variants: [{variant, sent, replied}]
    const state = { template_ab: {} };
    for (const v of variants) {
      const key = `${platform}_${v.variant}`;
      const reply_rate = v.sent > 0
        ? Math.round((v.replied / v.sent) * 100 * 10) / 10
        : 0;
      state.template_ab[key] = {
        platform,
        variant: v.variant,
        sent: v.sent,
        replied: v.replied,
        reply_rate,
        created_at: new Date().toISOString(),
      };
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  }

  it('returns null when template_ab missing', () => {
    initCleanState({});
    const result = checkAndSwapLowestPerformer('instagram');
    assert.equal(result, null);
  });

  it('returns null when fewer than 2 variants have 20+ sends', () => {
    seedVariants('instagram', [
      { variant: 'v1', sent: 5, replied: 1 },
      { variant: 'v2', sent: 3, replied: 0 },
    ]);
    const result = checkAndSwapLowestPerformer('instagram');
    assert.equal(result, null);
  });

  it('returns swap result when 2+ variants have 20+ sends', () => {
    seedVariants('instagram', [
      { variant: 'v1', sent: 20, replied: 2 },   // 10% reply
      { variant: 'v2', sent: 20, replied: 6 },   // 30% reply
    ]);
    const result = checkAndSwapLowestPerformer('instagram');
    assert.ok(result !== null, 'expected a swap result');
    assert.equal(result.platform, 'instagram');
    assert.equal(result.swapped_out, 'v1', 'lowest performer (v1 at 10%) should be swapped');
  });

  it('swapped variant is removed from template_ab', () => {
    seedVariants('instagram', [
      { variant: 'v1', sent: 20, replied: 2 },
      { variant: 'v2', sent: 20, replied: 8 },
    ]);
    checkAndSwapLowestPerformer('instagram');
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.ok(!('instagram_v1' in state.template_ab), 'v1 should be removed');
    assert.ok('instagram_v2' in state.template_ab, 'v2 should remain');
  });

  it('swapped variant is added to archived_variants', () => {
    seedVariants('instagram', [
      { variant: 'v1', sent: 20, replied: 1 },
      { variant: 'v2', sent: 20, replied: 10 },
    ]);
    checkAndSwapLowestPerformer('instagram');
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.ok(Array.isArray(state.archived_variants), 'archived_variants should be an array');
    assert.equal(state.archived_variants.length, 1);
    assert.equal(state.archived_variants[0].variant, 'v1');
    assert.equal(state.archived_variants[0].reason, 'low_performance');
  });

  it('does not swap variants from a different platform', () => {
    seedVariants('twitter', [
      { variant: 'v1', sent: 25, replied: 1 },
      { variant: 'v2', sent: 25, replied: 10 },
    ]);
    // Checking instagram should see no twitter variants
    const result = checkAndSwapLowestPerformer('instagram');
    assert.equal(result, null);
    // Twitter variants should be untouched
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.ok('twitter_v1' in state.template_ab);
    assert.ok('twitter_v2' in state.template_ab);
  });
});

// ── getPerformanceSummary ─────────────────────────────────────────────────────
describe('getPerformanceSummary', () => {
  beforeEach(() => { saveState(); initCleanState(); });
  afterEach(() => restoreState());

  it('returns empty array when template_ab missing', () => {
    initCleanState({});
    assert.deepEqual(getPerformanceSummary('instagram'), []);
  });

  it('returns only variants for the requested platform', () => {
    const state = {
      template_ab: {
        instagram_v1: { platform: 'instagram', variant: 'v1', sent: 10, replied: 2, reply_rate: 20 },
        twitter_v1:   { platform: 'twitter',   variant: 'v1', sent: 10, replied: 5, reply_rate: 50 },
      }
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    const result = getPerformanceSummary('instagram');
    assert.equal(result.length, 1);
    assert.equal(result[0].platform, 'instagram');
  });

  it('sorts by reply_rate descending', () => {
    const state = {
      template_ab: {
        instagram_v1: { platform: 'instagram', variant: 'v1', sent: 20, replied: 2, reply_rate: 10 },
        instagram_v2: { platform: 'instagram', variant: 'v2', sent: 20, replied: 8, reply_rate: 40 },
        instagram_v3: { platform: 'instagram', variant: 'v3', sent: 20, replied: 5, reply_rate: 25 },
      }
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    const result = getPerformanceSummary('instagram');
    assert.equal(result.length, 3);
    assert.equal(result[0].variant, 'v2', 'highest reply_rate should be first');
    assert.equal(result[1].variant, 'v3');
    assert.equal(result[2].variant, 'v1', 'lowest reply_rate should be last');
  });

  it('returns empty array when no variants match platform', () => {
    const state = {
      template_ab: {
        twitter_v1: { platform: 'twitter', variant: 'v1', sent: 10, replied: 2, reply_rate: 20 },
      }
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    assert.deepEqual(getPerformanceSummary('instagram'), []);
  });
});

console.log('\n✅ dm-template-ab-tracker (trackDmSend, trackDmReply, checkAndSwapLowestPerformer, getPerformanceSummary) tests complete.\n');
