const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to dashboard
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 10000 });
    
    // Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a bit to collect any errors
    await page.waitForTimeout(2000);
    
    // Check if main elements are present
    const hasHeader = await page.$('.header') !== null;
    const hasStatsCards = await page.$('.stats-cards') !== null;
    const hasFeaturesTable = await page.$('.features-table') !== null;
    
    console.log('Dashboard Load Test Results:');
    console.log('- Page loaded:', true);
    console.log('- Header present:', hasHeader);
    console.log('- Stats cards present:', hasStatsCards);
    console.log('- Features table present:', hasFeaturesTable);
    console.log('- Console errors:', errors.length === 0 ? 'None' : errors.join(', '));
    
    if (hasHeader && hasStatsCards && hasFeaturesTable && errors.length === 0) {
      console.log('\n✅ Dashboard loads successfully without errors');
      process.exit(0);
    } else {
      console.log('\n❌ Dashboard has issues');
      process.exit(1);
    }
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
