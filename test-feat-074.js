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

    const hasAPI = await page.evaluate(() => typeof window.commitGenerator === 'object');
    assert(hasAPI, 'commitGenerator API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('commit-generator-card'));
    assert(hasCard, 'Commit generator card rendered');

    const hasForm = await page.evaluate(() => !!document.getElementById('cg-form'));
    assert(hasForm, 'Generator form exists');

    // === AC1: AI-generated commit messages ===
    console.log('\n=== AC1: AI-generated commit messages ===');

    // Generate basic message
    const msg1 = await page.evaluate(() => {
      return window.commitGenerator.generateCommitMessage({
        type: 'feat',
        featureId: 'feat-074',
        description: 'add commit message generator',
      });
    });
    assert(msg1 !== null, 'generateCommitMessage returns result');
    assert(msg1.message.length > 0, 'Message is not empty');
    assert(msg1.subject.length > 0, 'Subject is not empty');
    assert(msg1.type === 'feat', 'Type is feat');
    assert(msg1.generatedAt !== undefined, 'Has generation timestamp');
    assert(msg1.isConventional === true, 'Message is conventional');

    // Generate with scope
    const msg2 = await page.evaluate(() => {
      return window.commitGenerator.generateCommitMessage({
        type: 'fix',
        scope: 'api',
        featureId: 'feat-050',
        description: 'resolve timeout in polling endpoint',
      });
    });
    assert(msg2.message.includes('fix(api)'), 'Scoped message has correct format');

    // Generate with body
    const msg3 = await page.evaluate(() => {
      return window.commitGenerator.generateCommitMessage({
        type: 'refactor',
        description: 'simplify state management',
        body: 'Reduce complexity by consolidating state updates.',
      });
    });
    assert(msg3.hasBody === true, 'Message with body detected');
    assert(msg3.message.includes('Reduce complexity'), 'Body included in message');

    // Generate from diff
    const diffMsg = await page.evaluate(() => {
      return window.commitGenerator.generateFromDiff({
        filesChanged: ['src/api.js', 'src/utils.js'],
        additions: 45,
        deletions: 10,
        featureId: 'feat-074',
      });
    });
    assert(diffMsg !== null, 'generateFromDiff returns result');
    assert(diffMsg.message.length > 0, 'Diff-based message generated');

    // Generate from test files
    const testDiffMsg = await page.evaluate(() => {
      return window.commitGenerator.generateFromDiff({
        filesChanged: ['test-feat-074.test.js', 'test-feat-075.spec.js'],
        additions: 100,
        deletions: 5,
      });
    });
    assert(testDiffMsg.type === 'test', 'Test files detected as test type');

    // Commit types
    const types = await page.evaluate(() => window.commitGenerator.getCommitTypes());
    assert(types.length >= 6, `${types.length} commit types available`);
    assert(types[0].value !== undefined, 'Type has value');
    assert(types[0].label !== undefined, 'Type has label');

    // History
    const history = await page.evaluate(() => window.commitGenerator.getHistory());
    assert(history.length >= 3, `${history.length} messages in history`);
    assert(history[0].message !== undefined, 'History entry has message');
    assert(history[0].type !== undefined, 'History entry has type');
    assert(history[0].timestamp !== undefined, 'History entry has timestamp');

    // Last generated
    const last = await page.evaluate(() => window.commitGenerator.getLastGenerated());
    assert(last !== null, 'getLastGenerated returns result');

    // Result rendered
    const hasResult = await page.evaluate(() => !!document.getElementById('cg-result'));
    assert(hasResult, 'Generated result displayed');

    const hasResultMsg = await page.evaluate(() => !!document.getElementById('cg-result-message'));
    assert(hasResultMsg, 'Result message displayed');

    // History list rendered
    const historyItems = await page.evaluate(() => {
      const list = document.getElementById('cg-history-list');
      return list ? list.querySelectorAll('.cg-history-item').length : 0;
    });
    assert(historyItems > 0, `${historyItems} history items rendered`);

    // === AC2: Include feature ID ===
    console.log('\n=== AC2: Include feature ID ===');

    assert(msg1.hasFeatureId === true, 'Feature ID inclusion tracked');
    assert(msg1.featureId === 'feat-074', 'Feature ID preserved');
    assert(msg1.message.includes('feat-074'), 'Feature ID in message body');

    // Message without feature ID
    const noFeatMsg = await page.evaluate(() => {
      return window.commitGenerator.generateCommitMessage({
        type: 'chore',
        description: 'update dependencies',
      });
    });
    assert(noFeatMsg.hasFeatureId === false, 'No feature ID when not provided');

    // === AC3: Conventional commit format ===
    console.log('\n=== AC3: Conventional commit format ===');

    // Validate valid message
    const validResult = await page.evaluate(() => {
      return window.commitGenerator.validateMessage('feat: add new feature');
    });
    assert(validResult.valid === true, 'Valid conventional message passes');
    assert(validResult.errors.length === 0, 'No errors for valid message');

    // Validate with scope
    const scopedResult = await page.evaluate(() => {
      return window.commitGenerator.validateMessage('fix(api): resolve timeout');
    });
    assert(scopedResult.valid === true, 'Scoped message validates');

    // Validate invalid message
    const invalidResult = await page.evaluate(() => {
      return window.commitGenerator.validateMessage('Added something new');
    });
    assert(invalidResult.valid === false, 'Non-conventional message fails validation');
    assert(invalidResult.errors.length > 0, 'Errors provided for invalid message');

    // Validate empty message
    const emptyResult = await page.evaluate(() => {
      return window.commitGenerator.validateMessage('');
    });
    assert(emptyResult.valid === false, 'Empty message fails validation');

    // Subject length check
    const longMsg = await page.evaluate(() => {
      return window.commitGenerator.validateMessage('feat: ' + 'x'.repeat(80));
    });
    assert(longMsg.errors.some(e => e.includes('72')), 'Long subject line flagged');
    assert(longMsg.subjectLength !== undefined, 'Subject length reported');

    // Form elements
    const hasTypeSelect = await page.$('#cg-type');
    assert(hasTypeSelect !== null, 'Type select exists in form');

    const hasFeatureInput = await page.$('#cg-feature-id');
    assert(hasFeatureInput !== null, 'Feature ID input exists');

    const hasScopeInput = await page.$('#cg-scope');
    assert(hasScopeInput !== null, 'Scope input exists');

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.commitGenerator.getState());
    assert(stateObj.historyCount > 0, `State tracks ${stateObj.historyCount} history entries`);
    assert(stateObj.lastGenerated !== null, 'State has lastGenerated');

    const savedState = await page.evaluate(() => localStorage.getItem('commit-generator-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-074: Automatic Commit Message Generation - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
