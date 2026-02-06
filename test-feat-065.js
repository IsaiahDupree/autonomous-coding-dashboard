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

    const hasAPI = await page.evaluate(() => typeof window.targetClone === 'object');
    assert(hasAPI, 'targetClone API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('target-clone-card'));
    assert(hasCard, 'Target clone card rendered');

    const hasSourceSelect = await page.$('#tc-source-select');
    assert(hasSourceSelect !== null, 'Source selector exists');

    // Check source options populated
    const optionCount = await page.evaluate(() => document.getElementById('tc-source-select').options.length);
    assert(optionCount > 1, `${optionCount} source options (> 1 including placeholder)`);

    // === AC1: Clone Existing Target ===
    console.log('\n=== AC1: Clone Existing Target ===');

    // Clone programmatically
    const cloneResult = await page.evaluate(() => {
      return window.targetClone.cloneTarget('feat-001', {
        name: 'My Cloned Target',
        description: 'A cloned version of feat-001',
        category: 'custom',
        priority: 5,
      });
    });
    assert(cloneResult !== null, 'Clone returns clone object');
    assert(cloneResult.id.startsWith('clone-'), `Clone has generated ID: ${cloneResult.id}`);
    assert(cloneResult.sourceId === 'feat-001', 'Clone references source ID');
    assert(cloneResult.name === 'My Cloned Target', 'Clone has custom name');
    assert(cloneResult.createdAt !== undefined, 'Clone has creation timestamp');

    // Clone appears in list
    const clonedTargets = await page.evaluate(() => window.targetClone.getClonedTargets());
    assert(clonedTargets.length >= 1, `${clonedTargets.length} cloned targets`);

    // Clone card rendered
    const cloneItems = await page.evaluate(() => {
      return document.getElementById('tc-clones-list').querySelectorAll('.tc-clone-item').length;
    });
    assert(cloneItems >= 1, `${cloneItems} clone items in UI`);

    // Clone another target
    const clone2 = await page.evaluate(() => {
      return window.targetClone.cloneTarget('feat-002', {
        name: 'Second Clone',
        category: 'testing',
      });
    });
    assert(clone2 !== null, 'Second clone created');

    // Get clone by ID
    const retrieved = await page.evaluate((id) => window.targetClone.getClone(id), cloneResult.id);
    assert(retrieved !== null, 'getClone retrieves by ID');
    assert(retrieved.name === 'My Cloned Target', 'Retrieved clone has correct name');

    // Source select interaction
    await page.evaluate(() => {
      const select = document.getElementById('tc-source-select');
      select.value = 'feat-001';
      window.targetClone.onSourceSelect();
    });
    await new Promise(r => setTimeout(r, 300));

    const customizeVisible = await page.evaluate(() => {
      return document.getElementById('tc-customize').classList.contains('visible');
    });
    assert(customizeVisible, 'Customization form appears on source select');

    // === AC2: Modify Paths and Settings ===
    console.log('\n=== AC2: Modify Paths and Settings ===');

    // Clone with path and settings
    const cloneWithSettings = await page.evaluate(() => {
      return window.targetClone.cloneTarget('feat-003', {
        name: 'Clone with Settings',
        path: '/projects/my-app',
        settings: { timeout: 30000, retries: 3, env: 'staging' },
      });
    });
    assert(cloneWithSettings.path === '/projects/my-app', 'Clone has custom path');
    assert(cloneWithSettings.settings.timeout === 30000, 'Clone has custom settings');
    assert(cloneWithSettings.settings.retries === 3, 'Clone settings preserved');

    // Update clone
    const updateResult = await page.evaluate((id) => {
      return window.targetClone.updateClone(id, {
        name: 'Updated Clone Name',
        path: '/new/path',
        settings: { timeout: 60000 },
      });
    }, cloneWithSettings.id);
    assert(updateResult === true, 'Update clone returns true');

    // Verify update
    const updated = await page.evaluate((id) => window.targetClone.getClone(id), cloneWithSettings.id);
    assert(updated.name === 'Updated Clone Name', 'Clone name updated');
    assert(updated.path === '/new/path', 'Clone path updated');
    assert(updated.settings.timeout === 60000, 'Clone settings updated');

    // Path input exists
    const hasPathInput = await page.$('#tc-clone-path');
    assert(hasPathInput !== null, 'Path input field exists');

    // Settings input exists
    const hasSettingsInput = await page.$('#tc-clone-settings');
    assert(hasSettingsInput !== null, 'Settings input field exists');

    // Category input
    const hasCategoryInput = await page.$('#tc-clone-category');
    assert(hasCategoryInput !== null, 'Category input field exists');

    // Priority input
    const hasPriorityInput = await page.$('#tc-clone-priority');
    assert(hasPriorityInput !== null, 'Priority input field exists');

    // Delete clone
    const deleteResult = await page.evaluate((id) => window.targetClone.deleteClone(id), clone2.id);
    assert(deleteResult === true, 'Delete clone returns true');

    const afterDelete = await page.evaluate((id) => window.targetClone.getClone(id), clone2.id);
    assert(afterDelete === null, 'Deleted clone no longer retrievable');

    // === AC3: Preserve Feature List ===
    console.log('\n=== AC3: Preserve Feature List ===');

    // Check cloned target has features (acceptance criteria)
    assert(cloneResult.features !== undefined, 'Clone has features array');
    assert(cloneResult.features.length > 0, `Clone preserved ${cloneResult.features.length} features`);
    assert(cloneResult.preservedFeatureList === true, 'Clone has preservedFeatureList flag');

    // Features have required structure
    const featureItem = cloneResult.features[0];
    assert(featureItem.id !== undefined, 'Feature item has id');
    assert(featureItem.text !== undefined, 'Feature item has text');
    assert(featureItem.included !== undefined, 'Feature item has included flag');

    // Feature list UI
    const hasFeatureList = await page.evaluate(() => !!document.getElementById('tc-feature-list'));
    assert(hasFeatureList, 'Feature list container exists');

    // Check feature checkboxes rendered (after source select)
    const featureChecks = await page.evaluate(() => {
      return document.querySelectorAll('.tc-feature-check').length;
    });
    assert(featureChecks > 0, `${featureChecks} feature checkboxes rendered`);

    // Clone button exists
    const hasCloneBtn = await page.$('#tc-clone-btn');
    assert(hasCloneBtn !== null, 'Clone button exists');

    // === General ===
    console.log('\n=== General ===');

    // Clone history
    const history = await page.evaluate(() => window.targetClone.getCloneHistory());
    assert(history.length > 0, `${history.length} clone history entries`);

    // History has required fields
    const historyItem = history[0];
    assert(historyItem.action !== undefined, 'History item has action');
    assert(historyItem.timestamp !== undefined, 'History item has timestamp');
    assert(historyItem.name !== undefined, 'History item has name');

    // History list rendered
    const historyRendered = await page.evaluate(() => {
      return document.getElementById('tc-history-list').querySelectorAll('.tc-history-item').length;
    });
    assert(historyRendered > 0, `${historyRendered} history items rendered`);

    // State persistence
    const savedState = await page.evaluate(() => localStorage.getItem('target-clone-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-065: Target Cloning with Customization - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
