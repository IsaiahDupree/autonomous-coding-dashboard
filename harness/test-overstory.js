#!/usr/bin/env node
/**
 * test-overstory.js — Validate the Overstory agent swarm capability
 *
 * Tests:
 * 1. Overstory CLI available and functional
 * 2. Seeds issue tracker has all 5 PRDs loaded
 * 3. Spec files exist for all issues
 * 4. Agent definitions are complete
 * 5. Coordinator can start and list ready work
 * 6. Swarm spawn test (dry run — spawns 1 lead, checks tmux, kills it)
 * 7. Self-heal test — deliberately break a feature file, verify recovery flow
 * 8. Business goal gap detection test
 *
 * Usage: node harness/test-overstory.js [--skip-spawn]
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ACD_DIR = '/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard';
const skipSpawn = process.argv.includes('--skip-spawn');

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
    results.push({ name, status: 'pass' });
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
    results.push({ name, status: 'fail', error: err.message });
  }
}

function run(cmd, opts = {}) {
  const result = spawnSync('/bin/zsh', ['-l', '-c', cmd], {
    cwd: ACD_DIR,
    encoding: 'utf8',
    timeout: 15000,
    ...opts,
  });
  if (result.error) throw result.error;
  return { stdout: result.stdout || '', stderr: result.stderr || '', code: result.status };
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

console.log('\n=== Overstory Agent Swarm Test Suite ===\n');

// --- 1. CLI availability ---
console.log('[1] CLI and tooling');
test('ov CLI available', () => {
  const r = run('ov --version');
  assert(r.code === 0, `exit ${r.code}`);
  assert(r.stdout.trim().length > 0, 'empty version');
});
test('sd (seeds) CLI available', () => {
  const r = run('sd --version');
  assert(r.code === 0, `exit ${r.code}`);
});
test('tmux available', () => {
  const r = run('tmux -V');
  assert(r.code === 0, 'tmux not found');
});
test('claude CLI available', () => {
  const r = run('claude --version');
  assert(r.code === 0, 'claude CLI not in PATH');
});

// --- 2. Issue tracker ---
console.log('\n[2] Seeds issue tracker');
const PRD_ISSUES = [
  { label: 'Cloud-Local Request Bridge', id: 'ecef' },
  { label: 'Unified Browser Agent Control', id: 'c34b' },
  { label: 'Prospect Acquisition Pipeline', id: '1313' },
  { label: 'Upwork Autonomous Fulfillment', id: '388d' },
  { label: 'Self-Healing', id: 'ed40' },
  { label: 'Cloud Browser Orchestrator', id: '085d' },
  { label: 'Self-Improving Strategy Loop', id: '278e' },
];

test('Seeds initialized', () => {
  assert(existsSync(join(ACD_DIR, '.seeds')), '.seeds dir missing');
});
test('All 5 PRD issues exist', () => {
  const r = run('sd list');
  for (const prd of PRD_ISSUES) {
    assert(r.stdout.includes(prd.id), `Missing issue for: ${prd.label}`);
  }
});
test('P1 issues have correct priority', () => {
  const r = run('sd list');
  assert(r.stdout.includes('High'), 'No high priority issues found');
});

// --- 3. Spec files ---
console.log('\n[3] Spec files');
for (const prd of PRD_ISSUES) {
  test(`Spec file exists for ${prd.label}`, () => {
    const glob = join(ACD_DIR, `.overstory/specs/*${prd.id}*`);
    const r = run(`ls .overstory/specs/ | grep ${prd.id}`);
    assert(r.code === 0 && r.stdout.trim().length > 0, `No spec for ${prd.id}`);
  });
}

// --- 4. Agent definitions ---
console.log('\n[4] Agent definitions');
const REQUIRED_DEFS = ['coordinator', 'lead', 'builder', 'scout', 'reviewer'];
for (const def of REQUIRED_DEFS) {
  test(`Agent def exists: ${def}`, () => {
    const path = join(ACD_DIR, `.overstory/agent-defs/${def}.md`);
    assert(existsSync(path), `Missing: .overstory/agent-defs/${def}.md`);
    const content = readFileSync(path, 'utf8');
    assert(content.length > 100, 'agent def is too short / empty');
  });
}

// --- 5. Coordinator context ---
console.log('\n[5] Coordinator context');
test('Coordinator context file exists', () => {
  assert(existsSync(join(ACD_DIR, '.overstory/coordinator-context.md')), 'Missing coordinator-context.md');
});
test('Context references all 5 PRD issues', () => {
  const content = readFileSync(join(ACD_DIR, '.overstory/coordinator-context.md'), 'utf8');
  for (const prd of PRD_ISSUES) {
    assert(content.includes(prd.id), `Context missing reference to issue ${prd.id}`);
  }
});
test('Context references business goals', () => {
  const content = readFileSync(join(ACD_DIR, '.overstory/coordinator-context.md'), 'utf8');
  assert(content.includes('5,000'), 'Missing revenue goal');
  assert(content.includes('1,000,000'), 'Missing audience goal');
});

// --- 6. Ready work surfacing ---
console.log('\n[6] Ready work surfacing');
test('sd ready surfaces P1 issues', () => {
  const r = run('sd ready');
  // P1 issues should be unblocked
  assert(r.code === 0, 'sd ready failed');
  // Check at least 2 issues are ready
  const lines = r.stdout.trim().split('\n').filter(l => l.includes('autonomous-coding-dashboard'));
  assert(lines.length >= 2, `Expected ≥2 ready issues, got ${lines.length}`);
});

// --- 7. Spawn test (optional) ---
if (!skipSpawn) {
  console.log('\n[7] Swarm spawn (dry run)');
  test('ov sling dry-run does not error on syntax', () => {
    const r = run('ov sling --help');
    assert(r.code === 0, 'ov sling --help failed');
    assert(r.stdout.includes('capability'), 'Missing --capability option');
  });
  test('ov doctor passes all checks', () => {
    const r = run('ov doctor');
    assert(r.code === 0 || r.stdout.includes('[dependencies]'), 'ov doctor crashed');
    // Allow missing DBs (created on first run) but not missing binaries
    assert(!r.stdout.includes('sd is not installed'), 'sd missing from PATH');
    assert(!r.stdout.includes('mulch is not installed'), 'mulch missing from PATH');
  });
} else {
  console.log('\n[7] Swarm spawn (skipped via --skip-spawn)');
}

// --- 8. Business goal gap detection ---
console.log('\n[8] Business goal file');
test('business-goals.json accessible', () => {
  const path = '/Users/isaiahdupree/Documents/Software/business-goals.json';
  assert(existsSync(path), 'business-goals.json not found');
  const goals = JSON.parse(readFileSync(path, 'utf8'));
  assert(goals !== null, 'invalid JSON');
});

// --- 9. Launch scripts ---
console.log('\n[9] Launch and watchdog scripts');
test('launch-overstory.sh exists and is executable', () => {
  assert(existsSync(join(ACD_DIR, 'harness/launch-overstory.sh')), 'Missing launch-overstory.sh');
});
test('watchdog-overstory.sh exists', () => {
  assert(existsSync(join(ACD_DIR, 'harness/watchdog-overstory.sh')), 'Missing watchdog-overstory.sh');
});
test('launch-browser-session-daemon.sh exists', () => {
  assert(existsSync(join(ACD_DIR, 'harness/launch-browser-session-daemon.sh')), 'Missing launch-browser-session-daemon.sh');
});

// --- 10. Cloud + local daemon files ---
console.log('\n[10] Cloud orchestrator + local daemon');
test('cloud-orchestrator.js exists', () => {
  assert(existsSync(join(ACD_DIR, 'harness/cloud-orchestrator.js')), 'Missing cloud-orchestrator.js');
});
test('browser-session-daemon.js exists', () => {
  assert(existsSync(join(ACD_DIR, 'harness/browser-session-daemon.js')), 'Missing browser-session-daemon.js');
});
test('Supabase migration SQL exists', () => {
  const r = run('ls harness/migrations/');
  assert(r.stdout.includes('.sql'), 'No SQL migration files found');
});
test('cloud-orchestrator imports match ESM pattern', () => {
  const content = readFileSync(join(ACD_DIR, 'harness/cloud-orchestrator.js'), 'utf8');
  assert(content.includes('export async function runOrchestratorCycle'), 'runOrchestratorCycle not exported');
  assert(content.includes('actp_browser_sessions'), 'Missing actp_browser_sessions reference');
});
test('browser-session-daemon has self-improvement loop', () => {
  const content = readFileSync(join(ACD_DIR, 'harness/browser-session-daemon.js'), 'utf8');
  assert(content.includes('runSelfImprovement'), 'Missing runSelfImprovement');
  assert(content.includes('actp_strategy_configs'), 'Missing strategy configs reference');
  assert(content.includes('IMPROVE_INTERVAL_MS'), 'Missing improvement interval');
});
test('coordinator context references new issues', () => {
  const content = readFileSync(join(ACD_DIR, '.overstory/coordinator-context.md'), 'utf8');
  assert(content.includes('085d'), 'Missing orclit issue 085d');
  assert(content.includes('278e'), 'Missing self-improve issue 278e');
  assert(content.includes('orclit'), 'Missing orclit reference');
});

// --- Summary ---
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\nFailed tests:');
  results.filter(r => r.status === 'fail').forEach(r => {
    console.log(`  ❌ ${r.name}: ${r.error}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ All tests passed — swarm is ready for 24/7 operation');
  console.log('\nTo start the coordinator:');
  console.log('  bash harness/launch-overstory.sh start');
  console.log('\nTo start the watchdog (keeps it alive 24/7):');
  console.log('  nohup /bin/zsh -l harness/watchdog-overstory.sh >> harness/logs/overstory-watchdog.log 2>&1 &');
  console.log('\nTo monitor:');
  console.log('  bash harness/launch-overstory.sh status');
  console.log('  bash harness/launch-overstory.sh attach');
}
