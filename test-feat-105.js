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

    assert(await page.evaluate(() => typeof window.pluginArchitecture === 'object'), 'API exists');
    assert(await page.evaluate(() => !!document.getElementById('plugin-arch-card')), 'Card rendered');
    assert(await page.evaluate(() => document.querySelectorAll('#plugin-arch-card .pa-tab').length === 3), 'Three tabs');
    assert(await page.evaluate(() => document.querySelectorAll('#plugin-arch-card .pa-stat-card').length === 4), 'Four stats');

    const plugins = await page.evaluate(() => window.pluginArchitecture.getPlugins());
    assert(plugins.length === 6, `${plugins.length} plugins`);
    const p = plugins[0];
    assert(p.id !== undefined, `ID: ${p.id}`);
    assert(p.name !== undefined, `Name: ${p.name}`);
    assert(p.version !== undefined, `Version: ${p.version}`);
    assert(p.status !== undefined, `Status: ${p.status}`);
    assert(p.category !== undefined, `Category: ${p.category}`);
    assert(p.hooks.length > 0, `Hooks: ${p.hooks.length}`);
    assert(await page.evaluate((id) => window.pluginArchitecture.getPlugin(id) !== null, p.id), 'Get plugin');
    const active = await page.evaluate(() => window.pluginArchitecture.getActivePlugins());
    assert(active.length > 0, `${active.length} active`);
    assert(await page.evaluate(() => !!document.getElementById('pa-plugin-list')), 'Plugin list');

    const hooks = await page.evaluate(() => window.pluginArchitecture.getHooks());
    assert(hooks.length === 8, `${hooks.length} hooks`);
    assert(hooks[0].name !== undefined, `Name: ${hooks[0].name}`);
    assert(hooks[0].subscribers >= 0, `Subs: ${hooks[0].subscribers}`);
    assert(hooks[0].category !== undefined, `Cat: ${hooks[0].category}`);
    assert(await page.evaluate((id) => window.pluginArchitecture.getHook(id) !== null, hooks[0].id), 'Get hook');
    await page.evaluate(() => window.pluginArchitecture.setTab('hooks'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('pa-hook-section')), 'Hook section');

    const apis = await page.evaluate(() => window.pluginArchitecture.getPluginAPIs());
    assert(apis.length === 5, `${apis.length} APIs`);
    assert(apis[0].name !== undefined, `Name: ${apis[0].name}`);
    assert(apis[0].params.length > 0, `Params: ${apis[0].params.length}`);
    assert(apis[0].returnType !== undefined, `Return: ${apis[0].returnType}`);
    assert(await page.evaluate((id) => window.pluginArchitecture.getPluginAPI(id) !== null, apis[0].id), 'Get API');
    await page.evaluate(() => window.pluginArchitecture.setTab('apis'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('pa-api-section')), 'API section');

    const st = await page.evaluate(() => window.pluginArchitecture.getState());
    assert(st.pluginCount > 0, `Plugins: ${st.pluginCount}`);
    assert(st.hookCount > 0, `Hooks: ${st.hookCount}`);
    assert(st.apiCount > 0, `APIs: ${st.apiCount}`);
    assert(await page.evaluate(() => localStorage.getItem('plugin-arch-config') !== null), 'State persisted');
  } catch (err) { failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-105: Plugin Architecture - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
