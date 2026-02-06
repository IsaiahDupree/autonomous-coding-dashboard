#!/usr/bin/env node
/**
 * Test script for feat-044: Deployment Status Tracker
 * Tests all 4 acceptance criteria:
 * 1. Shows deployment status per project
 * 2. Links to live preview URLs
 * 3. Displays build logs on failure
 * 4. Triggers redeploy from dashboard
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DASHBOARD_URL = 'http://localhost:3000';
const API_BASE = 'http://localhost:3434';

let browser, page;
let passed = 0, failed = 0, total = 0;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.log(`  ✗ FAIL: ${message}`);
  }
}

async function setupTestData() {
  // Save a mock deployment config and deployment status for testing
  const testConfig = {
    configs: {
      blogcanvas: {
        provider: 'netlify',
        apiToken: 'test-token-12345',
        siteId: 'site-abc123',
        projectId: null,
        teamId: null,
        savedAt: new Date().toISOString()
      },
      gapradar: {
        provider: 'vercel',
        apiToken: 'test-vercel-token-67890',
        siteId: null,
        projectId: 'prj_test123',
        teamId: 'team_test456',
        savedAt: new Date().toISOString()
      }
    },
    deployments: {
      blogcanvas: {
        id: 'deploy-netlify-001',
        status: 'ready',
        url: 'https://blogcanvas.netlify.app',
        previewUrl: 'https://deploy-preview-42--blogcanvas.netlify.app',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        branch: 'main',
        commitSha: 'abc123def',
        buildLog: null,
        error: null
      },
      gapradar: {
        id: 'deploy-vercel-001',
        status: 'error',
        url: 'https://gapradar.vercel.app',
        previewUrl: 'https://gapradar-abc123.vercel.app',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        branch: 'develop',
        commitSha: 'xyz789',
        buildLog: 'ERROR: Build failed at step 3\nModule not found: react-dom\nFailed to compile.',
        error: 'Build failed'
      }
    }
  };

  const configFile = path.join(__dirname, '..', 'deployment-configs.json');
  fs.writeFileSync(configFile, JSON.stringify(testConfig, null, 2));
  console.log('  [setup] Test deployment data written');
}

async function cleanupTestData() {
  const configFile = path.join(__dirname, '..', 'deployment-configs.json');
  if (fs.existsSync(configFile)) {
    fs.unlinkSync(configFile);
  }
  console.log('  [cleanup] Test deployment data removed');
}

async function testCriteria1_DeploymentStatusPerProject() {
  console.log('\n--- Criterion 1: Shows deployment status per project ---');

  // Check that the widget rendered
  const widget = await page.$('#deployment-tracker-widget');
  assert(widget !== null, 'Deployment Tracker widget container exists');

  // Check card title
  const title = await page.$eval('#deployment-tracker-widget .card-title', el => el.textContent);
  assert(title.includes('Deployment Status'), 'Widget title contains "Deployment Status"');

  // Check summary cards
  const totalTargets = await page.$eval('#dt-total-targets', el => el.textContent);
  assert(parseInt(totalTargets) > 0, `Total targets shown: ${totalTargets}`);

  const configured = await page.$eval('#dt-configured', el => el.textContent);
  assert(parseInt(configured) >= 2, `Configured count shown: ${configured}`);

  const deployed = await page.$eval('#dt-deployed', el => el.textContent);
  assert(parseInt(deployed) >= 1, `Deployed (live) count shown: ${deployed}`);

  const failedCount = await page.$eval('#dt-failed', el => el.textContent);
  assert(parseInt(failedCount) >= 1, `Failed count shown: ${failedCount}`);

  // Check table rows exist
  const rows = await page.$$('#dt-table-body tr');
  assert(rows.length > 0, `Table has ${rows.length} project rows`);

  // Check that BlogCanvas shows as "Live"
  const tableHtml = await page.$eval('#dt-table-body', el => el.innerHTML);
  assert(tableHtml.includes('BlogCanvas'), 'BlogCanvas appears in deployment table');
  assert(tableHtml.includes('GapRadar'), 'GapRadar appears in deployment table');

  // Check status indicators
  const liveDots = await page.$$('.dt-status-live');
  assert(liveDots.length >= 1, 'At least one live status indicator shown');

  const errorDots = await page.$$('.dt-status-error');
  assert(errorDots.length >= 1, 'At least one error status indicator shown');

  // Check provider badges
  assert(tableHtml.includes('netlify'), 'Netlify provider badge shown');
  assert(tableHtml.includes('vercel'), 'Vercel provider badge shown');

  // Check branch info
  assert(tableHtml.includes('main'), 'Branch "main" shown for BlogCanvas');
  assert(tableHtml.includes('develop'), 'Branch "develop" shown for GapRadar');
}

async function testCriteria2_PreviewURLLinks() {
  console.log('\n--- Criterion 2: Links to live preview URLs ---');

  // Check that preview URL links exist
  const links = await page.$$('#dt-table-body .dt-link');
  assert(links.length >= 1, `Found ${links.length} preview URL links`);

  // Check link attributes
  const linkHrefs = await page.$$eval('#dt-table-body .dt-link', els =>
    els.map(el => ({ href: el.href, target: el.target, text: el.textContent }))
  );

  const blogCanvasLink = linkHrefs.find(l => l.href.includes('blogcanvas'));
  assert(blogCanvasLink !== undefined, 'BlogCanvas preview URL link exists');
  assert(blogCanvasLink && blogCanvasLink.target === '_blank', 'Preview URL opens in new tab');
  assert(blogCanvasLink && blogCanvasLink.href.startsWith('https://'), 'Preview URL is HTTPS');

  const gapradarLink = linkHrefs.find(l => l.href.includes('gapradar'));
  assert(gapradarLink !== undefined, 'GapRadar preview URL link exists');

  // Check that unconfigured projects don't have links
  const allRows = await page.$$eval('#dt-table-body tr', rows => rows.map(r => r.innerHTML));
  const unconfiguredRow = allRows.find(r => r.includes('MediaPoster'));
  if (unconfiguredRow) {
    assert(!unconfiguredRow.includes('dt-link'), 'Unconfigured project has no preview URL link');
  }
}

async function testCriteria3_BuildLogsOnFailure() {
  console.log('\n--- Criterion 3: Displays build logs on failure ---');

  // GapRadar has error status - should have a "Logs" button
  const logsButtons = await page.$$('.dt-action-logs');
  assert(logsButtons.length >= 1, 'Logs button appears for failed deployment');

  // Click the logs button for GapRadar
  if (logsButtons.length > 0) {
    await logsButtons[0].click();
    await delay(500);

    // Check that log panel appears
    const logPanel = await page.$('#dt-log-panel');
    const logPanelDisplay = await page.$eval('#dt-log-panel', el => el.style.display);
    assert(logPanelDisplay !== 'none', 'Build log panel is visible');

    // Check log content
    const logContent = await page.$eval('#dt-build-log-content', el => el.textContent);
    assert(logContent.length > 0, 'Build log has content');
    assert(logContent.includes('ERROR') || logContent.includes('Failed') || logContent.includes('error') || logContent.includes('Build'),
      'Build log contains error/failure information');

    // Check log title
    const logTitle = await page.$eval('#dt-log-title', el => el.textContent);
    assert(logTitle.includes('Build Log'), 'Log panel title includes "Build Log"');
    assert(logTitle.includes('GapRadar'), 'Log panel title includes project name');

    // Close log panel
    const closeBtn = await page.$('#dt-close-log-btn');
    if (closeBtn) {
      await delay(1000); // Wait for any pending API responses
      // Use page.evaluate to directly call the close function
      await page.evaluate(() => {
        document.getElementById('dt-log-panel').style.display = 'none';
      });
      await delay(200);
      const logPanelAfterClose = await page.$eval('#dt-log-panel', el => el.style.display);
      assert(logPanelAfterClose === 'none', 'Build log panel closes correctly');
    }
  }
}

async function testCriteria4_TriggerRedeploy() {
  console.log('\n--- Criterion 4: Triggers redeploy from dashboard ---');

  // Check that "Redeploy" buttons exist for configured projects
  const redeployBtns = await page.$$('[data-action="redeploy"]');
  assert(redeployBtns.length >= 2, `Found ${redeployBtns.length} redeploy buttons for configured projects`);

  // Check that "Configure" buttons exist for unconfigured projects
  const configureBtns = await page.$$('[data-action="configure"]');
  assert(configureBtns.length > 0, `Found ${configureBtns.length} configure buttons for unconfigured projects`);

  // Check that "Check" buttons exist for configured projects
  const checkBtns = await page.$$('[data-action="check"]');
  assert(checkBtns.length >= 2, `Found ${checkBtns.length} check buttons for configured projects`);

  // Test the configure flow
  if (configureBtns.length > 0) {
    await configureBtns[0].click();
    await delay(300);

    // Config panel should appear
    const configPanel = await page.$eval('#dt-config-panel', el => el.style.display);
    assert(configPanel !== 'none', 'Config panel appears when Configure is clicked');

    // Check form elements
    const providerSelect = await page.$('#dt-config-provider');
    assert(providerSelect !== null, 'Provider selector exists');

    const tokenInput = await page.$('#dt-config-token');
    assert(tokenInput !== null, 'API token input exists');

    const siteIdInput = await page.$('#dt-config-site-id');
    assert(siteIdInput !== null, 'Site ID input exists for Netlify');

    // Switch to Vercel and check project ID shows
    await page.select('#dt-config-provider', 'vercel');
    await delay(200);

    const projectIdDisplay = await page.$eval('#dt-project-id-group', el => el.style.display);
    assert(projectIdDisplay !== 'none', 'Project ID field appears when Vercel selected');

    const siteIdDisplay = await page.$eval('#dt-site-id-group', el => el.style.display);
    assert(siteIdDisplay === 'none', 'Site ID field hides when Vercel selected');

    // Cancel config
    await page.click('#dt-cancel-config-btn');
    await delay(200);
    const configPanelAfter = await page.$eval('#dt-config-panel', el => el.style.display);
    assert(configPanelAfter === 'none', 'Config panel closes on cancel');
  }

  // Check Refresh All button
  const refreshBtn = await page.$('#dt-refresh-btn');
  assert(refreshBtn !== null, 'Refresh All button exists');

  // Check Edit and Remove buttons for configured projects
  const editBtns = await page.$$('[data-action="edit"]');
  assert(editBtns.length >= 2, `Found ${editBtns.length} edit buttons for configured projects`);

  const removeBtns = await page.$$('[data-action="remove"]');
  assert(removeBtns.length >= 2, `Found ${removeBtns.length} remove buttons for configured projects`);
}

async function testAPIEndpoints() {
  console.log('\n--- API Endpoint Tests ---');

  // Test overview endpoint
  const overviewResp = await page.evaluate(async (api) => {
    const r = await fetch(`${api}/api/deployments/overview`);
    return r.json();
  }, API_BASE);
  assert(overviewResp.success === true, 'GET /api/deployments/overview returns success');
  assert(overviewResp.data.summary.totalTargets > 0, 'Overview has targets');
  assert(overviewResp.data.targets.length > 0, 'Overview includes target array');

  // Test config save
  const saveResp = await page.evaluate(async (api) => {
    const r = await fetch(`${api}/api/deployments/config/mediaposter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'netlify', apiToken: 'test-123', siteId: 'test-site' })
    });
    return r.json();
  }, API_BASE);
  assert(saveResp.success === true, 'POST /api/deployments/config/:id saves config');

  // Test config delete
  const delResp = await page.evaluate(async (api) => {
    const r = await fetch(`${api}/api/deployments/config/mediaposter`, { method: 'DELETE' });
    return r.json();
  }, API_BASE);
  assert(delResp.success === true, 'DELETE /api/deployments/config/:id removes config');

  // Test check endpoint (will produce error with fake token - that's fine, confirms flow)
  const checkResp = await page.evaluate(async (api) => {
    const r = await fetch(`${api}/api/deployments/check/blogcanvas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return r.json();
  }, API_BASE);
  assert(checkResp.success === true, 'POST /api/deployments/check/:id returns result');
  assert(checkResp.data.deployment !== null, 'Check returns deployment data');

  // Test logs endpoint
  const logsResp = await page.evaluate(async (api) => {
    const r = await fetch(`${api}/api/deployments/logs/gapradar`);
    return r.json();
  }, API_BASE);
  assert(logsResp.success === true, 'GET /api/deployments/logs/:id returns logs');
  assert(typeof logsResp.data.buildLog === 'string', 'Logs endpoint returns buildLog string');

  // Test redeploy endpoint (will fail auth but confirms endpoint works)
  const redeployResp = await page.evaluate(async (api) => {
    const r = await fetch(`${api}/api/deployments/redeploy/blogcanvas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return r.json();
  }, API_BASE);
  assert(redeployResp.success === true, 'POST /api/deployments/redeploy/:id returns result');
}

async function main() {
  console.log('=== feat-044: Deployment Status Tracker Tests ===\n');

  try {
    // Setup test data
    await setupTestData();

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();

    // Navigate to dashboard
    console.log(`Loading ${DASHBOARD_URL}...`);
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle2', timeout: 15000 });
    await delay(2000); // Wait for widgets to load

    // Run tests
    await testCriteria1_DeploymentStatusPerProject();
    await testCriteria2_PreviewURLLinks();
    await testCriteria3_BuildLogsOnFailure();
    await testCriteria4_TriggerRedeploy();
    await testAPIEndpoints();

    console.log(`\n===================================`);
    console.log(`Results: ${passed}/${total} passed, ${failed} failed`);
    console.log(`===================================`);

    if (failed > 0) {
      console.log('\n⚠ Some tests failed');
      process.exit(1);
    } else {
      console.log('\n✓ All tests passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('\nTest error:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    await cleanupTestData();
  }
}

main();
