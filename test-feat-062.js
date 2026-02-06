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

    const hasAPI = await page.evaluate(() => typeof window.prdTemplates === 'object');
    assert(hasAPI, 'prdTemplates API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('prd-templates-card'));
    assert(hasCard, 'PRD templates card rendered');

    // === AC1: Pre-built Templates ===
    console.log('\n=== AC1: Pre-built Templates ===');

    // Check builtin templates exist
    const builtinCount = await page.evaluate(() => window.prdTemplates.getBuiltinTemplates().length);
    assert(builtinCount >= 5, `${builtinCount} pre-built templates available (>= 5)`);

    // Check template grid rendered
    const builtinCards = await page.evaluate(() => document.getElementById('pt-builtin-grid').querySelectorAll('.pt-template-card').length);
    assert(builtinCards >= 5, `${builtinCards} builtin template cards rendered`);

    // Check templates have required fields
    const templateFields = await page.evaluate(() => {
      const templates = window.prdTemplates.getBuiltinTemplates();
      return templates.every(t => t.id && t.name && t.category && t.content);
    });
    assert(templateFields, 'All templates have id, name, category, content');

    // Check specific template types
    const hasFeatureTemplate = await page.evaluate(() => {
      const templates = window.prdTemplates.getBuiltinTemplates();
      return templates.some(t => t.name.includes('Feature'));
    });
    assert(hasFeatureTemplate, 'Feature Specification template exists');

    const hasBugTemplate = await page.evaluate(() => {
      const templates = window.prdTemplates.getBuiltinTemplates();
      return templates.some(t => t.name.includes('Bug'));
    });
    assert(hasBugTemplate, 'Bug Fix template exists');

    const hasApiTemplate = await page.evaluate(() => {
      const templates = window.prdTemplates.getBuiltinTemplates();
      return templates.some(t => t.name.includes('API'));
    });
    assert(hasApiTemplate, 'API Design template exists');

    // Test preview
    const firstTemplateId = await page.evaluate(() => window.prdTemplates.getBuiltinTemplates()[0].id);
    await page.evaluate((id) => window.prdTemplates.preview(id), firstTemplateId);
    await new Promise(r => setTimeout(r, 300));

    const previewVisible = await page.evaluate(() => {
      const preview = document.getElementById('pt-preview');
      return preview && preview.classList.contains('visible');
    });
    assert(previewVisible, 'Template preview shows on click');

    const previewContent = await page.evaluate(() => {
      return document.getElementById('pt-preview-content').textContent.length;
    });
    assert(previewContent > 50, 'Preview shows template content');

    // Test use template
    const usedContent = await page.evaluate((id) => window.prdTemplates.use(id), firstTemplateId);
    assert(usedContent && usedContent.length > 50, 'Use template returns content');

    // Test getTemplate
    const gotTemplate = await page.evaluate((id) => {
      const t = window.prdTemplates.getTemplate(id);
      return t && t.name && t.content;
    }, firstTemplateId);
    assert(gotTemplate, 'getTemplate returns template by ID');

    // Test getAllTemplates
    const allTemplates = await page.evaluate(() => window.prdTemplates.getAllTemplates().length);
    assert(allTemplates >= 5, `getAllTemplates returns ${allTemplates} templates`);

    // === AC2: Custom Template Creation ===
    console.log('\n=== AC2: Custom Template Creation ===');

    // Test create modal
    await page.evaluate(() => window.prdTemplates.openCreate());
    await new Promise(r => setTimeout(r, 300));

    const createModalVisible = await page.evaluate(() => {
      const modal = document.getElementById('pt-create-modal');
      return modal && modal.classList.contains('visible');
    });
    assert(createModalVisible, 'Create template modal opens');

    // Check create form fields
    const hasNameInput = await page.$('#pt-create-name');
    assert(hasNameInput !== null, 'Create form has name input');

    const hasCategoryInput = await page.$('#pt-create-category');
    assert(hasCategoryInput !== null, 'Create form has category input');

    const hasDescInput = await page.$('#pt-create-desc');
    assert(hasDescInput !== null, 'Create form has description input');

    const hasContentInput = await page.$('#pt-create-content');
    assert(hasContentInput !== null, 'Create form has content textarea');

    // Close modal
    await page.evaluate(() => window.prdTemplates.closeCreate());
    await new Promise(r => setTimeout(r, 200));

    const createModalClosed = await page.evaluate(() => {
      return !document.getElementById('pt-create-modal').classList.contains('visible');
    });
    assert(createModalClosed, 'Create modal closes');

    // Create custom template programmatically
    const customTemplate = await page.evaluate(() => {
      return window.prdTemplates.createCustomTemplate(
        'My Custom Template',
        'Testing',
        'A test template',
        '# Custom PRD\n\n## Overview\nCustom content here'
      );
    });
    assert(customTemplate && customTemplate.id, 'Custom template created with ID');
    assert(customTemplate.name === 'My Custom Template', 'Custom template has correct name');

    // Verify custom template appears in grid
    const customCards = await page.evaluate(() => {
      return document.getElementById('pt-custom-grid').querySelectorAll('.pt-template-card').length;
    });
    assert(customCards >= 1, `${customCards} custom template cards in grid`);

    // Verify custom template in getAllTemplates
    const allWithCustom = await page.evaluate(() => {
      return window.prdTemplates.getAllTemplates().some(t => t.name === 'My Custom Template');
    });
    assert(allWithCustom, 'Custom template appears in getAllTemplates');

    // Create a second custom template
    const custom2 = await page.evaluate(() => {
      return window.prdTemplates.createCustomTemplate(
        'Second Template',
        'Product',
        'Another template',
        '# Second\n\nContent here'
      );
    });
    assert(custom2 !== null, 'Second custom template created');

    // Delete custom template
    await page.evaluate((id) => window.prdTemplates.deleteTemplate(id), custom2.id);
    const afterDelete = await page.evaluate(() => {
      return !window.prdTemplates.getAllTemplates().some(t => t.name === 'Second Template');
    });
    assert(afterDelete, 'Custom template deleted successfully');

    // State persistence
    const savedState = await page.evaluate(() => {
      return localStorage.getItem('prd-templates-config') !== null;
    });
    assert(savedState, 'State persisted to localStorage');

    // === AC3: Share Templates ===
    console.log('\n=== AC3: Share Templates ===');

    // Test export
    const exportedJson = await page.evaluate((id) => {
      return window.prdTemplates.exportTemplate(id);
    }, firstTemplateId);
    assert(exportedJson !== null, 'Export returns JSON string');

    const exportParsed = JSON.parse(exportedJson);
    assert(exportParsed.prdTemplate === true, 'Export has prdTemplate marker');
    assert(exportParsed.version === 1, 'Export has version number');
    assert(exportParsed.template.name !== undefined, 'Export has template name');
    assert(exportParsed.template.content !== undefined, 'Export has template content');

    // Test share UI
    await page.evaluate((id) => window.prdTemplates.share(id), firstTemplateId);
    await new Promise(r => setTimeout(r, 300));

    const shareAreaVisible = await page.evaluate(() => {
      return document.getElementById('pt-share-area').classList.contains('visible');
    });
    assert(shareAreaVisible, 'Share area becomes visible');

    const shareCodeContent = await page.evaluate(() => {
      return document.getElementById('pt-share-code').value.length;
    });
    assert(shareCodeContent > 0, 'Share code has content');

    // Test import
    const importedTemplate = await page.evaluate((json) => {
      return window.prdTemplates.importTemplate(json);
    }, exportedJson);
    assert(importedTemplate !== null, 'Import from JSON works');
    assert(importedTemplate.name === exportParsed.template.name, 'Imported template has correct name');

    // Verify imported template in shared grid
    const sharedCards = await page.evaluate(() => {
      return document.getElementById('pt-shared-grid').querySelectorAll('.pt-template-card').length;
    });
    assert(sharedCards >= 1, `${sharedCards} shared template cards in grid`);

    // Test import modal
    await page.evaluate(() => window.prdTemplates.openImport());
    await new Promise(r => setTimeout(r, 200));

    const importModalVisible = await page.evaluate(() => {
      return document.getElementById('pt-import-modal').classList.contains('visible');
    });
    assert(importModalVisible, 'Import modal opens');

    const hasImportTextarea = await page.$('#pt-import-json');
    assert(hasImportTextarea !== null, 'Import modal has JSON textarea');

    await page.evaluate(() => window.prdTemplates.closeImport());

    // Test invalid import
    const invalidImport = await page.evaluate(() => {
      return window.prdTemplates.importTemplate('not valid json');
    });
    assert(invalidImport === null, 'Invalid JSON import returns null');

    const invalidFormat = await page.evaluate(() => {
      return window.prdTemplates.importTemplate('{"notATemplate": true}');
    });
    assert(invalidFormat === null, 'Invalid format import returns null');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-062: PRD Template Library - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
