#!/usr/bin/env node

/**
 * Agent Harness Runner v2
 * =======================
 * 
 * Enhanced harness with:
 * - Intelligent error classification (auth vs rate limit vs transient)
 * - Exponential backoff with jitter
 * - Rate limit awareness
 * - Proper handling of authentication errors (stops retrying)
 * - Session metrics and reporting
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as metricsDb from './metrics-db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let PROJECT_ROOT = path.resolve(__dirname, '..');
let PROJECT_ID = 'default';
let PROMPT_OVERRIDE = null;
let INITIALIZER_PROMPT_OVERRIDE = null;
let FORCE_CODING = false;
let DURATION_MS = null;
let RATE_LIMIT_WAIT_MINUTES = 20;
let SESSION_DELAY_MINUTES = 5; // Default 5 min delay between successful sessions
let DEFAULT_CONTINUOUS = true; // Default to continuous mode
let UNTIL_COMPLETE = false; // Run until all features pass
let ADAPTIVE_DELAY = true; // Dynamically adjust delay based on rate limits

// Model fallback configuration
// Verified working model IDs (tested 2026-02-06)
const AVAILABLE_MODELS = [
  'claude-opus-4-6',              // Primary - Claude Opus 4.6 (most capable)
  'claude-sonnet-4-5-20250929',   // Fallback 1 - Claude Sonnet 4.5 (fast, high quality)
  'claude-haiku-4-5-20251001',    // Fallback 2 - Claude Haiku 4.5 (faster, lower cost)
];
let currentModelIndex = 0;
let modelRateLimitStatus = {}; // Track rate limit status per model

function createConfig(projectRoot) {
  return {
    progressFile: path.join(projectRoot, 'claude-progress.txt'),
    featureList: path.join(projectRoot, 'feature_list.json'),
    initScript: path.join(projectRoot, 'init.sh'),
    initializerPrompt: path.join(__dirname, 'prompts/initializer.md'),
    codingPrompt: path.join(__dirname, 'prompts/coding.md'),
    statusFile: path.join(projectRoot, 'harness-status.json'),
    metricsFile: path.join(projectRoot, 'harness-metrics.json'),
    outputLog: path.join(projectRoot, 'harness-output.log'),

    // Session settings
    maxSessions: 100,

    // Rate limiting & backoff
    initialBackoffMs: 5000,        // Start with 5 second delay
    maxBackoffMs: 300000,          // Max 5 minute delay
    backoffMultiplier: 2,          // Double each failure
    jitterFactor: 0.2,             // 20% random jitter
    minSessionGapMs: 10000,        // Minimum 10s between sessions
    sessionDelayMs: 0,             // Configurable delay between sessions

    // Error handling
    maxConsecutiveErrors: 5,       // Stop after 5 consecutive errors
    authErrorPauseMinutes: 60,     // Pause 1 hour on auth errors
    rateLimitPauseMinutes: 2,      // Pause 2 minutes on rate limits
    adaptiveDelayMultiplier: 1.5,  // Multiply delay on rate limit warnings
    maxAdaptiveDelayMinutes: 5,    // Cap adaptive delay at 5 min
    minAdaptiveDelayMinutes: 2,    // Minimum cap for jitter range
    progressiveDelayStart: 1,      // Start progressive delay at 1 min
    progressiveDelayAfterSessions: 3, // Begin progressive delay after N sessions
  };
}

let CONFIG = createConfig(PROJECT_ROOT);

// ============================================
// Configuration
// ============================================

// NOTE: CONFIG is created dynamically via createConfig(projectRoot)

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
  // Only check the tail of output for auth/error signals to avoid false
  // positives from content the agent wrote or discussed during the session.
  const tailLength = 3000;
  const lowerTail = output.slice(-tailLength).toLowerCase();
  
  // Rate limiting - check FIRST (takes priority over auth since rate limit
  // responses can sometimes include 'unauthorized' or similar words)
  if (
    lowerTail.includes('rate limit') ||
    lowerTail.includes('429') ||
    lowerTail.includes('too many requests') ||
    lowerTail.includes('overloaded') ||
    lowerTail.includes('hit your limit') ||
    lowerTail.includes('resets')
  ) {
    return ErrorTypes.RATE_LIMIT;
  }
  
  // Authentication errors - only match against tail of output with strict patterns
  // to avoid false positives from code/discussion in session body
  const authPatterns = [
    'invalid api key',
    'invalid_api_key',
    'authentication_failed',
    '"error":"authentication_failed"',
    'invalid x-api-key',
    'api key is invalid',
    'could not authenticate',
    'invalid authorization',
  ];
  const hasAuthError = authPatterns.some(p => lowerTail.includes(p));
  // Only classify as auth if "unauthorized" appears in a structured error context
  // (not just anywhere in discussion)
  const hasUnauthorized = lowerTail.includes('401') && lowerTail.includes('unauthorized');
  if (hasAuthError || hasUnauthorized) {
    return ErrorTypes.AUTH_ERROR;
  }
  
  // Server errors - retry with backoff (check tail only)
  if (
    lowerTail.includes('500 internal') ||
    lowerTail.includes('502 bad gateway') ||
    lowerTail.includes('503 service') ||
    lowerTail.includes('504 gateway') ||
    lowerTail.includes('internal server error')
  ) {
    return ErrorTypes.SERVER_ERROR;
  }
  
  // Config errors - don't retry
  if (
    lowerTail.includes('file not found') ||
    lowerTail.includes('enoent') ||
    lowerTail.includes('prompt file not found')
  ) {
    return ErrorTypes.CONFIG_ERROR;
  }
  
  // Network/transient - retry quickly
  if (
    lowerTail.includes('econnrefused') ||
    lowerTail.includes('econnreset') ||
    lowerTail.includes('timeout') ||
    lowerTail.includes('network error')
  ) {
    return ErrorTypes.TRANSIENT;
  }
  
  return ErrorTypes.UNKNOWN;
}

// ============================================
// Backoff Calculation
// ============================================

function calculateBackoff(attempts, errorType) {
  // Auth and config errors should not retry
  if (errorType === ErrorTypes.AUTH_ERROR) {
    return CONFIG.authErrorPauseMinutes * 60 * 1000;
  }
  
  if (errorType === ErrorTypes.CONFIG_ERROR) {
    return Infinity; // Don't retry
  }
  
  // Rate limits get longer pause
  if (errorType === ErrorTypes.RATE_LIMIT) {
    const base = CONFIG.rateLimitPauseMinutes * 60 * 1000;
    return base * Math.pow(1.5, attempts - 1);
  }
  
  // Exponential backoff for other errors
  const baseBackoff = CONFIG.initialBackoffMs * 
    Math.pow(CONFIG.backoffMultiplier, attempts - 1);
  
  const backoff = Math.min(baseBackoff, CONFIG.maxBackoffMs);
  
  // Add jitter to prevent thundering herd
  const jitter = backoff * CONFIG.jitterFactor * Math.random();
  
  return Math.floor(backoff + jitter);
}

function parseResetTimeFromOutput(output) {
  // Matches formats like:
  // - "resets 3pm"
  // - "resets at 3pm"
  // - "resets 3:30pm"
  const match = output.match(/resets?\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*([ap]m)/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3].toLowerCase();

  if (ampm === 'pm' && hour !== 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;

  return { hour, minute };
}

function calculateRateLimitWaitMs(output) {
  const reset = parseResetTimeFromOutput(output);
  if (!reset) return null;

  const now = new Date();
  const target = new Date(now);
  target.setHours(reset.hour, reset.minute, 0, 0);

  // If the reset time already passed today, schedule for tomorrow.
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  target.setMinutes(target.getMinutes() + RATE_LIMIT_WAIT_MINUTES);

  const waitMs = target.getTime() - now.getTime();
  return waitMs > 0 ? waitMs : null;
}

// ============================================
// Model Fallback Logic
// ============================================

function getCurrentModel() {
  return AVAILABLE_MODELS[currentModelIndex];
}

function markModelRateLimited(model) {
  modelRateLimitStatus[model] = {
    rateLimited: true,
    rateLimitedAt: Date.now(),
    resetTime: null,
  };
  log(`Model ${model} marked as rate-limited`, 'rate');
}

function isModelAvailable(model) {
  const status = modelRateLimitStatus[model];
  if (!status || !status.rateLimited) return true;
  
  // Check if 30 minutes have passed (assume rate limit expired)
  const timeSinceLimit = Date.now() - status.rateLimitedAt;
  if (timeSinceLimit > 30 * 60 * 1000) {
    status.rateLimited = false;
    log(`Model ${model} rate limit assumed expired`, 'info');
    return true;
  }
  return false;
}

function getNextAvailableModel() {
  // Try to find an available model starting from current index
  for (let i = 0; i < AVAILABLE_MODELS.length; i++) {
    const index = (currentModelIndex + i) % AVAILABLE_MODELS.length;
    const model = AVAILABLE_MODELS[index];
    if (isModelAvailable(model)) {
      return { model, index };
    }
  }
  return null; // All models rate limited
}

function switchToNextModel() {
  const current = getCurrentModel();
  markModelRateLimited(current);
  
  const next = getNextAvailableModel();
  if (next && next.model !== current) {
    currentModelIndex = next.index;
    log(`Switching from ${current} to ${next.model}`, 'info');
    return next.model;
  }
  
  log('All models rate-limited, will wait for reset', 'warning');
  return null;
}

function resetModelStatus() {
  // Called when a session succeeds - reset the current model's status
  const model = getCurrentModel();
  if (modelRateLimitStatus[model]) {
    modelRateLimitStatus[model].rateLimited = false;
  }
}

// ============================================
// Logging & Status
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
    pause: '⏸️',
    rate: '🚦',
    auth: '🔐',
  }[level] || '•';

  const line = `${timestamp} ${prefix} ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(CONFIG.outputLog, line + '\n');
  } catch (e) {
    // ignore logging errors
  }
}

function isFirstRun() {
  const hasProgress = fs.existsSync(CONFIG.progressFile);
  const hasFeatures = fs.existsSync(CONFIG.featureList);
  
  if (!hasProgress || !hasFeatures) {
    log('First run detected - no progress or feature files found');
    return true;
  }
  
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

function validateFeatureList() {
  if (!fs.existsSync(CONFIG.featureList)) {
    return { valid: false, error: 'Feature list file not found' };
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG.featureList, 'utf-8'));
    if (!data.features || !Array.isArray(data.features)) {
      return { valid: false, error: 'Feature list missing "features" array' };
    }
    if (data.features.length === 0) {
      return { valid: false, error: 'Feature list is empty' };
    }
    // Check for required fields in first feature (name or description accepted)
    const sample = data.features[0];
    if (!sample.id || (!sample.name && !sample.description)) {
      return { valid: false, error: 'Features missing required fields (id, name or description)' };
    }
    return { valid: true, features: data.features.length };
  } catch (e) {
    return { valid: false, error: `Failed to parse feature list: ${e.message}` };
  }
}

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
    return { total: 0, passing: 0, pending: 0, percentComplete: 0 };
  }
}

function updateStatus(sessionType, status, stats = null, extra = {}) {
  const statusData = {
    projectId: PROJECT_ID,
    projectRoot: PROJECT_ROOT,
    lastUpdated: new Date().toISOString(),
    sessionType,
    status,
    stats: stats || getProgressStats(),
    pid: process.pid,
    ...extra,
  };
  
  fs.writeFileSync(CONFIG.statusFile, JSON.stringify(statusData, null, 2));
}

function loadMetrics() {
  const defaultMetrics = {
    totalSessions: 0,
    successfulSessions: 0,
    failedSessions: 0,
    totalTokens: 0,
    totalCostUsd: 0,
    rateLimitHits: 0,
    authErrors: 0,
    consecutiveErrors: 0,
    lastSessionTime: null,
    featuresCompletedThisRun: 0,
    startingFeatures: 0,
    avgSessionDuration: 0,
  };
  
  if (!fs.existsSync(CONFIG.metricsFile)) {
    return defaultMetrics;
  }
  
  try {
    return { ...defaultMetrics, ...JSON.parse(fs.readFileSync(CONFIG.metricsFile, 'utf-8')) };
  } catch (e) {
    return defaultMetrics;
  }
}

function saveMetrics(metrics) {
  fs.writeFileSync(CONFIG.metricsFile, JSON.stringify(metrics, null, 2));
}

// ============================================
// Session Execution
// ============================================

function getPrompt() {
  const shouldUseInitializer = !FORCE_CODING && isFirstRun();
  const promptFile = shouldUseInitializer
    ? (INITIALIZER_PROMPT_OVERRIDE || CONFIG.initializerPrompt)
    : (PROMPT_OVERRIDE || CONFIG.codingPrompt);
  
  if (!fs.existsSync(promptFile)) {
    throw new Error(`Prompt file not found: ${promptFile}`);
  }
  
  return fs.readFileSync(promptFile, 'utf-8');
}

function parseSessionOutput(output) {
  // Extract token usage from JSON output
  const metrics = {
    inputTokens: 0,
    outputTokens: 0,
    cost: 0,
  };
  
  try {
    // Look for result JSON lines
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('"type":"result"')) {
        const data = JSON.parse(line);
        if (data.usage) {
          metrics.inputTokens = (data.usage.input_tokens || 0) + 
            (data.usage.cache_creation_input_tokens || 0);
          metrics.outputTokens = data.usage.output_tokens || 0;
        }
        if (data.total_cost_usd) {
          metrics.cost = data.total_cost_usd;
        }
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return metrics;
}

async function runSession(sessionNumber, modelOverride = null) {
  const sessionType = (!FORCE_CODING && isFirstRun()) ? 'INITIALIZER' : 'CODING';
  const stats = getProgressStats();
  const model = modelOverride || getCurrentModel();
  
  log(`Starting session #${sessionNumber} (${sessionType}) with model: ${model}`, 'start');
  log(`Progress: ${stats.passing}/${stats.total} features (${stats.percentComplete}%)`);
  
  updateStatus(sessionType, 'running', stats, { currentSession: sessionNumber, model });
  
  // Start DB session tracking
  let dbSession = null;
  try {
    await metricsDb.ensureTarget(PROJECT_ID, path.basename(PROJECT_ROOT), PROJECT_ROOT);
    dbSession = await metricsDb.startSession(PROJECT_ID, sessionNumber, sessionType.toLowerCase(), model);
    log(`DB session started: ${dbSession?.id}`, 'info');
  } catch (e) {
    log(`DB session tracking failed (non-fatal): ${e.message}`, 'warn');
  }

  return new Promise((resolve, reject) => {
    
    let prompt;
    try {
      prompt = getPrompt();
    } catch (e) {
      reject(e);
      return;
    }
    
    const args = [
      '-p', prompt,
      '--model', model,
      '--allowedTools', 'Edit', 'Bash', 'Read', 'Write', 'mcp__puppeteer',
      '--output-format', 'stream-json',
      '--verbose'
    ];
    
    const startTime = Date.now();
    let output = '';
    
    // Build env: always use Claude OAuth auth, never API key
    const claudeEnv = { ...process.env };
    delete claudeEnv.ANTHROPIC_API_KEY; // strip API key — force OAuth/Claude auth
    if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
      claudeEnv.CLAUDE_CODE_OAUTH_TOKEN = process.env.CLAUDE_CODE_OAUTH_TOKEN;
    }

    const claude = spawn('claude', args, {
      cwd: PROJECT_ROOT,
      env: claudeEnv,
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    claude.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
      try {
        fs.appendFileSync(CONFIG.outputLog, text);
      } catch (e) {
        // ignore logging errors
      }
    });
    
    claude.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(data);
      try {
        fs.appendFileSync(CONFIG.outputLog, text);
      } catch (e) {
        // ignore logging errors
      }
    });
    
    claude.on('error', (error) => {
      log(`Failed to start Claude: ${error.message}`, 'error');
      updateStatus(sessionType, 'error', stats);
      reject(error);
    });
    
    claude.on('close', async (code) => {
      const durationMs = Date.now() - startTime;
      const duration = (durationMs / 1000 / 60).toFixed(1);
      const newStats = getProgressStats();
      const sessionMetrics = parseSessionOutput(output);
      
      // End DB session tracking
      if (dbSession?.id) {
        try {
          const featuresCompleted = Math.max(0, newStats.passing - stats.passing);
          
          // Parse detailed metrics from output
          const turnCount = (output.match(/"num_turns":\s*(\d+)/)?.[1]) || 0;
          const apiLatency = sessionMetrics.apiLatencyMs || durationMs;
          
          await metricsDb.endSession(dbSession.id, {
            status: code === 0 ? 'completed' : 'failed',
            inputTokens: sessionMetrics.inputTokens || 0,
            outputTokens: sessionMetrics.outputTokens || 0,
            cacheReadTokens: sessionMetrics.cacheReadTokens || 0,
            cacheWriteTokens: sessionMetrics.cacheWriteTokens || 0,
            costUsd: sessionMetrics.cost || 0,
            featuresBefore: stats.passing,
            featuresAfter: newStats.passing,
            featuresCompleted,
            errorType: code !== 0 ? classifyError(output, code) : null,
            errorMessage: code !== 0 ? output.slice(-500) : null,
            wallClockMs: durationMs,
            apiLatencyMs: apiLatency,
            turnCount: parseInt(turnCount) || 0,
            retryCount: sessionMetrics.retryCount || 0,
            modelFallbacks: sessionMetrics.modelFallbacks || 0,
          });
          
          const cacheHitRate = sessionMetrics.cacheReadTokens > 0 
            ? ((sessionMetrics.cacheReadTokens / (sessionMetrics.inputTokens + sessionMetrics.cacheReadTokens)) * 100).toFixed(1)
            : 0;
          log(`DB session ended: ${featuresCompleted} features, ${turnCount} turns, ${cacheHitRate}% cache hit`, 'info');
          
          // Sync target progress to DB
          await metricsDb.syncTargetProgress(PROJECT_ID, newStats.passing, newStats.total);
          log(`DB target synced: ${newStats.passing}/${newStats.total} (${newStats.percentComplete}%)`, 'info');
          
          // Update daily stats
          await metricsDb.updateDailyStats(PROJECT_ID, newStats.total);
        } catch (e) {
          log(`DB session end failed (non-fatal): ${e.message}`, 'warn');
        }
      }
      
      if (code === 0) {
        log(`Session #${sessionNumber} completed in ${duration} minutes`, 'success');
        log(`Progress: ${newStats.passing}/${newStats.total} features (${newStats.percentComplete}%)`);
        updateStatus(sessionType, 'completed', newStats);
        resetModelStatus(); // Model worked, clear any rate limit status
        resolve({ 
          code, 
          output, 
          stats: newStats, 
          duration,
          metrics: sessionMetrics,
          success: true,
          model,
        });
      } else {
        const errorType = classifyError(output, code);
        log(`Session #${sessionNumber} exited with code ${code} (${errorType})`, 'error');
        updateStatus(sessionType, 'failed', newStats, { errorType, model });
        resolve({ 
          code, 
          output, 
          stats: newStats, 
          duration,
          metrics: sessionMetrics,
          success: false,
          errorType,
          model,
        });
      }
    });
  });
}

function isProjectComplete() {
  const stats = getProgressStats();
  return stats.total > 0 && stats.passing === stats.total;
}

// ============================================
// Main Harness Loop
// ============================================

async function runHarness(options = {}) {
  const { maxSessions = CONFIG.maxSessions, continuous = false } = options;
  
  log('Agent Harness v2 Starting', 'start');
  log(`Project root: ${PROJECT_ROOT}`);
  log(`Max sessions: ${maxSessions}`);
  log(`Mode: ${UNTIL_COMPLETE ? 'Until complete' : (continuous ? 'Continuous' : 'Single session')}`);
  if (continuous && SESSION_DELAY_MINUTES > 0) {
    log(`Session delay: ${SESSION_DELAY_MINUTES} minutes between sessions`, 'info');
  }
  if (ADAPTIVE_DELAY) {
    log(`Adaptive delay: enabled (sawtooth ${CONFIG.progressiveDelayStart}-${CONFIG.maxAdaptiveDelayMinutes} min)`, 'info');
  }
  
  // Validate feature list before starting
  const validation = validateFeatureList();
  if (!validation.valid) {
    log(`Feature list validation failed: ${validation.error}`, 'error');
    log(`Expected at: ${CONFIG.featureList}`, 'info');
    process.exit(1);
  }
  log(`Feature list validated: ${validation.features} features`, 'success');
  
  log(`Backoff: ${CONFIG.initialBackoffMs}ms - ${CONFIG.maxBackoffMs}ms`);
  if (DURATION_MS) {
    log(`Duration limit: ${(DURATION_MS / 1000 / 60).toFixed(1)} minutes`, 'info');
  }
  log(`Rate limit reset wait: ${RATE_LIMIT_WAIT_MINUTES} minutes after reset`, 'info');

  const endTimeMs = DURATION_MS ? (Date.now() + DURATION_MS) : null;
  
  let metrics = loadMetrics();
  let sessionNumber = 1;
  let consecutiveErrors = 0;
  let currentSessionDelay = SESSION_DELAY_MINUTES; // Adaptive delay tracking
  
  while (sessionNumber <= maxSessions) {
    // Skip time check if running until complete
    if (!UNTIL_COMPLETE && endTimeMs && Date.now() >= endTimeMs) {
      const stats = getProgressStats();
      updateStatus('SYSTEM', 'duration_reached', stats, { message: 'Duration limit reached' });
      log('Duration limit reached - stopping harness', 'end');
      break;
    }

    // Check if already complete
    if (isProjectComplete()) {
      log('All features implemented! Project complete.', 'success');
      break;
    }
    
    try {
      const result = await runSession(sessionNumber);
      
      // Update metrics
      metrics.totalSessions++;
      metrics.lastSessionTime = new Date().toISOString();
      
      if (result.success) {
        metrics.successfulSessions++;
        consecutiveErrors = 0;
        metrics.consecutiveErrors = 0;
        
        if (result.metrics) {
          metrics.totalTokens += (result.metrics.inputTokens + result.metrics.outputTokens);
        }
      } else {
        metrics.failedSessions++;
        consecutiveErrors++;
        metrics.consecutiveErrors = consecutiveErrors;
        
        // Handle different error types
        switch (result.errorType) {
          case ErrorTypes.AUTH_ERROR:
            metrics.authErrors++;
            
            // Auth errors get ONE retry with a pause — transient auth failures
            // (e.g. API gateway hiccup, temporary token issue) are common enough
            // that hard-stopping on the first occurrence is too aggressive.
            if (consecutiveErrors <= 2) {
              const authRetryMinutes = 3;
              log(`Possible auth error (attempt ${consecutiveErrors}/${2}) — retrying in ${authRetryMinutes} min`, 'auth');
              log(`Tail of output: ${result.output.slice(-300).replace(/\n/g, ' ').trim()}`, 'info');
              
              // Try switching models first — auth errors can be model-specific
              const authFallback = switchToNextModel();
              if (authFallback) {
                log(`Switching to ${authFallback} for auth retry`, 'info');
              }
              
              updateStatus('error', 'auth_retry', result.stats || getProgressStats(), {
                message: `Auth error — retrying (${consecutiveErrors}/2)`,
                errorType: result.errorType,
                resumeAt: new Date(Date.now() + authRetryMinutes * 60 * 1000).toISOString(),
              });
              saveMetrics(metrics);
              await new Promise(r => setTimeout(r, authRetryMinutes * 60 * 1000));
              sessionNumber++;
              continue; // Retry the loop
            }
            
            // After 2 consecutive auth errors, stop
            log('Authentication failed after retries — stopping harness.', 'auth');
            log('Set ANTHROPIC_API_KEY environment variable with a valid key.', 'info');
            log(`Last output tail: ${result.output.slice(-500).replace(/\n/g, ' ').trim()}`, 'info');
            updateStatus('error', 'auth_failed', null, { 
              message: 'Invalid API key after retries — harness stopped',
              errorType: result.errorType,
              authErrorCount: metrics.authErrors,
            });
            saveMetrics(metrics);
            process.exit(1);
            break;
            
          case ErrorTypes.CONFIG_ERROR:
            log('Configuration error - stopping harness.', 'error');
            updateStatus('error', 'config_failed', null, { 
              message: 'Configuration error',
              errorType: result.errorType,
            });
            saveMetrics(metrics);
            process.exit(1);
            break;
            
          case ErrorTypes.RATE_LIMIT:
            metrics.rateLimitHits++;
            log('Rate limit hit - attempting model fallback', 'rate');
            
            // Try to switch to another model
            const nextModel = switchToNextModel();
            if (nextModel) {
              log(`Switched to fallback model: ${nextModel}`, 'info');
              // Retry immediately with new model (don't increment session number)
              consecutiveErrors = 0; // Reset since we're trying a new model
              continue; // Skip delay and retry with new model
            }
            // If no model available, will wait with backoff
            log('No fallback models available - will wait for rate limit reset', 'warning');
            break;
            
          default:
            // Continue with backoff
            break;
        }
        
        // Check consecutive error limit
        if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) {
          log(`Max consecutive errors (${CONFIG.maxConsecutiveErrors}) reached - stopping`, 'error');
          updateStatus('error', 'max_errors', null, { 
            message: `Stopped after ${consecutiveErrors} consecutive errors`,
            lastError: result.errorType,
          });
          saveMetrics(metrics);
          process.exit(1);
        }
      }
      
      saveMetrics(metrics);
      
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
      
      // Calculate delay before next session
      let delay;
      if (result.success) {
        // Check for rate limit warnings in successful output (near limit)
        const hasWarning = result.output && (
          result.output.toLowerCase().includes('approaching') ||
          result.output.toLowerCase().includes('usage') ||
          result.output.toLowerCase().includes('quota')
        );
        
        // Progressive delay: start small after N sessions, build up to cap, then reset (sawtooth pattern)
        if (ADAPTIVE_DELAY && sessionNumber >= CONFIG.progressiveDelayAfterSessions) {
          // Initialize or reset progressive delay
          if (currentSessionDelay < CONFIG.progressiveDelayStart) {
            currentSessionDelay = CONFIG.progressiveDelayStart;
            log(`Progressive delay started at ${currentSessionDelay} minutes`, 'info');
          } else if (currentSessionDelay >= CONFIG.minAdaptiveDelayMinutes) {
            // Hit the cap - apply jittered cap delay, then reset for next cycle
            const jitteredDelay = CONFIG.minAdaptiveDelayMinutes + Math.random() * (CONFIG.maxAdaptiveDelayMinutes - CONFIG.minAdaptiveDelayMinutes);
            delay = jitteredDelay * 60 * 1000;
            // Reset to start for next session (sawtooth pattern)
            currentSessionDelay = 0; // Will be set to progressiveDelayStart next iteration
            log(`Progressive delay at cap (${jitteredDelay.toFixed(1)} min), resetting to ${CONFIG.progressiveDelayStart} min next session`, 'info');
          } else {
            // Increase delay progressively
            currentSessionDelay = Math.min(
              currentSessionDelay * CONFIG.adaptiveDelayMultiplier,
              CONFIG.maxAdaptiveDelayMinutes
            );
            // Apply small jitter to current delay
            const jitter = (Math.random() - 0.5) * 2 * CONFIG.jitterFactor * currentSessionDelay;
            const jitteredDelay = Math.max(currentSessionDelay + jitter, CONFIG.progressiveDelayStart);
            delay = jitteredDelay * 60 * 1000;
            log(`Progressive delay: ${jitteredDelay.toFixed(1)} minutes`, 'info');
          }
        } else {
          // First few sessions: minimal delay
          delay = CONFIG.minSessionGapMs;
        }
      } else {
        // On errors, increase adaptive delay
        if (ADAPTIVE_DELAY) {
          currentSessionDelay = Math.min(
            currentSessionDelay * CONFIG.adaptiveDelayMultiplier,
            CONFIG.maxAdaptiveDelayMinutes
          );
          log(`Adaptive delay increased to ${Math.min(currentSessionDelay, CONFIG.maxAdaptiveDelayMinutes).toFixed(1)} minutes due to error (capped 15-20 with jitter)`, 'warning');
        }
        
        delay = calculateBackoff(consecutiveErrors, result.errorType);

        if (result.errorType === ErrorTypes.RATE_LIMIT) {
          const rateWaitMs = calculateRateLimitWaitMs(result.output);
          if (rateWaitMs) {
            delay = rateWaitMs;
            // Also boost adaptive delay for next successful session
            currentSessionDelay = Math.min(
              currentSessionDelay * 2,
              CONFIG.maxAdaptiveDelayMinutes
            );
            updateStatus('SYSTEM', 'rate_limited', result.stats || getProgressStats(), {
              resumeAt: new Date(Date.now() + delay).toISOString(),
              waitMinutes: Math.round(delay / 1000 / 60),
            });
          }
        }
        
        if (delay === Infinity) {
          log('Unrecoverable error - stopping harness', 'error');
          break;
        }
      }
      
      const delaySeconds = (delay / 1000).toFixed(1);
      log(`Waiting ${delaySeconds}s before next session...`, 'pause');
      await new Promise(r => setTimeout(r, delay));
      
      sessionNumber++;
      
    } catch (error) {
      log(`Session failed: ${error.message}`, 'error');
      consecutiveErrors++;
      
      if (!continuous) {
        process.exit(1);
      }
      
      if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) {
        log(`Max consecutive errors reached - stopping`, 'error');
        break;
      }
      
      const delay = calculateBackoff(consecutiveErrors, ErrorTypes.UNKNOWN);
      log(`Waiting ${(delay / 1000).toFixed(1)}s before retry...`, 'pause');
      await new Promise(r => setTimeout(r, delay));
      sessionNumber++;
    }
  }
  
  const finalStats = getProgressStats();
  log(`Harness finished. Final progress: ${finalStats.passing}/${finalStats.total} (${finalStats.percentComplete}%)`, 'end');
  log(`Sessions: ${metrics.successfulSessions}/${metrics.totalSessions} successful`, 'info');
  
  saveMetrics(metrics);
}

// ============================================
// CLI
// ============================================

const args = process.argv.slice(2);

function getArgValue(argv, name) {
  const eqPrefix = `${name}=`;
  const eq = argv.find(a => a.startsWith(eqPrefix));
  if (eq) return eq.slice(eqPrefix.length);

  const idx = argv.indexOf(name);
  if (idx !== -1 && idx + 1 < argv.length) {
    const candidate = argv[idx + 1];
    if (!candidate.startsWith('-')) return candidate;
  }

  return null;
}

const cliProjectRoot = getArgValue(args, '--path') || getArgValue(args, '--project-root') || process.env.PROJECT_ROOT;
if (cliProjectRoot) {
  PROJECT_ROOT = path.resolve(cliProjectRoot);
  CONFIG = createConfig(PROJECT_ROOT);
}

PROJECT_ID = getArgValue(args, '--project') || process.env.PROJECT_ID || path.basename(PROJECT_ROOT);
PROMPT_OVERRIDE = getArgValue(args, '--prompt') || process.env.PROMPT_FILE || null;
INITIALIZER_PROMPT_OVERRIDE = getArgValue(args, '--initializer-prompt') || null;
FORCE_CODING = args.includes('--force-coding') || false;

// Feature list override from CLI (for repos with non-standard feature list paths)
const FEATURE_LIST_OVERRIDE = getArgValue(args, '--feature-list') || process.env.FEATURE_LIST || null;
if (FEATURE_LIST_OVERRIDE) {
  CONFIG.featureList = path.resolve(FEATURE_LIST_OVERRIDE);
}

// Model override from CLI (for complexity-based selection from run-queue.js)
const MODEL_OVERRIDE = getArgValue(args, '--model') || process.env.MODEL || null;
const FALLBACK_MODEL = getArgValue(args, '--fallback-model') || 'haiku';
const MAX_RETRIES_OVERRIDE = parseInt(getArgValue(args, '--max-retries') || '3', 10);

if (MODEL_OVERRIDE) {
  // Set as first model in available models and reset index
  currentModelIndex = AVAILABLE_MODELS.indexOf(MODEL_OVERRIDE);
  if (currentModelIndex === -1) {
    // Add custom model to available models
    AVAILABLE_MODELS.unshift(MODEL_OVERRIDE);
    currentModelIndex = 0;
  }
  
  // Ensure fallback model is in the list
  if (!AVAILABLE_MODELS.includes(FALLBACK_MODEL)) {
    AVAILABLE_MODELS.push(FALLBACK_MODEL);
  }
}

// Update max consecutive errors based on complexity
if (MAX_RETRIES_OVERRIDE) {
  CONFIG.maxConsecutiveErrors = MAX_RETRIES_OVERRIDE;
}

const durationHours = getArgValue(args, '--duration-hours') || process.env.DURATION_HOURS;
const durationMinutes = getArgValue(args, '--duration-minutes') || process.env.DURATION_MINUTES;
if (durationHours) {
  const h = parseFloat(durationHours);
  if (!Number.isNaN(h) && h > 0) DURATION_MS = Math.floor(h * 60 * 60 * 1000);
} else if (durationMinutes) {
  const m = parseFloat(durationMinutes);
  if (!Number.isNaN(m) && m > 0) DURATION_MS = Math.floor(m * 60 * 1000);
}

const rateWaitMinutes = getArgValue(args, '--rate-limit-wait-minutes') || process.env.RATE_LIMIT_WAIT_MINUTES;
if (rateWaitMinutes) {
  const m = parseInt(rateWaitMinutes, 10);
  if (!Number.isNaN(m) && m >= 0) RATE_LIMIT_WAIT_MINUTES = m;
}

const sessionDelayMinutes = getArgValue(args, '--session-delay') || getArgValue(args, '--delay') || process.env.SESSION_DELAY_MINUTES;
if (sessionDelayMinutes) {
  const m = parseFloat(sessionDelayMinutes);
  if (!Number.isNaN(m) && m >= 0) SESSION_DELAY_MINUTES = m;
}

// Duration presets (hours)
const durationPreset = getArgValue(args, '--hours');
if (durationPreset) {
  const h = parseFloat(durationPreset);
  if (!Number.isNaN(h) && h > 0) DURATION_MS = Math.floor(h * 60 * 60 * 1000);
}

// Until complete mode
UNTIL_COMPLETE = args.includes('--until-complete') || args.includes('--complete') || process.env.UNTIL_COMPLETE === 'true';

// Adaptive delay toggle
if (args.includes('--no-adaptive')) {
  ADAPTIVE_DELAY = false;
}

const options = {
  continuous: DEFAULT_CONTINUOUS || args.includes('--continuous') || args.includes('-c'),
  maxSessions:
    parseInt(
      getArgValue(args, '--max-sessions') ||
      getArgValue(args, '--maxSessions') ||
      getArgValue(args, '--max')
    ) || CONFIG.maxSessions
};

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Agent Harness Runner v2
=======================

Enhanced harness with intelligent error handling and rate limiting.

Usage: node run-harness-v2.js [options]

Options:
  --continuous, -c    Run continuously until all features are complete
  --max=N             Maximum number of sessions to run (default: 100)
  --max-sessions N     Maximum number of sessions to run (alias for --max)
  --path PATH          Project path to run the harness against (defaults to dashboard root)
  --project ID         Project id/name to include in status artifacts
  --prompt FILE        Override coding prompt file
  --initializer-prompt FILE  Override initializer prompt file
  --force-coding       Skip initializer detection and always use the coding prompt
  --hours N            Duration preset in hours (e.g., --hours=8, --hours=16, --hours=24)
  --until-complete     Run until all features pass (no time limit)
  --complete           Alias for --until-complete
  --no-adaptive        Disable adaptive delay adjustment
  --duration-hours N   Stop after N hours (optional)
  --duration-minutes N Stop after N minutes (optional)
  --rate-limit-wait-minutes N  If output includes 'resets Xpm', wait N minutes after reset (default: 20)
  --session-delay N    Minutes to wait between successful sessions (default: 0)
  --delay N            Alias for --session-delay
  --help, -h          Show this help message

Features:
  • Exponential backoff with jitter for failures
  • Auth error detection (stops immediately, doesn't waste retries)
  • Rate limit handling with extended pauses
  • Session metrics tracking
  • Consecutive error limit protection

Examples:
  node run-harness-v2.js                  # Run single session
  node run-harness-v2.js -c               # Run continuously
  node run-harness-v2.js -c --max=50      # Run up to 50 sessions
  node run-harness-v2.js -c --delay=5     # Run continuously with 5 min delay between sessions
  node run-harness-v2.js --hours=8         # Run for 8 hours (default continuous + 5 min delay)
  node run-harness-v2.js --hours=24        # Run for 24 hours overnight
  node run-harness-v2.js --until-complete  # Run until all features pass
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

// ============================================================
// STRICT AUTH ENFORCEMENT: Claude OAuth only — never API key
// ============================================================
if (process.env.ANTHROPIC_API_KEY) {
  log('', 'error');
  log('╔══════════════════════════════════════════════════════════╗', 'error');
  log('║  FATAL: ANTHROPIC_API_KEY is set in environment          ║', 'error');
  log('║  ACD must NEVER use Claude API key auth.                 ║', 'error');
  log('║  This would incur direct API costs.                      ║', 'error');
  log('║                                                          ║', 'error');
  log('║  Fix: unset ANTHROPIC_API_KEY                            ║', 'error');
  log('║  Auth: CLAUDE_CODE_OAUTH_TOKEN (Claude subscription)     ║', 'error');
  log('╚══════════════════════════════════════════════════════════╝', 'error');
  log('', 'error');
  process.exit(2);
}

if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
  // No token in env — Claude Code may have auth stored locally, allow it but warn
  log('Note: CLAUDE_CODE_OAUTH_TOKEN not in env — using Claude Code stored auth.', 'info');
  log('If auth fails, run: claude auth login', 'info');
} else {
  log('Auth: Claude OAuth token confirmed — API key mode disabled.', 'info');
}

runHarness(options).catch(e => {
  log(`Fatal error: ${e.message}`, 'error');
  process.exit(1);
});
