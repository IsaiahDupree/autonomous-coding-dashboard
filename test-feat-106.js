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

    assert(await page.evaluate(() => typeof window.promptTemplates === 'object'), 'API exists');
    assert(await page.evaluate(() => !!document.getElementById('prompt-templates-card')), 'Card rendered');
    assert(await page.evaluate(() => document.querySelectorAll('#prompt-templates-card .pt-tab').length === 3), 'Three tabs');
    assert(await page.evaluate(() => document.querySelectorAll('#prompt-templates-card .pt-stat-card').length === 4), 'Four stats');

    const templates = await page.evaluate(() => window.promptTemplates.getTemplates());
    assert(templates.length === 6, `${templates.length} templates`);
    const t = templates[0];
    assert(t.id !== undefined, `ID: ${t.id}`);
    assert(t.name !== undefined, `Name: ${t.name}`);
    assert(t.type !== undefined, `Type: ${t.type}`);
    assert(t.content !== undefined, 'Has content');
    assert(t.variables.length > 0, `Vars: ${t.variables.length}`);
    assert(t.category !== undefined, `Category: ${t.category}`);
    assert(await page.evaluate((id) => window.promptTemplates.getTemplate(id) !== null, t.id), 'Get template');
    const byType = await page.evaluate(() => window.promptTemplates.getTemplatesByType('system'));
    assert(byType.length > 0, `${byType.length} system templates`);
    assert(await page.evaluate(() => !!document.getElementById('pt-template-list')), 'Template list');

    const vars = await page.evaluate(() => window.promptTemplates.getVariables());
    assert(vars.length === 4, `${vars.length} variables`);
    assert(vars[0].name !== undefined, `Name: ${vars[0].name}`);
    assert(vars[0].description !== undefined, `Desc: ${vars[0].description}`);
    assert(vars[0].usedIn.length > 0, `UsedIn: ${vars[0].usedIn.length}`);
    assert(await page.evaluate((id) => window.promptTemplates.getVariable(id) !== null, vars[0].id), 'Get variable');
    await page.evaluate(() => window.promptTemplates.setTab('variables'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('pt-variable-section')), 'Variable section');

    const cats = await page.evaluate(() => window.promptTemplates.getCategories());
    assert(cats.length === 5, `${cats.length} categories`);
    assert(cats[0].name !== undefined, `Name: ${cats[0].name}`);
    assert(cats[0].templateCount >= 0, `Count: ${cats[0].templateCount}`);
    assert(cats[0].color !== undefined, `Color: ${cats[0].color}`);
    assert(await page.evaluate((id) => window.promptTemplates.getCategory(id) !== null, cats[0].id), 'Get category');
    await page.evaluate(() => window.promptTemplates.setTab('categories'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('pt-category-section')), 'Category section');

    const st = await page.evaluate(() => window.promptTemplates.getState());
    assert(st.templateCount > 0, `Templates: ${st.templateCount}`);
    assert(st.variableCount > 0, `Variables: ${st.variableCount}`);
    assert(st.categoryCount > 0, `Categories: ${st.categoryCount}`);
    assert(await page.evaluate(() => localStorage.getItem('prompt-templates-config') !== null), 'State persisted');
  } catch (err) { failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-106: Custom Prompt Templates - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
