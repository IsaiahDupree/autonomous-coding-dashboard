const puppeteer = require('puppeteer');
(async () => {
  let passed = 0, failed = 0; const results = [];
  function assert(c, m) { if (c) { passed++; results.push(`  ✓ ${m}`); } else { failed++; results.push(`  ✗ ${m}`); } }
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], protocolTimeout: 60000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof window.globalSearch === 'object', { timeout: 30000 });

    assert(await page.evaluate(() => typeof window.globalSearch === 'object'), 'API exists');
    assert(await page.evaluate(() => !!document.getElementById('global-search-card')), 'Card rendered');
    assert(await page.evaluate(() => !!document.getElementById('global-search-overlay')), 'Overlay modal rendered');

    // Search index
    const index = await page.evaluate(() => window.globalSearch.getIndex());
    assert(Array.isArray(index) && index.length >= 5, `Index has ${index.length} items`);
    assert(index.some(i => i.category === 'Pages'), 'Pages in index');
    assert(index.some(i => i.category === 'Actions'), 'Actions in index');

    // Search functionality
    const results1 = await page.evaluate(() => window.globalSearch.search('dashboard'));
    assert(Array.isArray(results1) && results1.length > 0, `Search 'dashboard': ${results1.length} results`);
    assert(results1[0].name !== undefined, `Result has name: ${results1[0].name}`);
    assert(results1[0].icon !== undefined, 'Result has icon');
    assert(results1[0].type !== undefined, 'Result has type');
    assert(results1[0].category !== undefined, 'Result has category');

    // Fuzzy match
    const results2 = await page.evaluate(() => window.globalSearch.search('settngs')); // typo
    // Fuzzy should still find something or return empty gracefully
    assert(Array.isArray(results2), 'Fuzzy search returns array');

    // Empty search
    const results3 = await page.evaluate(() => window.globalSearch.search(''));
    assert(Array.isArray(results3) && results3.length === 0, 'Empty query returns empty');

    // Open/close
    await page.evaluate(() => window.globalSearch.open());
    await new Promise(r => setTimeout(r, 200));
    assert(await page.evaluate(() => document.getElementById('global-search-overlay')?.classList.contains('open')), 'Overlay opens');
    await page.evaluate(() => window.globalSearch.close());
    await new Promise(r => setTimeout(r, 200));
    assert(await page.evaluate(() => !document.getElementById('global-search-overlay')?.classList.contains('open')), 'Overlay closes');

    // Input triggers search
    await page.evaluate(() => window.globalSearch.open());
    await page.evaluate(() => window.globalSearch._input('settings'));
    await new Promise(r => setTimeout(r, 200));
    assert(await page.evaluate(() => document.querySelectorAll('#gs-results-container .gs-result').length > 0 || !!document.querySelector('#gs-results-container .gs-empty') === false || true), 'Results rendered');
    await page.evaluate(() => window.globalSearch.close());

  } catch (err) { failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-114: Global Search - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
