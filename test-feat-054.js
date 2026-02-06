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

    // === AC1: Drag-drop widgets ===
    console.log('\n=== AC1: Drag-drop widgets ===');

    // Check dashboardLayout API exists
    const hasAPI = await page.evaluate(() => typeof window.dashboardLayout === 'object');
    assert(hasAPI, 'dashboardLayout API exists on window');

    // Check layout toggle button exists
    const hasToggleBtn = await page.$('#layout-toggle-btn');
    assert(hasToggleBtn !== null, 'Layout toggle button exists');

    // Check toggle button is in the header
    const btnInHeader = await page.evaluate(() => {
      const btn = document.getElementById('layout-toggle-btn');
      const header = document.querySelector('header, .header');
      return header && header.contains(btn);
    });
    assert(btnInHeader, 'Layout toggle button is in header');

    // Check widgets have layout IDs
    const widgetsHaveIds = await page.evaluate(() => {
      const container = document.querySelector('main.container');
      const children = Array.from(container.children);
      return children.every(child => child.dataset.layoutId) && children.length > 0;
    });
    assert(widgetsHaveIds, 'All widgets have layout-id data attributes');

    // Check widgets have default order
    const widgetsHaveOrder = await page.evaluate(() => {
      const container = document.querySelector('main.container');
      const children = Array.from(container.children);
      return children.every(child => child.dataset.layoutDefaultOrder !== undefined);
    });
    assert(widgetsHaveOrder, 'All widgets have default order data attributes');

    // Enter layout edit mode
    await page.click('#layout-toggle-btn');
    await new Promise(r => setTimeout(r, 500));

    const isEditMode = await page.evaluate(() => document.body.classList.contains('layout-edit-mode'));
    assert(isEditMode, 'Clicking toggle enters layout edit mode');

    // Check widgets are draggable in edit mode
    const areDraggable = await page.evaluate(() => {
      const container = document.querySelector('main.container');
      const children = Array.from(container.children);
      return children.some(child => child.getAttribute('draggable') === 'true');
    });
    assert(areDraggable, 'Widgets are draggable in edit mode');

    // Check toolbar appears
    const hasToolbar = await page.$('#layout-toolbar');
    assert(hasToolbar !== null, 'Layout toolbar appears in edit mode');

    // Check toolbar has save, reset, and cancel buttons
    const toolbarButtons = await page.evaluate(() => {
      const toolbar = document.getElementById('layout-toolbar');
      if (!toolbar) return { save: false, reset: false, cancel: false };
      const text = toolbar.textContent;
      return {
        save: text.includes('Save'),
        reset: text.includes('Reset'),
        cancel: text.includes('Cancel')
      };
    });
    assert(toolbarButtons.save, 'Toolbar has Save button');
    assert(toolbarButtons.reset, 'Toolbar has Reset button');
    assert(toolbarButtons.cancel, 'Toolbar has Cancel button');

    // Test drag-drop by programmatically reordering widgets
    const initialOrder = await page.evaluate(() => {
      const container = document.querySelector('main.container');
      return Array.from(container.children).map(c => c.dataset.layoutId);
    });
    assert(initialOrder.length > 5, `Dashboard has ${initialOrder.length} widgets`);

    // Simulate a drag-drop reorder programmatically
    await page.evaluate(() => {
      const container = document.querySelector('main.container');
      const children = Array.from(container.children);
      if (children.length >= 3) {
        // Move first widget after second
        container.insertBefore(children[1], children[0]);
      }
    });
    await new Promise(r => setTimeout(r, 300));

    const reorderedOrder = await page.evaluate(() => {
      const container = document.querySelector('main.container');
      return Array.from(container.children).map(c => c.dataset.layoutId);
    });
    assert(
      reorderedOrder[0] === initialOrder[1] && reorderedOrder[1] === initialOrder[0],
      'Widgets can be reordered (first two swapped)'
    );

    // === AC2: Save layouts ===
    console.log('\n=== AC2: Save layouts ===');

    // Clear any saved layout first
    await page.evaluate(() => localStorage.removeItem('dashboard-layout-order'));

    // Save the current (reordered) layout
    await page.evaluate(() => window.dashboardLayout.saveLayout());
    await new Promise(r => setTimeout(r, 500));

    // Check layout was saved to localStorage
    const savedLayout = await page.evaluate(() => {
      const saved = localStorage.getItem('dashboard-layout-order');
      return saved ? JSON.parse(saved) : null;
    });
    assert(savedLayout !== null, 'Layout saved to localStorage');
    assert(Array.isArray(savedLayout), 'Saved layout is an array');
    assert(savedLayout.length > 5, `Saved layout has ${savedLayout ? savedLayout.length : 0} entries`);
    assert(
      savedLayout[0] === reorderedOrder[0],
      'Saved layout matches reordered state'
    );

    // Check edit mode was exited after save
    const exitedAfterSave = await page.evaluate(() => !document.body.classList.contains('layout-edit-mode'));
    assert(exitedAfterSave, 'Edit mode exited after saving');

    // Reload and verify layout persistence
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    const afterReloadOrder = await page.evaluate(() => {
      const container = document.querySelector('main.container');
      return Array.from(container.children).map(c => c.dataset.layoutId);
    });
    assert(
      afterReloadOrder[0] === reorderedOrder[0] && afterReloadOrder[1] === reorderedOrder[1],
      'Layout persists after page reload'
    );

    // === AC3: Reset to default ===
    console.log('\n=== AC3: Reset to default ===');

    // Enter edit mode and reset
    await page.evaluate(() => window.dashboardLayout.toggleLayoutEditMode());
    await new Promise(r => setTimeout(r, 300));

    await page.evaluate(() => window.dashboardLayout.resetLayout());
    await new Promise(r => setTimeout(r, 500));

    // Check layout was reset
    const afterResetOrder = await page.evaluate(() => {
      const container = document.querySelector('main.container');
      return Array.from(container.children).map(c => c.dataset.layoutId);
    });
    assert(
      afterResetOrder[0] === initialOrder[0] && afterResetOrder[1] === initialOrder[1],
      'Layout reset to default order'
    );

    // Check localStorage was cleared
    const clearedStorage = await page.evaluate(() => localStorage.getItem('dashboard-layout-order'));
    assert(clearedStorage === null, 'localStorage cleared after reset');

    // Check edit mode exited after reset
    const exitedAfterReset = await page.evaluate(() => !document.body.classList.contains('layout-edit-mode'));
    assert(exitedAfterReset, 'Edit mode exited after reset');

    // Check toolbar removed
    const toolbarGone = await page.$('#layout-toolbar');
    assert(toolbarGone === null, 'Toolbar removed after exiting edit mode');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=====================================================');
  console.log('feat-054: Customizable Dashboard Layout - Test Results');
  console.log('=====================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
