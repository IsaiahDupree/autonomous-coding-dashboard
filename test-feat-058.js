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

    // === AC1: Browser Notification API ===
    console.log('\n=== AC1: Browser Notification API ===');

    // Check API exists
    const hasAPI = await page.evaluate(() => typeof window.desktopNotifications === 'object');
    assert(hasAPI, 'desktopNotifications API exists on window');

    // Check card rendered
    const hasCard = await page.evaluate(() => !!document.getElementById('desktop-notif-card'));
    assert(hasCard, 'Desktop notifications card rendered');

    // Check permission section
    const hasPermSection = await page.evaluate(() => !!document.getElementById('dn-permission-section'));
    assert(hasPermSection, 'Permission section exists');

    // Check API support is displayed
    const showsApiSupport = await page.evaluate(() => {
      const section = document.getElementById('dn-permission-section');
      return section && (section.textContent.includes('Supported') || section.textContent.includes('Not Supported'));
    });
    assert(showsApiSupport, 'API support status is displayed');

    // Check permission status is displayed
    const hasPermStatus = await page.evaluate(() => !!document.getElementById('dn-permission-status'));
    assert(hasPermStatus, 'Permission status element exists');

    // Check getPermission function
    const hasGetPermission = await page.evaluate(() => typeof window.desktopNotifications.getPermission === 'function');
    assert(hasGetPermission, 'getPermission function exists');

    // Check notify function
    const hasNotify = await page.evaluate(() => typeof window.desktopNotifications.notify === 'function');
    assert(hasNotify, 'notify function exists');

    // Check sendTest function
    const hasSendTest = await page.evaluate(() => typeof window.desktopNotifications.sendTest === 'function');
    assert(hasSendTest, 'sendTest function exists');

    // Check test button
    const hasTestBtn = await page.evaluate(() => {
      const card = document.getElementById('desktop-notif-card');
      return card && card.textContent.includes('Test');
    });
    assert(hasTestBtn, 'Test notification button exists');

    // === AC2: Permission request ===
    console.log('\n=== AC2: Permission request ===');

    // Check requestPermission function exists
    const hasRequestPerm = await page.evaluate(() =>
      typeof window.desktopNotifications.requestPermission === 'function'
    );
    assert(hasRequestPerm, 'requestPermission function exists');

    // Check permission badge is displayed in header
    const hasBadge = await page.evaluate(() => {
      const header = document.querySelector('#desktop-notif-card .card-header');
      return header && header.querySelector('.badge') !== null;
    });
    assert(hasBadge, 'Permission status badge displayed in card header');

    // Check request permission button exists (only if permission is default)
    const permButtonOrStatus = await page.evaluate(() => {
      const btn = document.getElementById('dn-request-permission-btn');
      const status = document.getElementById('dn-permission-status');
      // Either request button exists (default) or status shows granted/denied
      return btn !== null || (status && (status.textContent === 'granted' || status.textContent === 'denied'));
    });
    assert(permButtonOrStatus, 'Request permission button or granted/denied status shown');

    // === AC3: Configurable events ===
    console.log('\n=== AC3: Configurable events ===');

    // Check events section
    const hasEventsSection = await page.evaluate(() => !!document.getElementById('dn-events-section'));
    assert(hasEventsSection, 'Configurable events section exists');

    // Check events list
    const hasEventsList = await page.evaluate(() => !!document.getElementById('dn-events-list'));
    assert(hasEventsList, 'Events list exists');

    // Check event items
    const eventCount = await page.evaluate(() => {
      const items = document.querySelectorAll('.dn-event-item');
      return items.length;
    });
    assert(eventCount >= 6, `${eventCount} configurable events (>= 6)`);

    // Check each event has toggle
    const eventToggles = await page.evaluate(() => {
      const toggles = document.querySelectorAll('.dn-event-toggle');
      return toggles.length;
    });
    assert(eventToggles >= 6, `${eventToggles} event toggles`);

    // Check events have icons
    const eventIcons = await page.evaluate(() => {
      const icons = document.querySelectorAll('.dn-event-icon');
      return icons.length;
    });
    assert(eventIcons >= 6, `${eventIcons} event icons`);

    // Check events have names and descriptions
    const hasNames = await page.evaluate(() => {
      const names = document.querySelectorAll('.dn-event-name');
      const descs = document.querySelectorAll('.dn-event-desc');
      return names.length >= 6 && descs.length >= 6;
    });
    assert(hasNames, 'Events have names and descriptions');

    // Check specific events exist
    const specificEvents = await page.evaluate(() => {
      const toggles = document.querySelectorAll('.dn-event-toggle');
      const keys = Array.from(toggles).map(t => t.dataset.eventKey);
      return {
        feature_complete: keys.includes('feature_complete'),
        feature_failed: keys.includes('feature_failed'),
        session_started: keys.includes('session_started'),
        session_ended: keys.includes('session_ended'),
        error_occurred: keys.includes('error_occurred'),
        milestone_reached: keys.includes('milestone_reached'),
      };
    });
    assert(specificEvents.feature_complete, 'Feature Complete event configurable');
    assert(specificEvents.feature_failed, 'Feature Failed event configurable');
    assert(specificEvents.error_occurred, 'Error Occurred event configurable');
    assert(specificEvents.session_ended, 'Session Ended event configurable');

    // Toggle an event off
    await page.evaluate(() => {
      const toggle = document.getElementById('dn-event-error_occurred');
      if (toggle) {
        toggle.checked = false;
      }
      window.desktopNotifications.save();
    });
    await new Promise(r => setTimeout(r, 300));

    const eventToggled = await page.evaluate(() => {
      const cfg = window.desktopNotifications.getConfig();
      return cfg.events.error_occurred.enabled === false;
    });
    assert(eventToggled, 'Event toggle can disable an event');

    // Check isEventEnabled function
    const isEnabled = await page.evaluate(() =>
      window.desktopNotifications.isEventEnabled('feature_complete') === true &&
      window.desktopNotifications.isEventEnabled('error_occurred') === false
    );
    assert(isEnabled, 'isEventEnabled returns correct values');

    // Check settings saved to localStorage
    const savedToStorage = await page.evaluate(() => {
      const saved = localStorage.getItem('desktop-notifications-config');
      return saved !== null;
    });
    assert(savedToStorage, 'Settings saved to localStorage');

    // Check auto-close delay input
    const hasAutoClose = await page.$('#dn-auto-close');
    assert(hasAutoClose !== null, 'Auto-close delay input exists');

    // Check require interaction checkbox
    const hasRequireInt = await page.$('#dn-require-interaction');
    assert(hasRequireInt !== null, 'Require interaction checkbox exists');

    // Test reset defaults
    await page.evaluate(() => window.desktopNotifications.resetDefaults());
    await new Promise(r => setTimeout(r, 300));

    const afterReset = await page.evaluate(() => {
      const cfg = window.desktopNotifications.getConfig();
      return cfg.events.error_occurred.enabled === true && cfg.autoCloseDelay === 5;
    });
    assert(afterReset, 'Reset defaults restores all settings');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n==========================================================');
  console.log('feat-058: Desktop Push Notifications - Test Results');
  console.log('==========================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
