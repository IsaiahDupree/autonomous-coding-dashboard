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

    const hasAPI = await page.evaluate(() => typeof window.autoBackups === 'object');
    assert(hasAPI, 'autoBackups API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('auto-backups-card'));
    assert(hasCard, 'Auto backups card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.ab-tab').length === 3);
    assert(hasTabs, 'Three tabs exist (Backups, Schedules, Retention)');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.ab-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Scheduled backups ===
    console.log('\n=== AC1: Scheduled backups ===');

    const backups = await page.evaluate(() => window.autoBackups.getBackups());
    assert(backups.length > 0, `${backups.length} backups`);
    assert(backups.length === 8, 'Has 8 backups');

    const first = backups[0];
    assert(first.id !== undefined, 'Backup has id');
    assert(first.name !== undefined, `Name: ${first.name}`);
    assert(first.type !== undefined, `Type: ${first.type}`);
    assert(first.status !== undefined, `Status: ${first.status}`);
    assert(first.size !== undefined, `Size: ${first.size}`);
    assert(first.createdAt !== undefined, 'Has createdAt');
    assert(first.schedule !== undefined, `Schedule: ${first.schedule}`);
    assert(first.tables >= 0, `Tables: ${first.tables}`);
    assert(first.records >= 0, `Records: ${first.records}`);

    // Filter by status
    const completed = await page.evaluate(() => window.autoBackups.getBackups({ status: 'completed' }));
    assert(completed.length > 0, `${completed.length} completed backups`);
    const allCompleted = completed.every(b => b.status === 'completed');
    assert(allCompleted, 'All filtered are completed');

    // Filter by type
    const fullBackups = await page.evaluate(() => window.autoBackups.getBackups({ type: 'full' }));
    assert(fullBackups.length > 0, `${fullBackups.length} full backups`);

    // Get specific backup
    const specific = await page.evaluate((id) => window.autoBackups.getBackup(id), first.id);
    assert(specific !== null, 'Can retrieve specific backup');

    // Create backup
    const newId = await page.evaluate(() => window.autoBackups.createBackup('Test Backup', 'full'));
    assert(newId !== undefined, `New backup created: ${newId}`);
    const afterCreate = await page.evaluate(() => window.autoBackups.getBackups());
    assert(afterCreate.length === 9, 'Backup count increased to 9');

    // Delete backup
    const deleted = await page.evaluate((id) => window.autoBackups.deleteBackup(id), newId);
    assert(deleted === true, 'deleteBackup returns true');
    const afterDelete = await page.evaluate(() => window.autoBackups.getBackups());
    assert(afterDelete.length === 8, 'Backup count back to 8');

    // Schedules
    const schedules = await page.evaluate(() => window.autoBackups.getSchedules());
    assert(schedules.length > 0, `${schedules.length} schedules`);
    assert(schedules.length === 4, 'Has 4 schedules');

    const firstSch = schedules[0];
    assert(firstSch.id !== undefined, 'Schedule has id');
    assert(firstSch.name !== undefined, `Schedule: ${firstSch.name}`);
    assert(firstSch.frequency !== undefined, `Frequency: ${firstSch.frequency}`);
    assert(firstSch.type !== undefined, `Type: ${firstSch.type}`);
    assert(firstSch.enabled !== undefined, `Enabled: ${firstSch.enabled}`);
    assert(firstSch.nextRun !== undefined, 'Has nextRun');
    assert(firstSch.retention > 0, `Retention: ${firstSch.retention}`);

    // Get specific schedule
    const specificSch = await page.evaluate((id) => window.autoBackups.getSchedule(id), firstSch.id);
    assert(specificSch !== null, 'Can retrieve specific schedule');

    // Create schedule
    const newSchId = await page.evaluate(() => window.autoBackups.createSchedule('Test Schedule', 'daily', 'incremental'));
    assert(newSchId !== undefined, `New schedule created: ${newSchId}`);

    // Update schedule
    const updated = await page.evaluate((id) => window.autoBackups.updateSchedule(id, { retention: 60 }), newSchId);
    assert(updated === true, 'updateSchedule returns true');

    // Toggle schedule
    const toggled = await page.evaluate((id) => window.autoBackups.toggleSchedule(id), newSchId);
    assert(toggled === false, 'Toggle disabled schedule');

    // Delete schedule
    const schDeleted = await page.evaluate((id) => window.autoBackups.deleteSchedule(id), newSchId);
    assert(schDeleted === true, 'deleteSchedule returns true');
    const afterSchDelete = await page.evaluate(() => window.autoBackups.getSchedules());
    assert(afterSchDelete.length === 4, 'Schedule count back to 4');

    // Backup list rendered
    const backupList = await page.evaluate(() => !!document.getElementById('ab-backup-list'));
    assert(backupList, 'Backup list rendered');

    const backupItems = await page.evaluate(() => document.querySelectorAll('.ab-backup-item').length);
    assert(backupItems > 0, `${backupItems} backup items rendered`);

    // Switch to schedules tab
    await page.evaluate(() => window.autoBackups.setTab('schedules'));
    await new Promise(r => setTimeout(r, 300));

    const schTabActive = await page.evaluate(() => {
      return document.querySelector('.ab-tab[data-tab="schedules"]').classList.contains('active');
    });
    assert(schTabActive, 'Schedules tab becomes active');

    const schList = await page.evaluate(() => !!document.getElementById('ab-schedule-list'));
    assert(schList, 'Schedule list rendered');

    const schItems = await page.evaluate(() => document.querySelectorAll('.ab-schedule-item').length);
    assert(schItems > 0, `${schItems} schedule items rendered`);

    // === AC2: Retention policy ===
    console.log('\n=== AC2: Retention policy ===');

    const policy = await page.evaluate(() => window.autoBackups.getRetentionPolicy());
    assert(policy.maxBackups > 0, `Max backups: ${policy.maxBackups}`);
    assert(policy.maxAge > 0, `Max age: ${policy.maxAge} days`);
    assert(policy.maxStorage !== undefined, `Max storage: ${policy.maxStorage}`);
    assert(policy.keepMinimum > 0, `Keep minimum: ${policy.keepMinimum}`);
    assert(policy.autoCleanup !== undefined, `Auto cleanup: ${policy.autoCleanup}`);
    assert(policy.rules.length > 0, `${policy.rules.length} retention rules`);

    const firstRule = policy.rules[0];
    assert(firstRule.type !== undefined, `Rule type: ${firstRule.type}`);
    assert(firstRule.keepCount > 0, `Keep count: ${firstRule.keepCount}`);
    assert(firstRule.maxAgeDays > 0, `Max age days: ${firstRule.maxAgeDays}`);

    // Update retention policy
    const updatedPolicy = await page.evaluate(() => window.autoBackups.updateRetentionPolicy({ maxBackups: 100 }));
    assert(updatedPolicy.maxBackups === 100, 'Retention policy updated to 100 max backups');

    // Switch to retention tab
    await page.evaluate(() => window.autoBackups.setTab('retention'));
    await new Promise(r => setTimeout(r, 300));

    const retTabActive = await page.evaluate(() => {
      return document.querySelector('.ab-tab[data-tab="retention"]').classList.contains('active');
    });
    assert(retTabActive, 'Retention tab becomes active');

    const retSection = await page.evaluate(() => !!document.getElementById('ab-retention-section'));
    assert(retSection, 'Retention section rendered');

    const retItems = await page.evaluate(() => document.querySelectorAll('.ab-retention-item').length);
    assert(retItems > 0, `${retItems} retention items rendered`);

    // === AC3: Restore functionality ===
    console.log('\n=== AC3: Restore functionality ===');

    const completedBackups = await page.evaluate(() => window.autoBackups.getBackups({ status: 'completed' }));
    assert(completedBackups.length > 0, 'Has completed backups to restore');

    const restoreResult = await page.evaluate((id) => window.autoBackups.restoreBackup(id), completedBackups[0].id);
    assert(restoreResult !== null, 'restoreBackup returns result');
    assert(restoreResult.success === true, 'Restore was successful');
    assert(restoreResult.backupId === completedBackups[0].id, 'Correct backup restored');
    assert(restoreResult.restoredAt !== undefined, 'Has restoredAt timestamp');
    assert(restoreResult.tables > 0, `Restored ${restoreResult.tables} tables`);
    assert(restoreResult.records > 0, `Restored ${restoreResult.records} records`);
    assert(restoreResult.duration > 0, `Duration: ${restoreResult.duration}ms`);

    // Cannot restore failed backup
    const failedBackups = await page.evaluate(() => window.autoBackups.getBackups({ status: 'failed' }));
    if (failedBackups.length > 0) {
      const failRestore = await page.evaluate((id) => window.autoBackups.restoreBackup(id), failedBackups[0].id);
      assert(failRestore === null, 'Cannot restore failed backup');
    }

    // Backup stats
    const stats = await page.evaluate(() => window.autoBackups.getBackupStats());
    assert(stats.totalBackups > 0, `Total: ${stats.totalBackups}`);
    assert(stats.completedBackups > 0, `Completed: ${stats.completedBackups}`);
    assert(stats.scheduleCount > 0, `Schedules: ${stats.scheduleCount}`);
    assert(stats.activeSchedules > 0, `Active: ${stats.activeSchedules}`);

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.autoBackups.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.backupCount > 0, `State tracks ${stateObj.backupCount} backups`);
    assert(stateObj.scheduleCount > 0, `State tracks ${stateObj.scheduleCount} schedules`);
    assert(stateObj.retentionPolicy !== undefined, 'State has retention policy');

    const savedState = await page.evaluate(() => localStorage.getItem('auto-backups-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-087: Automatic Database Backups - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
