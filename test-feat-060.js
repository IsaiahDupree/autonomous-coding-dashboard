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

    // === AC1: Import from Notion ===
    console.log('\n=== AC1: Import from Notion ===');

    // Check API exists
    const hasAPI = await page.evaluate(() => typeof window.prdImport === 'object');
    assert(hasAPI, 'prdImport API exists on window');

    // Check card rendered
    const hasCard = await page.evaluate(() => !!document.getElementById('prd-import-card'));
    assert(hasCard, 'PRD import card rendered');

    // Check Notion tab exists
    const hasNotionTab = await page.evaluate(() => {
      const tabs = document.querySelectorAll('.pi-tab');
      return Array.from(tabs).some(t => t.textContent.includes('Notion'));
    });
    assert(hasNotionTab, 'Notion tab exists');

    // Check Notion panel exists
    const hasNotionPanel = await page.evaluate(() => !!document.getElementById('pi-panel-notion'));
    assert(hasNotionPanel, 'Notion panel exists');

    // Check Notion API key input
    const hasNotionApiKey = await page.$('#pi-notion-api-key');
    assert(hasNotionApiKey !== null, 'Notion API key input exists');

    // Check Notion page URL input
    const hasNotionPageUrl = await page.$('#pi-notion-page-url');
    assert(hasNotionPageUrl !== null, 'Notion page URL input exists');

    // Check Notion content textarea
    const hasNotionContent = await page.$('#pi-notion-content');
    assert(hasNotionContent !== null, 'Notion content textarea exists');

    // Check Notion import button
    const hasNotionImportBtn = await page.$('#pi-notion-import-btn');
    assert(hasNotionImportBtn !== null, 'Notion import button exists');

    // Test Notion demo loading
    await page.evaluate(() => window.prdImport.loadNotionDemo());
    await new Promise(r => setTimeout(r, 300));

    const notionContentValue = await page.evaluate(() => document.getElementById('pi-notion-content').value);
    assert(notionContentValue.includes('Authentication'), 'Notion demo content loaded');

    // Test Notion import
    const notionResult = await page.evaluate(() => {
      const result = window.prdImport.importNotion();
      return result !== null;
    });
    assert(notionResult, 'Notion import produces result');

    // Check preview appears
    const notionPreviewVisible = await page.evaluate(() => {
      const preview = document.getElementById('pi-preview');
      return preview && preview.classList.contains('visible');
    });
    assert(notionPreviewVisible, 'Preview shows after Notion import');

    // Check preview badge says Notion
    const notionBadge = await page.evaluate(() => {
      return document.getElementById('pi-preview-badge').textContent;
    });
    assert(notionBadge === 'Notion', 'Preview badge shows Notion');

    // Test parseNotion function directly
    const notionParsed = await page.evaluate(() => {
      const parsed = window.prdImport.parseNotion('# Test PRD\n\n## Overview\nThis is a test.\n\n## Features\n- Feature 1\n- Feature 2');
      return {
        title: parsed.title,
        sectionCount: parsed.sections.length,
        hasOverview: parsed.sections.some(s => s.heading === 'Overview'),
      };
    });
    assert(notionParsed.title === 'Test PRD', 'parseNotion extracts title');
    assert(notionParsed.sectionCount >= 2, `parseNotion extracts ${notionParsed.sectionCount} sections`);
    assert(notionParsed.hasOverview, 'parseNotion extracts Overview section');

    // === AC2: Import from Google Docs ===
    console.log('\n=== AC2: Import from Google Docs ===');

    // Switch to Google Docs tab
    await page.evaluate(() => window.prdImport.switchTab('google-docs'));
    await new Promise(r => setTimeout(r, 300));

    // Check Google Docs tab is active
    const gdocsTabActive = await page.evaluate(() => {
      const tab = document.querySelector('.pi-tab[data-tab="google-docs"]');
      return tab && tab.classList.contains('active');
    });
    assert(gdocsTabActive, 'Google Docs tab becomes active');

    // Check Google Docs panel is visible
    const gdocsPanelVisible = await page.evaluate(() => {
      const panel = document.getElementById('pi-panel-google-docs');
      return panel && panel.classList.contains('active');
    });
    assert(gdocsPanelVisible, 'Google Docs panel is visible');

    // Check Google Docs URL input
    const hasGdocsUrl = await page.$('#pi-gdocs-url');
    assert(hasGdocsUrl !== null, 'Google Docs URL input exists');

    // Check Google Docs content textarea
    const hasGdocsContent = await page.$('#pi-gdocs-content');
    assert(hasGdocsContent !== null, 'Google Docs content textarea exists');

    // Check Google Docs import button
    const hasGdocsImportBtn = await page.$('#pi-gdocs-import-btn');
    assert(hasGdocsImportBtn !== null, 'Google Docs import button exists');

    // Test Google Docs demo
    await page.evaluate(() => window.prdImport.loadGoogleDocsDemo());
    await new Promise(r => setTimeout(r, 300));

    const gdocsContentValue = await page.evaluate(() => document.getElementById('pi-gdocs-content').value);
    assert(gdocsContentValue.includes('E-Commerce'), 'Google Docs demo content loaded');

    // Test Google Docs import
    const gdocsResult = await page.evaluate(() => {
      const result = window.prdImport.importGoogleDocs();
      return result !== null;
    });
    assert(gdocsResult, 'Google Docs import produces result');

    // Test parseGoogleDocs with HTML content
    const gdocsParsed = await page.evaluate(() => {
      const html = '<h1>My Document</h1><h2>Section 1</h2><p>Content here</p><h2>Section 2</h2><p>More content</p>';
      const parsed = window.prdImport.parseGoogleDocs(html);
      return {
        title: parsed.title,
        sectionCount: parsed.sections.length,
      };
    });
    assert(gdocsParsed.title === 'My Document', 'parseGoogleDocs extracts title from HTML');
    assert(gdocsParsed.sectionCount >= 2, `parseGoogleDocs extracts ${gdocsParsed.sectionCount} sections from HTML`);

    // Test parseGoogleDocs with plain text (falls back to markdown-like parsing)
    const gdocsPlainParsed = await page.evaluate(() => {
      const text = '# Plain Doc\n\n## Section A\nPlain text content\n\n## Section B\nMore plain text';
      const parsed = window.prdImport.parseGoogleDocs(text);
      return {
        title: parsed.title,
        sectionCount: parsed.sections.length,
      };
    });
    assert(gdocsPlainParsed.title === 'Plain Doc', 'parseGoogleDocs handles plain text');

    // === AC3: Import from Markdown ===
    console.log('\n=== AC3: Import from Markdown ===');

    // Switch to Markdown tab
    await page.evaluate(() => window.prdImport.switchTab('markdown'));
    await new Promise(r => setTimeout(r, 300));

    // Check Markdown tab is active
    const mdTabActive = await page.evaluate(() => {
      const tab = document.querySelector('.pi-tab[data-tab="markdown"]');
      return tab && tab.classList.contains('active');
    });
    assert(mdTabActive, 'Markdown tab becomes active');

    // Check Markdown panel is visible
    const mdPanelVisible = await page.evaluate(() => {
      const panel = document.getElementById('pi-panel-markdown');
      return panel && panel.classList.contains('active');
    });
    assert(mdPanelVisible, 'Markdown panel is visible');

    // Check file dropzone exists
    const hasDropzone = await page.$('#pi-markdown-dropzone');
    assert(hasDropzone !== null, 'Markdown file dropzone exists');

    // Check markdown content textarea
    const hasMdContent = await page.$('#pi-markdown-content');
    assert(hasMdContent !== null, 'Markdown content textarea exists');

    // Check markdown import button
    const hasMdImportBtn = await page.$('#pi-markdown-import-btn');
    assert(hasMdImportBtn !== null, 'Markdown import button exists');

    // Test Markdown demo
    await page.evaluate(() => window.prdImport.loadMarkdownDemo());
    await new Promise(r => setTimeout(r, 300));

    const mdContentValue = await page.evaluate(() => document.getElementById('pi-markdown-content').value);
    assert(mdContentValue.includes('Mobile App'), 'Markdown demo content loaded');

    // Test Markdown import
    const mdResult = await page.evaluate(() => {
      const result = window.prdImport.importMarkdown();
      return result !== null;
    });
    assert(mdResult, 'Markdown import produces result');

    // Test parseMarkdown with frontmatter
    const mdParsed = await page.evaluate(() => {
      const md = '---\ntitle: Test Spec\nauthor: Test\nversion: 1.0\n---\n\n# Test Spec\n\n## Overview\nThis is a test.\n\n## Features\n- Feature A\n- Feature B';
      const parsed = window.prdImport.parseMarkdown(md);
      return {
        title: parsed.title,
        sectionCount: parsed.sections.length,
        hasMetadata: Object.keys(parsed.metadata).length > 0,
        metadataKeys: Object.keys(parsed.metadata),
      };
    });
    assert(mdParsed.title === 'Test Spec', 'parseMarkdown extracts title from frontmatter');
    assert(mdParsed.sectionCount >= 2, `parseMarkdown extracts ${mdParsed.sectionCount} sections`);
    assert(mdParsed.hasMetadata, 'parseMarkdown extracts YAML frontmatter metadata');
    assert(mdParsed.metadataKeys.includes('author'), 'Metadata includes author field');
    assert(mdParsed.metadataKeys.includes('version'), 'Metadata includes version field');

    // Test parseMarkdown without frontmatter
    const mdSimpleParsed = await page.evaluate(() => {
      const md = '# Simple Doc\n\n## Section 1\nContent here\n\n### Subsection\nNested content';
      const parsed = window.prdImport.parseMarkdown(md);
      return {
        title: parsed.title,
        sectionCount: parsed.sections.length,
      };
    });
    assert(mdSimpleParsed.title === 'Simple Doc', 'parseMarkdown handles simple markdown');
    assert(mdSimpleParsed.sectionCount >= 2, 'parseMarkdown handles subsections');

    // === General features ===
    console.log('\n=== General Features ===');

    // Check tab switching works (switch to Notion)
    await page.evaluate(() => window.prdImport.switchTab('notion'));
    await new Promise(r => setTimeout(r, 200));
    const notionTabActive = await page.evaluate(() => {
      const tab = document.querySelector('.pi-tab[data-tab="notion"]');
      return tab && tab.classList.contains('active');
    });
    assert(notionTabActive, 'Tab switching back to Notion works');

    // Check import history section exists
    const hasHistory = await page.evaluate(() => !!document.getElementById('pi-history'));
    assert(hasHistory, 'Import history section exists');

    // Check import history has items (after demo imports)
    const historyItems = await page.evaluate(() => {
      return document.querySelectorAll('.pi-history-item').length;
    });
    assert(historyItems >= 3, `${historyItems} import history items after demos`);

    // Check state persistence
    const savedState = await page.evaluate(() => {
      const saved = localStorage.getItem('prd-import-config');
      return saved !== null;
    });
    assert(savedState, 'State persisted to localStorage');

    // Check getState
    const stateObj = await page.evaluate(() => window.prdImport.getState());
    assert(stateObj.importHistory.length >= 3, 'getState returns import history');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-060: PRD Import from Multiple Formats - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
