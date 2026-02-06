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

    // === Basic Setup ===
    console.log('\n=== Basic Setup ===');

    const hasAPI = await page.evaluate(() => typeof window.targetGroups === 'object');
    assert(hasAPI, 'targetGroups API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('target-groups-card'));
    assert(hasCard, 'Target groups card rendered');

    const hasFilterBar = await page.evaluate(() => !!document.getElementById('tg-filter-bar'));
    assert(hasFilterBar, 'Filter bar exists');

    // === AC1: Create Target Groups ===
    console.log('\n=== AC1: Create Target Groups ===');

    // Create group
    const group1 = await page.evaluate(() => {
      return window.targetGroups.createGroup('Sprint 1', '#22c55e', 'First sprint targets');
    });
    assert(group1 !== null, 'Group created successfully');
    assert(group1.id.startsWith('grp-'), `Group has ID: ${group1.id}`);
    assert(group1.name === 'Sprint 1', 'Group has correct name');
    assert(group1.color === '#22c55e', 'Group has correct color');
    assert(group1.members.length === 0, 'New group starts empty');

    // Create second group
    const group2 = await page.evaluate(() => {
      return window.targetGroups.createGroup('Core Features', '#ef4444');
    });
    assert(group2 !== null, 'Second group created');

    // Get groups
    const groups = await page.evaluate(() => window.targetGroups.getGroups());
    assert(groups.length >= 2, `${groups.length} groups exist`);

    // Get group by ID
    const retrieved = await page.evaluate((id) => window.targetGroups.getGroup(id), group1.id);
    assert(retrieved !== null, 'getGroup retrieves by ID');
    assert(retrieved.name === 'Sprint 1', 'Retrieved group has correct name');

    // Add members to group
    const addResult = await page.evaluate((gid) => {
      return window.targetGroups.addMember(gid, 'feat-001');
    }, group1.id);
    assert(addResult === true, 'Add member returns true');

    await page.evaluate((gid) => {
      window.targetGroups.addMember(gid, 'feat-002');
      window.targetGroups.addMember(gid, 'feat-003');
    }, group1.id);

    const afterAdd = await page.evaluate((id) => window.targetGroups.getGroup(id), group1.id);
    assert(afterAdd.members.length === 3, `Group has ${afterAdd.members.length} members`);

    // Duplicate add should fail
    const dupAdd = await page.evaluate((gid) => {
      return window.targetGroups.addMember(gid, 'feat-001');
    }, group1.id);
    assert(dupAdd === false, 'Duplicate add returns false');

    // Remove member
    const removeResult = await page.evaluate((gid) => {
      return window.targetGroups.removeMember(gid, 'feat-003');
    }, group1.id);
    assert(removeResult === true, 'Remove member returns true');

    const afterRemove = await page.evaluate((id) => window.targetGroups.getGroup(id), group1.id);
    assert(afterRemove.members.length === 2, 'Member count decreased after remove');

    // Rename group
    const renameResult = await page.evaluate((id) => {
      return window.targetGroups.renameGroup(id, 'Sprint 1 (Renamed)');
    }, group1.id);
    assert(renameResult === true, 'Rename returns true');

    const renamed = await page.evaluate((id) => window.targetGroups.getGroup(id), group1.id);
    assert(renamed.name === 'Sprint 1 (Renamed)', 'Group renamed successfully');

    // Group cards rendered
    const groupCards = await page.evaluate(() => {
      return document.querySelectorAll('.tg-group-card').length;
    });
    assert(groupCards >= 2, `${groupCards} group cards rendered`);

    // Create form
    await page.evaluate(() => window.targetGroups.showCreateForm());
    await new Promise(r => setTimeout(r, 200));

    const createFormVisible = await page.evaluate(() => {
      return document.getElementById('tg-create-section').classList.contains('visible');
    });
    assert(createFormVisible, 'Create form shows on button click');

    const hasNameInput = await page.$('#tg-create-name');
    assert(hasNameInput !== null, 'Create form has name input');

    const hasColorInput = await page.$('#tg-create-color');
    assert(hasColorInput !== null, 'Create form has color picker');

    // === AC2: Bulk Actions on Groups ===
    console.log('\n=== AC2: Bulk Actions on Groups ===');

    // Add members to group2 for bulk testing
    await page.evaluate((gid) => {
      window.targetGroups.addMember(gid, 'feat-004');
      window.targetGroups.addMember(gid, 'feat-005');
      window.targetGroups.addMember(gid, 'feat-006');
    }, group2.id);

    const g2Before = await page.evaluate((id) => window.targetGroups.getGroup(id), group2.id);
    assert(g2Before.members.length === 3, 'Group2 has 3 members for bulk test');

    // Bulk reset (clear members)
    const resetResult = await page.evaluate((id) => {
      return window.targetGroups.bulkReset(id);
    }, group2.id);
    assert(resetResult === true, 'Bulk reset returns true');

    const g2After = await page.evaluate((id) => window.targetGroups.getGroup(id), group2.id);
    assert(g2After.members.length === 0, 'Bulk reset cleared all members');

    // Delete group
    const deleteResult = await page.evaluate((id) => {
      return window.targetGroups.deleteGroup(id);
    }, group2.id);
    assert(deleteResult === true, 'Delete group returns true');

    const afterDelete = await page.evaluate((id) => window.targetGroups.getGroup(id), group2.id);
    assert(afterDelete === null, 'Deleted group no longer exists');

    // Bulk action buttons exist in expanded group
    await page.evaluate((id) => window.targetGroups.toggleGroup(id), group1.id);
    await new Promise(r => setTimeout(r, 200));

    const hasBulkBar = await page.evaluate(() => {
      return document.querySelectorAll('.tg-bulk-bar').length > 0;
    });
    assert(hasBulkBar, 'Bulk action bar exists in expanded group');

    const hasBulkBtns = await page.evaluate(() => {
      return document.querySelectorAll('.tg-bulk-btn').length >= 3;
    });
    assert(hasBulkBtns, 'Bulk action buttons exist (archive, reset, delete)');

    // === AC3: Filter by Group ===
    console.log('\n=== AC3: Filter by Group ===');

    // Check filter chips
    const filterChips = await page.evaluate(() => {
      return document.querySelectorAll('.tg-filter-chip').length;
    });
    assert(filterChips >= 2, `${filterChips} filter chips (All + groups)`);

    // "All" filter is active by default
    const allFilterActive = await page.evaluate(() => {
      return window.targetGroups.getActiveFilter() === null;
    });
    assert(allFilterActive, 'No filter active by default (All)');

    // Get all features (unfiltered)
    const allFeatures = await page.evaluate(() => {
      return window.targetGroups.getFilteredFeatures().length;
    });
    assert(allFeatures > 0, `${allFeatures} features when unfiltered`);

    // Set filter to group1
    await page.evaluate((id) => window.targetGroups.setFilter(id), group1.id);
    await new Promise(r => setTimeout(r, 200));

    const activeFilter = await page.evaluate(() => window.targetGroups.getActiveFilter());
    assert(activeFilter !== null, 'Filter set to group');

    const filteredFeatures = await page.evaluate(() => {
      return window.targetGroups.getFilteredFeatures().length;
    });
    assert(filteredFeatures === 2, `${filteredFeatures} features when filtered (expected 2)`);

    // Filter chip is highlighted
    const filterChipActive = await page.evaluate(() => {
      const chips = document.querySelectorAll('.tg-filter-chip.active');
      return chips.length === 1;
    });
    assert(filterChipActive, 'Active filter chip highlighted');

    // Clear filter
    await page.evaluate(() => window.targetGroups.setFilter(null));
    const clearedFilter = await page.evaluate(() => window.targetGroups.getActiveFilter());
    assert(clearedFilter === null, 'Filter cleared');

    const allFeaturesAgain = await page.evaluate(() => {
      return window.targetGroups.getFilteredFeatures().length;
    });
    assert(allFeaturesAgain === allFeatures, 'All features shown after clearing filter');

    // State persistence
    const savedState = await page.evaluate(() => localStorage.getItem('target-groups-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-066: Target Grouping and Organization - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
