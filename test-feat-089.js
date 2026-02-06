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

    const hasAPI = await page.evaluate(() => typeof window.featureVersioning === 'object');
    assert(hasAPI, 'featureVersioning API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('feature-versioning-card'));
    assert(hasCard, 'Feature versioning card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.fv-tab').length === 3);
    assert(hasTabs, 'Three tabs exist (Changes, Versions, Diff)');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.fv-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Track all changes ===
    console.log('\n=== AC1: Track all changes ===');

    const changes = await page.evaluate(() => window.featureVersioning.getChanges());
    assert(changes.length > 0, `${changes.length} changes tracked`);
    assert(changes.length === 10, 'Has 10 changes');

    const first = changes[0];
    assert(first.id !== undefined, 'Change has id');
    assert(first.featureId !== undefined, `Feature: ${first.featureId}`);
    assert(first.field !== undefined, `Field: ${first.field}`);
    assert(first.oldValue !== undefined, 'Has oldValue');
    assert(first.newValue !== undefined, 'Has newValue');
    assert(first.timestamp !== undefined, 'Has timestamp');
    assert(first.author !== undefined, `Author: ${first.author}`);
    assert(first.version !== undefined, `Version: ${first.version}`);
    assert(first.type !== undefined, `Type: ${first.type}`);

    // Get specific change
    const specific = await page.evaluate((id) => window.featureVersioning.getChange(id), first.id);
    assert(specific !== null, 'Can retrieve specific change');

    // Filter by type
    const statusChanges = await page.evaluate(() => window.featureVersioning.getChanges({ type: 'status_change' }));
    assert(statusChanges.length > 0, `${statusChanges.length} status changes`);
    const allStatus = statusChanges.every(c => c.type === 'status_change');
    assert(allStatus, 'All filtered are status changes');

    // Filter by featureId
    const featureChanges = await page.evaluate(() => window.featureVersioning.getChanges({ featureId: 'feat-085' }));
    assert(featureChanges.length > 0, `${featureChanges.length} changes for feat-085`);

    // Filter by version
    const versionChanges = await page.evaluate(() => window.featureVersioning.getChanges({ version: '2.0.0' }));
    assert(versionChanges.length > 0, `${versionChanges.length} changes in v2.0.0`);

    // Track a new change
    const newId = await page.evaluate(() => window.featureVersioning.trackChange('feat-099', 'passes', false, true));
    assert(newId !== undefined, `New change tracked: ${newId}`);
    const afterTrack = await page.evaluate(() => window.featureVersioning.getChanges());
    assert(afterTrack.length === 11, 'Change count increased to 11');

    // Change types
    const types = await page.evaluate(() => window.featureVersioning.getChangeTypes());
    assert(types.length > 0, `${types.length} change types`);
    assert(types[0].id !== undefined, `Type id: ${types[0].id}`);
    assert(types[0].label !== undefined, `Type label: ${types[0].label}`);
    assert(types[0].count >= 0, `Count: ${types[0].count}`);

    // Change list rendered
    const changeList = await page.evaluate(() => !!document.getElementById('fv-change-list'));
    assert(changeList, 'Change list rendered');

    const changeItems = await page.evaluate(() => document.querySelectorAll('.fv-change-item').length);
    assert(changeItems > 0, `${changeItems} change items rendered`);

    // === AC2: Rollback support ===
    console.log('\n=== AC2: Rollback support ===');

    const versions = await page.evaluate(() => window.featureVersioning.getVersions());
    assert(versions.length > 0, `${versions.length} versions`);
    assert(versions.length === 8, 'Has 8 versions');

    const firstVer = versions[0];
    assert(firstVer.id !== undefined, 'Version has id');
    assert(firstVer.version !== undefined, `Version: ${firstVer.version}`);
    assert(firstVer.timestamp !== undefined, 'Has timestamp');
    assert(firstVer.author !== undefined, `Author: ${firstVer.author}`);
    assert(firstVer.description !== undefined, 'Has description');
    assert(firstVer.featureCount > 0, `Features: ${firstVer.featureCount}`);
    assert(firstVer.changeCount >= 0, `Changes: ${firstVer.changeCount}`);

    const currentVer = versions.find(v => v.current);
    assert(currentVer !== undefined, 'Has current version');

    // Get specific version
    const specificVer = await page.evaluate((id) => window.featureVersioning.getVersion(id), firstVer.id);
    assert(specificVer !== null, 'Can retrieve specific version');

    // Rollback to previous version
    const prevVer = versions[versions.length - 2];
    const rollResult = await page.evaluate((id) => window.featureVersioning.rollback(id), prevVer.id);
    assert(rollResult !== null, 'Rollback returned result');
    assert(rollResult.success === true, 'Rollback successful');
    assert(rollResult.rolledBackTo !== undefined, `Rolled back to: ${rollResult.rolledBackTo}`);
    assert(rollResult.rolledBackAt !== undefined, 'Has rolledBackAt');
    assert(rollResult.changesReverted >= 0, `Reverted: ${rollResult.changesReverted}`);

    // Switch to versions tab
    await page.evaluate(() => window.featureVersioning.setTab('versions'));
    await new Promise(r => setTimeout(r, 300));

    const verTabActive = await page.evaluate(() => {
      return document.querySelector('.fv-tab[data-tab="versions"]').classList.contains('active');
    });
    assert(verTabActive, 'Versions tab becomes active');

    const verList = await page.evaluate(() => !!document.getElementById('fv-version-list'));
    assert(verList, 'Version list rendered');

    const verItems = await page.evaluate(() => document.querySelectorAll('.fv-version-item').length);
    assert(verItems > 0, `${verItems} version items rendered`);

    // === AC3: Diff between versions ===
    console.log('\n=== AC3: Diff between versions ===');

    const diff = await page.evaluate(() => {
      const vers = window.featureVersioning.getVersions();
      return window.featureVersioning.diffVersions(vers[0].id, vers[vers.length - 1].id);
    });
    assert(diff !== null, 'Diff returned result');
    assert(diff.fromVersion !== undefined, `From: ${diff.fromVersion}`);
    assert(diff.toVersion !== undefined, `To: ${diff.toVersion}`);
    assert(diff.totalChanges >= 0, `Total changes: ${diff.totalChanges}`);
    assert(diff.changes !== undefined, 'Diff has changes array');
    assert(diff.summary !== undefined, 'Diff has summary');
    assert(diff.summary.added >= 0, `Added: ${diff.summary.added}`);
    assert(diff.summary.removed >= 0, `Removed: ${diff.summary.removed}`);
    assert(diff.summary.modified >= 0, `Modified: ${diff.summary.modified}`);

    // Invalid diff
    const badDiff = await page.evaluate(() => window.featureVersioning.diffVersions('invalid', 'also-invalid'));
    assert(badDiff === null, 'Invalid diff returns null');

    // Switch to diff tab
    await page.evaluate(() => window.featureVersioning.setTab('diff'));
    await new Promise(r => setTimeout(r, 300));

    const diffTabActive = await page.evaluate(() => {
      return document.querySelector('.fv-tab[data-tab="diff"]').classList.contains('active');
    });
    assert(diffTabActive, 'Diff tab becomes active');

    const diffSection = await page.evaluate(() => !!document.getElementById('fv-diff-section'));
    assert(diffSection, 'Diff section rendered');

    const diffItems = await page.evaluate(() => document.querySelectorAll('.fv-diff-item').length);
    assert(diffItems > 0, `${diffItems} diff items rendered`);

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.featureVersioning.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.versionCount > 0, `Versions: ${stateObj.versionCount}`);
    assert(stateObj.changeCount > 0, `Changes: ${stateObj.changeCount}`);
    assert(stateObj.currentVersion !== undefined, `Current: ${stateObj.currentVersion}`);

    const savedState = await page.evaluate(() => localStorage.getItem('feature-versioning-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-089: Feature List Versioning - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
