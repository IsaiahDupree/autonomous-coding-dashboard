const puppeteer = require('puppeteer');
(async () => {
  let passed = 0, failed = 0; const results = [];
  function assert(c, m) { if (c) { passed++; results.push(`  ✓ ${m}`); } else { failed++; results.push(`  ✗ ${m}`); } }
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], protocolTimeout: 60000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof window.dockerSupport === 'object', { timeout: 30000 });

    assert(await page.evaluate(() => typeof window.dockerSupport === 'object'), 'API exists');
    assert(await page.evaluate(() => !!document.getElementById('docker-support-card')), 'Card rendered');

    // Services
    const services = await page.evaluate(() => window.dockerSupport.getServices());
    assert(Array.isArray(services) && services.length >= 4, `${services.length} services`);
    assert(services.some(s => s.id === 'svc-postgres'), 'PostgreSQL service');
    assert(services.some(s => s.id === 'svc-redis'), 'Redis service');
    assert(services.some(s => s.id === 'svc-backend'), 'Backend service');
    const svc = services[0];
    assert(svc.id !== undefined, `Service id: ${svc.id}`);
    assert(svc.name !== undefined, `Service name: ${svc.name}`);
    assert(svc.image !== undefined, `Service image: ${svc.image}`);
    assert(svc.ports !== undefined, `Service ports: ${svc.ports}`);
    assert(svc.status !== undefined, `Service status: ${svc.status}`);

    // Get service
    const postgres = await page.evaluate(() => window.dockerSupport.getService('svc-postgres'));
    assert(postgres !== null, 'Get service by id');
    assert(postgres.name === 'PostgreSQL', `Service name: ${postgres.name}`);

    // State
    const state = await page.evaluate(() => window.dockerSupport.getState());
    assert(state.services >= 4, `Service count: ${state.services}`);
    assert(state.upServices >= 3, `Up services: ${state.upServices}`);

    // Docker files
    const compose = await page.evaluate(() => window.dockerSupport.getDockerCompose());
    assert(typeof compose === 'string' && compose.includes('services:'), 'Docker Compose content valid');
    assert(compose.includes('postgres'), 'Compose has postgres');
    assert(compose.includes('redis'), 'Compose has redis');

    const dockerfile = await page.evaluate(() => window.dockerSupport.getDockerfile());
    assert(typeof dockerfile === 'string' && dockerfile.includes('FROM node'), 'Dockerfile content valid');
    assert(dockerfile.includes('EXPOSE'), 'Dockerfile has EXPOSE');

    // Env vars
    const envVars = await page.evaluate(() => window.dockerSupport.getEnvVars());
    assert(Array.isArray(envVars) && envVars.length >= 4, `${envVars.length} env vars`);
    assert(envVars.some(e => e.key === 'ANTHROPIC_API_KEY'), 'ANTHROPIC_API_KEY listed');
    assert(envVars.some(e => e.key === 'DATABASE_URL'), 'DATABASE_URL listed');
    assert(envVars[0].required !== undefined, 'Env var has required field');

    // Tab navigation
    await page.evaluate(() => window.dockerSupport.setTab('compose'));
    await new Promise(r => setTimeout(r, 200));
    assert(await page.evaluate(() => !!document.querySelector('.ds-code-block')), 'Code block shown');

    await page.evaluate(() => window.dockerSupport.setTab('env'));
    await new Promise(r => setTimeout(r, 200));
    assert(await page.evaluate(() => document.querySelectorAll('.ds-env-item').length >= 4), 'Env items shown');

  } catch (err) { failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-118: Docker Deployment Support - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
