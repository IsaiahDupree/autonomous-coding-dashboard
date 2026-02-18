const puppeteer = require('puppeteer');
(async () => {
  let passed = 0, failed = 0; const results = [];
  function assert(c, m) { if (c) { passed++; results.push(`  ✓ ${m}`); } else { failed++; results.push(`  ✗ ${m}`); } }
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], protocolTimeout: 60000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof window.breadcrumbNav === 'object', { timeout: 30000 });

    assert(await page.evaluate(() => typeof window.breadcrumbNav === 'object'), 'API exists');
    assert(await page.evaluate(() => !!document.getElementById('breadcrumb-nav-card')), 'Card rendered');
    assert(await page.evaluate(() => !!document.getElementById('breadcrumb-nav-bar')), 'Sticky bar rendered');

    // Crumbs
    const crumbs = await page.evaluate(() => window.breadcrumbNav.getCrumbs());
    assert(Array.isArray(crumbs) && crumbs.length >= 1, `${crumbs.length} crumbs`);
    assert(crumbs[0].label !== undefined, `First crumb label: ${crumbs[0].label}`);
    assert(crumbs[0].href !== undefined, `First crumb href: ${crumbs[0].href}`);

    // Last crumb is active (current page)
    const lastCrumb = crumbs[crumbs.length - 1];
    assert(lastCrumb.label === 'Dashboard', `Current page label: ${lastCrumb.label}`);

    // Current page
    const currentPage = await page.evaluate(() => window.breadcrumbNav.getCurrentPage());
    assert(typeof currentPage === 'string' && currentPage.length > 0, `Current page: ${currentPage}`);

    // History recorded
    const history = await page.evaluate(() => window.breadcrumbNav.getHistory());
    assert(Array.isArray(history), 'History is array');
    assert(history.length >= 1, `History has entries: ${history.length}`);
    if (history.length > 0) {
      assert(history[0].page !== undefined, `History entry has page`);
      assert(history[0].path !== undefined, `History entry has path`);
      assert(history[0].time !== undefined, `History entry has time`);
    }

    // Breadcrumb bar has crumb elements
    assert(await page.evaluate(() => document.querySelectorAll('#breadcrumb-nav-bar .bn-crumb').length >= 1), 'Crumb elements in bar');

    // Active crumb
    assert(await page.evaluate(() => !!document.querySelector('#breadcrumb-nav-bar .bn-crumb.active')), 'Active crumb shown');

    // Navigate up function
    assert(await page.evaluate(() => typeof window.breadcrumbNav.navigateUp === 'function'), 'Navigate up function exists');

    // Clear history
    await page.evaluate(() => window.breadcrumbNav.clearHistory());
    const history2 = await page.evaluate(() => window.breadcrumbNav.getHistory());
    assert(history2.length === 0, 'History cleared');

  } catch (err) { failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-113: Breadcrumb Navigation - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
