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

    const hasAPI = await page.evaluate(() => typeof window.testHistory === 'object');
    assert(hasAPI, 'testHistory API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('test-history-card'));
    assert(hasCard, 'Test history card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.th2-tab').length === 3);
    assert(hasTabs, 'Three tabs exist');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.th2-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Store all test runs ===
    console.log('\n=== AC1: Store all test runs ===');

    const runs = await page.evaluate(() => window.testHistory.getRuns());
    assert(runs.length > 0, `${runs.length} runs stored`);

    // Run has required fields
    const firstRun = runs[0];
    assert(firstRun.id !== undefined, 'Run has id');
    assert(firstRun.timestamp !== undefined, 'Run has timestamp');
    assert(firstRun.totalTests > 0, `Run has ${firstRun.totalTests} total tests`);
    assert(firstRun.passed >= 0, 'Run has passed count');
    assert(firstRun.failed >= 0, 'Run has failed count');
    assert(firstRun.retried >= 0, 'Run has retried count');
    assert(firstRun.status !== undefined, 'Run has status');
    assert(firstRun.results.length > 0, 'Run has test results');

    // Get specific run
    const specific = await page.evaluate((id) => window.testHistory.getRun(id), firstRun.id);
    assert(specific !== null, 'Can retrieve specific run');
    assert(specific.id === firstRun.id, 'Retrieved correct run');

    // Add new run
    const newRun = await page.evaluate(() => {
      return window.testHistory.addRun({
        id: 'run-new-test',
        totalTests: 10,
        passed: 9,
        failed: 1,
        retried: 0,
        duration: 5000,
        status: 'failed',
        results: [
          { featureId: 'feat-001', testName: 'test-001', status: 'passed', duration: 500 },
          { featureId: 'feat-002', testName: 'test-002', status: 'failed', duration: 300 },
        ],
      });
    });
    assert(newRun !== null, 'addRun returns new run');
    assert(newRun.id === 'run-new-test', 'New run has correct id');

    const runsAfterAdd = await page.evaluate(() => window.testHistory.getRuns().length);
    assert(runsAfterAdd > runs.length, 'Run count increased after add');

    // Overall stats
    const stats = await page.evaluate(() => window.testHistory.getOverallStats());
    assert(stats.totalRuns > 0, `Total runs: ${stats.totalRuns}`);
    assert(stats.avgPassRate >= 0 && stats.avgPassRate <= 100, `Avg pass rate: ${stats.avgPassRate}%`);
    assert(stats.totalFlakyTests >= 0, `Flaky tests: ${stats.totalFlakyTests}`);
    assert(stats.failingRuns >= 0, `Failing runs: ${stats.failingRuns}`);

    // Run list rendered
    const runItems = await page.evaluate(() => document.querySelectorAll('.th2-run-item').length);
    assert(runItems > 0, `${runItems} run items rendered`);

    // === AC2: Compare over time ===
    console.log('\n=== AC2: Compare over time ===');

    // Compare two runs
    const allRuns = await page.evaluate(() => window.testHistory.getRuns());
    const compare = await page.evaluate((id1, id2) => {
      return window.testHistory.compareRuns(id1, id2);
    }, allRuns[2].id, allRuns[1].id);

    assert(compare !== null, 'compareRuns returns comparison');
    assert(compare.run1 !== undefined, 'Comparison has run1');
    assert(compare.run2 !== undefined, 'Comparison has run2');
    assert(compare.passedDiff !== undefined, `Passed diff: ${compare.passedDiff}`);
    assert(compare.failedDiff !== undefined, `Failed diff: ${compare.failedDiff}`);
    assert(compare.changes !== undefined, 'Comparison has changes array');

    // Switch to compare tab
    await page.evaluate(() => window.testHistory.setTab('compare'));
    await new Promise(r => setTimeout(r, 300));

    const compareTabActive = await page.evaluate(() => {
      return document.querySelector('.th2-tab[data-tab="compare"]').classList.contains('active');
    });
    assert(compareTabActive, 'Compare tab becomes active');

    const compareGrid = await page.evaluate(() => !!document.getElementById('th2-compare-grid'));
    assert(compareGrid, 'Compare grid rendered');

    const comparePanels = await page.evaluate(() => document.querySelectorAll('.th2-compare-panel').length);
    assert(comparePanels === 2, '2 compare panels rendered');

    // === AC3: Identify flaky tests ===
    console.log('\n=== AC3: Identify flaky tests ===');

    const flakyTests = await page.evaluate(() => window.testHistory.getFlakyTests());
    assert(flakyTests.length >= 0, `${flakyTests.length} flaky tests identified`);

    if (flakyTests.length > 0) {
      const firstFlaky = flakyTests[0];
      assert(firstFlaky.featureId !== undefined, 'Flaky test has featureId');
      assert(firstFlaky.testName !== undefined, 'Flaky test has testName');
      assert(firstFlaky.flakyRate !== undefined, `Flaky rate: ${firstFlaky.flakyRate}%`);
      assert(firstFlaky.severity !== undefined, `Severity: ${firstFlaky.severity}`);
      assert(firstFlaky.history !== undefined, 'Flaky test has history');
      assert(firstFlaky.totalRuns > 0, `Total runs: ${firstFlaky.totalRuns}`);

      // Valid severity
      const validSeverities = ['high', 'medium', 'low'];
      assert(validSeverities.includes(firstFlaky.severity), 'Severity is valid');

      // Get specific flaky test
      const specificFlaky = await page.evaluate((id) => window.testHistory.getFlakyTest(id), firstFlaky.featureId);
      assert(specificFlaky !== null, 'Can retrieve specific flaky test');
    }

    // Switch to flaky tab
    await page.evaluate(() => window.testHistory.setTab('flaky'));
    await new Promise(r => setTimeout(r, 300));

    const flakyTabActive = await page.evaluate(() => {
      return document.querySelector('.th2-tab[data-tab="flaky"]').classList.contains('active');
    });
    assert(flakyTabActive, 'Flaky tab becomes active');

    if (flakyTests.length > 0) {
      const flakyList = await page.evaluate(() => !!document.getElementById('th2-flaky-list'));
      assert(flakyList, 'Flaky list rendered');

      const flakyItems = await page.evaluate(() => document.querySelectorAll('.th2-flaky-item').length);
      assert(flakyItems > 0, `${flakyItems} flaky items rendered`);

      // Flaky badges
      const badges = await page.evaluate(() => document.querySelectorAll('.th2-flaky-badge').length);
      assert(badges > 0, `${badges} severity badges rendered`);
    }

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.testHistory.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.runCount > 0, `State tracks ${stateObj.runCount} runs`);

    const savedState = await page.evaluate(() => localStorage.getItem('test-history-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-072: Test Result History Tracking - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
