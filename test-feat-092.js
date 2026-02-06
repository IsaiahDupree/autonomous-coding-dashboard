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

    const hasAPI = await page.evaluate(() => typeof window.aiErrorDiagnosis === 'object');
    assert(hasAPI, 'aiErrorDiagnosis API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('ai-error-diagnosis-card'));
    assert(hasCard, 'AI error diagnosis card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.aed-tab').length === 3);
    assert(hasTabs, 'Three tabs exist');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.aed-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Analyze error logs ===
    console.log('\n=== AC1: Analyze error logs ===');

    const errors = await page.evaluate(() => window.aiErrorDiagnosis.getErrors());
    assert(errors.length > 0, `${errors.length} errors`);
    assert(errors.length === 8, 'Has 8 errors');

    const first = errors[0];
    assert(first.id !== undefined, 'Error has id');
    assert(first.message !== undefined, 'Has message');
    assert(first.file !== undefined, `File: ${first.file}`);
    assert(first.line >= 0, `Line: ${first.line}`);
    assert(first.severity !== undefined, `Severity: ${first.severity}`);
    assert(first.category !== undefined, `Category: ${first.category}`);
    assert(first.timestamp !== undefined, 'Has timestamp');
    assert(first.occurrences > 0, `Occurrences: ${first.occurrences}`);
    assert(first.resolved !== undefined, `Resolved: ${first.resolved}`);

    // Filter by severity
    const critical = await page.evaluate(() => window.aiErrorDiagnosis.getErrors({ severity: 'critical' }));
    assert(critical.length > 0, `${critical.length} critical errors`);
    const allCritical = critical.every(e => e.severity === 'critical');
    assert(allCritical, 'All filtered are critical');

    // Filter by category
    const runtime = await page.evaluate(() => window.aiErrorDiagnosis.getErrors({ category: 'runtime' }));
    assert(runtime.length > 0, `${runtime.length} runtime errors`);

    // Filter by resolved
    const unresolved = await page.evaluate(() => window.aiErrorDiagnosis.getErrors({ resolved: false }));
    assert(unresolved.length > 0, `${unresolved.length} unresolved errors`);

    // Get specific error
    const specific = await page.evaluate((id) => window.aiErrorDiagnosis.getError(id), first.id);
    assert(specific !== null, 'Can retrieve specific error');

    // Analyze error
    const analysis = await page.evaluate((id) => window.aiErrorDiagnosis.analyzeError(id), first.id);
    assert(analysis !== null, 'Analysis returned');
    assert(analysis.error !== undefined, 'Analysis has error');
    assert(analysis.diagnosis !== undefined, 'Analysis has diagnosis');
    assert(analysis.confidence > 0, `Confidence: ${analysis.confidence}%`);
    assert(analysis.analysis !== undefined, 'Has analysis text');
    assert(analysis.suggestions.length > 0, `${analysis.suggestions.length} suggestions`);
    assert(analysis.documentation.length > 0, `${analysis.documentation.length} docs`);

    // Error stats
    const stats = await page.evaluate(() => window.aiErrorDiagnosis.getErrorStats());
    assert(stats.total > 0, `Total: ${stats.total}`);
    assert(stats.critical >= 0, `Critical: ${stats.critical}`);
    assert(stats.unresolved >= 0, `Unresolved: ${stats.unresolved}`);
    assert(stats.categories.length > 0, `${stats.categories.length} categories`);

    // Error list rendered
    const errorList = await page.evaluate(() => !!document.getElementById('aed-error-list'));
    assert(errorList, 'Error list rendered');

    const errorItems = await page.evaluate(() => document.querySelectorAll('.aed-error-item').length);
    assert(errorItems > 0, `${errorItems} error items rendered`);

    // === AC2: Suggest fixes ===
    console.log('\n=== AC2: Suggest fixes ===');

    const suggestions = await page.evaluate((id) => window.aiErrorDiagnosis.getSuggestions(id), first.id);
    assert(suggestions.length > 0, `${suggestions.length} suggestions for error`);

    const firstSugg = suggestions[0];
    assert(firstSugg.id !== undefined, 'Suggestion has id');
    assert(firstSugg.description !== undefined, 'Has description');
    assert(firstSugg.code !== undefined, 'Has code');
    assert(firstSugg.confidence > 0, `Confidence: ${firstSugg.confidence}%`);
    assert(firstSugg.effort !== undefined, `Effort: ${firstSugg.effort}`);

    // Resolve error
    const resolved = await page.evaluate((id) => window.aiErrorDiagnosis.resolveError(id), unresolved[0].id);
    assert(resolved === true, 'resolveError returns true');

    // Switch to fixes tab
    await page.evaluate(() => window.aiErrorDiagnosis.setTab('fixes'));
    await new Promise(r => setTimeout(r, 300));

    const fixesTabActive = await page.evaluate(() => {
      return document.querySelector('.aed-tab[data-tab="fixes"]').classList.contains('active');
    });
    assert(fixesTabActive, 'Suggested Fixes tab becomes active');

    const fixesSection = await page.evaluate(() => !!document.getElementById('aed-fixes-section'));
    assert(fixesSection, 'Fixes section rendered');

    const fixItems = await page.evaluate(() => document.querySelectorAll('.aed-fix-item').length);
    assert(fixItems > 0, `${fixItems} fix items rendered`);

    // === AC3: Link to documentation ===
    console.log('\n=== AC3: Link to documentation ===');

    const docs = await page.evaluate((id) => window.aiErrorDiagnosis.getDocumentation(id), first.id);
    assert(docs.length > 0, `${docs.length} documentation links`);

    const firstDoc = docs[0];
    assert(firstDoc.title !== undefined, `Title: ${firstDoc.title}`);
    assert(firstDoc.url !== undefined, 'Has URL');
    assert(firstDoc.url.startsWith('https://'), 'URL is HTTPS');
    assert(firstDoc.relevance > 0, `Relevance: ${firstDoc.relevance}%`);

    // Switch to docs tab
    await page.evaluate(() => window.aiErrorDiagnosis.setTab('docs'));
    await new Promise(r => setTimeout(r, 300));

    const docsTabActive = await page.evaluate(() => {
      return document.querySelector('.aed-tab[data-tab="docs"]').classList.contains('active');
    });
    assert(docsTabActive, 'Documentation tab becomes active');

    const docsSection = await page.evaluate(() => !!document.getElementById('aed-docs-section'));
    assert(docsSection, 'Docs section rendered');

    const docItems = await page.evaluate(() => document.querySelectorAll('.aed-doc-item').length);
    assert(docItems > 0, `${docItems} doc items rendered`);

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.aiErrorDiagnosis.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.errorCount > 0, `Errors: ${stateObj.errorCount}`);
    assert(stateObj.unresolvedCount >= 0, `Unresolved: ${stateObj.unresolvedCount}`);
    assert(stateObj.criticalCount >= 0, `Critical: ${stateObj.criticalCount}`);

    const savedState = await page.evaluate(() => localStorage.getItem('ai-error-diagnosis-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-092: AI-Powered Error Diagnosis - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
