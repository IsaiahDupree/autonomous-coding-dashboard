const puppeteer = require('puppeteer');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function audit() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:3434/pct.html', { waitUntil: 'networkidle0', timeout: 15000 });
  await sleep(1500);

  // Test Brand Templates
  console.log('\n=== TEST: Brand Templates ===');
  const brandTemplatesGrid = await page.evaluate(() => {
    const el = document.getElementById('brand-templates-grid');
    return el ? { len: el.innerHTML.length, buttons: el.querySelectorAll('button').length } : { len: 0, buttons: 0 };
  });
  console.log('Brand templates grid:', brandTemplatesGrid.buttons, 'templates rendered');

  // Apply a brand template
  await page.evaluate(() => {
    const el = document.getElementById('brand-templates-grid');
    if (el) {
      const firstBtn = el.querySelector('button');
      if (firstBtn) firstBtn.click();
    }
  });
  await sleep(500);
  const brandNameAfterTemplate = await page.evaluate(() => {
    const el = document.getElementById('brand-name');
    return el ? el.value : 'NOT FOUND';
  });
  console.log('Brand name after template apply:', brandNameAfterTemplate);

  // Test new brand form fields (F1.1.3)
  const brandGuidelinesFields = await page.evaluate(() => {
    return {
      logoUrl: !!document.getElementById('brand-logo-url'),
      colorPrimary: !!document.getElementById('brand-color-primary'),
      colorAccent: !!document.getElementById('brand-color-accent'),
      fontHeading: !!document.getElementById('brand-font-heading'),
      fontBody: !!document.getElementById('brand-font-body'),
    };
  });
  console.log('F1.1.3 Brand guidelines fields:', brandGuidelinesFields);

  // Test Settings Tab (F10.2)
  console.log('\n=== TEST: Settings Tab ===');
  await page.click('[data-tab="settings"]');
  await sleep(1500);
  const settingsPanel = await page.evaluate(() => {
    const el = document.getElementById('settings-panel');
    if (!el) return { len: 0, text: 'NOT FOUND' };
    return {
      len: el.innerHTML.length,
      hasApiKeys: el.innerHTML.includes('API Key'),
      hasPresets: el.innerHTML.includes('Default Generation'),
      hasNotifications: el.innerHTML.includes('Notification'),
      hasExport: el.innerHTML.includes('Export'),
      hasIncoming: el.innerHTML.includes('Incoming Webhook'),
      text: el.innerText.substring(0, 300)
    };
  });
  console.log('Settings panel len:', settingsPanel.len);
  console.log('  Has API keys:', settingsPanel.hasApiKeys);
  console.log('  Has presets:', settingsPanel.hasPresets);
  console.log('  Has notifications:', settingsPanel.hasNotifications);
  console.log('  Has export:', settingsPanel.hasExport);
  console.log('  Has incoming webhooks:', settingsPanel.hasIncoming);

  // Test API key fields
  const apiKeyFields = await page.evaluate(() => {
    return {
      anthropic: !!document.getElementById('settings-anthropic-key'),
      openai: !!document.getElementById('settings-openai-key'),
      meta: !!document.getElementById('settings-meta-token'),
    };
  });
  console.log('API key fields:', apiKeyFields);

  // Test sophistication assessment button in Hook Generation tab
  console.log('\n=== TEST: Sophistication Assessment ===');
  await page.click('[data-tab="generate"]');
  await sleep(1000);
  const sophAssessBtn = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Assess'));
    return btn ? { found: true, text: btn.textContent.trim() } : { found: false, text: '' };
  });
  console.log('Sophistication assess button:', sophAssessBtn);

  // Click the assess button and check modal
  if (sophAssessBtn.found) {
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Assess'));
      if (btn) btn.click();
    });
    await sleep(500);
    const modalVisible = await page.evaluate(() => {
      const modal = document.getElementById('soph-assessment-modal');
      return modal ? modal.style.display !== 'none' : false;
    });
    console.log('Assessment modal opened:', modalVisible);

    // Check modal has question
    const modalContent = await page.evaluate(() => {
      const el = document.getElementById('soph-assessment-area');
      return el ? el.innerText.substring(0, 200) : 'NOT FOUND';
    });
    console.log('Assessment question:', modalContent.substring(0, 100));

    // Answer first question
    await page.evaluate(() => {
      const el = document.getElementById('soph-assessment-area');
      if (el) {
        const btn = el.querySelector('button');
        if (btn) btn.click();
      }
    });
    await sleep(300);
    const afterFirstQ = await page.evaluate(() => {
      const el = document.getElementById('soph-assessment-area');
      return el ? el.innerText.substring(0, 100) : '';
    });
    console.log('After first answer:', afterFirstQ.substring(0, 60));
  }

  // Test incoming webhook endpoint
  console.log('\n=== TEST: Incoming Webhook Endpoint ===');
  const incomingTest = await page.evaluate(async () => {
    try {
      const resp = await fetch('http://localhost:3434/api/pct/incoming/test-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', message: 'hello' })
      });
      const json = await resp.json();
      return { status: resp.status, data: json };
    } catch (e) {
      return { error: e.message };
    }
  });
  console.log('Incoming webhook response:', JSON.stringify(incomingTest));

  // Test incoming logs endpoint
  const logsTest = await page.evaluate(async () => {
    try {
      const resp = await fetch('http://localhost:3434/api/pct/incoming/logs');
      const json = await resp.json();
      return { status: resp.status, count: (json.data || []).length };
    } catch (e) {
      return { error: e.message };
    }
  });
  console.log('Incoming logs:', JSON.stringify(logsTest));

  console.log('\n=== Console Errors ===');
  errors.forEach(e => console.log('ERROR:', e));

  await browser.close();
}

audit().catch(e => { console.error('AUDIT FAILED:', e.message); process.exit(1); });
