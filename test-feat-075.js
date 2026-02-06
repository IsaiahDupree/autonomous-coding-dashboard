const puppeteer = require('puppeteer');

(async () => {
  let passed = 0;
  let failed = 0;
  const results = [];

  function assert(condition, message) {
    if (condition) { passed++; results.push(`  ✓ ${message}`); }
    else { failed++; results.push(`  ✗ ${message}`); }
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));

    console.log('\n=== Basic Setup ===');
    const hasAPI = await page.evaluate(() => typeof window.branchManager === 'object');
    assert(hasAPI, 'branchManager API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('branch-manager-card'));
    assert(hasCard, 'Branch manager card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.bm-tab').length === 2);
    assert(hasTabs, 'Two tabs exist (Branches, Conflicts)');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.bm-stat').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Create feature branches ===
    console.log('\n=== AC1: Create feature branches ===');

    const branches = await page.evaluate(() => window.branchManager.getBranches());
    assert(branches.length > 0, `${branches.length} branches exist`);

    const first = branches[0];
    assert(first.id !== undefined, 'Branch has id');
    assert(first.name !== undefined, 'Branch has name');
    assert(first.featureId !== undefined, 'Branch has featureId');
    assert(first.baseBranch !== undefined, 'Branch has baseBranch');
    assert(first.status !== undefined, 'Branch has status');
    assert(first.commits >= 0, 'Branch has commit count');
    assert(first.ahead >= 0, 'Branch has ahead count');
    assert(first.behind >= 0, 'Branch has behind count');

    const validStatuses = ['active', 'merged', 'conflict', 'stale', 'deleted'];
    const allValid = branches.every(b => validStatuses.includes(b.status));
    assert(allValid, 'All branch statuses are valid');

    // Get specific branch
    const specific = await page.evaluate((id) => window.branchManager.getBranch(id), first.id);
    assert(specific !== null, 'Can retrieve specific branch');

    // Create new branch
    const newBranch = await page.evaluate(() => window.branchManager.createBranch('feat-099', 'main'));
    assert(newBranch !== null, 'createBranch returns new branch');
    assert(newBranch.name === 'feature/feat-099', 'Branch name follows convention');
    assert(newBranch.featureId === 'feat-099', 'Branch references feature');
    assert(newBranch.baseBranch === 'main', 'Branch base is main');
    assert(newBranch.status === 'active', 'New branch is active');

    // Branch list rendered
    const branchItems = await page.evaluate(() => document.querySelectorAll('.bm-branch-item').length);
    assert(branchItems > 0, `${branchItems} branch items rendered`);

    // Stats
    const stats = await page.evaluate(() => window.branchManager.getStats());
    assert(stats.total > 0, `Total: ${stats.total}`);
    assert(stats.active >= 0, `Active: ${stats.active}`);
    assert(stats.merged >= 0, `Merged: ${stats.merged}`);
    assert(stats.conflicts >= 0, `Conflicts: ${stats.conflicts}`);

    // === AC2: Auto-merge on completion ===
    console.log('\n=== AC2: Auto-merge on completion ===');

    // Merge a branch
    const activeBranches = branches.filter(b => b.status === 'active');
    if (activeBranches.length > 0) {
      const mergeResult = await page.evaluate((id) => window.branchManager.mergeBranch(id), activeBranches[0].id);
      assert(mergeResult === true, 'mergeBranch returns true');
      const afterMerge = await page.evaluate((id) => window.branchManager.getBranch(id), activeBranches[0].id);
      assert(afterMerge.status === 'merged', 'Branch status changed to merged');
      assert(afterMerge.mergedAt !== null, 'Branch has merge timestamp');
    }

    // Auto-merge completed
    const autoMerged = await page.evaluate(() => window.branchManager.autoMergeCompleted());
    assert(autoMerged >= 0, `Auto-merged ${autoMerged} branches`);

    // Delete a branch
    const deleteResult = await page.evaluate((id) => window.branchManager.deleteBranch(id), newBranch.id);
    assert(deleteResult === true, 'deleteBranch returns true');
    const afterDelete = await page.evaluate((id) => window.branchManager.getBranch(id), newBranch.id);
    assert(afterDelete === null, 'Deleted branch no longer exists');

    // Cannot merge already-merged branch
    if (activeBranches.length > 0) {
      const doubleMerge = await page.evaluate((id) => window.branchManager.mergeBranch(id), activeBranches[0].id);
      assert(doubleMerge === false, 'Cannot merge already-merged branch');
    }

    // === AC3: Conflict resolution ===
    console.log('\n=== AC3: Conflict resolution ===');

    const conflicts = await page.evaluate(() => window.branchManager.getConflicts());
    assert(conflicts.length > 0, `${conflicts.length} conflicts exist`);

    const firstConflict = conflicts[0];
    assert(firstConflict.id !== undefined, 'Conflict has id');
    assert(firstConflict.branchId !== undefined, 'Conflict has branchId');
    assert(firstConflict.file !== undefined, 'Conflict has file');
    assert(firstConflict.type !== undefined, 'Conflict has type');
    assert(firstConflict.description !== undefined, 'Conflict has description');

    const validTypes = ['content', 'rename', 'delete'];
    const typesValid = conflicts.every(c => validTypes.includes(c.type));
    assert(typesValid, 'All conflict types valid');

    // Get specific conflict
    const specificConflict = await page.evaluate((id) => window.branchManager.getConflict(id), firstConflict.id);
    assert(specificConflict !== null, 'Can retrieve specific conflict');

    // Get conflicts by branch
    const branchConflicts = await page.evaluate((bid) => window.branchManager.getConflicts(bid), firstConflict.branchId);
    assert(branchConflicts.length > 0, `${branchConflicts.length} conflicts for branch`);

    // Resolve conflict
    const resolveResult = await page.evaluate((id) => window.branchManager.resolveConflict(id, 'ours'), firstConflict.id);
    assert(resolveResult === true, 'resolveConflict returns true');
    const afterResolve = await page.evaluate((id) => window.branchManager.getConflict(id), firstConflict.id);
    assert(afterResolve.resolution === 'ours', 'Conflict resolution set to ours');

    // Switch to conflicts tab
    await page.evaluate(() => window.branchManager.setTab('conflicts'));
    await new Promise(r => setTimeout(r, 300));
    const conflictTabActive = await page.evaluate(() => document.querySelector('.bm-tab[data-tab="conflicts"]').classList.contains('active'));
    assert(conflictTabActive, 'Conflicts tab becomes active');

    const conflictList = await page.evaluate(() => !!document.getElementById('bm-conflict-list'));
    assert(conflictList, 'Conflict list rendered');

    const conflictItems = await page.evaluate(() => document.querySelectorAll('.bm-conflict-item').length);
    assert(conflictItems > 0, `${conflictItems} conflict items rendered`);

    // Resolution buttons
    const resButtons = await page.evaluate(() => document.querySelectorAll('.bm-resolution-btn').length);
    assert(resButtons > 0, `${resButtons} resolution buttons rendered`);

    // === State ===
    console.log('\n=== State ===');
    const stateObj = await page.evaluate(() => window.branchManager.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.branchCount > 0, `State tracks ${stateObj.branchCount} branches`);
    assert(stateObj.conflictCount > 0, `State tracks ${stateObj.conflictCount} conflicts`);

    const savedState = await page.evaluate(() => localStorage.getItem('branch-manager-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-075: Branch Management per Target - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
