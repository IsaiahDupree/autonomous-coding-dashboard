#!/usr/bin/env node

/**
 * Multi-Repo Queue Runner
 * ========================
 * 
 * Chains multiple repos together, working through them by priority.
 * Supports PRD-to-feature-list generation and priority-based ordering.
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as metricsDb from './metrics-db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
let QUEUE_FILE = path.join(__dirname, 'repo-queue.json');
let GENERATE_FEATURES = false;
let DRY_RUN = false;
let HOURS_PER_REPO = null;
let TOTAL_HOURS = null;
let FORCE_REPO = null;
let LOOP_MODE = false;
let AUTO_COMMIT = true;
let INTER_REPO_DELAY_SEC = 30;
let ENABLE_METRICS_DB = true;

const STATUS_FILE = path.join(__dirname, 'queue-status.json');
const LOG_FILE = path.join(__dirname, 'queue-output.log');

// Metrics tracking state
let metricsEnabled = false;
let sessionCounter = {};

// Logging
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    start: '🚀',
    end: '🏁',
    pause: '⏸️',
    next: '➡️',
    skip: '⏭️',
  }[level] || '•';

  const line = `${timestamp} ${prefix} ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (e) {
    // ignore
  }
}

function loadQueue() {
  if (!fs.existsSync(QUEUE_FILE)) {
    log(`Queue file not found: ${QUEUE_FILE}`, 'error');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
}

function saveStatus(status) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

function loadStatus() {
  if (!fs.existsSync(STATUS_FILE)) {
    return {
      currentRepo: null,
      completedRepos: [],
      startedAt: null,
      lastUpdated: null,
      totalSessions: 0,
      lastCompletedRepo: null,
    };
  }
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
  } catch (e) {
    return {
      currentRepo: null,
      completedRepos: [],
      startedAt: null,
      lastUpdated: null,
      totalSessions: 0,
      lastCompletedRepo: null,
    };
  }
}

function gitCommit(repoPath, message) {
  if (!AUTO_COMMIT) return false;
  try {
    execSync('git add -A', { cwd: repoPath, stdio: 'ignore' });
    execSync(`git commit -m "${message}" --allow-empty`, { cwd: repoPath, stdio: 'ignore' });
    log(`Git commit: ${message}`, 'success');
    return true;
  } catch (e) {
    log(`Git commit failed: ${e.message}`, 'warning');
    return false;
  }
}

function getRepoProgress(repo) {
  if (!fs.existsSync(repo.featureList)) {
    return { total: 0, passing: 0, percent: 0 };
  }
  try {
    const data = JSON.parse(fs.readFileSync(repo.featureList, 'utf-8'));
    const features = data.features || [];
    const total = features.length;
    const passing = features.filter(f => f.passes).length;
    return {
      total,
      passing,
      percent: total > 0 ? ((passing / total) * 100).toFixed(1) : 0,
    };
  } catch (e) {
    return { total: 0, passing: 0, percent: 0 };
  }
}

function isRepoComplete(repo) {
  const progress = getRepoProgress(repo);
  return progress.total > 0 && progress.passing === progress.total;
}

async function generateFeaturesForRepo(repo) {
  if (!repo.prd || !fs.existsSync(repo.prd)) {
    log(`No PRD found for ${repo.name}, skipping feature generation`, 'warning');
    return false;
  }

  // Check if features already exist
  if (fs.existsSync(repo.featureList)) {
    try {
      const existing = JSON.parse(fs.readFileSync(repo.featureList, 'utf-8'));
      if (existing.features && existing.features.length > 0) {
        log(`Feature list exists for ${repo.name} (${existing.features.length} features)`, 'info');
        return true;
      }
    } catch (e) {
      // Continue to generate
    }
  }

  log(`Generating feature list for ${repo.name}...`, 'info');

  return new Promise((resolve) => {
    const proc = spawn('node', [
      path.join(__dirname, 'generate-features.js'),
      `--prd=${repo.prd}`,
      `--output=${repo.featureList}`,
      `--name=${repo.name}`,
    ], {
      cwd: __dirname,
      stdio: 'inherit',
    });

    proc.on('close', (code) => {
      resolve(code === 0);
    });

    proc.on('error', (err) => {
      log(`Feature generation failed: ${err.message}`, 'error');
      resolve(false);
    });
  });
}

// Get model based on complexity level from queue config (target-independent)
function getModelForComplexity(queue, complexity, taskType = null) {
  const config = queue.modelConfig || {};
  const levels = config.complexityLevels || {
    critical: { models: ['opus', 'sonnet'], fallback: 'sonnet' },
    high: { models: ['sonnet', 'opus'], fallback: 'haiku' },
    medium: { models: ['sonnet', 'haiku'], fallback: 'haiku' },
    low: { models: ['haiku'], fallback: 'haiku' },
    trivial: { models: ['haiku'], fallback: 'haiku' }
  };
  
  // If taskType provided, map it to complexity level
  let effectiveComplexity = complexity;
  if (taskType && config.taskTypeMapping) {
    effectiveComplexity = config.taskTypeMapping[taskType] || complexity;
  }
  
  // Use default if complexity not specified
  if (!effectiveComplexity) {
    effectiveComplexity = config.defaultComplexity || 'medium';
  }
  
  const level = levels[effectiveComplexity] || levels.medium;
  // Return primary model (first in list)
  return { 
    model: level.models[0] || 'haiku',
    complexity: effectiveComplexity,
    maxRetries: level.maxRetries || 3,
    fallback: level.fallback || 'haiku'
  };
}

// Detect task type from feature or focus description
function detectTaskType(feature, focus) {
  const text = `${feature || ''} ${focus || ''}`.toLowerCase();
  
  if (text.includes('architect') || text.includes('system design')) return 'architecture';
  if (text.includes('security') || text.includes('auth')) return 'security';
  if (text.includes('api') || text.includes('integration')) return 'api_integration';
  if (text.includes('database') || text.includes('migration') || text.includes('schema')) return 'database';
  if (text.includes('new feature') || text.includes('implement')) return 'new_feature';
  if (text.includes('ui') || text.includes('component') || text.includes('frontend')) return 'ui_component';
  if (text.includes('refactor') || text.includes('cleanup')) return 'refactor';
  if (text.includes('test') || text.includes('spec')) return 'test';
  if (text.includes('bug') || text.includes('fix')) return 'bug_fix';
  if (text.includes('doc') || text.includes('readme')) return 'documentation';
  
  return null; // Use default
}

async function runRepoSession(repo, options = {}) {
  const { maxSessions, hours, untilComplete, queue } = options;

  return new Promise((resolve) => {
    const args = [
      path.join(__dirname, 'run-harness-v2.js'),
      `--path=${repo.path}`,
      `--project=${repo.id}`,
    ];

    // Select model based on complexity (target-independent)
    // Detect task type from focus or use repo complexity as fallback
    const taskType = detectTaskType(null, repo.focus);
    const modelConfig = getModelForComplexity(queue || {}, repo.complexity, taskType);
    args.push(`--model=${modelConfig.model}`);
    args.push(`--max-retries=${modelConfig.maxRetries}`);
    args.push(`--fallback-model=${modelConfig.fallback}`);
    log(`Using model: ${modelConfig.model} (complexity: ${modelConfig.complexity}, task: ${taskType || 'default'})`, 'info');

    // Add prompt if specified
    if (repo.prompt) {
      const promptPath = repo.prompt.startsWith('/') 
        ? repo.prompt 
        : path.join(__dirname, repo.prompt);
      if (fs.existsSync(promptPath)) {
        args.push(`--prompt=${promptPath}`);
      }
    }

    // Always enable adaptive delay for sawtooth pattern
    args.push('--adaptive-delay');

    // Duration/completion options
    if (untilComplete || repo.untilComplete) {
      args.push('--until-complete');
    } else if (hours) {
      args.push(`--hours=${hours}`);
    } else if (repo.maxSessions || maxSessions) {
      args.push(`--max=${repo.maxSessions || maxSessions}`);
    }

    log(`Starting harness for ${repo.name}`, 'start');
    log(`Command: node ${args.join(' ')}`, 'info');

    if (DRY_RUN) {
      log(`[DRY RUN] Would execute harness for ${repo.name}`, 'info');
      resolve({ success: true, repo: repo.id });
      return;
    }

    const proc = spawn('node', args, {
      cwd: __dirname,
      stdio: 'inherit',
    });

    proc.on('close', (code) => {
      const progress = getRepoProgress(repo);
      log(`Harness finished for ${repo.name} (exit: ${code}, progress: ${progress.passing}/${progress.total})`, code === 0 ? 'success' : 'warning');
      resolve({ 
        success: code === 0, 
        repo: repo.id,
        progress,
        complete: isRepoComplete(repo),
      });
    });

    proc.on('error', (err) => {
      log(`Harness failed for ${repo.name}: ${err.message}`, 'error');
      resolve({ success: false, repo: repo.id, error: err.message });
    });
  });
}

async function initMetricsDb() {
  if (!ENABLE_METRICS_DB) {
    log('Metrics DB disabled', 'info');
    return false;
  }
  try {
    const result = await metricsDb.testConnection();
    log(`Metrics DB connected: ${result.time}`, 'success');
    metricsEnabled = true;
    return true;
  } catch (error) {
    log(`Metrics DB unavailable: ${error.message}`, 'warning');
    metricsEnabled = false;
    return false;
  }
}

async function trackSessionStart(repoId, repoName, repoPath) {
  if (!metricsEnabled) return null;
  try {
    await metricsDb.ensureTarget(repoId, repoName, repoPath);
    sessionCounter[repoId] = (sessionCounter[repoId] || 0) + 1;
    const session = await metricsDb.startSession(repoId, sessionCounter[repoId]);
    return session.id;
  } catch (error) {
    log(`Failed to track session start: ${error.message}`, 'warning');
    return null;
  }
}

async function trackSessionEnd(sessionId, repoId, result, progressBefore, progressAfter) {
  if (!metricsEnabled || !sessionId) return;
  try {
    await metricsDb.endSession(sessionId, {
      status: result.success ? 'completed' : 'failed',
      inputTokens: 0, // Would need to parse from output
      outputTokens: 0,
      costUsd: 0,
      featuresBefore: progressBefore.passing,
      featuresAfter: progressAfter.passing,
      featuresCompleted: progressAfter.passing - progressBefore.passing,
      commitsMade: 0,
      errorType: result.error ? 'unknown' : null,
      errorMessage: result.error || null,
    });
    await metricsDb.updateDailyStats(repoId);
  } catch (error) {
    log(`Failed to track session end: ${error.message}`, 'warning');
  }
}

async function runQueue() {
  const queue = loadQueue();
  const status = loadStatus();

  log('Multi-Repo Queue Runner Starting', 'start');
  log(`Queue file: ${QUEUE_FILE}`, 'info');
  
  // Initialize metrics database
  await initMetricsDb();

  // Sort repos by priority
  const repos = queue.repos
    .filter(r => r.enabled !== false)
    .filter(r => !FORCE_REPO || r.id === FORCE_REPO)
    .sort((a, b) => (a.priority || 999) - (b.priority || 999));

  if (repos.length === 0) {
    log('No enabled repos in queue', 'warning');
    return;
  }

  log(`Processing ${repos.length} repos in priority order`, 'info');
  for (const repo of repos) {
    log(`  ${repo.priority || '?'}. ${repo.name} (${repo.id})`, 'info');
  }

  status.startedAt = status.startedAt || new Date().toISOString();
  status.lastUpdated = new Date().toISOString();
  saveStatus(status);

  const startTime = Date.now();
  const totalDurationMs = TOTAL_HOURS ? TOTAL_HOURS * 60 * 60 * 1000 : null;

  for (const repo of repos) {
    // Check total time limit
    if (totalDurationMs && (Date.now() - startTime) >= totalDurationMs) {
      log('Total time limit reached', 'end');
      break;
    }

    // Skip completed repos
    if (isRepoComplete(repo)) {
      log(`Skipping ${repo.name} - already complete`, 'skip');
      if (!status.completedRepos.includes(repo.id)) {
        status.completedRepos.push(repo.id);
      }
      continue;
    }

    log(`\n${'='.repeat(60)}`, 'info');
    log(`Processing: ${repo.name} (Priority ${repo.priority || '?'})`, 'next');
    log(`${'='.repeat(60)}`, 'info');

    // Generate features if needed
    if (GENERATE_FEATURES) {
      const generated = await generateFeaturesForRepo(repo);
      if (!generated && !fs.existsSync(repo.featureList)) {
        log(`Skipping ${repo.name} - no feature list available`, 'skip');
        continue;
      }
    }

    // Check if feature list exists
    if (!fs.existsSync(repo.featureList)) {
      log(`Skipping ${repo.name} - no feature list found at ${repo.featureList}`, 'skip');
      continue;
    }

    status.currentRepo = repo.id;
    status.lastUpdated = new Date().toISOString();
    saveStatus(status);

    const progressBefore = getRepoProgress(repo);
    log(`Current progress: ${progressBefore.passing}/${progressBefore.total} (${progressBefore.percent}%)`, 'info');

    // Track session start in metrics DB
    const sessionId = await trackSessionStart(repo.id, repo.name, repo.path);

    // Calculate time for this repo
    let repoHours = HOURS_PER_REPO;
    if (totalDurationMs) {
      const remainingMs = totalDurationMs - (Date.now() - startTime);
      const remainingRepos = repos.length - repos.indexOf(repo);
      repoHours = Math.max(1, (remainingMs / remainingRepos) / (60 * 60 * 1000));
    }

    // Run the harness
    const result = await runRepoSession(repo, {
      hours: repoHours,
      maxSessions: queue.defaults?.maxSessionsPerRepo || 50,
      untilComplete: repo.untilComplete,
      queue: queue,  // Pass queue config for model tier selection
    });

    // Track session end in metrics DB
    const progressAfter = getRepoProgress(repo);
    await trackSessionEnd(sessionId, repo.id, result, progressBefore, progressAfter);

    if (result.complete) {
      log(`${repo.name} is now complete!`, 'success');
      if (!status.completedRepos.includes(repo.id)) {
        status.completedRepos.push(repo.id);
      }
    }

    status.lastUpdated = new Date().toISOString();
    saveStatus(status);

    // Git commit progress if enabled
    if (AUTO_COMMIT && result.progress.passing > 0) {
      const commitMsg = `[harness] ${repo.name}: ${result.progress.passing}/${result.progress.total} features (${result.progress.percent}%)`;
      gitCommit(repo.path, commitMsg);
    }

    // Brief pause between repos (configurable)
    if (repos.indexOf(repo) < repos.length - 1) {
      log(`Pausing ${INTER_REPO_DELAY_SEC} seconds before next repo...`, 'pause');
      await new Promise(r => setTimeout(r, INTER_REPO_DELAY_SEC * 1000));
    }
  }

  // Final summary
  log('\n' + '='.repeat(60), 'info');
  log('Queue Processing Complete', 'end');
  log('='.repeat(60), 'info');

  for (const repo of repos) {
    const progress = getRepoProgress(repo);
    const complete = isRepoComplete(repo);
    const icon = complete ? '✅' : '🔄';
    log(`${icon} ${repo.name}: ${progress.passing}/${progress.total} (${progress.percent}%)`, 'info');
  }

  status.currentRepo = null;
  status.lastUpdated = new Date().toISOString();
  saveStatus(status);

  // Loop mode: restart queue if enabled and not all complete
  if (LOOP_MODE) {
    const allComplete = repos.every(r => isRepoComplete(r));
    if (!allComplete) {
      log('Loop mode: restarting queue...', 'next');
      await new Promise(r => setTimeout(r, INTER_REPO_DELAY_SEC * 1000));
      return runQueue(); // Recursive call to restart
    } else {
      log('Loop mode: all repos complete, stopping', 'end');
    }
  }
}

// CLI
const args = process.argv.slice(2);

function getArgValue(name) {
  const eq = args.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.split('=')[1];
  const idx = args.indexOf(name);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return null;
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Multi-Repo Queue Runner
========================

Chains multiple repos together, working through them by priority.

Usage:
  node run-queue.js [options]

Options:
  --queue PATH       Path to queue config file (default: ./repo-queue.json)
  --generate         Generate feature lists from PRDs before running
  --hours=N          Total hours to run across all repos
  --hours-per-repo=N Hours to spend on each repo
  --repo=ID          Only run a specific repo
  --dry-run          Show what would be done without executing
  --status           Show current queue status and exit
  --loop             Keep running queue until all repos complete
  --no-commit        Disable auto git commits after progress
  --delay=N          Seconds to pause between repos (default: 30)
  --help, -h         Show this help

Examples:
  node run-queue.js                          # Run queue with defaults
  node run-queue.js --generate               # Generate features then run
  node run-queue.js --hours=24               # Run for 24 hours total
  node run-queue.js --repo=gapradar          # Only run GapRadar
  node run-queue.js --status                 # Check status
`);
  process.exit(0);
}

// Parse arguments
QUEUE_FILE = getArgValue('--queue') || QUEUE_FILE;
GENERATE_FEATURES = args.includes('--generate');
DRY_RUN = args.includes('--dry-run');
FORCE_REPO = getArgValue('--repo');

const totalHours = getArgValue('--hours');
if (totalHours) TOTAL_HOURS = parseFloat(totalHours);

const hoursPerRepo = getArgValue('--hours-per-repo');
if (hoursPerRepo) HOURS_PER_REPO = parseFloat(hoursPerRepo);

LOOP_MODE = args.includes('--loop');
AUTO_COMMIT = !args.includes('--no-commit');

const delayArg = getArgValue('--delay');
if (delayArg) INTER_REPO_DELAY_SEC = parseInt(delayArg, 10);

// Status command
if (args.includes('--status')) {
  const queue = loadQueue();
  const status = loadStatus();

  console.log('\n📊 Queue Status\n');
  console.log(`Current repo: ${status.currentRepo || 'None'}`);
  console.log(`Started: ${status.startedAt || 'Never'}`);
  console.log(`Last updated: ${status.lastUpdated || 'Never'}`);
  console.log(`\nRepo Progress:`);

  const repos = queue.repos.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  for (const repo of repos) {
    const progress = getRepoProgress(repo);
    const complete = isRepoComplete(repo);
    const enabled = repo.enabled !== false ? '✓' : '✗';
    const status_icon = complete ? '✅' : (status.currentRepo === repo.id ? '🔄' : '⏳');
    console.log(`  ${status_icon} [${enabled}] P${repo.priority || '?'} ${repo.name}: ${progress.passing}/${progress.total} (${progress.percent}%)`);
  }
  console.log('');
  process.exit(0);
}

// Check for Claude CLI
try {
  execSync('which claude', { stdio: 'ignore' });
} catch (e) {
  log('Claude CLI not found. Please install Claude Code first.', 'error');
  process.exit(1);
}

// Run
runQueue().catch(e => {
  log(`Fatal error: ${e.message}`, 'error');
  process.exit(1);
});
