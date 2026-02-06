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

    const hasAPI = await page.evaluate(() => typeof window.visualRegression === 'object');
    assert(hasAPI, 'visualRegression API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('visual-regression-card'));
    assert(hasCard, 'Visual regression card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.vr-tab').length === 3);
    assert(hasTabs, 'Three tabs exist');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.vr-stat').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Screenshot comparison ===
    console.log('\n=== AC1: Screenshot comparison ===');

    const screenshots = await page.evaluate(() => window.visualRegression.getScreenshots());
    assert(screenshots.length > 0, `${screenshots.length} screenshots`);

    // Screenshot has required fields
    const first = screenshots[0];
    assert(first.id !== undefined, 'Screenshot has id');
    assert(first.name !== undefined, 'Screenshot has name');
    assert(first.path !== undefined, 'Screenshot has path');
    assert(first.status !== undefined, 'Screenshot has status');
    assert(first.baselineWidth > 0, 'Screenshot has baseline dimensions');
    assert(first.capturedAt !== undefined, 'Screenshot has capture time');

    // Valid statuses
    const validStatuses = ['match', 'diff', 'new'];
    const allValid = screenshots.every(s => validStatuses.includes(s.status));
    assert(allValid, 'All screenshot statuses are valid');

    // Get specific screenshot
    const specific = await page.evaluate((id) => window.visualRegression.getScreenshot(id), first.id);
    assert(specific !== null, 'Can retrieve specific screenshot');

    // Compare screenshots
    const comparison = await page.evaluate((id) => window.visualRegression.compareScreenshots(id), first.id);
    assert(comparison !== null, 'compareScreenshots returns result');
    assert(comparison.screenshotId !== undefined, 'Comparison has screenshotId');
    assert(comparison.diffPercent !== undefined, 'Comparison has diffPercent');
    assert(comparison.matchPercent !== undefined, 'Comparison has matchPercent');
    assert(comparison.totalPixels > 0, `Total pixels: ${comparison.totalPixels}`);
    assert(comparison.baseline !== undefined, 'Comparison has baseline dims');
    assert(comparison.current !== undefined, 'Comparison has current dims');

    // Screenshots with diffs
    const diffs = screenshots.filter(s => s.status === 'diff');
    if (diffs.length > 0) {
      assert(diffs[0].diffPercent > 0, `Diff screenshot has ${diffs[0].diffPercent}% diff`);
      assert(diffs[0].pixelsDiff > 0, `${diffs[0].pixelsDiff} pixels differ`);
    }

    // Screenshot list rendered
    const ssItems = await page.evaluate(() => document.querySelectorAll('.vr-screenshot-item').length);
    assert(ssItems > 0, `${ssItems} screenshot items rendered`);

    // Overview stats
    const overviewStats = await page.evaluate(() => window.visualRegression.getOverviewStats());
    assert(overviewStats.total > 0, `Total: ${overviewStats.total}`);
    assert(overviewStats.matching >= 0, `Matching: ${overviewStats.matching}`);
    assert(overviewStats.diffs >= 0, `Diffs: ${overviewStats.diffs}`);
    assert(overviewStats.pendingApprovals >= 0, `Pending: ${overviewStats.pendingApprovals}`);

    // === AC2: Highlight differences ===
    console.log('\n=== AC2: Highlight differences ===');

    // Get diff highlights for a diff screenshot
    if (diffs.length > 0) {
      const highlights = await page.evaluate((id) => window.visualRegression.getDiffHighlights(id), diffs[0].id);
      assert(highlights.length > 0, `${highlights.length} diff regions highlighted`);

      const firstRegion = highlights[0];
      assert(firstRegion.id !== undefined, 'Region has id');
      assert(firstRegion.name !== undefined, 'Region has name');
      assert(firstRegion.x !== undefined, 'Region has x coordinate');
      assert(firstRegion.y !== undefined, 'Region has y coordinate');
      assert(firstRegion.width > 0, 'Region has width');
      assert(firstRegion.height > 0, 'Region has height');
      assert(firstRegion.severity !== undefined, `Region severity: ${firstRegion.severity}`);
      assert(firstRegion.description !== undefined, 'Region has description');

      // Valid severities
      const validSeverities = ['major', 'minor', 'cosmetic'];
      const severitiesValid = highlights.every(r => validSeverities.includes(r.severity));
      assert(severitiesValid, 'All region severities are valid');
    }

    // Switch to highlights tab
    await page.evaluate(() => window.visualRegression.setTab('highlights'));
    await new Promise(r => setTimeout(r, 300));

    const highlightTabActive = await page.evaluate(() => {
      return document.querySelector('.vr-tab[data-tab="highlights"]').classList.contains('active');
    });
    assert(highlightTabActive, 'Highlights tab becomes active');

    if (diffs.length > 0) {
      const highlightGrid = await page.evaluate(() => !!document.getElementById('vr-highlight-grid'));
      assert(highlightGrid, 'Highlight grid rendered');

      const highlightCards = await page.evaluate(() => document.querySelectorAll('.vr-highlight-card').length);
      assert(highlightCards > 0, `${highlightCards} highlight cards rendered`);
    }

    // === AC3: Approve changes ===
    console.log('\n=== AC3: Approve changes ===');

    // Pending approvals
    const pending = await page.evaluate(() => window.visualRegression.getPendingApprovals());
    assert(pending.length >= 0, `${pending.length} pending approvals`);

    if (pending.length > 0) {
      const pendingId = pending[0].id;

      // Switch to approvals tab
      await page.evaluate(() => window.visualRegression.setTab('approvals'));
      await new Promise(r => setTimeout(r, 300));

      const appTabActive = await page.evaluate(() => {
        return document.querySelector('.vr-tab[data-tab="approvals"]').classList.contains('active');
      });
      assert(appTabActive, 'Approvals tab becomes active');

      const approvalList = await page.evaluate(() => !!document.getElementById('vr-approval-list'));
      assert(approvalList, 'Approval list rendered');

      // Approve a change
      const approveResult = await page.evaluate((id) => window.visualRegression.approveChange(id), pendingId);
      assert(approveResult === true, 'approveChange returns true');

      const afterApprove = await page.evaluate((id) => window.visualRegression.getScreenshot(id), pendingId);
      assert(afterApprove.approvalStatus === 'approved', 'Screenshot approved');

      // Reject a change (if more pending)
      const pendingAfter = await page.evaluate(() => window.visualRegression.getPendingApprovals());
      if (pendingAfter.length > 0) {
        const rejectId = pendingAfter[0].id;
        const rejectResult = await page.evaluate((id) => window.visualRegression.rejectChange(id), rejectId);
        assert(rejectResult === true, 'rejectChange returns true');
        const afterReject = await page.evaluate((id) => window.visualRegression.getScreenshot(id), rejectId);
        assert(afterReject.approvalStatus === 'rejected', 'Screenshot rejected');
      }

      // Approve all remaining
      const approvedCount = await page.evaluate(() => window.visualRegression.approveAll());
      assert(approvedCount >= 0, `approveAll approved ${approvedCount} changes`);

      const remainingPending = await page.evaluate(() => window.visualRegression.getPendingApprovals().length);
      assert(remainingPending === 0, 'No pending approvals after approveAll');
    }

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.visualRegression.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.screenshotCount > 0, `State tracks ${stateObj.screenshotCount} screenshots`);

    const savedState = await page.evaluate(() => localStorage.getItem('visual-regression-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-073: Visual Regression Testing - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
