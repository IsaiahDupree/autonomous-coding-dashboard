const puppeteer = require('puppeteer');
(async () => {
  let passed = 0, failed = 0; const results = [];
  function assert(c, m) { if (c) { passed++; results.push(`  ✓ ${m}`); } else { failed++; results.push(`  ✗ ${m}`); } }
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], protocolTimeout: 60000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof window.quickActions === 'object', { timeout: 30000 });

    assert(await page.evaluate(() => typeof window.quickActions === 'object'), 'API exists');
    assert(await page.evaluate(() => !!document.getElementById('quick-actions-card')), 'Card rendered');
    assert(await page.evaluate(() => !!document.getElementById('quick-actions-fab')), 'FAB rendered');

    // Actions
    const actions = await page.evaluate(() => window.quickActions.getActions());
    assert(Array.isArray(actions) && actions.length >= 8, `${actions.length} actions defined`);
    assert(actions[0].id !== undefined, `Action id: ${actions[0].id}`);
    assert(actions[0].name !== undefined, `Action name: ${actions[0].name}`);
    assert(actions[0].shortcut !== undefined, `Action shortcut: ${actions[0].shortcut}`);
    assert(actions[0].icon !== undefined, `Action icon: ${actions[0].icon}`);

    // Get single action
    const action = await page.evaluate(() => window.quickActions.getAction('qa-dashboard'));
    assert(action !== null, 'Get action by id');
    assert(action.name === 'Go to Dashboard', `Action name: ${action.name}`);

    // Filter
    await page.evaluate(() => window.quickActions.filter('settings'));
    await new Promise(r => setTimeout(r, 200));
    const filtered = await page.evaluate(() => window.quickActions.getFilteredActions());
    assert(filtered.length > 0, `Filter returns results: ${filtered.length}`);
    assert(filtered.every(a => a.name.toLowerCase().includes('settings') || a.shortcut.toLowerCase().includes('settings')), 'Filter matches name/shortcut');

    // FAB toggle
    await page.evaluate(() => window.quickActions.toggleFab());
    await new Promise(r => setTimeout(r, 200));
    assert(await page.evaluate(() => document.getElementById('qa-fab-trigger')?.classList.contains('open')), 'FAB opened');
    await page.evaluate(() => window.quickActions.toggleFab());
    await new Promise(r => setTimeout(r, 200));
    assert(await page.evaluate(() => !document.getElementById('qa-fab-trigger')?.classList.contains('open')), 'FAB closed');

    // Search input exists
    await page.evaluate(() => window.quickActions.filter(''));
    await new Promise(r => setTimeout(r, 200));
    assert(await page.evaluate(() => !!document.getElementById('qac-search-input')), 'Search input exists');

    // Keyboard shortcut listener
    assert(await page.evaluate(() => typeof window.quickActions.open === 'function'), 'Open function exists');

  } catch (err) { failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-112: Quick Actions Menu - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
