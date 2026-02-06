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

    const hasAPI = await page.evaluate(() => typeof window.exportReports === 'object');
    assert(hasAPI, 'exportReports API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('export-reports-card'));
    assert(hasCard, 'Export reports card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.er-tab').length === 3);
    assert(hasTabs, 'Three tabs exist (Export, History, Schedules)');

    // === AC1: PDF report generation ===
    console.log('\n=== AC1: PDF report generation ===');

    const pdfContent = await page.evaluate(() => window.exportReports.generatePDFContent());
    assert(pdfContent !== null, 'PDF content generated');
    assert(pdfContent.title === 'Analytics Report', 'PDF has title');
    assert(pdfContent.format === 'pdf', 'PDF format field correct');
    assert(pdfContent.generatedAt !== undefined, 'PDF has generation timestamp');
    assert(pdfContent.sections.length >= 2, `PDF has ${pdfContent.sections.length} sections`);
    assert(pdfContent.metadata.pageCount > 0, `PDF has ${pdfContent.metadata.pageCount} pages`);
    assert(pdfContent.metadata.featureCount > 0, `PDF covers ${pdfContent.metadata.featureCount} features`);

    // Executive summary section
    const hasSummary = pdfContent.sections.some(s => s.heading === 'Executive Summary');
    assert(hasSummary, 'PDF has Executive Summary section');

    // Feature breakdown section
    const hasBreakdown = pdfContent.sections.some(s => s.heading === 'Feature Status Breakdown');
    assert(hasBreakdown, 'PDF has Feature Status Breakdown section');

    // Export PDF (adds to history)
    const pdfResult = await page.evaluate(() => window.exportReports.exportPDF());
    assert(pdfResult !== null, 'exportPDF returns content');

    // PDF card in export tab
    const hasPdfCard = await page.evaluate(() => !!document.getElementById('er-pdf-card'));
    assert(hasPdfCard, 'PDF export card exists');

    // === AC2: CSV data export ===
    console.log('\n=== AC2: CSV data export ===');

    // Features CSV
    const featCSV = await page.evaluate(() => window.exportReports.generateCSVContent('features'));
    assert(featCSV !== null, 'Features CSV generated');
    assert(featCSV.format === 'csv', 'CSV format correct');
    assert(featCSV.dataType === 'features', 'CSV data type is features');
    assert(featCSV.rowCount > 0, `CSV has ${featCSV.rowCount} rows`);
    assert(featCSV.content.includes('id,category'), 'CSV has header row');
    assert(featCSV.columns.length >= 3, `CSV has ${featCSV.columns.length} columns`);

    // Categories CSV
    const catCSV = await page.evaluate(() => window.exportReports.generateCSVContent('categories'));
    assert(catCSV !== null, 'Categories CSV generated');
    assert(catCSV.dataType === 'categories', 'CSV data type is categories');
    assert(catCSV.rowCount > 0, `Category CSV has ${catCSV.rowCount} rows`);
    assert(catCSV.content.includes('category,total'), 'Category CSV has header');

    // Export CSV (adds to history)
    const csvResult = await page.evaluate(() => window.exportReports.exportCSV('features'));
    assert(csvResult !== null, 'exportCSV returns content');

    // CSV card in export tab
    const hasCsvCard = await page.evaluate(() => !!document.getElementById('er-csv-card'));
    assert(hasCsvCard, 'CSV export card exists');

    // JSON export
    const jsonExport = await page.evaluate(() => window.exportReports.generateJSONExport());
    assert(jsonExport !== null, 'JSON export generated');
    assert(jsonExport.format === 'json', 'JSON format correct');
    assert(jsonExport.data.features.length > 0, `JSON has ${jsonExport.data.features.length} features`);
    assert(jsonExport.data.summary.total > 0, 'JSON has summary');

    // Export JSON (adds to history)
    await page.evaluate(() => window.exportReports.exportJSON());

    // Check export history
    const history = await page.evaluate(() => window.exportReports.getExportHistory());
    assert(history.length >= 3, `${history.length} exports in history`);
    assert(history[0].format !== undefined, 'History entry has format');
    assert(history[0].timestamp !== undefined, 'History entry has timestamp');

    // Switch to history tab
    await page.evaluate(() => window.exportReports.setTab('history'));
    await new Promise(r => setTimeout(r, 300));

    const histTabActive = await page.evaluate(() => {
      return document.querySelector('.er-tab[data-tab="history"]').classList.contains('active');
    });
    assert(histTabActive, 'History tab becomes active');

    const histList = await page.evaluate(() => !!document.getElementById('er-history-list'));
    assert(histList, 'History list rendered');

    const histItems = await page.evaluate(() => document.querySelectorAll('.er-history-item').length);
    assert(histItems >= 3, `${histItems} history items rendered`);

    // === AC3: Scheduled reports ===
    console.log('\n=== AC3: Scheduled reports ===');

    // Create schedule
    const schedule1 = await page.evaluate(() => {
      return window.exportReports.createSchedule('Weekly PDF Report', 'pdf', 'weekly');
    });
    assert(schedule1 !== null, 'Schedule created');
    assert(schedule1.id.startsWith('sched-'), `Schedule has ID: ${schedule1.id}`);
    assert(schedule1.name === 'Weekly PDF Report', 'Schedule has correct name');
    assert(schedule1.format === 'pdf', 'Schedule has format');
    assert(schedule1.frequency === 'weekly', 'Schedule has frequency');
    assert(schedule1.enabled === true, 'Schedule is enabled by default');
    assert(schedule1.nextRun !== null, 'Schedule has next run date');

    // Create second schedule
    const schedule2 = await page.evaluate(() => {
      return window.exportReports.createSchedule('Daily CSV Export', 'csv', 'daily');
    });
    assert(schedule2 !== null, 'Second schedule created');

    // Get schedules
    const schedules = await page.evaluate(() => window.exportReports.getSchedules());
    assert(schedules.length >= 2, `${schedules.length} schedules exist`);

    // Get specific schedule
    const retrieved = await page.evaluate((id) => window.exportReports.getSchedule(id), schedule1.id);
    assert(retrieved !== null, 'Can retrieve specific schedule');
    assert(retrieved.name === 'Weekly PDF Report', 'Retrieved correct schedule');

    // Toggle schedule
    const toggled = await page.evaluate((id) => window.exportReports.toggleSchedule(id), schedule1.id);
    assert(toggled === true, 'Toggle returns true');
    const afterToggle = await page.evaluate((id) => window.exportReports.getSchedule(id), schedule1.id);
    assert(afterToggle.enabled === false, 'Schedule disabled after toggle');

    // Delete schedule
    const deleted = await page.evaluate((id) => window.exportReports.deleteSchedule(id), schedule2.id);
    assert(deleted === true, 'Delete returns true');
    const afterDelete = await page.evaluate((id) => window.exportReports.getSchedule(id), schedule2.id);
    assert(afterDelete === null, 'Deleted schedule no longer exists');

    // Switch to schedule tab
    await page.evaluate(() => window.exportReports.setTab('schedule'));
    await new Promise(r => setTimeout(r, 300));

    const schedTabActive = await page.evaluate(() => {
      return document.querySelector('.er-tab[data-tab="schedule"]').classList.contains('active');
    });
    assert(schedTabActive, 'Schedule tab becomes active');

    const schedList = await page.evaluate(() => !!document.getElementById('er-schedule-list'));
    assert(schedList, 'Schedule list rendered');

    const schedItems = await page.evaluate(() => document.querySelectorAll('.er-schedule-item').length);
    assert(schedItems >= 1, `${schedItems} schedule items rendered`);

    // Create schedule form button
    const hasCreateBtn = await page.$('#er-show-schedule-form');
    assert(hasCreateBtn !== null, 'Create schedule button exists');

    // Show form
    await page.evaluate(() => window.exportReports.showScheduleForm());
    await new Promise(r => setTimeout(r, 200));
    const formVisible = await page.evaluate(() => {
      return document.getElementById('er-schedule-form').classList.contains('visible');
    });
    assert(formVisible, 'Schedule form shows');

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.exportReports.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.exportCount >= 3, `State tracks ${stateObj.exportCount} exports`);
    assert(stateObj.scheduleCount >= 1, `State tracks ${stateObj.scheduleCount} schedules`);

    const savedState = await page.evaluate(() => localStorage.getItem('export-reports-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-070: Export Analytics Reports - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
