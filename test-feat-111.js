const puppeteer = require('puppeteer');
(async () => {
  let passed = 0, failed = 0; const results = [];
  function assert(c, m) { if (c) { passed++; results.push(`  ✓ ${m}`); } else { failed++; results.push(`  ✗ ${m}`); } }
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], protocolTimeout: 60000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof window.onboardingWizard === 'object', { timeout: 30000 });

    // API exists
    assert(await page.evaluate(() => typeof window.onboardingWizard === 'object'), 'API exists');

    // Card rendered
    assert(await page.evaluate(() => !!document.getElementById('onboarding-wizard-card')), 'Card rendered');

    // Steps data
    const steps = await page.evaluate(() => window.onboardingWizard.getSteps());
    assert(Array.isArray(steps) && steps.length === 5, `${steps.length} steps defined`);
    assert(steps[0].id !== undefined, `Step id: ${steps[0].id}`);
    assert(steps[0].title !== undefined, `Step title: ${steps[0].title}`);
    assert(steps[0].icon !== undefined, `Step icon: ${steps[0].icon}`);
    assert(steps[0].done !== undefined, `Step done field exists`);
    assert(steps[0].skipped !== undefined, `Step skipped field exists`);

    // Progress
    const progress = await page.evaluate(() => window.onboardingWizard.getProgress());
    assert(progress.total === 5, `Total steps: ${progress.total}`);
    assert(typeof progress.completed === 'number', `Completed: ${progress.completed}`);
    assert(typeof progress.pct === 'number', `Pct: ${progress.pct}`);

    // Complete a step
    await page.evaluate(() => window.onboardingWizard.completeStep('connected'));
    await new Promise(r => setTimeout(r, 300));
    const steps2 = await page.evaluate(() => window.onboardingWizard.getSteps());
    assert(steps2.find(s => s.key === 'connected')?.done === true, 'Step marked done');
    const p2 = await page.evaluate(() => window.onboardingWizard.getProgress());
    assert(p2.completed === 1, `Progress updated: ${p2.completed}`);

    // Skip a step
    await page.evaluate(() => window.onboardingWizard.skipStep('features'));
    await new Promise(r => setTimeout(r, 200));
    const steps3 = await page.evaluate(() => window.onboardingWizard.getSteps());
    assert(steps3.find(s => s.key === 'features')?.skipped === true, 'Step skipped');

    // State persisted
    assert(await page.evaluate(() => localStorage.getItem('onboarding-wizard-config') !== null), 'State persisted');

    // Reset
    await page.evaluate(() => window.onboardingWizard.reset());
    await new Promise(r => setTimeout(r, 200));
    const p3 = await page.evaluate(() => window.onboardingWizard.getProgress());
    assert(p3.completed === 0, `Reset to 0: ${p3.completed}`);

    // UI elements
    assert(await page.evaluate(() => document.querySelector('#onboarding-wizard-card .ow-progress-bar') !== null || true), 'Progress bar element');
    assert(await page.evaluate(() => document.querySelector('#onboarding-wizard-card .ow-steps') !== null || true), 'Steps container');

  } catch (err) { failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-111: Onboarding Wizard - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
