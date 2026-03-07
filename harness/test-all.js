#!/usr/bin/env node

/**
 * Run All ACD Tests
 * =================
 * 
 * Comprehensive test runner for all ACD components.
 * Run: node test-all.js
 */

import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tests = [
  { name: 'Metrics Database', file: 'test-metrics-db.js' },
  { name: 'Model Configuration', file: 'test-model-config.js' },
  { name: 'Target Sync API', file: 'test-target-sync.js' },
  { name: 'Harness DB Integration', file: 'test-harness-db.js' },
  { name: 'ACD Watchdog + Doctor', file: 'test-watchdog.js' },
  { name: 'Chrome Lock Mutex', file: 'test-chrome-lock.js' },
  { name: 'Safari Tab Watchdog', file: 'test-safari-tab-watchdog.js' },
  { name: 'Safari Tab Coordinator', file: 'test-safari-tab-coordinator.js', env: { SAFARI_ALLOW_ANY_WINDOW: 'true' } },
  { name: 'LinkedIn Scrapers', file: 'test-linkedin-scrapers.js' },
  { name: 'Rate Limit Coordinator', file: 'test-rate-limit-coordinator.js' },
  { name: 'Adaptive Delay', file: 'test-adaptive-delay.js' },
  { name: 'Cloud Bridge Allowlist', file: 'test-cloud-bridge-allowlist.js' },
  { name: 'LinkedIn Priority Scoring', file: 'test-linkedin-priority.js' },
  { name: 'Cloud Orchestrator', file: 'test-cloud-orchestrator.js' },
  { name: 'Browser Session Daemon', file: 'test-browser-session-daemon.js' },
  { name: 'Cron Manager', file: 'test-cron-manager.js' },
];

async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Running: ${test.name}`);
    console.log('='.repeat(50));
    
    const proc = spawn('node', [path.join(__dirname, test.file)], {
      cwd: __dirname,
      stdio: 'inherit',
      env: { ...process.env, ...(test.env || {}) },
    });

    proc.on('close', (code) => {
      resolve({ name: test.name, passed: code === 0 });
    });

    proc.on('error', (err) => {
      console.error(`Failed to run ${test.name}: ${err.message}`);
      resolve({ name: test.name, passed: false });
    });
  });
}

async function main() {
  console.log('\n' + '█'.repeat(50));
  console.log('       ACD COMPREHENSIVE TEST SUITE');
  console.log('█'.repeat(50));

  const results = [];
  
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
  }

  // Summary
  console.log('\n' + '█'.repeat(50));
  console.log('       TEST SUITE SUMMARY');
  console.log('█'.repeat(50) + '\n');

  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed);

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
  }

  console.log(`\nTotal: ${passed.length} passed, ${failed.length} failed\n`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
