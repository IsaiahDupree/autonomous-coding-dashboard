// feat-092: AI-Powered Error Diagnosis
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #ai-error-diagnosis-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .aed-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .aed-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .aed-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .aed-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .aed-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .aed-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .aed-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .aed-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .aed-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .aed-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .aed-list { display: flex; flex-direction: column; gap: 8px; }
    .aed-error-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .aed-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .aed-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .aed-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .aed-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .aed-fix-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .aed-fix-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .aed-fix-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .aed-fix-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .aed-doc-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .aed-doc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .aed-doc-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .aed-doc-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'ai-error-diagnosis-config';

  let state = { activeTab: 'errors', errors: [] };

  function generateErrors() {
    return [
      { id: 'err-001', message: 'TypeError: Cannot read property "length" of undefined', file: 'src/components/FeatureList.js', line: 42, severity: 'critical', category: 'runtime', timestamp: new Date(Date.now() - 1800000).toISOString(), occurrences: 15, resolved: false },
      { id: 'err-002', message: 'ReferenceError: config is not defined', file: 'src/utils/settings.js', line: 18, severity: 'high', category: 'runtime', timestamp: new Date(Date.now() - 3600000).toISOString(), occurrences: 8, resolved: false },
      { id: 'err-003', message: 'SyntaxError: Unexpected token < in JSON', file: 'src/api/fetch.js', line: 67, severity: 'high', category: 'parse', timestamp: new Date(Date.now() - 7200000).toISOString(), occurrences: 3, resolved: true },
      { id: 'err-004', message: 'NetworkError: Failed to fetch /api/features', file: 'src/services/api.js', line: 23, severity: 'medium', category: 'network', timestamp: new Date(Date.now() - 14400000).toISOString(), occurrences: 45, resolved: false },
      { id: 'err-005', message: 'Warning: Each child should have a unique key prop', file: 'src/components/Dashboard.js', line: 89, severity: 'low', category: 'warning', timestamp: new Date(Date.now() - 28800000).toISOString(), occurrences: 120, resolved: false },
      { id: 'err-006', message: 'MemoryError: Heap limit exceeded during GC', file: 'node_modules/v8/gc.js', line: 0, severity: 'critical', category: 'memory', timestamp: new Date(Date.now() - 43200000).toISOString(), occurrences: 2, resolved: true },
      { id: 'err-007', message: 'TimeoutError: Operation timed out after 30000ms', file: 'src/services/database.js', line: 156, severity: 'medium', category: 'timeout', timestamp: new Date(Date.now() - 86400000).toISOString(), occurrences: 7, resolved: false },
      { id: 'err-008', message: 'PermissionError: Access denied for resource /admin', file: 'src/middleware/auth.js', line: 34, severity: 'high', category: 'auth', timestamp: new Date(Date.now() - 172800000).toISOString(), occurrences: 12, resolved: true },
    ];
  }

  function getDiagnosis(errorId) {
    const diagnoses = {
      'err-001': { rootCause: 'Array variable not initialized before accessing length property', confidence: 92, analysis: 'The FeatureList component receives features prop which can be undefined on first render before data loads.', suggestions: [
        { id: 'fix-001', description: 'Add null check before accessing length', code: 'if (features && features.length)', confidence: 95, effort: 'low' },
        { id: 'fix-002', description: 'Use optional chaining', code: 'features?.length || 0', confidence: 90, effort: 'low' },
        { id: 'fix-003', description: 'Initialize with default empty array', code: 'const features = props.features || []', confidence: 88, effort: 'low' },
      ], documentation: [
        { title: 'TypeError: Cannot read property of undefined', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cant_access_property', relevance: 95 },
        { title: 'Optional Chaining', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining', relevance: 85 },
      ]},
      'err-002': { rootCause: 'Variable used before declaration or missing import', confidence: 88, analysis: 'The config object is referenced in settings.js but was never imported from the config module.', suggestions: [
        { id: 'fix-004', description: 'Import config at top of file', code: "import config from '../config'", confidence: 92, effort: 'low' },
        { id: 'fix-005', description: 'Use environment variables instead', code: 'process.env.CONFIG_VALUE', confidence: 75, effort: 'medium' },
      ], documentation: [
        { title: 'ReferenceError', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Not_defined', relevance: 90 },
      ]},
      'err-004': { rootCause: 'API endpoint unreachable or CORS issue', confidence: 78, analysis: 'Network requests to /api/features are failing, likely due to server being down or CORS misconfiguration.', suggestions: [
        { id: 'fix-006', description: 'Add retry logic with exponential backoff', code: 'fetchWithRetry(url, { retries: 3 })', confidence: 85, effort: 'medium' },
        { id: 'fix-007', description: 'Add CORS headers to server', code: "Access-Control-Allow-Origin: *", confidence: 80, effort: 'low' },
        { id: 'fix-008', description: 'Implement offline fallback', code: 'navigator.onLine ? fetch(url) : getCached(url)', confidence: 70, effort: 'high' },
      ], documentation: [
        { title: 'CORS Errors', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS/Errors', relevance: 88 },
        { title: 'Fetch API', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API', relevance: 75 },
      ]},
    };
    return diagnoses[errorId] || {
      rootCause: 'Unable to determine exact root cause',
      confidence: 50,
      analysis: 'This error requires manual investigation for accurate diagnosis.',
      suggestions: [{ id: 'fix-gen', description: 'Review the error context and stack trace', code: 'console.trace()', confidence: 40, effort: 'medium' }],
      documentation: [{ title: 'JavaScript Errors Reference', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors', relevance: 60 }],
    };
  }

  function initState() {
    if (state.errors.length === 0) state.errors = generateErrors();
  }

  // ── API ────────────────────────────────────────────────────────
  function getErrors(filter) {
    initState();
    let list = [...state.errors];
    if (filter?.severity) list = list.filter(e => e.severity === filter.severity);
    if (filter?.category) list = list.filter(e => e.category === filter.category);
    if (filter?.resolved !== undefined) list = list.filter(e => e.resolved === filter.resolved);
    return list;
  }

  function getError(id) {
    initState();
    return state.errors.find(e => e.id === id) || null;
  }

  function analyzeError(id) {
    initState();
    const error = state.errors.find(e => e.id === id);
    if (!error) return null;
    const diagnosis = getDiagnosis(id);
    return {
      error,
      diagnosis: diagnosis.rootCause,
      confidence: diagnosis.confidence,
      analysis: diagnosis.analysis,
      suggestions: diagnosis.suggestions,
      documentation: diagnosis.documentation,
    };
  }

  function getSuggestions(errorId) {
    const diag = getDiagnosis(errorId);
    return diag.suggestions;
  }

  function getDocumentation(errorId) {
    const diag = getDiagnosis(errorId);
    return diag.documentation;
  }

  function resolveError(id) {
    initState();
    const error = state.errors.find(e => e.id === id);
    if (!error) return false;
    error.resolved = true;
    saveState();
    render();
    return true;
  }

  function getErrorStats() {
    initState();
    return {
      total: state.errors.length,
      critical: state.errors.filter(e => e.severity === 'critical').length,
      unresolved: state.errors.filter(e => !e.resolved).length,
      categories: [...new Set(state.errors.map(e => e.category))],
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('ai-error-diagnosis-widget');
    if (!container) return;
    initState();
    const stats = getErrorStats();

    container.innerHTML = `
      <div id="ai-error-diagnosis-card">
        <div class="aed-header"><h3>AI-Powered Error Diagnosis</h3></div>
        <div class="aed-stats-row">
          <div class="aed-stat-card"><div class="aed-stat-val">${stats.total}</div><div class="aed-stat-label">Total Errors</div></div>
          <div class="aed-stat-card"><div class="aed-stat-val">${stats.critical}</div><div class="aed-stat-label">Critical</div></div>
          <div class="aed-stat-card"><div class="aed-stat-val">${stats.unresolved}</div><div class="aed-stat-label">Unresolved</div></div>
          <div class="aed-stat-card"><div class="aed-stat-val">${stats.categories.length}</div><div class="aed-stat-label">Categories</div></div>
        </div>
        <div class="aed-tabs">
          <button class="aed-tab ${state.activeTab === 'errors' ? 'active' : ''}" data-tab="errors">Error Logs</button>
          <button class="aed-tab ${state.activeTab === 'fixes' ? 'active' : ''}" data-tab="fixes">Suggested Fixes</button>
          <button class="aed-tab ${state.activeTab === 'docs' ? 'active' : ''}" data-tab="docs">Documentation</button>
        </div>
        <div id="aed-content"></div>
      </div>
    `;

    container.querySelectorAll('.aed-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('aed-content');
    if (!el) return;
    if (state.activeTab === 'errors') renderErrors(el);
    else if (state.activeTab === 'fixes') renderFixes(el);
    else renderDocs(el);
  }

  function renderErrors(el) {
    const errors = getErrors();
    const sevColors = { critical: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#22c55e' };
    el.innerHTML = `
      <div class="aed-list" id="aed-error-list">
        ${errors.map(e => `
          <div class="aed-error-item" data-id="${e.id}">
            <div class="aed-item-top">
              <div class="aed-item-name">${e.message.substring(0, 60)}...</div>
              <span class="aed-badge" style="background:${sevColors[e.severity]}22;color:${sevColors[e.severity]}">${e.severity}</span>
            </div>
            <div class="aed-item-detail">${e.file}:${e.line} · ${e.category} · ${e.occurrences}x · ${e.resolved ? 'Resolved' : 'Active'}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderFixes(el) {
    const unresolvedErrors = getErrors({ resolved: false });
    const allFixes = [];
    unresolvedErrors.forEach(err => {
      const diag = getDiagnosis(err.id);
      diag.suggestions.forEach(s => allFixes.push({ ...s, errorId: err.id, errorMsg: err.message.substring(0, 40) }));
    });
    el.innerHTML = `
      <div id="aed-fixes-section">
        <div class="aed-list" id="aed-fix-list">
          ${allFixes.map(f => `
            <div class="aed-fix-item" data-id="${f.id}">
              <div class="aed-fix-top">
                <div class="aed-fix-name">${f.description}</div>
                <span class="aed-badge" style="background:#22c55e22;color:#22c55e">${f.confidence}%</span>
              </div>
              <div class="aed-fix-detail">${f.errorMsg}... · Effort: ${f.effort}</div>
              <div class="aed-fix-detail" style="font-family:monospace;margin-top:4px">${f.code}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderDocs(el) {
    const allDocs = [];
    state.errors.forEach(err => {
      const diag = getDiagnosis(err.id);
      diag.documentation.forEach(d => {
        if (!allDocs.find(ad => ad.url === d.url)) allDocs.push({ ...d, errorId: err.id });
      });
    });
    allDocs.sort((a, b) => b.relevance - a.relevance);
    el.innerHTML = `
      <div id="aed-docs-section">
        <div class="aed-list" id="aed-doc-list">
          ${allDocs.map(d => `
            <div class="aed-doc-item" data-url="${d.url}">
              <div class="aed-doc-top">
                <div class="aed-doc-name">${d.title}</div>
                <span class="aed-badge" style="background:#6366f122;color:#6366f1">${d.relevance}%</span>
              </div>
              <div class="aed-doc-detail">${d.url}</div>
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

  window.aiErrorDiagnosis = {
    getErrors, getError, analyzeError, getSuggestions, getDocumentation,
    resolveError, getErrorStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      initState();
      const stats = getErrorStats();
      return {
        activeTab: state.activeTab,
        errorCount: stats.total,
        unresolvedCount: stats.unresolved,
        criticalCount: stats.critical,
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
