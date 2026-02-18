const puppeteer = require('puppeteer');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function audit() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Capture console errors
  const errors = [];
  const networkErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('requestfailed', req => {
    networkErrors.push(req.url());
  });

  // Capture API responses
  const apiResponses = {};
  page.on('response', async resp => {
    if (resp.url().includes('/api/pct/')) {
      const path = resp.url().replace(/.*\/api\/pct/, '');
      apiResponses[path] = resp.status();
    }
  });

  console.log('=== Loading PCT page ===');
  await page.goto('http://localhost:3434/pct.html', { waitUntil: 'networkidle0', timeout: 15000 });
  await sleep(2000);

  console.log('Page title:', await page.title());

  // Test Tab 1: Context & Setup - Check brands/products loaded
  const brandCount = await page.evaluate(() => {
    const list = document.getElementById('brand-list');
    return list ? list.innerHTML.substring(0, 200) : 'NOT FOUND';
  });
  console.log('Brand list HTML:', brandCount);

  const statsBar = await page.evaluate(() => {
    const bar = document.getElementById('pct-stats');
    return bar ? bar.innerHTML.substring(0, 200) : 'NOT FOUND';
  });
  console.log('Stats bar:', statsBar.substring(0, 150));

  // Click tab 2: USPs
  await page.click('[data-tab="usps"]');
  await sleep(1500);
  const uspList = await page.evaluate(() => {
    const el = document.getElementById('usp-list');
    return el ? el.innerHTML.substring(0, 300) : 'NOT FOUND';
  });
  console.log('USP list:', uspList.substring(0, 200));

  // Click tab 3: Hook Generation
  await page.click('[data-tab="generate"]');
  await sleep(1500);
  const genPanel = await page.evaluate(() => {
    const el = document.getElementById('generation-panel');
    return el ? el.innerHTML.substring(0, 300) : 'NOT FOUND';
  });
  console.log('Generation panel (len=' + genPanel.length + '):', genPanel.length > 50 ? 'RENDERED' : 'EMPTY - ' + genPanel);

  // Click tab 4: Hook Review
  await page.click('[data-tab="review"]');
  await sleep(1500);
  const reviewPanel = await page.evaluate(() => {
    const el = document.getElementById('hook-review-panel');
    return el ? el.innerHTML.substring(0, 200) : 'NOT FOUND';
  });
  console.log('Review panel (len=' + reviewPanel.length + '):', reviewPanel.length > 50 ? 'RENDERED' : 'EMPTY');

  // Click tab 5: Ad Creative
  await page.click('[data-tab="creative"]');
  await sleep(1500);
  const creativePanel = await page.evaluate(() => {
    const el = document.getElementById('creative-panel');
    return el ? el.innerHTML.substring(0, 200) : 'NOT FOUND';
  });
  console.log('Creative panel (len=' + creativePanel.length + '):', creativePanel.length > 50 ? 'RENDERED' : 'EMPTY - ' + creativePanel);

  // Click tab 6: Video Scripts
  await page.click('[data-tab="scripts"]');
  await sleep(1500);
  const scriptsPanel = await page.evaluate(() => {
    const el = document.getElementById('scripts-panel');
    return el ? el.innerHTML.substring(0, 200) : 'NOT FOUND';
  });
  console.log('Scripts panel (len=' + scriptsPanel.length + '):', scriptsPanel.length > 50 ? 'RENDERED' : 'EMPTY - ' + scriptsPanel);

  // Click tab 7: Deployment
  await page.click('[data-tab="deploy"]');
  await sleep(1500);
  const deployPanel = await page.evaluate(() => {
    const el = document.getElementById('deploy-panel');
    return el ? el.innerHTML.substring(0, 200) : 'NOT FOUND';
  });
  console.log('Deploy panel (len=' + deployPanel.length + '):', deployPanel.length > 50 ? 'RENDERED' : 'EMPTY - ' + deployPanel);

  // Click tab 8: Analytics
  await page.click('[data-tab="analytics"]');
  await sleep(1500);
  const analyticsPanel = await page.evaluate(() => {
    const el = document.getElementById('analytics-panel');
    return el ? el.innerHTML.substring(0, 200) : 'NOT FOUND';
  });
  console.log('Analytics panel (len=' + analyticsPanel.length + '):', analyticsPanel.length > 50 ? 'RENDERED' : 'EMPTY - ' + analyticsPanel);

  // Click tab 9: Automation
  await page.click('[data-tab="automation"]');
  await sleep(1500);
  const autoPanel = await page.evaluate(() => {
    const el = document.getElementById('automation-panel');
    return el ? el.innerHTML.substring(0, 200) : 'NOT FOUND';
  });
  console.log('Automation panel (len=' + autoPanel.length + '):', autoPanel.length > 50 ? 'RENDERED' : 'EMPTY - ' + autoPanel);

  console.log('\n=== Console Errors ===');
  errors.forEach(e => console.log('ERROR:', e));

  console.log('\n=== Network Errors ===');
  networkErrors.forEach(e => console.log('NET ERROR:', e));

  console.log('\n=== API Responses ===');
  Object.entries(apiResponses).forEach(([path, status]) => console.log(status + ' ' + path));

  await browser.close();
}

audit().catch(e => { console.error('AUDIT FAILED:', e.message); process.exit(1); });
