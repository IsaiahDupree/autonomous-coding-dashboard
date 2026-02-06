const puppeteer = require('puppeteer');
(async () => {
  let passed = 0, failed = 0; const results = [];
  function assert(c, m) { if (c) { passed++; results.push(`  ✓ ${m}`); } else { failed++; results.push(`  ✗ ${m}`); } }
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));

    assert(await page.evaluate(() => typeof window.errorMonitoring === 'object'), 'API exists');
    assert(await page.evaluate(() => !!document.getElementById('error-monitoring-card')), 'Card rendered');
    assert(await page.evaluate(() => document.querySelectorAll('#error-monitoring-card .em-tab').length === 3), 'Three tabs');
    assert(await page.evaluate(() => document.querySelectorAll('#error-monitoring-card .em-stat-card').length === 4), 'Four stats');

    const cats = await page.evaluate(() => window.errorMonitoring.getCategories());
    assert(cats.length === 6, `${cats.length} categories`);
    const c = cats[0];
    assert(c.name !== undefined, `Name: ${c.name}`);
    assert(c.count !== undefined, `Count: ${c.count}`);
    assert(c.rate !== undefined, `Rate: ${c.rate}`);
    assert(c.trend !== undefined, `Trend: ${c.trend}`);
    assert(await page.evaluate((id) => window.errorMonitoring.getCategory(id) !== null, c.id), 'Get category');
    await page.evaluate(() => window.errorMonitoring.setTab('categories'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('em-category-list')), 'Category list');

    const errors = await page.evaluate(() => window.errorMonitoring.getRecentErrors());
    assert(errors.length === 8, `${errors.length} recent errors`);
    assert(errors[0].message !== undefined, `Message: ${errors[0].message.substring(0, 30)}`);
    assert(errors[0].category !== undefined, `Category: ${errors[0].category}`);
    assert(errors[0].file !== undefined, `File: ${errors[0].file}`);
    assert(errors[0].line !== undefined, `Line: ${errors[0].line}`);
    assert(errors[0].resolved !== undefined, `Resolved: ${errors[0].resolved}`);
    assert(await page.evaluate((id) => window.errorMonitoring.getRecentError(id) !== null, errors[0].id), 'Get error');
    await page.evaluate(() => window.errorMonitoring.setTab('recent'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('em-recent-section')), 'Recent section');

    const patterns = await page.evaluate(() => window.errorMonitoring.getPatterns());
    assert(patterns.length === 5, `${patterns.length} patterns`);
    assert(patterns[0].name !== undefined, `Name: ${patterns[0].name}`);
    assert(patterns[0].occurrences !== undefined, `Occurrences: ${patterns[0].occurrences}`);
    assert(patterns[0].affectedFiles !== undefined, `Files: ${patterns[0].affectedFiles}`);
    assert(patterns[0].status !== undefined, `Status: ${patterns[0].status}`);
    assert(await page.evaluate((id) => window.errorMonitoring.getPattern(id) !== null, patterns[0].id), 'Get pattern');
    await page.evaluate(() => window.errorMonitoring.setTab('patterns'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('em-pattern-section')), 'Pattern section');

    const st = await page.evaluate(() => window.errorMonitoring.getState());
    assert(st.categoryCount > 0, `Categories: ${st.categoryCount}`);
    assert(st.recentCount > 0, `Recent: ${st.recentCount}`);
    assert(st.patternCount > 0, `Patterns: ${st.patternCount}`);
    assert(await page.evaluate(() => localStorage.getItem('error-monitoring-config') !== null), 'State persisted');
  } catch (err) { failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-110: Error Rate Monitoring - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
