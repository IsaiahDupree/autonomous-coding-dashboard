const puppeteer = require('puppeteer');

(async () => {
  let passed = 0;
  let failed = 0;
  const results = [];

  function assert(condition, message) {
    if (condition) {
      passed++;
      results.push(`  ✓ ${message}`);
    } else {
      failed++;
      results.push(`  ✗ ${message}`);
    }
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));

    // === Basic Setup ===
    console.log('\n=== Basic Setup ===');

    const hasAPI = await page.evaluate(() => typeof window.memoryMonitor === 'object');
    assert(hasAPI, 'memoryMonitor API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('memory-monitor-card'));
    assert(hasCard, 'Memory monitor card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.mm-tab').length === 3);
    assert(hasTabs, 'Three tabs exist (Memory Usage, Alerts, GC Metrics)');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.mm-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Track memory usage ===
    console.log('\n=== AC1: Track memory usage ===');

    const usage = await page.evaluate(() => window.memoryMonitor.getCurrentUsage());
    assert(usage !== null, 'getCurrentUsage returns data');
    assert(usage.totalHeap > 0, `Total heap: ${usage.totalHeap}MB`);
    assert(usage.usedHeap > 0, `Used heap: ${usage.usedHeap}MB`);
    assert(usage.heapLimit > 0, `Heap limit: ${usage.heapLimit}MB`);
    assert(usage.usagePercent >= 0, `Usage percent: ${usage.usagePercent}%`);
    assert(usage.usagePercent <= 100, 'Usage percent <= 100');
    assert(usage.rss > 0, `RSS: ${usage.rss}MB`);
    assert(usage.external >= 0, `External: ${usage.external}MB`);
    assert(usage.arrayBuffers >= 0, `Array buffers: ${usage.arrayBuffers}MB`);
    assert(usage.timestamp !== undefined, 'Usage has timestamp');

    // Memory breakdown
    assert(usage.breakdown !== undefined, 'Usage has breakdown');
    assert(usage.breakdown.length > 0, `${usage.breakdown.length} breakdown items`);
    const firstBreakdown = usage.breakdown[0];
    assert(firstBreakdown.category !== undefined, `Category: ${firstBreakdown.category}`);
    assert(firstBreakdown.size > 0, `Size: ${firstBreakdown.size}MB`);
    assert(firstBreakdown.percent >= 0, `Percent: ${firstBreakdown.percent}%`);

    // History
    const history = await page.evaluate(() => window.memoryMonitor.getHistory());
    assert(history.length > 0, `${history.length} history entries`);
    const firstHist = history[0];
    assert(firstHist.timestamp !== undefined, 'History entry has timestamp');
    assert(firstHist.usedHeap > 0, 'History entry has usedHeap');
    assert(firstHist.totalHeap > 0, 'History entry has totalHeap');

    // High usage check
    const isHigh = await page.evaluate(() => window.memoryMonitor.isHighUsage());
    assert(typeof isHigh === 'boolean', `isHighUsage returns boolean: ${isHigh}`);

    // Memory usage list rendered
    const usageList = await page.evaluate(() => !!document.getElementById('mm-usage-list'));
    assert(usageList, 'Memory usage list rendered');

    const usageItems = await page.evaluate(() => document.querySelectorAll('.mm-usage-item').length);
    assert(usageItems > 0, `${usageItems} usage items rendered`);

    // === AC2: Alert on high usage ===
    console.log('\n=== AC2: Alert on high usage ===');

    const alerts = await page.evaluate(() => window.memoryMonitor.getAlerts());
    assert(alerts.length > 0, `${alerts.length} alerts`);

    const firstAlert = alerts[0];
    assert(firstAlert.id !== undefined, 'Alert has id');
    assert(firstAlert.type !== undefined, `Alert type: ${firstAlert.type}`);
    assert(firstAlert.message !== undefined, 'Alert has message');
    assert(firstAlert.severity !== undefined, `Severity: ${firstAlert.severity}`);
    assert(firstAlert.timestamp !== undefined, 'Alert has timestamp');
    assert(firstAlert.resolved !== undefined, 'Alert has resolved flag');
    assert(firstAlert.value !== undefined, `Alert value: ${firstAlert.value}`);

    // Alert severities
    const severities = new Set(alerts.map(a => a.severity));
    assert(severities.has('error'), 'Has error severity');
    assert(severities.has('warning'), 'Has warning severity');

    // Unresolved alerts
    const unresolved = alerts.filter(a => !a.resolved);
    assert(unresolved.length > 0, `${unresolved.length} unresolved alerts`);

    // Resolve alert
    const resolveResult = await page.evaluate((id) => window.memoryMonitor.resolveAlert(id), unresolved[0].id);
    assert(resolveResult === true, 'resolveAlert returns true');

    const afterResolve = await page.evaluate((id) => {
      const alerts = window.memoryMonitor.getAlerts();
      return alerts.find(a => a.id === id);
    }, unresolved[0].id);
    assert(afterResolve.resolved === true, 'Alert is now resolved');

    // Alert threshold
    const threshold = await page.evaluate(() => window.memoryMonitor.getAlertThreshold());
    assert(threshold > 0, `Alert threshold: ${threshold}%`);

    // Update threshold
    const newThreshold = await page.evaluate(() => window.memoryMonitor.setAlertThreshold(90));
    assert(newThreshold === 90, 'Threshold updated to 90');

    // Switch to alerts tab
    await page.evaluate(() => window.memoryMonitor.setTab('alerts'));
    await new Promise(r => setTimeout(r, 300));

    const alertTabActive = await page.evaluate(() => {
      return document.querySelector('.mm-tab[data-tab="alerts"]').classList.contains('active');
    });
    assert(alertTabActive, 'Alerts tab becomes active');

    const alertList = await page.evaluate(() => !!document.getElementById('mm-alert-list'));
    assert(alertList, 'Alert list rendered');

    const alertItems = await page.evaluate(() => document.querySelectorAll('.mm-alert-item').length);
    assert(alertItems > 0, `${alertItems} alert items rendered`);

    // === AC3: Garbage collection metrics ===
    console.log('\n=== AC3: Garbage collection metrics ===');

    const gc = await page.evaluate(() => window.memoryMonitor.getGarbageCollection());
    assert(gc !== null, 'getGarbageCollection returns data');
    assert(gc.totalCollections > 0, `Total collections: ${gc.totalCollections}`);
    assert(gc.minorGC > 0, `Minor GC: ${gc.minorGC}`);
    assert(gc.majorGC > 0, `Major GC: ${gc.majorGC}`);
    assert(gc.totalPauseTime > 0, `Total pause time: ${gc.totalPauseTime}ms`);
    assert(gc.avgPauseTime > 0, `Avg pause time: ${gc.avgPauseTime}ms`);
    assert(gc.maxPauseTime > 0, `Max pause time: ${gc.maxPauseTime}ms`);
    assert(gc.lastGCTime !== undefined, 'Has lastGCTime');
    assert(gc.freedMemory > 0, `Freed memory: ${gc.freedMemory}MB`);
    assert(gc.gcFrequency > 0, `GC frequency: ${gc.gcFrequency}/min`);
    assert(gc.heapGrowthRate !== undefined, `Heap growth: ${gc.heapGrowthRate}MB/min`);
    assert(gc.fragmentation >= 0, `Fragmentation: ${gc.fragmentation}%`);
    assert(gc.efficiency > 0, `Efficiency: ${gc.efficiency}%`);

    // Switch to GC tab
    await page.evaluate(() => window.memoryMonitor.setTab('gc'));
    await new Promise(r => setTimeout(r, 300));

    const gcTabActive = await page.evaluate(() => {
      return document.querySelector('.mm-tab[data-tab="gc"]').classList.contains('active');
    });
    assert(gcTabActive, 'GC Metrics tab becomes active');

    const gcSection = await page.evaluate(() => !!document.getElementById('mm-gc-section'));
    assert(gcSection, 'GC section rendered');

    const gcCards = await page.evaluate(() => document.querySelectorAll('.mm-gc-card').length);
    assert(gcCards > 0, `${gcCards} GC metric cards rendered`);

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.memoryMonitor.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.currentUsage !== undefined, 'State has currentUsage');
    assert(stateObj.alertCount > 0, `State tracks ${stateObj.alertCount} alerts`);
    assert(stateObj.threshold > 0, `State threshold: ${stateObj.threshold}%`);

    const savedState = await page.evaluate(() => localStorage.getItem('memory-monitor-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-086: Memory Usage Monitoring - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
