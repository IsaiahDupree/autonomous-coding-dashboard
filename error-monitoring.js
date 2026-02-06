// feat-110: Error Rate Monitoring
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #error-monitoring-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .em-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .em-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .em-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .em-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .em-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .em-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .em-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .em-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .em-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .em-list { display: flex; flex-direction: column; gap: 8px; }
    .em-category-item, .em-error-item, .em-pattern-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .em-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .em-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .em-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .em-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);
  const STORAGE_KEY = 'error-monitoring-config';
  let state = { activeTab: 'categories' };

  function getCategories() {
    return [
      { id: 'ecat-001', name: 'Runtime Errors', count: 42, rate: 0.34, trend: 'decreasing', severity: 'high' },
      { id: 'ecat-002', name: 'API Errors', count: 28, rate: 0.22, trend: 'stable', severity: 'high' },
      { id: 'ecat-003', name: 'Network Errors', count: 15, rate: 0.12, trend: 'increasing', severity: 'medium' },
      { id: 'ecat-004', name: 'Validation Errors', count: 67, rate: 0.54, trend: 'stable', severity: 'low' },
      { id: 'ecat-005', name: 'Authentication Errors', count: 8, rate: 0.06, trend: 'decreasing', severity: 'high' },
      { id: 'ecat-006', name: 'Timeout Errors', count: 19, rate: 0.15, trend: 'increasing', severity: 'medium' },
    ];
  }
  function getCategory(id) { return getCategories().find(c => c.id === id) || null; }

  function getRecentErrors() {
    return [
      { id: 'err-001', message: 'TypeError: Cannot read property of undefined', category: 'Runtime Errors', file: 'app.js', line: 142, timestamp: '2026-02-06T01:05:00Z', resolved: false },
      { id: 'err-002', message: 'API returned 500: Internal Server Error', category: 'API Errors', file: 'harness-client.js', line: 88, timestamp: '2026-02-06T01:02:00Z', resolved: false },
      { id: 'err-003', message: 'Network request timed out after 30s', category: 'Timeout Errors', file: 'api-client.js', line: 56, timestamp: '2026-02-06T00:58:00Z', resolved: true },
      { id: 'err-004', message: 'Validation failed: missing required field "name"', category: 'Validation Errors', file: 'validator.js', line: 23, timestamp: '2026-02-06T00:55:00Z', resolved: true },
      { id: 'err-005', message: 'CORS policy blocked cross-origin request', category: 'Network Errors', file: 'fetch-handler.js', line: 15, timestamp: '2026-02-06T00:50:00Z', resolved: false },
      { id: 'err-006', message: 'JWT token expired', category: 'Authentication Errors', file: 'auth-middleware.js', line: 67, timestamp: '2026-02-06T00:45:00Z', resolved: true },
      { id: 'err-007', message: 'ReferenceError: variable is not defined', category: 'Runtime Errors', file: 'plugin-loader.js', line: 34, timestamp: '2026-02-06T00:40:00Z', resolved: false },
      { id: 'err-008', message: 'Database connection pool exhausted', category: 'API Errors', file: 'db-pool.js', line: 112, timestamp: '2026-02-06T00:35:00Z', resolved: true },
    ];
  }
  function getRecentError(id) { return getRecentErrors().find(e => e.id === id) || null; }

  function getPatterns() {
    return [
      { id: 'pat-001', name: 'Null Reference Pattern', occurrences: 34, firstSeen: '2026-02-01T00:00:00Z', lastSeen: '2026-02-06T01:05:00Z', affectedFiles: 8, status: 'active' },
      { id: 'pat-002', name: 'API Timeout Cluster', occurrences: 19, firstSeen: '2026-02-03T12:00:00Z', lastSeen: '2026-02-06T00:58:00Z', affectedFiles: 3, status: 'active' },
      { id: 'pat-003', name: 'Auth Token Expiry', occurrences: 12, firstSeen: '2026-02-04T08:00:00Z', lastSeen: '2026-02-06T00:45:00Z', affectedFiles: 2, status: 'mitigated' },
      { id: 'pat-004', name: 'Validation Schema Drift', occurrences: 45, firstSeen: '2026-01-28T00:00:00Z', lastSeen: '2026-02-06T00:55:00Z', affectedFiles: 12, status: 'active' },
      { id: 'pat-005', name: 'Connection Pool Leak', occurrences: 7, firstSeen: '2026-02-05T16:00:00Z', lastSeen: '2026-02-06T00:35:00Z', affectedFiles: 1, status: 'investigating' },
    ];
  }
  function getPattern(id) { return getPatterns().find(p => p.id === id) || null; }

  function getStats() {
    const cats = getCategories();
    const totalErrors = cats.reduce((a, c) => a + c.count, 0);
    const avgRate = (cats.reduce((a, c) => a + c.rate, 0) / cats.length).toFixed(2);
    return { totalErrors, avgRate: avgRate + '%', recentCount: getRecentErrors().length, patternCount: getPatterns().length };
  }

  function render() {
    const container = document.getElementById('error-monitoring-widget');
    if (!container) return;
    const stats = getStats();
    container.innerHTML = `
      <div id="error-monitoring-card">
        <div class="em-header"><h3>Error Rate Monitoring</h3></div>
        <div class="em-stats-row">
          <div class="em-stat-card"><div class="em-stat-val">${stats.totalErrors}</div><div class="em-stat-label">Total Errors</div></div>
          <div class="em-stat-card"><div class="em-stat-val">${stats.avgRate}</div><div class="em-stat-label">Avg Rate</div></div>
          <div class="em-stat-card"><div class="em-stat-val">${stats.recentCount}</div><div class="em-stat-label">Recent</div></div>
          <div class="em-stat-card"><div class="em-stat-val">${stats.patternCount}</div><div class="em-stat-label">Patterns</div></div>
        </div>
        <div class="em-tabs">
          <button class="em-tab ${state.activeTab === 'categories' ? 'active' : ''}" data-tab="categories">Categories</button>
          <button class="em-tab ${state.activeTab === 'recent' ? 'active' : ''}" data-tab="recent">Recent</button>
          <button class="em-tab ${state.activeTab === 'patterns' ? 'active' : ''}" data-tab="patterns">Patterns</button>
        </div>
        <div id="em-content"></div>
      </div>`;
    container.querySelectorAll('.em-tab').forEach(btn => { btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); }); });
    renderContent();
  }
  function renderContent() {
    const el = document.getElementById('em-content');
    if (!el) return;
    const sevColor = s => s === 'high' ? '#ef4444' : s === 'medium' ? '#f59e0b' : '#3b82f6';
    const trendIcon = t => t === 'increasing' ? '#ef4444' : t === 'decreasing' ? '#22c55e' : '#6b7280';
    if (state.activeTab === 'categories') el.innerHTML = `<div class="em-list" id="em-category-list">${getCategories().map(c => `<div class="em-category-item" data-id="${c.id}"><div class="em-item-top"><div class="em-item-name">${c.name}</div><span class="em-badge" style="background:${sevColor(c.severity)}22;color:${sevColor(c.severity)}">${c.count} errors</span></div><div class="em-item-detail">Rate: ${c.rate}% · Trend: ${c.trend} · Severity: ${c.severity}</div></div>`).join('')}</div>`;
    else if (state.activeTab === 'recent') el.innerHTML = `<div id="em-recent-section"><div class="em-list" id="em-error-list">${getRecentErrors().map(e => `<div class="em-error-item" data-id="${e.id}"><div class="em-item-top"><div class="em-item-name">${e.message.substring(0, 50)}${e.message.length > 50 ? '...' : ''}</div><span class="em-badge" style="background:${e.resolved?'#22c55e':'#ef4444'}22;color:${e.resolved?'#22c55e':'#ef4444'}">${e.resolved?'resolved':'open'}</span></div><div class="em-item-detail">${e.file}:${e.line} · ${e.category}</div></div>`).join('')}</div></div>`;
    else el.innerHTML = `<div id="em-pattern-section"><div class="em-list" id="em-pattern-list">${getPatterns().map(p => `<div class="em-pattern-item" data-id="${p.id}"><div class="em-item-top"><div class="em-item-name">${p.name}</div><span class="em-badge" style="background:${p.status==='active'?'#ef4444':p.status==='mitigated'?'#22c55e':'#f59e0b'}22;color:${p.status==='active'?'#ef4444':p.status==='mitigated'?'#22c55e':'#f59e0b'}">${p.status}</span></div><div class="em-item-detail">${p.occurrences} occurrences · ${p.affectedFiles} files affected</div></div>`).join('')}</div></div>`;
  }
  function saveState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab })); } catch(e){} }
  function loadState() { try { const s=localStorage.getItem(STORAGE_KEY); if(s){const p=JSON.parse(s); state.activeTab=p.activeTab||state.activeTab;} } catch(e){} }

  window.errorMonitoring = {
    getCategories, getCategory, getRecentErrors, getRecentError, getPatterns, getPattern, getStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() { return { activeTab: state.activeTab, categoryCount: getCategories().length, recentCount: getRecentErrors().length, patternCount: getPatterns().length }; },
  };
  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
