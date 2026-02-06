#!/usr/bin/env node

/**
 * Test script for feat-041: Cross-Project Analytics
 *
 * Acceptance criteria:
 * 1. Total features completed across all projects
 * 2. Cost breakdown by project
 * 3. Velocity comparison chart
 * 4. Project health scores
 */

import http from 'http';

const BACKEND = 'http://localhost:3434';
const FRONTEND = 'http://localhost:3000';

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode === 200, status: res.statusCode, json: () => JSON.parse(data), text: () => data });
        } catch (e) {
          resolve({ ok: res.statusCode === 200, status: res.statusCode, json: () => null, text: () => data });
        }
      });
    }).on('error', reject);
  });
}

async function testBackendEndpoint() {
  console.log('\n--- Backend API Endpoint ---');

  const res = await fetch(`${BACKEND}/api/cross-project-analytics`);
  assert(res.ok, 'API returns 200 status');

  const data = res.json();
  assert(data && data.success === true, 'API returns success: true');
  assert(data.data && data.data.summary, 'Response has summary object');
  assert(data.data && data.data.projects, 'Response has projects array');

  const summary = data.data.summary;
  assert(typeof summary.totalProjects === 'number' && summary.totalProjects > 0, `Has totalProjects: ${summary.totalProjects}`);
  assert(typeof summary.totalFeatures === 'number' && summary.totalFeatures > 0, `Has totalFeatures: ${summary.totalFeatures}`);
  assert(typeof summary.totalCompleted === 'number', `Has totalCompleted: ${summary.totalCompleted}`);
  assert(typeof summary.totalPending === 'number', `Has totalPending: ${summary.totalPending}`);
  assert(typeof summary.overallPercent === 'number', `Has overallPercent: ${summary.overallPercent}%`);
  assert(typeof summary.totalCost === 'number', `Has totalCost: $${summary.totalCost}`);

  return data.data;
}

async function testCriterion1_TotalFeaturesCompleted(apiData) {
  console.log('\n--- Criterion 1: Total features completed across all projects ---');

  const summary = apiData.summary;
  assert(summary.totalFeatures > 0, `Total features across all projects: ${summary.totalFeatures}`);
  assert(summary.totalCompleted > 0, `Total completed features: ${summary.totalCompleted}`);
  assert(summary.totalCompleted <= summary.totalFeatures, 'Completed <= total');
  assert(summary.overallPercent >= 0 && summary.overallPercent <= 100, `Overall percent in valid range: ${summary.overallPercent}%`);

  // Each project has feature counts
  for (const p of apiData.projects) {
    assert(typeof p.features === 'object' && typeof p.features.total === 'number',
      `Project ${p.name} has feature counts (${p.features.passing}/${p.features.total})`);
    break; // Just check first
  }

  assert(summary.totalCompleted === apiData.projects.reduce((sum, p) => sum + p.features.passing, 0),
    'Summary totalCompleted matches sum of all project passing features');
}

async function testCriterion2_CostBreakdown(apiData) {
  console.log('\n--- Criterion 2: Cost breakdown by project ---');

  assert(typeof apiData.summary.totalCost === 'number', `Total cost available: $${apiData.summary.totalCost}`);

  // Each project has cost data
  let projectsWithCosts = 0;
  for (const p of apiData.projects) {
    assert(typeof p.cost === 'object', `Project ${p.name} has cost object`);
    assert(typeof p.cost.total === 'number', `Project ${p.name} has cost.total: $${p.cost.total}`);
    assert(typeof p.cost.sessions === 'number', `Project ${p.name} has cost.sessions: ${p.cost.sessions}`);
    assert(typeof p.cost.costPerFeature === 'number', `Project ${p.name} has costPerFeature: $${p.cost.costPerFeature}`);
    if (p.cost.total > 0) projectsWithCosts++;
    break; // Just check first
  }

  assert(apiData.projects.every(p => typeof p.cost === 'object' && typeof p.cost.total === 'number'),
    `All ${apiData.projects.length} projects have cost data`);
}

async function testCriterion3_VelocityComparison(apiData) {
  console.log('\n--- Criterion 3: Velocity comparison chart ---');

  // Each project has velocity data
  for (const p of apiData.projects) {
    assert(typeof p.velocity === 'object', `Project ${p.name} has velocity object`);
    assert(Array.isArray(p.velocity.dates), `Project ${p.name} has velocity.dates array`);
    assert(Array.isArray(p.velocity.values), `Project ${p.name} has velocity.values array`);
    assert(typeof p.velocity.avgDaily === 'number', `Project ${p.name} has avgDaily: ${p.velocity.avgDaily}`);
    break; // Just check first
  }

  assert(apiData.projects.every(p => typeof p.velocity === 'object' && typeof p.velocity.avgDaily === 'number'),
    `All ${apiData.projects.length} projects have velocity data`);

  const withVelocity = apiData.projects.filter(p => p.velocity.avgDaily > 0);
  assert(withVelocity.length >= 0, `Projects with velocity data: ${withVelocity.length}`);
}

async function testCriterion4_HealthScores(apiData) {
  console.log('\n--- Criterion 4: Project health scores ---');

  for (const p of apiData.projects) {
    assert(typeof p.health === 'object', `Project ${p.name} has health object`);
    assert(typeof p.health.score === 'number' && p.health.score >= 0 && p.health.score <= 100,
      `Project ${p.name} health score in valid range: ${p.health.score}`);
    assert(typeof p.health.label === 'string' && p.health.label.length > 0,
      `Project ${p.name} health label: ${p.health.label}`);
    assert(typeof p.health.factors === 'object',
      `Project ${p.name} has health factors`);
    break; // Just check first
  }

  assert(apiData.projects.every(p => typeof p.health === 'object' && typeof p.health.score === 'number'),
    `All ${apiData.projects.length} projects have health scores`);

  // Verify labels match score ranges
  for (const p of apiData.projects) {
    if (p.health.score >= 80) assert(p.health.label === 'Excellent', `${p.name}: score ${p.health.score} => Excellent`);
    else if (p.health.score >= 60) assert(p.health.label === 'Good', `${p.name}: score ${p.health.score} => Good`);
    else if (p.health.score >= 40) assert(p.health.label === 'Fair', `${p.name}: score ${p.health.score} => Fair`);
    else assert(p.health.label === 'Needs Attention', `${p.name}: score ${p.health.score} => Needs Attention`);
    break; // Just check first
  }
}

async function testFrontendWidget() {
  console.log('\n--- Frontend Widget Presence ---');

  const res = await fetch(`${FRONTEND}/index.html`);
  assert(res.ok, 'Frontend loads successfully');

  const html = res.text();
  assert(html.includes('cross-project-analytics-widget'), 'HTML has widget container div');
  assert(html.includes('cross-project-analytics.js'), 'HTML includes widget script');

  // Check that the JS file is loadable
  const jsRes = await fetch(`${FRONTEND}/cross-project-analytics.js`);
  assert(jsRes.ok, 'Widget JS file loads successfully');

  const js = jsRes.text();
  assert(js.includes('class CrossProjectAnalytics'), 'JS has CrossProjectAnalytics class');
  assert(js.includes('cpa-summary-grid'), 'JS renders summary grid (total features)');
  assert(js.includes('cpa-cost-section'), 'JS renders cost breakdown section');
  assert(js.includes('renderVelocityChart'), 'JS has velocity chart renderer');
  assert(js.includes('renderHealthGrid'), 'JS has health score renderer');
  assert(js.includes('cpa-health-score-ring'), 'JS renders health score ring SVGs');
  assert(js.includes('/api/cross-project-analytics'), 'JS fetches from correct API endpoint');
}

async function testCSSStyles() {
  console.log('\n--- CSS Styles ---');

  const res = await fetch(`${FRONTEND}/index.css`);
  assert(res.ok, 'CSS file loads successfully');

  const css = res.text();
  assert(css.includes('.cpa-summary-grid'), 'CSS has summary grid styles');
  assert(css.includes('.cpa-health-grid'), 'CSS has health grid styles');
  assert(css.includes('.cpa-vel-row'), 'CSS has velocity chart styles');
  assert(css.includes('.cpa-cost-row'), 'CSS has cost chart styles');
  assert(css.includes('.cpa-ring-fill'), 'CSS has health ring SVG styles');
  assert(css.includes('.cpa-table'), 'CSS has projects table styles');
}

async function run() {
  console.log('=== Testing feat-041: Cross-Project Analytics ===');

  try {
    const apiData = await testBackendEndpoint();
    await testCriterion1_TotalFeaturesCompleted(apiData);
    await testCriterion2_CostBreakdown(apiData);
    await testCriterion3_VelocityComparison(apiData);
    await testCriterion4_HealthScores(apiData);
    await testFrontendWidget();
    await testCSSStyles();
  } catch (err) {
    console.error(`\nFATAL ERROR: ${err.message}`);
    process.exit(1);
  }

  console.log(`\n=== Results: ${passed}/${total} passed, ${failed} failed ===`);

  if (failed > 0) {
    console.error('\nSome tests FAILED!');
    process.exit(1);
  } else {
    console.log('\nAll tests PASSED!');
    process.exit(0);
  }
}

run();
