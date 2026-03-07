#!/usr/bin/env node

/**
 * Polsia Orchestrator Daemon
 * ==========================
 * Every 5 minutes: reads business goals + system state → calls Claude haiku
 * for a structured JSON decision → executes auto-approved actions or queues
 * human-approval items.
 *
 * Start:        node harness/polsia-orchestrator.js
 * Single cycle: node harness/polsia-orchestrator.js --once
 * Launch daemon: bash harness/launch-orchestrator.sh
 *
 * Env vars:
 *   ORCH_POLL_MS           = 300000  (5 min)
 *   COOLDOWN_DISPATCH_ACD  = 1800000 (30 min)
 *   COOLDOWN_ACTP          = 7200000 (2 hr)
 *   MAX_CONCURRENT_AGENTS  = 8
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { getQueueState } from './queue-state.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;
const LOGS_DIR = path.join(HARNESS_DIR, 'logs');
const GOALS_FILE = '/Users/isaiahdupree/Documents/Software/business-goals.json';
const STATE_FILE = path.join(HARNESS_DIR, 'orchestrator-state.json');
const LOG_FILE = path.join(HARNESS_DIR, 'orchestrator-log.ndjson');
const PENDING_FILE = path.join(HARNESS_DIR, 'pending-actions.json');

// NanoBot (Polsia-style agent) config
const NANOBOT_DIR = '/Users/isaiahdupree/Documents/Software/NanoBot';
const SAFARI_ENV_FILE = '/Users/isaiahdupree/Documents/Software/Safari Automation/.env';

// ── Bootstrap ANTHROPIC_API_KEY from Safari Automation .env if not set ────────
if (!process.env.ANTHROPIC_API_KEY) {
  try {
    const envLines = fs.readFileSync(SAFARI_ENV_FILE, 'utf-8').split('\n');
    for (const line of envLines) {
      const m = line.match(/^ANTHROPIC_API_KEY=(.+)/);
      if (m) { process.env.ANTHROPIC_API_KEY = m[1].trim(); break; }
    }
  } catch { /* non-fatal — key may be set elsewhere */ }
}

const POLL_INTERVAL_MS = parseInt(process.env.ORCH_POLL_MS || '300000', 10);
const COOLDOWNS = {
  dispatch_acd: parseInt(process.env.COOLDOWN_DISPATCH_ACD || '1800000', 10),  // 30 min
  run_actp_pipeline: parseInt(process.env.COOLDOWN_ACTP || '7200000', 10),     // 2 hr
};
const MAX_CONCURRENT_AGENTS = parseInt(process.env.MAX_CONCURRENT_AGENTS || '8', 10);

// Actions that execute automatically
const AUTO_EXECUTE = new Set(['dispatch_acd', 'run_actp_pipeline', 'spawn_nanobot', 'no_action']);
// Actions that require human approval
const NEEDS_APPROVAL = new Set(['queue_content', 'run_dm_outreach', 'submit_upwork_proposal']);

// ── Helpers ───────────────────────────────────────────────────────────────────

function readJson(filePath, fallback = null) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return fallback; }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function log(msg) {
  const line = `${new Date().toISOString()} [polsia] ${msg}`;
  console.log(line);
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOGS_DIR, 'orchestrator.log'), line + '\n');
  } catch { /* non-fatal */ }
}

function logEvent(event) {
  const entry = { ts: new Date().toISOString(), ...event };
  try { fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n'); } catch { /* non-fatal */ }
  return entry;
}

function readRecentLog(n = 5) {
  try {
    const lines = fs.readFileSync(LOG_FILE, 'utf-8').trim().split('\n').filter(Boolean);
    return lines.slice(-n).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

// ── State management ──────────────────────────────────────────────────────────

function readState() {
  const today = new Date().toISOString().slice(0, 10);
  const defaults = {
    paused: false,
    cycleCount: 0,
    lastActionAt: {},
    todayActionCount: 0,
    todayDate: today,
    lastCycleAt: null,
  };
  const state = readJson(STATE_FILE, defaults);
  // Reset daily counter if new day
  if (state.todayDate !== today) {
    state.todayDate = today;
    state.todayActionCount = 0;
  }
  return { ...defaults, ...state };
}

function saveState(state) {
  writeJson(STATE_FILE, state);
}

function isOnCooldown(action, state) {
  const last = state.lastActionAt?.[action];
  if (!last) return false;
  const elapsed = Date.now() - new Date(last).getTime();
  return elapsed < (COOLDOWNS[action] || 0);
}

function setCooldown(action, state) {
  state.lastActionAt = state.lastActionAt || {};
  state.lastActionAt[action] = new Date().toISOString();
}

// ── Pending actions ───────────────────────────────────────────────────────────

function readPending() {
  return readJson(PENDING_FILE, []);
}

function appendPending(action, params, reason) {
  const pending = readPending();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: action,
    params: params || {},
    reason,
    queued_at: new Date().toISOString(),
    status: 'pending',
  };
  pending.push(entry);
  writeJson(PENDING_FILE, pending);
  return entry;
}

// ── State snapshot ────────────────────────────────────────────────────────────

async function fetchWithTimeout(url, timeoutMs) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

async function buildStateSnapshot() {
  // 1. Goals
  const goals = readJson(GOALS_FILE, {});
  const revenue = goals.revenue || {};
  const growth = goals.growth || {};

  // 2. ACD queue state
  let queueState = { running: [], queued: [], completed: [], topology: 'idle', parallelCount: 0, nextUp: null };
  try { queueState = getQueueState(); } catch (e) { log(`queue-state error: ${e.message}`); }

  // 3. Service health checks (non-blocking, in parallel)
  const [actpUp, safariUp] = await Promise.all([
    fetchWithTimeout('http://localhost:8090/health', 3000),
    fetchWithTimeout('http://localhost:3003/health', 2000),
  ]);

  // 4. Recent history
  const recentHistory = readRecentLog(5);

  // 5. Time of day
  const hour = new Date().getHours();
  const timeOfDay = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  return {
    goals: {
      revenue_target: revenue.target_monthly_usd || 5000,
      revenue_current: revenue.current_monthly_usd || 0,
      revenue_gap: (revenue.target_monthly_usd || 5000) - (revenue.current_monthly_usd || 0),
      crm_contacts_current: growth.crm_contacts_current || 0,
      crm_contacts_target: growth.crm_contacts_target || 1000,
    },
    acd: {
      running_count: queueState.parallelCount,
      running_agents: queueState.running.map(a => a.slug),
      queued_count: queueState.queued.length,
      next_queued: queueState.nextUp,
      topology: queueState.topology,
    },
    services: { actp_up: actpUp, safari_twitter_dm_up: safariUp },
    time_of_day: timeOfDay,
    hour,
    recent_history: recentHistory.map(e => `${e.action} — ${(e.reason || '').slice(0, 60)}`),
  };
}

// ── Decision via Claude haiku ─────────────────────────────────────────────────

async function getDecision(snapshot, state) {
  const cooldownSummary = Object.keys(COOLDOWNS).map(a => {
    if (isOnCooldown(a, state)) {
      const last = new Date(state.lastActionAt[a]).getTime();
      const remaining = Math.ceil((COOLDOWNS[a] - (Date.now() - last)) / 60000);
      return `${a}: on cooldown (${remaining}m remaining)`;
    }
    return `${a}: available`;
  }).join(', ');

  const prompt = `You are the Polsia Orchestrator for Isaiah's AI consulting business.

BUSINESS CONTEXT:
- Revenue: $${snapshot.goals.revenue_current}/$${snapshot.goals.revenue_target} target (gap: $${snapshot.goals.revenue_gap})
- ICP: SaaS founders needing AI automation
- CRM contacts: ${snapshot.goals.crm_contacts_current}/${snapshot.goals.crm_contacts_target}

SYSTEM STATE:
- Time of day: ${snapshot.time_of_day} (hour ${snapshot.hour})
- ACD agents running: ${snapshot.acd.running_count}/${MAX_CONCURRENT_AGENTS} max (${snapshot.acd.running_count > 0 ? snapshot.acd.running_agents.join(', ') : 'none'})
- ACD agents queued: ${snapshot.acd.queued_count}${snapshot.acd.next_queued ? ` (next: ${snapshot.acd.next_queued})` : ''}
- ACTP worker: ${snapshot.services.actp_up ? 'UP' : 'DOWN'}
- Safari Twitter DM: ${snapshot.services.safari_twitter_dm_up ? 'UP' : 'DOWN'}
- Cooldowns: ${cooldownSummary}

RECENT HISTORY (last 5 actions):
${snapshot.recent_history.length > 0 ? snapshot.recent_history.join('\n') : 'none'}

AVAILABLE ACTIONS:
- dispatch_acd: Start the next queued ACD agent (auto-executes, 30min cooldown, max ${MAX_CONCURRENT_AGENTS} concurrent)
- run_actp_pipeline: Run ACTP CRM+content+outreach pipeline (auto-executes, 2hr cooldown)
- spawn_nanobot: Spawn a NanoBot autonomous agent for a specific task (auto-executes; params: {task: "...", label: "..."})
- queue_content: Queue content generation task (requires human approval)
- run_dm_outreach: Run DM outreach campaign (requires human approval)
- submit_upwork_proposal: Submit Upwork proposal (requires human approval)
- no_action: Do nothing this cycle

For spawn_nanobot, task should be a concrete autonomous mission like "Research top 5 AI automation Upwork jobs posted today and write 3 tailored proposals to /tmp/proposals.md"

Respond with JSON only (no markdown, no explanation):
{"action":"...","params":{},"reason":"...","revenue_impact":"high|medium|low"}`;

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0]?.text?.trim() || '{}';
  // Strip any accidental markdown code fences
  const clean = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(clean);
}

// ── Action executors ──────────────────────────────────────────────────────────

async function executeDispatchAcd(params, state, snapshot) {
  const slug = params?.slug || snapshot.acd.next_queued;
  if (!slug) {
    log('dispatch_acd: no queued agent to dispatch');
    return { skipped: true, reason: 'no queued agents' };
  }
  if (snapshot.acd.running_count >= MAX_CONCURRENT_AGENTS) {
    log(`dispatch_acd: max concurrent (${MAX_CONCURRENT_AGENTS}) reached`);
    return { skipped: true, reason: 'max concurrent agents' };
  }

  const launchScript = path.join(HARNESS_DIR, `launch-${slug}.sh`);
  if (!fs.existsSync(launchScript)) {
    log(`dispatch_acd: launch script not found: ${launchScript}`);
    return { skipped: true, reason: `launch-${slug}.sh not found` };
  }

  const { spawn } = await import('child_process');
  const child = spawn('/bin/zsh', [launchScript], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });
  child.unref();
  log(`dispatch_acd: launched ${slug} (PID ${child.pid})`);
  setCooldown('dispatch_acd', state);
  return { launched: slug, pid: child.pid };
}

async function executeSpawnNanobot(params, state) {
  const task = params?.task;
  if (!task) {
    log('spawn_nanobot: no task provided');
    return { skipped: true, reason: 'no task param' };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    log('spawn_nanobot: ANTHROPIC_API_KEY not set');
    return { skipped: true, reason: 'ANTHROPIC_API_KEY missing' };
  }

  const label = params?.label || task.slice(0, 40);
  const { spawn } = await import('child_process');
  const child = spawn(
    'python3', ['-m', 'nanobot', 'agent', '-m', task],
    {
      cwd: NANOBOT_DIR,
      detached: true,
      stdio: ['ignore', fs.openSync(path.join(LOGS_DIR, 'nanobot-agents.log'), 'a'), fs.openSync(path.join(LOGS_DIR, 'nanobot-agents.log'), 'a')],
      env: { ...process.env, ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY },
    }
  );
  child.unref();
  log(`spawn_nanobot: launched "${label}" (PID ${child.pid})`);
  return { launched: true, pid: child.pid, label };
}

async function executeActpPipeline(params, state) {
  const actpPath = '/Users/isaiahdupree/Documents/Software/actp-worker';

  // First try REST dispatch
  try {
    const res = await fetch('http://localhost:8090/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline: 'crm_brain', args: ['--pipeline'] }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      setCooldown('run_actp_pipeline', state);
      log('run_actp_pipeline: dispatched via REST :8090');
      return { dispatched: 'rest', status: res.status };
    }
  } catch { /* fall through to spawn */ }

  // Fallback: spawn directly
  const { spawn } = await import('child_process');
  const child = spawn('/usr/bin/python3', ['scripts/crm_brain.py', '--pipeline'], {
    cwd: actpPath,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  setCooldown('run_actp_pipeline', state);
  log(`run_actp_pipeline: spawned directly (PID ${child.pid})`);
  return { launched: 'spawn', pid: child.pid };
}

// ── Main cycle ────────────────────────────────────────────────────────────────

async function runCycle(state) {
  state.cycleCount = (state.cycleCount || 0) + 1;
  state.lastCycleAt = new Date().toISOString();
  log(`Cycle #${state.cycleCount} starting`);

  // Build snapshot
  const snapshot = await buildStateSnapshot();

  // Get decision from Claude haiku
  let decision;
  try {
    decision = await getDecision(snapshot, state);
  } catch (e) {
    log(`Decision error: ${e.message} — defaulting to no_action`);
    decision = { action: 'no_action', reason: `decision error: ${e.message}`, revenue_impact: 'low' };
  }

  const { action, params = {}, reason = '', revenue_impact = 'low' } = decision;
  log(`Decision: ${action} — ${reason} (impact: ${revenue_impact})`);

  let result = {};

  if (action === 'no_action') {
    log(`No action: ${reason}`);
    result = { skipped: true };

  } else if (AUTO_EXECUTE.has(action)) {
    if (isOnCooldown(action, state)) {
      const last = new Date(state.lastActionAt[action]).getTime();
      const remaining = Math.ceil((COOLDOWNS[action] - (Date.now() - last)) / 60000);
      log(`${action}: on cooldown (${remaining}m remaining), skipping`);
      result = { skipped: true, reason: `cooldown (${remaining}m remaining)` };
    } else {
      try {
        if (action === 'dispatch_acd') {
          result = await executeDispatchAcd(params, state, snapshot);
        } else if (action === 'run_actp_pipeline') {
          result = await executeActpPipeline(params, state);
        } else if (action === 'spawn_nanobot') {
          result = await executeSpawnNanobot(params, state);
        }
        if (!result.skipped) {
          state.todayActionCount = (state.todayActionCount || 0) + 1;
        }
      } catch (e) {
        log(`Execute error for ${action}: ${e.message}`);
        result = { error: e.message };
      }
    }

  } else if (NEEDS_APPROVAL.has(action)) {
    const entry = appendPending(action, params, reason);
    log(`Queued for approval: ${action} (id: ${entry.id})`);
    result = { queued_for_approval: entry.id };

  } else {
    log(`Unknown action: ${action}`);
    result = { unknown: action };
  }

  // Log the cycle event
  logEvent({
    cycle: state.cycleCount,
    action,
    params,
    reason,
    revenue_impact,
    result,
    snapshot: {
      running: snapshot.acd.running_count,
      queued: snapshot.acd.queued_count,
      actp_up: snapshot.services.actp_up,
      time_of_day: snapshot.time_of_day,
    },
  });

  saveState(state);
  log(`Cycle #${state.cycleCount} done`);
  return { decision, result };
}

// ── Daemon start ──────────────────────────────────────────────────────────────

async function startDaemon() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });

  const once = process.argv.includes('--once');
  log(`Starting Polsia Orchestrator (poll=${POLL_INTERVAL_MS}ms)${once ? ' [--once mode]' : ''}`);

  const state = readState();

  if (once) {
    if (state.paused) {
      log('Orchestrator is paused — exiting');
      process.exit(0);
    }
    const { decision, result } = await runCycle(state);
    console.log('\nDecision:', JSON.stringify(decision, null, 2));
    console.log('Result:', JSON.stringify(result, null, 2));
    return;
  }

  // Immediate first run
  if (!state.paused) {
    await runCycle(readState()).catch(e => log(`Cycle error: ${e.message}`));
  } else {
    log('Orchestrator is paused — waiting for resume');
  }

  setInterval(async () => {
    const s = readState(); // re-read on each cycle (picks up pause/resume)
    if (s.paused) {
      log('Paused — skipping cycle');
      return;
    }
    await runCycle(s).catch(e => log(`Cycle error: ${e.message}`));
  }, POLL_INTERVAL_MS);
}

startDaemon().catch(e => {
  console.error(`Polsia orchestrator fatal: ${e.message}`);
  process.exit(1);
});
