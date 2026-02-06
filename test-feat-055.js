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

    // === AC1: Show all acceptance criteria ===
    console.log('\n=== AC1: Show all acceptance criteria ===');

    // Check featureDetailModal API exists
    const hasAPI = await page.evaluate(() => typeof window.featureDetailModal === 'object');
    assert(hasAPI, 'featureDetailModal API exists on window');

    // Check modal element exists
    const hasModal = await page.$('#feature-detail-modal');
    assert(hasModal !== null, 'Feature detail modal element exists');

    // Check modal is initially hidden
    const initiallyHidden = await page.evaluate(() =>
      document.getElementById('feature-detail-modal').style.display === 'none'
    );
    assert(initiallyHidden, 'Modal is initially hidden');

    // Check feature rows are clickable
    const clickableRows = await page.evaluate(() => {
      const rows = document.querySelectorAll('#features-tbody tr[data-feature-id]');
      return rows.length;
    });
    assert(clickableRows > 0, `${clickableRows} feature rows are clickable`);

    // Open a feature detail by clicking a row
    const firstFeatureId = await page.evaluate(() => {
      const row = document.querySelector('#features-tbody tr[data-feature-id]');
      return row ? row.dataset.featureId : null;
    });

    if (firstFeatureId) {
      await page.evaluate((id) => {
        window.featureDetailModal.open(id);
      }, firstFeatureId);
      await new Promise(r => setTimeout(r, 500));

      // Check modal is now visible
      const isVisible = await page.evaluate(() =>
        document.getElementById('feature-detail-modal').style.display === 'flex'
      );
      assert(isVisible, 'Modal opens when feature is clicked');

      // Check title shows feature ID and description
      const title = await page.evaluate(() =>
        document.getElementById('fdm-title').textContent
      );
      assert(title.includes('feat-'), `Modal title shows feature ID: "${title.substring(0, 50)}"`);

      // Check acceptance criteria section exists
      const hasCriteria = await page.evaluate(() => {
        const section = document.getElementById('fdm-criteria-section');
        return section !== null;
      });
      assert(hasCriteria, 'Acceptance criteria section exists');

      // Check acceptance criteria items are displayed
      const criteriaCount = await page.evaluate(() => {
        const items = document.querySelectorAll('.fdm-criteria-item');
        return items.length;
      });
      assert(criteriaCount > 0, `${criteriaCount} acceptance criteria items displayed`);

      // Check criteria have icons
      const hasIcons = await page.evaluate(() => {
        const icons = document.querySelectorAll('.fdm-criteria-icon');
        return icons.length > 0;
      });
      assert(hasIcons, 'Criteria items have status icons');

      // Check meta info (status, category, priority, ID)
      const metaItems = await page.evaluate(() => {
        const items = document.querySelectorAll('.fdm-meta-item');
        return items.length;
      });
      assert(metaItems >= 4, `${metaItems} meta info items displayed (>= 4)`);

      // === AC2: Display related code ===
      console.log('\n=== AC2: Display related code ===');

      // Check related files section
      const hasRelatedFiles = await page.evaluate(() => {
        const files = document.querySelectorAll('.fdm-code-file');
        return files.length;
      });
      assert(hasRelatedFiles > 0, `${hasRelatedFiles} related code files displayed`);

      // Check file entries have path and type
      const fileInfo = await page.evaluate(() => {
        const file = document.querySelector('.fdm-code-file');
        if (!file) return null;
        return {
          hasIcon: !!file.querySelector('.fdm-code-file-icon'),
          hasPath: file.textContent.includes('.'),
          hasBadge: !!file.querySelector('.badge'),
        };
      });
      assert(fileInfo && fileInfo.hasIcon, 'File entries have icons');
      assert(fileInfo && fileInfo.hasPath, 'File entries show file path');
      assert(fileInfo && fileInfo.hasBadge, 'File entries show file type badge');

      // Check JSON block exists
      const hasJsonBlock = await page.evaluate(() => {
        const block = document.querySelector('.fdm-code-block');
        return block !== null && block.textContent.includes('"id"');
      });
      assert(hasJsonBlock, 'Feature JSON code block is displayed');

      // === AC3: Edit inline ===
      console.log('\n=== AC3: Edit inline ===');

      // Check edit button exists
      const hasEditBtn = await page.evaluate(() => {
        const actions = document.getElementById('fdm-actions');
        return actions && actions.textContent.includes('Edit');
      });
      assert(hasEditBtn, 'Edit button exists in modal actions');

      // Click Edit to enter edit mode
      await page.evaluate(() => window.featureDetailModal.toggleEdit());
      await new Promise(r => setTimeout(r, 300));

      // Check edit form fields exist
      const editFields = await page.evaluate(() => {
        return {
          description: !!document.getElementById('fdm-edit-description'),
          category: !!document.getElementById('fdm-edit-category'),
          priority: !!document.getElementById('fdm-edit-priority'),
          status: !!document.getElementById('fdm-edit-status'),
          criteria: !!document.getElementById('fdm-edit-criteria'),
        };
      });
      assert(editFields.description, 'Description field in edit mode');
      assert(editFields.category, 'Category field in edit mode');
      assert(editFields.priority, 'Priority field in edit mode');
      assert(editFields.status, 'Status select in edit mode');
      assert(editFields.criteria, 'Acceptance criteria textarea in edit mode');

      // Check Save button exists
      const hasSaveBtn = await page.evaluate(() => {
        const actions = document.getElementById('fdm-actions');
        return actions && actions.textContent.includes('Save');
      });
      assert(hasSaveBtn, 'Save Changes button exists in edit mode');

      // Check Cancel button exists
      const hasCancelBtn = await page.evaluate(() => {
        const actions = document.getElementById('fdm-actions');
        return actions && actions.textContent.includes('Cancel');
      });
      assert(hasCancelBtn, 'Cancel button exists in edit mode');

      // Modify description field
      await page.evaluate(() => {
        const descInput = document.getElementById('fdm-edit-description');
        descInput.value = 'Modified description for testing';
      });

      // Save the edit
      await page.evaluate(() => window.featureDetailModal.saveEdit());
      await new Promise(r => setTimeout(r, 500));

      // Check we're back in view mode with updated description
      const updatedDesc = await page.evaluate(() => {
        const body = document.getElementById('fdm-body');
        return body ? body.textContent.includes('Modified description') : false;
      });
      assert(updatedDesc, 'Saved edits are reflected in view mode');

      // Close modal
      await page.evaluate(() => window.featureDetailModal.close());
      await new Promise(r => setTimeout(r, 300));

      const isClosed = await page.evaluate(() =>
        document.getElementById('feature-detail-modal').style.display === 'none'
      );
      assert(isClosed, 'Modal closes properly');
    } else {
      results.push('  ✗ No feature rows found to test');
      failed++;
    }

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-055: Feature Detail Modal - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
