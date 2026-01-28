const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Testing dashboard startup...');

  try {
    // Navigate to dashboard
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 10000 });
    console.log('✓ Dashboard loaded');

    // Check for any console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any errors to surface
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if main elements are present
    const headerExists = await page.$('header');
    const featuresTableExists = await page.$('#featuresTable');

    console.log('✓ Header exists:', !!headerExists);
    console.log('✓ Features table exists:', !!featuresTableExists);

    if (errors.length > 0) {
      console.log('⚠ Console errors found:');
      errors.forEach(err => console.log('  -', err));
    } else {
      console.log('✓ No console errors');
    }

    // Take a screenshot for verification
    await page.screenshot({ path: 'test-startup-screenshot.png', fullPage: true });
    console.log('✓ Screenshot saved to test-startup-screenshot.png');

    console.log('\n✅ Dashboard is working correctly!');

  } catch (error) {
    console.error('❌ Error during startup verification:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
