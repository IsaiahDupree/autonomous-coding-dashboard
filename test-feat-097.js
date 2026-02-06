const puppeteer = require('puppeteer');

(async () => {
  let passed = 0;
  let failed = 0;
  const results = [];

  function assert(condition, message) {
    if (condition) { passed++; results.push(`  ✓ ${message}`); }
    else { failed++; results.push(`  ✗ ${message}`); }
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));

    console.log('\n=== Basic Setup ===');
    const hasAPI = await page.evaluate(() => typeof window.featureChangelog === 'object');
    assert(hasAPI, 'featureChangelog API exists on window');
    const hasCard = await page.evaluate(() => !!document.getElementById('changelog-card'));
    assert(hasCard, 'Changelog card rendered');
    const hasTabs = await page.evaluate(() => document.querySelectorAll('.cl-tab').length === 3);
    assert(hasTabs, 'Three tabs exist');
    const hasStats = await page.evaluate(() => document.querySelectorAll('.cl-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    console.log('\n=== AC1: Changelog Entries ===');
    const entries = await page.evaluate(() => window.featureChangelog.getEntries());
    assert(entries.length > 0, `${entries.length} entries`);
    assert(entries.length === 10, 'Has 10 entries');

    const first = entries[0];
    assert(first.id !== undefined, 'Entry has id');
    assert(first.version !== undefined, `Version: ${first.version}`);
    assert(first.type !== undefined, `Type: ${first.type}`);
    assert(first.title !== undefined, `Title: ${first.title}`);
    assert(first.description !== undefined, 'Has description');
    assert(first.date !== undefined, `Date: ${first.date}`);
    assert(first.author !== undefined, `Author: ${first.author}`);

    const specific = await page.evaluate((id) => window.featureChangelog.getEntry(id), first.id);
    assert(specific !== null, 'Can retrieve specific entry');

    const byVersion = await page.evaluate(() => window.featureChangelog.getEntriesByVersion('2.0.0'));
    assert(byVersion.length > 0, `${byVersion.length} entries for v2.0.0`);

    const byType = await page.evaluate(() => window.featureChangelog.getEntriesByType('added'));
    assert(byType.length > 0, `${byType.length} "added" entries`);

    const types = new Set(entries.map(e => e.type));
    assert(types.has('added'), 'Has "added" type');
    assert(types.has('changed'), 'Has "changed" type');
    assert(types.has('fixed'), 'Has "fixed" type');
    assert(types.has('deprecated'), 'Has "deprecated" type');

    const entryList = await page.evaluate(() => !!document.getElementById('cl-entry-list'));
    assert(entryList, 'Entry list rendered');
    const entryItems = await page.evaluate(() => document.querySelectorAll('.cl-entry-item').length);
    assert(entryItems > 0, `${entryItems} entry items rendered`);

    console.log('\n=== AC2: Releases ===');
    const releases = await page.evaluate(() => window.featureChangelog.getReleases());
    assert(releases.length > 0, `${releases.length} releases`);
    assert(releases.length === 4, 'Has 4 releases');

    const firstRel = releases[0];
    assert(firstRel.version !== undefined, `Version: ${firstRel.version}`);
    assert(firstRel.date !== undefined, `Date: ${firstRel.date}`);
    assert(firstRel.title !== undefined, `Title: ${firstRel.title}`);
    assert(firstRel.entryCount > 0, `Entries: ${firstRel.entryCount}`);
    assert(firstRel.highlights.length > 0, `Highlights: ${firstRel.highlights.length}`);
    assert(firstRel.status !== undefined, `Status: ${firstRel.status}`);

    const specificRel = await page.evaluate((v) => window.featureChangelog.getRelease(v), firstRel.version);
    assert(specificRel !== null, 'Can retrieve specific release');

    await page.evaluate(() => window.featureChangelog.setTab('releases'));
    await new Promise(r => setTimeout(r, 300));
    const relTabActive = await page.evaluate(() => document.querySelector('.cl-tab[data-tab="releases"]').classList.contains('active'));
    assert(relTabActive, 'Releases tab becomes active');
    const relSection = await page.evaluate(() => !!document.getElementById('cl-releases-section'));
    assert(relSection, 'Releases section rendered');
    const relItems = await page.evaluate(() => document.querySelectorAll('.cl-release-item').length);
    assert(relItems > 0, `${relItems} release items rendered`);

    console.log('\n=== AC3: Breaking Changes ===');
    const breaking = await page.evaluate(() => window.featureChangelog.getBreakingChanges());
    assert(breaking.length > 0, `${breaking.length} breaking changes`);
    assert(breaking.length === 4, 'Has 4 breaking changes');

    const firstBr = breaking[0];
    assert(firstBr.id !== undefined, 'Breaking change has id');
    assert(firstBr.version !== undefined, `Version: ${firstBr.version}`);
    assert(firstBr.title !== undefined, `Title: ${firstBr.title}`);
    assert(firstBr.description !== undefined, 'Has description');
    assert(firstBr.migration !== undefined, 'Has migration guide');
    assert(firstBr.severity !== undefined, `Severity: ${firstBr.severity}`);

    const specificBr = await page.evaluate((id) => window.featureChangelog.getBreakingChange(id), firstBr.id);
    assert(specificBr !== null, 'Can retrieve specific breaking change');

    const sevs = new Set(breaking.map(b => b.severity));
    assert(sevs.has('high'), 'Has high severity');
    assert(sevs.has('medium'), 'Has medium severity');
    assert(sevs.has('low'), 'Has low severity');

    const changelog = await page.evaluate(() => window.featureChangelog.generateChangelog('2.0.0'));
    assert(changelog.version === '2.0.0', `Generated for: ${changelog.version}`);
    assert(changelog.entryCount > 0, `Entries: ${changelog.entryCount}`);
    assert(changelog.generated !== undefined, 'Has timestamp');

    await page.evaluate(() => window.featureChangelog.setTab('breaking'));
    await new Promise(r => setTimeout(r, 300));
    const brTabActive = await page.evaluate(() => document.querySelector('.cl-tab[data-tab="breaking"]').classList.contains('active'));
    assert(brTabActive, 'Breaking tab becomes active');
    const brSection = await page.evaluate(() => !!document.getElementById('cl-breaking-section'));
    assert(brSection, 'Breaking section rendered');
    const brItems = await page.evaluate(() => document.querySelectorAll('.cl-breaking-item').length);
    assert(brItems > 0, `${brItems} breaking items rendered`);

    console.log('\n=== State ===');
    const stateObj = await page.evaluate(() => window.featureChangelog.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.entryCount > 0, `Entries: ${stateObj.entryCount}`);
    assert(stateObj.releaseCount > 0, `Releases: ${stateObj.releaseCount}`);
    assert(stateObj.breakingCount > 0, `Breaking: ${stateObj.breakingCount}`);
    const savedState = await page.evaluate(() => localStorage.getItem('changelog-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-097: Feature Changelog Generation - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
