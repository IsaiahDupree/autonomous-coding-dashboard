// feat-094: Code Quality Analysis
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #code-quality-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .cq-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .cq-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .cq-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .cq-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .cq-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .cq-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .cq-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .cq-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .cq-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .cq-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .cq-list { display: flex; flex-direction: column; gap: 8px; }
    .cq-analysis-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .cq-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .cq-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .cq-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .cq-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .cq-suggestion-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .cq-suggestion-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .cq-suggestion-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .cq-suggestion-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .cq-trend-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .cq-trend-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .cq-trend-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .cq-trend-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .cq-bar { height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; margin-top: 8px; }
    .cq-bar-fill { height: 6px; border-radius: 3px; transition: width 0.3s; }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'code-quality-config';
  let state = { activeTab: 'analysis' };

  function getAnalysisResults() {
    return [
      { id: 'ca-001', file: 'app.js', score: 82, lines: 450, complexity: 12, duplications: 3, issues: 5, grade: 'B', category: 'core' },
      { id: 'ca-002', file: 'mock-data.js', score: 75, lines: 320, complexity: 8, duplications: 6, issues: 8, grade: 'C', category: 'data' },
      { id: 'ca-003', file: 'index.css', score: 90, lines: 280, complexity: 2, duplications: 1, issues: 2, grade: 'A', category: 'styles' },
      { id: 'ca-004', file: 'rest-api.js', score: 88, lines: 380, complexity: 15, duplications: 2, issues: 3, grade: 'B', category: 'api' },
      { id: 'ca-005', file: 'webhooks.js', score: 85, lines: 340, complexity: 10, duplications: 2, issues: 4, grade: 'B', category: 'api' },
      { id: 'ca-006', file: 'rbac.js', score: 92, lines: 290, complexity: 8, duplications: 0, issues: 1, grade: 'A', category: 'security' },
      { id: 'ca-007', file: 'audit-log.js', score: 87, lines: 310, complexity: 9, duplications: 1, issues: 3, grade: 'B', category: 'security' },
      { id: 'ca-008', file: 'load-optimizer.js', score: 78, lines: 420, complexity: 18, duplications: 4, issues: 7, grade: 'C', category: 'performance' },
    ];
  }

  function getAnalysis(id) {
    return getAnalysisResults().find(a => a.id === id) || null;
  }

  function analyzeFile(file) {
    const existing = getAnalysisResults().find(a => a.file === file);
    if (existing) return existing;
    return { id: 'ca-new', file, score: 80, lines: 200, complexity: 6, duplications: 1, issues: 3, grade: 'B', category: 'other' };
  }

  function getImprovements() {
    return [
      { id: 'imp-001', file: 'mock-data.js', type: 'duplication', severity: 'medium', description: 'Reduce code duplication in data generators', impact: 15, effort: 'low' },
      { id: 'imp-002', file: 'app.js', type: 'complexity', severity: 'high', description: 'Break down complex render function into smaller components', impact: 20, effort: 'medium' },
      { id: 'imp-003', file: 'load-optimizer.js', type: 'complexity', severity: 'high', description: 'Simplify nested conditionals in cache management', impact: 18, effort: 'medium' },
      { id: 'imp-004', file: 'rest-api.js', type: 'naming', severity: 'low', description: 'Use more descriptive variable names in endpoint handlers', impact: 5, effort: 'low' },
      { id: 'imp-005', file: 'webhooks.js', type: 'error_handling', severity: 'medium', description: 'Add proper error handling for webhook delivery failures', impact: 12, effort: 'medium' },
      { id: 'imp-006', file: 'mock-data.js', type: 'performance', severity: 'medium', description: 'Lazy-load mock data instead of eagerly generating all records', impact: 10, effort: 'low' },
      { id: 'imp-007', file: 'app.js', type: 'structure', severity: 'low', description: 'Extract utility functions into separate module', impact: 8, effort: 'high' },
      { id: 'imp-008', file: 'load-optimizer.js', type: 'duplication', severity: 'medium', description: 'Create shared cache utility for repetitive patterns', impact: 12, effort: 'medium' },
    ];
  }

  function getImprovement(id) {
    return getImprovements().find(i => i.id === id) || null;
  }

  function getQualityTrends() {
    const now = Date.now();
    return [
      { date: new Date(now - 7 * 86400000).toISOString(), overallScore: 78, avgComplexity: 14, totalIssues: 42, filesAnalyzed: 8 },
      { date: new Date(now - 6 * 86400000).toISOString(), overallScore: 80, avgComplexity: 13, totalIssues: 38, filesAnalyzed: 8 },
      { date: new Date(now - 5 * 86400000).toISOString(), overallScore: 79, avgComplexity: 13, totalIssues: 40, filesAnalyzed: 8 },
      { date: new Date(now - 4 * 86400000).toISOString(), overallScore: 82, avgComplexity: 12, totalIssues: 35, filesAnalyzed: 8 },
      { date: new Date(now - 3 * 86400000).toISOString(), overallScore: 83, avgComplexity: 11, totalIssues: 33, filesAnalyzed: 8 },
      { date: new Date(now - 2 * 86400000).toISOString(), overallScore: 84, avgComplexity: 11, totalIssues: 31, filesAnalyzed: 8 },
      { date: new Date(now - 86400000).toISOString(), overallScore: 85, avgComplexity: 10, totalIssues: 28, filesAnalyzed: 8 },
    ];
  }

  function getOverallScore() {
    const results = getAnalysisResults();
    return Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  }

  function getQualityStats() {
    const results = getAnalysisResults();
    const improvements = getImprovements();
    return {
      overallScore: getOverallScore(),
      filesAnalyzed: results.length,
      totalIssues: results.reduce((s, r) => s + r.issues, 0),
      improvementCount: improvements.length,
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('code-quality-widget');
    if (!container) return;
    const stats = getQualityStats();

    container.innerHTML = `
      <div id="code-quality-card">
        <div class="cq-header"><h3>Code Quality Analysis</h3></div>
        <div class="cq-stats-row">
          <div class="cq-stat-card"><div class="cq-stat-val">${stats.overallScore}%</div><div class="cq-stat-label">Quality Score</div></div>
          <div class="cq-stat-card"><div class="cq-stat-val">${stats.filesAnalyzed}</div><div class="cq-stat-label">Files Analyzed</div></div>
          <div class="cq-stat-card"><div class="cq-stat-val">${stats.totalIssues}</div><div class="cq-stat-label">Issues</div></div>
          <div class="cq-stat-card"><div class="cq-stat-val">${stats.improvementCount}</div><div class="cq-stat-label">Suggestions</div></div>
        </div>
        <div class="cq-tabs">
          <button class="cq-tab ${state.activeTab === 'analysis' ? 'active' : ''}" data-tab="analysis">Analysis</button>
          <button class="cq-tab ${state.activeTab === 'suggestions' ? 'active' : ''}" data-tab="suggestions">Suggestions</button>
          <button class="cq-tab ${state.activeTab === 'trends' ? 'active' : ''}" data-tab="trends">Trends</button>
        </div>
        <div id="cq-content"></div>
      </div>
    `;

    container.querySelectorAll('.cq-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('cq-content');
    if (!el) return;
    if (state.activeTab === 'analysis') renderAnalysis(el);
    else if (state.activeTab === 'suggestions') renderSuggestions(el);
    else renderTrends(el);
  }

  function renderAnalysis(el) {
    const results = getAnalysisResults();
    const gradeColors = { A: '#22c55e', B: '#6366f1', C: '#f59e0b', D: '#ef4444' };
    el.innerHTML = `
      <div class="cq-list" id="cq-analysis-list">
        ${results.map(r => `
          <div class="cq-analysis-item" data-id="${r.id}">
            <div class="cq-item-top">
              <div class="cq-item-name">${r.file}</div>
              <span class="cq-badge" style="background:${gradeColors[r.grade]}22;color:${gradeColors[r.grade]}">${r.grade} (${r.score}%)</span>
            </div>
            <div class="cq-item-detail">${r.lines} lines · Complexity: ${r.complexity} · ${r.duplications} duplications · ${r.issues} issues</div>
            <div class="cq-bar"><div class="cq-bar-fill" style="width:${r.score}%;background:${gradeColors[r.grade]}"></div></div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderSuggestions(el) {
    const improvements = getImprovements();
    const sevColors = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
    el.innerHTML = `
      <div id="cq-suggestions-section">
        <div class="cq-list" id="cq-suggestion-list">
          ${improvements.map(i => `
            <div class="cq-suggestion-item" data-id="${i.id}">
              <div class="cq-suggestion-top">
                <div class="cq-suggestion-name">${i.file}: ${i.type}</div>
                <span class="cq-badge" style="background:${sevColors[i.severity]}22;color:${sevColors[i.severity]}">${i.severity} · +${i.impact}%</span>
              </div>
              <div class="cq-suggestion-detail">${i.description} · Effort: ${i.effort}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderTrends(el) {
    const trends = getQualityTrends();
    el.innerHTML = `
      <div id="cq-trends-section">
        <div class="cq-list" id="cq-trend-list">
          ${trends.map(t => `
            <div class="cq-trend-item">
              <div class="cq-trend-top">
                <div class="cq-trend-name">${new Date(t.date).toLocaleDateString()}</div>
                <span class="cq-badge" style="background:#6366f122;color:#6366f1">${t.overallScore}%</span>
              </div>
              <div class="cq-trend-detail">Complexity: ${t.avgComplexity} · Issues: ${t.totalIssues} · Files: ${t.filesAnalyzed}</div>
              <div class="cq-bar"><div class="cq-bar-fill" style="width:${t.overallScore}%;background:#6366f1"></div></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab })); } catch (e) {}
  }
  function loadState() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) { const p = JSON.parse(s); state.activeTab = p.activeTab || state.activeTab; }
    } catch (e) {}
  }

  window.codeQuality = {
    getAnalysisResults, getAnalysis, analyzeFile,
    getImprovements, getImprovement,
    getQualityTrends, getOverallScore, getQualityStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        overallScore: getOverallScore(),
        filesAnalyzed: getAnalysisResults().length,
        issueCount: getAnalysisResults().reduce((s, r) => s + r.issues, 0),
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
