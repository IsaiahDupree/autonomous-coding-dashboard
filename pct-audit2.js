const puppeteer = require('puppeteer');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function audit() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const errors = [];
  const failedRequests = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push({ text: msg.text(), location: msg.location() });
  });
  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), reason: req.failure() && req.failure().errorText });
  });
  page.on('response', async resp => {
    if (resp.status() === 404 && !resp.url().includes('.ico')) {
      console.log('404:', resp.url());
    }
  });

  await page.goto('http://localhost:3434/pct.html', { waitUntil: 'networkidle0', timeout: 15000 });
  await sleep(1500);

  // ============ TEST 1: Select Brand ============
  console.log('\n=== TEST: Brand Selection ===');
  await page.click('.pct-list-item');
  await sleep(1000);
  const productList = await page.evaluate(() => {
    const el = document.getElementById('product-list');
    return el ? el.innerHTML.substring(0, 200) : 'NOT FOUND';
  });
  console.log('Products after brand select:', productList.length > 50 ? 'LOADED' : 'EMPTY - ' + productList);

  // ============ TEST 2: Select Product ============
  console.log('\n=== TEST: Product Selection ===');
  const productItem = await page.$('#product-list .pct-list-item');
  if (productItem) {
    await productItem.click();
    await sleep(1500);
    const productDetail = await page.evaluate(() => {
      const el = document.getElementById('product-detail');
      return el ? el.innerHTML.substring(0, 300) : 'NOT FOUND';
    });
    console.log('Product detail loaded:', productDetail.length > 100 ? 'YES' : 'NO - ' + productDetail);
  } else {
    console.log('ERROR: No product items found');
  }

  // ============ TEST 3: USP Tab ============
  console.log('\n=== TEST: USP Tab ===');
  await page.click('[data-tab="usps"]');
  await sleep(1500);
  const uspList = await page.evaluate(() => {
    const el = document.getElementById('usp-list');
    return el ? el.innerHTML.substring(0, 400) : 'NOT FOUND';
  });
  console.log('USP list after product select:', uspList.includes('pct-usp-card') || uspList.includes('pct-list-item') ? 'HAS USPs' : 'EMPTY/ERROR - ' + uspList.substring(0, 150));

  // ============ TEST 4: Hook Generation Tab ============
  console.log('\n=== TEST: Hook Generation Tab ===');
  await page.click('[data-tab="generate"]');
  await sleep(1500);
  const genPanel = await page.evaluate(() => {
    const el = document.getElementById('generation-panel');
    const txt = el ? el.innerText : '';
    return { len: el ? el.innerHTML.length : 0, hasUSPSelector: el ? el.innerHTML.includes('usp') : false, text: txt.substring(0, 300) };
  });
  console.log('Gen panel len:', genPanel.len, 'hasUSPSelector:', genPanel.hasUSPSelector);
  console.log('Gen panel text:', genPanel.text.substring(0, 200));

  // ============ TEST 5: Hook Review Tab ============
  console.log('\n=== TEST: Hook Review Tab ===');
  await page.click('[data-tab="review"]');
  await sleep(1500);
  const reviewPanel = await page.evaluate(() => {
    const el = document.getElementById('hook-review-panel');
    const txt = el ? el.innerText : '';
    return { len: el ? el.innerHTML.length : 0, text: txt.substring(0, 200) };
  });
  console.log('Review panel len:', reviewPanel.len, 'text:', reviewPanel.text.substring(0, 100));

  // ============ TEST 6: Ad Creative Tab - Templates ============
  console.log('\n=== TEST: Ad Creative Tab ===');
  await page.click('[data-tab="creative"]');
  await sleep(1500);
  const creativePanel = await page.evaluate(() => {
    const el = document.getElementById('creative-panel');
    const txt = el ? el.innerText : '';
    return { len: el ? el.innerHTML.length : 0, hasSubTabs: el ? el.innerHTML.includes('subtab') || el.innerHTML.includes('sub-tab') || el.innerHTML.includes('Templates') : false, text: txt.substring(0, 200) };
  });
  console.log('Creative panel len:', creativePanel.len, 'hasSubtabs:', creativePanel.hasSubTabs);
  console.log('Creative text:', creativePanel.text.substring(0, 150));

  // ============ TEST 7: Video Scripts Tab ============
  console.log('\n=== TEST: Video Scripts Tab ===');
  await page.click('[data-tab="scripts"]');
  await sleep(1500);
  const scriptsPanel = await page.evaluate(() => {
    const el = document.getElementById('scripts-panel');
    const txt = el ? el.innerText : '';
    return { len: el ? el.innerHTML.length : 0, text: txt.substring(0, 200) };
  });
  console.log('Scripts panel len:', scriptsPanel.len, 'text:', scriptsPanel.text.substring(0, 100));

  // ============ TEST 8: Deployment Tab ============
  console.log('\n=== TEST: Deployment Tab ===');
  await page.click('[data-tab="deploy"]');
  await sleep(1500);
  const deployPanel = await page.evaluate(() => {
    const el = document.getElementById('deploy-panel');
    const txt = el ? el.innerText : '';
    return { len: el ? el.innerHTML.length : 0, hasAccountSection: el ? el.innerHTML.includes('account') || el.innerHTML.includes('Meta') : false, text: txt.substring(0, 300) };
  });
  console.log('Deploy panel len:', deployPanel.len, 'hasMetaSection:', deployPanel.hasAccountSection);
  console.log('Deploy text:', deployPanel.text.substring(0, 200));

  // ============ TEST 9: Analytics Tab ============
  console.log('\n=== TEST: Analytics Tab ===');
  await page.click('[data-tab="analytics"]');
  await sleep(1500);
  const analyticsPanel = await page.evaluate(() => {
    const el = document.getElementById('analytics-panel');
    const txt = el ? el.innerText : '';
    return { len: el ? el.innerHTML.length : 0, text: txt.substring(0, 300) };
  });
  console.log('Analytics panel len:', analyticsPanel.len, 'text:', analyticsPanel.text.substring(0, 150));

  // ============ TEST 10: Automation Tab ============
  console.log('\n=== TEST: Automation Tab ===');
  await page.click('[data-tab="automation"]');
  await sleep(1500);
  const autoPanel = await page.evaluate(() => {
    const el = document.getElementById('automation-panel');
    const txt = el ? el.innerText : '';
    return { len: el ? el.innerHTML.length : 0, text: txt.substring(0, 300) };
  });
  console.log('Automation panel len:', autoPanel.len, 'text:', autoPanel.text.substring(0, 150));

  console.log('\n=== Console Errors ===');
  errors.forEach(e => console.log('ERROR:', JSON.stringify(e)));

  console.log('\n=== Failed Requests ===');
  failedRequests.forEach(r => console.log('FAILED:', r.url, '-', r.reason));

  await browser.close();
}

audit().catch(e => { console.error('AUDIT FAILED:', e.message, e.stack); process.exit(1); });
