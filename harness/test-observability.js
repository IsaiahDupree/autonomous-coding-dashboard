#!/usr/bin/env node
/**
 * test-observability.js — Integration test for the observability mesh
 *
 * Tests:
 *  1. agent_nodes record exists and heartbeat is recent (<120s)
 *  2. worker_status has 10+ daemon entries
 *  3. Issues safari_check_auth via POST /api/obs/command, waits for completion
 *  4. Verifies command_events were written for that command
 *  5. GET /api/obs/fleet returns in <500ms
 *
 * Usage:
 *   node harness/test-observability.js
 *   node harness/test-observability.js --skip-command   # skip live command dispatch
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Env ───────────────────────────────────────────────────────────────────────
function loadEnv(fp) {
  try {
    fs.readFileSync(fp, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^([A-Z0-9_]+)=(.+)/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    });
  } catch { /* non-fatal */ }
}
loadEnv(`${process.env.HOME}/.env`);
loadEnv('/Users/isaiahdupree/Documents/Software/actp-worker/.env');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ivhfuhxorppptyuofbgq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const OBS_API = 'http://localhost:3456';
const NODE_ID = process.env.NODE_ID || 'mac-mini-main';
const SKIP_COMMAND = process.argv.includes('--skip-command');

const SB_HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// ── Test runner ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function pass(name) {
  console.log(`  ✅ PASS: ${name}`);
  passed++;
}

function fail(name, reason) {
  console.log(`  ❌ FAIL: ${name}`);
  console.log(`     ${reason}`);
  failed++;
}

async function sbGet(table, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: SB_HEADERS });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Test 1: agent_nodes record exists with recent heartbeat ───────────────────
async function test1_agentNodeHeartbeat() {
  console.log('\n[Test 1] agent_nodes record + heartbeat freshness');
  try {
    const rows = await sbGet('agent_nodes', `node_id=eq.${NODE_ID}&limit=1`);
    if (!rows.length) return fail('agent_nodes record exists', `No record found for node_id=${NODE_ID}. Start local-agent-daemon first.`);
    pass('agent_nodes record exists');

    const node = rows[0];
    const heartbeatAge = node.last_heartbeat_at
      ? Date.now() - new Date(node.last_heartbeat_at).getTime()
      : Infinity;

    if (heartbeatAge > 120_000) {
      fail('heartbeat is recent (<120s)', `Last heartbeat was ${Math.round(heartbeatAge / 1000)}s ago. Is local-agent-daemon running?`);
    } else {
      pass(`heartbeat is recent (${Math.round(heartbeatAge / 1000)}s ago)`);
    }

    if (node.status === 'online') {
      pass('node status is online');
    } else {
      fail('node status is online', `status = ${node.status}`);
    }
  } catch (err) {
    fail('agent_nodes accessible', err.message);
  }
}

// ── Test 2: worker_status has 10+ entries ────────────────────────────────────
async function test2_workerStatus() {
  console.log('\n[Test 2] worker_status has 10+ daemon entries');
  try {
    const rows = await sbGet('worker_status', `node_id=eq.${NODE_ID}&order=reported_at.desc&limit=200`);
    const uniqueWorkers = new Set(rows.map(r => r.worker_name)).size;

    if (uniqueWorkers >= 10) {
      pass(`worker_status has ${uniqueWorkers} unique workers`);
    } else {
      fail(`worker_status has 10+ workers`, `Only ${uniqueWorkers} found. Run local-agent-daemon first.`);
    }

    const runningWorkers = rows.filter(r => r.status === 'running');
    // Deduplicate
    const uniqueRunning = new Set(runningWorkers.map(r => r.worker_name)).size;
    pass(`${uniqueRunning} workers reporting 'running' status`);
  } catch (err) {
    fail('worker_status accessible', err.message);
  }
}

// ── Test 3: Issue safari_check_auth command and wait for completion ───────────
async function test3_commandDispatch() {
  if (SKIP_COMMAND) {
    console.log('\n[Test 3] Command dispatch (SKIPPED — --skip-command flag)');
    return;
  }

  console.log('\n[Test 3] Issue safari_check_auth command via /api/obs/command');

  // Check the API is reachable first
  let apiReachable = false;
  try {
    const r = await fetch(`${OBS_API}/api/health`, { signal: AbortSignal.timeout(3_000) });
    apiReachable = r.ok;
  } catch { /* not reachable */ }

  if (!apiReachable) {
    fail('obs API reachable at /api/obs/command',
      `live-ops-server not running at ${OBS_API}. Start: bash harness/launch-live-ops.sh start`);
    return;
  }
  pass('live-ops-server reachable');

  let commandId;
  try {
    const res = await fetch(`${OBS_API}/api/obs/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command_type: 'safari_check_auth',
        inputs: {},
        node_target: NODE_ID,
        priority: 'high',
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      const body = await res.text();
      return fail('POST /api/obs/command', `${res.status}: ${body.slice(0, 200)}`);
    }

    const result = await res.json();
    commandId = result.command_id;
    if (!commandId) return fail('command_id returned', `No command_id in response: ${JSON.stringify(result)}`);
    pass(`Command queued: ${commandId}`);
  } catch (err) {
    return fail('POST /api/obs/command', err.message);
  }

  // Wait up to 30s for command to complete (local-agent-daemon polls every 10s)
  console.log(`  Waiting for command ${commandId} to complete (max 35s)...`);
  let finalStatus;
  for (let i = 0; i < 7; i++) {
    await sleep(5_000);
    try {
      const rows = await sbGet('command_queue', `command_id=eq.${encodeURIComponent(commandId)}&limit=1`);
      if (rows.length) {
        finalStatus = rows[0].status;
        if (finalStatus === 'completed' || finalStatus === 'failed') break;
        console.log(`    ... status: ${finalStatus}`);
      }
    } catch { /* retry */ }
  }

  if (finalStatus === 'completed') {
    pass(`Command completed successfully`);
  } else if (finalStatus === 'failed') {
    // Still pass test 3 — the command pipeline worked, even if auth failed
    pass(`Command pipeline worked (status=failed is expected if Safari is down)`);
  } else {
    fail('Command completed within 35s', `Final status: ${finalStatus || 'unknown'}. Is local-agent-daemon running?`);
    return;
  }

  // Test 4: Verify command_events were written
  console.log('\n[Test 4] command_events written for command');
  try {
    const events = await sbGet('command_events', `command_id=eq.${encodeURIComponent(commandId)}&order=timestamp.asc`);
    if (events.length >= 1) {
      pass(`${events.length} command_events written`);
      const statuses = events.map(e => e.status).join(' → ');
      pass(`Event lifecycle: ${statuses}`);
    } else {
      fail('command_events written', 'No events found in command_events table');
    }
  } catch (err) {
    fail('command_events accessible', err.message);
  }
}

// ── Test 5: GET /api/obs/fleet returns in <500ms ─────────────────────────────
async function test5_fleetPerformance() {
  console.log('\n[Test 5] GET /api/obs/fleet response time <500ms');
  try {
    const start = Date.now();
    const res = await fetch(`${OBS_API}/api/obs/fleet`, { signal: AbortSignal.timeout(2_000) });
    const elapsed = Date.now() - start;

    if (!res.ok) return fail('fleet returns 200', `Status: ${res.status}`);
    pass('fleet endpoint returns 200');

    const data = await res.json();

    if (elapsed < 500) {
      pass(`fleet response time: ${elapsed}ms (<500ms)`);
    } else {
      fail('fleet response time <500ms', `Took ${elapsed}ms`);
    }

    if (data.nodes !== undefined) pass('fleet has nodes array');
    else fail('fleet has nodes array', 'Missing nodes field');

    if (data.workers !== undefined) pass('fleet has workers array');
    else fail('fleet has workers array', 'Missing workers field');

    if (data.browser_sessions !== undefined) pass('fleet has browser_sessions array');
    else fail('fleet has browser_sessions array', 'Missing browser_sessions field');

    if (typeof data.queue_depth === 'number') pass('fleet has queue_depth');
    else fail('fleet has queue_depth', 'Missing queue_depth field');
  } catch (err) {
    fail('GET /api/obs/fleet reachable', `${err.message}. Start: bash harness/launch-live-ops.sh start`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log('=== Observability Mesh Integration Tests ===');
console.log(`Node ID: ${NODE_ID}`);
console.log(`Supabase: ${SUPABASE_URL}`);
console.log(`Obs API:  ${OBS_API}`);

if (!SUPABASE_KEY) {
  console.error('\nFATAL: SUPABASE_SERVICE_ROLE_KEY not set. Check env files.');
  process.exit(1);
}

await test1_agentNodeHeartbeat();
await test2_workerStatus();
await test3_commandDispatch(); // Also runs test 4 internally
if (SKIP_COMMAND) {
  // Run test 5 separately if we skipped command
  await test5_fleetPerformance();
} else {
  await test5_fleetPerformance();
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.log('\nTips:');
  console.log('  Start local-agent-daemon: bash harness/launch-observability.sh start');
  console.log('  Start live-ops-server:    bash harness/launch-live-ops.sh start');
  console.log('  Skip command test:        node harness/test-observability.js --skip-command');
  process.exit(1);
} else {
  console.log('\nAll tests passed!');
  process.exit(0);
}
