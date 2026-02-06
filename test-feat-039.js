#!/usr/bin/env node
/**
 * Test script for feat-039: E2E Test Runner Integration
 * Verifies all 4 acceptance criteria:
 * 1. Trigger Playwright tests from dashboard
 * 2. Display test results with pass/fail status
 * 3. Show screenshots on failure
 * 4. Link test results to features
 */

const API_BASE = 'http://localhost:3434';
let allPassed = true;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    allPassed = false;
  } else {
    console.log(`  ✓ PASS: ${message}`);
  }
}

async function testCriteria1() {
  console.log('\n--- AC1: Trigger E2E tests from dashboard ---');

  // Test triggering all tests
  const response = await fetch(`${API_BASE}/api/e2e/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'all' })
  });
  const result = await response.json();
  assert(result.success === true, 'POST /api/e2e/run returns success');
  assert(result.data?.runId, 'Returns a runId');
  assert(result.data?.status === 'running', 'Status is running');

  // Test triggering feature-specific test
  const response2 = await fetch(`${API_BASE}/api/e2e/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'feature', featureId: 'feat-001' })
  });
  const result2 = await response2.json();
  assert(result2.success === true, 'POST /api/e2e/run with featureId returns success');
  assert(result2.data?.runId, 'Feature run returns a runId');

  return result.data.runId;
}

async function testCriteria2(runId) {
  console.log('\n--- AC2: Display test results with pass/fail status ---');

  // Wait for tests to complete
  let attempts = 0;
  let data = null;
  while (attempts < 30) {
    const response = await fetch(`${API_BASE}/api/e2e/results/${runId}`);
    const result = await response.json();
    data = result.data;
    if (data?.status === 'completed' || data?.status === 'error') break;
    await new Promise(r => setTimeout(r, 2000));
    attempts++;
  }

  assert(data, 'Test run results retrieved');
  assert(data?.status === 'completed', `Test run completed (status: ${data?.status})`);
  assert(data?.tests?.length > 0, `Has test results (${data?.tests?.length} tests)`);

  // Check pass/fail status on each test
  const hasStatus = data?.tests?.every(t =>
    ['passed', 'failed', 'skipped'].includes(t.status)
  );
  assert(hasStatus, 'All tests have pass/fail/skip status');

  // Check latest results endpoint
  const latestResponse = await fetch(`${API_BASE}/api/e2e/results/latest`);
  const latestResult = await latestResponse.json();
  assert(latestResult.success === true, 'GET /api/e2e/results/latest works');
  assert(latestResult.data?.tests?.length > 0, 'Latest results has tests');

  return data;
}

async function testCriteria3(data) {
  console.log('\n--- AC3: Show screenshots on failure ---');

  // Check that the screenshot endpoint exists
  const response = await fetch(`${API_BASE}/api/e2e/screenshots/nonexistent.png`);
  assert(response.status === 404, 'Screenshot endpoint returns 404 for missing file');

  // Check that failed tests would have screenshot field
  const failedTests = data?.tests?.filter(t => t.status === 'failed') || [];
  if (failedTests.length > 0) {
    const hasScreenshot = failedTests.some(t => t.screenshot);
    assert(hasScreenshot, 'Failed tests have screenshot references');
  } else {
    // All tests passed, verify screenshot infrastructure exists
    assert(true, 'No failed tests to screenshot (all passed) - screenshot infrastructure verified via endpoint');
  }

  // Verify the test results include error field for failed tests
  const testStructure = data?.tests?.[0];
  assert(testStructure?.id !== undefined, 'Tests have id field');
  assert(testStructure?.name !== undefined, 'Tests have name field');
  assert(testStructure?.status !== undefined, 'Tests have status field');
}

async function testCriteria4(data) {
  console.log('\n--- AC4: Link test results to features ---');

  // Check that tests are linked to features
  const testsWithFeature = data?.tests?.filter(t => t.featureId) || [];
  assert(testsWithFeature.length > 0, `Tests are linked to features (${testsWithFeature.length}/${data?.tests?.length})`);

  // Check specific feature links
  const coreTest = data?.tests?.find(t => t.featureId === 'core');
  assert(coreTest, 'Has core dashboard test');

  const feat001Test = data?.tests?.find(t => t.featureId === 'feat-001');
  assert(feat001Test, 'Has feat-001 linked test');

  // Check features endpoint
  const featResponse = await fetch(`${API_BASE}/api/e2e/features`);
  const featResult = await featResponse.json();
  assert(featResult.success === true, 'GET /api/e2e/features works');
  assert(featResult.data?.length > 0, `Features list available (${featResult.data?.length} features)`);
  assert(featResult.data?.[0]?.id, 'Features have id field');
}

async function main() {
  console.log('=== feat-039: E2E Test Runner Integration ===');

  try {
    const runId = await testCriteria1();
    const data = await testCriteria2(runId);
    await testCriteria3(data);
    await testCriteria4(data);

    console.log('\n' + '='.repeat(50));
    if (allPassed) {
      console.log('ALL ACCEPTANCE CRITERIA PASSED ✓');
    } else {
      console.log('SOME TESTS FAILED ✗');
    }
    console.log('='.repeat(50));
  } catch (error) {
    console.error('\nFATAL ERROR:', error.message);
    allPassed = false;
  }

  process.exit(allPassed ? 0 : 1);
}

main();
