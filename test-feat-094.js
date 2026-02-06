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

    const hasAPI = await page.evaluate(() => typeof window.codeQuality === 'object');
    assert(hasAPI, 'codeQuality API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('code-quality-card'));
    assert(hasCard, 'Code quality card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.cq-tab').length === 3);
    assert(hasTabs, 'Three tabs exist');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.cq-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Analyze generated code ===
    console.log('\n=== AC1: Analyze generated code ===');

    const results2 = await page.evaluate(() => window.codeQuality.getAnalysisResults());
    assert(results2.length > 0, `${results2.length} files analyzed`);
    assert(results2.length === 8, 'Has 8 analysis results');

    const first = results2[0];
    assert(first.id !== undefined, 'Result has id');
    assert(first.file !== undefined, `File: ${first.file}`);
    assert(first.score > 0, `Score: ${first.score}`);
    assert(first.lines > 0, `Lines: ${first.lines}`);
    assert(first.complexity > 0, `Complexity: ${first.complexity}`);
    assert(first.duplications >= 0, `Duplications: ${first.duplications}`);
    assert(first.issues >= 0, `Issues: ${first.issues}`);
    assert(first.grade !== undefined, `Grade: ${first.grade}`);
    assert(first.category !== undefined, `Category: ${first.category}`);

    // Get specific analysis
    const specific = await page.evaluate((id) => window.codeQuality.getAnalysis(id), first.id);
    assert(specific !== null, 'Can retrieve specific analysis');

    // Analyze a file
    const fileAnalysis = await page.evaluate(() => window.codeQuality.analyzeFile('app.js'));
    assert(fileAnalysis !== null, 'File analysis returned');
    assert(fileAnalysis.score > 0, 'File has quality score');

    // Overall score
    const overallScore = await page.evaluate(() => window.codeQuality.getOverallScore());
    assert(overallScore > 0, `Overall score: ${overallScore}`);
    assert(overallScore <= 100, 'Score <= 100');

    // Quality stats
    const stats = await page.evaluate(() => window.codeQuality.getQualityStats());
    assert(stats.overallScore > 0, `Stats overall: ${stats.overallScore}`);
    assert(stats.filesAnalyzed > 0, `Files: ${stats.filesAnalyzed}`);
    assert(stats.totalIssues >= 0, `Issues: ${stats.totalIssues}`);
    assert(stats.improvementCount > 0, `Improvements: ${stats.improvementCount}`);

    // Analysis list rendered
    const analysisList = await page.evaluate(() => !!document.getElementById('cq-analysis-list'));
    assert(analysisList, 'Analysis list rendered');

    const analysisItems = await page.evaluate(() => document.querySelectorAll('.cq-analysis-item').length);
    assert(analysisItems > 0, `${analysisItems} analysis items rendered`);

    // === AC2: Suggest improvements ===
    console.log('\n=== AC2: Suggest improvements ===');

    const improvements = await page.evaluate(() => window.codeQuality.getImprovements());
    assert(improvements.length > 0, `${improvements.length} improvements`);
    assert(improvements.length === 8, 'Has 8 improvements');

    const firstImp = improvements[0];
    assert(firstImp.id !== undefined, 'Improvement has id');
    assert(firstImp.file !== undefined, `File: ${firstImp.file}`);
    assert(firstImp.type !== undefined, `Type: ${firstImp.type}`);
    assert(firstImp.severity !== undefined, `Severity: ${firstImp.severity}`);
    assert(firstImp.description !== undefined, 'Has description');
    assert(firstImp.impact > 0, `Impact: +${firstImp.impact}%`);
    assert(firstImp.effort !== undefined, `Effort: ${firstImp.effort}`);

    // Get specific improvement
    const specificImp = await page.evaluate((id) => window.codeQuality.getImprovement(id), firstImp.id);
    assert(specificImp !== null, 'Can retrieve specific improvement');

    // Severity types
    const severities = new Set(improvements.map(i => i.severity));
    assert(severities.has('high'), 'Has high severity');
    assert(severities.has('medium'), 'Has medium severity');
    assert(severities.has('low'), 'Has low severity');

    // Switch to suggestions tab
    await page.evaluate(() => window.codeQuality.setTab('suggestions'));
    await new Promise(r => setTimeout(r, 300));

    const sugTabActive = await page.evaluate(() => {
      return document.querySelector('.cq-tab[data-tab="suggestions"]').classList.contains('active');
    });
    assert(sugTabActive, 'Suggestions tab becomes active');

    const sugSection = await page.evaluate(() => !!document.getElementById('cq-suggestions-section'));
    assert(sugSection, 'Suggestions section rendered');

    const sugItems = await page.evaluate(() => document.querySelectorAll('.cq-suggestion-item').length);
    assert(sugItems > 0, `${sugItems} suggestion items rendered`);

    // === AC3: Track quality over time ===
    console.log('\n=== AC3: Track quality over time ===');

    const trends = await page.evaluate(() => window.codeQuality.getQualityTrends());
    assert(trends.length > 0, `${trends.length} trend entries`);
    assert(trends.length === 7, 'Has 7 days of trends');

    const firstTrend = trends[0];
    assert(firstTrend.date !== undefined, 'Trend has date');
    assert(firstTrend.overallScore > 0, `Score: ${firstTrend.overallScore}`);
    assert(firstTrend.avgComplexity > 0, `Complexity: ${firstTrend.avgComplexity}`);
    assert(firstTrend.totalIssues >= 0, `Issues: ${firstTrend.totalIssues}`);
    assert(firstTrend.filesAnalyzed > 0, `Files: ${firstTrend.filesAnalyzed}`);

    // Trend shows improvement
    const lastTrend = trends[trends.length - 1];
    assert(lastTrend.overallScore >= firstTrend.overallScore, 'Quality improved over time');

    // Switch to trends tab
    await page.evaluate(() => window.codeQuality.setTab('trends'));
    await new Promise(r => setTimeout(r, 300));

    const trendTabActive = await page.evaluate(() => {
      return document.querySelector('.cq-tab[data-tab="trends"]').classList.contains('active');
    });
    assert(trendTabActive, 'Trends tab becomes active');

    const trendSection = await page.evaluate(() => !!document.getElementById('cq-trends-section'));
    assert(trendSection, 'Trends section rendered');

    const trendItems = await page.evaluate(() => document.querySelectorAll('.cq-trend-item').length);
    assert(trendItems > 0, `${trendItems} trend items rendered`);

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.codeQuality.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.overallScore > 0, `Score: ${stateObj.overallScore}`);
    assert(stateObj.filesAnalyzed > 0, `Files: ${stateObj.filesAnalyzed}`);
    assert(stateObj.issueCount >= 0, `Issues: ${stateObj.issueCount}`);

    const savedState = await page.evaluate(() => localStorage.getItem('code-quality-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-094: Code Quality Analysis - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
