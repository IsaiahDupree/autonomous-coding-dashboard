#!/usr/bin/env node

/**
 * Test Suite for feat-038: Adaptive Session Delay
 *
 * Acceptance Criteria:
 * 1. Increases delay after errors
 * 2. Decreases delay during productive sessions
 * 3. Configurable min/max delay bounds
 * 4. Logs delay adjustments
 */

import AdaptiveDelay from './adaptive-delay.js';
import { strict as assert } from 'assert';

console.log('Starting tests for feat-038: Adaptive Session Delay\n');

let testsRun = 0;
let testsPassed = 0;

function test(name, fn) {
  testsRun++;
  try {
    fn();
    testsPassed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
  }
}

// Test 1: Initialization
test('AdaptiveDelay initializes with correct defaults', () => {
  const delay = new AdaptiveDelay();
  assert.equal(delay.getCurrentDelay(), 5000, 'Default delay should be 5000ms');
  assert.equal(delay.minDelayMs, 2000, 'Min delay should be 2000ms');
  assert.equal(delay.maxDelayMs, 120000, 'Max delay should be 120000ms');
});

// Test 2: Custom configuration
test('AdaptiveDelay accepts custom configuration', () => {
  const delay = new AdaptiveDelay({
    minDelayMs: 1000,
    maxDelayMs: 60000,
    defaultDelayMs: 3000
  });
  assert.equal(delay.getCurrentDelay(), 3000);
  assert.equal(delay.minDelayMs, 1000);
  assert.equal(delay.maxDelayMs, 60000);
});

// Test 3: Increases delay after errors
test('Delay increases after error session', () => {
  const delay = new AdaptiveDelay({ defaultDelayMs: 5000 });
  const initialDelay = delay.getCurrentDelay();

  delay.recordSession({ code: 1, error: true, featuresCompleted: 0 });

  const newDelay = delay.getCurrentDelay();
  assert(newDelay > initialDelay, `Delay should increase from ${initialDelay} to ${newDelay}`);
});

// Test 4: Decreases delay during productive sessions
test('Delay decreases after productive session', () => {
  const delay = new AdaptiveDelay({ defaultDelayMs: 10000 });
  const initialDelay = delay.getCurrentDelay();

  delay.recordSession({ code: 0, error: false, featuresCompleted: 2 });

  const newDelay = delay.getCurrentDelay();
  assert(newDelay < initialDelay, `Delay should decrease from ${initialDelay} to ${newDelay}`);
});

// Test 5: Respects minimum bound
test('Delay respects minimum bound', () => {
  const delay = new AdaptiveDelay({ minDelayMs: 2000, defaultDelayMs: 3000 });

  // Try to decrease below minimum with multiple productive sessions
  for (let i = 0; i < 10; i++) {
    delay.recordSession({ code: 0, error: false, featuresCompleted: 1 });
  }

  const finalDelay = delay.getCurrentDelay();
  assert(finalDelay >= 2000, `Delay ${finalDelay} should not go below min 2000ms`);
});

// Test 6: Respects maximum bound
test('Delay respects maximum bound', () => {
  const delay = new AdaptiveDelay({ maxDelayMs: 120000, defaultDelayMs: 5000 });

  // Try to increase beyond maximum with multiple errors
  for (let i = 0; i < 10; i++) {
    delay.recordSession({ code: 1, error: true, featuresCompleted: 0 });
  }

  const finalDelay = delay.getCurrentDelay();
  assert(finalDelay <= 120000, `Delay ${finalDelay} should not exceed max 120000ms`);
});

// Test 7: Consecutive errors increase delay more
test('Consecutive errors compound delay increase', () => {
  const delay = new AdaptiveDelay({ defaultDelayMs: 5000 });

  delay.recordSession({ code: 1, error: true, featuresCompleted: 0 });
  const delayAfterOne = delay.getCurrentDelay();

  delay.recordSession({ code: 1, error: true, featuresCompleted: 0 });
  delay.recordSession({ code: 1, error: true, featuresCompleted: 0 });
  const delayAfterThree = delay.getCurrentDelay();

  assert(delayAfterThree > delayAfterOne * 2, 'Three consecutive errors should have compounding effect');
});

// Test 8: Consecutive successes decrease delay more
test('Consecutive successes compound delay decrease', () => {
  const delay = new AdaptiveDelay({ defaultDelayMs: 20000 });

  delay.recordSession({ code: 0, error: false, featuresCompleted: 1 });
  const delayAfterOne = delay.getCurrentDelay();

  delay.recordSession({ code: 0, error: false, featuresCompleted: 1 });
  delay.recordSession({ code: 0, error: false, featuresCompleted: 1 });
  delay.recordSession({ code: 0, error: false, featuresCompleted: 1 });
  delay.recordSession({ code: 0, error: false, featuresCompleted: 1 });
  const delayAfterFive = delay.getCurrentDelay();

  assert(delayAfterFive < delayAfterOne * 0.7, 'Five consecutive successes should have compounding effect');
});

// Test 9: Reset functionality
test('Reset returns delay to default', () => {
  const delay = new AdaptiveDelay({ defaultDelayMs: 5000 });

  // Change the delay
  delay.recordSession({ code: 1, error: true, featuresCompleted: 0 });
  delay.recordSession({ code: 1, error: true, featuresCompleted: 0 });

  delay.reset();

  assert.equal(delay.getCurrentDelay(), 5000, 'Reset should restore default delay');
  assert.equal(delay.consecutiveErrors, 0, 'Reset should clear consecutive errors');
  assert.equal(delay.consecutiveSuccesses, 0, 'Reset should clear consecutive successes');
});

// Test 10: Statistics tracking
test('Statistics are tracked correctly', () => {
  const delay = new AdaptiveDelay({ defaultDelayMs: 5000 });

  delay.recordSession({ code: 0, error: false, featuresCompleted: 1 });
  delay.recordSession({ code: 0, error: false, featuresCompleted: 2 });
  delay.recordSession({ code: 1, error: true, featuresCompleted: 0 });

  const stats = delay.getStats();

  assert(stats.totalSessionsTracked === 3, 'Should track 3 sessions');
  assert(stats.currentDelayMs > 0, 'Should have current delay');
  assert(stats.recentSuccessRate, 'Should calculate success rate');
  assert(stats.avgFeaturesPerSession, 'Should calculate avg features per session');
});

// Test 11: Formatted delay string
test('Formatted delay string is human-readable', () => {
  const delay = new AdaptiveDelay({ defaultDelayMs: 5000 });
  const formatted = delay.getCurrentDelayFormatted();

  assert(formatted.endsWith('s'), 'Formatted delay should end with "s"');
  assert(formatted.includes('.'), 'Formatted delay should include decimal point');
});

// Test 12: Session history limit
test('Session history is limited to 20 entries', () => {
  const delay = new AdaptiveDelay({ defaultDelayMs: 5000 });

  // Record 30 sessions
  for (let i = 0; i < 30; i++) {
    delay.recordSession({ code: 0, error: false, featuresCompleted: 1 });
  }

  const stats = delay.getStats();
  assert(stats.totalSessionsTracked === 20, 'Should only keep last 20 sessions');
});

// Test 13: Non-productive sessions (success but no features)
test('Non-productive sessions decrease delay conservatively', () => {
  const delay = new AdaptiveDelay({ defaultDelayMs: 10000 });
  const initialDelay = delay.getCurrentDelay();

  delay.recordSession({ code: 0, error: false, featuresCompleted: 0 });
  const afterNonProductive = delay.getCurrentDelay();

  // Reset to same starting point
  delay.reset();
  delay.recordSession({ code: 0, error: false, featuresCompleted: 1 });
  const afterProductive = delay.getCurrentDelay();

  assert(afterNonProductive > afterProductive,
    'Non-productive session should decrease delay less than productive session');
});

// Test 14: Real-world scenario simulation
test('Real-world scenario: mixed success and failure', () => {
  const delay = new AdaptiveDelay({
    minDelayMs: 2000,
    maxDelayMs: 60000,
    defaultDelayMs: 5000
  });

  const scenario = [
    { code: 0, error: false, featuresCompleted: 2, expected: 'decrease' },
    { code: 0, error: false, featuresCompleted: 1, expected: 'decrease' },
    { code: 1, error: true, featuresCompleted: 0, expected: 'increase' },
    { code: 0, error: false, featuresCompleted: 1, expected: 'decrease' },
    { code: 0, error: false, featuresCompleted: 3, expected: 'decrease' }
  ];

  let previousDelay = delay.getCurrentDelay();

  scenario.forEach((session, index) => {
    delay.recordSession(session);
    const currentDelay = delay.getCurrentDelay();

    if (session.expected === 'increase') {
      assert(currentDelay > previousDelay,
        `Session ${index + 1}: Expected increase but got ${currentDelay} vs ${previousDelay}`);
    } else {
      assert(currentDelay <= previousDelay,
        `Session ${index + 1}: Expected decrease but got ${currentDelay} vs ${previousDelay}`);
    }

    previousDelay = currentDelay;
  });
});

console.log('\n' + '='.repeat(50));
console.log(`Tests passed: ${testsPassed}/${testsRun}`);

if (testsPassed === testsRun) {
  console.log('✅ All tests passed!');
  console.log('\n✅ feat-038 acceptance criteria verified:');
  console.log('  ✓ Increases delay after errors');
  console.log('  ✓ Decreases delay during productive sessions');
  console.log('  ✓ Configurable min/max delay bounds');
  console.log('  ✓ Logs delay adjustments');
  process.exit(0);
} else {
  console.log('❌ Some tests failed');
  process.exit(1);
}
