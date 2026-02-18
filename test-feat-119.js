const puppeteer = require('puppeteer');
(async () => {
  let passed = 0, failed = 0; const results = [];
  function assert(c, m) { if (c) { passed++; results.push(`  ✓ ${m}`); } else { failed++; results.push(`  ✗ ${m}`); } }
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], protocolTimeout: 60000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof window.cloudDeployment === 'object', { timeout: 30000 });

    assert(await page.evaluate(() => typeof window.cloudDeployment === 'object'), 'API exists');
    assert(await page.evaluate(() => !!document.getElementById('cloud-deployment-card')), 'Card rendered');

    // Platforms
    const platforms = await page.evaluate(() => window.cloudDeployment.getPlatforms());
    assert(Array.isArray(platforms) && platforms.length >= 4, `${platforms.length} platforms`);
    assert(platforms.some(p => p.id === 'railway'), 'Railway platform');
    assert(platforms.some(p => p.id === 'render'), 'Render platform');
    assert(platforms.some(p => p.id === 'vercel'), 'Vercel platform');
    assert(platforms.some(p => p.id === 'fly'), 'Fly.io platform');

    const p = platforms[0];
    assert(p.id !== undefined, `Platform id: ${p.id}`);
    assert(p.name !== undefined, `Platform name: ${p.name}`);
    assert(p.icon !== undefined, `Platform icon: ${p.icon}`);
    assert(p.tagline !== undefined, `Platform tagline: ${p.tagline}`);
    assert(p.free !== undefined, `Platform free field: ${p.free}`);
    assert(p.deployUrl !== undefined, `Platform deployUrl: ${p.deployUrl}`);
    assert(Array.isArray(p.steps) && p.steps.length >= 2, `Platform steps: ${p.steps.length}`);

    // Get platform
    const railway = await page.evaluate(() => window.cloudDeployment.getPlatform('railway'));
    assert(railway !== null, 'Get platform by id');
    assert(railway.name === 'Railway', `Platform name: ${railway.name}`);

    // Select platform
    await page.evaluate(() => window.cloudDeployment.selectPlatform('railway'));
    await new Promise(r => setTimeout(r, 300));
    const state = await page.evaluate(() => window.cloudDeployment.getState());
    assert(state.selectedPlatform === 'railway', `Platform selected: ${state.selectedPlatform}`);

    // Config section appears after selection
    assert(await page.evaluate(() => !!document.querySelector('.cd-config-section')), 'Config section shown after selection');
    assert(await page.evaluate(() => !!document.querySelector('.cd-deploy-btn')), 'Deploy button shown');
    assert(await page.evaluate(() => !!document.querySelector('.cd-env-form')), 'Env form shown');

    // Deployments history
    const deployments = await page.evaluate(() => window.cloudDeployment.getRecentDeployments());
    assert(Array.isArray(deployments) && deployments.length >= 2, `${deployments.length} recent deployments`);
    assert(deployments[0].platform !== undefined, `Deployment platform: ${deployments[0].platform}`);
    assert(deployments[0].url !== undefined, `Deployment url: ${deployments[0].url}`);
    assert(deployments[0].status !== undefined, `Deployment status: ${deployments[0].status}`);

    // Platform cards rendered
    const platformCards = await page.evaluate(() => document.querySelectorAll('.cd-platform').length);
    assert(platformCards >= 4, `${platformCards} platform cards rendered`);

  } catch (err) { failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-119: One-Click Cloud Deployment - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
