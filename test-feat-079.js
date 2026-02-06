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

    const hasAPI = await page.evaluate(() => typeof window.auditLog === 'object');
    assert(hasAPI, 'auditLog API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('audit-log-card'));
    assert(hasCard, 'Audit log card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.al-tab').length === 3);
    assert(hasTabs, 'Three tabs exist (Activity Log, User Summary, Export)');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.al-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Log all user actions ===
    console.log('\n=== AC1: Log all user actions ===');

    const entries = await page.evaluate(() => window.auditLog.getEntries());
    assert(entries.length > 0, `${entries.length} log entries`);
    assert(entries.length === 50, 'Has 50 sample entries');

    const first = entries[0];
    assert(first.id !== undefined, 'Entry has id');
    assert(first.action !== undefined, 'Entry has action');
    assert(first.actionLabel !== undefined, 'Entry has actionLabel');
    assert(first.category !== undefined, 'Entry has category');
    assert(first.description !== undefined, 'Entry has description');
    assert(first.severity !== undefined, `Entry severity: ${first.severity}`);
    assert(first.metadata !== undefined, 'Entry has metadata');

    // Get specific entry
    const specific = await page.evaluate((id) => window.auditLog.getEntry(id), first.id);
    assert(specific !== null, 'Can retrieve specific entry');
    assert(specific.id === first.id, 'Retrieved correct entry');

    // Log a new action
    const newId = await page.evaluate(() => {
      return window.auditLog.logAction('feature.start', 'Started feat-999 implementation', 'Test User', { featureId: 'feat-999' });
    });
    assert(newId !== undefined, `New action logged with id`);

    const afterLog = await page.evaluate(() => window.auditLog.getEntries());
    assert(afterLog.length === 51, 'Entry count increased to 51');
    assert(afterLog[0].action === 'feature.start', 'New entry is first (most recent)');
    assert(afterLog[0].description === 'Started feat-999 implementation', 'New entry has correct description');

    // Filter by category
    const featureEntries = await page.evaluate(() => window.auditLog.getEntries({ category: 'feature' }));
    assert(featureEntries.length > 0, `${featureEntries.length} feature entries`);
    const allFeature = featureEntries.every(e => e.category === 'feature');
    assert(allFeature, 'All filtered entries are feature category');

    // Filter by severity
    const errorEntries = await page.evaluate(() => window.auditLog.getEntries({ severity: 'error' }));
    assert(errorEntries.length > 0, `${errorEntries.length} error entries`);
    const allErrors = errorEntries.every(e => e.severity === 'error');
    assert(allErrors, 'All severity-filtered entries are errors');

    // Filter by user
    const userEntries = await page.evaluate(() => window.auditLog.getEntries({ user: 'Admin' }));
    assert(userEntries.length > 0, `${userEntries.length} Admin entries`);
    const allAdmin = userEntries.every(e => e.user === 'Admin');
    assert(allAdmin, 'All user-filtered entries are from Admin');

    // Filter with limit
    const limitedEntries = await page.evaluate(() => window.auditLog.getEntries({ limit: 5 }));
    assert(limitedEntries.length === 5, 'Limit filter works');

    // Categories
    const categories = await page.evaluate(() => window.auditLog.getCategories());
    assert(categories.length > 0, `${categories.length} categories`);
    assert(categories[0].name !== undefined, 'Category has name');
    assert(categories[0].count > 0, 'Category has count');

    // Log list rendered
    const logList = await page.evaluate(() => !!document.getElementById('al-log-list'));
    assert(logList, 'Log list rendered in DOM');

    const logItems = await page.evaluate(() => document.querySelectorAll('.al-log-item').length);
    assert(logItems > 0, `${logItems} log items rendered`);

    // Filter chips
    const filterChips = await page.evaluate(() => document.querySelectorAll('.al-filter-chip').length);
    assert(filterChips > 0, `${filterChips} filter chips rendered`);

    // === AC2: Timestamp and user tracking ===
    console.log('\n=== AC2: Timestamp and user tracking ===');

    assert(first.user !== undefined, 'Entry has user name');
    assert(first.userRole !== undefined, 'Entry has user role');
    assert(first.userIp !== undefined, 'Entry has user IP');
    assert(first.timestamp !== undefined, 'Entry has timestamp');

    // Valid timestamp
    const tsDate = new Date(first.timestamp);
    assert(!isNaN(tsDate.getTime()), 'Timestamp is valid date');

    // User summary
    const userSummary = await page.evaluate(() => window.auditLog.getUserSummary());
    assert(userSummary.length > 0, `${userSummary.length} users in summary`);

    const firstUser = userSummary[0];
    assert(firstUser.name !== undefined, 'User summary has name');
    assert(firstUser.role !== undefined, 'User summary has role');
    assert(firstUser.actionCount > 0, `User has ${firstUser.actionCount} actions`);
    assert(firstUser.percentage > 0, `User percentage: ${firstUser.percentage}%`);
    assert(firstUser.lastAction !== undefined, 'User has lastAction timestamp');
    assert(firstUser.categories !== undefined, 'User has action categories');
    assert(Object.keys(firstUser.categories).length > 0, 'User has category breakdown');

    // Switch to users tab
    await page.evaluate(() => window.auditLog.setTab('users'));
    await new Promise(r => setTimeout(r, 300));

    const usersTabActive = await page.evaluate(() => {
      return document.querySelector('.al-tab[data-tab="users"]').classList.contains('active');
    });
    assert(usersTabActive, 'User Summary tab becomes active');

    const userList = await page.evaluate(() => !!document.getElementById('al-user-list'));
    assert(userList, 'User list rendered');

    const userItems = await page.evaluate(() => document.querySelectorAll('.al-user-item').length);
    assert(userItems > 0, `${userItems} user items rendered`);

    const userBars = await page.evaluate(() => document.querySelectorAll('.al-user-bar-fill').length);
    assert(userBars > 0, `${userBars} user progress bars rendered`);

    // Stats
    const stats = await page.evaluate(() => window.auditLog.getStats());
    assert(stats.totalEntries > 0, `Total entries: ${stats.totalEntries}`);
    assert(stats.last24Hours >= 0, `Last 24h: ${stats.last24Hours}`);
    assert(stats.errorCount >= 0, `Errors: ${stats.errorCount}`);
    assert(stats.uniqueUsers > 0, `Unique users: ${stats.uniqueUsers}`);

    // === AC3: Export audit log ===
    console.log('\n=== AC3: Export audit log ===');

    // JSON export
    const jsonExport = await page.evaluate(() => window.auditLog.exportAuditLog('json'));
    assert(jsonExport.format === 'json', 'JSON export has correct format');
    assert(jsonExport.data.length > 0, 'JSON export has data');
    assert(jsonExport.filename.endsWith('.json'), 'JSON filename ends with .json');
    assert(jsonExport.entryCount > 0, `JSON export has ${jsonExport.entryCount} entries`);
    assert(jsonExport.exportedAt !== undefined, 'JSON export has exportedAt');

    // CSV export
    const csvExport = await page.evaluate(() => window.auditLog.exportAuditLog('csv'));
    assert(csvExport.format === 'csv', 'CSV export has correct format');
    assert(csvExport.data.includes('ID,Action'), 'CSV has headers');
    assert(csvExport.filename.endsWith('.csv'), 'CSV filename ends with .csv');
    assert(csvExport.entryCount > 0, `CSV export has ${csvExport.entryCount} entries`);

    // Text export
    const textExport = await page.evaluate(() => window.auditLog.exportAuditLog('text'));
    assert(textExport.format === 'text', 'Text export has correct format');
    assert(textExport.data.length > 0, 'Text export has data');
    assert(textExport.filename.endsWith('.txt'), 'Text filename ends with .txt');
    assert(textExport.entryCount > 0, `Text export has ${textExport.entryCount} entries`);

    // Switch to export tab
    await page.evaluate(() => window.auditLog.setTab('export'));
    await new Promise(r => setTimeout(r, 300));

    const exportTabActive = await page.evaluate(() => {
      return document.querySelector('.al-tab[data-tab="export"]').classList.contains('active');
    });
    assert(exportTabActive, 'Export tab becomes active');

    const exportSection = await page.evaluate(() => !!document.getElementById('al-export-section'));
    assert(exportSection, 'Export section rendered');

    const exportBtns = await page.evaluate(() => document.querySelectorAll('.al-export-btn').length);
    assert(exportBtns === 3, `${exportBtns} export buttons (JSON, CSV, Text)`);

    // === State Persistence ===
    console.log('\n=== State Persistence ===');

    const stateObj = await page.evaluate(() => window.auditLog.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.entryCount > 0, `State tracks ${stateObj.entryCount} entries`);
    assert(stateObj.filter !== undefined, 'State has filter');

    const savedState = await page.evaluate(() => localStorage.getItem('audit-log-config') !== null);
    assert(savedState, 'Config persisted to localStorage');

    const savedLog = await page.evaluate(() => localStorage.getItem('audit-log-entries') !== null);
    assert(savedLog, 'Log entries persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-079: Audit Log for All Actions - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
