const puppeteer = require('puppeteer');
(async () => {
  let passed = 0, failed = 0; const results = [];
  function assert(c, m) { if (c) { passed++; results.push(`  ✓ ${m}`); } else { failed++; results.push(`  ✗ ${m}`); } }
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], protocolTimeout: 60000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof window.dataRetention === 'object', { timeout: 30000 });

    assert(await page.evaluate(() => typeof window.dataRetention === 'object'), 'API exists');
    assert(await page.evaluate(() => !!document.getElementById('data-retention-card')), 'Card rendered');

    // Policies
    const policies = await page.evaluate(() => window.dataRetention.getPolicies());
    assert(Array.isArray(policies) && policies.length >= 4, `${policies.length} policies`);
    const p = policies[0];
    assert(p.id !== undefined, `Policy id: ${p.id}`);
    assert(p.name !== undefined, `Policy name: ${p.name}`);
    assert(p.period !== undefined, `Policy period: ${p.period}`);
    assert(p.status !== undefined, `Policy status: ${p.status}`);
    assert(p.desc !== undefined, `Policy desc exists`);

    // Get single policy
    const policy = await page.evaluate(() => window.dataRetention.getPolicy('pol-logs'));
    assert(policy !== null, 'Get policy by id');
    assert(policy.name === 'Log Retention', `Policy name: ${policy.name}`);

    // Toggle policy
    const initialStatus = await page.evaluate(() => window.dataRetention.getPolicy('pol-logs').status);
    await page.evaluate(() => window.dataRetention.togglePolicy('pol-logs'));
    await new Promise(r => setTimeout(r, 200));
    const newStatus = await page.evaluate(() => window.dataRetention.getPolicy('pol-logs').status);
    assert(newStatus !== initialStatus, `Status toggled: ${initialStatus} -> ${newStatus}`);

    // Archives
    const archives = await page.evaluate(() => window.dataRetention.getArchives());
    assert(Array.isArray(archives) && archives.length >= 3, `${archives.length} archives`);
    assert(archives[0].name !== undefined, `Archive name: ${archives[0].name}`);
    assert(archives[0].size !== undefined, `Archive size: ${archives[0].size}`);
    assert(archives[0].date !== undefined, `Archive date: ${archives[0].date}`);

    // State
    const state = await page.evaluate(() => window.dataRetention.getState());
    assert(state.activePolicies !== undefined, `Active policies: ${state.activePolicies}`);
    assert(state.archiveCount !== undefined, `Archive count: ${state.archiveCount}`);

    // Tabs
    await page.evaluate(() => window.dataRetention.setTab('stats'));
    await new Promise(r => setTimeout(r, 200));
    assert(await page.evaluate(() => !!document.querySelector('.dr-stat')), 'Stats rendered');

    await page.evaluate(() => window.dataRetention.setTab('archives'));
    await new Promise(r => setTimeout(r, 200));
    assert(await page.evaluate(() => !!document.querySelector('.dr-archive-item')), 'Archives rendered');

    // Persist state
    assert(await page.evaluate(() => localStorage.getItem('data-retention-config') !== null), 'State persisted');

  } catch (err) { failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-115: Data Retention Policies - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
