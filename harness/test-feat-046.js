#!/usr/bin/env node
/**
 * Test script for feat-046: Model Performance Comparison Dashboard
 * Acceptance criteria:
 *   1. Compare Claude versions
 *   2. Track success rate by model
 *   3. Cost efficiency metrics
 */

import puppeteer from 'puppeteer';

const delay = ms => new Promise(r => setTimeout(r, ms));

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${msg}`);
  } else {
    failed++;
    console.error(`  FAIL: ${msg}`);
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Suppress console noise
  page.on('console', () => {});
  page.on('pageerror', () => {});

  try {
    console.log('\n=== feat-046: Model Performance Comparison Dashboard ===\n');

    // Navigate to dashboard
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 15000 });
    await delay(2000);

    // -------------------------------------------------------
    // 1. Widget renders and container exists
    // -------------------------------------------------------
    console.log('--- Widget Rendering ---');

    const widgetExists = await page.$('#model-performance-widget');
    assert(!!widgetExists, 'Model performance widget container exists');

    const cardExists = await page.$('#model-performance-widget .card');
    assert(!!cardExists, 'Widget card rendered');

    const title = await page.$eval('#model-performance-widget .card-title', el => el.textContent);
    assert(title.includes('Model Performance'), 'Widget has correct title');

    // Wait for data to load
    await delay(3000);

    // -------------------------------------------------------
    // 2. Compare Claude versions - shows multiple models in table
    // -------------------------------------------------------
    console.log('\n--- AC1: Compare Claude versions ---');

    const tableExists = await page.$('#mp-comparison-table');
    assert(!!tableExists, 'Comparison table exists');

    const tableRows = await page.$$('#mp-table-body tr');
    assert(tableRows.length >= 1, `Comparison table has ${tableRows.length} model rows`);

    // Check that model names are displayed
    const modelNames = await page.$$eval('#mp-table-body .mp-model-name', els => els.map(el => el.textContent));
    assert(modelNames.length >= 1, `Model names displayed: ${modelNames.join(', ')}`);

    // Check model full IDs displayed
    const modelFullIds = await page.$$eval('#mp-table-body .mp-model-full', els => els.map(el => el.textContent));
    assert(modelFullIds.length >= 1, 'Full model identifiers displayed');

    // Check that multiple columns exist (sessions, features, etc.)
    const headers = await page.$$eval('#mp-comparison-table thead th', els => els.map(el => el.textContent));
    assert(headers.includes('Model'), 'Table has Model column');
    assert(headers.includes('Sessions'), 'Table has Sessions column');
    assert(headers.includes('Features'), 'Table has Features column');
    assert(headers.includes('Success Rate'), 'Table has Success Rate column');
    assert(headers.includes('Cost/Feature'), 'Table has Cost/Feature column');
    assert(headers.includes('Total Cost'), 'Table has Total Cost column');

    // Verify charts exist for visual comparison
    const successChart = await page.$('#mp-success-chart');
    assert(!!successChart, 'Success rate comparison chart exists');
    const costChart = await page.$('#mp-cost-chart');
    assert(!!costChart, 'Cost comparison chart exists');

    // -------------------------------------------------------
    // 3. Track success rate by model
    // -------------------------------------------------------
    console.log('\n--- AC2: Track success rate by model ---');

    // Success rate badges in the table
    const successBadges = await page.$$eval('#mp-table-body .mp-badge', els => {
      return els.filter(el => el.textContent.includes('%')).map(el => el.textContent);
    });
    assert(successBadges.length >= 1, `Success rate badges shown: ${successBadges.join(', ')}`);

    // Summary card shows best success rate
    const bestSuccess = await page.$eval('#mp-best-success', el => el.textContent);
    assert(bestSuccess.includes('%'), `Best success rate shown: ${bestSuccess}`);

    // Check the success rate chart canvas has been rendered (Chart.js draws on canvas)
    const successChartHasData = await page.evaluate(() => {
      const canvas = document.getElementById('mp-success-chart');
      if (!canvas) return false;
      return Chart.getChart(canvas) != null;
    });
    assert(successChartHasData, 'Success rate chart has been rendered with data');

    // -------------------------------------------------------
    // 4. Cost efficiency metrics
    // -------------------------------------------------------
    console.log('\n--- AC3: Cost efficiency metrics ---');

    // Cost per feature in table
    const costBadges = await page.$$eval('#mp-table-body td', els => {
      return els.filter(el => el.textContent.includes('$')).map(el => el.textContent.trim());
    });
    assert(costBadges.length >= 1, `Cost values displayed in table`);

    // Most cost-efficient summary card
    const efficient = await page.$eval('#mp-most-efficient', el => el.textContent);
    assert(efficient.includes('$') || efficient === '-', `Most efficient model shown: ${efficient}`);

    // Cost chart rendered
    const costChartHasData = await page.evaluate(() => {
      const canvas = document.getElementById('mp-cost-chart');
      if (!canvas) return false;
      return Chart.getChart(canvas) != null;
    });
    assert(costChartHasData, 'Cost efficiency chart has been rendered with data');

    // Token usage cards show cost-related metrics
    const tokenCards = await page.$$('.mp-token-card');
    assert(tokenCards.length >= 1, `Token usage cards displayed: ${tokenCards.length}`);

    // Check token breakdown shows input/output
    const tokenDetails = await page.$$eval('.mp-token-detail', els => els.map(el => el.textContent));
    const hasInput = tokenDetails.some(d => d.includes('Input'));
    const hasOutput = tokenDetails.some(d => d.includes('Output'));
    assert(hasInput, 'Token breakdown shows input tokens');
    assert(hasOutput, 'Token breakdown shows output tokens');

    // Feat/Session metric exists
    const tokenMetrics = await page.$$eval('.mp-token-metrics', els => els.map(el => el.textContent));
    const hasFeatPerSession = tokenMetrics.some(m => m.includes('Feat/Session'));
    assert(hasFeatPerSession, 'Features per session metric shown');

    // -------------------------------------------------------
    // 5. Period toggle works
    // -------------------------------------------------------
    console.log('\n--- Period Toggle ---');

    // Click 7D toggle
    await page.click('.mp-period-btn[data-days="7"]');
    await delay(2000);

    const active7d = await page.$eval('.mp-period-btn[data-days="7"]', el => el.classList.contains('mp-period-active'));
    assert(active7d, '7D period button is active after click');

    const subtitle7d = await page.$eval('#mp-subtitle', el => el.textContent);
    assert(subtitle7d.includes('7 days'), `Subtitle updated for 7D: "${subtitle7d}"`);

    // Click 90D toggle
    await page.click('.mp-period-btn[data-days="90"]');
    await delay(2000);

    const active90d = await page.$eval('.mp-period-btn[data-days="90"]', el => el.classList.contains('mp-period-active'));
    assert(active90d, '90D period button is active after click');

    // -------------------------------------------------------
    // 6. Summary metrics
    // -------------------------------------------------------
    console.log('\n--- Summary Metrics ---');

    const summaryGrid = await page.$('#mp-summary-grid');
    const summaryVisible = await page.evaluate(el => el.style.display !== 'none', summaryGrid);
    assert(summaryVisible, 'Summary grid is visible');

    const totalModels = await page.$eval('#mp-total-models', el => el.textContent);
    assert(parseInt(totalModels) >= 1, `Total models shown: ${totalModels}`);

    const totalSessions = await page.$eval('#mp-total-sessions', el => el.textContent);
    assert(parseInt(totalSessions) >= 1, `Total sessions shown: ${totalSessions}`);

    // -------------------------------------------------------
    // 7. Refresh button works
    // -------------------------------------------------------
    console.log('\n--- Refresh Button ---');

    const refreshBtn = await page.$('#btn-mp-refresh');
    assert(!!refreshBtn, 'Refresh button exists');
    await refreshBtn.click();
    await delay(2000);

    // After refresh, data should still be present
    const afterRefreshRows = await page.$$('#mp-table-body tr');
    assert(afterRefreshRows.length >= 1, `Data still present after refresh: ${afterRefreshRows.length} rows`);

    // -------------------------------------------------------
    // Summary
    // -------------------------------------------------------
    console.log(`\n========================================`);
    console.log(`  RESULTS: ${passed} passed, ${failed} failed (${passed + failed} total)`);
    console.log(`========================================\n`);

  } catch (error) {
    console.error('Test error:', error.message);
    failed++;
  } finally {
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
})();
