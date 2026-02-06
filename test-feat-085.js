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

    const hasAPI = await page.evaluate(() => typeof window.dbOptimizer === 'object');
    assert(hasAPI, 'dbOptimizer API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('db-optimizer-card'));
    assert(hasCard, 'DB optimizer card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.dbo-tab').length === 3);
    assert(hasTabs, 'Three tabs exist');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.dbo-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Index optimization ===
    console.log('\n=== AC1: Index optimization ===');

    const indexes = await page.evaluate(() => window.dbOptimizer.getIndexes());
    assert(indexes.length > 0, `${indexes.length} indexes`);
    assert(indexes.length === 8, 'Has 8 indexes');

    const first = indexes[0];
    assert(first.id !== undefined, 'Index has id');
    assert(first.table !== undefined, `Table: ${first.table}`);
    assert(first.column !== undefined, `Column: ${first.column}`);
    assert(first.type !== undefined, `Type: ${first.type}`);
    assert(first.size !== undefined, `Size: ${first.size}`);
    assert(first.usage >= 0, `Usage: ${first.usage}%`);
    assert(first.status !== undefined, `Status: ${first.status}`);

    // Filter by table
    const featureIdx = await page.evaluate(() => window.dbOptimizer.getIndexes({ table: 'features' }));
    assert(featureIdx.length > 0, `${featureIdx.length} feature indexes`);
    const allFeature = featureIdx.every(i => i.table === 'features');
    assert(allFeature, 'All filtered indexes are for features table');

    // Filter by status
    const unusedIdx = await page.evaluate(() => window.dbOptimizer.getIndexes({ status: 'unused' }));
    assert(unusedIdx.length > 0, `${unusedIdx.length} unused indexes`);

    // Get specific index
    const specific = await page.evaluate((id) => window.dbOptimizer.getIndex(id), first.id);
    assert(specific !== null, 'Can retrieve specific index');

    // Index suggestions
    const suggestions = await page.evaluate(() => window.dbOptimizer.getIndexSuggestions());
    assert(suggestions.length > 0, `${suggestions.length} index suggestions`);
    assert(suggestions[0].table !== undefined, 'Suggestion has table');
    assert(suggestions[0].column !== undefined, 'Suggestion has column');
    assert(suggestions[0].reason !== undefined, 'Suggestion has reason');
    assert(suggestions[0].impact !== undefined, `Impact: ${suggestions[0].impact}`);

    // Index list rendered
    const indexList = await page.evaluate(() => !!document.getElementById('dbo-index-list'));
    assert(indexList, 'Index list rendered');

    const indexItems = await page.evaluate(() => document.querySelectorAll('.dbo-item').length);
    assert(indexItems > 0, `${indexItems} index items rendered`);

    // === AC2: Query analysis ===
    console.log('\n=== AC2: Query analysis ===');

    const queries = await page.evaluate(() => window.dbOptimizer.getQueryLog());
    assert(queries.length > 0, `${queries.length} queries in log`);
    assert(queries.length === 6, 'Has 6 queries');

    const firstQ = queries[0];
    assert(firstQ.id !== undefined, 'Query has id');
    assert(firstQ.query !== undefined, 'Query has SQL');
    assert(firstQ.table !== undefined, `Query table: ${firstQ.table}`);
    assert(firstQ.avgTime > 0, `Avg time: ${firstQ.avgTime}ms`);
    assert(firstQ.execCount > 0, `Exec count: ${firstQ.execCount}`);
    assert(firstQ.status !== undefined, `Status: ${firstQ.status}`);
    assert(firstQ.plan !== undefined, 'Query has execution plan');

    // Slow queries
    const slow = await page.evaluate(() => window.dbOptimizer.getSlowQueries());
    assert(slow.length > 0, `${slow.length} slow queries`);
    const allSlow = slow.every(q => q.status === 'slow');
    assert(allSlow, 'All slow queries have slow status');

    // Analyze query
    const analysis = await page.evaluate((id) => window.dbOptimizer.analyzeQuery(id), slow[0].id);
    assert(analysis !== null, 'Query analysis returned');
    assert(analysis.plan !== undefined, 'Analysis has plan');
    assert(analysis.suggestions.length > 0, `${analysis.suggestions.length} optimization suggestions`);

    // Filter by status
    const optimized = await page.evaluate(() => window.dbOptimizer.getQueryLog({ status: 'optimized' }));
    assert(optimized.length > 0, `${optimized.length} optimized queries`);

    // Switch to queries tab
    await page.evaluate(() => window.dbOptimizer.setTab('queries'));
    await new Promise(r => setTimeout(r, 300));

    const queryTabActive = await page.evaluate(() => {
      return document.querySelector('.dbo-tab[data-tab="queries"]').classList.contains('active');
    });
    assert(queryTabActive, 'Query Analysis tab becomes active');

    const queryList = await page.evaluate(() => !!document.getElementById('dbo-query-list'));
    assert(queryList, 'Query list rendered');

    // === AC3: Connection pooling ===
    console.log('\n=== AC3: Connection pooling ===');

    const pool = await page.evaluate(() => window.dbOptimizer.getConnectionPool());
    assert(pool.maxConnections > 0, `Max connections: ${pool.maxConnections}`);
    assert(pool.activeConnections >= 0, `Active: ${pool.activeConnections}`);
    assert(pool.idleConnections >= 0, `Idle: ${pool.idleConnections}`);
    assert(pool.waitingRequests >= 0, `Waiting: ${pool.waitingRequests}`);
    assert(pool.totalCreated > 0, `Total created: ${pool.totalCreated}`);
    assert(pool.totalDestroyed > 0, `Total destroyed: ${pool.totalDestroyed}`);
    assert(pool.avgAcquireTime > 0, `Avg acquire: ${pool.avgAcquireTime}ms`);
    assert(pool.avgQueryTime > 0, `Avg query: ${pool.avgQueryTime}ms`);

    // Pool utilization
    const util = await page.evaluate(() => window.dbOptimizer.getPoolUtilization());
    assert(util.utilization >= 0, `Utilization: ${util.utilization}%`);
    assert(util.available >= 0, `Available: ${util.available}`);
    assert(util.healthy !== undefined, `Healthy: ${util.healthy}`);

    // Update pool config
    const updated = await page.evaluate(() => window.dbOptimizer.updatePoolConfig({ maxConnections: 30 }));
    assert(updated.maxConnections === 30, 'Pool config updated to 30');

    // Switch to pool tab
    await page.evaluate(() => window.dbOptimizer.setTab('pool'));
    await new Promise(r => setTimeout(r, 300));

    const poolTabActive = await page.evaluate(() => {
      return document.querySelector('.dbo-tab[data-tab="pool"]').classList.contains('active');
    });
    assert(poolTabActive, 'Connection Pool tab becomes active');

    const poolSection = await page.evaluate(() => !!document.getElementById('dbo-pool-section'));
    assert(poolSection, 'Pool section rendered');

    const poolCards = await page.evaluate(() => document.querySelectorAll('.dbo-pool-card').length);
    assert(poolCards === 8, `${poolCards} pool metric cards`);

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.dbOptimizer.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.indexCount === 8, `State tracks ${stateObj.indexCount} indexes`);
    assert(stateObj.queryCount === 6, `State tracks ${stateObj.queryCount} queries`);
    assert(stateObj.poolConfig !== undefined, 'State has pool config');

    const savedState = await page.evaluate(() => localStorage.getItem('db-optimizer-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-085: Database Query Optimization - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
