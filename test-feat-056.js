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

    // === AC1: Webhook configuration ===
    console.log('\n=== AC1: Webhook configuration ===');

    // Check slackIntegration API exists
    const hasAPI = await page.evaluate(() => typeof window.slackIntegration === 'object');
    assert(hasAPI, 'slackIntegration API exists on window');

    // Check widget rendered
    const hasCard = await page.evaluate(() => !!document.getElementById('slack-card'));
    assert(hasCard, 'Slack integration card rendered');

    // Check webhook section exists
    const hasWebhookSection = await page.evaluate(() => !!document.getElementById('si-webhook-section'));
    assert(hasWebhookSection, 'Webhook configuration section exists');

    // Check webhook URL input
    const hasUrlInput = await page.$('#si-webhook-url');
    assert(hasUrlInput !== null, 'Webhook URL input exists');

    // Check URL input has correct placeholder
    const urlPlaceholder = await page.evaluate(() =>
      document.getElementById('si-webhook-url').placeholder
    );
    assert(urlPlaceholder.includes('hooks.slack.com'), `URL placeholder includes Slack URL hint`);

    // Check enabled checkbox exists
    const hasEnabledCb = await page.$('#si-enabled');
    assert(hasEnabledCb !== null, 'Enable notifications checkbox exists');

    // Test entering a webhook URL
    await page.evaluate(() => {
      document.getElementById('si-webhook-url').value = 'https://hooks.slack.com/services/T123/B456/testtoken';
    });

    // Check status indicator exists
    const hasStatus = await page.evaluate(() => !!document.getElementById('slack-status-indicator'));
    assert(hasStatus, 'Status indicator exists');

    // Test save functionality
    await page.evaluate(() => {
      document.getElementById('si-enabled').checked = true;
      window.slackIntegration.save();
    });
    await new Promise(r => setTimeout(r, 500));

    // Verify config was saved
    const savedConfig = await page.evaluate(() => {
      const saved = localStorage.getItem('slack-integration-config');
      return saved ? JSON.parse(saved) : null;
    });
    assert(savedConfig !== null, 'Configuration saved to localStorage');
    assert(savedConfig && savedConfig.enabled === true, 'Enabled state saved correctly');

    // Test connection button exists
    const hasTestBtn = await page.evaluate(() => {
      const card = document.getElementById('slack-card');
      return card && card.textContent.includes('Test');
    });
    assert(hasTestBtn, 'Test connection button exists');

    // === AC2: Custom message templates ===
    console.log('\n=== AC2: Custom message templates ===');

    // Check templates section
    const hasTemplatesSection = await page.evaluate(() => !!document.getElementById('si-templates-section'));
    assert(hasTemplatesSection, 'Message templates section exists');

    // Check template list
    const templateCount = await page.evaluate(() => {
      const items = document.querySelectorAll('.si-template-item');
      return items.length;
    });
    assert(templateCount >= 5, `${templateCount} message templates displayed (>= 5)`);

    // Check templates have toggles
    const templateToggles = await page.evaluate(() => {
      const toggles = document.querySelectorAll('.si-template-toggle');
      return toggles.length;
    });
    assert(templateToggles >= 5, `${templateToggles} template toggles exist`);

    // Check templates have edit buttons
    const editBtns = await page.evaluate(() => {
      const btns = document.querySelectorAll('.si-template-edit-btn');
      return btns.length;
    });
    assert(editBtns >= 5, `${editBtns} template edit buttons exist`);

    // Check template previews show template text
    const hasPreview = await page.evaluate(() => {
      const preview = document.querySelector('.si-template-preview');
      return preview && preview.textContent.includes('{{');
    });
    assert(hasPreview, 'Template previews show template variables');

    // Check specific default templates exist
    const templateKeys = await page.evaluate(() => {
      const items = document.querySelectorAll('.si-template-item');
      return Array.from(items).map(item => item.dataset.templateKey);
    });
    assert(templateKeys.includes('feature_complete'), 'Feature Completed template exists');
    assert(templateKeys.includes('feature_failed'), 'Feature Failed template exists');
    assert(templateKeys.includes('harness_started'), 'Harness Started template exists');
    assert(templateKeys.includes('harness_stopped'), 'Harness Stopped template exists');
    assert(templateKeys.includes('error_alert'), 'Error Alert template exists');

    // Toggle a template off
    await page.evaluate(() => {
      const toggle = document.querySelector('.si-template-toggle[data-key="error_alert"]');
      if (toggle) {
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change'));
      }
    });
    const toggledOff = await page.evaluate(() => {
      const cfg = window.slackIntegration.getConfig();
      return cfg.templates.error_alert.enabled === false;
    });
    assert(toggledOff, 'Template toggle can disable a template');

    // === AC3: Channel selection ===
    console.log('\n=== AC3: Channel selection ===');

    // Check channel section
    const hasChannelSection = await page.evaluate(() => !!document.getElementById('si-channel-section'));
    assert(hasChannelSection, 'Channel selection section exists');

    // Check channel select dropdown
    const hasChannelSelect = await page.$('#si-channel-select');
    assert(hasChannelSelect !== null, 'Channel select dropdown exists');

    // Check default channels
    const channelOptions = await page.evaluate(() => {
      const select = document.getElementById('si-channel-select');
      return Array.from(select.options).map(o => o.value);
    });
    assert(channelOptions.includes('#general'), 'Default #general channel available');
    assert(channelOptions.includes('#alerts'), 'Default #alerts channel available');
    assert(channelOptions.length >= 3, `${channelOptions.length} channels available (>= 3)`);

    // Check channel tags display
    const hasTags = await page.evaluate(() => {
      const tags = document.querySelectorAll('.si-tag');
      return tags.length;
    });
    assert(hasTags >= 3, `${hasTags} channel tags displayed`);

    // Check custom channel input
    const hasCustomInput = await page.$('#si-custom-channel');
    assert(hasCustomInput !== null, 'Custom channel input exists');

    // Add a custom channel
    await page.evaluate(() => {
      document.getElementById('si-custom-channel').value = '#my-custom-channel';
      window.slackIntegration.addChannel();
    });
    await new Promise(r => setTimeout(r, 300));

    const customAdded = await page.evaluate(() => {
      const cfg = window.slackIntegration.getConfig();
      return cfg.channels.includes('#my-custom-channel');
    });
    assert(customAdded, 'Custom channel added successfully');

    // Check custom channel appears in select
    const customInSelect = await page.evaluate(() => {
      const select = document.getElementById('si-channel-select');
      return Array.from(select.options).some(o => o.value === '#my-custom-channel');
    });
    assert(customInSelect, 'Custom channel appears in select dropdown');

    // Remove a channel
    await page.evaluate(() => {
      window.slackIntegration.removeChannel('#my-custom-channel');
    });
    await new Promise(r => setTimeout(r, 300));

    const customRemoved = await page.evaluate(() => {
      const cfg = window.slackIntegration.getConfig();
      return !cfg.channels.includes('#my-custom-channel');
    });
    assert(customRemoved, 'Channel removed successfully');

    // Test reset defaults
    await page.evaluate(() => window.slackIntegration.resetDefaults());
    await new Promise(r => setTimeout(r, 300));

    const afterReset = await page.evaluate(() => {
      const cfg = window.slackIntegration.getConfig();
      return cfg.enabled === false && cfg.webhookUrl === '' && cfg.channel === '#general';
    });
    assert(afterReset, 'Reset defaults restores all settings');

    // Verify localStorage cleared
    const storageCleared = await page.evaluate(() =>
      localStorage.getItem('slack-integration-config') === null
    );
    assert(storageCleared, 'localStorage cleared after reset');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-056: Slack Integration for Alerts - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
