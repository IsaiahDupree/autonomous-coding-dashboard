/**
 * PCT Audit 5 - Verify remaining 20 features are implemented
 * Tests: F2.1.6, F3.1.4, F3.3.4, F5.4.5, F6.2.5, F6.3.1-F6.3.4,
 *        F9.2.3-F9.2.6, F10.1.1-F10.1.4, F1.4.1-F1.4.3
 */
const puppeteer = require('./node_modules/puppeteer');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function audit() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto('http://localhost:3434/pct.html', { waitUntil: 'networkidle0', timeout: 15000 });
  await sleep(1500);

  let passed = 0;
  let failed = 0;

  function check(name, result) {
    if (result) {
      console.log(`  PASS: ${name}`);
      passed++;
    } else {
      console.log(`  FAIL: ${name}`);
      failed++;
    }
    return result;
  }

  // ===========================================================
  // F2.1.6: USP Archive
  // ===========================================================
  console.log('\n=== F2.1.6: USP Archive ===');
  await page.click('[data-tab="usps"]');
  await sleep(700);

  const uspArchive = await page.evaluate(() => {
    const src = document.documentElement.innerHTML;
    return {
      hasArchiveFunction: typeof archiveUsp === 'function',
      hasRestoreFunction: typeof restoreUsp === 'function',
      hasSetUspArchiveView: typeof setUspArchiveView === 'function',
      hasArchivedState: typeof showArchivedUsps !== 'undefined',
      hasApiArchive: typeof pctApi !== 'undefined' && pctApi.archiveUsp != null,
      hasApiRestore: typeof pctApi !== 'undefined' && pctApi.restoreUsp != null,
      hasApiGetArchived: typeof pctApi !== 'undefined' && pctApi.getArchivedUsps != null,
    };
  });
  check('F2.1.6 archiveUsp function', uspArchive.hasArchiveFunction);
  check('F2.1.6 restoreUsp function', uspArchive.hasRestoreFunction);
  check('F2.1.6 setUspArchiveView function', uspArchive.hasSetUspArchiveView);
  check('F2.1.6 showArchivedUsps state', uspArchive.hasArchivedState);
  check('F2.1.6 pctApi.archiveUsp', uspArchive.hasApiArchive);
  check('F2.1.6 pctApi.restoreUsp', uspArchive.hasApiRestore);
  check('F2.1.6 pctApi.getArchivedUsps', uspArchive.hasApiGetArchived);

  // ===========================================================
  // F3.1.4: Framework A/B Testing
  // ===========================================================
  console.log('\n=== F3.1.4: Framework A/B Testing ===');
  await page.click('[data-tab="generate"]');
  await sleep(700);

  const abFramework = await page.evaluate(() => {
    return {
      hasToggleAbMode: typeof toggleAbFrameworkMode === 'function',
      hasToggleAbFw: typeof toggleAbFramework === 'function',
      hasGenerateAb: typeof generateAbFrameworkTest === 'function',
      hasAbModeState: typeof state !== 'undefined' && 'abFrameworkMode' in state,
      hasAbFrameworksState: typeof state !== 'undefined' && 'abFrameworks' in state,
      hasAbCheckbox: !!document.querySelector('[onchange="toggleAbFrameworkMode()"]'),
      hasAbLabel: document.body.innerHTML.includes('A/B Test'),
    };
  });
  check('F3.1.4 toggleAbFrameworkMode function', abFramework.hasToggleAbMode);
  check('F3.1.4 toggleAbFramework function', abFramework.hasToggleAbFw);
  check('F3.1.4 generateAbFrameworkTest function', abFramework.hasGenerateAb);
  check('F3.1.4 abFrameworkMode state', abFramework.hasAbModeState);
  check('F3.1.4 abFrameworks Set state', abFramework.hasAbFrameworksState);
  check('F3.1.4 A/B checkbox in UI', abFramework.hasAbCheckbox);
  check('F3.1.4 A/B Test label visible', abFramework.hasAbLabel);

  // ===========================================================
  // F3.3.4: Industry-specific defaults
  // ===========================================================
  console.log('\n=== F3.3.4: Industry-specific Defaults ===');
  const industryDefaults = await page.evaluate(() => {
    return {
      hasApplyIndustry: typeof applyIndustryDefault === 'function',
      hasIndustrySelect: !!document.querySelector('[onchange*="applyIndustryDefault"]'),
      hasOptions: (() => {
        const sel = document.querySelector('[onchange*="applyIndustryDefault"]');
        return sel ? sel.options.length >= 5 : false;
      })(),
    };
  });
  check('F3.3.4 applyIndustryDefault function', industryDefaults.hasApplyIndustry);
  check('F3.3.4 Industry dropdown in UI', industryDefaults.hasIndustrySelect);
  check('F3.3.4 Has industry options', industryDefaults.hasOptions);

  // ===========================================================
  // F5.4.5: Direct Edit Launch
  // ===========================================================
  console.log('\n=== F5.4.5: Direct Edit Launch ===');
  await page.click('[data-tab="creative"]');
  await sleep(700);
  await page.evaluate(() => {
    const btns = document.querySelectorAll('[onclick*="switchCreativeSubTab"]');
    btns.forEach(b => { if (b.textContent.includes('Gallery')) b.click(); });
  });
  await sleep(500);

  const editLaunch = await page.evaluate(() => {
    return {
      hasOpenAdInExtEditor: typeof openAdInExternalEditor === 'function',
      hasLaunchEditor: typeof launchEditor === 'function',
      hasEditBtn: document.body.innerHTML.includes('openAdInExternalEditor') || document.body.innerHTML.includes('Edit'),
    };
  });
  check('F5.4.5 openAdInExternalEditor function', editLaunch.hasOpenAdInExtEditor);
  check('F5.4.5 launchEditor function', editLaunch.hasLaunchEditor);

  // ===========================================================
  // F6.2.5: Export to Google Docs
  // ===========================================================
  console.log('\n=== F6.2.5: Export to Google Docs ===');
  await page.click('[data-tab="scripts"]');
  await sleep(1000);

  const googleDocs = await page.evaluate(() => {
    return {
      hasExportFn: typeof exportScriptToGoogleDocs === 'function',
      hasDocsBtn: document.body.innerHTML.includes('exportScriptToGoogleDocs') || document.body.innerHTML.includes('Docs'),
    };
  });
  check('F6.2.5 exportScriptToGoogleDocs function', googleDocs.hasExportFn);

  // ===========================================================
  // F6.3.1-F6.3.4: B-Roll Library
  // ===========================================================
  console.log('\n=== F6.3.1-F6.3.4: B-Roll Library ===');
  await sleep(500);

  const broll = await page.evaluate(() => {
    return {
      hasRenderBroll: typeof renderBrollSection === 'function',
      hasHandleUpload: typeof handleBrollUpload === 'function',
      hasAddFromUrl: typeof addBrollFromUrl === 'function',
      hasSuggest: typeof suggestBrollForScript === 'function',
      hasPopulateSelect: typeof populateBrollScriptSelect === 'function',
      hasExportCapCut: typeof exportToCapCut === 'function',
      hasExportPremiere: typeof exportToPremiere === 'function',
      hasExportFrameIo: typeof exportToFrameIo === 'function',
      hasBrollSection: !!document.getElementById('broll-section'),
      hasBrollUploadBtn: document.body.innerHTML.includes('broll-file-input') || document.body.innerHTML.includes('B-Roll'),
    };
  });
  check('F6.3.1 B-Roll upload function', broll.hasHandleUpload);
  check('F6.3.1 B-Roll section rendered', broll.hasBrollSection);
  check('F6.3.2 suggestBrollForScript function', broll.hasSuggest);
  check('F6.3.3 Timeline (renderBrollSection)', broll.hasRenderBroll);
  check('F6.3.4 exportToCapCut function', broll.hasExportCapCut);
  check('F6.3.4 exportToPremiere function', broll.hasExportPremiere);
  check('F6.3.4 exportToFrameIo function', broll.hasExportFrameIo);

  // ===========================================================
  // F9.2.3-F9.2.6: External API Integrations
  // ===========================================================
  console.log('\n=== F9.2.3-F9.2.6: External API Integrations ===');
  await page.click('[data-tab="settings"]');
  await sleep(1000);

  const extApis = await page.evaluate(() => {
    const html = document.body.innerHTML;
    return {
      hasSaveExtIntegration: typeof saveExtIntegration === 'function',
      hasTemplatedField: !!document.getElementById('settings-templated-key'),
      hasGsheetsField: !!document.getElementById('settings-gsheets-key'),
      hasGdocsField: !!document.getElementById('settings-gdocs-key'),
      hasMakecomField: !!document.getElementById('settings-makecom-url'),
      hasZapierField: !!document.getElementById('settings-zapier-url'),
      hasTestTemplated: typeof testTemplatedKey === 'function',
      hasTestMakecom: typeof testMakecomWebhook === 'function',
      hasTestZapier: typeof testZapierWebhook === 'function',
      hasF923Label: html.includes('F9.2.3') || html.includes('Templated.io'),
    };
  });
  check('F9.2.3 Templated.io API key field', extApis.hasTemplatedField);
  check('F9.2.4 Google Sheets API key field', extApis.hasGsheetsField);
  check('F9.2.5 Google Docs API key field', extApis.hasGdocsField);
  check('F9.2.6 Make.com webhook field', extApis.hasMakecomField);
  check('F9.2.6 Zapier webhook field', extApis.hasZapierField);
  check('F9.2.3 testTemplatedKey function', extApis.hasTestTemplated);
  check('F9.2.6 testMakecomWebhook function', extApis.hasTestMakecom);
  check('F9.2.6 testZapierWebhook function', extApis.hasTestZapier);
  check('saveExtIntegration function', extApis.hasSaveExtIntegration);

  // ===========================================================
  // F10.1.1-F10.1.4: User Management
  // ===========================================================
  console.log('\n=== F10.1.1-F10.1.4: User Management ===');

  const userMgmt = await page.evaluate(() => {
    const html = document.body.innerHTML;
    return {
      hasLoadTeamData: typeof loadTeamData === 'function',
      hasRenderUsersList: typeof renderUsersList === 'function',
      hasAddTeamMember: typeof addTeamMember === 'function',
      hasUpdateUserRole: typeof updateUserRole === 'function',
      hasRemoveTeamMember: typeof removeTeamMember === 'function',
      hasCreateWorkspace: typeof createWorkspace === 'function',
      hasLoadActivityLog: typeof loadActivityLog === 'function',
      hasApiGetUsers: pctApi && pctApi.getUsers != null,
      hasApiCreateUser: pctApi && pctApi.createUser != null,
      hasApiGetActivity: pctApi && pctApi.getActivityLog != null,
      hasUserEmailField: !!document.getElementById('user-email-input'),
      hasUserNameField: !!document.getElementById('user-name-input'),
      hasUserRoleField: !!document.getElementById('user-role-select'),
      hasWorkspaceField: !!document.getElementById('ws-name-input'),
      hasActivityLogEl: !!document.getElementById('activity-log-list'),
      hasRBACLabel: html.includes('Role Permissions') || html.includes('RBAC') || html.includes('viewer') && html.includes('editor') && html.includes('admin'),
    };
  });
  check('F10.1.1 loadTeamData function', userMgmt.hasLoadTeamData);
  check('F10.1.1 addTeamMember function', userMgmt.hasAddTeamMember);
  check('F10.1.1 User email field', userMgmt.hasUserEmailField);
  check('F10.1.1 User name field', userMgmt.hasUserNameField);
  check('F10.1.2 updateUserRole function (RBAC)', userMgmt.hasUpdateUserRole);
  check('F10.1.2 User role select', userMgmt.hasUserRoleField);
  check('F10.1.2 RBAC label visible', userMgmt.hasRBACLabel);
  check('F10.1.3 createWorkspace function', userMgmt.hasCreateWorkspace);
  check('F10.1.3 Workspace name field', userMgmt.hasWorkspaceField);
  check('F10.1.4 loadActivityLog function', userMgmt.hasLoadActivityLog);
  check('F10.1.4 Activity log element', userMgmt.hasActivityLogEl);
  check('pctApi.getUsers', userMgmt.hasApiGetUsers);
  check('pctApi.createUser', userMgmt.hasApiCreateUser);
  check('pctApi.getActivityLog', userMgmt.hasApiGetActivity);

  // ===========================================================
  // F1.4.1-F1.4.3: Competitor Intelligence
  // ===========================================================
  console.log('\n=== F1.4.1-F1.4.3: Competitor Intelligence ===');

  const competitor = await page.evaluate(() => {
    const html = document.body.innerHTML;
    return {
      hasSearchMetaAdLibrary: typeof searchMetaAdLibrary === 'function',
      hasAnalyzeCompetitorAd: typeof analyzeCompetitorAd === 'function',
      hasAddCompetitorEntry: typeof addCompetitorEntry === 'function',
      hasRenderCompetitorEntries: typeof renderCompetitorEntries === 'function',
      hasSearchInput: !!document.getElementById('comp-search-input'),
      hasAdCopyTextarea: !!document.getElementById('comp-ad-copy'),
      hasCompNameInput: !!document.getElementById('comp-name-input'),
      hasF141Label: html.includes('F1.4.1') || html.includes('Ad Library') || html.includes('Competitor'),
    };
  });
  check('F1.4.1 searchMetaAdLibrary function', competitor.hasSearchMetaAdLibrary);
  check('F1.4.1 Ad Library search input', competitor.hasSearchInput);
  check('F1.4.2 analyzeCompetitorAd function', competitor.hasAnalyzeCompetitorAd);
  check('F1.4.2 Ad copy textarea', competitor.hasAdCopyTextarea);
  check('F1.4.3 addCompetitorEntry function', competitor.hasAddCompetitorEntry);
  check('F1.4.3 Competitor name input', competitor.hasCompNameInput);
  check('F1.4.3 renderCompetitorEntries function', competitor.hasRenderCompetitorEntries);

  // ===========================================================
  // Summary
  // ===========================================================
  console.log('\n' + '='.repeat(50));
  console.log(`TOTAL: ${passed + failed} tests | PASSED: ${passed} | FAILED: ${failed}`);

  if (errors.length > 0) {
    console.log('\nConsole errors:');
    errors.forEach(e => console.log('  ERROR:', e));
  }

  await browser.close();
  return { passed, failed };
}

audit().then(r => {
  process.exit(r.failed > 0 ? 1 : 0);
}).catch(e => {
  console.error('Audit error:', e.message);
  process.exit(1);
});
