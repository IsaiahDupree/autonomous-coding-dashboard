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
    await new Promise(r => setTimeout(r, 2000));

    // === AC1: Side-by-side diff ===
    console.log('\n=== AC1: Side-by-side diff ===');

    // Check API exists
    const hasAPI = await page.evaluate(() => typeof window.prdDiffViewer === 'object');
    assert(hasAPI, 'prdDiffViewer API exists on window');

    // Check card rendered
    const hasCard = await page.evaluate(() => !!document.getElementById('prd-diff-card'));
    assert(hasCard, 'PRD diff viewer card rendered');

    // Check diff container exists (side-by-side)
    const hasDiffContainer = await page.evaluate(() => !!document.getElementById('pdv-diff-container'));
    assert(hasDiffContainer, 'Diff container exists');

    // Check left panel exists
    const hasLeftPanel = await page.evaluate(() => !!document.getElementById('pdv-left-panel'));
    assert(hasLeftPanel, 'Left diff panel exists');

    // Check right panel exists
    const hasRightPanel = await page.evaluate(() => !!document.getElementById('pdv-right-panel'));
    assert(hasRightPanel, 'Right diff panel exists');

    // Check panels are side-by-side (grid layout)
    const isSideBySide = await page.evaluate(() => {
      const container = document.getElementById('pdv-diff-container');
      const style = getComputedStyle(container);
      return style.display === 'grid';
    });
    assert(isSideBySide, 'Diff panels are in side-by-side grid layout');

    // Check version selectors exist
    const hasLeftSelect = await page.$('#pdv-left-select');
    const hasRightSelect = await page.$('#pdv-right-select');
    assert(hasLeftSelect !== null, 'Left version selector exists');
    assert(hasRightSelect !== null, 'Right version selector exists');

    // Check version options
    const versionCount = await page.evaluate(() => {
      const select = document.getElementById('pdv-left-select');
      return select.options.length;
    });
    assert(versionCount >= 2, `${versionCount} versions available (>= 2)`);

    // Check diff lines are rendered
    const diffLines = await page.evaluate(() => {
      const lines = document.querySelectorAll('.pdv-diff-line');
      return lines.length;
    });
    assert(diffLines > 0, `${diffLines} diff lines rendered`);

    // Check computeDiff function
    const hasComputeDiff = await page.evaluate(() => typeof window.prdDiffViewer.computeDiff === 'function');
    assert(hasComputeDiff, 'computeDiff function exists');

    // Test computeDiff with known input
    const diffResult = await page.evaluate(() => {
      const diff = window.prdDiffViewer.computeDiff('line1\nline2\nline3', 'line1\nmodified\nline3\nline4');
      return {
        leftCount: diff.left.length,
        rightCount: diff.right.length,
        hasRemoved: diff.left.some(l => l.type === 'removed'),
        hasAdded: diff.right.some(l => l.type === 'added'),
      };
    });
    assert(diffResult.hasRemoved, 'Diff detects removed lines');
    assert(diffResult.hasAdded, 'Diff detects added lines');

    // === AC2: Highlight changes ===
    console.log('\n=== AC2: Highlight changes ===');

    // Check added lines are highlighted
    const hasAddedLines = await page.evaluate(() => {
      const added = document.querySelectorAll('.pdv-added');
      return added.length;
    });
    assert(hasAddedLines > 0, `${hasAddedLines} added lines highlighted`);

    // Check removed lines are highlighted
    const hasRemovedLines = await page.evaluate(() => {
      const removed = document.querySelectorAll('.pdv-removed');
      return removed.length;
    });
    assert(hasRemovedLines > 0, `${hasRemovedLines} removed lines highlighted`);

    // Check unchanged lines exist
    const hasUnchanged = await page.evaluate(() => {
      const unchanged = document.querySelectorAll('.pdv-unchanged');
      return unchanged.length;
    });
    assert(hasUnchanged > 0, `${hasUnchanged} unchanged lines`);

    // Check added lines have green background
    const addedBg = await page.evaluate(() => {
      const line = document.querySelector('.pdv-added');
      if (!line) return '';
      return getComputedStyle(line).backgroundColor;
    });
    assert(addedBg && addedBg !== 'rgba(0, 0, 0, 0)', `Added lines have background color: "${addedBg}"`);

    // Check removed lines have red background
    const removedBg = await page.evaluate(() => {
      const line = document.querySelector('.pdv-removed');
      if (!line) return '';
      return getComputedStyle(line).backgroundColor;
    });
    assert(removedBg && removedBg !== 'rgba(0, 0, 0, 0)', `Removed lines have background color: "${removedBg}"`);

    // Check line numbers exist
    const lineNums = await page.evaluate(() => {
      const nums = document.querySelectorAll('.pdv-line-num');
      return nums.length;
    });
    assert(lineNums > 0, `${lineNums} line number elements`);

    // Check +/- badges in header
    const hasBadges = await page.evaluate(() => {
      const header = document.querySelector('#prd-diff-card .card-header');
      return header && header.textContent.includes('+') && header.textContent.includes('-');
    });
    assert(hasBadges, 'Add/remove count badges in header');

    // === AC3: Version history ===
    console.log('\n=== AC3: Version history ===');

    // Check history section
    const hasHistorySection = await page.evaluate(() => !!document.getElementById('pdv-history-section'));
    assert(hasHistorySection, 'Version history section exists');

    // Check history list
    const hasHistoryList = await page.evaluate(() => !!document.getElementById('pdv-history-list'));
    assert(hasHistoryList, 'Version history list exists');

    // Check history items
    const historyItems = await page.evaluate(() => {
      const items = document.querySelectorAll('.pdv-history-item');
      return items.length;
    });
    assert(historyItems >= 2, `${historyItems} version history items (>= 2)`);

    // Check history items have version, date, preview
    const historyContent = await page.evaluate(() => {
      const item = document.querySelector('.pdv-history-item');
      if (!item) return {};
      return {
        hasVersion: !!item.querySelector('.pdv-history-version'),
        hasMeta: !!item.querySelector('.pdv-history-meta'),
        hasPreview: !!item.querySelector('.pdv-history-preview'),
        hasMarker: !!item.querySelector('.pdv-history-marker'),
      };
    });
    assert(historyContent.hasVersion, 'History items have version number');
    assert(historyContent.hasMeta, 'History items have date/author metadata');
    assert(historyContent.hasPreview, 'History items have content preview');
    assert(historyContent.hasMarker, 'History items have timeline markers');

    // Check current version marker
    const hasCurrentMarker = await page.evaluate(() => {
      const marker = document.querySelector('.pdv-current');
      return marker !== null;
    });
    assert(hasCurrentMarker, 'Current version has distinct marker');

    // Test version switching
    await page.evaluate(() => {
      const leftSelect = document.getElementById('pdv-left-select');
      if (leftSelect && leftSelect.options.length >= 2) {
        leftSelect.value = '1';
        window.prdDiffViewer.updateDiff();
      }
    });
    await new Promise(r => setTimeout(r, 500));

    const stateAfterSwitch = await page.evaluate(() => window.prdDiffViewer.getState());
    assert(stateAfterSwitch.leftVersion === 1, 'Version switching works');

    // Check state persistence
    const savedState = await page.evaluate(() => {
      const saved = localStorage.getItem('prd-diff-viewer-state');
      return saved !== null;
    });
    assert(savedState, 'State persisted to localStorage');

    // Test Add Version button
    const hasAddBtn = await page.evaluate(() => {
      const card = document.getElementById('prd-diff-card');
      return card && card.textContent.includes('Add Version');
    });
    assert(hasAddBtn, 'Add Version button exists');

    // Test Demo button
    const hasDemoBtn = await page.evaluate(() => {
      const card = document.getElementById('prd-diff-card');
      return card && card.textContent.includes('Demo');
    });
    assert(hasDemoBtn, 'Demo button exists');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-059: PRD Diff Viewer - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
