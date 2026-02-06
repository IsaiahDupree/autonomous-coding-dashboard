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

    const hasAPI = await page.evaluate(() => typeof window.configExportImport === 'object');
    assert(hasAPI, 'configExportImport API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('config-export-card'));
    assert(hasCard, 'Config export card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.cei-tab').length === 3);
    assert(hasTabs, 'Three tabs exist (Export, Import, Versions)');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.cei-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Export all settings ===
    console.log('\n=== AC1: Export all settings ===');

    const categories = await page.evaluate(() => window.configExportImport.getSettingsCategories());
    assert(categories.length > 0, `${categories.length} setting categories`);
    assert(categories.length === 8, 'Has 8 categories');

    const firstCat = categories[0];
    assert(firstCat.id !== undefined, 'Category has id');
    assert(firstCat.name !== undefined, `Category: ${firstCat.name}`);
    assert(firstCat.settingCount > 0, `Settings: ${firstCat.settingCount}`);
    assert(firstCat.description !== undefined, 'Category has description');
    assert(firstCat.exportable === true, 'Category is exportable');

    const allSettings = await page.evaluate(() => window.configExportImport.getAllSettings());
    assert(allSettings.length > 0, `${allSettings.length} total settings`);

    const firstSetting = allSettings[0];
    assert(firstSetting.id !== undefined, 'Setting has id');
    assert(firstSetting.category !== undefined, 'Setting has category');
    assert(firstSetting.key !== undefined, `Key: ${firstSetting.key}`);
    assert(firstSetting.value !== undefined, 'Setting has value');
    assert(firstSetting.type !== undefined, `Type: ${firstSetting.type}`);

    // Export all
    const exported = await page.evaluate(() => window.configExportImport.exportConfig());
    assert(exported.version !== undefined, `Version: ${exported.version}`);
    assert(exported.exportedAt !== undefined, 'Has exportedAt');
    assert(exported.format === 'json', `Format: ${exported.format}`);
    assert(exported.categoryCount > 0, `Categories: ${exported.categoryCount}`);
    assert(exported.settingCount > 0, `Settings: ${exported.settingCount}`);
    assert(exported.settings.length > 0, `${exported.settings.length} settings exported`);
    assert(exported.metadata !== undefined, 'Has metadata');
    assert(exported.metadata.appVersion !== undefined, 'Metadata has app version');
    assert(exported.metadata.checksum !== undefined, 'Metadata has checksum');

    // Export specific categories
    const partialExport = await page.evaluate(() => window.configExportImport.exportConfig({ categories: ['cat-general', 'cat-security'] }));
    assert(partialExport.categoryCount === 2, 'Partial export has 2 categories');
    assert(partialExport.settingCount < exported.settingCount, 'Partial export has fewer settings');

    // Export formats
    const formats = await page.evaluate(() => window.configExportImport.getExportFormats());
    assert(formats.length > 0, `${formats.length} export formats`);
    assert(formats[0].id !== undefined, `Format: ${formats[0].id}`);
    assert(formats[0].name !== undefined, `Format name: ${formats[0].name}`);
    assert(formats[0].extension !== undefined, `Extension: ${formats[0].extension}`);

    // Export list rendered
    const exportList = await page.evaluate(() => !!document.getElementById('cei-export-list'));
    assert(exportList, 'Export list rendered');

    const settingItems = await page.evaluate(() => document.querySelectorAll('.cei-setting-item').length);
    assert(settingItems > 0, `${settingItems} setting items rendered`);

    // === AC2: Import to new instance ===
    console.log('\n=== AC2: Import to new instance ===');

    // Import exported config
    const importResult = await page.evaluate((config) => window.configExportImport.importConfig(config), exported);
    assert(importResult.success === true, 'Import successful');
    assert(importResult.importedAt !== undefined, 'Has importedAt');
    assert(importResult.settingsImported > 0, `Imported ${importResult.settingsImported} settings`);
    assert(importResult.categoriesImported > 0, `Imported ${importResult.categoriesImported} categories`);
    assert(importResult.warnings !== undefined, 'Has warnings array');

    // Import history
    const history = await page.evaluate(() => window.configExportImport.getImportHistory());
    assert(history.length > 0, `${history.length} imports in history`);
    const firstImport = history[0];
    assert(firstImport.id !== undefined, 'Import has id');
    assert(firstImport.timestamp !== undefined, 'Import has timestamp');
    assert(firstImport.version !== undefined, `Import version: ${firstImport.version}`);
    assert(firstImport.settingsCount > 0, `Settings: ${firstImport.settingsCount}`);
    assert(firstImport.status === 'success', 'Import status: success');

    // Invalid import
    const badImport = await page.evaluate(() => window.configExportImport.importConfig({}));
    assert(badImport.success === false, 'Invalid config rejected');
    assert(badImport.error !== undefined, `Error: ${badImport.error}`);

    // Switch to import tab
    await page.evaluate(() => window.configExportImport.setTab('import'));
    await new Promise(r => setTimeout(r, 300));

    const importTabActive = await page.evaluate(() => {
      return document.querySelector('.cei-tab[data-tab="import"]').classList.contains('active');
    });
    assert(importTabActive, 'Import tab becomes active');

    const importList = await page.evaluate(() => !!document.getElementById('cei-import-list'));
    assert(importList, 'Import list rendered');

    const importItems = await page.evaluate(() => document.querySelectorAll('.cei-import-item').length);
    assert(importItems > 0, `${importItems} import items rendered`);

    // === AC3: Version compatibility ===
    console.log('\n=== AC3: Version compatibility ===');

    const versions = await page.evaluate(() => window.configExportImport.getVersions());
    assert(versions.length > 0, `${versions.length} versions`);
    const currentVer = versions.find(v => v.current);
    assert(currentVer !== undefined, `Current version: ${currentVer.version}`);
    assert(currentVer.releaseDate !== undefined, 'Version has releaseDate');

    // Check same version compatibility
    const sameCompat = await page.evaluate(() => window.configExportImport.checkCompatibility('2.1.0'));
    assert(sameCompat.compatible === true, 'Same version is compatible');
    assert(sameCompat.needsMigration === false, 'Same version needs no migration');

    // Check minor version compatibility
    const minorCompat = await page.evaluate(() => window.configExportImport.checkCompatibility('2.0.0'));
    assert(minorCompat.compatible === true, 'Minor version is compatible');
    assert(minorCompat.needsMigration === true, 'Minor version needs migration');
    assert(minorCompat.warnings.length > 0, `${minorCompat.warnings.length} warnings for minor`);

    // Check major version compatibility
    const majorCompat = await page.evaluate(() => window.configExportImport.checkCompatibility('1.5.0'));
    assert(majorCompat.compatible === true, 'Previous major version is compatible');
    assert(majorCompat.needsMigration === true, 'Major version needs migration');
    assert(majorCompat.migrations !== undefined, 'Has migration steps');

    // Check incompatible version
    const oldCompat = await page.evaluate(() => window.configExportImport.checkCompatibility('0.5.0'));
    assert(oldCompat.compatible === false, 'Very old version is incompatible');

    // Import with migration
    const migratedImport = await page.evaluate(() => {
      const config = { version: '2.0.0', settingCount: 50, categoryCount: 6, settings: [] };
      return window.configExportImport.importConfig(config);
    });
    assert(migratedImport.success === true, 'Migrated import successful');
    assert(migratedImport.migrated === true, 'Import was migrated');

    // Import incompatible version
    const incompatImport = await page.evaluate(() => {
      const config = { version: '0.5.0', settingCount: 20, settings: [] };
      return window.configExportImport.importConfig(config);
    });
    assert(incompatImport.success === false, 'Incompatible import rejected');

    // Switch to versions tab
    await page.evaluate(() => window.configExportImport.setTab('versions'));
    await new Promise(r => setTimeout(r, 300));

    const verTabActive = await page.evaluate(() => {
      return document.querySelector('.cei-tab[data-tab="versions"]').classList.contains('active');
    });
    assert(verTabActive, 'Versions tab becomes active');

    const verSection = await page.evaluate(() => !!document.getElementById('cei-version-section'));
    assert(verSection, 'Version section rendered');

    const verItems = await page.evaluate(() => document.querySelectorAll('.cei-compat-item').length);
    assert(verItems > 0, `${verItems} version items rendered`);

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.configExportImport.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.currentVersion !== undefined, `Version: ${stateObj.currentVersion}`);
    assert(stateObj.categoryCount > 0, `Categories: ${stateObj.categoryCount}`);
    assert(stateObj.settingCount > 0, `Settings: ${stateObj.settingCount}`);

    const savedState = await page.evaluate(() => localStorage.getItem('config-export-import') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-088: Configuration Export/Import - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
