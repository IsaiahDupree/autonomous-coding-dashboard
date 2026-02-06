#!/usr/bin/env node

/**
 * Test suite for feat-047: Automatic Model Fallback Chain
 * Acceptance criteria:
 * 1. Define fallback order
 * 2. Auto-switch on errors
 * 3. Log fallback events
 */

import puppeteer from 'puppeteer';

const DASHBOARD_URL = 'http://localhost:3000';
const API_BASE = 'http://localhost:3434';

let browser, page;
let passed = 0;
let failed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function setup() {
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`  [console.error] ${msg.text()}`);
  });
}

async function teardown() {
  if (browser) await browser.close();
}

// ========================================
// AC1: Define fallback order
// ========================================
async function testDefineFallbackOrder() {
  console.log('\n📋 AC1: Define fallback order');

  // Test API: Get config
  const configRes = await fetch(`${API_BASE}/api/model-fallback/config`);
  const configJson = await configRes.json();
  assert(configJson.success === true, 'GET /api/model-fallback/config returns success');
  assert(Array.isArray(configJson.data.fallbackOrder), 'Config contains fallbackOrder array');
  assert(configJson.data.fallbackOrder.length >= 3, 'At least 3 models in fallback order');

  // Verify models have required fields
  const first = configJson.data.fallbackOrder[0];
  assert(first.model && typeof first.model === 'string', 'Model entry has model field');
  assert(typeof first.enabled === 'boolean', 'Model entry has enabled boolean');
  assert(first.label && typeof first.label === 'string', 'Model entry has label');
  assert(typeof first.priority === 'number', 'Model entry has priority number');

  // Verify order is prioritized
  const priorities = configJson.data.fallbackOrder.map(m => m.priority);
  const sorted = [...priorities].sort((a, b) => a - b);
  assert(JSON.stringify(priorities) === JSON.stringify(sorted), 'Models are sorted by priority');

  // Test API: Save config (reorder)
  const newConfig = { ...configJson.data };
  const saveRes = await fetch(`${API_BASE}/api/model-fallback/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newConfig),
  });
  const saveJson = await saveRes.json();
  assert(saveJson.success === true, 'POST /api/model-fallback/config saves successfully');

  // Test Dashboard UI: Widget renders
  await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle0', timeout: 15000 });
  await page.waitForSelector('#model-fallback-widget', { timeout: 5000 });

  const widgetExists = await page.$('#model-fallback-widget .card') !== null;
  assert(widgetExists, 'Model Fallback widget renders on dashboard');

  const title = await page.$eval('#model-fallback-widget .card-title', el => el.textContent);
  assert(title.includes('Fallback'), 'Widget has Fallback title');

  // Check model list renders
  await page.waitForSelector('.mf-model-list', { timeout: 5000 });
  const modelItems = await page.$$('.mf-model-item');
  assert(modelItems.length >= 3, `Model list shows ${modelItems.length} models (>= 3)`);

  // Check drag handles exist
  const dragHandles = await page.$$('.mf-model-drag');
  assert(dragHandles.length >= 3, 'Drag handles present for reordering');

  // Check priority numbers
  const firstPriority = await page.$eval('.mf-model-priority', el => el.textContent);
  assert(firstPriority === '1', 'First model shows priority 1');

  // Check enable/disable toggles
  const toggles = await page.$$('.mf-model-enabled');
  assert(toggles.length >= 3, 'Enable/disable toggles present for each model');

  // Check auto-switch toggle
  const autoSwitchToggle = await page.$('#mf-auto-switch-toggle');
  assert(autoSwitchToggle !== null, 'Auto-switch toggle exists');

  const isChecked = await page.$eval('#mf-auto-switch-toggle', el => el.checked);
  assert(isChecked === true, 'Auto-switch is enabled by default');

  // Check save button
  const saveBtn = await page.$('#btn-mf-save');
  assert(saveBtn !== null, 'Save button exists');

  // Check cooldown and max retries inputs
  const cooldownInput = await page.$('#mf-cooldown');
  assert(cooldownInput !== null, 'Rate limit cooldown input exists');

  const retriesInput = await page.$('#mf-max-retries');
  assert(retriesInput !== null, 'Max retries input exists');
}

// ========================================
// AC2: Auto-switch on errors
// ========================================
async function testAutoSwitchOnErrors() {
  console.log('\n📋 AC2: Auto-switch on errors');

  // Test API: Status endpoint
  const statusRes = await fetch(`${API_BASE}/api/model-fallback/status`);
  const statusJson = await statusRes.json();
  assert(statusJson.success === true, 'GET /api/model-fallback/status returns success');
  assert(typeof statusJson.data.activeModel === 'string', 'Status shows active model');
  assert(typeof statusJson.data.autoSwitchEnabled === 'boolean', 'Status shows autoSwitch state');
  assert(statusJson.data.models && typeof statusJson.data.models === 'object', 'Status contains models object');

  // Verify model statuses
  const models = Object.values(statusJson.data.models);
  assert(models.length >= 3, 'Status has at least 3 model entries');

  const firstModel = models[0];
  assert(typeof firstModel.status === 'string', 'Model has status field');
  assert(['available', 'rate_limited', 'disabled'].includes(firstModel.status), 'Model status is valid enum');
  assert(typeof firstModel.switchAwayCount === 'number', 'Model has switchAwayCount');
  assert(typeof firstModel.errorCount === 'number', 'Model has errorCount');

  // Simulate a model switch via API log
  await fetch(`${API_BASE}/api/model-fallback/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'model_switch',
      fromModel: 'claude-opus-4-6',
      toModel: 'claude-sonnet-4-6-20250205',
      reason: 'rate_limit',
      details: 'Auto-switched due to 429 rate limit',
    }),
  });

  // Verify status reflects the switch
  const updatedStatus = await fetch(`${API_BASE}/api/model-fallback/status`);
  const updatedJson = await updatedStatus.json();
  assert(updatedJson.data.totalFallbackEvents >= 1, 'Status tracks total fallback events');

  // Check UI: Status section
  await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle0', timeout: 15000 });
  await page.waitForSelector('#mf-summary-grid', { timeout: 5000 });

  // Summary cards
  const activeModelText = await page.$eval('#mf-active-model', el => el.textContent);
  assert(activeModelText && activeModelText !== '-', `Active model displayed: "${activeModelText}"`);

  const autoSwitchText = await page.$eval('#mf-auto-switch', el => el.textContent);
  assert(autoSwitchText === 'ON' || autoSwitchText === 'OFF', `Auto-switch status shown: "${autoSwitchText}"`);

  // Model status grid
  await page.waitForSelector('.mf-status-grid', { timeout: 5000 });
  const statusCards = await page.$$('.mf-status-card');
  assert(statusCards.length >= 3, `Status grid shows ${statusCards.length} model cards`);

  // Check for status badges
  const badges = await page.$$('.mf-status-badge');
  assert(badges.length >= 3, 'Status badges present for each model');

  // Verify active model indicator
  const activeCards = await page.$$('.mf-model-active');
  assert(activeCards.length >= 1, 'At least one model marked as active');
}

// ========================================
// AC3: Log fallback events
// ========================================
async function testLogFallbackEvents() {
  console.log('\n📋 AC3: Log fallback events');

  // Test API: Get log
  const logRes = await fetch(`${API_BASE}/api/model-fallback/log`);
  const logJson = await logRes.json();
  assert(logJson.success === true, 'GET /api/model-fallback/log returns success');
  assert(Array.isArray(logJson.data), 'Log returns array of events');
  assert(logJson.data.length >= 1, 'Log contains at least 1 event');

  // Verify log entry structure
  const entry = logJson.data[0];
  assert(typeof entry.event === 'string', 'Log entry has event field');
  assert(typeof entry.timestamp === 'string', 'Log entry has timestamp');

  // Post multiple event types to verify logging
  const events = [
    { event: 'error', fromModel: 'claude-opus-4-6', details: 'Server error 500' },
    { event: 'rate_limit', fromModel: 'claude-sonnet-4-6-20250205', details: '429 Too Many Requests' },
    { event: 'model_switch', fromModel: 'claude-sonnet-4-6-20250205', toModel: 'haiku', reason: 'rate_limit' },
    { event: 'session_success', toModel: 'haiku', details: 'Session completed with fallback' },
  ];

  for (const ev of events) {
    await fetch(`${API_BASE}/api/model-fallback/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ev),
    });
  }

  // Verify events logged
  const updatedLog = await fetch(`${API_BASE}/api/model-fallback/log`);
  const updatedJson = await updatedLog.json();
  assert(updatedJson.data.length >= 5, `Log now has ${updatedJson.data.length} entries (>= 5)`);

  // Check different event types are preserved
  const eventTypes = new Set(updatedJson.data.map(e => e.event));
  assert(eventTypes.has('model_switch'), 'Log contains model_switch events');
  assert(eventTypes.has('rate_limit'), 'Log contains rate_limit events');
  assert(eventTypes.has('error'), 'Log contains error events');
  assert(eventTypes.has('session_success'), 'Log contains session_success events');

  // Test Dashboard UI: Log section
  await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle0', timeout: 15000 });
  await page.waitForSelector('#mf-log-section', { timeout: 5000 });

  // Wait for log entries to load
  await page.waitForSelector('.mf-log-entry', { timeout: 5000 });
  const logEntries = await page.$$('.mf-log-entry');
  assert(logEntries.length >= 4, `Log section shows ${logEntries.length} entries (>= 4)`);

  // Check log entry components
  const logIcons = await page.$$('.mf-log-icon');
  assert(logIcons.length >= 4, 'Log entries have icons');

  const logTimes = await page.$$('.mf-log-time');
  assert(logTimes.length >= 4, 'Log entries have timestamps');

  const logEvents = await page.$$('.mf-log-event');
  assert(logEvents.length >= 4, 'Log entries have event names');

  const logDetails = await page.$$('.mf-log-detail');
  assert(logDetails.length >= 4, 'Log entries have details');

  // Check clear button exists
  const clearBtn = await page.$('#btn-mf-clear-log');
  assert(clearBtn !== null, 'Clear log button exists');

  // Check fallback count summary
  const fbCountText = await page.$eval('#mf-fallback-count', el => el.textContent);
  assert(parseInt(fbCountText) >= 1, `Fallback count shows ${fbCountText} (>= 1)`);

  // Check error count summary
  const errCountText = await page.$eval('#mf-error-count', el => el.textContent);
  assert(parseInt(errCountText) >= 1, `Error count shows ${errCountText} (>= 1)`);
}

// ========================================
// Main test runner
// ========================================
async function runTests() {
  console.log('🧪 Testing feat-047: Automatic Model Fallback Chain\n');
  console.log('='.repeat(55));

  try {
    await setup();
    await testDefineFallbackOrder();
    await testAutoSwitchOnErrors();
    await testLogFallbackEvents();
  } catch (error) {
    console.error('\n💥 Test error:', error.message);
    failed++;
  } finally {
    await teardown();
  }

  console.log('\n' + '='.repeat(55));
  console.log(`\n📊 Results: ${passed}/${total} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

runTests();
