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
    assert(await page.evaluate(() => typeof window.scheduledRuns === 'object'), 'scheduledRuns API exists');
    assert(await page.evaluate(() => !!document.getElementById('scheduled-runs-card')), 'Card rendered');
    assert(await page.evaluate(() => document.querySelectorAll('.sr-tab').length === 3), 'Three tabs');
    assert(await page.evaluate(() => document.querySelectorAll('#scheduled-runs-card .sr-stat-card').length === 4), 'Four stats');

    console.log('\n=== AC1: Schedules ===');
    const schedules = await page.evaluate(() => window.scheduledRuns.getSchedules());
    assert(schedules.length === 6, `${schedules.length} schedules`);
    const sch = schedules[0];
    assert(sch.id !== undefined, 'Has id');
    assert(sch.name !== undefined, `Name: ${sch.name}`);
    assert(sch.cron !== undefined, `Cron: ${sch.cron}`);
    assert(sch.frequency !== undefined, `Freq: ${sch.frequency}`);
    assert(sch.mode !== undefined, `Mode: ${sch.mode}`);
    assert(sch.enabled !== undefined, `Enabled: ${sch.enabled}`);
    assert(sch.timeout > 0, `Timeout: ${sch.timeout}`);

    assert(await page.evaluate((id) => window.scheduledRuns.getSchedule(id) !== null, sch.id), 'Get specific schedule');
    const active = await page.evaluate(() => window.scheduledRuns.getActiveSchedules());
    assert(active.length > 0, `${active.length} active schedules`);
    assert(active.length < schedules.length, 'Some schedules disabled');

    assert(await page.evaluate(() => !!document.getElementById('sr-schedule-list')), 'Schedule list rendered');
    assert(await page.evaluate(() => document.querySelectorAll('.sr-schedule-item').length) > 0, 'Schedule items rendered');

    console.log('\n=== AC2: Run History ===');
    const history = await page.evaluate(() => window.scheduledRuns.getRunHistory());
    assert(history.length === 8, `${history.length} history entries`);
    const run = history[0];
    assert(run.id !== undefined, 'Has id');
    assert(run.scheduleId !== undefined, `Schedule: ${run.scheduleId}`);
    assert(run.name !== undefined, `Name: ${run.name}`);
    assert(run.startedAt !== undefined, 'Has startedAt');
    assert(run.status !== undefined, `Status: ${run.status}`);
    assert(run.featuresRun > 0, `Features: ${run.featuresRun}`);
    assert(run.featuresPassed >= 0, `Passed: ${run.featuresPassed}`);
    assert(run.featuresFailed >= 0, `Failed: ${run.featuresFailed}`);

    assert(await page.evaluate((id) => window.scheduledRuns.getRunHistoryEntry(id) !== null, run.id), 'Get specific run');
    const schRuns = await page.evaluate(() => window.scheduledRuns.getRunsForSchedule('sch-001'));
    assert(schRuns.length > 0, `${schRuns.length} runs for sch-001`);

    const statuses = new Set(history.map(r => r.status));
    assert(statuses.has('completed'), 'Has completed runs');
    assert(statuses.has('failed'), 'Has failed runs');

    await page.evaluate(() => window.scheduledRuns.setTab('history'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => document.querySelector('.sr-tab[data-tab="history"]').classList.contains('active')), 'History tab active');
    assert(await page.evaluate(() => !!document.getElementById('sr-history-section')), 'History section rendered');
    assert(await page.evaluate(() => document.querySelectorAll('.sr-history-item').length) > 0, 'History items rendered');

    console.log('\n=== AC3: Queue ===');
    const queue = await page.evaluate(() => window.scheduledRuns.getQueuedRuns());
    assert(queue.length === 4, `${queue.length} queued runs`);
    const q = queue[0];
    assert(q.id !== undefined, 'Has id');
    assert(q.scheduleId !== undefined, `Schedule: ${q.scheduleId}`);
    assert(q.name !== undefined, `Name: ${q.name}`);
    assert(q.scheduledFor !== undefined, 'Has scheduledFor');
    assert(q.priority !== undefined, `Priority: ${q.priority}`);
    assert(q.estimatedDuration > 0, `Est: ${q.estimatedDuration}s`);

    assert(await page.evaluate((id) => window.scheduledRuns.getQueuedRun(id) !== null, q.id), 'Get specific queued run');

    const priorities = new Set(queue.map(q => q.priority));
    assert(priorities.has('high'), 'Has high priority');
    assert(priorities.has('medium'), 'Has medium priority');
    assert(priorities.has('low'), 'Has low priority');

    await page.evaluate(() => window.scheduledRuns.setTab('queue'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => document.querySelector('.sr-tab[data-tab="queue"]').classList.contains('active')), 'Queue tab active');
    assert(await page.evaluate(() => !!document.getElementById('sr-queue-section')), 'Queue section rendered');
    assert(await page.evaluate(() => document.querySelectorAll('.sr-queue-item').length) > 0, 'Queue items rendered');

    console.log('\n=== State ===');
    const st = await page.evaluate(() => window.scheduledRuns.getState());
    assert(st.activeTab !== undefined, 'Has activeTab');
    assert(st.scheduleCount > 0, `Schedules: ${st.scheduleCount}`);
    assert(st.activeCount > 0, `Active: ${st.activeCount}`);
    assert(st.runCount > 0, `Runs: ${st.runCount}`);
    assert(st.queuedCount > 0, `Queued: ${st.queuedCount}`);

    const stats = await page.evaluate(() => window.scheduledRuns.getScheduleStats());
    assert(stats.totalSchedules > 0, `Stats schedules: ${stats.totalSchedules}`);
    assert(stats.activeSchedules > 0, `Stats active: ${stats.activeSchedules}`);
    assert(stats.totalRuns > 0, `Stats runs: ${stats.totalRuns}`);
    assert(stats.queuedCount > 0, `Stats queued: ${stats.queuedCount}`);

    assert(await page.evaluate(() => localStorage.getItem('scheduled-runs-config') !== null), 'State persisted');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-099: Scheduled Harness Runs - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
