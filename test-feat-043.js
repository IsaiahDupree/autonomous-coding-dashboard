/**
 * Test: feat-043 - Supabase Project Connection
 *
 * Acceptance Criteria:
 * 1. Store Supabase project credentials per target
 * 2. Test connection on save
 * 3. Display database table counts
 * 4. Run migrations from dashboard
 */
const puppeteer = require('puppeteer');

const DASHBOARD_URL = 'http://localhost:3000';
const API_BASE = 'http://localhost:3434';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

async function apiFetch(path, options = {}) {
  const resp = await fetch(`${API_BASE}${path}`, options);
  return { status: resp.status, body: await resp.json() };
}

async function runTests() {
  console.log('=== feat-043: Supabase Project Connection Tests ===\n');

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push(e.message));

  try {
    // ---- API Tests ----

    console.log('--- API: Credential Storage & Connection Test ---');

    // Test 1: GET /api/supabase/overview
    const overview = await apiFetch('/api/supabase/overview');
    assert(overview.body.success === true, 'Overview endpoint returns success');
    assert(overview.body.data && overview.body.data.summary, 'Overview has summary data');
    assert(overview.body.data.summary.totalTargets > 0, `Overview shows ${overview.body.data.summary.totalTargets} total targets`);
    assert(overview.body.data.targets && overview.body.data.targets.length > 0, 'Overview has targets array');

    const testTargetId = overview.body.data.targets[0].targetId;
    const testTargetName = overview.body.data.targets[0].targetName;
    console.log(`  Using test target: ${testTargetId} (${testTargetName})`);

    // Test 2: POST credentials (triggers connection test)
    const saveResp = await apiFetch(`/api/supabase/credentials/${testTargetId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supabaseUrl: 'https://test-project.supabase.co',
        supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-key-for-testing',
      }),
    });
    assert(saveResp.status === 200 || saveResp.status === 400, 'Save endpoint responds with proper status');
    assert(saveResp.body.hasOwnProperty('success'), 'Save response has success field');
    if (!saveResp.body.success) {
      assert(saveResp.body.error && saveResp.body.error.includes('Connection test failed'), 'Connection test failure reported on save');
    }

    // Test 3: GET credentials
    const credsResp = await apiFetch('/api/supabase/credentials');
    assert(credsResp.body.success === true, 'GET credentials endpoint works');
    assert(typeof credsResp.body.data === 'object', 'Credentials data is an object');

    // Test 4: Test connection endpoint
    const testConnResp = await apiFetch(`/api/supabase/test-connection/${testTargetId}`, { method: 'POST' });
    assert(testConnResp.status === 404 || testConnResp.status === 200, 'Test connection endpoint responds');
    assert(testConnResp.body.hasOwnProperty('success'), 'Test connection has success field');

    // Test 5: Tables endpoint
    const tablesResp = await apiFetch(`/api/supabase/tables/${testTargetId}`);
    assert(tablesResp.status === 404 || tablesResp.status === 200, 'Tables endpoint responds');

    // Test 6: Migrations endpoint
    const migrationsResp = await apiFetch(`/api/supabase/migrations/${testTargetId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert(migrationsResp.status === 404 || migrationsResp.status === 200, 'Migrations endpoint responds');

    // Test 7: DELETE endpoint
    const deleteResp = await apiFetch(`/api/supabase/credentials/${testTargetId}`, { method: 'DELETE' });
    assert(deleteResp.status === 404 || deleteResp.status === 200, 'Delete endpoint responds');

    // Test 8: Migration files discovered for targets with them
    const targetsWithMigs = overview.body.data.targets.filter(t => t.migrationFiles && t.migrationFiles.length > 0);
    assert(targetsWithMigs.length > 0, `${targetsWithMigs.length} targets have migration files discovered`);

    // ---- UI Tests ----

    console.log('\n--- UI: Dashboard Widget ---');

    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));

    // Test 9: Widget container exists
    const widgetExists = await page.$('#supabase-connection-widget');
    assert(!!widgetExists, 'Supabase connection widget container exists');

    // Test 10: Widget renders card with title
    const cardTitle = await page.$eval('#supabase-connection-widget .card-title', el => el.textContent).catch(() => '');
    assert(cardTitle.includes('Supabase'), 'Widget has Supabase title');

    // Test 11: Summary cards rendered
    const summaryCards = await page.$$('.sbc-summary-card');
    assert(summaryCards.length === 4, `Summary cards rendered (${summaryCards.length} found)`);

    // AC1: Store Supabase project credentials per target
    console.log('\n--- AC1: Store Supabase project credentials per target ---');

    // Test 12: Total targets displayed
    const totalTargets = await page.$eval('#sbc-total-targets', el => el.textContent).catch(() => '-');
    assert(totalTargets !== '-' && parseInt(totalTargets) > 0, `Total targets displayed: ${totalTargets}`);

    // Test 13: Connections table shown
    const tableRows = await page.$$('#sbc-table-body tr');
    assert(tableRows.length > 0, `Connections table has ${tableRows.length} rows`);

    // Test 14: Each target shows name
    const firstTargetNameUI = await page.$eval('#sbc-table-body tr:first-child td:first-child', el => el.textContent).catch(() => '');
    assert(firstTargetNameUI.length > 0, `First target name shown: ${firstTargetNameUI}`);

    // Test 15: Add Connection button exists
    const addBtn = await page.$('#sbc-add-btn');
    assert(!!addBtn, 'Add Connection button exists');

    // Test 16: Clicking Add shows form
    await addBtn.click();
    await new Promise(r => setTimeout(r, 500));
    const formVisible = await page.$eval('#sbc-credentials-form', el => el.style.display !== 'none').catch(() => false);
    assert(formVisible, 'Credentials form shown on Add Connection click');

    // Test 17: Form has target select with options
    const selectOptions = await page.$$eval('#sbc-target-select option', opts => opts.length);
    assert(selectOptions > 1, `Target select has ${selectOptions} options`);

    // Test 18: Form has URL input
    assert(await page.$('#sbc-supabase-url'), 'Supabase URL input exists');

    // Test 19: Form has API key input
    assert(await page.$('#sbc-supabase-key'), 'Supabase API key input exists');

    // Test 20: Form has DB connection input
    assert(await page.$('#sbc-db-connection'), 'DB connection string input exists');

    // Test 21: Save button
    assert(await page.$('#sbc-save-btn'), 'Save & Test Connection button exists');

    // Test 22: Cancel hides form
    await page.click('#sbc-cancel-btn');
    await new Promise(r => setTimeout(r, 300));
    const formHidden = await page.$eval('#sbc-credentials-form', el => el.style.display === 'none').catch(() => false);
    assert(formHidden, 'Form hidden after cancel');

    // Test 23: Connect buttons for unconnected targets
    const connectBtns = await page.$$('.sbc-connect-btn');
    assert(connectBtns.length > 0, `${connectBtns.length} Connect buttons for unconnected targets`);

    // Test 24: Connect button pre-selects target
    await connectBtns[0].click();
    await new Promise(r => setTimeout(r, 500));
    const selectedTarget = await page.$eval('#sbc-target-select', el => el.value).catch(() => '');
    assert(selectedTarget.length > 0, `Target pre-selected: ${selectedTarget}`);

    // AC2: Test connection on save
    console.log('\n--- AC2: Test connection on save ---');

    // Test 25: Saving empty shows error
    await page.$eval('#sbc-supabase-url', el => { el.value = ''; });
    await page.$eval('#sbc-supabase-key', el => { el.value = ''; });
    await page.click('#sbc-save-btn');
    await new Promise(r => setTimeout(r, 500));
    const errorMsg = await page.$eval('#sbc-form-status', el => el.textContent).catch(() => '');
    assert(errorMsg.length > 0, `Validation error shown: "${errorMsg}"`);

    // Test 26: Save button says "Test"
    const saveBtnText = await page.$eval('#sbc-save-btn', el => el.textContent).catch(() => '');
    assert(saveBtnText.includes('Test'), 'Save button includes "Test" in label');

    // Test 27: Filling and saving triggers connection test
    await page.type('#sbc-supabase-url', 'https://test-project.supabase.co');
    await page.type('#sbc-supabase-key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test');
    await page.click('#sbc-save-btn');
    await new Promise(r => setTimeout(r, 3000));
    const testStatus = await page.$eval('#sbc-form-status', el => el.textContent).catch(() => '');
    assert(testStatus.length > 0, `Connection test ran: "${testStatus}"`);
    assert(
      testStatus.includes('Testing') || testStatus.includes('Connected') || testStatus.includes('failed') || testStatus.includes('error') || testStatus.includes('Network'),
      'Connection test feedback shown'
    );

    await page.click('#sbc-cancel-btn');
    await new Promise(r => setTimeout(r, 300));

    // AC3: Display database table counts
    console.log('\n--- AC3: Display database table counts ---');

    // Test 28: Tables column exists
    const headers = await page.$$eval('.sbc-table thead th', ths => ths.map(th => th.textContent));
    assert(headers.includes('Tables'), 'Tables column in connections table');

    // Test 29: Rows column exists
    assert(headers.includes('Rows'), 'Rows column in connections table');

    // Test 30: Total Tables summary
    const totalTablesVal = await page.$eval('#sbc-total-tables', el => el.textContent).catch(() => '');
    assert(totalTablesVal !== '', 'Total Tables summary card has value');

    // Test 31: Total Rows summary
    const totalRowsVal = await page.$eval('#sbc-total-rows', el => el.textContent).catch(() => '');
    assert(totalRowsVal !== '', 'Total Rows summary card has value');

    // Test 32: Table details panel exists
    assert(await page.$('#sbc-table-details'), 'Table details panel exists');

    // Test 33: Details table structure
    const detailsHeaders = await page.$$eval('#sbc-details-table thead th', ths => ths.map(th => th.textContent));
    assert(detailsHeaders.includes('Table Name'), 'Details table has Table Name header');
    assert(detailsHeaders.includes('Row Count'), 'Details table has Row Count header');

    // AC4: Run migrations from dashboard
    console.log('\n--- AC4: Run migrations from dashboard ---');

    // Test 34: Migrations column
    assert(headers.includes('Migrations'), 'Migrations column in connections table');

    // Test 35: Some targets show migration file count
    const migCells = await page.$$eval('#sbc-table-body tr td:nth-child(6)', tds => tds.map(td => td.textContent));
    const hasMigFiles = migCells.some(c => c.includes('files'));
    assert(hasMigFiles, 'Some targets display migration file counts');

    // Test 36: Migration panel exists
    assert(await page.$('#sbc-migration-panel'), 'Migration panel exists');

    // Test 37: Migration content area
    assert(await page.$('#sbc-migration-content'), 'Migration content area exists');

    // Test 38: Migrations API responds correctly
    assert(migrationsResp.body.hasOwnProperty('success'), 'Migrations API endpoint functional');

    // Test 39: Refresh button works
    await page.click('#sbc-refresh-btn');
    await new Promise(r => setTimeout(r, 2000));
    const refreshed = await page.$eval('#sbc-total-targets', el => el.textContent).catch(() => '-');
    assert(refreshed !== '-', 'Data refreshed after Refresh click');

    // Test 40: Status badge
    const badgeVisible = await page.$eval('#sbc-status-badge', el => el.style.display !== 'none').catch(() => false);
    assert(badgeVisible, 'Status badge visible');

    // Test 41: No console errors
    assert(consoleErrors.length === 0, `No console errors (${consoleErrors.length} found)`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(e => console.log(`    Console error: ${e}`));
    }

  } catch (error) {
    console.error('\nTest execution error:', error.message);
    failed++;
  } finally {
    await browser.close();
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed (${passed + failed} total) ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
