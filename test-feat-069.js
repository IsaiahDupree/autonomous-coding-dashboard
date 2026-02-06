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

    const hasAPI = await page.evaluate(() => typeof window.sessionEfficiency === 'object');
    assert(hasAPI, 'sessionEfficiency API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('session-efficiency-card'));
    assert(hasCard, 'Session efficiency card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.se-tab').length === 3);
    assert(hasTabs, 'Three tabs exist (Success Rates, Time/Feature, Error Patterns)');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.se-stat').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Success rate per session ===
    console.log('\n=== AC1: Success rate per session ===');

    const sessions = await page.evaluate(() => window.sessionEfficiency.getSessions());
    assert(sessions.length > 0, `${sessions.length} sessions`);

    // Session has required fields
    const firstSession = sessions[0];
    assert(firstSession.id !== undefined, 'Session has id');
    assert(firstSession.name !== undefined, 'Session has name');
    assert(firstSession.totalFeatures !== undefined, 'Session has totalFeatures');
    assert(firstSession.passedFeatures !== undefined, 'Session has passedFeatures');
    assert(firstSession.failedFeatures !== undefined, 'Session has failedFeatures');
    assert(firstSession.successRate !== undefined, 'Session has successRate');

    // Success rates
    const rates = await page.evaluate(() => window.sessionEfficiency.getSuccessRates());
    assert(rates.length > 0, `${rates.length} success rates`);
    assert(rates[0].successRate >= 0 && rates[0].successRate <= 100, 'Success rate in valid range');

    // Overall success rate
    const overall = await page.evaluate(() => window.sessionEfficiency.getOverallSuccessRate());
    assert(overall >= 0 && overall <= 100, `Overall success rate: ${overall}%`);

    // Get specific session
    const specific = await page.evaluate(() => window.sessionEfficiency.getSession('session-001'));
    assert(specific !== null, 'Can retrieve specific session');
    assert(specific.id === 'session-001', 'Retrieved correct session');

    // Session list rendered
    const sessionItems = await page.evaluate(() => document.querySelectorAll('.se-session-item').length);
    assert(sessionItems > 0, `${sessionItems} session items rendered`);

    // Success rate badges
    const rateBadges = await page.evaluate(() => document.querySelectorAll('.se-session-rate').length);
    assert(rateBadges > 0, `${rateBadges} success rate badges displayed`);

    // Efficiency score
    const score = await page.evaluate(() => window.sessionEfficiency.getEfficiencyScore());
    assert(score >= 0 && score <= 100, `Efficiency score: ${score}`);

    // Efficiency grade
    const grade = await page.evaluate(() => window.sessionEfficiency.getEfficiencyGrade());
    assert(grade.grade !== undefined, `Grade: ${grade.grade}`);
    assert(grade.label !== undefined, `Label: ${grade.label}`);
    assert(grade.class !== undefined, 'Grade has CSS class');

    // Summary badge rendered
    const hasBadge = await page.evaluate(() => !!document.querySelector('.se-summary-badge'));
    assert(hasBadge, 'Summary badge rendered');

    // === AC2: Average time per feature ===
    console.log('\n=== AC2: Average time per feature ===');

    const avgTime = await page.evaluate(() => window.sessionEfficiency.getAverageTimePerFeature());
    assert(avgTime > 0, `Average time per feature: ${avgTime}min`);

    const timeBySession = await page.evaluate(() => window.sessionEfficiency.getTimePerFeatureBySession());
    assert(timeBySession.length > 0, `${timeBySession.length} time entries`);
    assert(timeBySession[0].avgTimePerFeature > 0, 'Time entry has avgTimePerFeature');
    assert(timeBySession[0].sessionId !== undefined, 'Time entry has sessionId');
    assert(timeBySession[0].durationMinutes !== undefined, 'Time entry has durationMinutes');

    // Switch to time tab
    await page.evaluate(() => window.sessionEfficiency.setTab('time'));
    await new Promise(r => setTimeout(r, 300));

    const timeTabActive = await page.evaluate(() => {
      return document.querySelector('.se-tab[data-tab="time"]').classList.contains('active');
    });
    assert(timeTabActive, 'Time tab becomes active');

    const timeGrid = await page.evaluate(() => !!document.getElementById('se-time-grid'));
    assert(timeGrid, 'Time grid rendered');

    const timeCards = await page.evaluate(() => document.querySelectorAll('.se-time-card').length);
    assert(timeCards > 0, `${timeCards} time cards rendered`);

    // === AC3: Error patterns ===
    console.log('\n=== AC3: Error patterns ===');

    const errors = await page.evaluate(() => window.sessionEfficiency.getErrorPatterns());
    assert(errors.length > 0, `${errors.length} error patterns`);

    // Error has required fields
    const firstError = errors[0];
    assert(firstError.id !== undefined, 'Error has id');
    assert(firstError.type !== undefined, 'Error has type');
    assert(firstError.name !== undefined, 'Error has name');
    assert(firstError.description !== undefined, 'Error has description');
    assert(firstError.count !== undefined, 'Error has count');
    assert(firstError.trend !== undefined, 'Error has trend');

    // Valid types
    const validTypes = ['critical', 'warning', 'info'];
    const allValidTypes = errors.every(e => validTypes.includes(e.type));
    assert(allValidTypes, 'All error types are valid');

    // Get specific error pattern
    const specificError = await page.evaluate(() => window.sessionEfficiency.getErrorPattern('err-timeout'));
    assert(specificError !== null, 'Can retrieve specific error pattern');
    assert(specificError.name === 'Timeout Errors', 'Retrieved correct error');

    // Total errors
    const totalErrors = await page.evaluate(() => window.sessionEfficiency.getTotalErrors());
    assert(totalErrors > 0, `Total errors: ${totalErrors}`);

    // Switch to errors tab
    await page.evaluate(() => window.sessionEfficiency.setTab('errors'));
    await new Promise(r => setTimeout(r, 300));

    const errTabActive = await page.evaluate(() => {
      return document.querySelector('.se-tab[data-tab="errors"]').classList.contains('active');
    });
    assert(errTabActive, 'Errors tab becomes active');

    const errorList = await page.evaluate(() => !!document.getElementById('se-error-list'));
    assert(errorList, 'Error list rendered');

    const errorItems = await page.evaluate(() => document.querySelectorAll('.se-error-item').length);
    assert(errorItems > 0, `${errorItems} error items rendered`);

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.sessionEfficiency.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.sessionCount > 0, 'State tracks session count');

    // State persistence
    const savedState = await page.evaluate(() => localStorage.getItem('session-efficiency-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-069: Session Efficiency Metrics - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
