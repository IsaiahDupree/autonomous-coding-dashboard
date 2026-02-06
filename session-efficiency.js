// feat-069: Session Efficiency Metrics
(function () {
  'use strict';

  // ── CSS ──────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #session-efficiency-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .se-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .se-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text, #e0e0e0);
    }
    .se-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      background: var(--color-bg, #12121a);
      border-radius: 8px;
      padding: 3px;
    }
    .se-tab {
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
    .se-tab.active {
      background: var(--color-primary, #6366f1);
      color: #fff;
    }
    .se-tab:hover:not(.active) {
      background: rgba(255,255,255,0.05);
    }

    /* Stats grid */
    .se-stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .se-stat {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    .se-stat-value {
      font-size: 22px;
      font-weight: 700;
      color: var(--color-text, #e0e0e0);
    }
    .se-stat-value.good { color: #22c55e; }
    .se-stat-value.warn { color: #f59e0b; }
    .se-stat-value.bad { color: #ef4444; }
    .se-stat-label {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
      margin-top: 4px;
    }

    /* Session list */
    .se-session-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .se-session-item {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .se-session-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text, #e0e0e0);
    }
    .se-session-meta {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
      margin-top: 2px;
    }
    .se-session-rate {
      font-size: 16px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
    }
    .se-session-rate.good { background: rgba(34,197,94,0.12); color: #22c55e; }
    .se-session-rate.warn { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .se-session-rate.bad { background: rgba(239,68,68,0.12); color: #ef4444; }

    /* Time per feature */
    .se-time-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 10px;
    }
    .se-time-card {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 12px;
    }
    .se-time-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text, #e0e0e0);
      margin-bottom: 4px;
    }
    .se-time-value {
      font-size: 18px;
      font-weight: 700;
      color: #6366f1;
    }
    .se-time-bar-track {
      height: 4px;
      background: rgba(255,255,255,0.06);
      border-radius: 2px;
      margin-top: 8px;
    }
    .se-time-bar-fill {
      height: 4px;
      border-radius: 2px;
      background: #6366f1;
      transition: width 0.3s;
    }

    /* Error patterns */
    .se-error-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .se-error-item {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 14px;
    }
    .se-error-type {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .se-error-type.critical { background: rgba(239,68,68,0.15); color: #ef4444; }
    .se-error-type.warning { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .se-error-type.info { background: rgba(99,102,241,0.15); color: #6366f1; }
    .se-error-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text, #e0e0e0);
      margin-bottom: 4px;
    }
    .se-error-desc {
      font-size: 13px;
      color: var(--color-text-secondary, #a0a0b0);
      line-height: 1.4;
    }
    .se-error-count {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
      margin-top: 6px;
    }
    .se-error-count strong {
      color: var(--color-text, #e0e0e0);
    }

    /* Overall summary badge */
    .se-summary-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
    }
    .se-summary-badge.excellent { background: rgba(34,197,94,0.12); color: #22c55e; }
    .se-summary-badge.good { background: rgba(99,102,241,0.12); color: #6366f1; }
    .se-summary-badge.fair { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .se-summary-badge.poor { background: rgba(239,68,68,0.12); color: #ef4444; }
  `;
  document.head.appendChild(style);

  // ── State ────────────────────────────────────────────────────
  const STORAGE_KEY = 'session-efficiency-config';
  let state = {
    activeTab: 'overview',
    sessions: [],
    errorPatterns: [],
  };

  // ── Data generation ──────────────────────────────────────────
  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  function generateSessions() {
    const sessionNames = [
      'Session Alpha', 'Session Beta', 'Session Gamma', 'Session Delta',
      'Session Epsilon', 'Session Zeta', 'Session Eta', 'Session Theta',
      'Session Iota', 'Session Kappa',
    ];
    const now = Date.now();
    return sessionNames.map((name, i) => {
      const seed = hashCode(name);
      const totalFeatures = 8 + (seed % 12); // 8-19
      const passedFeatures = Math.min(totalFeatures, Math.max(3, totalFeatures - (seed % 5)));
      const failedFeatures = totalFeatures - passedFeatures;
      const durationMinutes = 15 + (seed % 90); // 15-104 min
      const errors = seed % 8;
      const startTime = now - (10 - i) * 86400000; // spread over 10 days
      return {
        id: 'session-' + String(i + 1).padStart(3, '0'),
        name,
        startTime,
        endTime: startTime + durationMinutes * 60000,
        durationMinutes,
        totalFeatures,
        passedFeatures,
        failedFeatures,
        successRate: Math.round((passedFeatures / totalFeatures) * 100),
        errors,
        avgTimePerFeature: round(durationMinutes / totalFeatures, 1),
      };
    });
  }

  function generateErrorPatterns() {
    return [
      {
        id: 'err-timeout',
        type: 'critical',
        name: 'Timeout Errors',
        description: 'API calls exceeding 30s timeout limit. Common in complex feature implementations with multiple tool calls.',
        count: 12,
        sessions: ['session-002', 'session-005', 'session-008'],
        trend: 'decreasing',
      },
      {
        id: 'err-syntax',
        type: 'warning',
        name: 'Syntax Errors in Generated Code',
        description: 'Generated code contains syntax errors requiring retry. Often occurs with complex nested structures.',
        count: 8,
        sessions: ['session-001', 'session-003', 'session-006'],
        trend: 'stable',
      },
      {
        id: 'err-context',
        type: 'warning',
        name: 'Context Window Overflow',
        description: 'Session exceeded context window limit, requiring summarization. Impacts multi-file features.',
        count: 5,
        sessions: ['session-004', 'session-007'],
        trend: 'increasing',
      },
      {
        id: 'err-test-flaky',
        type: 'info',
        name: 'Flaky Test Failures',
        description: 'Tests that pass on retry but fail intermittently. Usually timing-dependent assertions.',
        count: 15,
        sessions: ['session-001', 'session-002', 'session-005', 'session-009'],
        trend: 'stable',
      },
      {
        id: 'err-merge',
        type: 'info',
        name: 'Merge Conflicts',
        description: 'File modifications conflicting with concurrent changes. Rare in sequential execution mode.',
        count: 3,
        sessions: ['session-010'],
        trend: 'decreasing',
      },
    ];
  }

  function round(val, decimals) {
    return Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  // ── Core data functions ──────────────────────────────────────
  function getSessions() {
    if (state.sessions.length === 0) {
      state.sessions = generateSessions();
    }
    return state.sessions;
  }

  function getSession(id) {
    return getSessions().find(s => s.id === id) || null;
  }

  function getSuccessRates() {
    return getSessions().map(s => ({
      sessionId: s.id,
      name: s.name,
      successRate: s.successRate,
      totalFeatures: s.totalFeatures,
      passedFeatures: s.passedFeatures,
      failedFeatures: s.failedFeatures,
    }));
  }

  function getOverallSuccessRate() {
    const sessions = getSessions();
    const totalFeatures = sessions.reduce((sum, s) => sum + s.totalFeatures, 0);
    const totalPassed = sessions.reduce((sum, s) => sum + s.passedFeatures, 0);
    return totalFeatures > 0 ? Math.round((totalPassed / totalFeatures) * 100) : 0;
  }

  function getAverageTimePerFeature() {
    const sessions = getSessions();
    if (sessions.length === 0) return 0;
    const totalTime = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const totalFeatures = sessions.reduce((sum, s) => sum + s.totalFeatures, 0);
    return totalFeatures > 0 ? round(totalTime / totalFeatures, 1) : 0;
  }

  function getTimePerFeatureBySession() {
    return getSessions().map(s => ({
      sessionId: s.id,
      name: s.name,
      avgTimePerFeature: s.avgTimePerFeature,
      durationMinutes: s.durationMinutes,
      totalFeatures: s.totalFeatures,
    }));
  }

  function getErrorPatterns() {
    if (state.errorPatterns.length === 0) {
      state.errorPatterns = generateErrorPatterns();
    }
    return state.errorPatterns;
  }

  function getErrorPattern(id) {
    return getErrorPatterns().find(e => e.id === id) || null;
  }

  function getTotalErrors() {
    return getErrorPatterns().reduce((sum, e) => sum + e.count, 0);
  }

  function getEfficiencyScore() {
    const successRate = getOverallSuccessRate();
    const avgTime = getAverageTimePerFeature();
    const errorRate = getTotalErrors() / getSessions().length;
    // Score 0-100
    let score = successRate * 0.5; // 50% weight to success rate
    score += Math.max(0, (20 - avgTime) / 20 * 30); // 30% weight to speed (lower is better, capped at 20 min)
    score += Math.max(0, (10 - errorRate) / 10 * 20); // 20% weight to low errors
    return Math.round(Math.min(100, Math.max(0, score)));
  }

  function getEfficiencyGrade() {
    const score = getEfficiencyScore();
    if (score >= 90) return { grade: 'A', label: 'Excellent', class: 'excellent' };
    if (score >= 75) return { grade: 'B', label: 'Good', class: 'good' };
    if (score >= 60) return { grade: 'C', label: 'Fair', class: 'fair' };
    return { grade: 'D', label: 'Poor', class: 'poor' };
  }

  // ── Render ───────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('session-efficiency-widget');
    if (!container) return;

    getSessions();
    getErrorPatterns();
    const grade = getEfficiencyGrade();

    container.innerHTML = `
      <div id="session-efficiency-card">
        <div class="se-header">
          <h3>Session Efficiency Metrics</h3>
          <span class="se-summary-badge ${grade.class}">${grade.grade} - ${grade.label} (${getEfficiencyScore()})</span>
        </div>
        <div class="se-stats-grid" id="se-stats">
          <div class="se-stat">
            <div class="se-stat-value ${getOverallSuccessRate() >= 80 ? 'good' : getOverallSuccessRate() >= 60 ? 'warn' : 'bad'}">${getOverallSuccessRate()}%</div>
            <div class="se-stat-label">Overall Success Rate</div>
          </div>
          <div class="se-stat">
            <div class="se-stat-value">${getAverageTimePerFeature()}m</div>
            <div class="se-stat-label">Avg Time/Feature</div>
          </div>
          <div class="se-stat">
            <div class="se-stat-value">${getSessions().length}</div>
            <div class="se-stat-label">Total Sessions</div>
          </div>
          <div class="se-stat">
            <div class="se-stat-value ${getTotalErrors() > 20 ? 'bad' : getTotalErrors() > 10 ? 'warn' : 'good'}">${getTotalErrors()}</div>
            <div class="se-stat-label">Total Errors</div>
          </div>
        </div>
        <div class="se-tabs" id="se-tabs">
          <button class="se-tab ${state.activeTab === 'overview' ? 'active' : ''}" data-tab="overview">Success Rates</button>
          <button class="se-tab ${state.activeTab === 'time' ? 'active' : ''}" data-tab="time">Time/Feature</button>
          <button class="se-tab ${state.activeTab === 'errors' ? 'active' : ''}" data-tab="errors">Error Patterns</button>
        </div>
        <div id="se-content"></div>
      </div>
    `;

    container.querySelectorAll('.se-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.dataset.tab;
        saveState();
        render();
      });
    });

    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('se-content');
    if (!el) return;

    switch (state.activeTab) {
      case 'overview': renderOverview(el); break;
      case 'time': renderTimePerFeature(el); break;
      case 'errors': renderErrorPatterns(el); break;
    }
  }

  function renderOverview(el) {
    const sessions = getSessions();
    el.innerHTML = `
      <div class="se-session-list" id="se-session-list">
        ${sessions.map(s => {
          const rateClass = s.successRate >= 80 ? 'good' : s.successRate >= 60 ? 'warn' : 'bad';
          return `
            <div class="se-session-item" data-session="${s.id}">
              <div>
                <div class="se-session-name">${s.name}</div>
                <div class="se-session-meta">${s.totalFeatures} features &middot; ${s.durationMinutes}min &middot; ${s.errors} errors</div>
              </div>
              <span class="se-session-rate ${rateClass}">${s.successRate}%</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderTimePerFeature(el) {
    const times = getTimePerFeatureBySession();
    const maxTime = Math.max(...times.map(t => t.avgTimePerFeature));

    el.innerHTML = `
      <div class="se-time-grid" id="se-time-grid">
        ${times.map(t => `
          <div class="se-time-card" data-session="${t.sessionId}">
            <div class="se-time-label">${t.name}</div>
            <div class="se-time-value">${t.avgTimePerFeature}m</div>
            <div style="font-size:12px;color:var(--color-text-secondary,#a0a0b0)">${t.totalFeatures} feats in ${t.durationMinutes}min</div>
            <div class="se-time-bar-track">
              <div class="se-time-bar-fill" style="width:${(t.avgTimePerFeature / maxTime * 100).toFixed(1)}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderErrorPatterns(el) {
    const patterns = getErrorPatterns();
    el.innerHTML = `
      <div class="se-error-list" id="se-error-list">
        ${patterns.map(p => `
          <div class="se-error-item" data-error="${p.id}">
            <span class="se-error-type ${p.type}">${p.type}</span>
            <div class="se-error-name">${p.name}</div>
            <div class="se-error-desc">${p.description}</div>
            <div class="se-error-count">Occurrences: <strong>${p.count}</strong> &middot; Trend: ${p.trend} &middot; Sessions: ${p.sessions.length}</div>
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
  window.sessionEfficiency = {
    getSessions,
    getSession,
    getSuccessRates,
    getOverallSuccessRate,
    getAverageTimePerFeature,
    getTimePerFeatureBySession,
    getErrorPatterns,
    getErrorPattern,
    getTotalErrors,
    getEfficiencyScore,
    getEfficiencyGrade,
    setTab(tab) {
      state.activeTab = tab;
      saveState();
      render();
    },
    getState() {
      return { activeTab: state.activeTab, sessionCount: state.sessions.length, errorPatternCount: state.errorPatterns.length };
    },
  };

  // ── Init ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    render();
  });
})();
