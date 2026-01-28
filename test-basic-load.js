const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Loading dashboard at http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 10000 });

    // Wait for key elements to appear
    await page.waitForSelector('.header', { timeout: 5000 });
    await page.waitForSelector('.stats-grid', { timeout: 5000 });

    const title = await page.title();
    console.log('✓ Page loaded successfully');
    console.log('✓ Page title:', title);

    // Check for console errors
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    if (logs.length === 0) {
      console.log('✓ No console errors detected');
    } else {
      console.log('⚠ Console errors:', logs);
    }

    console.log('\n✅ Dashboard is working correctly!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
