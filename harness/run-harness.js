#!/usr/bin/env node

/**
 * Agent Harness Runner
 * 
 * Orchestrates autonomous coding sessions using the Claude Agent SDK.
 * Automatically switches between initializer and coding agent modes.
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Configuration
const CONFIG = {
  progressFile: path.join(PROJECT_ROOT, 'claude-progress.txt'),
  featureList: path.join(PROJECT_ROOT, 'feature_list.json'),
  initScript: path.join(PROJECT_ROOT, 'init.sh'),
  initializerPrompt: path.join(__dirname, 'prompts/initializer.md'),
  codingPrompt: path.join(__dirname, 'prompts/coding.md'),
  maxSessions: 100,
  sessionDelayMs: 5000,
  statusFile: path.join(PROJECT_ROOT, 'harness-status.json')
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
    end: '🏁'
  }[level] || '•';
  
  console.log(`${timestamp} ${prefix} ${message}`);
}

// Check if this is the first run
function isFirstRun() {
  const hasProgress = fs.existsSync(CONFIG.progressFile);
  const hasFeatures = fs.existsSync(CONFIG.featureList);
  
  if (!hasProgress || !hasFeatures) {
    log('First run detected - no progress or feature files found');
    return true;
  }
  
  // Check if feature list has any features
  try {
    const features = JSON.parse(fs.readFileSync(CONFIG.featureList, 'utf-8'));
    if (!features.features || features.features.length === 0) {
      log('Feature list is empty - treating as first run');
      return true;
    }
  } catch (e) {
    log('Could not parse feature list - treating as first run', 'warning');
    return true;
  }
  
  return false;
}

// Get current progress stats
function getProgressStats() {
  if (!fs.existsSync(CONFIG.featureList)) {
    return { total: 0, passing: 0, pending: 0, percentComplete: 0 };
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG.featureList, 'utf-8'));
    const features = data.features || [];
    const total = features.length;
    const passing = features.filter(f => f.passes).length;
    
    return {
      total,
      passing,
      pending: total - passing,
      percentComplete: total > 0 ? ((passing / total) * 100).toFixed(1) : 0
    };
  } catch (e) {
    log('Error reading feature list: ' + e.message, 'error');
    return { total: 0, passing: 0, pending: 0, percentComplete: 0 };
  }
}

// Update harness status file (for dashboard integration)
function updateStatus(sessionType, status, stats = null) {
  const statusData = {
    lastUpdated: new Date().toISOString(),
    sessionType,
    status,
    stats: stats || getProgressStats(),
    pid: process.pid
  };
  
  fs.writeFileSync(CONFIG.statusFile, JSON.stringify(statusData, null, 2));
}

// Get the appropriate prompt for this session
function getPrompt() {
  const promptFile = isFirstRun() ? CONFIG.initializerPrompt : CONFIG.codingPrompt;
  
  if (!fs.existsSync(promptFile)) {
    throw new Error(`Prompt file not found: ${promptFile}`);
  }
  
  return fs.readFileSync(promptFile, 'utf-8');
}

// Run a single agent session
function runSession(sessionNumber) {
  return new Promise((resolve, reject) => {
    const sessionType = isFirstRun() ? 'INITIALIZER' : 'CODING';
    const stats = getProgressStats();
    
    log(`Starting session #${sessionNumber} (${sessionType})`, 'start');
    log(`Progress: ${stats.passing}/${stats.total} features (${stats.percentComplete}%)`);
    
    updateStatus(sessionType, 'running', stats);
    
    const prompt = getPrompt();
    
    // Build Claude command arguments
    const args = [
      '-p', prompt,
      '--allowedTools', 'Edit', 'Bash', 'Read', 'Write', 'mcp__puppeteer',
      '--output-format', 'stream-json',
      '--verbose'
    ];
    
    const startTime = Date.now();
    let output = '';
    
    // Authentication: Always use Claude CLI's local auth (most reliable)
    // Clear any API keys from environment to prevent overriding local auth
    const env = { ...process.env };
    delete env.CLAUDE_CODE_OAUTH_TOKEN;
    delete env.ANTHROPIC_API_KEY;
    delete env.CLAUDE_API_KEY;
    
    log(`Using Claude CLI local authentication`, 'info');
    
    const claude = spawn('claude', args, {
      cwd: PROJECT_ROOT,
      env,
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    claude.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });
    
    claude.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    claude.on('error', (error) => {
      log(`Failed to start Claude: ${error.message}`, 'error');
      updateStatus(sessionType, 'error', stats);
      reject(error);
    });
    
    claude.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      const newStats = getProgressStats();
      
      if (code === 0) {
        log(`Session #${sessionNumber} completed in ${duration} minutes`, 'success');
        log(`Progress: ${newStats.passing}/${newStats.total} features (${newStats.percentComplete}%)`);
        updateStatus(sessionType, 'completed', newStats);
        resolve({ code, output, stats: newStats, duration });
      } else {
        log(`Session #${sessionNumber} exited with code ${code}`, 'error');
        updateStatus(sessionType, 'failed', newStats);
        resolve({ code, output, stats: newStats, duration, error: true });
      }
    });
  });
}

// Check if all features are complete
function isProjectComplete() {
  const stats = getProgressStats();
  return stats.total > 0 && stats.passing === stats.total;
}

// Main harness loop
async function runHarness(options = {}) {
  const { maxSessions = CONFIG.maxSessions, continuous = false } = options;
  
  log('Agent Harness Starting', 'start');
  log(`Project root: ${PROJECT_ROOT}`);
  log(`Max sessions: ${maxSessions}`);
  log(`Mode: ${continuous ? 'Continuous' : 'Single session'}`);
  
  let sessionNumber = 1;
  
  while (sessionNumber <= maxSessions) {
    // Check if already complete
    if (isProjectComplete()) {
      log('All features implemented! Project complete.', 'success');
      break;
    }
    
    try {
      const result = await runSession(sessionNumber);
      
      // If not continuous mode, exit after one session
      if (!continuous) {
        log('Single session mode - exiting', 'end');
        break;
      }
      
      // Check completion after session
      if (isProjectComplete()) {
        log('All features implemented! Project complete.', 'success');
        break;
      }
      
      // If session errored, wait longer before retry
      const delay = result.error ? CONFIG.sessionDelayMs * 2 : CONFIG.sessionDelayMs;
      log(`Waiting ${delay / 1000}s before next session...`);
      await new Promise(r => setTimeout(r, delay));
      
      sessionNumber++;
      
    } catch (error) {
      log(`Session failed: ${error.message}`, 'error');
      
      if (!continuous) {
        process.exit(1);
      }
      
      // Wait and retry
      await new Promise(r => setTimeout(r, CONFIG.sessionDelayMs * 3));
      sessionNumber++;
    }
  }
  
  const finalStats = getProgressStats();
  log(`Harness finished. Final progress: ${finalStats.passing}/${finalStats.total} (${finalStats.percentComplete}%)`, 'end');
}

// CLI handling
const args = process.argv.slice(2);
const options = {
  continuous: args.includes('--continuous') || args.includes('-c'),
  maxSessions: parseInt(args.find(a => a.startsWith('--max='))?.split('=')[1]) || CONFIG.maxSessions
};

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Agent Harness Runner

Usage: node run-harness.js [options]

Options:
  --continuous, -c    Run continuously until all features are complete
  --max=N             Maximum number of sessions to run (default: 100)
  --help, -h          Show this help message

Examples:
  node run-harness.js                  # Run single session
  node run-harness.js -c               # Run continuously
  node run-harness.js -c --max=50      # Run up to 50 sessions
`);
  process.exit(0);
}

// Check for Claude CLI
try {
  execSync('which claude', { stdio: 'ignore' });
} catch (e) {
  log('Claude CLI not found. Please install Claude Code first.', 'error');
  log('Visit: https://docs.anthropic.com/en/docs/agents-and-tools/claude-code', 'info');
  process.exit(1);
}

runHarness(options).catch(e => {
  log(`Fatal error: ${e.message}`, 'error');
  process.exit(1);
});
