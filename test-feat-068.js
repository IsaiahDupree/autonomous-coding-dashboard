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

    const hasAPI = await page.evaluate(() => typeof window.costBreakdown === 'object');
    assert(hasAPI, 'costBreakdown API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('cost-breakdown-card'));
    assert(hasCard, 'Cost breakdown card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.cb-tab').length === 3);
    assert(hasTabs, 'Three tabs exist (Per Feature, Category, Optimization)');

    // === AC1: Track API costs per feature ===
    console.log('\n=== AC1: Track API costs per feature ===');

    const featureCosts = await page.evaluate(() => window.costBreakdown.getFeatureCosts());
    assert(featureCosts.length > 0, `${featureCosts.length} feature costs calculated`);

    // Each cost has required fields
    const firstCost = featureCosts[0];
    assert(firstCost.featureId !== undefined, 'Cost has featureId');
    assert(firstCost.inputTokens !== undefined, 'Cost has inputTokens');
    assert(firstCost.outputTokens !== undefined, 'Cost has outputTokens');
    assert(firstCost.inputCost !== undefined, 'Cost has inputCost');
    assert(firstCost.outputCost !== undefined, 'Cost has outputCost');
    assert(firstCost.totalCost !== undefined, 'Cost has totalCost');
    assert(firstCost.category !== undefined, 'Cost has category');

    // Total cost is positive
    const totalCost = await page.evaluate(() => window.costBreakdown.getTotalCost());
    assert(totalCost > 0, `Total cost is $${totalCost}`);

    // Get cost for specific feature
    const feat001Cost = await page.evaluate(() => window.costBreakdown.getFeatureCost('feat-001'));
    assert(feat001Cost !== null, 'Can get cost for specific feature');
    assert(feat001Cost.totalCost > 0, `feat-001 cost: $${feat001Cost.totalCost}`);

    // Costs are sorted by default (cost-desc)
    const sorted = await page.evaluate(() => {
      const costs = window.costBreakdown.getFeatureCosts();
      for (let i = 1; i < costs.length; i++) {
        if (costs[i].totalCost > costs[i-1].totalCost) return false;
      }
      return true;
    });
    assert(sorted, 'Feature costs sorted by cost descending');

    // Sort by name
    const sortedByName = await page.evaluate(() => {
      const costs = window.costBreakdown.getFeatureCosts('name-asc');
      return costs[0].featureId.localeCompare(costs[1].featureId) <= 0;
    });
    assert(sortedByName, 'Can sort by feature name');

    // Feature table rendered
    const hasTable = await page.evaluate(() => !!document.getElementById('cb-feature-table'));
    assert(hasTable, 'Feature cost table rendered');

    const tableRows = await page.evaluate(() => {
      return document.querySelectorAll('.cb-row').length;
    });
    assert(tableRows > 0, `${tableRows} rows in feature table`);

    // Sort select exists
    const hasSortSelect = await page.$('#cb-sort');
    assert(hasSortSelect !== null, 'Sort select control exists');

    // Cost bars rendered
    const costBars = await page.evaluate(() => document.querySelectorAll('.cb-cost-bar').length);
    assert(costBars > 0, `${costBars} cost bars rendered`);

    // === AC2: Category breakdown ===
    console.log('\n=== AC2: Category breakdown ===');

    const categories = await page.evaluate(() => window.costBreakdown.getCategoryBreakdown());
    assert(categories.length > 0, `${categories.length} categories`);

    // Category has required fields
    const firstCat = categories[0];
    assert(firstCat.name !== undefined, 'Category has name');
    assert(firstCat.totalCost !== undefined, 'Category has totalCost');
    assert(firstCat.featureCount !== undefined, 'Category has featureCount');
    assert(firstCat.inputTokens !== undefined, 'Category has inputTokens');
    assert(firstCat.outputTokens !== undefined, 'Category has outputTokens');

    // Categories sorted by cost
    const catSorted = await page.evaluate(() => {
      const cats = window.costBreakdown.getCategoryBreakdown();
      for (let i = 1; i < cats.length; i++) {
        if (cats[i].totalCost > cats[i-1].totalCost) return false;
      }
      return true;
    });
    assert(catSorted, 'Categories sorted by cost descending');

    // Switch to category tab
    await page.evaluate(() => window.costBreakdown.setTab('category'));
    await new Promise(r => setTimeout(r, 300));

    const catTabActive = await page.evaluate(() => {
      return document.querySelector('.cb-tab[data-tab="category"]').classList.contains('active');
    });
    assert(catTabActive, 'Category tab becomes active');

    const catGrid = await page.evaluate(() => !!document.getElementById('cb-category-grid'));
    assert(catGrid, 'Category grid rendered');

    const catCards = await page.evaluate(() => document.querySelectorAll('.cb-category-card').length);
    assert(catCards > 0, `${catCards} category cards rendered`);

    // Category cost values shown
    const catCostShown = await page.evaluate(() => {
      return document.querySelector('.cb-category-cost').textContent.includes('$');
    });
    assert(catCostShown, 'Category cost values displayed');

    // === AC3: Optimization suggestions ===
    console.log('\n=== AC3: Optimization suggestions ===');

    const suggestions = await page.evaluate(() => window.costBreakdown.getOptimizationSuggestions());
    assert(suggestions.length > 0, `${suggestions.length} optimization suggestions`);

    // Suggestion has required fields
    const firstSug = suggestions[0];
    assert(firstSug.id !== undefined, 'Suggestion has id');
    assert(firstSug.type !== undefined, 'Suggestion has type');
    assert(firstSug.title !== undefined, 'Suggestion has title');
    assert(firstSug.description !== undefined, 'Suggestion has description');
    assert(firstSug.savings !== undefined, 'Suggestion has savings amount');

    // Types are valid
    const validTypes = ['high', 'medium', 'low'];
    const allValidTypes = suggestions.every(s => validTypes.includes(s.type));
    assert(allValidTypes, 'All suggestion types are valid (high/medium/low)');

    // Switch to optimization tab
    await page.evaluate(() => window.costBreakdown.setTab('optimize'));
    await new Promise(r => setTimeout(r, 300));

    const optTabActive = await page.evaluate(() => {
      return document.querySelector('.cb-tab[data-tab="optimize"]').classList.contains('active');
    });
    assert(optTabActive, 'Optimization tab becomes active');

    const sugCards = await page.evaluate(() => document.querySelectorAll('.cb-suggestion').length);
    assert(sugCards > 0, `${sugCards} suggestion cards rendered`);

    // Savings shown
    const savingsShown = await page.evaluate(() => {
      return document.querySelector('.cb-suggestion-savings').textContent.includes('$');
    });
    assert(savingsShown, 'Savings amounts displayed');

    // === State and General ===
    console.log('\n=== State and General ===');

    const stateObj = await page.evaluate(() => window.costBreakdown.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.sortBy !== undefined, 'State has sortBy');

    // Switch back to per-feature
    await page.evaluate(() => window.costBreakdown.setTab('per-feature'));
    await new Promise(r => setTimeout(r, 200));

    const backToFeature = await page.evaluate(() => {
      return document.querySelector('.cb-tab[data-tab="per-feature"]').classList.contains('active');
    });
    assert(backToFeature, 'Can switch back to per-feature tab');

    // State persistence
    const savedState = await page.evaluate(() => localStorage.getItem('cost-breakdown-config') !== null);
    assert(savedState, 'State persisted to localStorage');

    // Total display
    const totalDisplay = await page.evaluate(() => {
      return document.querySelector('.cb-total').textContent.includes('$');
    });
    assert(totalDisplay, 'Total cost displayed in header');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-068: Cost per Feature Breakdown - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
