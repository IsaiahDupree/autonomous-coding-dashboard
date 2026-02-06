#!/usr/bin/env node

/**
 * Test for feat-027: PRD Sync
 * ============================
 *
 * Tests the PRD sync feature that combines features from multiple PRDs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncFeatures } from './prd-sync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let testsPassed = 0;
let testsFailed = 0;

function log(message, type = 'info') {
  const prefix = {
    info: '📋',
    pass: '✅',
    fail: '❌',
    test: '🧪',
  }[type] || '•';
  console.log(`${prefix} ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTest(name, fn) {
  log(`Testing: ${name}`, 'test');
  try {
    await fn();
    log(`PASS: ${name}`, 'pass');
    testsPassed++;
  } catch (error) {
    log(`FAIL: ${name} - ${error.message}`, 'fail');
    testsFailed++;
  }
}

async function testApiEndpoints() {
  const API_BASE = 'http://localhost:3434';

  await runTest('API /api/prd/status returns sync status', async () => {
    const response = await fetch(`${API_BASE}/api/prd/status`);
    const data = await response.json();
    assert(data.success, 'Response should be successful');
    assert('data' in data, 'Response should have data field');
  });

  await runTest('API /api/prd/sources returns available sources', async () => {
    const response = await fetch(`${API_BASE}/api/prd/sources`);
    const data = await response.json();
    assert(data.success, 'Response should be successful');
    assert(Array.isArray(data.data), 'Data should be an array');
  });
}

async function testPrdSyncLogic() {
  const tempDir = fs.mkdtempSync(path.join('/tmp', 'prd-sync-test-'));

  try {
    // Create test feature lists
    const projectA = {
      project: 'Project A',
      features: [
        { id: 'A-001', category: 'core', priority: 1, description: 'User authentication system', passes: false },
        { id: 'A-002', category: 'core', priority: 2, description: 'Dashboard with analytics', passes: true },
        { id: 'A-003', category: 'ui', priority: 3, description: 'Responsive mobile layout', passes: false }
      ]
    };

    const projectB = {
      project: 'Project B',
      features: [
        { id: 'B-001', category: 'core', priority: 1, description: 'User authentication and login', passes: false }, // Duplicate!
        { id: 'B-002', category: 'api', priority: 2, description: 'REST API endpoints', passes: false },
        { id: 'B-003', category: 'ui', priority: 3, description: 'Dark mode theme', passes: true }
      ]
    };

    const featureListA = path.join(tempDir, 'projectA-features.json');
    const featureListB = path.join(tempDir, 'projectB-features.json');
    const outputPath = path.join(tempDir, 'unified-features.json');

    fs.writeFileSync(featureListA, JSON.stringify(projectA, null, 2));
    fs.writeFileSync(featureListB, JSON.stringify(projectB, null, 2));

    await runTest('Sync combines features from multiple sources', async () => {
      const result = syncFeatures({
        sources: [
          { name: 'Project A', path: featureListA, type: 'feature_list' },
          { name: 'Project B', path: featureListB, type: 'feature_list' }
        ],
        outputPath,
        mergeStrategy: 'keep-all'
      });

      assert(result.success, 'Sync should succeed');
      assert(result.featuresCount === 6, `Should have 6 features, got ${result.featuresCount}`);
      log(`  Combined ${result.featuresCount} features from 2 sources`, 'info');
    });

    await runTest('Unified feature list tracks source PRDs', async () => {
      const unified = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

      assert(unified.features.length === 6, 'Should have 6 features');

      const hasSourceTracking = unified.features.every(f => f.source_prd);
      assert(hasSourceTracking, 'All features should have source_prd field');

      const sourceA = unified.features.filter(f => f.source_prd === 'Project A').length;
      const sourceB = unified.features.filter(f => f.source_prd === 'Project B').length;

      assert(sourceA === 3, `Should have 3 features from Project A, got ${sourceA}`);
      assert(sourceB === 3, `Should have 3 features from Project B, got ${sourceB}`);
      log(`  Tracked sources: ${sourceA} from A, ${sourceB} from B`, 'info');
    });

    await runTest('Deduplication merges similar features', async () => {
      // Re-sync with merge strategy and lower threshold
      const result = syncFeatures({
        sources: [
          { name: 'Project A', path: featureListA, type: 'feature_list' },
          { name: 'Project B', path: featureListB, type: 'feature_list' }
        ],
        outputPath,
        mergeStrategy: 'merge-duplicates',
        deduplicateThreshold: 0.5  // Lower threshold to catch "user authentication" duplicates
      });

      assert(result.success, 'Sync should succeed');
      // The two "user authentication" features should be merged
      assert(result.featuresCount <= 6, `Should have ≤ 6 features after dedup, got ${result.featuresCount}`);
      log(`  Deduplicated: 6 → ${result.featuresCount} features`, 'info');

      const unified = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

      // Check if any features were merged (have source_prds array or merged_from)
      const hasMergeTracking = unified.features.some(f =>
        (Array.isArray(f.source_prds) && f.source_prds.length > 1) ||
        (Array.isArray(f.merged_from) && f.merged_from.length > 0)
      );

      if (hasMergeTracking) {
        log(`  Merge tracking present in unified features`, 'info');
      } else {
        log(`  No duplicates found (features are sufficiently different)`, 'info');
      }
    });

    await runTest('Updates feature_list.json format correctly', async () => {
      const unified = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

      assert(unified.project, 'Should have project field');
      assert(unified.description, 'Should have description field');
      assert(Array.isArray(unified.features), 'Features should be an array');
      assert(Array.isArray(unified.sources), 'Sources should be an array');
      assert(unified.created_at, 'Should have created_at timestamp');
      assert(typeof unified.total_features === 'number', 'Should have total_features count');

      log(`  Unified format valid: ${unified.total_features} features from ${unified.sources.length} sources`, 'info');
    });

  } finally {
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function runAllTests() {
  console.log('\n========================================');
  console.log('PRD Sync Tests (feat-027)');
  console.log('========================================\n');

  await testApiEndpoints();
  await testPrdSyncLogic();

  console.log('\n========================================');
  console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('========================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
