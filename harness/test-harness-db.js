#!/usr/bin/env node

/**
 * Harness DB Integration Tests
 * ============================
 * 
 * Tests for the run-harness-v2.js database integration.
 * Run: node test-harness-db.js
 */

import * as metricsDb from './metrics-db.js';

const TEST_PROJECT_ID = 'harness-test-project';
const TEST_PROJECT_NAME = 'Harness Test Project';
const TEST_PROJECT_PATH = '/tmp/harness-test';

let testsPassed = 0;
let testsFailed = 0;

function log(message, type = 'info') {
  const prefix = {
    info: '📋',
    pass: '✅',
    fail: '❌',
    test: '🧪',
  }[type] || '•';
  console.log(`${prefix} ${message}`);
}

async function runTest(name, fn) {
  log(`Testing: ${name}`, 'test');
  try {
    await fn();
    log(`PASS: ${name}`, 'pass');
    testsPassed++;
  } catch (error) {
    log(`FAIL: ${name} - ${error.message}`, 'fail');
    testsFailed++;
  }
}

function assertTruthy(value, message) {
  if (!value) {
    throw new Error(`${message}: expected truthy value, got ${value}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

async function runAllTests() {
  console.log('\n========================================');
  console.log('Harness DB Integration Tests');
  console.log('========================================\n');

  // Test 1: Ensure target creates/updates target
  await runTest('ensureTarget creates target', async () => {
    const target = await metricsDb.ensureTarget(TEST_PROJECT_ID, TEST_PROJECT_NAME, TEST_PROJECT_PATH);
    assertTruthy(target, 'Target should be returned');
    assertEqual(target.repo_id, TEST_PROJECT_ID, 'repo_id should match');
    assertEqual(target.name, TEST_PROJECT_NAME, 'name should match');
  });

  // Test 2: Start coding session
  let codingSession;
  await runTest('Start coding session', async () => {
    codingSession = await metricsDb.startSession(TEST_PROJECT_ID, 1, 'coding', 'haiku');
    assertTruthy(codingSession, 'Session should be returned');
    assertTruthy(codingSession.id, 'Session should have ID');
    assertTruthy(codingSession.started_at, 'Session should have started_at');
  });

  // Test 3: End coding session with success
  await runTest('End coding session with success metrics', async () => {
    const result = await metricsDb.endSession(codingSession.id, {
      status: 'completed',
      inputTokens: 100000,
      outputTokens: 25000,
      cacheReadTokens: 50000,
      cacheWriteTokens: 10000,
      costUsd: 0.35,
      featuresBefore: 50,
      featuresAfter: 55,
      featuresCompleted: 5,
      commitsMade: 3,
    });
    assertTruthy(result, 'Result should be returned');
    assertEqual(result.status, 'completed', 'Status should be completed');
    assertEqual(result.input_tokens, 100000, 'Input tokens should match');
    assertEqual(result.output_tokens, 25000, 'Output tokens should match');
    assertEqual(result.features_completed, 5, 'Features completed should match');
  });

  // Test 4: Start initializer session
  let initSession;
  await runTest('Start initializer session', async () => {
    initSession = await metricsDb.startSession(TEST_PROJECT_ID, 2, 'initializer', 'sonnet');
    assertTruthy(initSession, 'Session should be returned');
    assertTruthy(initSession.id, 'Session should have ID');
  });

  // Test 5: End session with failure
  await runTest('End session with failure', async () => {
    const result = await metricsDb.endSession(initSession.id, {
      status: 'failed',
      inputTokens: 5000,
      outputTokens: 500,
      costUsd: 0.02,
      errorType: 'rate_limit',
      errorMessage: 'Rate limit exceeded after 3 attempts',
    });
    assertEqual(result.status, 'failed', 'Status should be failed');
    assertEqual(result.error_type, 'rate_limit', 'Error type should match');
  });

  // Test 6: Verify sessions recorded
  await runTest('Sessions recorded correctly', async () => {
    const sessions = await metricsDb.getSessionsByTarget(TEST_PROJECT_ID);
    assertTruthy(sessions.length >= 2, 'Should have at least 2 sessions');
    
    const completed = sessions.find(s => s.status === 'completed');
    const failed = sessions.find(s => s.status === 'failed');
    
    assertTruthy(completed, 'Should have completed session');
    assertTruthy(failed, 'Should have failed session');
  });

  // Test 7: Update daily stats
  await runTest('Update daily stats with features', async () => {
    // updateDailyStats(targetId, totalFeaturesOverride, date) - both optional
    const stats = await metricsDb.updateDailyStats(TEST_PROJECT_ID, 100);
    assertTruthy(stats, 'Stats should be returned');
    assertTruthy(stats.sessions_today >= 2, 'Should have at least 2 sessions today');
  });

  // Test 8: Get target summary with costs
  await runTest('Get target summary with accumulated costs', async () => {
    const summary = await metricsDb.getTargetSummary(TEST_PROJECT_ID);
    assertTruthy(summary, 'Summary should be returned');
    assertEqual(summary.repo_id, TEST_PROJECT_ID, 'repo_id should match');
    assertTruthy(parseInt(summary.total_sessions) >= 2, 'Should have at least 2 sessions');
    assertTruthy(parseFloat(summary.total_cost) > 0, 'Should have positive cost');
  });

  // Test 9: Test opus model session
  let opusSession;
  await runTest('Start opus model session', async () => {
    opusSession = await metricsDb.startSession(TEST_PROJECT_ID, 3, 'coding', 'opus');
    assertTruthy(opusSession, 'Session should be returned');
    
    await metricsDb.endSession(opusSession.id, {
      status: 'completed',
      inputTokens: 200000,
      outputTokens: 50000,
      costUsd: 2.50,
      featuresCompleted: 10,
    });
  });

  // Test 10: Verify cost accumulation
  await runTest('Costs accumulate correctly', async () => {
    const summary = await metricsDb.getTargetSummary(TEST_PROJECT_ID);
    const totalCost = parseFloat(summary.total_cost);
    // Should be at least 0.35 + 0.02 + 2.50 = 2.87
    assertTruthy(totalCost >= 2.87, `Total cost should be >= 2.87, got ${totalCost}`);
  });

  // Cleanup
  await metricsDb.closePool();

  // Results
  console.log('\n========================================');
  console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('========================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
