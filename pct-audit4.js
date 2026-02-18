const puppeteer = require('./node_modules/puppeteer');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function audit() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('http://localhost:3434/pct.html', { waitUntil: 'networkidle0', timeout: 15000 });
  await sleep(1500);

  // Check scripts tab for rewrite buttons
  console.log('\n=== TEST: Scripts Tab (F6.2.4) ===');
  await page.click('[data-tab="scripts"]');
  await sleep(1000);
  const scriptsTab = await page.evaluate(function() {
    var panel = document.getElementById('panel-scripts');
    return {
      hasPanel: !!panel,
      hasRewriteBtn: panel ? panel.innerHTML.includes('Rewrite') : false,
      hasScriptsGenBtn: !!document.querySelector('[onclick*="generateScript"]') || !!document.querySelector('[id*="generate-script"]'),
      text: panel ? panel.innerText.substring(0, 200) : 'NOT FOUND'
    };
  });
  console.log('Scripts panel:', JSON.stringify(scriptsTab));

  // Check context tab for brand guidelines and templates (F1.1.3, F1.1.5)
  console.log('\n=== TEST: Brand Fields in Context Tab (F1.1.3, F1.1.5) ===');
  await page.click('[data-tab="context"]');
  await sleep(500);
  const brandFields = await page.evaluate(function() {
    return {
      logoUrl: !!document.getElementById('brand-logo-url'),
      colorPrimary: !!document.getElementById('brand-color-primary'),
      colorAccent: !!document.getElementById('brand-color-accent'),
      fontHeading: !!document.getElementById('brand-font-heading'),
      fontBody: !!document.getElementById('brand-font-body'),
      templates: !!document.getElementById('brand-templates-grid'),
    };
  });
  console.log('Brand guidelines fields (F1.1.3):', JSON.stringify(brandFields));

  // Check brand templates rendered
  const templateBtns = await page.evaluate(function() {
    var el = document.getElementById('brand-templates-grid');
    return el ? el.querySelectorAll('button').length : 0;
  });
  console.log('Brand template buttons rendered (F1.1.5):', templateBtns);

  // Check product tab for image URL (F1.2.2)
  console.log('\n=== TEST: Product Image URL (F1.2.2) ===');
  const productImageUrl = await page.evaluate(function() {
    return !!document.getElementById('product-image-url');
  });
  console.log('Product image URL field:', productImageUrl);

  // Check settings tab (F10.2)
  console.log('\n=== TEST: Settings Tab (F10.2) ===');
  await page.click('[data-tab="settings"]');
  await sleep(1500);
  const settingsPanel = await page.evaluate(function() {
    var el = document.getElementById('settings-panel');
    return {
      exists: !!el,
      hasContent: el ? el.innerHTML.length > 100 : false,
      hasApiKeys: el ? (el.innerHTML.includes('API Key') || el.innerHTML.includes('anthropic') || el.innerHTML.includes('Anthropic')) : false,
      hasPresets: el ? el.innerHTML.includes('Default') || el.innerHTML.includes('Preset') : false,
      hasNotifications: el ? el.innerHTML.includes('Notification') : false,
      hasExport: el ? el.innerHTML.includes('Export') : false,
    };
  });
  console.log('Settings panel (F10.2):', JSON.stringify(settingsPanel));

  // Check generate tab for sophistication assessment (F3.3.3)
  console.log('\n=== TEST: Sophistication Assessment (F3.3.3) ===');
  await page.click('[data-tab="generate"]');
  await sleep(500);
  const sophBtn = await page.evaluate(function() {
    var btns = Array.from(document.querySelectorAll('button'));
    var btn = btns.find(function(b) { return b.textContent.includes('Assess'); });
    return btn ? { found: true, text: btn.textContent.trim() } : { found: false };
  });
  console.log('Sophistication assess button:', JSON.stringify(sophBtn));

  // Test incoming webhook endpoint (F9.1.1)
  console.log('\n=== TEST: Incoming Webhook (F9.1.1) ===');
  const incomingTest = await page.evaluate(async function() {
    try {
      var resp = await fetch('http://localhost:3434/api/pct/incoming/test-hook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', message: 'ping' })
      });
      var json = await resp.json();
      return { status: resp.status, received: json.data && json.data.received };
    } catch(e) {
      return { error: e.message };
    }
  });
  console.log('Incoming webhook:', JSON.stringify(incomingTest));

  // Test rewrite-section endpoint availability
  console.log('\n=== TEST: Rewrite Section Endpoint (F6.2.4) ===');
  const rewriteTest = await page.evaluate(async function() {
    try {
      var resp = await fetch('http://localhost:3434/api/pct/video-scripts/fake-id/rewrite-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'hook' })
      });
      var json = await resp.json();
      return { status: resp.status, errorMsg: json.error && json.error.message };
    } catch(e) {
      return { error: e.message };
    }
  });
  console.log('Rewrite-section endpoint:', JSON.stringify(rewriteTest));

  console.log('\n=== Console Errors ===');
  console.log('Total errors:', errors.length);
  errors.slice(0, 5).forEach(function(e) { console.log('  ERROR:', e); });

  await browser.close();
  console.log('\nAudit complete.');
}

audit().catch(function(e) { console.error('AUDIT FAILED:', e.message); process.exit(1); });
