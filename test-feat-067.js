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

    const hasAPI = await page.evaluate(() => typeof window.velocityChart === 'object');
    assert(hasAPI, 'velocityChart API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('velocity-chart-card'));
    assert(hasCard, 'Velocity chart card rendered');

    const hasCanvas = await page.evaluate(() => !!document.getElementById('vc-chart-canvas'));
    assert(hasCanvas, 'Chart canvas exists');

    const hasChartInstance = await page.evaluate(() => window.velocityChart.getChartInstance() !== null);
    assert(hasChartInstance, 'Chart.js instance created');

    // === AC1: Features per Day/Week ===
    console.log('\n=== AC1: Features per Day/Week ===');

    // Daily data
    const dailyData = await page.evaluate(() => window.velocityChart.getDailyData());
    assert(dailyData.labels.length > 0, `${dailyData.labels.length} daily data points`);
    assert(dailyData.values.length > 0, `${dailyData.values.length} daily values`);
    assert(dailyData.cumulative.length > 0, 'Cumulative data exists');

    // Daily values are numbers
    const dailyValuesValid = await page.evaluate(() => {
      const data = window.velocityChart.getDailyData();
      return data.values.every(v => typeof v === 'number');
    });
    assert(dailyValuesValid, 'Daily values are numbers');

    // Weekly data
    const weeklyData = await page.evaluate(() => window.velocityChart.getWeeklyData());
    assert(weeklyData.labels.length > 0, `${weeklyData.labels.length} weekly data points`);
    assert(weeklyData.values.length > 0, `${weeklyData.values.length} weekly values`);

    // Weekly aggregation: fewer points than daily
    assert(weeklyData.labels.length <= dailyData.labels.length, 'Weekly has fewer points than daily');

    // View mode toggle - daily
    const hasDailyBtn = await page.evaluate(() => {
      return !!document.querySelector('.vc-toggle-btn[data-mode="daily"]');
    });
    assert(hasDailyBtn, 'Daily toggle button exists');

    // View mode toggle - weekly
    const hasWeeklyBtn = await page.evaluate(() => {
      return !!document.querySelector('.vc-toggle-btn[data-mode="weekly"]');
    });
    assert(hasWeeklyBtn, 'Weekly toggle button exists');

    // Switch to weekly
    await page.evaluate(() => window.velocityChart.setViewMode('weekly'));
    await new Promise(r => setTimeout(r, 500));

    const weeklyActive = await page.evaluate(() => {
      return document.querySelector('.vc-toggle-btn[data-mode="weekly"]').classList.contains('active');
    });
    assert(weeklyActive, 'Weekly toggle becomes active');

    const stateAfterSwitch = await page.evaluate(() => window.velocityChart.getState());
    assert(stateAfterSwitch.viewMode === 'weekly', 'View mode state updated to weekly');

    // Switch back to daily
    await page.evaluate(() => window.velocityChart.setViewMode('daily'));
    await new Promise(r => setTimeout(r, 500));

    const dailyActive = await page.evaluate(() => {
      return document.querySelector('.vc-toggle-btn[data-mode="daily"]').classList.contains('active');
    });
    assert(dailyActive, 'Daily toggle becomes active again');

    // Stats cards
    const statsCount = await page.evaluate(() => document.querySelectorAll('.vc-stat').length);
    assert(statsCount === 4, `${statsCount} stat cards displayed`);

    // === AC2: Trend Line ===
    console.log('\n=== AC2: Trend Line ===');

    // Calculate trend
    const trend = await page.evaluate(() => {
      return window.velocityChart.calculateTrend([1, 2, 3, 4, 5]);
    });
    assert(trend.slope !== undefined, 'Trend has slope');
    assert(trend.intercept !== undefined, 'Trend has intercept');
    assert(Math.abs(trend.slope - 1) < 0.01, `Linear trend slope: ${trend.slope} (expected ~1)`);

    // Trend for flat data
    const flatTrend = await page.evaluate(() => {
      return window.velocityChart.calculateTrend([3, 3, 3, 3, 3]);
    });
    assert(Math.abs(flatTrend.slope) < 0.01, `Flat trend slope: ${flatTrend.slope} (expected ~0)`);

    // Trend for declining data
    const declineTrend = await page.evaluate(() => {
      return window.velocityChart.calculateTrend([5, 4, 3, 2, 1]);
    });
    assert(declineTrend.slope < 0, `Declining trend slope: ${declineTrend.slope} (expected < 0)`);

    // Generate trend line
    const trendLine = await page.evaluate(() => {
      return window.velocityChart.generateTrendLine([1, 2, 3, 4, 5], 3);
    });
    assert(trendLine.length === 8, `Trend line has ${trendLine.length} points (5 + 3 extra)`);
    assert(trendLine[5] > trendLine[0], 'Trend line projects upward for increasing data');

    // Chart has trend dataset
    const chartDatasets = await page.evaluate(() => {
      const chart = window.velocityChart.getChartInstance();
      return chart ? chart.data.datasets.length : 0;
    });
    assert(chartDatasets >= 2, `Chart has ${chartDatasets} datasets (bars + trend)`);

    // Verify trend dataset label
    const trendDatasetLabel = await page.evaluate(() => {
      const chart = window.velocityChart.getChartInstance();
      return chart ? chart.data.datasets[1].label : '';
    });
    assert(trendDatasetLabel === 'Trend', 'Trend dataset labeled correctly');

    // === AC3: Projection ===
    console.log('\n=== AC3: Projection ===');

    // Calculate projection
    const projection = await page.evaluate(() => window.velocityChart.calculateProjection());
    assert(projection.avgVelocity !== undefined, `Avg velocity: ${projection.avgVelocity}`);
    assert(projection.remainingFeatures !== undefined, `Remaining: ${projection.remainingFeatures}`);
    assert(projection.estimatedDays !== undefined, `Est. days: ${projection.estimatedDays}`);
    assert(projection.estimatedDate !== undefined, `Est. date: ${projection.estimatedDate}`);
    assert(projection.trendDirection !== undefined, `Trend direction: ${projection.trendDirection}`);

    // Trend direction is valid
    const validDirections = ['accelerating', 'decelerating', 'stable'];
    assert(validDirections.includes(projection.trendDirection), 'Trend direction is valid enum');

    // Projection section in UI
    const hasProjection = await page.evaluate(() => !!document.getElementById('vc-projection'));
    assert(hasProjection, 'Projection section exists in UI');

    const hasProjectionData = await page.evaluate(() => !!document.getElementById('vc-projection-data'));
    assert(hasProjectionData, 'Projection data container exists');

    // Projection rows
    const projRows = await page.evaluate(() => {
      return document.querySelectorAll('.vc-projection-row').length;
    });
    assert(projRows >= 4, `${projRows} projection data rows`);

    // Chart extends beyond data (for projection)
    const chartLabels = await page.evaluate(() => {
      const chart = window.velocityChart.getChartInstance();
      return chart ? chart.data.labels.length : 0;
    });
    const dataLength = dailyData.labels.length;
    assert(chartLabels > dataLength, `Chart labels (${chartLabels}) > data (${dataLength}) for projection`);

    // State persistence
    const savedState = await page.evaluate(() => localStorage.getItem('velocity-chart-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-067: Feature Completion Velocity Chart - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
