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
    await new Promise(r => setTimeout(r, 3000));

    // === Basic Setup ===
    console.log('\n=== Basic Setup ===');

    const hasAPI = await page.evaluate(() => typeof window.webhooks === 'object');
    assert(hasAPI, 'webhooks API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('webhooks-card'));
    assert(hasCard, 'Webhooks card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.wh-tab').length === 3);
    assert(hasTabs, 'Three tabs exist');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.wh-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Configure webhook URLs ===
    console.log('\n=== AC1: Configure webhook URLs ===');

    const hooks = await page.evaluate(() => window.webhooks.getWebhooks());
    assert(hooks.length > 0, `${hooks.length} webhooks configured`);
    assert(hooks.length === 4, 'Has 4 sample webhooks');

    const first = hooks[0];
    assert(first.id !== undefined, 'Webhook has id');
    assert(first.name !== undefined, 'Webhook has name');
    assert(first.url !== undefined, 'Webhook has URL');
    assert(first.url.startsWith('https://'), 'URL is HTTPS');
    assert(first.events.length > 0, `Webhook has ${first.events.length} events`);
    assert(first.active !== undefined, 'Webhook has active flag');
    assert(first.createdAt !== undefined, 'Webhook has createdAt');
    assert(first.deliveryCount >= 0, `Delivery count: ${first.deliveryCount}`);
    assert(first.failureCount >= 0, `Failure count: ${first.failureCount}`);

    // Get specific webhook
    const specific = await page.evaluate((id) => window.webhooks.getWebhook(id), first.id);
    assert(specific !== null, 'Can retrieve specific webhook');
    assert(specific.secret !== undefined, 'Webhook has secret');

    // Create webhook
    const newId = await page.evaluate(() => {
      return window.webhooks.createWebhook('Test Hook', 'https://test.example.com/webhook', ['feature.completed', 'test.passed']);
    });
    assert(newId !== undefined, `New webhook created: ${newId}`);

    const afterCreate = await page.evaluate(() => window.webhooks.getWebhooks());
    assert(afterCreate.length === 5, 'Webhook count increased to 5');

    // Update webhook
    const updated = await page.evaluate((id) => window.webhooks.updateWebhook(id, { name: 'Updated Hook', url: 'https://updated.example.com/hook' }), newId);
    assert(updated === true, 'updateWebhook returns true');
    const afterUpdate = await page.evaluate((id) => window.webhooks.getWebhook(id), newId);
    assert(afterUpdate.name === 'Updated Hook', 'Webhook name updated');
    assert(afterUpdate.url === 'https://updated.example.com/hook', 'Webhook URL updated');

    // Toggle webhook
    const toggled = await page.evaluate((id) => window.webhooks.toggleWebhook(id), newId);
    assert(toggled === false, 'Toggle deactivated webhook');
    const afterToggle = await page.evaluate((id) => window.webhooks.getWebhook(id), newId);
    assert(afterToggle.active === false, 'Webhook is now inactive');

    // Delete webhook
    const deleted = await page.evaluate((id) => window.webhooks.deleteWebhook(id), newId);
    assert(deleted === true, 'deleteWebhook returns true');
    const afterDelete = await page.evaluate(() => window.webhooks.getWebhooks());
    assert(afterDelete.length === 4, 'Webhook count back to 4');

    // Webhook list rendered
    const hookList = await page.evaluate(() => !!document.getElementById('wh-hook-list'));
    assert(hookList, 'Webhook list rendered');

    const hookItems = await page.evaluate(() => document.querySelectorAll('.wh-hook-item').length);
    assert(hookItems > 0, `${hookItems} webhook items rendered`);

    // === AC2: Event filtering ===
    console.log('\n=== AC2: Event filtering ===');

    const eventTypes = await page.evaluate(() => window.webhooks.getEventTypes());
    assert(eventTypes.length > 0, `${eventTypes.length} event types available`);
    assert(eventTypes.length === 12, 'Has 12 event types');

    const firstEvent = eventTypes[0];
    assert(firstEvent.id !== undefined, 'Event has id');
    assert(firstEvent.category !== undefined, `Event category: ${firstEvent.category}`);
    assert(firstEvent.action !== undefined, `Event action: ${firstEvent.action}`);

    // Webhooks for specific event
    const forEvent = await page.evaluate(() => window.webhooks.getWebhooksForEvent('feature.completed'));
    assert(forEvent.length > 0, `${forEvent.length} hooks for feature.completed`);
    const allActive = forEvent.every(h => h.active);
    assert(allActive, 'All returned hooks are active');

    // Event filtering on webhooks
    const eventTags = await page.evaluate(() => document.querySelectorAll('.wh-event-tag').length);
    assert(eventTags > 0, `${eventTags} event tags rendered`);

    // Deliveries with event info
    const deliveries = await page.evaluate(() => window.webhooks.getDeliveries());
    assert(deliveries.length > 0, `${deliveries.length} deliveries`);

    const firstDel = deliveries[0];
    assert(firstDel.id !== undefined, 'Delivery has id');
    assert(firstDel.webhookId !== undefined, 'Delivery has webhookId');
    assert(firstDel.event !== undefined, `Delivery event: ${firstDel.event}`);
    assert(firstDel.status !== undefined, `Delivery status: ${firstDel.status}`);
    assert(firstDel.statusCode > 0, `Status code: ${firstDel.statusCode}`);
    assert(firstDel.duration > 0, `Duration: ${firstDel.duration}ms`);
    assert(firstDel.timestamp !== undefined, 'Delivery has timestamp');
    assert(firstDel.requestBody !== undefined, 'Delivery has request body');
    assert(firstDel.responseBody !== undefined, 'Delivery has response body');

    // Filter deliveries by status
    const failedDels = await page.evaluate(() => window.webhooks.getDeliveries({ status: 'failed' }));
    assert(failedDels.length > 0, `${failedDels.length} failed deliveries`);
    const allFailed = failedDels.every(d => d.status === 'failed');
    assert(allFailed, 'All filtered deliveries are failed');

    // Filter by webhook
    const hookDels = await page.evaluate((id) => window.webhooks.getDeliveries({ webhookId: id }), first.id);
    assert(hookDels.length > 0, `${hookDels.length} deliveries for webhook`);

    // Get specific delivery
    const specificDel = await page.evaluate((id) => window.webhooks.getDelivery(id), firstDel.id);
    assert(specificDel !== null, 'Can retrieve specific delivery');

    // Switch to deliveries tab
    await page.evaluate(() => window.webhooks.setTab('deliveries'));
    await new Promise(r => setTimeout(r, 300));

    const delTabActive = await page.evaluate(() => {
      return document.querySelector('.wh-tab[data-tab="deliveries"]').classList.contains('active');
    });
    assert(delTabActive, 'Deliveries tab becomes active');

    const delList = await page.evaluate(() => !!document.getElementById('wh-delivery-list'));
    assert(delList, 'Delivery list rendered');

    const delItems = await page.evaluate(() => document.querySelectorAll('.wh-delivery-item').length);
    assert(delItems > 0, `${delItems} delivery items rendered`);

    // === AC3: Retry on failure ===
    console.log('\n=== AC3: Retry on failure ===');

    const retryConfig = await page.evaluate(() => window.webhooks.getRetryConfig());
    assert(retryConfig.maxRetries > 0, `Max retries: ${retryConfig.maxRetries}`);
    assert(retryConfig.retryDelay > 0, `Retry delay: ${retryConfig.retryDelay}ms`);
    assert(retryConfig.backoffMultiplier > 0, `Backoff: ${retryConfig.backoffMultiplier}x`);
    assert(retryConfig.timeoutMs > 0, `Timeout: ${retryConfig.timeoutMs}ms`);

    // Update retry config
    const newConfig = await page.evaluate(() => window.webhooks.updateRetryConfig({ maxRetries: 5 }));
    assert(newConfig.maxRetries === 5, 'Retry config updated to 5');

    // Retry a failed delivery
    if (failedDels.length > 0) {
      const retried = await page.evaluate((id) => window.webhooks.retryDelivery(id), failedDels[0].id);
      assert(retried === true, 'retryDelivery returns true');
      const afterRetry = await page.evaluate((id) => window.webhooks.getDelivery(id), failedDels[0].id);
      assert(afterRetry.status === 'success', 'Retried delivery now success');
      assert(afterRetry.retryCount > 0, `Retry count: ${afterRetry.retryCount}`);
    }

    // Switch to retry tab
    await page.evaluate(() => window.webhooks.setTab('retry'));
    await new Promise(r => setTimeout(r, 300));

    const retryTabActive = await page.evaluate(() => {
      return document.querySelector('.wh-tab[data-tab="retry"]').classList.contains('active');
    });
    assert(retryTabActive, 'Retry Config tab becomes active');

    const retrySection = await page.evaluate(() => !!document.getElementById('wh-retry-section'));
    assert(retrySection, 'Retry section rendered');

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.webhooks.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.webhookCount > 0, `State tracks ${stateObj.webhookCount} webhooks`);
    assert(stateObj.deliveryCount > 0, `State tracks ${stateObj.deliveryCount} deliveries`);
    assert(stateObj.retryConfig !== undefined, 'State has retry config');

    const savedState = await page.evaluate(() => localStorage.getItem('webhooks-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-082: Webhook Support for Events - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
