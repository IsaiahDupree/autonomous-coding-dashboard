#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function takeScreenshot() {
  console.log('Taking screenshot of live log viewer (feat-014)...\n');

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 10000 });

    // Wait for log viewer to load
    await page.waitForSelector('#log-viewer', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Scroll to log viewer
    await page.evaluate(() => {
      document.querySelector('#log-viewer').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    await page.screenshot({ path: 'feat-014-screenshot.png', fullPage: false });
    console.log('✓ Screenshot saved to feat-014-screenshot.png');

    // Also get element screenshot
    const logViewer = await page.$('.card:has(#log-viewer)');
    if (logViewer) {
      await logViewer.screenshot({ path: 'feat-014-log-viewer.png' });
      console.log('✓ Log viewer screenshot saved to feat-014-log-viewer.png');
    }

  } catch (error) {
    console.error('Screenshot failed:', error.message);
  } finally {
    await browser.close();
  }
}

takeScreenshot();
