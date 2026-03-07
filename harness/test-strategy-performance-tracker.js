#!/usr/bin/env node

/**
 * strategy-performance-tracker.js — updateStrategyPerformance, getTopStrategies Tests
 * ======================================================================================
 * Controls which of 14 LinkedIn search strategies run next.
 * Bad qualified_rate calculation = worst strategy gets selected = wasted daily quota.
 * Requires 3+ attempts before a strategy enters the "top" list (prevents noisy rankings).
 *
 * Run:
 *   node harness/test-strategy-performance-tracker.js
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── State file isolation (same pattern as dm-template-ab-tracker tests) ───────
const STATE_FILE = path.join(__dirname, 'linkedin-daemon-state.json');
let _backup = null;

function saveState() {
  _backup = fs.existsSync(STATE_FILE) ? fs.readFileSync(STATE_FILE, 'utf-8') : null;
}

function restoreState() {
  if (_backup !== null) {
    fs.writeFileSync(STATE_FILE, _backup);
  } else if (fs.existsSync(STATE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      if (data.strategy_performance && !data._real) fs.unlinkSync(STATE_FILE);
    } catch { /* ignore */ }
  }
  _backup = null;
}

function initCleanState(extra = {}) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(extra, null, 2));
}

import {
  updateStrategyPerformance,
  getTopStrategies,
} from './strategy-performance-tracker.js';

// ── updateStrategyPerformance — entry creation ────────────────────────────────
describe('updateStrategyPerformance — creates entries', () => {
  beforeEach(() => { saveState(); initCleanState(); });
  afterEach(() => restoreState());

  it('creates strategy_performance if missing', () => {
    updateStrategyPerformance(0, true, 3, 10);
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.ok(state.strategy_performance, 'strategy_performance key missing');
    assert.ok('strategy_0' in state.strategy_performance, 'strategy_0 missing');
  });

  it('initializes with correct shape on first call', () => {
    updateStrategyPerformance(2, true, 5, 20);
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    const entry = state.strategy_performance['strategy_2'];
    assert.ok('attempts' in entry, 'missing attempts');
    assert.ok('successes' in entry, 'missing successes');
    assert.ok('total_prospects' in entry, 'missing total_prospects');
    assert.ok('total_qualified' in entry, 'missing total_qualified');
    assert.ok('qualified_rate' in entry, 'missing qualified_rate');
    assert.ok('last_used' in entry, 'missing last_used');
  });
});

// ── updateStrategyPerformance — increment logic ───────────────────────────────
describe('updateStrategyPerformance — increments correctly', () => {
  beforeEach(() => { saveState(); initCleanState(); });
  afterEach(() => restoreState());

  it('increments attempts on each call', () => {
    updateStrategyPerformance(1, true, 2, 10);
    updateStrategyPerformance(1, true, 3, 10);
    updateStrategyPerformance(1, false, 0, 5);
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.equal(state.strategy_performance['strategy_1'].attempts, 3);
  });

  it('increments successes only when success=true', () => {
    updateStrategyPerformance(3, true, 1, 5);
    updateStrategyPerformance(3, false, 0, 5);
    updateStrategyPerformance(3, true, 2, 5);
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.equal(state.strategy_performance['strategy_3'].successes, 2);
  });

  it('accumulates total_prospects across calls', () => {
    updateStrategyPerformance(4, true, 2, 8);
    updateStrategyPerformance(4, true, 3, 12);
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.equal(state.strategy_performance['strategy_4'].total_prospects, 20);
  });

  it('accumulates total_qualified across calls', () => {
    updateStrategyPerformance(5, true, 3, 10);
    updateStrategyPerformance(5, true, 7, 10);
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.equal(state.strategy_performance['strategy_5'].total_qualified, 10);
  });
});

// ── updateStrategyPerformance — qualified_rate calculation ────────────────────
describe('updateStrategyPerformance — qualified_rate', () => {
  beforeEach(() => { saveState(); initCleanState(); });
  afterEach(() => restoreState());

  it('calculates qualified_rate: 3/10 = 30%', () => {
    updateStrategyPerformance(0, true, 3, 10);
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.equal(state.strategy_performance['strategy_0'].qualified_rate, 30);
  });

  it('calculates qualified_rate: 0/10 = 0%', () => {
    updateStrategyPerformance(0, false, 0, 10);
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.equal(state.strategy_performance['strategy_0'].qualified_rate, 0);
  });

  it('calculates qualified_rate across multiple calls: (3+7)/(10+10) = 50%', () => {
    updateStrategyPerformance(7, true, 3, 10);
    updateStrategyPerformance(7, true, 7, 10);
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.equal(state.strategy_performance['strategy_7'].qualified_rate, 50);
  });

  it('qualified_rate is 0 when total_prospects is 0', () => {
    updateStrategyPerformance(6, true, 0, 0);
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.equal(state.strategy_performance['strategy_6'].qualified_rate, 0);
  });

  it('last_used is set to a recent ISO timestamp', () => {
    const before = Date.now();
    updateStrategyPerformance(8, true, 1, 5);
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    const ts = new Date(state.strategy_performance['strategy_8'].last_used).getTime();
    assert.ok(ts >= before && ts <= Date.now(), 'last_used should be recent');
  });

  it('tracks multiple strategies independently', () => {
    updateStrategyPerformance(0, true, 2, 10);  // 20%
    updateStrategyPerformance(1, true, 8, 10);  // 80%
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    assert.equal(state.strategy_performance['strategy_0'].qualified_rate, 20);
    assert.equal(state.strategy_performance['strategy_1'].qualified_rate, 80);
  });
});

// ── getTopStrategies ──────────────────────────────────────────────────────────
describe('getTopStrategies', () => {
  beforeEach(() => { saveState(); initCleanState(); });
  afterEach(() => restoreState());

  it('returns empty array when no strategy_performance exists', () => {
    initCleanState({});
    assert.deepEqual(getTopStrategies(), []);
  });

  it('filters out strategies with fewer than 3 attempts', () => {
    initCleanState({
      strategy_performance: {
        strategy_0: { attempts: 2, qualified_rate: 80 },
        strategy_1: { attempts: 1, qualified_rate: 90 },
      }
    });
    assert.deepEqual(getTopStrategies(), []);
  });

  it('returns strategies with 3+ attempts, sorted by qualifiedRate descending', () => {
    initCleanState({
      strategy_performance: {
        strategy_0: { attempts: 5, qualified_rate: 20 },
        strategy_1: { attempts: 4, qualified_rate: 60 },
        strategy_2: { attempts: 3, qualified_rate: 40 },
        strategy_3: { attempts: 6, qualified_rate: 80 },
      }
    });
    const top = getTopStrategies();
    assert.ok(top.length > 0);
    assert.equal(top[0].strategyIndex, 3, 'highest rate (80%) should be first');
    assert.equal(top[1].strategyIndex, 1, 'second highest (60%) should be second');
  });

  it('caps result at top 3', () => {
    const perf = {};
    for (let i = 0; i < 8; i++) {
      perf[`strategy_${i}`] = { attempts: 5, qualified_rate: i * 10 };
    }
    initCleanState({ strategy_performance: perf });
    assert.ok(getTopStrategies().length <= 3, 'should return at most 3 strategies');
  });

  it('result entries have strategyIndex, qualifiedRate, attempts', () => {
    initCleanState({
      strategy_performance: {
        strategy_5: { attempts: 4, qualified_rate: 35 },
      }
    });
    const top = getTopStrategies();
    assert.equal(top.length, 1);
    assert.ok('strategyIndex' in top[0], 'missing strategyIndex');
    assert.ok('qualifiedRate' in top[0], 'missing qualifiedRate');
    assert.ok('attempts' in top[0], 'missing attempts');
    assert.equal(top[0].strategyIndex, 5);
    assert.equal(top[0].qualifiedRate, 35);
  });

  it('strategyIndex is a number, not a string', () => {
    initCleanState({
      strategy_performance: {
        strategy_9: { attempts: 3, qualified_rate: 25 },
      }
    });
    const [entry] = getTopStrategies();
    assert.equal(typeof entry.strategyIndex, 'number');
    assert.equal(entry.strategyIndex, 9);
  });
});

console.log('\n✅ strategy-performance-tracker (updateStrategyPerformance, getTopStrategies) tests complete.\n');
