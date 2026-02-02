#!/usr/bin/env node

/**
 * Metrics Database Tests
 * ======================
 * 
 * Tests for the per-target metrics tracking system.
 * Run: node test-metrics-db.js
 */

import {
  testConnection,
  ensureTarget,
  getTarget,
  startSession,
  endSession,
  getSessionsByTarget,
  updateDailyStats,
  getTargetSummary,
  getAllTargetSummaries,
  getCostByTarget,
  closePool,
} from './metrics-db.js';

const TEST_TARGET_ID = 'test-target-001';
const TEST_TARGET_NAME = 'Test Target';

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
    console.error(error);
    testsFailed++;
  }
}

async function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

async function assertTruthy(value, message) {
  if (!value) {
    throw new Error(`${message}: expected truthy value, got ${value}`);
  }
}

async function runAllTests() {
  console.log('\n========================================');
  console.log('ACD Metrics Database Tests');
  console.log('========================================\n');

  // Test 1: Connection
  await runTest('Database connection', async () => {
    const result = await testConnection();
    assertTruthy(result.connected, 'Should be connected');
    assertTruthy(result.time, 'Should return server time');
  });

  // Test 2: Create target
  await runTest('Create/ensure target', async () => {
    const target = await ensureTarget(TEST_TARGET_ID, TEST_TARGET_NAME, '/test/path');
    assertEqual(target.repo_id, TEST_TARGET_ID, 'Target ID should match');
    assertEqual(target.name, TEST_TARGET_NAME, 'Target name should match');
  });

  // Test 3: Get target
  await runTest('Get target', async () => {
    const target = await getTarget(TEST_TARGET_ID);
    assertTruthy(target, 'Target should exist');
    assertEqual(target.repo_id, TEST_TARGET_ID, 'Target ID should match');
  });

  // Test 4: Start session
  let sessionId;
  await runTest('Start session', async () => {
    const session = await startSession(TEST_TARGET_ID, 1, 'coding', 'haiku');
    assertTruthy(session.id, 'Session should have ID');
    assertTruthy(session.started_at, 'Session should have start time');
    sessionId = session.id;
  });

  // Test 5: End session with metrics
  await runTest('End session with metrics', async () => {
    const result = await endSession(sessionId, {
      status: 'completed',
      inputTokens: 50000,
      outputTokens: 10000,
      cacheReadTokens: 25000,
      cacheWriteTokens: 5000,
      costUsd: 0.15,
      featuresBefore: 10,
      featuresAfter: 12,
      featuresCompleted: 2,
      commitsMade: 3,
    });
    assertEqual(result.status, 'completed', 'Status should be completed');
    assertEqual(result.input_tokens, 50000, 'Input tokens should match');
    assertEqual(result.features_completed, 2, 'Features completed should match');
    assertTruthy(result.duration_ms > 0, 'Duration should be positive');
  });

  // Test 6: Start and end failed session
  await runTest('Record failed session', async () => {
    const session = await startSession(TEST_TARGET_ID, 2, 'coding', 'haiku');
    const result = await endSession(session.id, {
      status: 'failed',
      inputTokens: 1000,
      outputTokens: 100,
      costUsd: 0.01,
      errorType: 'rate_limit',
      errorMessage: 'Rate limit exceeded',
    });
    assertEqual(result.status, 'failed', 'Status should be failed');
    assertEqual(result.error_type, 'rate_limit', 'Error type should match');
  });

  // Test 7: Get sessions by target
  await runTest('Get sessions by target', async () => {
    const sessions = await getSessionsByTarget(TEST_TARGET_ID);
    assertTruthy(sessions.length >= 2, 'Should have at least 2 sessions');
  });

  // Test 8: Update daily stats
  await runTest('Update daily stats', async () => {
    const stats = await updateDailyStats(TEST_TARGET_ID);
    assertTruthy(stats, 'Should return stats');
    // Uses sessions_today from progress_snapshots
    assertTruthy(stats.sessions_today >= 2, 'Should have at least 2 sessions today');
  });

  // Test 9: Get target summary
  await runTest('Get target summary', async () => {
    const summary = await getTargetSummary(TEST_TARGET_ID);
    assertTruthy(summary, 'Summary should exist');
    assertEqual(summary.repo_id, TEST_TARGET_ID, 'Target ID should match');
    // total_sessions is returned as string from COUNT, need to parse
    assertTruthy(parseInt(summary.total_sessions) >= 2, 'Should have sessions');
    assertTruthy(parseFloat(summary.total_cost) >= 0, 'Should have cost');
  });

  // Test 10: Get all target summaries
  await runTest('Get all target summaries', async () => {
    const summaries = await getAllTargetSummaries();
    assertTruthy(summaries.length >= 1, 'Should have at least 1 target');
  });

  // Test 11: Get cost by target
  await runTest('Get cost by target', async () => {
    const costs = await getCostByTarget();
    assertTruthy(costs.length >= 1, 'Should have cost data');
    const testCost = costs.find(c => c.target_id === TEST_TARGET_ID);
    assertTruthy(testCost, 'Should have test target cost');
    assertTruthy(parseFloat(testCost.total_cost) >= 0, 'Should have non-negative cost');
  });

  // Test 12: Multiple sessions for same target
  await runTest('Multiple sessions accumulate correctly', async () => {
    // Add another session
    const session = await startSession(TEST_TARGET_ID, 3, 'coding', 'haiku');
    await endSession(session.id, {
      status: 'completed',
      inputTokens: 30000,
      outputTokens: 8000,
      costUsd: 0.10,
      featuresCompleted: 1,
      commitsMade: 2,
    });

    const summary = await getTargetSummary(TEST_TARGET_ID);
    assertTruthy(summary.total_sessions >= 3, 'Should have 3+ sessions');
    assertTruthy(parseFloat(summary.total_cost) >= 0.26, 'Cost should accumulate');
  });

  // Cleanup
  await closePool();

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
