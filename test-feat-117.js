const puppeteer = require('puppeteer');
(async () => {
  let passed = 0, failed = 0; const results = [];
  function assert(c, m) { if (c) { passed++; results.push(`  ✓ ${m}`); } else { failed++; results.push(`  ✗ ${m}`); } }
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], protocolTimeout: 60000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof window.dataImport === 'object', { timeout: 30000 });

    assert(await page.evaluate(() => typeof window.dataImport === 'object'), 'API exists');
    assert(await page.evaluate(() => !!document.getElementById('data-import-card')), 'Card rendered');

    // Sources
    const sources = await page.evaluate(() => window.dataImport.getSources());
    assert(Array.isArray(sources) && sources.length >= 5, `${sources.length} sources`);
    assert(sources.some(s => s.id === 'jira'), 'Jira source available');
    assert(sources.some(s => s.id === 'linear'), 'Linear source available');
    assert(sources.some(s => s.id === 'github'), 'GitHub source available');
    assert(sources.some(s => s.id === 'csv'), 'CSV source available');
    assert(sources.some(s => s.id === 'json'), 'JSON source available');

    const src = sources[0];
    assert(src.id !== undefined, `Source id: ${src.id}`);
    assert(src.name !== undefined, `Source name: ${src.name}`);
    assert(src.icon !== undefined, `Source icon: ${src.icon}`);
    assert(src.desc !== undefined, `Source desc: ${src.desc}`);

    // Get single source
    const jira = await page.evaluate(() => window.dataImport.getSource('jira'));
    assert(jira !== null, 'Get source by id');
    assert(jira.name === 'Jira', `Source name: ${jira.name}`);

    // Select source
    await page.evaluate(() => window.dataImport.selectSource('jira'));
    await new Promise(r => setTimeout(r, 200));
    const state = await page.evaluate(() => window.dataImport.getState());
    assert(state.selectedSource === 'jira', `Source selected: ${state.selectedSource}`);

    // Field mappings
    const mappings = await page.evaluate(() => window.dataImport.getFieldMappings('jira'));
    assert(Array.isArray(mappings) && mappings.length >= 3, `${mappings.length} Jira mappings`);
    assert(mappings[0].from !== undefined, `Mapping from: ${mappings[0].from}`);
    assert(mappings[0].to !== undefined, `Mapping to: ${mappings[0].to}`);

    const linearMappings = await page.evaluate(() => window.dataImport.getFieldMappings('linear'));
    assert(Array.isArray(linearMappings) && linearMappings.length >= 3, `${linearMappings.length} Linear mappings`);

    // History
    const history = await page.evaluate(() => window.dataImport.getHistory());
    assert(Array.isArray(history) && history.length >= 2, `${history.length} import history entries`);
    assert(history[0].source !== undefined, `History source: ${history[0].source}`);
    assert(history[0].status !== undefined, `History status: ${history[0].status}`);
    assert(history[0].items !== undefined, `History items: ${history[0].items}`);

    // Navigate tabs
    await page.evaluate(() => window.dataImport.setTab('connect'));
    await new Promise(r => setTimeout(r, 200));
    await page.evaluate(() => window.dataImport.setTab('map'));
    await new Promise(r => setTimeout(r, 200));
    assert(await page.evaluate(() => !!document.querySelector('.di-mapping-grid')), 'Field mapping UI rendered');

    await page.evaluate(() => window.dataImport.setTab('history'));
    await new Promise(r => setTimeout(r, 200));
    assert(await page.evaluate(() => !!document.querySelector('.di-hist-item')), 'History items rendered');

  } catch (err) { failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-117: Data Import from Other Tools - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
