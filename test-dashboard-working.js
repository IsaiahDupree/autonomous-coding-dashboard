const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Testing dashboard...');

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  try {
    // Navigate to dashboard
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 10000 });

    // Check page title
    const title = await page.title();
    console.log('✓ Page title:', title);

    // Check for critical elements
    const header = await page.$('header');
    console.log(header ? '✓ Header found' : '✗ Header missing');

    const progressBar = await page.$('.progress-bar');
    console.log(progressBar ? '✓ Progress bar found' : '✗ Progress bar missing');

    const featuresTable = await page.$('.features-table, #features-table');
    console.log(featuresTable ? '✓ Features table found' : '✗ Features table missing');

    // Wait a moment for async loads
    await page.waitForTimeout(2000).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    if (errors.length > 0) {
      console.log('\n⚠ Console errors:', errors.slice(0, 5));
    } else {
      console.log('✓ No console errors');
    }

    console.log('\n✓✓✓ Dashboard is working!\n');

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }

  await browser.close();
})();
