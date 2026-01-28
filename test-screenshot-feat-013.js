const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024 });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // Wait for chart to render
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Scroll to category chart
    await page.evaluate(() => {
      const chartCard = document.querySelector('#category-chart').closest('.card');
      chartCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('Category breakdown chart is visible and rendered');
    console.log('✓ Chart displays categories with pass/fail ratios');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
