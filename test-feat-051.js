/**
 * Test for feat-051: Real-time Log Streaming
 *
 * Acceptance criteria:
 * 1. WebSocket log streaming
 * 2. Filter by level
 * 3. Search functionality
 */

const puppeteer = require('puppeteer');

const DASHBOARD_URL = 'http://localhost:3000';
const API_BASE = 'http://localhost:3434';

let browser, page;
let assertions = 0;

function assert(condition, message) {
  assertions++;
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function setup() {
  browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`  [Browser Error]: ${msg.text()}`);
  });
}

async function teardown() {
  if (browser) await browser.close();
}

async function testWebSocketLogStreaming() {
  console.log('\n--- Test 1: WebSocket Log Streaming ---');

  // Load dashboard
  await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle2', timeout: 15000 });

  // Check widget exists
  const widget = await page.$('#log-streaming-widget');
  assert(widget !== null, 'Log streaming widget container exists');

  // Check widget rendered
  const widgetContent = await page.$('.ls-widget');
  assert(widgetContent !== null, 'Log streaming widget rendered');

  // Check title
  const title = await page.$eval('.ls-title', el => el.textContent);
  assert(title.includes('Log Streaming'), 'Widget title contains "Log Streaming"');

  // Check connection status element exists
  const connStatus = await page.$('#ls-conn-status');
  assert(connStatus !== null, 'Connection status indicator exists');

  // Generate demo data to ensure there are logs
  const demoRes = await page.evaluate(async (apiBase) => {
    const res = await fetch(`${apiBase}/api/logs/demo`, { method: 'POST' });
    return await res.json();
  }, API_BASE);
  assert(demoRes.success, 'Demo log generation API works');

  // Wait for WebSocket delivery
  await new Promise(r => setTimeout(r, 8000));

  // Check that log entries appear in the output
  const logEntries = await page.$$('.ls-log-entry');
  assert(logEntries.length > 0, `Log entries rendered via WebSocket (got ${logEntries.length})`);

  // Check that entries have proper structure
  const firstEntry = await page.$eval('.ls-log-entry', el => {
    return {
      hasTime: !!el.querySelector('.ls-entry-time'),
      hasLevel: !!el.querySelector('.ls-entry-level'),
      hasSource: !!el.querySelector('.ls-entry-source'),
      hasMessage: !!el.querySelector('.ls-entry-message')
    };
  });
  assert(firstEntry.hasTime, 'Log entry has timestamp');
  assert(firstEntry.hasLevel, 'Log entry has level');
  assert(firstEntry.hasSource, 'Log entry has source');
  assert(firstEntry.hasMessage, 'Log entry has message');

  // Verify stats are updated
  const totalStat = await page.$eval('#ls-stat-total', el => parseInt(el.textContent));
  assert(totalStat > 0, `Stats total shows log count (${totalStat})`);

  // Check connection status (should be connected after WebSocket init)
  const connText = await page.$eval('#ls-conn-status', el => el.textContent);
  assert(connText.includes('Connected'), `WebSocket shows connected status ("${connText}")`);

  console.log('  WebSocket log streaming: PASSED');
}

async function testFilterByLevel() {
  console.log('\n--- Test 2: Filter by Level ---');

  // Get initial count of all entries
  const allEntries = await page.$$('.ls-log-entry');
  const allCount = allEntries.length;
  assert(allCount > 0, `Starting with ${allCount} entries`);

  // Filter by error level
  await page.select('#ls-level-filter', 'error');
  await new Promise(r => setTimeout(r, 500));

  const errorEntries = await page.$$('.ls-log-entry');
  const errorCount = errorEntries.length;

  // Check error entries exist (demo data has errors)
  assert(errorCount > 0, `Error filter shows ${errorCount} entries`);
  assert(errorCount <= allCount, `Error filter reduces entries (${errorCount} <= ${allCount})`);

  // Verify all visible entries are error level
  const visibleLevels = await page.$$eval('.ls-log-entry .ls-entry-level', els =>
    els.map(el => el.textContent.trim().toLowerCase())
  );
  const allError = visibleLevels.every(l => l === 'error');
  assert(allError, 'All visible entries after error filter are error level');

  // Filter by warn (should include error + warn)
  await page.select('#ls-level-filter', 'warn');
  await new Promise(r => setTimeout(r, 500));

  const warnEntries = await page.$$('.ls-log-entry');
  const warnCount = warnEntries.length;
  assert(warnCount >= errorCount, `Warn filter includes errors too (${warnCount} >= ${errorCount})`);

  const warnLevels = await page.$$eval('.ls-log-entry .ls-entry-level', els =>
    els.map(el => el.textContent.trim().toLowerCase())
  );
  const allWarnOrLess = warnLevels.every(l => ['error', 'warn'].includes(l));
  assert(allWarnOrLess, 'Warn filter shows only error and warn entries');

  // Reset to all levels
  await page.select('#ls-level-filter', 'all');
  await new Promise(r => setTimeout(r, 500));

  const resetEntries = await page.$$('.ls-log-entry');
  assert(resetEntries.length >= warnCount, `All filter shows all entries again (${resetEntries.length})`);

  // Verify the level filter dropdown exists with correct options
  const options = await page.$$eval('#ls-level-filter option', opts => opts.map(o => o.value));
  assert(options.includes('all'), 'Level filter has "all" option');
  assert(options.includes('error'), 'Level filter has "error" option');
  assert(options.includes('warn'), 'Level filter has "warn" option');
  assert(options.includes('info'), 'Level filter has "info" option');
  assert(options.includes('debug'), 'Level filter has "debug" option');

  console.log('  Filter by level: PASSED');
}

async function testSearchFunctionality() {
  console.log('\n--- Test 3: Search Functionality ---');

  // Make sure we're showing all entries
  await page.select('#ls-level-filter', 'all');
  await new Promise(r => setTimeout(r, 300));

  const allEntries = await page.$$('.ls-log-entry');
  const allCount = allEntries.length;
  assert(allCount > 0, `Starting with ${allCount} entries for search test`);

  // Search for a known term from demo data
  const searchInput = await page.$('#ls-search-input');
  assert(searchInput !== null, 'Search input exists');

  await searchInput.click();
  await searchInput.type('Redis');
  await new Promise(r => setTimeout(r, 500));

  const searchResults = await page.$$('.ls-log-entry');
  const searchCount = searchResults.length;
  assert(searchCount > 0, `Search for "Redis" found ${searchCount} entries`);
  assert(searchCount < allCount, `Search reduces visible entries (${searchCount} < ${allCount})`);

  // Check that search highlights exist
  const highlights = await page.$$('.ls-highlight');
  assert(highlights.length > 0, `Search highlights found (${highlights.length})`);

  // Clear search
  const clearBtn = await page.$('#ls-search-clear');
  assert(clearBtn !== null, 'Search clear button exists');
  await clearBtn.click();
  await new Promise(r => setTimeout(r, 500));

  const afterClear = await page.$$('.ls-log-entry');
  assert(afterClear.length >= searchCount, `Clearing search restores entries (${afterClear.length})`);

  // Search for non-existent term
  await searchInput.click();
  await searchInput.type('xyznonexistent123');
  await new Promise(r => setTimeout(r, 500));

  const noResults = await page.$$('.ls-log-entry');
  assert(noResults.length === 0, 'Search for non-existent term shows no entries');

  // Check empty state message
  const emptyState = await page.$('.ls-empty-state');
  assert(emptyState !== null, 'Empty state shown when no matches');

  // Clear search again
  await clearBtn.click();
  await new Promise(r => setTimeout(r, 300));

  console.log('  Search functionality: PASSED');
}

async function runTests() {
  console.log('=== feat-051: Real-Time Log Streaming Tests ===');

  try {
    await setup();
    await testWebSocketLogStreaming();
    await testFilterByLevel();
    await testSearchFunctionality();

    console.log(`\n=== ALL TESTS PASSED (${assertions} assertions) ===`);
    process.exit(0);
  } catch (error) {
    console.error(`\n=== TEST FAILED: ${error.message} ===`);
    process.exit(1);
  } finally {
    await teardown();
  }
}

runTests();
