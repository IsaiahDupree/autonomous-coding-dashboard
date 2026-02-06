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
    assert(await page.evaluate(() => typeof window.offHoursMode === 'object'), 'offHoursMode API exists');
    assert(await page.evaluate(() => !!document.getElementById('off-hours-card')), 'Card rendered');
    assert(await page.evaluate(() => document.querySelectorAll('#off-hours-card .oh-tab').length === 3), 'Three tabs');
    assert(await page.evaluate(() => document.querySelectorAll('#off-hours-card .oh-stat-card').length === 4), 'Four stats');

    console.log('\n=== AC1: Time Windows ===');
    const windows = await page.evaluate(() => window.offHoursMode.getWindows());
    assert(windows.length === 6, `${windows.length} windows`);
    const w = windows[0];
    assert(w.id !== undefined, 'Has id');
    assert(w.name !== undefined, `Name: ${w.name}`);
    assert(w.startTime !== undefined, `Start: ${w.startTime}`);
    assert(w.endTime !== undefined, `End: ${w.endTime}`);
    assert(w.days.length > 0, `Days: ${w.days.length}`);
    assert(w.timezone !== undefined, `TZ: ${w.timezone}`);
    assert(w.enabled !== undefined, `Enabled: ${w.enabled}`);
    assert(w.priority !== undefined, `Priority: ${w.priority}`);

    assert(await page.evaluate((id) => window.offHoursMode.getWindow(id) !== null, w.id), 'Get specific window');
    const active = await page.evaluate(() => window.offHoursMode.getActiveWindows());
    assert(active.length > 0, `${active.length} active windows`);
    assert(active.length < windows.length, 'Some windows disabled');

    const offHours = await page.evaluate(() => typeof window.offHoursMode.isOffHours() === 'boolean');
    assert(offHours, 'isOffHours returns boolean');

    assert(await page.evaluate(() => !!document.getElementById('oh-window-list')), 'Window list rendered');
    assert(await page.evaluate(() => document.querySelectorAll('.oh-window-item').length) > 0, 'Window items rendered');

    console.log('\n=== AC2: Policies ===');
    const policies = await page.evaluate(() => window.offHoursMode.getPolicies());
    assert(policies.length === 5, `${policies.length} policies`);
    const p = policies[0];
    assert(p.id !== undefined, 'Has id');
    assert(p.name !== undefined, `Name: ${p.name}`);
    assert(p.description !== undefined, 'Has description');
    assert(p.type !== undefined, `Type: ${p.type}`);
    assert(p.enabled !== undefined, `Enabled: ${p.enabled}`);

    assert(await page.evaluate((id) => window.offHoursMode.getPolicy(id) !== null, p.id), 'Get specific policy');

    const types = new Set(policies.map(p => p.type));
    assert(types.has('resource'), 'Has resource type');
    assert(types.has('scheduling'), 'Has scheduling type');
    assert(types.has('scaling'), 'Has scaling type');

    await page.evaluate(() => window.offHoursMode.setTab('policies'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => document.querySelector('.oh-tab[data-tab="policies"]').classList.contains('active')), 'Policies tab active');
    assert(await page.evaluate(() => !!document.getElementById('oh-policy-section')), 'Policy section rendered');
    assert(await page.evaluate(() => document.querySelectorAll('.oh-policy-item').length) > 0, 'Policy items rendered');

    console.log('\n=== AC3: Execution History ===');
    const execs = await page.evaluate(() => window.offHoursMode.getExecutionHistory());
    assert(execs.length === 6, `${execs.length} executions`);
    const e = execs[0];
    assert(e.id !== undefined, 'Has id');
    assert(e.windowId !== undefined, `Window: ${e.windowId}`);
    assert(e.startedAt !== undefined, 'Has startedAt');
    assert(e.tasksCompleted >= 0, `Completed: ${e.tasksCompleted}`);
    assert(e.tasksFailed >= 0, `Failed: ${e.tasksFailed}`);
    assert(e.status !== undefined, `Status: ${e.status}`);

    assert(await page.evaluate((id) => window.offHoursMode.getExecution(id) !== null, e.id), 'Get specific execution');

    const statuses = new Set(execs.map(e => e.status));
    assert(statuses.has('completed'), 'Has completed');
    assert(statuses.has('failed'), 'Has failed');

    await page.evaluate(() => window.offHoursMode.setTab('executions'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => document.querySelector('.oh-tab[data-tab="executions"]').classList.contains('active')), 'Executions tab active');
    assert(await page.evaluate(() => !!document.getElementById('oh-execution-section')), 'Execution section rendered');
    assert(await page.evaluate(() => document.querySelectorAll('.oh-execution-item').length) > 0, 'Execution items rendered');

    console.log('\n=== State ===');
    const st = await page.evaluate(() => window.offHoursMode.getState());
    assert(st.activeTab !== undefined, 'Has activeTab');
    assert(st.windowCount > 0, `Windows: ${st.windowCount}`);
    assert(st.activeWindowCount > 0, `Active: ${st.activeWindowCount}`);
    assert(st.policyCount > 0, `Policies: ${st.policyCount}`);
    assert(st.executionCount > 0, `Executions: ${st.executionCount}`);

    const stats = await page.evaluate(() => window.offHoursMode.getOffHoursStats());
    assert(stats.totalWindows > 0, `Stats windows: ${stats.totalWindows}`);
    assert(stats.activeWindows > 0, `Stats active: ${stats.activeWindows}`);
    assert(stats.policyCount > 0, `Stats policies: ${stats.policyCount}`);
    assert(stats.executionCount > 0, `Stats execs: ${stats.executionCount}`);

    assert(await page.evaluate(() => localStorage.getItem('off-hours-config') !== null), 'State persisted');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-101: Off-hours Execution Mode - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
