#!/usr/bin/env node

/**
 * Target Sync API Tests
 * =====================
 * 
 * Tests for the target sync service and API endpoints.
 * Run: node test-target-sync.js
 */

const API_BASE = 'http://localhost:3434';

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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return response.json();
}

async function runAllTests() {
  console.log('\n========================================');
  console.log('Target Sync API Tests');
  console.log('========================================\n');

  // Test 1: Health check
  await runTest('API health check', async () => {
    const result = await fetchJson(`${API_BASE}/api/health`);
    if (result.status !== 'ok') throw new Error('Health check failed');
  });

  // Test 2: Sync targets
  await runTest('Sync targets from repo-queue.json', async () => {
    const result = await fetchJson(`${API_BASE}/api/db/targets/sync`, { method: 'POST' });
    if (!result.data?.synced) throw new Error('Sync failed');
    if (!result.data?.summary?.totalTargets) throw new Error('No targets synced');
    log(`  Synced ${result.data.summary.totalTargets} targets`, 'info');
  });

  // Test 3: Get targets summary
  await runTest('Get targets summary', async () => {
    const result = await fetchJson(`${API_BASE}/api/db/targets/summary`);
    if (!result.data) throw new Error('No summary data');
    if (typeof result.data.totalTargets !== 'number') throw new Error('Missing totalTargets');
    if (typeof result.data.totalFeatures !== 'number') throw new Error('Missing totalFeatures');
    if (typeof result.data.overallPercent !== 'number') throw new Error('Missing overallPercent');
    log(`  ${result.data.totalTargets} targets, ${result.data.totalFeatures} features, ${result.data.overallPercent.toFixed(1)}% complete`, 'info');
  });

  // Test 4: Get all targets
  await runTest('Get all targets with sessions', async () => {
    const result = await fetchJson(`${API_BASE}/api/db/targets`);
    if (!result.data || !Array.isArray(result.data)) throw new Error('No targets array');
    if (result.data.length === 0) throw new Error('Empty targets array');
    
    const first = result.data[0];
    if (!first.repoId) throw new Error('Target missing repoId');
    if (!first.name) throw new Error('Target missing name');
    log(`  First target: ${first.name} (${first.repoId})`, 'info');
  });

  // Test 5: Get targets status (file-based)
  await runTest('Get targets status from files', async () => {
    const result = await fetchJson(`${API_BASE}/api/targets/status`);
    if (!result.data) throw new Error('No status data');
    if (!result.data.targets) throw new Error('No targets in status');
    log(`  ${result.data.targets.length} targets from files`, 'info');
  });

  // Test 6: Get sessions
  await runTest('Get recent sessions', async () => {
    const result = await fetchJson(`${API_BASE}/api/db/sessions?limit=10`);
    if (!result.data || !Array.isArray(result.data)) throw new Error('No sessions array');
    log(`  ${result.data.length} recent sessions`, 'info');
  });

  // Test 7: Get model usage
  await runTest('Get model usage summary', async () => {
    const result = await fetchJson(`${API_BASE}/api/db/model-usage?days=7`);
    if (!result.data) throw new Error('No usage data');
    if (typeof result.data.periodDays !== 'number') throw new Error('Missing periodDays');
    log(`  ${result.data.totalTokens} tokens, $${result.data.totalCost.toFixed(4)} cost over ${result.data.periodDays} days`, 'info');
  });

  // Test 8: Get progress snapshots
  await runTest('Get progress snapshots', async () => {
    const result = await fetchJson(`${API_BASE}/api/db/snapshots?days=7`);
    if (!result.data || !Array.isArray(result.data)) throw new Error('No snapshots array');
    log(`  ${result.data.length} snapshots`, 'info');
  });

  // Test 9: Get errors
  await runTest('Get recent errors', async () => {
    const result = await fetchJson(`${API_BASE}/api/db/errors?limit=10`);
    if (!result.data || !Array.isArray(result.data)) throw new Error('No errors array');
    log(`  ${result.data.length} unresolved errors`, 'info');
  });

  // Test 10: Get token usage details
  await runTest('Get token usage details', async () => {
    const result = await fetchJson(`${API_BASE}/api/db/token-usage?limit=10`);
    if (!result.data || !Array.isArray(result.data)) throw new Error('No token usage array');
    log(`  ${result.data.length} token usage records`, 'info');
  });

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
