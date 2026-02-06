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

    const hasAPI = await page.evaluate(() => typeof window.nlFeatureSearch === 'object');
    assert(hasAPI, 'nlFeatureSearch API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('nl-search-card'));
    assert(hasCard, 'NL search card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.nls-tab').length === 3);
    assert(hasTabs, 'Three tabs exist');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.nls-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    const hasInput = await page.evaluate(() => !!document.getElementById('nls-search-input'));
    assert(hasInput, 'Search input exists');

    const hasBtn = await page.evaluate(() => !!document.getElementById('nls-search-btn'));
    assert(hasBtn, 'Search button exists');

    // === AC1: Search features with natural language ===
    console.log('\n=== AC1: Search features ===');

    const featureIndex = await page.evaluate(() => window.nlFeatureSearch.getFeatureIndex());
    assert(featureIndex.length > 0, `${featureIndex.length} features in index`);
    assert(featureIndex.length === 16, 'Has 16 indexed features');

    const first = featureIndex[0];
    assert(first.id !== undefined, 'Feature has id');
    assert(first.name !== undefined, `Name: ${first.name}`);
    assert(first.category !== undefined, `Category: ${first.category}`);
    assert(first.description !== undefined, 'Has description');
    assert(first.tags !== undefined, 'Has tags');
    assert(first.status !== undefined, `Status: ${first.status}`);

    // Search for AI features
    const aiResults = await page.evaluate(() => window.nlFeatureSearch.search('AI powered features'));
    assert(aiResults.length > 0, `${aiResults.length} results for "AI powered features"`);

    const firstResult = aiResults[0];
    assert(firstResult.featureId !== undefined, 'Result has featureId');
    assert(firstResult.name !== undefined, `Name: ${firstResult.name}`);
    assert(firstResult.relevance > 0, `Relevance: ${firstResult.relevance}%`);
    assert(firstResult.matchedTerms !== undefined, 'Has matchedTerms');
    assert(firstResult.matchedTerms.length > 0, `Matched: ${firstResult.matchedTerms.join(', ')}`);
    assert(firstResult.category !== undefined, `Category: ${firstResult.category}`);
    assert(firstResult.description !== undefined, 'Has description');
    assert(firstResult.status !== undefined, `Status: ${firstResult.status}`);

    // Search for mobile
    const mobileResults = await page.evaluate(() => window.nlFeatureSearch.search('mobile responsive'));
    assert(mobileResults.length > 0, `${mobileResults.length} results for "mobile responsive"`);

    // Get specific result
    const specific = await page.evaluate((id) => window.nlFeatureSearch.getSearchResult(id), mobileResults[0].featureId);
    assert(specific !== null, 'Can retrieve specific search result');

    // Search for error handling
    const errorResults = await page.evaluate(() => window.nlFeatureSearch.search('error handling'));
    assert(errorResults.length > 0, `${errorResults.length} results for "error handling"`);

    // Empty search
    const emptyResults = await page.evaluate(() => window.nlFeatureSearch.search(''));
    assert(emptyResults.length === 0, 'Empty query returns no results');

    // Search again so results are rendered
    await page.evaluate(() => { window.nlFeatureSearch.search('AI features'); window.nlFeatureSearch.setTab('results'); });
    await new Promise(r => setTimeout(r, 300));

    // Results list rendered
    const resultsList = await page.evaluate(() => !!document.getElementById('nls-results-list'));
    assert(resultsList, 'Results list rendered');

    const resultItems = await page.evaluate(() => document.querySelectorAll('.nls-result-item').length);
    assert(resultItems > 0, `${resultItems} result items rendered`);

    // Search stats
    const stats = await page.evaluate(() => window.nlFeatureSearch.getSearchStats());
    assert(stats.totalFeatures > 0, `Total features: ${stats.totalFeatures}`);
    assert(stats.searchCount > 0, `Searches: ${stats.searchCount}`);
    assert(stats.avgResults >= 0, `Avg results: ${stats.avgResults}`);
    assert(stats.suggestionCount > 0, `Suggestions: ${stats.suggestionCount}`);

    // === AC2: Search history ===
    console.log('\n=== AC2: Search history ===');

    const history = await page.evaluate(() => window.nlFeatureSearch.getSearchHistory());
    assert(history.length > 0, `${history.length} history entries`);

    const firstHist = history[0];
    assert(firstHist.id !== undefined, 'History entry has id');
    assert(firstHist.query !== undefined, `Query: ${firstHist.query}`);
    assert(firstHist.resultCount >= 0, `Results: ${firstHist.resultCount}`);
    assert(firstHist.timestamp !== undefined, 'Has timestamp');

    // Switch to history tab
    await page.evaluate(() => window.nlFeatureSearch.setTab('history'));
    await new Promise(r => setTimeout(r, 300));

    const histTabActive = await page.evaluate(() => {
      return document.querySelector('.nls-tab[data-tab="history"]').classList.contains('active');
    });
    assert(histTabActive, 'History tab becomes active');

    const histSection = await page.evaluate(() => !!document.getElementById('nls-history-section'));
    assert(histSection, 'History section rendered');

    const histItems = await page.evaluate(() => document.querySelectorAll('.nls-history-item').length);
    assert(histItems > 0, `${histItems} history items rendered`);

    // === AC3: Search suggestions ===
    console.log('\n=== AC3: Search suggestions ===');

    const suggestions = await page.evaluate(() => window.nlFeatureSearch.getSuggestions());
    assert(suggestions.length > 0, `${suggestions.length} suggestions`);
    assert(suggestions.length === 8, 'Has 8 suggestions');

    const firstSug = suggestions[0];
    assert(firstSug.id !== undefined, 'Suggestion has id');
    assert(firstSug.text !== undefined, `Text: ${firstSug.text}`);
    assert(firstSug.category !== undefined, `Category: ${firstSug.category}`);
    assert(firstSug.description !== undefined, 'Has description');

    // Get specific suggestion
    const specificSug = await page.evaluate((id) => window.nlFeatureSearch.getSuggestion(id), firstSug.id);
    assert(specificSug !== null, 'Can retrieve specific suggestion');

    // Switch to suggestions tab
    await page.evaluate(() => window.nlFeatureSearch.setTab('suggestions'));
    await new Promise(r => setTimeout(r, 300));

    const sugTabActive = await page.evaluate(() => {
      return document.querySelector('.nls-tab[data-tab="suggestions"]').classList.contains('active');
    });
    assert(sugTabActive, 'Suggestions tab becomes active');

    const sugSection = await page.evaluate(() => !!document.getElementById('nls-suggestions-section'));
    assert(sugSection, 'Suggestions section rendered');

    const sugItems = await page.evaluate(() => document.querySelectorAll('.nls-suggestion-item').length);
    assert(sugItems > 0, `${sugItems} suggestion items rendered`);

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.nlFeatureSearch.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.totalFeatures > 0, `Features: ${stateObj.totalFeatures}`);
    assert(stateObj.searchCount > 0, `Searches: ${stateObj.searchCount}`);

    const savedState = await page.evaluate(() => localStorage.getItem('nl-search-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-095: Natural Language Feature Search - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
