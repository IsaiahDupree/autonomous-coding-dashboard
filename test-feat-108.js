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

    assert(await page.evaluate(() => typeof window.systemHealth === 'object'), 'API exists');
    assert(await page.evaluate(() => !!document.getElementById('system-health-card')), 'Card rendered');
    assert(await page.evaluate(() => document.querySelectorAll('#system-health-card .sh-tab').length === 3), 'Three tabs');
    assert(await page.evaluate(() => document.querySelectorAll('#system-health-card .sh-stat-card').length === 4), 'Four stats');

    const checks = await page.evaluate(() => window.systemHealth.getChecks());
    assert(checks.length === 6, `${checks.length} checks`);
    const c = checks[0];
    assert(c.name !== undefined, `Name: ${c.name}`);
    assert(['healthy', 'degraded', 'down'].includes(c.status), `Status: ${c.status}`);
    assert(c.uptime !== undefined, `Uptime: ${c.uptime}`);
    assert(c.responseTime !== undefined, `Response: ${c.responseTime}`);
    assert(await page.evaluate((id) => window.systemHealth.getCheck(id) !== null, c.id), 'Get check');
    const healthy = await page.evaluate(() => window.systemHealth.getHealthyChecks());
    assert(healthy.length > 0, `${healthy.length} healthy`);
    await page.evaluate(() => window.systemHealth.setTab('checks'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('sh-check-list')), 'Check list');

    const metrics = await page.evaluate(() => window.systemHealth.getMetrics());
    assert(metrics.length === 8, `${metrics.length} metrics`);
    assert(metrics[0].name !== undefined, `Name: ${metrics[0].name}`);
    assert(metrics[0].value !== undefined, `Value: ${metrics[0].value}`);
    assert(metrics[0].unit !== undefined, `Unit: ${metrics[0].unit}`);
    assert(metrics[0].threshold !== undefined, `Threshold: ${metrics[0].threshold}`);
    assert(metrics[0].trend !== undefined, `Trend: ${metrics[0].trend}`);
    assert(await page.evaluate((id) => window.systemHealth.getMetric(id) !== null, metrics[0].id), 'Get metric');
    await page.evaluate(() => window.systemHealth.setTab('metrics'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('sh-metric-section')), 'Metric section');

    const alerts = await page.evaluate(() => window.systemHealth.getAlerts());
    assert(alerts.length === 5, `${alerts.length} alerts`);
    assert(alerts[0].severity !== undefined, `Severity: ${alerts[0].severity}`);
    assert(alerts[0].message !== undefined, `Message: ${alerts[0].message}`);
    assert(alerts[0].service !== undefined, `Service: ${alerts[0].service}`);
    assert(alerts[0].acknowledged !== undefined, `Ack: ${alerts[0].acknowledged}`);
    assert(await page.evaluate((id) => window.systemHealth.getAlert(id) !== null, alerts[0].id), 'Get alert');
    await page.evaluate(() => window.systemHealth.setTab('alerts'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('sh-alert-section')), 'Alert section');

    const st = await page.evaluate(() => window.systemHealth.getState());
    assert(st.checkCount > 0, `Checks: ${st.checkCount}`);
    assert(st.metricCount > 0, `Metrics: ${st.metricCount}`);
    assert(st.alertCount > 0, `Alerts: ${st.alertCount}`);
    assert(await page.evaluate(() => localStorage.getItem('system-health-config') !== null), 'State persisted');
  } catch (err) { failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-108: System Health Dashboard - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
