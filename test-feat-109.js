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

    assert(await page.evaluate(() => typeof window.apiLatency === 'object'), 'API exists');
    assert(await page.evaluate(() => !!document.getElementById('api-latency-card')), 'Card rendered');
    assert(await page.evaluate(() => document.querySelectorAll('#api-latency-card .al-tab').length === 3), 'Three tabs');
    assert(await page.evaluate(() => document.querySelectorAll('#api-latency-card .al-stat-card').length === 4), 'Four stats');

    const endpoints = await page.evaluate(() => window.apiLatency.getEndpoints());
    assert(endpoints.length === 8, `${endpoints.length} endpoints`);
    const e = endpoints[0];
    assert(e.name !== undefined, `Name: ${e.name}`);
    assert(e.avg !== undefined, `Avg: ${e.avg}`);
    assert(e.p50 !== undefined, `P50: ${e.p50}`);
    assert(e.p95 !== undefined, `P95: ${e.p95}`);
    assert(e.p99 !== undefined, `P99: ${e.p99}`);
    assert(await page.evaluate((id) => window.apiLatency.getEndpoint(id) !== null, e.id), 'Get endpoint');
    await page.evaluate(() => window.apiLatency.setTab('endpoints'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('al-endpoint-list')), 'Endpoint list');

    const trends = await page.evaluate(() => window.apiLatency.getTrends());
    assert(trends.length === 6, `${trends.length} trends`);
    assert(trends[0].endpoint !== undefined, `Endpoint: ${trends[0].endpoint}`);
    assert(trends[0].avgLatency !== undefined, `AvgLatency: ${trends[0].avgLatency}`);
    assert(trends[0].direction !== undefined, `Direction: ${trends[0].direction}`);
    assert(trends[0].change !== undefined, `Change: ${trends[0].change}`);
    assert(await page.evaluate((id) => window.apiLatency.getTrend(id) !== null, trends[0].id), 'Get trend');
    await page.evaluate(() => window.apiLatency.setTab('trends'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('al-trend-section')), 'Trend section');

    const slow = await page.evaluate(() => window.apiLatency.getSlowQueries());
    assert(slow.length === 4, `${slow.length} slow queries`);
    assert(slow[0].endpoint !== undefined, `Endpoint: ${slow[0].endpoint}`);
    assert(slow[0].duration !== undefined, `Duration: ${slow[0].duration}`);
    assert(slow[0].cause !== undefined, `Cause: ${slow[0].cause}`);
    assert(slow[0].status !== undefined, `Status: ${slow[0].status}`);
    assert(await page.evaluate((id) => window.apiLatency.getSlowQuery(id) !== null, slow[0].id), 'Get slow query');
    await page.evaluate(() => window.apiLatency.setTab('slow'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('al-slow-section')), 'Slow section');

    const st = await page.evaluate(() => window.apiLatency.getState());
    assert(st.endpointCount > 0, `Endpoints: ${st.endpointCount}`);
    assert(st.trendCount > 0, `Trends: ${st.trendCount}`);
    assert(st.slowCount > 0, `Slow: ${st.slowCount}`);
    assert(await page.evaluate(() => localStorage.getItem('api-latency-config') !== null), 'State persisted');
  } catch (err) { failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-109: API Latency Tracking - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
