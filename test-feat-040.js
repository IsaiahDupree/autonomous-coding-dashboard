/**
 * Test script for feat-040: Test Coverage Dashboard
 * Tests all 4 acceptance criteria:
 * 1. Shows which features have tests
 * 2. Displays coverage percentage per category
 * 3. Highlights features without tests
 * 4. Links to test files
 */

const puppeteer = require('puppeteer');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.log(`  FAIL: ${message}`);
    failed++;
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  console.log('Loading dashboard...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 15000 });

  // Wait for widget to render
  await page.waitForSelector('#test-coverage-widget .card', { timeout: 10000 });
  // Wait for data to load (loading spinner disappears)
  await page.waitForFunction(() => {
    const loading = document.getElementById('tc-loading');
    return loading && loading.style.display === 'none';
  }, { timeout: 10000 });

  console.log('\n--- Acceptance Criteria 1: Shows which features have tests ---');

  const title = await page.$eval('#test-coverage-widget .card-title', el => el.textContent);
  assert(title === 'Test Coverage', `Widget title is "Test Coverage" (got "${title}")`);

  const summary = await page.$eval('#tc-summary-text', el => el.textContent);
  assert(summary.includes('/120 features have tests'), `Summary shows features with tests: "${summary}"`);

  const coveredRows = await page.$$('.tc-row-covered');
  assert(coveredRows.length > 0, `Has ${coveredRows.length} covered feature rows`);

  const tableRows = await page.$$('#tc-table-body tr');
  assert(tableRows.length === 120, `Shows all 120 features in table (got ${tableRows.length})`);

  // Check that covered features show check marks
  const coveredIcons = await page.$$('.tc-icon-covered');
  assert(coveredIcons.length > 0, `Has ${coveredIcons.length} covered status icons`);

  console.log('\n--- Acceptance Criteria 2: Displays coverage percentage per category ---');

  const overallPct = await page.$eval('#tc-overall-pct', el => el.textContent);
  assert(overallPct.includes('%'), `Overall percentage shown: "${overallPct}"`);

  const overallFill = await page.$eval('#tc-overall-fill', el => el.style.width);
  assert(overallFill !== '0%', `Progress bar has width: "${overallFill}"`);

  const catCards = await page.$$('.tc-cat-card');
  assert(catCards.length > 10, `Has ${catCards.length} category cards (expected > 10)`);

  // Check category cards show percentages
  const catPcts = await page.$$eval('.tc-cat-pct', els => els.map(el => el.textContent));
  assert(catPcts.every(p => p.includes('%')), `All ${catPcts.length} categories show percentage`);

  // Check progress bars in categories
  const catBars = await page.$$('.tc-progress-sm .tc-progress-fill');
  assert(catBars.length > 0, `Category progress bars exist (${catBars.length})`);

  // Check 100% categories have green (tc-high) class
  const highCats = await page.$$('.tc-cat-pct.tc-high');
  assert(highCats.length > 0, `Some categories marked as high coverage (${highCats.length})`);

  console.log('\n--- Acceptance Criteria 3: Highlights features without tests ---');

  const uncoveredRows = await page.$$('.tc-row-uncovered');
  assert(uncoveredRows.length > 0, `Has ${uncoveredRows.length} uncovered (highlighted) feature rows`);

  const uncoveredIcons = await page.$$('.tc-icon-uncovered');
  assert(uncoveredIcons.length > 0, `Has ${uncoveredIcons.length} uncovered status icons (X marks)`);

  const noTestsLabels = await page.$$('.tc-no-tests');
  assert(noTestsLabels.length > 0, `Has ${noTestsLabels.length} "No test files" labels`);

  // Test the filter for uncovered features
  await page.select('#tc-filter-coverage', 'uncovered');
  await new Promise(r => setTimeout(r, 300));
  const filteredUncoveredRows = await page.$$('.tc-row-uncovered');
  const filteredCoveredRows = await page.$$('.tc-row-covered');
  assert(filteredCoveredRows.length === 0, `Filter "Without Tests" hides covered rows (${filteredCoveredRows.length} shown)`);
  assert(filteredUncoveredRows.length > 0, `Filter "Without Tests" shows uncovered rows (${filteredUncoveredRows.length})`);

  // Reset
  await page.select('#tc-filter-coverage', 'all');
  await new Promise(r => setTimeout(r, 300));

  console.log('\n--- Acceptance Criteria 4: Links to test files ---');

  const fileLinks = await page.$$('.tc-file-link');
  assert(fileLinks.length > 0, `Has ${fileLinks.length} test file links`);

  // Check file links have paths
  const firstLinkPath = await page.$eval('.tc-file-link', el => el.dataset.path);
  assert(firstLinkPath && firstLinkPath.length > 0, `File link has path: "${firstLinkPath}"`);

  // Check file links display filenames
  const firstLinkText = await page.$eval('.tc-file-link', el => el.textContent);
  assert(firstLinkText.includes('test-feat-'), `File link shows filename: "${firstLinkText}"`);

  // Test category filter
  await page.select('#tc-filter-category', 'core');
  await new Promise(r => setTimeout(r, 300));
  const coreRows = await page.$$('#tc-table-body tr');
  assert(coreRows.length === 4, `Category filter "core" shows 4 features (got ${coreRows.length})`);

  // Reset
  await page.select('#tc-filter-category', 'all');

  console.log('\n--- Additional Checks ---');

  // Check no page errors
  const widgetErrors = errors.filter(e => e.includes('coverage') || e.includes('tc-'));
  assert(widgetErrors.length === 0, `No console errors related to widget (${widgetErrors.length} found)`);

  // Check refresh button exists
  const refreshBtn = await page.$('#btn-tc-refresh');
  assert(refreshBtn !== null, 'Refresh button exists');

  await browser.close();

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} total`);
  console.log(`========================================`);

  process.exit(failed > 0 ? 1 : 0);
})();
