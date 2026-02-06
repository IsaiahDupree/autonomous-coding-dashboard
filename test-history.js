// feat-072: Test Result History Tracking
(function () {
  'use strict';

  // ── CSS ──────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #test-history-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .th2-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .th2-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text, #e0e0e0);
    }
    .th2-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      background: var(--color-bg, #12121a);
      border-radius: 8px;
      padding: 3px;
    }
    .th2-tab {
      flex: 1;
      padding: 6px 12px;
      border: none;
      background: transparent;
      color: var(--color-text-secondary, #a0a0b0);
      cursor: pointer;
      border-radius: 6px;
      font-size: 13px;
      transition: all 0.2s;
    }
    .th2-tab.active {
      background: var(--color-primary, #6366f1);
      color: #fff;
    }
    .th2-tab:hover:not(.active) {
      background: rgba(255,255,255,0.05);
    }

    /* Run history list */
    .th2-run-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 350px;
      overflow-y: auto;
    }
    .th2-run-item {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 12px 14px;
    }
    .th2-run-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .th2-run-id {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text, #e0e0e0);
    }
    .th2-run-time {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
      margin-top: 2px;
    }
    .th2-run-status {
      padding: 2px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .th2-run-status.passed { background: rgba(34,197,94,0.12); color: #22c55e; }
    .th2-run-status.failed { background: rgba(239,68,68,0.12); color: #ef4444; }
    .th2-run-status.mixed { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .th2-run-bar {
      display: flex;
      height: 4px;
      border-radius: 2px;
      overflow: hidden;
      margin-top: 8px;
      gap: 1px;
    }
    .th2-run-bar-pass { background: #22c55e; }
    .th2-run-bar-fail { background: #ef4444; }
    .th2-run-bar-retry { background: #f59e0b; }
    .th2-run-stats {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
      margin-top: 6px;
    }

    /* Compare view */
    .th2-compare-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .th2-compare-panel {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 14px;
    }
    .th2-compare-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text, #e0e0e0);
      margin-bottom: 10px;
    }
    .th2-compare-stat {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 13px;
      color: var(--color-text-secondary, #a0a0b0);
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .th2-compare-stat strong {
      color: var(--color-text, #e0e0e0);
    }
    .th2-compare-diff {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid var(--color-border, #2e2e3e);
    }
    .th2-diff-item {
      padding: 4px 0;
      font-size: 12px;
    }
    .th2-diff-item.improved { color: #22c55e; }
    .th2-diff-item.regressed { color: #ef4444; }
    .th2-diff-item.unchanged { color: var(--color-text-secondary, #a0a0b0); }

    /* Flaky tests */
    .th2-flaky-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .th2-flaky-item {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 12px 14px;
    }
    .th2-flaky-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text, #e0e0e0);
    }
    .th2-flaky-meta {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
      margin-top: 4px;
    }
    .th2-flaky-bar {
      display: flex;
      height: 16px;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
      gap: 1px;
    }
    .th2-flaky-segment {
      height: 100%;
      min-width: 3px;
    }
    .th2-flaky-segment.pass { background: #22c55e; }
    .th2-flaky-segment.fail { background: #ef4444; }
    .th2-flaky-segment.retry { background: #f59e0b; }
    .th2-flaky-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      margin-left: 8px;
    }
    .th2-flaky-badge.high { background: rgba(239,68,68,0.15); color: #ef4444; }
    .th2-flaky-badge.medium { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .th2-flaky-badge.low { background: rgba(34,197,94,0.15); color: #22c55e; }

    .th2-stats-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }
    .th2-stat-card {
      flex: 1;
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    .th2-stat-val {
      font-size: 20px;
      font-weight: 700;
      color: var(--color-text, #e0e0e0);
    }
    .th2-stat-label {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
      margin-top: 4px;
    }
  `;
  document.head.appendChild(style);

  // ── State ────────────────────────────────────────────────────
  const STORAGE_KEY = 'test-history-config';
  let state = {
    activeTab: 'runs',
    runs: [],
    flakyTests: [],
  };

  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // ── Data generation ──────────────────────────────────────────
  function generateRuns() {
    const now = Date.now();
    const runs = [];
    for (let r = 0; r < 15; r++) {
      const seed = hashCode('run-' + r);
      const timestamp = now - r * 3600000 * 4; // every 4 hours
      const totalTests = 20;
      const failCount = seed % 4;
      const retryCount = Math.min(failCount, seed % 3);
      const passCount = totalTests - failCount;
      const results = [];
      for (let t = 0; t < totalTests; t++) {
        const tSeed = seed + t;
        const isFail = t < failCount;
        const isRetry = isFail && t < retryCount;
        results.push({
          featureId: 'feat-' + String(t + 1).padStart(3, '0'),
          testName: 'test-feat-' + String(t + 1).padStart(3, '0'),
          status: isFail ? (isRetry ? 'retried' : 'failed') : 'passed',
          duration: 200 + (tSeed % 2500),
        });
      }
      runs.push({
        id: 'run-' + (1000 + r),
        timestamp: new Date(timestamp).toISOString(),
        totalTests,
        passed: passCount + retryCount,
        failed: failCount - retryCount,
        retried: retryCount,
        duration: 5000 + seed % 15000,
        status: (failCount - retryCount) > 0 ? 'failed' : 'passed',
        results,
      });
    }
    return runs;
  }

  function generateFlakyTests() {
    const runs = getRuns();
    const testMap = {};

    runs.forEach(run => {
      run.results.forEach(r => {
        if (!testMap[r.featureId]) {
          testMap[r.featureId] = { featureId: r.featureId, testName: r.testName, history: [] };
        }
        testMap[r.featureId].history.push(r.status);
      });
    });

    // Find flaky: tests that have mixed pass/fail across runs
    const flaky = Object.values(testMap).filter(t => {
      const hasPass = t.history.some(s => s === 'passed' || s === 'retried');
      const hasFail = t.history.some(s => s === 'failed' || s === 'retried');
      return hasPass && hasFail;
    }).map(t => {
      const failCount = t.history.filter(s => s === 'failed').length;
      const retryCount = t.history.filter(s => s === 'retried').length;
      const totalRuns = t.history.length;
      const flakyRate = Math.round(((failCount + retryCount) / totalRuns) * 100);
      return {
        featureId: t.featureId,
        testName: t.testName,
        totalRuns,
        passCount: t.history.filter(s => s === 'passed').length,
        failCount,
        retryCount,
        flakyRate,
        severity: flakyRate > 50 ? 'high' : flakyRate > 25 ? 'medium' : 'low',
        history: t.history,
      };
    });

    flaky.sort((a, b) => b.flakyRate - a.flakyRate);
    return flaky;
  }

  // ── Core data functions ──────────────────────────────────────
  function getRuns() {
    if (state.runs.length === 0) {
      state.runs = generateRuns();
    }
    return state.runs;
  }

  function getRun(id) {
    return getRuns().find(r => r.id === id) || null;
  }

  function addRun(runData) {
    const run = {
      id: runData.id || 'run-' + Date.now(),
      timestamp: runData.timestamp || new Date().toISOString(),
      totalTests: runData.totalTests || 0,
      passed: runData.passed || 0,
      failed: runData.failed || 0,
      retried: runData.retried || 0,
      duration: runData.duration || 0,
      status: runData.status || 'passed',
      results: runData.results || [],
    };
    state.runs.unshift(run);
    state.flakyTests = []; // reset to recalculate
    saveState();
    return run;
  }

  function compareRuns(id1, id2) {
    const run1 = getRun(id1);
    const run2 = getRun(id2);
    if (!run1 || !run2) return null;

    const diff = {
      run1: { id: run1.id, timestamp: run1.timestamp, passed: run1.passed, failed: run1.failed, retried: run1.retried, totalTests: run1.totalTests },
      run2: { id: run2.id, timestamp: run2.timestamp, passed: run2.passed, failed: run2.failed, retried: run2.retried, totalTests: run2.totalTests },
      passedDiff: run2.passed - run1.passed,
      failedDiff: run2.failed - run1.failed,
      changes: [],
    };

    // Per-test comparison
    const map1 = {};
    run1.results.forEach(r => { map1[r.featureId] = r.status; });
    run2.results.forEach(r => {
      const prev = map1[r.featureId];
      if (prev && prev !== r.status) {
        const improved = (prev === 'failed' && (r.status === 'passed' || r.status === 'retried'));
        const regressed = ((prev === 'passed') && (r.status === 'failed'));
        diff.changes.push({
          featureId: r.featureId,
          from: prev,
          to: r.status,
          type: improved ? 'improved' : regressed ? 'regressed' : 'unchanged',
        });
      }
    });

    return diff;
  }

  function getFlakyTests() {
    if (state.flakyTests.length === 0) {
      state.flakyTests = generateFlakyTests();
    }
    return state.flakyTests;
  }

  function getFlakyTest(featureId) {
    return getFlakyTests().find(t => t.featureId === featureId) || null;
  }

  function getOverallStats() {
    const runs = getRuns();
    const totalRuns = runs.length;
    const avgPassRate = totalRuns > 0 ? Math.round(runs.reduce((s, r) => s + (r.passed / r.totalTests * 100), 0) / totalRuns) : 0;
    const totalFlakyTests = getFlakyTests().length;
    const failingRuns = runs.filter(r => r.status === 'failed').length;
    return { totalRuns, avgPassRate, totalFlakyTests, failingRuns };
  }

  // ── Render ───────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('test-history-widget');
    if (!container) return;

    getRuns();
    const stats = getOverallStats();

    container.innerHTML = `
      <div id="test-history-card">
        <div class="th2-header">
          <h3>Test Result History</h3>
        </div>
        <div class="th2-stats-row" id="th2-stats">
          <div class="th2-stat-card"><div class="th2-stat-val">${stats.totalRuns}</div><div class="th2-stat-label">Total Runs</div></div>
          <div class="th2-stat-card"><div class="th2-stat-val">${stats.avgPassRate}%</div><div class="th2-stat-label">Avg Pass Rate</div></div>
          <div class="th2-stat-card"><div class="th2-stat-val">${stats.totalFlakyTests}</div><div class="th2-stat-label">Flaky Tests</div></div>
          <div class="th2-stat-card"><div class="th2-stat-val">${stats.failingRuns}</div><div class="th2-stat-label">Failing Runs</div></div>
        </div>
        <div class="th2-tabs" id="th2-tabs">
          <button class="th2-tab ${state.activeTab === 'runs' ? 'active' : ''}" data-tab="runs">All Runs</button>
          <button class="th2-tab ${state.activeTab === 'compare' ? 'active' : ''}" data-tab="compare">Compare</button>
          <button class="th2-tab ${state.activeTab === 'flaky' ? 'active' : ''}" data-tab="flaky">Flaky Tests</button>
        </div>
        <div id="th2-content"></div>
      </div>
    `;

    container.querySelectorAll('.th2-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.dataset.tab;
        saveState();
        render();
      });
    });

    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('th2-content');
    if (!el) return;
    switch (state.activeTab) {
      case 'runs': renderRuns(el); break;
      case 'compare': renderCompare(el); break;
      case 'flaky': renderFlaky(el); break;
    }
  }

  function renderRuns(el) {
    const runs = getRuns();
    el.innerHTML = `
      <div class="th2-run-list" id="th2-run-list">
        ${runs.map(r => {
          const passW = (r.passed / r.totalTests * 100).toFixed(0);
          const failW = ((r.failed) / r.totalTests * 100).toFixed(0);
          const retryW = (r.retried / r.totalTests * 100).toFixed(0);
          return `
            <div class="th2-run-item" data-run="${r.id}">
              <div class="th2-run-top">
                <div>
                  <div class="th2-run-id">${r.id}</div>
                  <div class="th2-run-time">${new Date(r.timestamp).toLocaleString()}</div>
                </div>
                <span class="th2-run-status ${r.status === 'failed' ? 'failed' : 'passed'}">${r.status}</span>
              </div>
              <div class="th2-run-bar">
                <div class="th2-run-bar-pass" style="flex:${passW}"></div>
                <div class="th2-run-bar-retry" style="flex:${retryW}"></div>
                <div class="th2-run-bar-fail" style="flex:${failW}"></div>
              </div>
              <div class="th2-run-stats">${r.passed} passed &middot; ${r.failed} failed &middot; ${r.retried} retried &middot; ${(r.duration / 1000).toFixed(1)}s</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderCompare(el) {
    const runs = getRuns();
    if (runs.length < 2) {
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--color-text-secondary,#a0a0b0);font-size:13px;">Need at least 2 runs to compare.</div>';
      return;
    }
    const r1 = runs[1]; // older
    const r2 = runs[0]; // newer
    const diff = compareRuns(r1.id, r2.id);

    el.innerHTML = `
      <div class="th2-compare-grid" id="th2-compare-grid">
        <div class="th2-compare-panel">
          <div class="th2-compare-title">${r1.id} (Older)</div>
          <div class="th2-compare-stat"><span>Passed</span><strong>${r1.passed}</strong></div>
          <div class="th2-compare-stat"><span>Failed</span><strong>${r1.failed}</strong></div>
          <div class="th2-compare-stat"><span>Retried</span><strong>${r1.retried}</strong></div>
          <div class="th2-compare-stat"><span>Status</span><strong>${r1.status}</strong></div>
        </div>
        <div class="th2-compare-panel">
          <div class="th2-compare-title">${r2.id} (Newer)</div>
          <div class="th2-compare-stat"><span>Passed</span><strong>${r2.passed}</strong></div>
          <div class="th2-compare-stat"><span>Failed</span><strong>${r2.failed}</strong></div>
          <div class="th2-compare-stat"><span>Retried</span><strong>${r2.retried}</strong></div>
          <div class="th2-compare-stat"><span>Status</span><strong>${r2.status}</strong></div>
        </div>
      </div>
      ${diff && diff.changes.length > 0 ? `
        <div class="th2-compare-diff" id="th2-compare-diff">
          <div style="font-size:13px;font-weight:600;color:var(--color-text,#e0e0e0);margin-bottom:8px;">Changes (${diff.changes.length})</div>
          ${diff.changes.map(c => `
            <div class="th2-diff-item ${c.type}">${c.featureId}: ${c.from} → ${c.to} (${c.type})</div>
          `).join('')}
        </div>
      ` : '<div style="margin-top:12px;font-size:13px;color:var(--color-text-secondary,#a0a0b0)">No test status changes between runs.</div>'}
    `;
  }

  function renderFlaky(el) {
    const flaky = getFlakyTests();
    if (flaky.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--color-text-secondary,#a0a0b0);font-size:13px;">No flaky tests detected.</div>';
      return;
    }

    el.innerHTML = `
      <div class="th2-flaky-list" id="th2-flaky-list">
        ${flaky.map(t => `
          <div class="th2-flaky-item" data-feature="${t.featureId}">
            <div class="th2-flaky-name">
              ${t.featureId} - ${t.testName}
              <span class="th2-flaky-badge ${t.severity}">${t.severity}</span>
            </div>
            <div class="th2-flaky-meta">
              Flaky rate: ${t.flakyRate}% &middot; ${t.totalRuns} runs &middot; ${t.passCount} pass, ${t.failCount} fail, ${t.retryCount} retry
            </div>
            <div class="th2-flaky-bar">
              ${t.history.map(s => `<div class="th2-flaky-segment ${s === 'passed' ? 'pass' : s === 'failed' ? 'fail' : 'retry'}" style="flex:1"></div>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ── Persistence ──────────────────────────────────────────────
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab }));
    } catch (e) { /* ignore */ }
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state.activeTab = parsed.activeTab || state.activeTab;
      }
    } catch (e) { /* ignore */ }
  }

  // ── Public API ───────────────────────────────────────────────
  window.testHistory = {
    getRuns,
    getRun,
    addRun,
    compareRuns,
    getFlakyTests,
    getFlakyTest,
    getOverallStats,
    setTab(tab) {
      state.activeTab = tab;
      saveState();
      render();
    },
    getState() {
      return {
        activeTab: state.activeTab,
        runCount: state.runs.length,
        flakyCount: getFlakyTests().length,
      };
    },
  };

  // ── Init ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    render();
  });
})();
