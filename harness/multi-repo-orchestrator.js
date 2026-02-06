#!/usr/bin/env node

/**
 * Multi-Repo Queue Orchestrator
 *
 * Manages autonomous coding across multiple repositories in priority order.
 * Reads repo-queue.json and processes enabled projects sequentially.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Default configuration
const DEFAULT_CONFIG = {
  queueFile: path.join(__dirname, 'repo-queue.json'),
  statusFile: path.join(PROJECT_ROOT, 'multi-repo-status.json'),
  maxSessionsPerRepo: 50,
  sessionDelay: 5000,
  skipCompleted: true
};

// Logging with timestamps
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    start: '🚀',
    end: '🏁',
    repo: '📁'
  }[level] || '•';

  console.log(`${timestamp} ${prefix} ${message}`);
}

/**
 * Load and parse repo queue
 */
function loadRepoQueue(queueFile) {
  if (!fs.existsSync(queueFile)) {
    throw new Error(`Queue file not found: ${queueFile}`);
  }

  try {
    const data = JSON.parse(fs.readFileSync(queueFile, 'utf-8'));
    return data;
  } catch (e) {
    throw new Error(`Failed to parse queue file: ${e.message}`);
  }
}

/**
 * Get project completion stats
 */
function getProjectStats(repo) {
  const featureListPath = repo.featureList;

  if (!fs.existsSync(featureListPath)) {
    log(`Feature list not found for ${repo.name}: ${featureListPath}`, 'warning');
    return { total: 0, passing: 0, pending: 0, percentComplete: 0, complete: false };
  }

  try {
    const data = JSON.parse(fs.readFileSync(featureListPath, 'utf-8'));
    const features = data.features || [];
    const total = features.length;
    const passing = features.filter(f => f.passes).length;
    const pending = total - passing;
    const percentComplete = total > 0 ? ((passing / total) * 100).toFixed(1) : 0;
    const complete = total > 0 && passing === total;

    return { total, passing, pending, percentComplete, complete };
  } catch (e) {
    log(`Error reading feature list for ${repo.name}: ${e.message}`, 'error');
    return { total: 0, passing: 0, pending: 0, percentComplete: 0, complete: false };
  }
}

/**
 * Filter and sort repos by priority
 */
function getEnabledRepos(queue, skipCompleted = true) {
  return queue.repos
    .filter(repo => {
      // Must be enabled
      if (!repo.enabled) {
        log(`Skipping ${repo.name} - disabled`, 'info');
        return false;
      }

      // Optionally skip completed
      if (skipCompleted) {
        const stats = getProjectStats(repo);
        if (stats.complete) {
          log(`Skipping ${repo.name} - already complete (${stats.passing}/${stats.total})`, 'success');
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => a.priority - b.priority); // Lower priority number = higher priority
}

/**
 * Update orchestrator status file
 */
function updateStatus(currentRepo, processedRepos, totalRepos) {
  const statusData = {
    lastUpdated: new Date().toISOString(),
    currentRepo: currentRepo ? {
      id: currentRepo.id,
      name: currentRepo.name,
      priority: currentRepo.priority,
      stats: getProjectStats(currentRepo)
    } : null,
    progress: {
      processedRepos,
      totalRepos,
      percentComplete: totalRepos > 0 ? ((processedRepos / totalRepos) * 100).toFixed(1) : 0
    }
  };

  fs.writeFileSync(DEFAULT_CONFIG.statusFile, JSON.stringify(statusData, null, 2));
}

/**
 * Run harness on a single repo
 */
async function runHarnessOnRepo(repo, options = {}) {
  const {
    maxSessions = DEFAULT_CONFIG.maxSessionsPerRepo,
    continuous = true,
    enableSleep = false  // Disable sleep in multi-repo mode by default
  } = options;

  log(`Processing repository: ${repo.name}`, 'repo');
  log(`  Path: ${repo.path}`);
  log(`  Priority: ${repo.priority}`);
  log(`  Complexity: ${repo.complexity}`);
  if (repo.focus) log(`  Focus: ${repo.focus}`);

  const stats = getProjectStats(repo);
  log(`  Progress: ${stats.passing}/${stats.total} features (${stats.percentComplete}%)`);

  // If already complete and untilComplete is false, skip
  if (stats.complete && !repo.untilComplete) {
    log(`Skipping ${repo.name} - already complete`, 'success');
    return { skipped: true, complete: true };
  }

  return new Promise((resolve, reject) => {
    const args = [];

    if (continuous || repo.untilComplete) {
      args.push('--continuous');
    }

    args.push(`--max=${maxSessions}`);

    if (!enableSleep) {
      args.push('--no-sleep');
    }

    log(`Running: node harness/run-harness.js ${args.join(' ')}`, 'start');
    log(`Working directory: ${repo.path}`);

    const startTime = Date.now();

    const harness = spawn('node', ['harness/run-harness.js', ...args], {
      cwd: repo.path,
      stdio: 'inherit'
    });

    harness.on('error', (error) => {
      log(`Failed to start harness for ${repo.name}: ${error.message}`, 'error');
      reject(error);
    });

    harness.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      const newStats = getProjectStats(repo);

      if (code === 0) {
        log(`Harness completed for ${repo.name} in ${duration} minutes`, 'success');
        log(`Final progress: ${newStats.passing}/${newStats.total} (${newStats.percentComplete}%)`);
        resolve({ code, stats: newStats, duration, complete: newStats.complete });
      } else {
        log(`Harness exited with code ${code} for ${repo.name}`, 'error');
        resolve({ code, stats: newStats, duration, error: true, complete: newStats.complete });
      }
    });
  });
}

/**
 * Main orchestrator loop
 */
async function runOrchestrator(options = {}) {
  const {
    queueFile = DEFAULT_CONFIG.queueFile,
    maxSessionsPerRepo = DEFAULT_CONFIG.maxSessionsPerRepo,
    skipCompleted = DEFAULT_CONFIG.skipCompleted,
    continuous = true,
    stopOnError = false
  } = options;

  log('Multi-Repo Queue Orchestrator Starting', 'start');
  log(`Queue file: ${queueFile}`);
  log(`Max sessions per repo: ${maxSessionsPerRepo}`);
  log(`Skip completed: ${skipCompleted ? 'Yes' : 'No'}`);
  log(`Stop on error: ${stopOnError ? 'Yes' : 'No'}`);

  // Load queue
  const queue = loadRepoQueue(queueFile);
  log(`Loaded queue with ${queue.repos.length} repositories`);

  // Get enabled repos
  const enabledRepos = getEnabledRepos(queue, skipCompleted);
  log(`Found ${enabledRepos.length} enabled repositories to process`);

  if (enabledRepos.length === 0) {
    log('No repositories to process. Exiting.', 'end');
    return;
  }

  // Process each repo in priority order
  let processedCount = 0;

  for (const repo of enabledRepos) {
    updateStatus(repo, processedCount, enabledRepos.length);

    try {
      const result = await runHarnessOnRepo(repo, {
        maxSessions: maxSessionsPerRepo,
        continuous: continuous || repo.untilComplete
      });

      processedCount++;

      if (result.error && stopOnError) {
        log(`Stopping orchestrator due to error in ${repo.name}`, 'error');
        break;
      }

      if (result.complete && repo.untilComplete) {
        log(`Repository ${repo.name} is complete!`, 'success');
      }

      // Delay between repos
      if (processedCount < enabledRepos.length) {
        log(`Waiting ${DEFAULT_CONFIG.sessionDelay / 1000}s before next repository...`);
        await new Promise(r => setTimeout(r, DEFAULT_CONFIG.sessionDelay));
      }

    } catch (error) {
      log(`Failed to process ${repo.name}: ${error.message}`, 'error');

      if (stopOnError) {
        log('Stopping orchestrator due to error', 'error');
        break;
      }

      processedCount++;
    }
  }

  updateStatus(null, processedCount, enabledRepos.length);

  log(`Orchestrator finished. Processed ${processedCount}/${enabledRepos.length} repositories`, 'end');

  // Summary stats
  log('\n=== SUMMARY ===', 'info');
  for (const repo of enabledRepos) {
    const stats = getProjectStats(repo);
    const status = stats.complete ? '✅ COMPLETE' : `⏳ ${stats.percentComplete}%`;
    log(`${status} - ${repo.name} (${stats.passing}/${stats.total} features)`, 'info');
  }
}

/**
 * CLI handling
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    queueFile: args.find(a => a.startsWith('--queue='))?.split('=')[1] || DEFAULT_CONFIG.queueFile,
    maxSessionsPerRepo: parseInt(args.find(a => a.startsWith('--max='))?.split('=')[1]) || DEFAULT_CONFIG.maxSessionsPerRepo,
    skipCompleted: !args.includes('--no-skip'),
    continuous: !args.includes('--single'),
    stopOnError: args.includes('--stop-on-error')
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Multi-Repo Queue Orchestrator

Processes multiple repositories in priority order based on repo-queue.json.

Usage: node multi-repo-orchestrator.js [options]

Options:
  --queue=FILE         Path to queue file (default: harness/repo-queue.json)
  --max=N              Max sessions per repo (default: 50)
  --no-skip            Process all repos, even completed ones
  --single             Run single session per repo instead of continuous
  --stop-on-error      Stop orchestrator if any repo fails
  --help, -h           Show this help message

Examples:
  node multi-repo-orchestrator.js                    # Process all enabled repos
  node multi-repo-orchestrator.js --max=10           # Limit to 10 sessions per repo
  node multi-repo-orchestrator.js --stop-on-error    # Stop on first error
  node multi-repo-orchestrator.js --single           # Run one session per repo
`);
    process.exit(0);
  }

  runOrchestrator(options).catch(e => {
    log(`Fatal error: ${e.message}`, 'error');
    process.exit(1);
  });
}

export default runOrchestrator;
