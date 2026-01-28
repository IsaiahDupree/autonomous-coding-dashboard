const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 10000 });

    const title = await page.title();
    console.log('Page title:', title);

    // Check for any errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForSelector('.logo', { timeout: 5000 });
    const logoText = await page.$eval('.logo', el => el.textContent);
    console.log('Logo text:', logoText);

    // Check if key elements exist
    const statsGrid = await page.$('.stats-grid');
    console.log('Stats grid exists:', !!statsGrid);

    const header = await page.$('.header');
    console.log('Header exists:', !!header);

    console.log('✅ Dashboard loads successfully');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
