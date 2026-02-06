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
    await new Promise(r => setTimeout(r, 2000));

    // === Basic Setup ===
    console.log('\n=== Basic Setup ===');

    const hasAPI = await page.evaluate(() => typeof window.targetArchive === 'object');
    assert(hasAPI, 'targetArchive API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('target-archive-card'));
    assert(hasCard, 'Target archive card rendered');

    // Check tabs exist
    const tabCount = await page.evaluate(() => document.querySelectorAll('.ta-tab').length);
    assert(tabCount === 3, `${tabCount} tabs (Active, Archived, History)`);

    // Check stats
    const hasStats = await page.evaluate(() => {
      return document.getElementById('ta-stat-total') !== null &&
             document.getElementById('ta-stat-archived') !== null &&
             document.getElementById('ta-stat-active') !== null;
    });
    assert(hasStats, 'Stats bar displayed');

    // === AC1: Archive Completed Targets ===
    console.log('\n=== AC1: Archive Completed Targets ===');

    // Get initial state
    const initialState = await page.evaluate(() => window.targetArchive.getState());
    const initialArchived = initialState.archivedTargets.length;

    // Archive a target
    const archiveResult = await page.evaluate(() => {
      return window.targetArchive.archive('test-target-1', 'Test Target One');
    });
    assert(archiveResult === true, 'Archive returns true on success');

    // Verify archived
    const afterArchive = await page.evaluate(() => window.targetArchive.getArchivedTargets());
    assert(afterArchive.length === initialArchived + 1, `Archived count increased to ${afterArchive.length}`);

    // Check archived target has required fields
    const archivedTarget = await page.evaluate(() => {
      const targets = window.targetArchive.getArchivedTargets();
      return targets.find(t => t.id === 'test-target-1');
    });
    assert(archivedTarget !== null && archivedTarget !== undefined, 'Archived target found');
    assert(archivedTarget.archivedAt !== undefined, 'Archived target has timestamp');

    // Duplicate archive should fail
    const dupResult = await page.evaluate(() => {
      return window.targetArchive.archive('test-target-1', 'Test Target One');
    });
    assert(dupResult === false, 'Duplicate archive returns false');

    // Archive another target
    await page.evaluate(() => window.targetArchive.archive('test-target-2', 'Test Target Two'));

    // Archive all
    const bulkCount = await page.evaluate(() => window.targetArchive.archiveAllCompleted());
    assert(typeof bulkCount === 'number', `Archive all returned count: ${bulkCount}`);

    // Switch to archived tab and check
    await page.evaluate(() => window.targetArchive.switchTab('archived'));
    await new Promise(r => setTimeout(r, 300));

    const archivedTabActive = await page.evaluate(() => {
      return document.querySelector('.ta-tab[data-tab="archived"]').classList.contains('active');
    });
    assert(archivedTabActive, 'Archived tab becomes active');

    const archivedPanelVisible = await page.evaluate(() => {
      return document.getElementById('ta-panel-archived').classList.contains('active');
    });
    assert(archivedPanelVisible, 'Archived panel visible');

    // Check archived list has items
    const archivedItems = await page.evaluate(() => {
      return document.getElementById('ta-archived-list').querySelectorAll('.ta-item').length;
    });
    assert(archivedItems >= 2, `${archivedItems} archived items displayed`);

    // === AC2: Restore from Archive ===
    console.log('\n=== AC2: Restore from Archive ===');

    // Restore a target
    const restoreResult = await page.evaluate(() => {
      return window.targetArchive.restore('test-target-1');
    });
    assert(restoreResult === true, 'Restore returns true on success');

    // Verify removed from archive
    const afterRestore = await page.evaluate(() => {
      return window.targetArchive.getArchivedTargets().find(t => t.id === 'test-target-1');
    });
    assert(afterRestore === undefined, 'Restored target removed from archive');

    // Restore non-existent should fail
    const badRestore = await page.evaluate(() => {
      return window.targetArchive.restore('non-existent-target');
    });
    assert(badRestore === false, 'Restore non-existent returns false');

    // Delete from archive
    const deleteResult = await page.evaluate(() => {
      return window.targetArchive.deleteArchived('test-target-2');
    });
    assert(deleteResult === true, 'Delete from archive returns true');

    // Verify deleted
    const afterDelete = await page.evaluate(() => {
      return window.targetArchive.getArchivedTargets().find(t => t.id === 'test-target-2');
    });
    assert(afterDelete === undefined, 'Deleted target removed from archive');

    // Restore all
    // First archive some targets
    await page.evaluate(() => {
      window.targetArchive.archive('restore-all-1', 'Restore All Test 1');
      window.targetArchive.archive('restore-all-2', 'Restore All Test 2');
    });
    const beforeRestoreAll = await page.evaluate(() => window.targetArchive.getArchivedTargets().length);
    const restoreAllCount = await page.evaluate(() => window.targetArchive.restoreAll());
    assert(restoreAllCount === beforeRestoreAll, `Restore all returned count: ${restoreAllCount}`);

    const afterRestoreAll = await page.evaluate(() => window.targetArchive.getArchivedTargets().length);
    assert(afterRestoreAll === 0, 'All targets restored (archive empty)');

    // === AC3: Archive History ===
    console.log('\n=== AC3: Archive History ===');

    // Check history exists
    const history = await page.evaluate(() => window.targetArchive.getArchiveHistory());
    assert(history.length > 0, `${history.length} history entries`);

    // Check history items have required fields
    const historyFields = await page.evaluate(() => {
      const h = window.targetArchive.getArchiveHistory()[0];
      return h && h.action && h.targetName && h.timestamp;
    });
    assert(historyFields, 'History items have action, targetName, timestamp');

    // Check different action types in history
    const actionTypes = await page.evaluate(() => {
      const h = window.targetArchive.getArchiveHistory();
      const actions = new Set(h.map(item => item.action));
      return Array.from(actions);
    });
    assert(actionTypes.includes('archive'), 'History includes archive actions');
    assert(actionTypes.includes('restore'), 'History includes restore actions');

    // Switch to history tab
    await page.evaluate(() => window.targetArchive.switchTab('history'));
    await new Promise(r => setTimeout(r, 300));

    const historyTabActive = await page.evaluate(() => {
      return document.querySelector('.ta-tab[data-tab="history"]').classList.contains('active');
    });
    assert(historyTabActive, 'History tab becomes active');

    const historyPanelVisible = await page.evaluate(() => {
      return document.getElementById('ta-panel-history').classList.contains('active');
    });
    assert(historyPanelVisible, 'History panel visible');

    // Check history items rendered
    const historyItems = await page.evaluate(() => {
      return document.getElementById('ta-history-list').querySelectorAll('.ta-history-item').length;
    });
    assert(historyItems > 0, `${historyItems} history items rendered`);

    // State persistence
    const savedState = await page.evaluate(() => localStorage.getItem('target-archive-config') !== null);
    assert(savedState, 'State persisted to localStorage');

    // Tab switching back to active
    await page.evaluate(() => window.targetArchive.switchTab('active'));
    const activeTabActive = await page.evaluate(() => {
      return document.querySelector('.ta-tab[data-tab="active"]').classList.contains('active');
    });
    assert(activeTabActive, 'Switch back to active tab works');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-064: Target Archiving and Restore - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
