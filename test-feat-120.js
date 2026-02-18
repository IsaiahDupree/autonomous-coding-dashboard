const puppeteer = require('puppeteer');
(async () => {
  let passed = 0, failed = 0; const results = [];
  function assert(c, m) { if (c) { passed++; results.push(`  ✓ ${m}`); } else { failed++; results.push(`  ✗ ${m}`); } }
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], protocolTimeout: 60000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof window.selfHostedInstall === 'object', { timeout: 30000 });

    assert(await page.evaluate(() => typeof window.selfHostedInstall === 'object'), 'API exists');
    assert(await page.evaluate(() => !!document.getElementById('self-hosted-install-card')), 'Card rendered');

    // Prerequisites
    const prereqs = await page.evaluate(() => window.selfHostedInstall.getPrereqs());
    assert(Array.isArray(prereqs) && prereqs.length >= 4, `${prereqs.length} prerequisites`);
    assert(prereqs.some(p => p.id === 'node'), 'Node.js prerequisite');
    assert(prereqs.some(p => p.id === 'git'), 'Git prerequisite');
    assert(prereqs.some(p => p.id === 'postgres'), 'PostgreSQL prerequisite');
    const pr = prereqs[0];
    assert(pr.id !== undefined, `Prereq id: ${pr.id}`);
    assert(pr.name !== undefined, `Prereq name: ${pr.name}`);
    assert(pr.icon !== undefined, `Prereq icon: ${pr.icon}`);
    assert(pr.status !== undefined, `Prereq status: ${pr.status}`);
    assert(pr.ver !== undefined, `Prereq ver: ${pr.ver}`);

    // Get prereq
    const node = await page.evaluate(() => window.selfHostedInstall.getPrereq('node'));
    assert(node !== null, 'Get prereq by id');
    assert(node.name === 'Node.js', `Prereq name: ${node.name}`);

    // Install script
    const script = await page.evaluate(() => window.selfHostedInstall.getScript());
    assert(typeof script === 'string' && script.includes('#!/bin/bash'), 'Install script has bash shebang');
    assert(script.includes('npm install'), 'Script has npm install');
    assert(script.includes('prisma migrate'), 'Script has prisma migrate');
    assert(script.includes('ANTHROPIC'), 'Script mentions ANTHROPIC');

    // Manual steps
    const steps = await page.evaluate(() => window.selfHostedInstall.getManualSteps());
    assert(Array.isArray(steps) && steps.length >= 5, `${steps.length} manual steps`);
    const st = steps[0];
    assert(st.title !== undefined, `Step title: ${st.title}`);
    assert(st.desc !== undefined, `Step desc: ${st.desc}`);
    assert(st.cmd !== undefined, `Step cmd: ${st.cmd}`);
    assert(steps.some(s => s.cmd.includes('git clone')), 'Clone step exists');
    assert(steps.some(s => s.cmd.includes('npm install')), 'Install step exists');
    assert(steps.some(s => s.cmd.includes('prisma')), 'DB migration step exists');

    // State
    const state = await page.evaluate(() => window.selfHostedInstall.getState());
    assert(state.prereqCount >= 4, `Prereq count: ${state.prereqCount}`);
    assert(state.okCount >= 3, `OK count: ${state.okCount}`);
    assert(state.stepCount >= 5, `Step count: ${state.stepCount}`);

    // Tabs
    await page.evaluate(() => window.selfHostedInstall.setTab('script'));
    await new Promise(r => setTimeout(r, 200));
    assert(await page.evaluate(() => !!document.querySelector('.shi-code')), 'Code block shown');

    await page.evaluate(() => window.selfHostedInstall.setTab('manual'));
    await new Promise(r => setTimeout(r, 200));
    assert(await page.evaluate(() => document.querySelectorAll('.shi-step').length >= 5), 'Manual steps shown');

    await page.evaluate(() => window.selfHostedInstall.setTab('wizard'));
    await new Promise(r => setTimeout(r, 200));
    assert(await page.evaluate(() => !!document.getElementById('shi-port')), 'Wizard port input exists');
    assert(await page.evaluate(() => !!document.getElementById('shi-db')), 'Wizard DB input exists');

  } catch (err) { failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-120: Self-Hosted Installation Script - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
