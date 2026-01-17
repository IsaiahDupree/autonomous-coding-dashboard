#!/usr/bin/env node

/**
 * DemandRadar Agent Harness
 * =========================
 * 
 * Runs autonomous coding sessions on the DemandRadar project.
 * Based on run-harness-v2.js but configured for DemandRadar.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================
// DemandRadar Configuration
// ============================================

const DEMANDRADAR_ROOT = '/Users/isaiahdupree/Documents/Software/WhatsCurrentlyInTheMarket/gap-radar';
const DOCS_ROOT = '/Users/isaiahdupree/Documents/Software/WhatsCurrentlyInTheMarket';
const DASHBOARD_ROOT = path.resolve(__dirname, '..');

const CONFIG = {
  // DemandRadar specific paths
  projectPath: DEMANDRADAR_ROOT,
  promptFile: path.join(__dirname, 'prompts/demandradar.md'),
  taskFile: path.join(DOCS_ROOT, 'AGENT_TASKS.md'),
  auditFile: path.join(DOCS_ROOT, 'COMPLETE_FEATURE_AUDIT.md'),
  
  // Session tracking (stored in dashboard root)
  progressFile: path.join(DASHBOARD_ROOT, 'demandradar-progress.txt'),
  statusFile: path.join(DASHBOARD_ROOT, 'demandradar-status.json'),
  metricsFile: path.join(DASHBOARD_ROOT, 'demandradar-metrics.json'),
  outputLog: path.join(DASHBOARD_ROOT, 'demandradar-output.log'),
  
  // Session settings
  maxSessions: parseInt(process.argv[2]) || 100,
  
  // Rate limiting & backoff
  initialBackoffMs: 5000,
  maxBackoffMs: 300000,
  backoffMultiplier: 2,
  jitterFactor: 0.2,
  minSessionGapMs: 10000,
  
  // Error handling
  maxConsecutiveErrors: 5,
  authErrorPauseMinutes: 60,
  rateLimitPauseMinutes: 5,
};

// ============================================
// Error Classification
// ============================================

const ErrorTypes = {
  AUTH_ERROR: 'auth_error',
  RATE_LIMIT: 'rate_limit',
  SERVER_ERROR: 'server_error',
  TRANSIENT: 'transient',
  CONFIG_ERROR: 'config_error',
  UNKNOWN: 'unknown',
};

function classifyError(output, exitCode) {
  const lowerOutput = output.toLowerCase();
  
  if (lowerOutput.includes('invalid api key') || lowerOutput.includes('unauthorized')) {
    return ErrorTypes.AUTH_ERROR;
  }
  if (lowerOutput.includes('rate limit') || lowerOutput.includes('429')) {
    return ErrorTypes.RATE_LIMIT;
  }
  if (lowerOutput.includes('500') || lowerOutput.includes('internal server error')) {
    return ErrorTypes.SERVER_ERROR;
  }
  if (lowerOutput.includes('econnrefused') || lowerOutput.includes('timeout')) {
    return ErrorTypes.TRANSIENT;
  }
  
  return ErrorTypes.UNKNOWN;
}

// ============================================
// Logging
// ============================================

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    start: '🚀',
    end: '🏁',
  }[level] || '•';
  
  const logLine = `${timestamp} ${prefix} ${message}`;
  console.log(logLine);
  
  // Also append to log file
  fs.appendFileSync(CONFIG.outputLog, logLine + '\n');
}

function updateStatus(status, extra = {}) {
  const statusData = {
    project: 'demandradar',
    projectPath: CONFIG.projectPath,
    lastUpdated: new Date().toISOString(),
    status,
    pid: process.pid,
    ...extra,
  };
  
  fs.writeFileSync(CONFIG.statusFile, JSON.stringify(statusData, null, 2));
}

// ============================================
// Session Runner
// ============================================

async function runSession(sessionNum) {
  return new Promise((resolve) => {
    log(`Starting session ${sessionNum}`, 'start');
    updateStatus('running', { currentSession: sessionNum });
    
    // Build the prompt content
    const promptContent = fs.readFileSync(CONFIG.promptFile, 'utf-8');
    
    // Run claude with the DemandRadar project directory
    const claude = spawn('claude', [
      '--dangerously-skip-permissions',
      '-p', promptContent,
    ], {
      cwd: CONFIG.projectPath,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    
    let output = '';
    
    claude.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });
    
    claude.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(text);
    });
    
    claude.on('close', (code) => {
      if (code === 0) {
        log(`Session ${sessionNum} completed successfully`, 'success');
        resolve({ success: true, output });
      } else {
        const errorType = classifyError(output, code);
        log(`Session ${sessionNum} failed with code ${code} (${errorType})`, 'error');
        resolve({ success: false, output, errorType, exitCode: code });
      }
    });
    
    claude.on('error', (err) => {
      log(`Session ${sessionNum} error: ${err.message}`, 'error');
      resolve({ success: false, output: err.message, errorType: ErrorTypes.UNKNOWN });
    });
  });
}

function calculateBackoff(attempts, errorType) {
  if (errorType === ErrorTypes.AUTH_ERROR) {
    return CONFIG.authErrorPauseMinutes * 60 * 1000;
  }
  if (errorType === ErrorTypes.RATE_LIMIT) {
    return CONFIG.rateLimitPauseMinutes * 60 * 1000;
  }
  
  const baseBackoff = CONFIG.initialBackoffMs * Math.pow(CONFIG.backoffMultiplier, attempts - 1);
  const backoff = Math.min(baseBackoff, CONFIG.maxBackoffMs);
  const jitter = backoff * CONFIG.jitterFactor * Math.random();
  
  return Math.floor(backoff + jitter);
}

// ============================================
// Main Loop
// ============================================

async function main() {
  log('=' .repeat(60));
  log('DemandRadar Autonomous Coding Session', 'start');
  log('=' .repeat(60));
  log(`Project: ${CONFIG.projectPath}`);
  log(`Max Sessions: ${CONFIG.maxSessions}`);
  log(`Task File: ${CONFIG.taskFile}`);
  log('');
  
  // Verify prerequisites
  if (!fs.existsSync(CONFIG.projectPath)) {
    log(`Project not found: ${CONFIG.projectPath}`, 'error');
    process.exit(1);
  }
  
  if (!fs.existsSync(CONFIG.promptFile)) {
    log(`Prompt file not found: ${CONFIG.promptFile}`, 'error');
    process.exit(1);
  }
  
  updateStatus('starting');
  
  let sessionNum = 0;
  let consecutiveErrors = 0;
  
  while (sessionNum < CONFIG.maxSessions) {
    sessionNum++;
    
    const result = await runSession(sessionNum);
    
    if (result.success) {
      consecutiveErrors = 0;
      
      // Wait minimum gap between sessions
      log(`Waiting ${CONFIG.minSessionGapMs / 1000}s before next session...`);
      await new Promise(r => setTimeout(r, CONFIG.minSessionGapMs));
    } else {
      consecutiveErrors++;
      
      if (result.errorType === ErrorTypes.AUTH_ERROR) {
        log('Authentication error - stopping harness', 'error');
        updateStatus('auth_error');
        break;
      }
      
      if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) {
        log(`Too many consecutive errors (${consecutiveErrors}) - stopping`, 'error');
        updateStatus('max_errors');
        break;
      }
      
      const backoff = calculateBackoff(consecutiveErrors, result.errorType);
      log(`Backing off for ${Math.round(backoff / 1000)}s...`, 'warning');
      await new Promise(r => setTimeout(r, backoff));
    }
  }
  
  log('Harness complete', 'end');
  updateStatus('complete', { totalSessions: sessionNum });
}

// Handle interrupts
process.on('SIGINT', () => {
  log('Received SIGINT - stopping gracefully', 'warning');
  updateStatus('stopped');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM - stopping gracefully', 'warning');
  updateStatus('stopped');
  process.exit(0);
});

// Run
main().catch(err => {
  log(`Fatal error: ${err.message}`, 'error');
  updateStatus('error', { error: err.message });
  process.exit(1);
});
