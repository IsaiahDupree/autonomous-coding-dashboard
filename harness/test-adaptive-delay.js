#!/usr/bin/env node

/**
 * adaptive-delay.js — Tests
 * ==========================
 * Controls pacing between agent sessions. Broken bounds = agents
 * hammering the API in a tight loop or waiting hours between runs.
 *
 * Run:
 *   node harness/test-adaptive-delay.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import AdaptiveDelay from './adaptive-delay.js';

// Suppress console.log output from the class during tests
const origLog = console.log;
before_tests: {
  // Note: node:test doesn't support global before without import — silence via instance override
}

function makeDelay(opts = {}) {
  const d = new AdaptiveDelay({ minDelayMs: 1000, maxDelayMs: 60000, defaultDelayMs: 5000, ...opts });
  d.log = () => {}; // silence during tests
  return d;
}

const successSession  = { code: 0, error: null, featuresCompleted: 2, duration: 30000 };
const unproductiveSess = { code: 0, error: null, featuresCompleted: 0, duration: 20000 };
const errorSession    = { code: 1, error: 'some error', featuresCompleted: 0, duration: 5000 };

// ── Constructor ───────────────────────────────────────────────────────────────
describe('AdaptiveDelay constructor', () => {
  it('initializes currentDelayMs to defaultDelayMs', () => {
    const d = makeDelay({ defaultDelayMs: 8000 });
    assert.equal(d.getCurrentDelay(), 8000);
  });

  it('uses default values when no options provided', () => {
    const d = new AdaptiveDelay();
    d.log = () => {};
    assert.equal(d.minDelayMs, 2000);
    assert.equal(d.maxDelayMs, 120000);
    assert.equal(d.defaultDelayMs, 5000);
    assert.equal(d.consecutiveSuccesses, 0);
    assert.equal(d.consecutiveErrors, 0);
  });

  it('accepts custom multipliers', () => {
    const d = makeDelay({ errorMultiplier: 3.0, successDivisor: 1.5 });
    assert.equal(d.errorMultiplier, 3.0);
    assert.equal(d.successDivisor, 1.5);
  });
});

// ── recordSession — error path ────────────────────────────────────────────────
describe('recordSession — errors increase delay', () => {
  it('increases delay after an error session', () => {
    const d = makeDelay();
    const before = d.getCurrentDelay();
    const after = d.recordSession(errorSession);
    assert.ok(after > before, `delay should increase: ${before} → ${after}`);
  });

  it('delay after error = prev × errorMultiplier (clamped to bounds)', () => {
    const d = makeDelay({ defaultDelayMs: 5000, errorMultiplier: 2.0, minDelayMs: 1000, maxDelayMs: 60000 });
    d.recordSession(errorSession);
    // 5000 × 2.0 = 10000, rounded to nearest 100
    assert.equal(d.getCurrentDelay(), 10000);
  });

  it('applies extra penalty after 3+ consecutive errors', () => {
    const d = makeDelay({ defaultDelayMs: 5000, errorMultiplier: 2.0 });
    d.recordSession(errorSession); // 10000
    d.recordSession(errorSession); // 20000
    const afterTwo = d.getCurrentDelay();
    d.recordSession(errorSession); // 3rd consecutive: × 1.5 extra penalty
    const afterThree = d.getCurrentDelay();
    assert.ok(afterThree > afterTwo, 'third consecutive error should apply extra penalty');
  });

  it('increments consecutiveErrors counter', () => {
    const d = makeDelay();
    d.recordSession(errorSession);
    d.recordSession(errorSession);
    assert.equal(d.consecutiveErrors, 2);
    assert.equal(d.consecutiveSuccesses, 0);
  });

  it('resets consecutiveErrors on success', () => {
    const d = makeDelay();
    d.recordSession(errorSession);
    d.recordSession(errorSession);
    d.recordSession(successSession);
    assert.equal(d.consecutiveErrors, 0);
  });
});

// ── recordSession — success/productive path ───────────────────────────────────
describe('recordSession — successes decrease delay', () => {
  it('decreases delay after a productive session', () => {
    const d = makeDelay({ defaultDelayMs: 20000 }); // start high so there's room to go down
    const before = d.getCurrentDelay();
    const after = d.recordSession(successSession);
    assert.ok(after < before, `delay should decrease: ${before} → ${after}`);
  });

  it('delay after productive session ≈ prev / successDivisor', () => {
    const d = makeDelay({ defaultDelayMs: 12000, successDivisor: 1.2 });
    d.recordSession(successSession);
    // 12000 / 1.2 = 10000, rounded to 100
    assert.equal(d.getCurrentDelay(), 10000);
  });

  it('applies productivity bonus after 3+ consecutive successes', () => {
    const d = makeDelay({ defaultDelayMs: 30000, successDivisor: 1.2, productivityBonus: 0.8 });
    d.recordSession(successSession); // 30000/1.2 = 25000
    d.recordSession(successSession); // 25000/1.2 ≈ 20800
    d.recordSession(successSession); // 20800/1.2 ≈ 17333
    const afterThree = d.getCurrentDelay();
    d.recordSession(successSession); // 4th: bonus × 0.8 applied
    const afterFour = d.getCurrentDelay();
    assert.ok(afterFour < afterThree, '4th consecutive success should apply productivity bonus');
  });

  it('increments consecutiveSuccesses', () => {
    const d = makeDelay();
    d.recordSession(successSession);
    d.recordSession(successSession);
    assert.equal(d.consecutiveSuccesses, 2);
    assert.equal(d.consecutiveErrors, 0);
  });

  it('non-productive success (featuresCompleted=0) decreases delay more conservatively', () => {
    const d = makeDelay({ defaultDelayMs: 20000, successDivisor: 1.2 });
    d.recordSession(unproductiveSess);
    // divisor for unproductive = successDivisor × 0.8 = 0.96 → delay increases slightly
    // or stays same — the point is it decreases LESS than a productive session
    const unproductiveResult = d.getCurrentDelay();

    const d2 = makeDelay({ defaultDelayMs: 20000, successDivisor: 1.2 });
    d2.recordSession(successSession);
    const productiveResult = d2.getCurrentDelay();

    assert.ok(unproductiveResult >= productiveResult,
      `unproductive delay ${unproductiveResult} should be >= productive delay ${productiveResult}`);
  });
});

// ── Bounds enforcement ────────────────────────────────────────────────────────
describe('bounds enforcement', () => {
  it('never goes below minDelayMs', () => {
    const d = makeDelay({ defaultDelayMs: 2000, minDelayMs: 1000, successDivisor: 1.2 });
    // Drive it down with many successes
    for (let i = 0; i < 20; i++) d.recordSession(successSession);
    assert.ok(d.getCurrentDelay() >= 1000, `delay ${d.getCurrentDelay()} should be >= minDelayMs 1000`);
  });

  it('never goes above maxDelayMs', () => {
    const d = makeDelay({ defaultDelayMs: 20000, maxDelayMs: 60000, errorMultiplier: 2.0 });
    // Drive it up with many errors
    for (let i = 0; i < 20; i++) d.recordSession(errorSession);
    assert.ok(d.getCurrentDelay() <= 60000, `delay ${d.getCurrentDelay()} should be <= maxDelayMs 60000`);
  });

  it('rounds to nearest 100ms', () => {
    const d = makeDelay({ defaultDelayMs: 5000, successDivisor: 1.3 }); // 5000/1.3 = 3846.15
    d.recordSession(successSession);
    assert.equal(d.getCurrentDelay() % 100, 0, 'delay should be a multiple of 100ms');
  });
});

// ── reset ────────────────────────────────────────────────────────────────────
describe('reset', () => {
  it('resets delay to defaultDelayMs', () => {
    const d = makeDelay({ defaultDelayMs: 5000 });
    d.recordSession(errorSession);
    d.recordSession(errorSession);
    assert.notEqual(d.getCurrentDelay(), 5000);
    d.reset();
    assert.equal(d.getCurrentDelay(), 5000);
  });

  it('resets consecutiveSuccesses and consecutiveErrors to 0', () => {
    const d = makeDelay();
    d.recordSession(errorSession);
    d.recordSession(errorSession);
    d.reset();
    assert.equal(d.consecutiveErrors, 0);
    assert.equal(d.consecutiveSuccesses, 0);
  });
});

// ── getStats ──────────────────────────────────────────────────────────────────
describe('getStats', () => {
  it('returns required fields', () => {
    const d = makeDelay();
    const stats = d.getStats();
    const required = ['currentDelayMs', 'currentDelayFormatted', 'minDelayMs', 'maxDelayMs',
                      'consecutiveSuccesses', 'consecutiveErrors', 'recentSuccessRate',
                      'avgFeaturesPerSession', 'totalSessionsTracked'];
    for (const f of required) {
      assert.ok(f in stats, `Missing field: ${f}`);
    }
  });

  it('totalSessionsTracked increases with each session', () => {
    const d = makeDelay();
    d.recordSession(successSession);
    d.recordSession(errorSession);
    const stats = d.getStats();
    assert.equal(stats.totalSessionsTracked, 2);
  });

  it('recentSuccessRate is 100% after only successes', () => {
    const d = makeDelay();
    d.recordSession(successSession);
    d.recordSession(successSession);
    const stats = d.getStats();
    assert.equal(stats.recentSuccessRate, '100.0%');
  });

  it('recentSuccessRate is 0% after only errors', () => {
    const d = makeDelay();
    d.recordSession(errorSession);
    d.recordSession(errorSession);
    const stats = d.getStats();
    assert.equal(stats.recentSuccessRate, '0.0%');
  });

  it('caps session history at 20 entries', () => {
    const d = makeDelay();
    for (let i = 0; i < 25; i++) d.recordSession(successSession);
    const stats = d.getStats();
    assert.ok(d.sessionHistory.length <= 20, `history length ${d.sessionHistory.length} should be <= 20`);
  });

  it('avgFeaturesPerSession reflects actual features completed', () => {
    const d = makeDelay();
    d.recordSession({ ...successSession, featuresCompleted: 4 });
    d.recordSession({ ...successSession, featuresCompleted: 6 });
    const stats = d.getStats();
    assert.equal(stats.avgFeaturesPerSession, '5.00');
  });
});

// ── getCurrentDelayFormatted ──────────────────────────────────────────────────
describe('getCurrentDelayFormatted', () => {
  it('formats 5000ms as "5.0s"', () => {
    const d = makeDelay({ defaultDelayMs: 5000 });
    assert.equal(d.getCurrentDelayFormatted(), '5.0s');
  });

  it('formats 30000ms as "30.0s"', () => {
    const d = makeDelay({ defaultDelayMs: 30000 });
    assert.equal(d.getCurrentDelayFormatted(), '30.0s');
  });

  it('updates after recordSession', () => {
    const d = makeDelay({ defaultDelayMs: 5000 });
    d.recordSession(errorSession); // doubles to 10000
    assert.equal(d.getCurrentDelayFormatted(), '10.0s');
  });
});

console.log('\n✅ adaptive-delay tests complete.\n');
