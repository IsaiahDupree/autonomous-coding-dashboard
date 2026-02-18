const puppeteer = require('puppeteer');
(async () => {
  let passed = 0, failed = 0; const results = [];
  function assert(c, m) { if (c) { passed++; results.push(`  ✓ ${m}`); } else { failed++; results.push(`  ✗ ${m}`); } }
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], protocolTimeout: 60000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof window.dataAnonymization === 'object', { timeout: 30000 });

    assert(await page.evaluate(() => typeof window.dataAnonymization === 'object'), 'API exists');
    assert(await page.evaluate(() => !!document.getElementById('data-anonymization-card')), 'Card rendered');

    // Rules
    const rules = await page.evaluate(() => window.dataAnonymization.getRules());
    assert(Array.isArray(rules) && rules.length >= 5, `${rules.length} rules`);
    const r = rules[0];
    assert(r.id !== undefined, `Rule id: ${r.id}`);
    assert(r.name !== undefined, `Rule name: ${r.name}`);
    assert(r.desc !== undefined, `Rule desc: ${r.desc}`);
    assert(r.enabled !== undefined, `Rule enabled: ${r.enabled}`);
    assert(r.example !== undefined, `Rule example exists`);
    assert(r.example.original !== undefined, `Example original: ${r.example.original.substring(0,20)}`);
    assert(r.example.anonymized !== undefined, `Example anonymized: ${r.example.anonymized.substring(0,20)}`);

    // Get single rule
    const rule = await page.evaluate(() => window.dataAnonymization.getRule('rule-api-keys'));
    assert(rule !== null, 'Get rule by id');
    assert(rule.name === 'API Key Masking', `Rule name: ${rule.name}`);

    // Toggle rule
    const initialEnabled = await page.evaluate(() => window.dataAnonymization.getRule('rule-api-keys').enabled);
    await page.evaluate(() => window.dataAnonymization.toggleRule('rule-api-keys'));
    await new Promise(r => setTimeout(r, 200));
    const newEnabled = await page.evaluate(() => window.dataAnonymization.getRule('rule-api-keys').enabled);
    assert(newEnabled !== initialEnabled, `Toggle worked: ${initialEnabled} -> ${newEnabled}`);

    // Enabled count
    const count = await page.evaluate(() => window.dataAnonymization.getEnabledCount());
    assert(typeof count === 'number', `Enabled count: ${count}`);

    // State
    const state = await page.evaluate(() => window.dataAnonymization.getState());
    assert(state.enabledRules !== undefined, `State enabledRules: ${state.enabledRules}`);
    assert(state.totalRules !== undefined, `State totalRules: ${state.totalRules}`);

    // Export tab
    await page.evaluate(() => window.dataAnonymization.setTab('export'));
    await new Promise(r => setTimeout(r, 200));
    assert(await page.evaluate(() => !!document.querySelector('.da-export-section')), 'Export section rendered');
    assert(await page.evaluate(() => !!document.getElementById('da-preview-area')), 'Preview area exists');

    // Preview
    await page.evaluate(() => window.dataAnonymization.preview());
    await new Promise(r => setTimeout(r, 200));
    const previewContent = await page.evaluate(() => document.getElementById('da-preview-area')?.textContent);
    assert(previewContent && previewContent.includes('exportedAt'), 'Preview shows JSON');

    // Persist
    assert(await page.evaluate(() => localStorage.getItem('data-anonymization-config') !== null), 'State persisted');

  } catch (err) { failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-116: Data Anonymization - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
