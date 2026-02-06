const puppeteer = require('puppeteer');

(async () => {
  let passed = 0;
  let failed = 0;
  const results = [];

  function assert(condition, message) {
    if (condition) { passed++; results.push(`  ✓ ${message}`); }
    else { failed++; results.push(`  ✗ ${message}`); }
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));

    console.log('\n=== Basic Setup ===');
    assert(await page.evaluate(() => typeof window.rateLimiting === 'object'), 'rateLimiting API exists');
    assert(await page.evaluate(() => !!document.getElementById('rate-limit-card')), 'Card rendered');
    assert(await page.evaluate(() => document.querySelectorAll('#rate-limit-card .rl-tab').length === 3), 'Three tabs');
    assert(await page.evaluate(() => document.querySelectorAll('#rate-limit-card .rl-stat-card').length === 4), 'Four stats');

    console.log('\n=== AC1: Rate Limit Rules ===');
    const rules = await page.evaluate(() => window.rateLimiting.getRules());
    assert(rules.length === 6, `${rules.length} rules`);
    const r = rules[0];
    assert(r.id !== undefined, 'Has id');
    assert(r.name !== undefined, `Name: ${r.name}`);
    assert(r.endpoint !== undefined, `Endpoint: ${r.endpoint}`);
    assert(r.limit > 0, `Limit: ${r.limit}`);
    assert(r.window > 0, `Window: ${r.window}`);
    assert(r.strategy !== undefined, `Strategy: ${r.strategy}`);
    assert(r.enabled !== undefined, `Enabled: ${r.enabled}`);
    assert(r.action !== undefined, `Action: ${r.action}`);

    assert(await page.evaluate((id) => window.rateLimiting.getRule(id) !== null, r.id), 'Get specific rule');
    const active = await page.evaluate(() => window.rateLimiting.getActiveRules());
    assert(active.length > 0, `${active.length} active rules`);
    assert(active.length < rules.length, 'Some rules disabled');

    const strategies = new Set(rules.map(r => r.strategy));
    assert(strategies.has('sliding-window'), 'Has sliding-window');
    assert(strategies.has('fixed-window'), 'Has fixed-window');
    assert(strategies.has('token-bucket'), 'Has token-bucket');

    assert(await page.evaluate(() => !!document.getElementById('rl-rule-list')), 'Rule list rendered');
    assert(await page.evaluate(() => document.querySelectorAll('.rl-rule-item').length) > 0, 'Rule items rendered');

    console.log('\n=== AC2: Usage Stats ===');
    const usage = await page.evaluate(() => window.rateLimiting.getUsageStats());
    assert(usage.length === 6, `${usage.length} usage entries`);
    const u = usage[0];
    assert(u.endpoint !== undefined, `Endpoint: ${u.endpoint}`);
    assert(u.currentUsage >= 0, `Usage: ${u.currentUsage}`);
    assert(u.limit > 0, `Limit: ${u.limit}`);
    assert(u.remaining >= 0, `Remaining: ${u.remaining}`);
    assert(u.resetAt !== undefined, 'Has resetAt');
    assert(u.percentage >= 0, `Percentage: ${u.percentage}%`);

    const epUsage = await page.evaluate(() => window.rateLimiting.getUsageForEndpoint('/api/features'));
    assert(epUsage !== null, 'Get usage for endpoint');

    const check = await page.evaluate(() => window.rateLimiting.checkRateLimit('/api/features'));
    assert(check.allowed !== undefined, `Allowed: ${check.allowed}`);
    assert(check.remaining >= 0, `Remaining: ${check.remaining}`);

    await page.evaluate(() => window.rateLimiting.setTab('usage'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => document.querySelector('.rl-tab[data-tab="usage"]').classList.contains('active')), 'Usage tab active');
    assert(await page.evaluate(() => !!document.getElementById('rl-usage-section')), 'Usage section rendered');
    assert(await page.evaluate(() => document.querySelectorAll('.rl-usage-item').length) > 0, 'Usage items rendered');

    console.log('\n=== AC3: Violations ===');
    const violations = await page.evaluate(() => window.rateLimiting.getViolations());
    assert(violations.length === 5, `${violations.length} violations`);
    const v = violations[0];
    assert(v.id !== undefined, 'Has id');
    assert(v.endpoint !== undefined, `Endpoint: ${v.endpoint}`);
    assert(v.timestamp !== undefined, 'Has timestamp');
    assert(v.ip !== undefined, `IP: ${v.ip}`);
    assert(v.ruleId !== undefined, `Rule: ${v.ruleId}`);
    assert(v.attempts > 0, `Attempts: ${v.attempts}`);
    assert(v.action !== undefined, `Action: ${v.action}`);
    assert(v.severity !== undefined, `Severity: ${v.severity}`);

    assert(await page.evaluate((id) => window.rateLimiting.getViolation(id) !== null, v.id), 'Get specific violation');

    const sevs = new Set(violations.map(v => v.severity));
    assert(sevs.has('high'), 'Has high severity');
    assert(sevs.has('medium'), 'Has medium severity');
    assert(sevs.has('low'), 'Has low severity');

    await page.evaluate(() => window.rateLimiting.setTab('violations'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => document.querySelector('.rl-tab[data-tab="violations"]').classList.contains('active')), 'Violations tab active');
    assert(await page.evaluate(() => !!document.getElementById('rl-violations-section')), 'Violations section rendered');
    assert(await page.evaluate(() => document.querySelectorAll('.rl-violation-item').length) > 0, 'Violation items rendered');

    console.log('\n=== State ===');
    const st = await page.evaluate(() => window.rateLimiting.getState());
    assert(st.activeTab !== undefined, 'Has activeTab');
    assert(st.ruleCount > 0, `Rules: ${st.ruleCount}`);
    assert(st.activeRuleCount > 0, `Active: ${st.activeRuleCount}`);
    assert(st.violationCount > 0, `Violations: ${st.violationCount}`);
    assert(st.monitoredCount > 0, `Monitored: ${st.monitoredCount}`);

    const stats = await page.evaluate(() => window.rateLimiting.getRateLimitStats());
    assert(stats.totalRules > 0, `Stats rules: ${stats.totalRules}`);
    assert(stats.activeRules > 0, `Stats active: ${stats.activeRules}`);
    assert(stats.totalViolations > 0, `Stats violations: ${stats.totalViolations}`);
    assert(stats.endpointsMonitored > 0, `Stats monitored: ${stats.endpointsMonitored}`);

    assert(await page.evaluate(() => localStorage.getItem('rate-limit-config') !== null), 'State persisted');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-100: Rate Limiting for API Calls - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
