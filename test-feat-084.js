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

    const hasAPI = await page.evaluate(() => typeof window.loadOptimizer === 'object');
    assert(hasAPI, 'loadOptimizer API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('load-optimizer-card'));
    assert(hasCard, 'Load optimizer card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.lo-tab').length === 3);
    assert(hasTabs, 'Three tabs exist (Metrics, Lazy Loading, Caching)');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.lo-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Sub-second initial load ===
    console.log('\n=== AC1: Sub-second initial load ===');

    const metrics = await page.evaluate(() => window.loadOptimizer.getMetrics());
    assert(metrics.initialLoadMs > 0, `Initial load: ${metrics.initialLoadMs}ms`);
    assert(metrics.initialLoadMs < 1000, 'Load time is sub-second');
    assert(metrics.domContentLoaded > 0, `DOMContentLoaded: ${metrics.domContentLoaded}ms`);
    assert(metrics.firstContentfulPaint > 0, `FCP: ${metrics.firstContentfulPaint}ms`);
    assert(metrics.largestContentfulPaint > 0, `LCP: ${metrics.largestContentfulPaint}ms`);
    assert(metrics.timeToInteractive > 0, `TTI: ${metrics.timeToInteractive}ms`);
    assert(metrics.totalBlockingTime >= 0, `TBT: ${metrics.totalBlockingTime}ms`);
    assert(metrics.cumulativeLayoutShift >= 0, `CLS: ${metrics.cumulativeLayoutShift}`);
    assert(metrics.firstInputDelay >= 0, `FID: ${metrics.firstInputDelay}ms`);
    assert(metrics.resourceCount > 0, `Resources: ${metrics.resourceCount}`);
    assert(metrics.totalTransferSize > 0, `Transfer: ${metrics.totalTransferSize}MB`);
    assert(metrics.domNodes > 0, `DOM nodes: ${metrics.domNodes}`);
    assert(metrics.jsHeapSize > 0, `JS heap: ${metrics.jsHeapSize}MB`);

    const subSecond = await page.evaluate(() => window.loadOptimizer.isSubSecondLoad());
    assert(subSecond === true, 'isSubSecondLoad() returns true');

    const perfScore = await page.evaluate(() => window.loadOptimizer.getPerformanceScore());
    assert(perfScore > 0, `Performance score: ${perfScore}`);
    assert(perfScore <= 100, 'Score is <= 100');

    // Metrics rendered
    const metricList = await page.evaluate(() => !!document.getElementById('lo-metric-list'));
    assert(metricList, 'Metric list rendered');

    const metricItems = await page.evaluate(() => document.querySelectorAll('.lo-metric-item').length);
    assert(metricItems > 0, `${metricItems} metric items rendered`);

    const metricBars = await page.evaluate(() => document.querySelectorAll('.lo-metric-fill').length);
    assert(metricBars > 0, `${metricBars} metric progress bars`);

    // === AC2: Lazy loading ===
    console.log('\n=== AC2: Lazy loading ===');

    const lazyItems = await page.evaluate(() => window.loadOptimizer.getLazyLoadStatus());
    assert(lazyItems.length > 0, `${lazyItems.length} lazy load items`);
    assert(lazyItems.length === 8, 'Has 8 lazy load items');

    const firstLazy = lazyItems[0];
    assert(firstLazy.id !== undefined, 'Lazy item has id');
    assert(firstLazy.name !== undefined, 'Lazy item has name');
    assert(firstLazy.type !== undefined, `Lazy type: ${firstLazy.type}`);
    assert(firstLazy.strategy !== undefined, `Strategy: ${firstLazy.strategy}`);
    assert(firstLazy.loaded !== undefined, 'Lazy item has loaded flag');
    assert(firstLazy.size !== undefined, `Size: ${firstLazy.size}`);
    assert(firstLazy.priority !== undefined, `Priority: ${firstLazy.priority}`);

    // Loaded items have load time
    const loadedItems = lazyItems.filter(i => i.loaded);
    assert(loadedItems.length > 0, `${loadedItems.length} items already loaded`);
    assert(loadedItems[0].loadTime > 0, `Load time: ${loadedItems[0].loadTime}ms`);

    // Pending items
    const pendingItems = lazyItems.filter(i => !i.loaded);
    assert(pendingItems.length > 0, `${pendingItems.length} items pending`);

    // Get specific item
    const specificLazy = await page.evaluate((id) => window.loadOptimizer.getLazyLoadItem(id), firstLazy.id);
    assert(specificLazy !== null, 'Can retrieve specific lazy item');

    // Trigger lazy load
    if (pendingItems.length > 0) {
      const triggered = await page.evaluate((id) => window.loadOptimizer.triggerLazyLoad(id), pendingItems[0].id);
      assert(triggered === true, 'triggerLazyLoad returns true');
      const afterTrigger = await page.evaluate((id) => window.loadOptimizer.getLazyLoadItem(id), pendingItems[0].id);
      assert(afterTrigger.loaded === true, 'Item now loaded');
      assert(afterTrigger.loadTime > 0, `Loaded in ${afterTrigger.loadTime}ms`);
    }

    // Strategies
    const strategies = new Set(lazyItems.map(i => i.strategy));
    assert(strategies.has('viewport'), 'Has viewport strategy');
    assert(strategies.has('idle'), 'Has idle strategy');
    assert(strategies.has('interaction'), 'Has interaction strategy');
    assert(strategies.has('immediate'), 'Has immediate strategy');

    // Switch to lazy tab
    await page.evaluate(() => window.loadOptimizer.setTab('lazy'));
    await new Promise(r => setTimeout(r, 300));

    const lazyTabActive = await page.evaluate(() => {
      return document.querySelector('.lo-tab[data-tab="lazy"]').classList.contains('active');
    });
    assert(lazyTabActive, 'Lazy Loading tab becomes active');

    const lazyList = await page.evaluate(() => !!document.getElementById('lo-lazy-list'));
    assert(lazyList, 'Lazy list rendered');

    const lazyEls = await page.evaluate(() => document.querySelectorAll('.lo-lazy-item').length);
    assert(lazyEls > 0, `${lazyEls} lazy items rendered`);

    // === AC3: Caching strategy ===
    console.log('\n=== AC3: Caching strategy ===');

    const caches = await page.evaluate(() => window.loadOptimizer.getCacheStatus());
    assert(caches.length > 0, `${caches.length} cache entries`);
    assert(caches.length === 6, 'Has 6 cache entries');

    const firstCache = caches[0];
    assert(firstCache.id !== undefined, 'Cache has id');
    assert(firstCache.name !== undefined, 'Cache has name');
    assert(firstCache.type !== undefined, `Cache type: ${firstCache.type}`);
    assert(firstCache.ttl >= 0, `TTL: ${firstCache.ttl}s`);
    assert(firstCache.hitRate >= 0, `Hit rate: ${firstCache.hitRate}%`);
    assert(firstCache.entries >= 0, `Entries: ${firstCache.entries}`);
    assert(firstCache.size !== undefined, `Size: ${firstCache.size}`);
    assert(firstCache.lastRefresh !== undefined, 'Cache has lastRefresh');

    // Get specific cache
    const specificCache = await page.evaluate((id) => window.loadOptimizer.getCacheItem(id), firstCache.id);
    assert(specificCache !== null, 'Can retrieve specific cache');

    // Cache types
    const cacheTypes = new Set(caches.map(c => c.type));
    assert(cacheTypes.has('memory'), 'Has memory cache');
    assert(cacheTypes.has('localStorage'), 'Has localStorage cache');
    assert(cacheTypes.has('serviceWorker'), 'Has serviceWorker cache');

    // Overall cache stats
    const cacheStats = await page.evaluate(() => window.loadOptimizer.getCacheOverallStats());
    assert(cacheStats.totalCaches === 6, `Total caches: ${cacheStats.totalCaches}`);
    assert(cacheStats.avgHitRate > 0, `Avg hit rate: ${cacheStats.avgHitRate}%`);
    assert(cacheStats.totalEntries > 0, `Total entries: ${cacheStats.totalEntries}`);
    assert(cacheStats.cacheTypes.length > 0, `${cacheStats.cacheTypes.length} cache types`);

    // Refresh cache
    const refreshed = await page.evaluate((id) => window.loadOptimizer.refreshCache(id), firstCache.id);
    assert(refreshed === true, 'refreshCache returns true');

    // Clear specific cache
    const cleared = await page.evaluate((id) => window.loadOptimizer.clearCache(id), firstCache.id);
    assert(cleared === true, 'clearCache returns true');
    const afterClear = await page.evaluate((id) => window.loadOptimizer.getCacheItem(id), firstCache.id);
    assert(afterClear.entries === 0, 'Cache entries cleared');

    // Switch to cache tab
    await page.evaluate(() => window.loadOptimizer.setTab('cache'));
    await new Promise(r => setTimeout(r, 300));

    const cacheTabActive = await page.evaluate(() => {
      return document.querySelector('.lo-tab[data-tab="cache"]').classList.contains('active');
    });
    assert(cacheTabActive, 'Caching tab becomes active');

    const cacheList = await page.evaluate(() => !!document.getElementById('lo-cache-list'));
    assert(cacheList, 'Cache list rendered');

    const cacheEls = await page.evaluate(() => document.querySelectorAll('.lo-cache-item').length);
    assert(cacheEls > 0, `${cacheEls} cache items rendered`);

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.loadOptimizer.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.loadTimeMs > 0, `Load time: ${stateObj.loadTimeMs}ms`);
    assert(stateObj.perfScore > 0, `Perf score: ${stateObj.perfScore}`);
    assert(stateObj.subSecondLoad === true, 'Sub-second load confirmed');

    const savedState = await page.evaluate(() => localStorage.getItem('load-optimizer-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-084: Dashboard Load Time Optimization - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
