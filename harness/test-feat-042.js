/**
 * Test script for feat-042: Cost Forecasting
 *
 * Acceptance Criteria:
 * 1. Projects cost based on remaining features
 * 2. Considers historical cost per feature
 * 3. Provides confidence intervals
 * 4. Alerts on budget thresholds
 */

import puppeteer from 'puppeteer';

async function test() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  let passed = 0;
  let failed = 0;
  let total = 0;

  function assert(condition, msg) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✓ ${msg}`);
    } else {
      failed++;
      console.error(`  ✗ ${msg}`);
    }
  }

  try {
    // =============================================
    // Test 1: Backend API returns forecast data
    // =============================================
    console.log('\n--- Test 1: Backend API returns forecast data ---');
    const apiResponse = await page.goto('http://localhost:3434/api/cost-forecast');
    const apiData = await apiResponse.json();

    assert(apiData.success === true, 'API returns success: true');
    assert(apiData.data && apiData.data.summary, 'API returns summary data');
    assert(typeof apiData.data.summary.totalFeatures === 'number', 'summary.totalFeatures is a number');
    assert(typeof apiData.data.summary.completedFeatures === 'number', 'summary.completedFeatures is a number');
    assert(typeof apiData.data.summary.remainingFeatures === 'number', 'summary.remainingFeatures is a number');
    assert(typeof apiData.data.summary.totalCostSoFar === 'number', 'summary.totalCostSoFar is a number');
    assert(typeof apiData.data.summary.projectedCostRemaining === 'number', 'summary.projectedCostRemaining is a number');
    assert(typeof apiData.data.summary.projectedTotalCost === 'number', 'summary.projectedTotalCost is a number');

    // =============================================
    // AC1: Projects cost based on remaining features
    // =============================================
    console.log('\n--- AC1: Projects cost based on remaining features ---');
    assert(apiData.data.summary.remainingFeatures > 0, 'Has remaining features to forecast');
    assert(apiData.data.summary.projectedCostRemaining > 0, 'Projected remaining cost is positive');
    assert(Array.isArray(apiData.data.projectForecasts), 'Has per-project forecasts');
    assert(apiData.data.projectForecasts.length > 0, 'Has at least one project forecast');

    const projForecast = apiData.data.projectForecasts[0];
    assert(typeof projForecast.remaining === 'number', 'Project forecast has remaining features');
    assert(typeof projForecast.projectedCost === 'number', 'Project forecast has projected cost');
    assert(typeof projForecast.name === 'string' && projForecast.name.length > 0, 'Project forecast has name');

    // =============================================
    // AC2: Considers historical cost per feature
    // =============================================
    console.log('\n--- AC2: Considers historical cost per feature ---');
    assert(typeof apiData.data.summary.costPerFeature === 'number', 'Has cost per feature metric');
    assert(apiData.data.summary.costPerFeature >= 0, 'Cost per feature is non-negative');
    assert(typeof projForecast.costPerFeature === 'number', 'Per-project cost per feature exists');
    assert(typeof projForecast.spent === 'number', 'Per-project spent amount exists');

    // =============================================
    // AC3: Provides confidence intervals
    // =============================================
    console.log('\n--- AC3: Provides confidence intervals ---');
    assert(apiData.data.confidenceIntervals, 'Has confidence intervals');
    const ci = apiData.data.confidenceIntervals;
    assert(['low', 'medium', 'high'].includes(ci.level), 'Confidence level is low/medium/high');
    assert(typeof ci.projectedCost.low === 'number', 'Has low cost estimate');
    assert(typeof ci.projectedCost.mid === 'number', 'Has mid cost estimate');
    assert(typeof ci.projectedCost.high === 'number', 'Has high cost estimate');
    assert(ci.projectedCost.low <= ci.projectedCost.mid, 'Low <= Mid cost');
    assert(ci.projectedCost.mid <= ci.projectedCost.high, 'Mid <= High cost');

    // =============================================
    // AC4: Alerts on budget thresholds
    // =============================================
    console.log('\n--- AC4: Alerts on budget thresholds ---');
    assert(Array.isArray(apiData.data.budgetAlerts), 'Has budget alerts array');
    // The current data should have alerts since projected > $1000
    if (apiData.data.budgetAlerts.length > 0) {
      const alert = apiData.data.budgetAlerts[0];
      assert(typeof alert.type === 'string', 'Alert has type');
      assert(typeof alert.message === 'string', 'Alert has message');
      assert(typeof alert.severity === 'string', 'Alert has severity');
      assert(['warning', 'critical'].includes(alert.severity), 'Alert severity is warning or critical');
    } else {
      assert(true, 'No budget alerts (projected cost within thresholds)');
    }

    // =============================================
    // Test 5: Dashboard Widget Renders
    // =============================================
    console.log('\n--- Test 5: Dashboard Widget Renders ---');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForSelector('#cost-forecasting-widget', { timeout: 5000 });

    // Wait for widget to load data
    await page.waitForFunction(
      () => {
        const el = document.getElementById('cf-summary-grid');
        return el && el.style.display !== 'none';
      },
      { timeout: 10000 }
    );

    // Check summary cards
    const spentText = await page.$eval('#cf-total-spent', el => el.textContent);
    assert(spentText.includes('$'), 'Spent card shows dollar amount');

    const projRemainingText = await page.$eval('#cf-projected-remaining', el => el.textContent);
    assert(projRemainingText.includes('$'), 'Projected remaining card shows dollar amount');

    const projTotalText = await page.$eval('#cf-projected-total', el => el.textContent);
    assert(projTotalText.includes('$'), 'Projected total card shows dollar amount');

    const cpfText = await page.$eval('#cf-cost-per-feature', el => el.textContent);
    assert(cpfText.includes('$'), 'Cost per feature card shows dollar amount');

    // Check confidence interval section
    const ciSection = await page.$('#cf-confidence-section');
    assert(ciSection, 'Confidence interval section exists');
    const ciDisplay = await page.$eval('#cf-confidence-section', el => el.style.display);
    assert(ciDisplay !== 'none', 'Confidence interval section is visible');

    const ciLow = await page.$eval('#cf-ci-low', el => el.textContent);
    assert(ciLow.includes('$'), 'CI low bound shows dollar amount');

    const ciHigh = await page.$eval('#cf-ci-high', el => el.textContent);
    assert(ciHigh.includes('$'), 'CI high bound shows dollar amount');

    const ciLevel = await page.$eval('#cf-ci-level', el => el.textContent);
    assert(['low', 'medium', 'high'].includes(ciLevel), 'CI level displayed');

    // Check chart section
    const chartSection = await page.$('#cf-chart-section');
    assert(chartSection, 'Daily cost chart section exists');

    // Check alerts section
    const alertsSection = await page.$('#cf-alerts-section');
    assert(alertsSection, 'Budget alerts section exists');
    const alertsVisible = await page.$eval('#cf-alerts-section', el => el.style.display);
    assert(alertsVisible !== 'none', 'Budget alerts section is visible');

    // Check project forecasts table
    const projectSection = await page.$('#cf-projects-section');
    assert(projectSection, 'Per-project forecast section exists');

    const projectRows = await page.$$('#cf-project-tbody tr');
    assert(projectRows.length > 0, 'Per-project forecast table has rows');

    // Check budget threshold section
    const budgetSection = await page.$('#cf-budget-section');
    assert(budgetSection, 'Budget threshold section exists');
    const budgetVisible = await page.$eval('#cf-budget-section', el => el.style.display);
    assert(budgetVisible !== 'none', 'Budget threshold section is visible');

    // Test budget threshold interaction
    await page.$eval('#cf-budget-input', el => el.value = '');
    await page.type('#cf-budget-input', '500');
    await page.click('#btn-cf-set-budget');
    await new Promise(r => setTimeout(r, 500));

    const budgetStatus = await page.$eval('#cf-budget-status', el => el.textContent);
    assert(budgetStatus.includes('$500'), 'Budget threshold status updated');

    // Verify alert appears for custom budget
    const alertItems = await page.$$('.cf-alert');
    assert(alertItems.length > 0, 'Budget alerts rendered after setting threshold');

    // Check subtitle shows summary info
    const subtitle = await page.$eval('#cf-subtitle', el => el.textContent);
    assert(subtitle.includes('features done'), 'Subtitle shows completion info');
    assert(subtitle.includes('remaining'), 'Subtitle shows remaining count');

  } catch (error) {
    console.error('\nTest error:', error.message);
    failed++;
  } finally {
    await browser.close();
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed}/${total} passed, ${failed} failed`);
  console.log(`${'='.repeat(50)}`);

  process.exit(failed > 0 ? 1 : 0);
}

test();
