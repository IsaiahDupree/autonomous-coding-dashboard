#!/usr/bin/env node

/**
 * Parallel ACD Runner
 * ===================
 *
 * Runs N Claude harness workers simultaneously across the repo queue.
 * Workers pull repos atomically from a shared queue — no duplicate work.
 *
 * Usage:
 *   node run-parallel.js --workers=3
 *   node run-parallel.js --workers=4 --hours=24
 *   node run-parallel.js --workers=2 --repo=gapradar   (pin one worker to a repo)
 *   node run-parallel.js --dry-run --workers=5         (preview assignment)
 *   node run-parallel.js --status                      (show live status)
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// STRICT AUTH ENFORCEMENT: Claude OAuth only — never API key
// ============================================================
if (process.env.ANTHROPIC_API_KEY) {
  console.error('\n╔══════════════════════════════════════════════════════════╗');
  console.error('║  FATAL: ANTHROPIC_API_KEY is set in environment          ║');
  console.error('║  ACD must NEVER use Claude API key auth.                 ║');
  console.error('║  Fix: unset ANTHROPIC_API_KEY                            ║');
  console.error('║  Auth: CLAUDE_CODE_OAUTH_TOKEN (Claude subscription)     ║');
  console.error('╚══════════════════════════════════════════════════════════╝\n');
  process.exit(2);
}

// ── Config ────────────────────────────────────────────────────────────────────
let QUEUE_FILE   = path.join(__dirname, 'repo-queue.json');
let NUM_WORKERS  = 3;
let DRY_RUN      = false;
let HOURS_PER_REPO = null;
let TOTAL_HOURS  = null;
let FORCE_REPO   = null;
let AUTO_COMMIT  = true;
let LOOP_MODE    = false;
let INTER_REPO_DELAY_SEC = 10;  // Shorter than sequential runner (less idle time)

const STATUS_FILE = path.join(__dirname, 'parallel-status.json');
const LOG_FILE    = path.join(__dirname, 'parallel-output.log');

// ── Logging ───────────────────────────────────────────────────────────────────
function log(message, level = 'info', workerId = null) {
  const timestamp = new Date().toISOString();
  const icons = {
    info: '📋', success: '✅', error: '❌', warning: '⚠️',
    start: '🚀', end: '🏁', pause: '⏸️', next: '➡️', skip: '⏭️',
  };
  const icon   = icons[level] || '•';
  const prefix = workerId !== null ? `[W${workerId}]` : '[  ]';
  const line   = `${timestamp} ${icon} ${prefix} ${message}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch (_) { /* ignore */ }
}

// ── Queue / Feature helpers ───────────────────────────────────────────────────
function loadQueue() {
  if (!fs.existsSync(QUEUE_FILE)) {
    log(`Queue file not found: ${QUEUE_FILE}`, 'error');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
}

function getRepoProgress(repo) {
  if (!fs.existsSync(repo.featureList)) return { total: 0, passing: 0, percent: 0 };
  try {
    const data     = JSON.parse(fs.readFileSync(repo.featureList, 'utf-8'));
    const features = data.features || [];
    const total    = features.length;
    const passing  = features.filter(f => f.passes).length;
    return { total, passing, percent: total > 0 ? ((passing / total) * 100).toFixed(1) : 0 };
  } catch (_) {
    return { total: 0, passing: 0, percent: 0 };
  }
}

function isRepoComplete(repo) {
  const p = getRepoProgress(repo);
  return p.total > 0 && p.passing === p.total;
}

function gitCommit(repoPath, message) {
  if (!AUTO_COMMIT) return false;
  try {
    execSync('git add -A',                               { cwd: repoPath, stdio: 'ignore' });
    execSync(`git commit -m "${message}" --allow-empty`, { cwd: repoPath, stdio: 'ignore' });
    return true;
  } catch (_) { return false; }
}

function detectTaskType(focus) {
  const t = (focus || '').toLowerCase();
  if (t.includes('architect') || t.includes('system design')) return 'architecture';
  if (t.includes('security')  || t.includes('auth'))          return 'security';
  if (t.includes('api')       || t.includes('integration'))   return 'api_integration';
  if (t.includes('database')  || t.includes('schema'))        return 'database';
  if (t.includes('ui')        || t.includes('component'))     return 'ui_component';
  if (t.includes('test')      || t.includes('spec'))          return 'test';
  if (t.includes('bug')       || t.includes('fix'))           return 'bug_fix';
  return null;
}

function getModelForComplexity(queue, complexity, taskType = null) {
  const config = queue.modelConfig || {};
  const levels = config.complexityLevels || {
    critical: { models: ['claude-opus-4-6'],           fallback: 'claude-sonnet-4-5-20250929' },
    high:     { models: ['claude-opus-4-6'],           fallback: 'claude-sonnet-4-5-20250929' },
    medium:   { models: ['claude-sonnet-4-5-20250929'], fallback: 'claude-haiku-4-5-20251001' },
    low:      { models: ['claude-sonnet-4-5-20250929'], fallback: 'claude-haiku-4-5-20251001' },
    trivial:  { models: ['claude-haiku-4-5-20251001'],  fallback: 'claude-haiku-4-5-20251001' },
  };
  let eff = complexity;
  if (taskType && config.taskTypeMapping) eff = config.taskTypeMapping[taskType] || complexity;
  if (!eff) eff = config.defaultComplexity || 'medium';
  const level = levels[eff] || levels.medium;
  return {
    model:      level.models[0] || 'haiku',
    complexity: eff,
    maxRetries: level.maxRetries || 3,
    fallback:   level.fallback   || 'haiku',
  };
}

// ── Status file (shared across all workers) ───────────────────────────────────
function loadStatus() {
  if (!fs.existsSync(STATUS_FILE)) return { workers: {}, completedRepos: [], startedAt: null };
  try { return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8')); }
  catch (_) { return { workers: {}, completedRepos: [], startedAt: null }; }
}

function saveStatus(status) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

// ── Run a single repo session ─────────────────────────────────────────────────
async function runRepoSession(repo, queue, workerId) {
  return new Promise((resolve) => {
    const taskType   = detectTaskType(repo.focus);
    const modelCfg   = getModelForComplexity(queue, repo.complexity, taskType);

    const args = [
      path.join(__dirname, 'run-harness-v2.js'),
      `--path=${repo.path}`,
      `--project=${repo.id}`,
      `--model=${modelCfg.model}`,
      `--max-retries=${modelCfg.maxRetries}`,
      `--fallback-model=${modelCfg.fallback}`,
      '--adaptive-delay',
    ];

    if (repo.prompt) {
      const promptPath = repo.prompt.startsWith('/')
        ? repo.prompt
        : path.join(__dirname, repo.prompt);
      if (fs.existsSync(promptPath)) args.push(`--prompt=${promptPath}`);
    }

    const defaultFeatureList = path.join(repo.path, 'feature_list.json');
    if (repo.featureList && path.resolve(repo.featureList) !== path.resolve(defaultFeatureList)) {
      args.push(`--feature-list=${repo.featureList}`);
    }

    if (repo.untilComplete) {
      args.push('--until-complete');
    } else if (HOURS_PER_REPO) {
      args.push(`--hours=${HOURS_PER_REPO}`);
    } else {
      args.push(`--max=${queue.defaults?.maxSessionsPerRepo || 50}`);
    }

    log(`Starting → ${repo.name}  [model: ${modelCfg.model}]`, 'start', workerId);

    if (DRY_RUN) {
      log(`[DRY RUN] Would run: node ${args.slice(0, 4).join(' ')} ...`, 'info', workerId);
      resolve({ success: true, repo: repo.id, progress: getRepoProgress(repo) });
      return;
    }

    const proc = spawn('node', args, { cwd: __dirname, stdio: 'inherit' });

    proc.on('close', (code) => {
      const progress = getRepoProgress(repo);
      log(`Done → ${repo.name}  exit=${code}  ${progress.passing}/${progress.total} (${progress.percent}%)`,
        code === 0 ? 'success' : 'warning', workerId);
      resolve({ success: code === 0, repo: repo.id, progress, complete: isRepoComplete(repo) });
    });

    proc.on('error', (err) => {
      log(`Error → ${repo.name}: ${err.message}`, 'error', workerId);
      resolve({ success: false, repo: repo.id, error: err.message });
    });
  });
}

// ── Serial group enforcement ─────────────────────────────────────────────────
// Finds and removes the first repo from sharedQueue whose serialGroup (if any)
// is not already claimed by another active worker.  Returns null when nothing
// is claimable (either queue empty or all remaining groups are busy).
function claimNextRepo(sharedQueue, status) {
  // Collect serialGroups that are currently in-flight
  const activeGroups = new Set(
    Object.values(status.workers)
      .map(w => w.serialGroup)
      .filter(Boolean)
  );

  for (let i = 0; i < sharedQueue.length; i++) {
    const repo = sharedQueue[i];
    const group = repo.serialGroup;
    // No group → always claimable.  Group → only claimable when no one else holds it.
    if (!group || !activeGroups.has(group)) {
      sharedQueue.splice(i, 1);   // Remove from shared array (JS single-threaded — safe)
      return repo;
    }
  }
  return null;   // All remaining repos blocked by an active serial group
}

// ── Worker loop ───────────────────────────────────────────────────────────────
async function workerLoop(workerId, sharedQueue, queue, status, startTime) {
  while (true) {
    // Enforce total time budget
    if (TOTAL_HOURS && (Date.now() - startTime) >= TOTAL_HOURS * 3_600_000) {
      log('Total time limit reached — stopping', 'end', workerId);
      break;
    }

    // Claim next repo, respecting serial groups
    const repo = claimNextRepo(sharedQueue, status);
    if (!repo) {
      if (sharedQueue.length > 0) {
        // Repos remain but all are blocked — wait and retry (another worker will free a group)
        log(`Serial group blocked — waiting for a slot (${sharedQueue.length} repos pending)`, 'pause', workerId);
        await new Promise(r => setTimeout(r, 15_000));
        continue;
      }
      log('No more repos — worker idle', 'end', workerId);
      break;
    }

    // Update status — include serialGroup so claimNextRepo can detect conflicts
    status.workers[workerId] = {
      currentRepo:  repo.id,
      currentName:  repo.name,
      startedAt:    new Date().toISOString(),
      ...(repo.serialGroup ? { serialGroup: repo.serialGroup } : {}),
    };
    saveStatus(status);

    const progressBefore = getRepoProgress(repo);
    const result         = await runRepoSession(repo, queue, workerId);

    // Record completion
    if (result.complete && !status.completedRepos.includes(repo.id)) {
      status.completedRepos.push(repo.id);
      log(`${repo.name} COMPLETE 🎉`, 'success', workerId);
    }

    // Auto-commit
    if (AUTO_COMMIT && result.progress?.passing > progressBefore.passing) {
      const p   = result.progress;
      const msg = `[harness] ${repo.name}: ${p.passing}/${p.total} features (${p.percent}%)`;
      gitCommit(repo.path, msg);
    }

    status.workers[workerId] = { currentRepo: null, lastRepo: repo.id, serialGroup: null };
    saveStatus(status);

    // Brief pause before grabbing next repo
    if (sharedQueue.length > 0) {
      await new Promise(r => setTimeout(r, INTER_REPO_DELAY_SEC * 1000));
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  const queue  = loadQueue();
  const status = loadStatus();

  status.startedAt = status.startedAt || new Date().toISOString();
  status.workers   = {};
  saveStatus(status);

  // Build ordered repo list
  let repos = queue.repos
    .filter(r => r.enabled !== false)
    .filter(r => !FORCE_REPO || r.id === FORCE_REPO)
    .filter(r => !isRepoComplete(r))
    .sort((a, b) => (a.priority || 999) - (b.priority || 999));

  if (repos.length === 0) {
    log('No enabled/incomplete repos in queue', 'warning');
    return;
  }

  const workers = Math.min(NUM_WORKERS, repos.length);
  log(`Parallel ACD Runner — ${workers} workers / ${repos.length} repos`, 'start');
  log(`Queue: ${repos.map(r => `P${r.priority}:${r.id}`).join(', ')}`, 'info');

  if (DRY_RUN) {
    log('[DRY RUN] Worker assignment preview:', 'info');
    repos.forEach((r, i) => {
      const w = (i % workers) + 1;
      const p = getRepoProgress(r);
      log(`  W${w} → P${r.priority} ${r.name}  (${p.passing}/${p.total})`, 'info');
    });
    return;
  }

  // Shared queue — all workers pull from this array
  const sharedQueue = [...repos];
  const startTime   = Date.now();

  // Launch all workers concurrently
  const workerPromises = Array.from({ length: workers }, (_, i) =>
    workerLoop(i + 1, sharedQueue, queue, status, startTime)
  );

  await Promise.allSettled(workerPromises);

  // Summary
  log('\n' + '═'.repeat(60), 'end');
  log('All workers finished', 'end');
  log('═'.repeat(60), 'end');
  for (const repo of repos) {
    const p    = getRepoProgress(repo);
    const done = isRepoComplete(repo);
    log(`${done ? '✅' : '🔄'} ${repo.name}: ${p.passing}/${p.total} (${p.percent}%)`, 'info');
  }

  status.workers   = {};
  status.finishedAt = new Date().toISOString();
  saveStatus(status);

  // Loop mode
  if (LOOP_MODE && repos.some(r => !isRepoComplete(r))) {
    log('Loop mode: restarting...', 'next');
    await new Promise(r => setTimeout(r, INTER_REPO_DELAY_SEC * 1000));
    return run();
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────
const cliArgs = process.argv.slice(2);

function getArg(name) {
  const eq  = cliArgs.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const idx = cliArgs.indexOf(name);
  if (idx !== -1 && idx + 1 < cliArgs.length) return cliArgs[idx + 1];
  return null;
}

if (cliArgs.includes('--help') || cliArgs.includes('-h')) {
  console.log(`
Parallel ACD Runner
===================
Runs N Claude harness workers simultaneously, each claiming repos from the queue.

Usage:
  node run-parallel.js [options]

Options:
  --workers=N        Number of parallel workers (default: 3)
  --queue PATH       Path to queue config file (default: ./repo-queue.json)
  --hours=N          Total hours to run across all workers
  --hours-per-repo=N Hours each worker spends on a single repo
  --repo=ID          Only run a specific repo (single worker)
  --dry-run          Preview worker assignment without running
  --status           Show current parallel runner status and exit
  --loop             Keep looping until all repos complete
  --no-commit        Disable auto git commits
  --delay=N          Seconds between repos per worker (default: 10)
  --help, -h         Show this help

Examples:
  node run-parallel.js --workers=3                 # 3 workers, default queue
  node run-parallel.js --workers=4 --hours=24      # 4 workers for 24 hours
  node run-parallel.js --dry-run --workers=5       # Preview 5-worker assignment
  node run-parallel.js --status                    # Check live status
`);
  process.exit(0);
}

// Status command
if (cliArgs.includes('--status')) {
  const queue  = loadQueue();
  const status = loadStatus();
  console.log('\n📊 Parallel Runner Status\n');
  console.log(`Started:    ${status.startedAt || 'Never'}`);
  console.log(`Finished:   ${status.finishedAt || 'Running'}`);
  console.log(`Completed:  ${(status.completedRepos || []).length} repos\n`);

  console.log('Active Workers:');
  const ws = status.workers || {};
  if (Object.keys(ws).length === 0) console.log('  (none running)');
  for (const [id, w] of Object.entries(ws)) {
    console.log(`  W${id}: ${w.currentRepo ? `working on ${w.currentName}` : `idle (last: ${w.lastRepo || 'none'})`}`);
  }

  console.log('\nRepo Progress:');
  const repos = queue.repos.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  for (const repo of repos) {
    const p    = getRepoProgress(repo);
    const done = isRepoComplete(repo);
    const en   = repo.enabled !== false ? '✓' : '✗';
    const icon = done ? '✅' : (ws && Object.values(ws).some(w => w.currentRepo === repo.id) ? '🔄' : '⏳');
    console.log(`  ${icon} [${en}] P${repo.priority || '?'} ${repo.name}: ${p.passing}/${p.total} (${p.percent}%)`);
  }
  console.log('');
  process.exit(0);
}

// Parse flags
QUEUE_FILE  = getArg('--queue') || QUEUE_FILE;
DRY_RUN     = cliArgs.includes('--dry-run');
FORCE_REPO  = getArg('--repo');
LOOP_MODE   = cliArgs.includes('--loop');
AUTO_COMMIT = !cliArgs.includes('--no-commit');

const wArg = getArg('--workers');
if (wArg) NUM_WORKERS = parseInt(wArg, 10);

const hArg = getArg('--hours');
if (hArg) TOTAL_HOURS = parseFloat(hArg);

const hprArg = getArg('--hours-per-repo');
if (hprArg) HOURS_PER_REPO = parseFloat(hprArg);

const dArg = getArg('--delay');
if (dArg) INTER_REPO_DELAY_SEC = parseInt(dArg, 10);

if (isNaN(NUM_WORKERS) || NUM_WORKERS < 1) {
  log(`Invalid --workers value: ${wArg}`, 'error');
  process.exit(1);
}

// Check Claude CLI
try { execSync('which claude', { stdio: 'ignore' }); }
catch (_) {
  log('Claude CLI not found. Install Claude Code first.', 'error');
  process.exit(1);
}

run().catch(e => {
  log(`Fatal: ${e.message}`, 'error');
  process.exit(1);
});
