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

    assert(await page.evaluate(() => typeof window.validationRules === 'object'), 'API exists');
    assert(await page.evaluate(() => !!document.getElementById('validation-rules-card')), 'Card rendered');
    assert(await page.evaluate(() => document.querySelectorAll('#validation-rules-card .vr-tab').length === 3), 'Three tabs');
    assert(await page.evaluate(() => document.querySelectorAll('#validation-rules-card .vr-stat-card').length === 4), 'Four stats');

    const rules = await page.evaluate(() => window.validationRules.getRules());
    assert(rules.length === 8, `${rules.length} rules`);
    const r = rules[0];
    assert(r.name !== undefined, `Name: ${r.name}`);
    assert(r.pattern !== undefined, `Pattern: ${r.pattern}`);
    assert(r.severity !== undefined, `Severity: ${r.severity}`);
    assert(r.enabled !== undefined, `Enabled: ${r.enabled}`);
    assert(await page.evaluate((id) => window.validationRules.getRule(id) !== null, r.id), 'Get rule');
    const enabled = await page.evaluate(() => window.validationRules.getEnabledRules());
    assert(enabled.length > 0, `${enabled.length} enabled`);
    await page.evaluate(() => window.validationRules.setTab('rules'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('vr-rule-list')), 'Rule list');

    const sets = await page.evaluate(() => window.validationRules.getRuleSets());
    assert(sets.length === 5, `${sets.length} sets`);
    assert(sets[0].name !== undefined, `Name: ${sets[0].name}`);
    assert(sets[0].rules.length > 0, `Rules: ${sets[0].rules.length}`);
    assert(sets[0].description !== undefined, `Desc: ${sets[0].description}`);
    assert(await page.evaluate((id) => window.validationRules.getRuleSet(id) !== null, sets[0].id), 'Get set');
    await page.evaluate(() => window.validationRules.setTab('sets'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('vr-set-section')), 'Set section');

    const res = await page.evaluate(() => window.validationRules.getResults());
    assert(res.length === 4, `${res.length} results`);
    assert(res[0].ruleId !== undefined, `RuleId: ${res[0].ruleId}`);
    assert(res[0].status !== undefined, `Status: ${res[0].status}`);
    assert(res[0].file !== undefined, `File: ${res[0].file}`);
    assert(await page.evaluate((id) => window.validationRules.getResult(id) !== null, res[0].id), 'Get result');
    await page.evaluate(() => window.validationRules.setTab('results'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('vr-result-section')), 'Result section');

    const st = await page.evaluate(() => window.validationRules.getState());
    assert(st.ruleCount > 0, `Rules: ${st.ruleCount}`);
    assert(st.setCount > 0, `Sets: ${st.setCount}`);
    assert(st.resultCount > 0, `Results: ${st.resultCount}`);
    assert(await page.evaluate(() => localStorage.getItem('validation-rules-config') !== null), 'State persisted');
  } catch (err) { failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-107: Custom Validation Rules - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
