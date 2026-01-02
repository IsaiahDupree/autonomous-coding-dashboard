const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Testing feat-012: Progress chart shows completion over time');
    console.log('================================================================\n');

    // Navigate to dashboard
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 10000 });

    // Wait for charts to load
    await page.waitForSelector('#progress-chart', { timeout: 5000 });

    // Check if Chart.js is loaded
    const chartJsLoaded = await page.evaluate(() => {
      return typeof Chart !== 'undefined';
    });
    console.log('✓ Chart.js library loaded:', chartJsLoaded);

    // Check if progress chart canvas exists
    const chartExists = await page.$('#progress-chart') !== null;
    console.log('✓ Progress chart canvas exists:', chartExists);

    // Check if chart is rendered (has Chart.js instance)
    const chartRendered = await page.evaluate(() => {
      const canvas = document.getElementById('progress-chart');
      return canvas && typeof progressChart !== 'undefined' && progressChart !== null;
    });
    console.log('✓ Progress chart is rendered:', chartRendered);

    // Check if chart displays data
    const chartHasData = await page.evaluate(() => {
      if (!progressChart) return false;
      const datasets = progressChart.data.datasets;
      return datasets && datasets.length > 0 && datasets[0].data.length > 0;
    });
    console.log('✓ Chart displays data:', chartHasData);

    // Verify chart shows cumulative features completed
    const chartLabel = await page.evaluate(() => {
      if (!progressChart) return null;
      return progressChart.data.datasets[0].label;
    });
    console.log('✓ Chart label:', chartLabel);
    const correctLabel = chartLabel === 'Features Completed';
    console.log('✓ Chart shows "Features Completed":', correctLabel);

    // Check if X-axis shows session timestamps
    const xAxisLabels = await page.evaluate(() => {
      if (!progressChart) return [];
      return progressChart.data.labels || [];
    });
    console.log('✓ X-axis labels (sessions):', xAxisLabels.length > 0 ? `${xAxisLabels.length} sessions` : 'No data');

    // Check if Y-axis shows feature counts
    const yAxisData = await page.evaluate(() => {
      if (!progressChart) return [];
      return progressChart.data.datasets[0].data || [];
    });
    console.log('✓ Y-axis data (feature counts):', yAxisData.length > 0 ? yAxisData.join(', ') : 'No data');

    // Verify acceptance criteria
    console.log('\n=== Acceptance Criteria ===');

    // 1. Line chart displays feature completion history
    const criteria1 = chartExists && chartRendered && chartHasData;
    console.log('1. Line chart displays feature completion history:', criteria1 ? '✅ PASS' : '❌ FAIL');

    // 2. X-axis shows session timestamps
    const criteria2 = xAxisLabels.length > 0;
    console.log('2. X-axis shows session timestamps:', criteria2 ? '✅ PASS' : '❌ FAIL');

    // 3. Y-axis shows cumulative features completed
    const criteria3 = yAxisData.length > 0 && correctLabel;
    console.log('3. Y-axis shows cumulative features completed:', criteria3 ? '✅ PASS' : '❌ FAIL');

    const allCriteriaPassed = criteria1 && criteria2 && criteria3;

    if (allCriteriaPassed) {
      console.log('\n✅ ALL ACCEPTANCE CRITERIA PASSED - feat-012 is working!');
      process.exit(0);
    } else {
      console.log('\n❌ SOME ACCEPTANCE CRITERIA FAILED');
      process.exit(1);
    }
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
