const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Testing dashboard startup...');

  try {
    // Navigate to dashboard
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 10000 });

    // Check for critical elements
    const title = await page.title();
    console.log('✓ Page title:', title);

    const header = await page.$('header');
    console.log(header ? '✓ Header element found' : '✗ Header element missing');

    const progressBar = await page.$('.progress-bar');
    console.log(progressBar ? '✓ Progress bar found' : '✗ Progress bar missing');

    // Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.log('✗ Console errors found:', errors);
    } else {
      console.log('✓ No console errors');
    }

    console.log('\n✓ Dashboard loaded successfully');

  } catch (error) {
    console.error('✗ Error loading dashboard:', error.message);
    process.exit(1);
  }

  await browser.close();
})();
