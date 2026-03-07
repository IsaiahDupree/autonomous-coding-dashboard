#!/usr/bin/env node

/**
 * Run All ACD Tests
 * =================
 *
 * Comprehensive test runner for all ACD components.
 * Run: node test-all.js
 *
 * Features:
 *  - 30s per-test timeout (kills hung tests)
 *  - Parallel execution within batches (pure-unit tests run concurrently)
 *  - Auto-skip DB-dependent tests when Postgres/:5433 is unreachable
 *  - Auto-skip API-dependent tests when backend server is unreachable
 */

import { spawn } from 'child_process';
import * as net from 'net';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_TIMEOUT_MS = 30_000;   // kill any test that runs > 30s

// ── Test registry ─────────────────────────────────────────────────────────────
// requires: 'postgres' | 'backend-api' | null (pure — no service needed)
const tests = [
  // Infrastructure-dependent (auto-skipped when service is down)
  { name: 'Metrics Database',      file: 'test-metrics-db.js',     requires: 'postgres' },
  { name: 'Harness DB Integration',file: 'test-harness-db.js',     requires: 'postgres' },
  { name: 'Target Sync API',       file: 'test-target-sync.js',    requires: 'backend-api' },

  // Pure unit tests — run in parallel batches
  { name: 'Model Configuration',       file: 'test-model-config.js' },
  { name: 'ACD Watchdog + Doctor',     file: 'test-watchdog.js' },
  { name: 'Chrome Lock Mutex',         file: 'test-chrome-lock.js' },
  { name: 'Safari Tab Watchdog',       file: 'test-safari-tab-watchdog.js' },
  { name: 'Safari Tab Coordinator',    file: 'test-safari-tab-coordinator.js', env: { SAFARI_ALLOW_ANY_WINDOW: 'true' } },
  { name: 'LinkedIn Scrapers',         file: 'test-linkedin-scrapers.js' },
  { name: 'Rate Limit Coordinator',    file: 'test-rate-limit-coordinator.js' },
  { name: 'Adaptive Delay',            file: 'test-adaptive-delay.js' },
  { name: 'Cloud Bridge Allowlist',    file: 'test-cloud-bridge-allowlist.js' },
  { name: 'LinkedIn Priority Scoring', file: 'test-linkedin-priority.js' },
  { name: 'Cloud Orchestrator',        file: 'test-cloud-orchestrator.js' },
  { name: 'Browser Session Daemon',    file: 'test-browser-session-daemon.js' },
  { name: 'Cron Manager',             file: 'test-cron-manager.js' },
  { name: 'Prospect Scoring',          file: 'test-prospect-scoring.js' },
  { name: 'Sleep Manager',             file: 'test-sleep-manager.js' },
  { name: 'DM CRM Sync',              file: 'test-dm-crm-sync.js' },
];

// ── Service availability checks ───────────────────────────────────────────────
function canConnect(host, port, timeoutMs = 2000) {
  return new Promise(resolve => {
    const sock = new net.Socket();
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error',   () => { sock.destroy(); resolve(false); });
    sock.once('timeout', () => { sock.destroy(); resolve(false); });
    sock.connect(port, host);
  });
}

async function checkServices() {
  const [postgres, backendApi] = await Promise.all([
    canConnect('127.0.0.1', 5433),
    canConnect('127.0.0.1', 3434),
  ]);
  return { postgres, 'backend-api': backendApi };
}

// ── Run one test with timeout ─────────────────────────────────────────────────
function runTest(test) {
  return new Promise(resolve => {
    const proc = spawn('node', [path.join(__dirname, test.file)], {
      cwd: __dirname,
      stdio: 'inherit',
      env: { ...process.env, ...(test.env || {}) },
    });

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      console.error(`\n⏰ TIMEOUT (${TEST_TIMEOUT_MS / 1000}s): ${test.name}`);
      resolve({ name: test.name, passed: false, timedOut: true });
    }, TEST_TIMEOUT_MS);

    proc.on('close', code => {
      clearTimeout(timer);
      resolve({ name: test.name, passed: code === 0 });
    });

    proc.on('error', err => {
      clearTimeout(timer);
      console.error(`Failed to start ${test.name}: ${err.message}`);
      resolve({ name: test.name, passed: false });
    });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '█'.repeat(50));
  console.log('       ACD COMPREHENSIVE TEST SUITE');
  console.log('█'.repeat(50));

  // Check which services are available
  const services = await checkServices();
  if (!services.postgres) {
    console.log('\n⚠️  Postgres :5433 not reachable — DB tests will be skipped');
  }
  if (!services['backend-api']) {
    console.log('⚠️  Backend API :3434 not reachable — API tests will be skipped');
  }

  // Partition tests: skipped | infra-dependent (sequential) | pure (parallel)
  const skipped  = [];
  const infra    = [];
  const pure     = [];

  for (const t of tests) {
    if (t.requires && !services[t.requires]) {
      skipped.push(t);
    } else if (t.requires) {
      infra.push(t);
    } else {
      pure.push(t);
    }
  }

  const results = [];

  // Run pure tests in parallel (fastest)
  if (pure.length > 0) {
    console.log(`\n── Running ${pure.length} pure tests in parallel ──`);
    const parallelResults = await Promise.all(pure.map(runTest));
    results.push(...parallelResults);
  }

  // Run infra tests sequentially (they may share resources)
  for (const test of infra) {
    console.log(`\n${'='.repeat(50)}\nRunning: ${test.name}\n${'='.repeat(50)}`);
    results.push(await runTest(test));
  }

  // Summary
  console.log('\n' + '█'.repeat(50));
  console.log('       TEST SUITE SUMMARY');
  console.log('█'.repeat(50) + '\n');

  for (const r of results) {
    const icon = r.passed ? '✅' : (r.timedOut ? '⏰' : '❌');
    console.log(`${icon} ${r.name}`);
  }
  for (const t of skipped) {
    console.log(`⏭️  ${t.name} (skipped — ${t.requires} unavailable)`);
  }

  const passed  = results.filter(r => r.passed).length;
  const failed  = results.filter(r => !r.passed).length;
  const skippedCount = skipped.length;

  console.log(`\nTotal: ${passed} passed, ${failed} failed, ${skippedCount} skipped\n`);

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
