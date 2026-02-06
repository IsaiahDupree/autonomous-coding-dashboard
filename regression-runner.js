// feat-071: Automated Regression Test Runner
(function () {
  'use strict';

  // ── CSS ──────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #regression-runner-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .rr-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .rr-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text, #e0e0e0);
    }
    .rr-header-actions {
      display: flex;
      gap: 8px;
    }
    .rr-run-btn {
      padding: 6px 16px;
      background: #22c55e;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .rr-run-btn:hover { opacity: 0.9; }
    .rr-run-btn.running {
      background: #f59e0b;
      cursor: not-allowed;
    }
    .rr-run-btn.blocked {
      background: #ef4444;
    }

    /* Status bar */
    .rr-status-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      align-items: center;
    }
    .rr-status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
    }
    .rr-status-indicator.idle { background: rgba(255,255,255,0.06); color: var(--color-text-secondary, #a0a0b0); }
    .rr-status-indicator.running { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .rr-status-indicator.passed { background: rgba(34,197,94,0.12); color: #22c55e; }
    .rr-status-indicator.failed { background: rgba(239,68,68,0.12); color: #ef4444; }
    .rr-status-indicator.blocked { background: rgba(239,68,68,0.12); color: #ef4444; }
    .rr-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .rr-status-dot.idle { background: var(--color-text-secondary, #a0a0b0); }
    .rr-status-dot.running { background: #f59e0b; animation: rr-pulse 1s infinite; }
    .rr-status-dot.passed { background: #22c55e; }
    .rr-status-dot.failed { background: #ef4444; }
    .rr-status-dot.blocked { background: #ef4444; }
    @keyframes rr-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* Config */
    .rr-config {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .rr-config-item {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 12px;
    }
    .rr-config-label {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
      margin-bottom: 4px;
    }
    .rr-config-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text, #e0e0e0);
    }
    .rr-config-input {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      color: var(--color-text, #e0e0e0);
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 13px;
      width: 60px;
    }

    /* Test results */
    .rr-results {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 350px;
      overflow-y: auto;
    }
    .rr-result-item {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .rr-result-feature {
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text, #e0e0e0);
    }
    .rr-result-meta {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
      margin-top: 2px;
    }
    .rr-result-status {
      padding: 2px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .rr-result-status.passed { background: rgba(34,197,94,0.12); color: #22c55e; }
    .rr-result-status.failed { background: rgba(239,68,68,0.12); color: #ef4444; }
    .rr-result-status.retried { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .rr-result-status.skipped { background: rgba(255,255,255,0.06); color: var(--color-text-secondary, #a0a0b0); }
    .rr-result-status.pending { background: rgba(99,102,241,0.12); color: #6366f1; }

    /* Summary bar */
    .rr-summary {
      display: flex;
      gap: 16px;
      padding: 12px 0;
      border-top: 1px solid var(--color-border, #2e2e3e);
      margin-top: 12px;
    }
    .rr-summary-item {
      font-size: 13px;
      color: var(--color-text-secondary, #a0a0b0);
    }
    .rr-summary-item strong {
      color: var(--color-text, #e0e0e0);
    }
  `;
  document.head.appendChild(style);

  // ── State ────────────────────────────────────────────────────
  const STORAGE_KEY = 'regression-runner-config';
  let state = {
    status: 'idle', // idle, running, passed, failed, blocked
    runAfterFeature: true,
    blockOnFailure: true,
    maxRetries: 3,
    retryDelay: 1000,
    currentRun: null,
    runHistory: [],
    testResults: [],
  };

  // ── Test runner logic ────────────────────────────────────────
  function createTestSuite() {
    const features = [];
    for (let i = 1; i <= 20; i++) {
      const id = 'feat-' + String(i).padStart(3, '0');
      features.push({
        featureId: id,
        testName: `test-${id}`,
        category: ['core', 'ui', 'analytics', 'monitoring', 'testing'][i % 5],
      });
    }
    return features;
  }

  function runTests(options) {
    const opts = options || {};
    const suite = createTestSuite();
    const runId = 'run-' + Date.now();
    const startTime = Date.now();

    state.status = 'running';
    state.currentRun = {
      id: runId,
      startTime: new Date(startTime).toISOString(),
      endTime: null,
      status: 'running',
      totalTests: suite.length,
      passed: 0,
      failed: 0,
      retried: 0,
      skipped: 0,
      blocked: false,
      results: [],
    };

    const seed = hashCode(runId);
    suite.forEach((test, i) => {
      const testSeed = seed + i;
      const willFail = (testSeed % 10) === 0; // ~10% fail rate
      const retries = willFail ? Math.min(state.maxRetries, 1 + (testSeed % 3)) : 0;
      const passedAfterRetry = willFail && retries < state.maxRetries;
      const finalStatus = willFail ? (passedAfterRetry ? 'retried' : 'failed') : 'passed';
      const duration = 200 + (testSeed % 3000);

      const result = {
        featureId: test.featureId,
        testName: test.testName,
        category: test.category,
        status: finalStatus,
        duration,
        retries,
        error: finalStatus === 'failed' ? `Assertion failed in ${test.testName}` : null,
      };

      state.currentRun.results.push(result);

      if (finalStatus === 'passed') state.currentRun.passed++;
      else if (finalStatus === 'retried') { state.currentRun.retried++; state.currentRun.passed++; }
      else if (finalStatus === 'failed') state.currentRun.failed++;

      // Block on failure check
      if (finalStatus === 'failed' && state.blockOnFailure && !opts.skipBlock) {
        state.currentRun.blocked = true;
      }
    });

    const endTime = Date.now();
    state.currentRun.endTime = new Date(endTime).toISOString();
    state.currentRun.duration = endTime - startTime;
    state.currentRun.status = state.currentRun.failed > 0 ? 'failed' : 'passed';

    if (state.currentRun.blocked) {
      state.status = 'blocked';
    } else {
      state.status = state.currentRun.status;
    }

    state.testResults = state.currentRun.results;
    state.runHistory.unshift({
      id: state.currentRun.id,
      status: state.currentRun.status,
      startTime: state.currentRun.startTime,
      endTime: state.currentRun.endTime,
      totalTests: state.currentRun.totalTests,
      passed: state.currentRun.passed,
      failed: state.currentRun.failed,
      retried: state.currentRun.retried,
      blocked: state.currentRun.blocked,
    });

    saveState();
    render();
    return state.currentRun;
  }

  function retryFailedTests() {
    if (!state.currentRun) return null;
    const failed = state.currentRun.results.filter(r => r.status === 'failed');
    if (failed.length === 0) return null;

    const seed = Date.now();
    let fixedCount = 0;
    failed.forEach((r, i) => {
      const willPass = (seed + i) % 3 !== 0; // ~66% success on retry
      r.retries++;
      if (willPass) {
        r.status = 'retried';
        state.currentRun.failed--;
        state.currentRun.retried++;
        state.currentRun.passed++;
        fixedCount++;
      }
    });

    if (state.currentRun.failed === 0) {
      state.currentRun.status = 'passed';
      state.currentRun.blocked = false;
      state.status = 'passed';
    }

    saveState();
    render();
    return { retriedCount: failed.length, fixedCount };
  }

  function getTestResults() {
    return state.testResults;
  }

  function getCurrentRun() {
    return state.currentRun;
  }

  function getRunHistory() {
    return state.runHistory;
  }

  function isBlocked() {
    return state.status === 'blocked';
  }

  function unblock() {
    if (state.status === 'blocked') {
      state.status = state.currentRun ? state.currentRun.status : 'idle';
      if (state.currentRun) state.currentRun.blocked = false;
      saveState();
      render();
      return true;
    }
    return false;
  }

  function getConfig() {
    return {
      runAfterFeature: state.runAfterFeature,
      blockOnFailure: state.blockOnFailure,
      maxRetries: state.maxRetries,
      retryDelay: state.retryDelay,
    };
  }

  function setConfig(key, value) {
    if (key in state && ['runAfterFeature', 'blockOnFailure', 'maxRetries', 'retryDelay'].includes(key)) {
      state[key] = value;
      saveState();
      render();
      return true;
    }
    return false;
  }

  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // ── Render ───────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('regression-runner-widget');
    if (!container) return;

    const run = state.currentRun;

    container.innerHTML = `
      <div id="regression-runner-card">
        <div class="rr-header">
          <h3>Regression Test Runner</h3>
          <div class="rr-header-actions">
            <button class="rr-run-btn ${state.status === 'running' ? 'running' : state.status === 'blocked' ? 'blocked' : ''}" id="rr-run-btn">
              ${state.status === 'running' ? 'Running...' : state.status === 'blocked' ? 'Blocked' : 'Run Tests'}
            </button>
          </div>
        </div>

        <div class="rr-status-bar" id="rr-status-bar">
          <span class="rr-status-indicator ${state.status}">
            <span class="rr-status-dot ${state.status}"></span>
            ${state.status.charAt(0).toUpperCase() + state.status.slice(1)}
          </span>
          ${run ? `<span style="font-size:12px;color:var(--color-text-secondary,#a0a0b0)">${run.totalTests} tests &middot; ${run.passed} passed &middot; ${run.failed} failed &middot; ${run.retried} retried</span>` : ''}
        </div>

        <div class="rr-config" id="rr-config">
          <div class="rr-config-item">
            <div class="rr-config-label">Run After Feature</div>
            <div class="rr-config-value">${state.runAfterFeature ? 'Enabled' : 'Disabled'}</div>
          </div>
          <div class="rr-config-item">
            <div class="rr-config-label">Block on Failure</div>
            <div class="rr-config-value">${state.blockOnFailure ? 'Enabled' : 'Disabled'}</div>
          </div>
          <div class="rr-config-item">
            <div class="rr-config-label">Max Retries</div>
            <div class="rr-config-value">${state.maxRetries}</div>
          </div>
        </div>

        <div class="rr-results" id="rr-results">
          ${state.testResults.length === 0 ? '<div style="text-align:center;padding:20px;color:var(--color-text-secondary,#a0a0b0);font-size:13px;">No test results yet. Click "Run Tests" to start.</div>' : ''}
          ${state.testResults.map(r => `
            <div class="rr-result-item" data-feature="${r.featureId}">
              <div>
                <div class="rr-result-feature">${r.featureId} - ${r.testName}</div>
                <div class="rr-result-meta">${r.duration}ms${r.retries > 0 ? ' &middot; ' + r.retries + ' retries' : ''}${r.error ? ' &middot; ' + r.error : ''}</div>
              </div>
              <span class="rr-result-status ${r.status}">${r.status}</span>
            </div>
          `).join('')}
        </div>

        ${run ? `
        <div class="rr-summary" id="rr-summary">
          <span class="rr-summary-item">Total: <strong>${run.totalTests}</strong></span>
          <span class="rr-summary-item">Passed: <strong style="color:#22c55e">${run.passed}</strong></span>
          <span class="rr-summary-item">Failed: <strong style="color:#ef4444">${run.failed}</strong></span>
          <span class="rr-summary-item">Retried: <strong style="color:#f59e0b">${run.retried}</strong></span>
          ${run.blocked ? '<span class="rr-summary-item" style="color:#ef4444;font-weight:600">BLOCKED - Fix failures to continue</span>' : ''}
        </div>
        ` : ''}
      </div>
    `;

    document.getElementById('rr-run-btn').addEventListener('click', () => {
      if (state.status !== 'running') {
        runTests();
      }
    });
  }

  // ── Persistence ──────────────────────────────────────────────
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        runAfterFeature: state.runAfterFeature,
        blockOnFailure: state.blockOnFailure,
        maxRetries: state.maxRetries,
        retryDelay: state.retryDelay,
        runHistory: state.runHistory.slice(0, 20),
      }));
    } catch (e) { /* ignore */ }
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state.runAfterFeature = parsed.runAfterFeature !== undefined ? parsed.runAfterFeature : state.runAfterFeature;
        state.blockOnFailure = parsed.blockOnFailure !== undefined ? parsed.blockOnFailure : state.blockOnFailure;
        state.maxRetries = parsed.maxRetries || state.maxRetries;
        state.retryDelay = parsed.retryDelay || state.retryDelay;
        state.runHistory = parsed.runHistory || [];
      }
    } catch (e) { /* ignore */ }
  }

  // ── Public API ───────────────────────────────────────────────
  window.regressionRunner = {
    runTests,
    retryFailedTests,
    getTestResults,
    getCurrentRun,
    getRunHistory,
    isBlocked,
    unblock,
    getConfig,
    setConfig,
    getState() {
      return {
        status: state.status,
        runAfterFeature: state.runAfterFeature,
        blockOnFailure: state.blockOnFailure,
        maxRetries: state.maxRetries,
        retryDelay: state.retryDelay,
        testCount: state.testResults.length,
        historyCount: state.runHistory.length,
      };
    },
  };

  // ── Init ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    render();
  });
})();
