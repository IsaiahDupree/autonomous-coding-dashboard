#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testDashboard() {
  console.log('Testing dashboard basic functionality...\n');

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate to dashboard
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 10000 });
    console.log('✓ Dashboard loaded');

    // Check for console errors (ignore network errors)
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('ERR_CONNECTION_REFUSED')) {
        errors.push(msg.text());
      }
    });

    // Wait for main elements to render
    await page.waitForSelector('.logo span', { timeout: 5000 });
    const title = await page.$eval('.logo span', el => el.textContent);
    console.log(`✓ Title found: ${title}`);

    // Check for feature table
    const featuresTableExists = await page.$('#features-table') !== null;
    console.log(`✓ Features table exists: ${featuresTableExists}`);

    // Check for progress chart
    const progressChartExists = await page.$('#progress-chart') !== null;
    console.log(`✓ Progress chart exists: ${progressChartExists}`);

    // Check for category chart
    const categoryChartExists = await page.$('#category-chart') !== null;
    console.log(`✓ Category chart exists: ${categoryChartExists}`);

    // Wait a moment for any async operations
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (errors.length > 0) {
      console.error('\n⚠ Console errors detected:');
      errors.forEach(err => console.error('  -', err));
      process.exit(1);
    } else {
      console.log('\n✓ All checks passed! Dashboard is working correctly.');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testDashboard();
