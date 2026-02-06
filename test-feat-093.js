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

    const hasAPI = await page.evaluate(() => typeof window.smartPrioritization === 'object');
    assert(hasAPI, 'smartPrioritization API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('smart-priority-card'));
    assert(hasCard, 'Smart priority card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.sp-tab').length === 3);
    assert(hasTabs, 'Three tabs exist');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.sp-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Analyze dependencies ===
    console.log('\n=== AC1: Analyze dependencies ===');

    const deps = await page.evaluate(() => window.smartPrioritization.getDependencies());
    assert(deps.length > 0, `${deps.length} dependencies`);
    assert(deps.length === 8, 'Has 8 dependencies');

    const firstDep = deps[0];
    assert(firstDep.id !== undefined, 'Dependency has id');
    assert(firstDep.featureId !== undefined, `Feature: ${firstDep.featureId}`);
    assert(firstDep.dependsOn.length > 0, `Depends on: ${firstDep.dependsOn.join(', ')}`);
    assert(firstDep.type !== undefined, `Type: ${firstDep.type}`);
    assert(firstDep.description !== undefined, 'Has description');

    // Dependency types
    const types = new Set(deps.map(d => d.type));
    assert(types.has('hard'), 'Has hard dependencies');
    assert(types.has('soft'), 'Has soft dependencies');

    // Get feature-specific dependencies
    const featureDeps = await page.evaluate(() => window.smartPrioritization.getFeatureDependencies('feat-093'));
    assert(featureDeps.length > 0, `feat-093 has ${featureDeps.length} dependencies`);

    // Get dependents of a feature
    const dependents = await page.evaluate(() => window.smartPrioritization.getDependentsOf('feat-092'));
    assert(dependents.length > 0, `${dependents.length} features depend on feat-092`);

    // Dependency list rendered
    const depList = await page.evaluate(() => !!document.getElementById('sp-dep-list'));
    assert(depList, 'Dependency list rendered');

    const depItems = await page.evaluate(() => document.querySelectorAll('.sp-dep-item').length);
    assert(depItems > 0, `${depItems} dependency items rendered`);

    // === AC2: Suggest optimal order ===
    console.log('\n=== AC2: Suggest optimal order ===');

    const order = await page.evaluate(() => window.smartPrioritization.getSuggestedOrder());
    assert(order.length > 0, `${order.length} suggested features`);
    assert(order.length === 8, 'Has 8 suggested features');

    const firstOrder = order[0];
    assert(firstOrder.rank === 1, `Top ranked: #${firstOrder.rank}`);
    assert(firstOrder.featureId !== undefined, `Feature: ${firstOrder.featureId}`);
    assert(firstOrder.name !== undefined, `Name: ${firstOrder.name}`);
    assert(firstOrder.score > 0, `Score: ${firstOrder.score}`);
    assert(firstOrder.reason !== undefined, 'Has reason');
    assert(firstOrder.complexity !== undefined, `Complexity: ${firstOrder.complexity}`);
    assert(firstOrder.category !== undefined, `Category: ${firstOrder.category}`);

    // Scores should be in descending order
    const scoresDesc = order.every((o, i) => i === 0 || o.score <= order[i - 1].score);
    assert(scoresDesc, 'Scores in descending order');

    // Stats
    const stats = await page.evaluate(() => window.smartPrioritization.getPrioritizationStats());
    assert(stats.totalFeatures > 0, `Total features: ${stats.totalFeatures}`);
    assert(stats.avgScore > 0, `Avg score: ${stats.avgScore}`);
    assert(stats.highComplexity >= 0, `High complexity: ${stats.highComplexity}`);
    assert(stats.dependencyCount > 0, `Dependencies: ${stats.dependencyCount}`);

    // Switch to order tab
    await page.evaluate(() => window.smartPrioritization.setTab('order'));
    await new Promise(r => setTimeout(r, 300));

    const orderTabActive = await page.evaluate(() => {
      return document.querySelector('.sp-tab[data-tab="order"]').classList.contains('active');
    });
    assert(orderTabActive, 'Suggested Order tab becomes active');

    const orderSection = await page.evaluate(() => !!document.getElementById('sp-order-section'));
    assert(orderSection, 'Order section rendered');

    const orderItems = await page.evaluate(() => document.querySelectorAll('.sp-order-item').length);
    assert(orderItems > 0, `${orderItems} order items rendered`);

    // === AC3: Consider complexity ===
    console.log('\n=== AC3: Consider complexity ===');

    const complexity = await page.evaluate(() => window.smartPrioritization.getComplexityAnalysis());
    assert(complexity.length > 0, `${complexity.length} complexity entries`);
    assert(complexity.length === 8, 'Has 8 complexity entries');

    const firstComp = complexity[0];
    assert(firstComp.featureId !== undefined, `Feature: ${firstComp.featureId}`);
    assert(firstComp.name !== undefined, `Name: ${firstComp.name}`);
    assert(firstComp.complexity !== undefined, `Complexity: ${firstComp.complexity}`);
    assert(firstComp.score > 0, `Score: ${firstComp.score}/10`);
    assert(firstComp.factors !== undefined, 'Has factors');
    assert(firstComp.factors.codeChanges > 0, `Code changes: ${firstComp.factors.codeChanges}`);
    assert(firstComp.factors.dependencies > 0, `Dependencies: ${firstComp.factors.dependencies}`);
    assert(firstComp.factors.riskLevel > 0, `Risk: ${firstComp.factors.riskLevel}`);
    assert(firstComp.factors.testingEffort > 0, `Testing: ${firstComp.factors.testingEffort}`);
    assert(firstComp.estimatedFiles > 0, `Files: ${firstComp.estimatedFiles}`);

    // Complexity levels
    const levels = new Set(complexity.map(c => c.complexity));
    assert(levels.has('medium'), 'Has medium complexity');
    assert(levels.has('high'), 'Has high complexity');

    // Get specific feature complexity
    const specificComp = await page.evaluate(() => window.smartPrioritization.getComplexityForFeature('feat-093'));
    assert(specificComp !== null, 'Can get specific complexity');

    // Switch to complexity tab
    await page.evaluate(() => window.smartPrioritization.setTab('complexity'));
    await new Promise(r => setTimeout(r, 300));

    const compTabActive = await page.evaluate(() => {
      return document.querySelector('.sp-tab[data-tab="complexity"]').classList.contains('active');
    });
    assert(compTabActive, 'Complexity tab becomes active');

    const compSection = await page.evaluate(() => !!document.getElementById('sp-complexity-section'));
    assert(compSection, 'Complexity section rendered');

    const compItems = await page.evaluate(() => document.querySelectorAll('.sp-complexity-item').length);
    assert(compItems > 0, `${compItems} complexity items rendered`);

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.smartPrioritization.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.dependencyCount > 0, `Dependencies: ${stateObj.dependencyCount}`);
    assert(stateObj.suggestedCount > 0, `Suggested: ${stateObj.suggestedCount}`);
    assert(stateObj.avgScore > 0, `Avg score: ${stateObj.avgScore}`);

    const savedState = await page.evaluate(() => localStorage.getItem('smart-priority-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-093: Smart Feature Prioritization - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
