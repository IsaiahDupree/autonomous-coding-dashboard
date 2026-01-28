const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Navigating to dashboard...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  console.log('Checking for errors...');
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Wait a bit for any errors to appear
  await page.waitForTimeout(2000);

  console.log('Taking screenshot...');
  await page.screenshot({ path: 'test-dashboard-verification.png', fullPage: true });

  if (errors.length > 0) {
    console.log('ERRORS FOUND:');
    errors.forEach(err => console.log('  - ' + err));
  } else {
    console.log('✅ Dashboard loaded without errors');
  }

  // Check if key elements are present
  const hasHeader = await page.$('header');
  const hasProgressBar = await page.$('.progress-bar');
  const hasFeaturesTable = await page.$('#features-table');

  console.log('✅ Header present:', !!hasHeader);
  console.log('✅ Progress bar present:', !!hasProgressBar);
  console.log('✅ Features table present:', !!hasFeaturesTable);

  await browser.close();
})();
