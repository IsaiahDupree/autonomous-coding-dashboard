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

    const hasAPI = await page.evaluate(() => typeof window.mobileNotifications === 'object');
    assert(hasAPI, 'mobileNotifications API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('mobile-notifications-card'));
    assert(hasCard, 'Mobile notifications card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.mn-tab').length === 3);
    assert(hasTabs, 'Three tabs exist');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.mn-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Push notifications ===
    console.log('\n=== AC1: Push notifications ===');

    const notifs = await page.evaluate(() => window.mobileNotifications.getNotifications());
    assert(notifs.length > 0, `${notifs.length} notifications`);
    assert(notifs.length === 8, 'Has 8 notifications');

    const first = notifs[0];
    assert(first.id !== undefined, 'Notification has id');
    assert(first.title !== undefined, `Title: ${first.title}`);
    assert(first.body !== undefined, 'Has body');
    assert(first.type !== undefined, `Type: ${first.type}`);
    assert(first.category !== undefined, `Category: ${first.category}`);
    assert(first.priority !== undefined, `Priority: ${first.priority}`);
    assert(first.read !== undefined, `Read: ${first.read}`);
    assert(first.timestamp !== undefined, 'Has timestamp');
    assert(first.actionable !== undefined, `Actionable: ${first.actionable}`);

    // Filter by type
    const errors = await page.evaluate(() => window.mobileNotifications.getNotifications({ type: 'error' }));
    assert(errors.length > 0, `${errors.length} error notifications`);
    const allErrors = errors.every(n => n.type === 'error');
    assert(allErrors, 'All filtered are errors');

    // Filter by read status
    const unread = await page.evaluate(() => window.mobileNotifications.getNotifications({ read: false }));
    assert(unread.length > 0, `${unread.length} unread notifications`);

    // Get specific notification
    const specific = await page.evaluate((id) => window.mobileNotifications.getNotification(id), first.id);
    assert(specific !== null, 'Can retrieve specific notification');

    // Mark as read
    const markResult = await page.evaluate((id) => window.mobileNotifications.markAsRead(id), unread[0].id);
    assert(markResult === true, 'markAsRead returns true');

    // Unread count
    const unreadCount = await page.evaluate(() => window.mobileNotifications.getUnreadCount());
    assert(unreadCount >= 0, `Unread count: ${unreadCount}`);

    // Send push notification
    const newId = await page.evaluate(() => window.mobileNotifications.sendPushNotification('Test', 'Test body', { type: 'info', priority: 'low' }));
    assert(newId !== undefined, `New notification: ${newId}`);

    // Mark all as read
    const markAll = await page.evaluate(() => window.mobileNotifications.markAllAsRead());
    assert(markAll === true, 'markAllAsRead returns true');
    const afterMarkAll = await page.evaluate(() => window.mobileNotifications.getUnreadCount());
    assert(afterMarkAll === 0, 'All notifications read');

    // Delete notification
    const deleted = await page.evaluate((id) => window.mobileNotifications.deleteNotification(id), newId);
    assert(deleted === true, 'deleteNotification returns true');

    // Preferences
    const prefs = await page.evaluate(() => window.mobileNotifications.getPreferences());
    assert(prefs.pushEnabled !== undefined, `Push enabled: ${prefs.pushEnabled}`);
    assert(prefs.soundEnabled !== undefined, `Sound: ${prefs.soundEnabled}`);
    assert(prefs.vibrationEnabled !== undefined, `Vibration: ${prefs.vibrationEnabled}`);
    assert(prefs.quietHoursStart >= 0, `Quiet start: ${prefs.quietHoursStart}`);
    assert(prefs.quietHoursEnd >= 0, `Quiet end: ${prefs.quietHoursEnd}`);

    // Update preferences
    const updatedPrefs = await page.evaluate(() => window.mobileNotifications.updatePreferences({ soundEnabled: false }));
    assert(updatedPrefs.soundEnabled === false, 'Preferences updated');

    // Notification list rendered
    const notifList = await page.evaluate(() => !!document.getElementById('mn-notif-list'));
    assert(notifList, 'Notification list rendered');

    const notifItems = await page.evaluate(() => document.querySelectorAll('.mn-notif-item').length);
    assert(notifItems > 0, `${notifItems} notification items rendered`);

    // === AC2: Quick actions ===
    console.log('\n=== AC2: Quick actions ===');

    const actions = await page.evaluate(() => window.mobileNotifications.getQuickActions());
    assert(actions.length > 0, `${actions.length} quick actions`);
    assert(actions.length === 6, 'Has 6 quick actions');

    const firstAction = actions[0];
    assert(firstAction.id !== undefined, 'Action has id');
    assert(firstAction.name !== undefined, `Name: ${firstAction.name}`);
    assert(firstAction.icon !== undefined, 'Has icon');
    assert(firstAction.action !== undefined, `Action: ${firstAction.action}`);
    assert(firstAction.description !== undefined, 'Has description');
    assert(firstAction.enabled !== undefined, `Enabled: ${firstAction.enabled}`);

    // Execute quick action
    const execResult = await page.evaluate((id) => window.mobileNotifications.executeQuickAction(id), firstAction.id);
    assert(execResult !== null, 'Action executed');
    assert(execResult.success === true, 'Execution successful');
    assert(execResult.executedAt !== undefined, 'Has executedAt');
    assert(execResult.message !== undefined, 'Has message');

    // Disabled action returns null
    const disabledAction = actions.find(a => !a.enabled);
    if (disabledAction) {
      const disabledResult = await page.evaluate((id) => window.mobileNotifications.executeQuickAction(id), disabledAction.id);
      assert(disabledResult === null, 'Disabled action returns null');
    }

    // Switch to actions tab
    await page.evaluate(() => window.mobileNotifications.setTab('actions'));
    await new Promise(r => setTimeout(r, 300));

    const actionsTabActive = await page.evaluate(() => {
      return document.querySelector('.mn-tab[data-tab="actions"]').classList.contains('active');
    });
    assert(actionsTabActive, 'Quick Actions tab becomes active');

    const actionsSection = await page.evaluate(() => !!document.getElementById('mn-actions-section'));
    assert(actionsSection, 'Actions section rendered');

    const actionItems = await page.evaluate(() => document.querySelectorAll('.mn-action-item').length);
    assert(actionItems > 0, `${actionItems} action items rendered`);

    // === AC3: Status overview ===
    console.log('\n=== AC3: Status overview ===');

    const overview = await page.evaluate(() => window.mobileNotifications.getStatusOverview());
    assert(overview.length > 0, `${overview.length} status items`);
    assert(overview.length === 6, 'Has 6 status items');

    const firstStatus = overview[0];
    assert(firstStatus.id !== undefined, 'Status has id');
    assert(firstStatus.name !== undefined, `Name: ${firstStatus.name}`);
    assert(firstStatus.status !== undefined, `Status: ${firstStatus.status}`);
    assert(firstStatus.value !== undefined, `Value: ${firstStatus.value}`);
    assert(firstStatus.icon !== undefined, 'Has icon');

    // Status types
    const statuses = new Set(overview.map(o => o.status));
    assert(statuses.has('good'), 'Has good status');
    assert(statuses.has('warning'), 'Has warning status');

    // Switch to overview tab
    await page.evaluate(() => window.mobileNotifications.setTab('overview'));
    await new Promise(r => setTimeout(r, 300));

    const overviewTabActive = await page.evaluate(() => {
      return document.querySelector('.mn-tab[data-tab="overview"]').classList.contains('active');
    });
    assert(overviewTabActive, 'Status Overview tab becomes active');

    const overviewSection = await page.evaluate(() => !!document.getElementById('mn-overview-section'));
    assert(overviewSection, 'Overview section rendered');

    const overviewItems = await page.evaluate(() => document.querySelectorAll('.mn-overview-item').length);
    assert(overviewItems > 0, `${overviewItems} overview items rendered`);

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.mobileNotifications.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.notificationCount > 0, `Notifications: ${stateObj.notificationCount}`);
    assert(stateObj.unreadCount >= 0, `Unread: ${stateObj.unreadCount}`);
    assert(stateObj.preferences !== undefined, 'State has preferences');

    const savedState = await page.evaluate(() => localStorage.getItem('mobile-notifications-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-091: Mobile App Notifications - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
