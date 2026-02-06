const puppeteer = require('puppeteer');

(async () => {
  let passed = 0;
  let failed = 0;
  const results = [];

  function assert(condition, message) {
    if (condition) {
      passed++;
      results.push(`  ✓ ${message}`);
    } else {
      failed++;
      results.push(`  ✗ ${message}`);
    }
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // === AC1: Configure email address ===
    console.log('\n=== AC1: Configure email address ===');

    // Check API exists
    const hasAPI = await page.evaluate(() => typeof window.emailNotifications === 'object');
    assert(hasAPI, 'emailNotifications API exists on window');

    // Check card rendered
    const hasCard = await page.evaluate(() => !!document.getElementById('email-notif-card'));
    assert(hasCard, 'Email notifications card rendered');

    // Check config section
    const hasConfigSection = await page.evaluate(() => !!document.getElementById('en-config-section'));
    assert(hasConfigSection, 'Email configuration section exists');

    // Check email input
    const hasEmailInput = await page.$('#en-email-address');
    assert(hasEmailInput !== null, 'Email address input exists');

    // Check email input type is email
    const inputType = await page.evaluate(() => document.getElementById('en-email-address').type);
    assert(inputType === 'email', `Email input type is "${inputType}"`);

    // Check enabled checkbox
    const hasEnabledCb = await page.$('#en-enabled');
    assert(hasEnabledCb !== null, 'Enable checkbox exists');

    // Enter email and save
    await page.evaluate(() => {
      document.getElementById('en-email-address').value = 'test@example.com';
      document.getElementById('en-enabled').checked = true;
      window.emailNotifications.save();
    });
    await new Promise(r => setTimeout(r, 500));

    // Verify saved
    const savedConfig = await page.evaluate(() => {
      const cfg = window.emailNotifications.getConfig();
      return cfg;
    });
    assert(savedConfig.emailAddress === 'test@example.com', 'Email address saved correctly');
    assert(savedConfig.enabled === true, 'Enabled state saved correctly');

    // Check localStorage persisted
    const persisted = await page.evaluate(() => {
      const saved = localStorage.getItem('email-notifications-config');
      return saved ? JSON.parse(saved) : null;
    });
    assert(persisted && persisted.emailAddress === 'test@example.com', 'Config persisted to localStorage');

    // Check status indicator
    const hasStatusIndicator = await page.evaluate(() => !!document.getElementById('en-status-indicator'));
    assert(hasStatusIndicator, 'Status indicator exists');

    // Check send test button
    const hasTestBtn = await page.evaluate(() => {
      const card = document.getElementById('email-notif-card');
      return card && card.textContent.includes('Send Test');
    });
    assert(hasTestBtn, 'Send Test button exists');

    // === AC2: Summary of completed features ===
    console.log('\n=== AC2: Summary of completed features ===');

    // Check summary section
    const hasSummarySection = await page.evaluate(() => !!document.getElementById('en-summary-section'));
    assert(hasSummarySection, 'Session completion summary section exists');

    // Check session complete checkbox
    const hasSessionCb = await page.$('#en-session-complete');
    assert(hasSessionCb !== null, 'Notify on session complete checkbox exists');

    // Check include summary checkbox
    const hasSummaryCb = await page.$('#en-include-summary');
    assert(hasSummaryCb !== null, 'Include features summary checkbox exists');

    // Check milestones checkbox
    const hasMilestonesCb = await page.$('#en-milestones');
    assert(hasMilestonesCb !== null, 'Notify on milestones checkbox exists');

    // Check summary preview
    const hasSummaryPreview = await page.evaluate(() => {
      const preview = document.getElementById('en-summary-preview');
      return preview && preview.textContent.includes('Session Summary');
    });
    assert(hasSummaryPreview, 'Session summary email preview exists');

    // Check preview shows feature stats
    const previewHasStats = await page.evaluate(() => {
      const preview = document.getElementById('en-summary-preview');
      return preview && preview.textContent.includes('Features completed');
    });
    assert(previewHasStats, 'Preview shows completed features count');

    // Check preview shows recently completed features
    const previewHasRecent = await page.evaluate(() => {
      const preview = document.getElementById('en-summary-preview');
      return preview && preview.textContent.includes('Recently Completed');
    });
    assert(previewHasRecent, 'Preview shows recently completed features');

    // Check notifySessionComplete function exists
    const hasNotifyFn = await page.evaluate(() =>
      typeof window.emailNotifications.notifySessionComplete === 'function'
    );
    assert(hasNotifyFn, 'notifySessionComplete function exists');

    // === AC3: Error alerts ===
    console.log('\n=== AC3: Error alerts ===');

    // Check error section
    const hasErrorSection = await page.evaluate(() => !!document.getElementById('en-error-section'));
    assert(hasErrorSection, 'Error alerts section exists');

    // Check error alerts checkbox
    const hasErrorCb = await page.$('#en-error-alerts');
    assert(hasErrorCb !== null, 'Error alerts checkbox exists');

    // Check error threshold select
    const hasThresholdSelect = await page.$('#en-error-threshold');
    assert(hasThresholdSelect !== null, 'Error threshold select exists');

    // Check threshold options
    const thresholdOptions = await page.evaluate(() => {
      const select = document.getElementById('en-error-threshold');
      return Array.from(select.options).map(o => o.value);
    });
    assert(thresholdOptions.includes('all'), 'Threshold has "All Errors" option');
    assert(thresholdOptions.includes('critical'), 'Threshold has "Critical Only" option');
    assert(thresholdOptions.includes('none'), 'Threshold has "None" option');

    // Check error preview
    const hasErrorPreview = await page.evaluate(() => {
      const preview = document.getElementById('en-error-preview');
      return preview && preview.textContent.includes('Error Alert');
    });
    assert(hasErrorPreview, 'Error alert email preview exists');

    // Check notifyError function exists
    const hasErrorNotifyFn = await page.evaluate(() =>
      typeof window.emailNotifications.notifyError === 'function'
    );
    assert(hasErrorNotifyFn, 'notifyError function exists');

    // Check recent notifications section
    const hasRecentList = await page.evaluate(() => !!document.getElementById('en-recent-list'));
    assert(hasRecentList, 'Recent notifications list exists');

    // Test send test email (adds to recent list)
    await page.evaluate(() => window.emailNotifications.sendTestEmail());
    await new Promise(r => setTimeout(r, 500));

    const recentCount = await page.evaluate(() => {
      const items = document.querySelectorAll('.en-recent-item');
      return items.length;
    });
    assert(recentCount >= 1, `${recentCount} recent notification(s) after test send`);

    // Test clear history
    await page.evaluate(() => window.emailNotifications.clearHistory());
    await new Promise(r => setTimeout(r, 300));

    const afterClear = await page.evaluate(() => {
      const cfg = window.emailNotifications.getConfig();
      return cfg.recentNotifications.length;
    });
    assert(afterClear === 0, 'Clear history removes all notifications');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n==========================================================');
  console.log('feat-057: Email Notifications - Test Results');
  console.log('==========================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
