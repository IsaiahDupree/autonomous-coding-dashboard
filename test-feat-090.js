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

    const hasAPI = await page.evaluate(() => typeof window.mobileResponsive === 'object');
    assert(hasAPI, 'mobileResponsive API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('mobile-responsive-card'));
    assert(hasCard, 'Mobile responsive card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.mr-tab').length === 3);
    assert(hasTabs, 'Three tabs exist (Breakpoints, Touch Controls, Key Metrics)');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.mr-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Works on phone/tablet ===
    console.log('\n=== AC1: Works on phone/tablet ===');

    const breakpoints = await page.evaluate(() => window.mobileResponsive.getBreakpoints());
    assert(breakpoints.length > 0, `${breakpoints.length} breakpoints`);
    assert(breakpoints.length === 7, 'Has 7 breakpoints');

    const firstBp = breakpoints[0];
    assert(firstBp.id !== undefined, 'Breakpoint has id');
    assert(firstBp.name !== undefined, `Name: ${firstBp.name}`);
    assert(firstBp.device !== undefined, `Device: ${firstBp.device}`);
    assert(firstBp.minWidth >= 0, `Min width: ${firstBp.minWidth}`);
    assert(firstBp.maxWidth > 0, `Max width: ${firstBp.maxWidth}`);
    assert(firstBp.columns > 0, `Columns: ${firstBp.columns}`);
    assert(firstBp.fontSize > 0, `Font size: ${firstBp.fontSize}`);
    assert(firstBp.touchTarget > 0, `Touch target: ${firstBp.touchTarget}`);

    // Device types present
    const devices = new Set(breakpoints.map(bp => bp.device));
    assert(devices.has('phone'), 'Has phone breakpoints');
    assert(devices.has('tablet'), 'Has tablet breakpoints');
    assert(devices.has('desktop'), 'Has desktop breakpoints');

    // Current breakpoint
    const current = await page.evaluate(() => window.mobileResponsive.getCurrentBreakpoint());
    assert(current !== null, 'Has current breakpoint');
    assert(current.name !== undefined, `Current: ${current.name}`);
    assert(current.active === true, 'Current is active');

    // Breakpoint for specific width
    const phoneBreakpoint = await page.evaluate(() => window.mobileResponsive.getBreakpointForWidth(375));
    assert(phoneBreakpoint.device === 'phone', 'Width 375 = phone');
    assert(phoneBreakpoint.columns === 1, 'Phone has 1 column');

    const tabletBreakpoint = await page.evaluate(() => window.mobileResponsive.getBreakpointForWidth(768));
    assert(tabletBreakpoint.device === 'tablet', 'Width 768 = tablet');
    assert(tabletBreakpoint.columns === 2, 'Tablet has 2 columns');

    // Responsive status
    const status = await page.evaluate(() => window.mobileResponsive.getResponsiveStatus());
    assert(status.currentDevice !== undefined, `Device: ${status.currentDevice}`);
    assert(status.breakpoint !== undefined, `Breakpoint: ${status.breakpoint}`);
    assert(status.columns > 0, `Columns: ${status.columns}`);
    assert(status.touchEnabled !== undefined, `Touch: ${status.touchEnabled}`);

    // Breakpoint list rendered
    const bpList = await page.evaluate(() => !!document.getElementById('mr-breakpoint-list'));
    assert(bpList, 'Breakpoint list rendered');

    const bpItems = await page.evaluate(() => document.querySelectorAll('.mr-breakpoint-item').length);
    assert(bpItems > 0, `${bpItems} breakpoint items rendered`);

    // === AC2: Touch-friendly controls ===
    console.log('\n=== AC2: Touch-friendly controls ===');

    const controls = await page.evaluate(() => window.mobileResponsive.getTouchControls());
    assert(controls.length > 0, `${controls.length} touch controls`);
    assert(controls.length === 6, 'Has 6 touch controls');

    const firstCtrl = controls[0];
    assert(firstCtrl.id !== undefined, 'Control has id');
    assert(firstCtrl.name !== undefined, `Name: ${firstCtrl.name}`);
    assert(firstCtrl.gesture !== undefined, `Gesture: ${firstCtrl.gesture}`);
    assert(firstCtrl.action !== undefined, `Action: ${firstCtrl.action}`);
    assert(firstCtrl.enabled !== undefined, `Enabled: ${firstCtrl.enabled}`);
    assert(firstCtrl.description !== undefined, 'Has description');

    // Gesture types
    const gestures = new Set(controls.map(c => c.gesture));
    assert(gestures.has('tap'), 'Has tap gesture');
    assert(gestures.has('swipe'), 'Has swipe gesture');
    assert(gestures.has('longpress'), 'Has long press gesture');
    assert(gestures.has('pinch'), 'Has pinch gesture');

    // Toggle control
    const toggled = await page.evaluate((id) => window.mobileResponsive.toggleTouchControl(id), firstCtrl.id);
    assert(typeof toggled === 'boolean', 'toggleTouchControl returns boolean');

    // Switch to touch tab
    await page.evaluate(() => window.mobileResponsive.setTab('touch'));
    await new Promise(r => setTimeout(r, 300));

    const touchTabActive = await page.evaluate(() => {
      return document.querySelector('.mr-tab[data-tab="touch"]').classList.contains('active');
    });
    assert(touchTabActive, 'Touch Controls tab becomes active');

    const touchSection = await page.evaluate(() => !!document.getElementById('mr-touch-section'));
    assert(touchSection, 'Touch section rendered');

    const touchItems = await page.evaluate(() => document.querySelectorAll('.mr-touch-item').length);
    assert(touchItems > 0, `${touchItems} touch items rendered`);

    // === AC3: Key metrics visible ===
    console.log('\n=== AC3: Key metrics visible ===');

    const metrics = await page.evaluate(() => window.mobileResponsive.getKeyMetrics());
    assert(metrics.length > 0, `${metrics.length} key metrics`);
    assert(metrics.length === 8, 'Has 8 key metrics');

    const firstMetric = metrics[0];
    assert(firstMetric.id !== undefined, 'Metric has id');
    assert(firstMetric.name !== undefined, `Name: ${firstMetric.name}`);
    assert(firstMetric.value !== undefined, `Value: ${firstMetric.value}`);
    assert(firstMetric.priority !== undefined, `Priority: ${firstMetric.priority}`);
    assert(firstMetric.visible !== undefined, `Visible: ${firstMetric.visible}`);
    assert(firstMetric.mobileOptimized !== undefined, `Optimized: ${firstMetric.mobileOptimized}`);

    // Get specific metric
    const specificMetric = await page.evaluate((id) => window.mobileResponsive.getMetric(id), firstMetric.id);
    assert(specificMetric !== null, 'Can retrieve specific metric');

    // Mobile optimized metrics
    const optimized = metrics.filter(m => m.mobileOptimized);
    assert(optimized.length > 0, `${optimized.length} mobile-optimized metrics`);

    // High priority metrics
    const highPriority = metrics.filter(m => m.priority === 'high');
    assert(highPriority.length > 0, `${highPriority.length} high-priority metrics`);

    // Visible metrics
    const visible = metrics.filter(m => m.visible);
    assert(visible.length > 0, `${visible.length} visible metrics`);

    // Switch to metrics tab
    await page.evaluate(() => window.mobileResponsive.setTab('metrics'));
    await new Promise(r => setTimeout(r, 300));

    const metricsTabActive = await page.evaluate(() => {
      return document.querySelector('.mr-tab[data-tab="metrics"]').classList.contains('active');
    });
    assert(metricsTabActive, 'Key Metrics tab becomes active');

    const metricsSection = await page.evaluate(() => !!document.getElementById('mr-metrics-section'));
    assert(metricsSection, 'Metrics section rendered');

    const metricItems = await page.evaluate(() => document.querySelectorAll('.mr-metric-item').length);
    assert(metricItems > 0, `${metricItems} metric items rendered`);

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.mobileResponsive.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.currentBreakpoint !== undefined, `Breakpoint: ${stateObj.currentBreakpoint}`);
    assert(stateObj.breakpointCount > 0, `Breakpoints: ${stateObj.breakpointCount}`);
    assert(stateObj.touchControlCount > 0, `Touch controls: ${stateObj.touchControlCount}`);
    assert(stateObj.metricCount > 0, `Metrics: ${stateObj.metricCount}`);

    const savedState = await page.evaluate(() => localStorage.getItem('mobile-responsive-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-090: Mobile-Responsive Dashboard - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
