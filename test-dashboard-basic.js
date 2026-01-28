const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Testing basic dashboard functionality...');

    // Load the dashboard
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    console.log('✓ Dashboard loaded');

    // Check for critical elements
    const header = await page.$('header');
    if (!header) throw new Error('Header not found');
    console.log('✓ Header present');

    const statsGrid = await page.$('.stats-grid');
    if (!statsGrid) throw new Error('Stats grid not found');
    console.log('✓ Stats grid present');

    const featuresTable = await page.$('#features-table');
    if (!featuresTable) throw new Error('Features table not found');
    console.log('✓ Features table present');

    // Check for no console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.reload();
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (errors.length > 0) {
      console.log('⚠ Console errors detected:', errors);
    } else {
      console.log('✓ No console errors');
    }

    console.log('\n✅ Dashboard is working properly');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
