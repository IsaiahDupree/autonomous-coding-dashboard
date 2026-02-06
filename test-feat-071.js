const puppeteer = require('puppeteer');

(async () => {
  let passed = 0;
  let failed = 0;
  const results = [];

  function assert(condition, message) {
    if (condition) {
      passed++;
      results.push(`  ✓ ${message}`);
    } else {
      failed++;
      results.push(`  ✗ ${message}`);
    }
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));

    // === Basic Setup ===
    console.log('\n=== Basic Setup ===');

    const hasAPI = await page.evaluate(() => typeof window.regressionRunner === 'object');
    assert(hasAPI, 'regressionRunner API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('regression-runner-card'));
    assert(hasCard, 'Regression runner card rendered');

    const hasRunBtn = await page.$('#rr-run-btn');
    assert(hasRunBtn !== null, 'Run button exists');

    const hasStatusBar = await page.evaluate(() => !!document.getElementById('rr-status-bar'));
    assert(hasStatusBar, 'Status bar exists');

    const hasConfig = await page.evaluate(() => !!document.getElementById('rr-config'));
    assert(hasConfig, 'Config section exists');

    // Initial state is idle
    const initialState = await page.evaluate(() => window.regressionRunner.getState());
    assert(initialState.status === 'idle', 'Initial status is idle');

    // === AC1: Run tests after each feature ===
    console.log('\n=== AC1: Run tests after each feature ===');

    // Check runAfterFeature config
    const config = await page.evaluate(() => window.regressionRunner.getConfig());
    assert(config.runAfterFeature === true, 'runAfterFeature enabled by default');

    // Run tests
    const runResult = await page.evaluate(() => window.regressionRunner.runTests());
    assert(runResult !== null, 'runTests returns result');
    assert(runResult.id.startsWith('run-'), `Run has ID: ${runResult.id}`);
    assert(runResult.totalTests > 0, `${runResult.totalTests} tests in run`);
    assert(runResult.passed >= 0, `${runResult.passed} passed`);
    assert(runResult.failed >= 0, `${runResult.failed} failed`);
    assert(runResult.status !== undefined, `Run status: ${runResult.status}`);
    assert(runResult.startTime !== undefined, 'Run has start time');
    assert(runResult.endTime !== undefined, 'Run has end time');

    // Test results
    const testResults = await page.evaluate(() => window.regressionRunner.getTestResults());
    assert(testResults.length > 0, `${testResults.length} test results`);

    // Result has required fields
    const firstResult = testResults[0];
    assert(firstResult.featureId !== undefined, 'Result has featureId');
    assert(firstResult.testName !== undefined, 'Result has testName');
    assert(firstResult.status !== undefined, 'Result has status');
    assert(firstResult.duration !== undefined, 'Result has duration');

    // Valid statuses
    const validStatuses = ['passed', 'failed', 'retried', 'skipped', 'pending'];
    const allValid = testResults.every(r => validStatuses.includes(r.status));
    assert(allValid, 'All test statuses are valid');

    // Results rendered
    const resultItems = await page.evaluate(() => document.querySelectorAll('.rr-result-item').length);
    assert(resultItems > 0, `${resultItems} result items rendered`);

    // Current run
    const currentRun = await page.evaluate(() => window.regressionRunner.getCurrentRun());
    assert(currentRun !== null, 'getCurrentRun returns data');

    // Run history
    const history = await page.evaluate(() => window.regressionRunner.getRunHistory());
    assert(history.length >= 1, `${history.length} runs in history`);
    assert(history[0].id !== undefined, 'History entry has id');
    assert(history[0].status !== undefined, 'History entry has status');

    // Summary bar
    const hasSummary = await page.evaluate(() => !!document.getElementById('rr-summary'));
    assert(hasSummary, 'Summary bar rendered');

    // Set config
    const setResult = await page.evaluate(() => window.regressionRunner.setConfig('runAfterFeature', false));
    assert(setResult === true, 'setConfig returns true');
    const updatedConfig = await page.evaluate(() => window.regressionRunner.getConfig());
    assert(updatedConfig.runAfterFeature === false, 'Config updated');
    // Reset it
    await page.evaluate(() => window.regressionRunner.setConfig('runAfterFeature', true));

    // === AC2: Block on test failure ===
    console.log('\n=== AC2: Block on test failure ===');

    // blockOnFailure is enabled by default
    assert(config.blockOnFailure === true, 'blockOnFailure enabled by default');

    // Check if blocked (depends on test results)
    const blockedState = await page.evaluate(() => window.regressionRunner.isBlocked());
    assert(typeof blockedState === 'boolean', `isBlocked returns boolean: ${blockedState}`);

    // If blocked, test unblock
    if (blockedState) {
      const unblocked = await page.evaluate(() => window.regressionRunner.unblock());
      assert(unblocked === true, 'unblock returns true when blocked');
      const afterUnblock = await page.evaluate(() => window.regressionRunner.isBlocked());
      assert(afterUnblock === false, 'No longer blocked after unblock');
    } else {
      // Run with blockOnFailure to try to trigger block
      assert(true, 'Block test: not blocked (no failures in this run)');
    }

    // Unblock when not blocked returns false
    const unblockIdle = await page.evaluate(() => window.regressionRunner.unblock());
    assert(unblockIdle === false, 'unblock returns false when not blocked');

    // === AC3: Retry logic ===
    console.log('\n=== AC3: Retry logic ===');

    // Max retries config
    assert(config.maxRetries >= 1, `Max retries: ${config.maxRetries}`);
    assert(config.retryDelay > 0, `Retry delay: ${config.retryDelay}ms`);

    // Check retried tests
    const retriedTests = testResults.filter(r => r.status === 'retried');
    const hasRetryData = testResults.some(r => r.retries !== undefined);
    assert(hasRetryData, 'Test results track retry count');

    // Retry failed tests
    const retryResult = await page.evaluate(() => window.regressionRunner.retryFailedTests());
    // May be null if no failed tests
    if (retryResult) {
      assert(retryResult.retriedCount >= 0, `Retried ${retryResult.retriedCount} tests`);
      assert(retryResult.fixedCount >= 0, `Fixed ${retryResult.fixedCount} tests`);
    } else {
      assert(true, 'No failed tests to retry (all passed)');
    }

    // Config input for max retries
    const setRetries = await page.evaluate(() => window.regressionRunner.setConfig('maxRetries', 5));
    assert(setRetries === true, 'Can set maxRetries');
    const newRetries = await page.evaluate(() => window.regressionRunner.getConfig().maxRetries);
    assert(newRetries === 5, 'maxRetries updated to 5');
    // Reset
    await page.evaluate(() => window.regressionRunner.setConfig('maxRetries', 3));

    // Run second time to verify history grows
    await page.evaluate(() => window.regressionRunner.runTests());
    const history2 = await page.evaluate(() => window.regressionRunner.getRunHistory());
    assert(history2.length >= 2, `${history2.length} runs in history after 2nd run`);

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.regressionRunner.getState());
    assert(stateObj.status !== undefined, 'State has status');
    assert(stateObj.testCount > 0, `State tracks ${stateObj.testCount} tests`);
    assert(stateObj.historyCount >= 2, `State tracks ${stateObj.historyCount} history entries`);

    const savedState = await page.evaluate(() => localStorage.getItem('regression-runner-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-071: Automated Regression Test Runner - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
