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
    await new Promise(r => setTimeout(r, 2000));

    // === Basic Setup ===
    console.log('\n=== Basic Setup ===');

    const hasAPI = await page.evaluate(() => typeof window.targetHealth === 'object');
    assert(hasAPI, 'targetHealth API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('target-health-card'));
    assert(hasCard, 'Target health card rendered');

    // === AC1: Score Based on Completion Rate ===
    console.log('\n=== AC1: Score Based on Completion Rate ===');

    // Test calculateHealthScore with high completion
    const highCompletion = await page.evaluate(() => {
      return window.targetHealth.calculateHealthScore({
        completionRate: 90,
        errorRate: 5,
        velocity: 3,
      });
    });
    assert(highCompletion.score >= 70, `High completion score: ${highCompletion.score} (>= 70)`);
    assert(highCompletion.completionRate === 90, 'Completion rate tracked correctly');

    // Test with low completion
    const lowCompletion = await page.evaluate(() => {
      return window.targetHealth.calculateHealthScore({
        completionRate: 10,
        errorRate: 50,
        velocity: 0.5,
      });
    });
    assert(lowCompletion.score < 50, `Low completion score: ${lowCompletion.score} (< 50)`);

    // Test with 0% completion
    const zeroCompletion = await page.evaluate(() => {
      return window.targetHealth.calculateHealthScore({
        completionRate: 0,
        errorRate: 0,
        velocity: 0,
      });
    });
    assert(zeroCompletion.score <= 30, `Zero completion score: ${zeroCompletion.score} (<= 30)`);

    // Test with 100% completion
    const fullCompletion = await page.evaluate(() => {
      return window.targetHealth.calculateHealthScore({
        completionRate: 100,
        errorRate: 0,
        velocity: 5,
      });
    });
    assert(fullCompletion.score >= 80, `Full completion score: ${fullCompletion.score} (>= 80)`);

    // Completion rate is weighted at 50%
    const completionWeight = await page.evaluate(() => {
      const high = window.targetHealth.calculateHealthScore({ completionRate: 100, errorRate: 0, velocity: 0 });
      const low = window.targetHealth.calculateHealthScore({ completionRate: 0, errorRate: 0, velocity: 0 });
      return high.score - low.score;
    });
    assert(completionWeight >= 40, `Completion rate weight impact: ${completionWeight} (>= 40)`);

    // Score components exist
    assert(highCompletion.components !== undefined, 'Score has components');
    assert(highCompletion.components.completion !== undefined, 'Components include completion');

    // Overall health score displays
    const hasOverallScore = await page.evaluate(() => !!document.getElementById('th-overall-score'));
    assert(hasOverallScore, 'Overall health score displayed in UI');

    const hasHealthValue = await page.evaluate(() => !!document.getElementById('th-health-value'));
    assert(hasHealthValue, 'Health value displayed');

    // Metrics cards
    const metricsCount = await page.evaluate(() => document.querySelectorAll('.th-metric-card').length);
    assert(metricsCount === 4, `${metricsCount} metric cards displayed`);

    // === AC2: Factor in Error Rate ===
    console.log('\n=== AC2: Factor in Error Rate ===');

    // High error rate reduces score
    const highError = await page.evaluate(() => {
      return window.targetHealth.calculateHealthScore({
        completionRate: 50,
        errorRate: 80,
        velocity: 3,
      });
    });
    const lowError = await page.evaluate(() => {
      return window.targetHealth.calculateHealthScore({
        completionRate: 50,
        errorRate: 0,
        velocity: 3,
      });
    });
    assert(highError.score < lowError.score, `High error (${highError.score}) < Low error (${lowError.score})`);
    assert(highError.errorRate === 80, 'Error rate tracked');
    assert(lowError.errorRate === 0, 'Zero error rate tracked');

    // Error component in score
    assert(highError.components.error !== undefined, 'Error component in score');
    assert(highError.components.error < lowError.components.error, 'Higher error rate = lower error score');

    // Error logging
    await page.evaluate(() => {
      window.targetHealth.logError('Test error 1');
      window.targetHealth.logError('Test error 2');
    });
    const errorCount = await page.evaluate(() => window.targetHealth.getState().errorLog.length);
    assert(errorCount >= 2, `${errorCount} errors in error log`);

    // Error rate weight (30%)
    const errorWeight = await page.evaluate(() => {
      const noErr = window.targetHealth.calculateHealthScore({ completionRate: 50, errorRate: 0, velocity: 0 });
      const highErr = window.targetHealth.calculateHealthScore({ completionRate: 50, errorRate: 50, velocity: 0 });
      return noErr.score - highErr.score;
    });
    assert(errorWeight >= 20, `Error rate weight impact: ${errorWeight} (>= 20)`);

    // === AC3: Display Health Badge ===
    console.log('\n=== AC3: Display Health Badge ===');

    // Test badge levels
    const excellentBadge = await page.evaluate(() => window.targetHealth.getBadge(95));
    assert(excellentBadge.label === 'Excellent', `Score 95 = ${excellentBadge.label}`);

    const goodBadge = await page.evaluate(() => window.targetHealth.getBadge(80));
    assert(goodBadge.label === 'Good', `Score 80 = ${goodBadge.label}`);

    const fairBadge = await page.evaluate(() => window.targetHealth.getBadge(60));
    assert(fairBadge.label === 'Fair', `Score 60 = ${fairBadge.label}`);

    const poorBadge = await page.evaluate(() => window.targetHealth.getBadge(30));
    assert(poorBadge.label === 'Poor', `Score 30 = ${poorBadge.label}`);

    const criticalBadge = await page.evaluate(() => window.targetHealth.getBadge(10));
    assert(criticalBadge.label === 'Critical', `Score 10 = ${criticalBadge.label}`);

    // Badges have required properties
    assert(excellentBadge.class !== undefined, 'Badge has CSS class');
    assert(excellentBadge.color !== undefined, 'Badge has color');

    // Badge displayed in UI
    const hasBadgeInUI = await page.evaluate(() => document.querySelectorAll('.th-badge').length > 0);
    assert(hasBadgeInUI, 'Health badge displayed in UI');

    // Badge in card header
    const headerBadge = await page.evaluate(() => {
      const header = document.querySelector('#target-health-card .card-header');
      return header && header.querySelector('.th-badge') !== null;
    });
    assert(headerBadge, 'Health badge in card header');

    // Category health with badges
    const categoryList = await page.evaluate(() => document.getElementById('th-category-list') !== null);
    assert(categoryList, 'Category health list exists');

    const categoryBadges = await page.evaluate(() => {
      const list = document.getElementById('th-category-list');
      return list ? list.querySelectorAll('.th-badge').length : 0;
    });
    assert(categoryBadges > 0, `${categoryBadges} category health badges displayed`);

    // Category bars
    const categoryBars = await page.evaluate(() => {
      return document.querySelectorAll('.th-target-bar').length;
    });
    assert(categoryBars > 0, `${categoryBars} health bars displayed`);

    // Score components displayed
    const componentRows = await page.evaluate(() => {
      return document.getElementById('th-components') !== null;
    });
    assert(componentRows, 'Score components section exists');

    // Test collectMetrics
    const metrics = await page.evaluate(() => window.targetHealth.collectMetrics());
    assert(metrics.overall !== undefined, 'collectMetrics returns overall');
    assert(metrics.categories !== undefined, 'collectMetrics returns categories');
    assert(metrics.overall.score >= 0 && metrics.overall.score <= 100, `Overall score in range: ${metrics.overall.score}`);

    // Test refresh
    await page.evaluate(() => window.targetHealth.refresh());
    await new Promise(r => setTimeout(r, 500));
    const afterRefresh = await page.evaluate(() => !!document.getElementById('target-health-card'));
    assert(afterRefresh, 'Card still rendered after refresh');

    // State persistence
    const savedState = await page.evaluate(() => localStorage.getItem('target-health-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-063: Target Health Scoring System - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
