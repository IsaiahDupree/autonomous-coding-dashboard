// feat-107: Custom Validation Rules
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #validation-rules-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .vr-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .vr-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .vr-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .vr-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .vr-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .vr-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .vr-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .vr-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .vr-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .vr-list { display: flex; flex-direction: column; gap: 8px; }
    .vr-rule-item, .vr-set-item, .vr-result-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .vr-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .vr-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .vr-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .vr-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);
  const STORAGE_KEY = 'validation-rules-config';
  let state = { activeTab: 'rules' };

  function getRules() {
    return [
      { id: 'rule-001', name: 'No Console Logs', pattern: 'console\\.log', severity: 'warning', enabled: true, description: 'Disallow console.log in production code', matchCount: 12 },
      { id: 'rule-002', name: 'Type Safety', pattern: '===|!==', severity: 'error', enabled: true, description: 'Enforce strict equality operators', matchCount: 245 },
      { id: 'rule-003', name: 'No TODO Comments', pattern: '\\/\\/ TODO', severity: 'info', enabled: true, description: 'Flag remaining TODO comments', matchCount: 8 },
      { id: 'rule-004', name: 'Error Handling', pattern: 'try\\s*\\{', severity: 'error', enabled: true, description: 'Require try-catch for async operations', matchCount: 34 },
      { id: 'rule-005', name: 'Max Line Length', pattern: '.{120,}', severity: 'warning', enabled: false, description: 'Lines should not exceed 120 characters', matchCount: 67 },
      { id: 'rule-006', name: 'No Magic Numbers', pattern: '[^0-9]\\d{2,}[^0-9]', severity: 'info', enabled: true, description: 'Avoid hard-coded numeric values', matchCount: 23 },
      { id: 'rule-007', name: 'Accessibility Check', pattern: 'aria-|role=', severity: 'warning', enabled: true, description: 'Ensure ARIA attributes are present', matchCount: 89 },
      { id: 'rule-008', name: 'Security Headers', pattern: 'X-Frame-Options|CSP', severity: 'error', enabled: true, description: 'Verify security headers are set', matchCount: 5 },
    ];
  }
  function getRule(id) { return getRules().find(r => r.id === id) || null; }
  function getEnabledRules() { return getRules().filter(r => r.enabled); }

  function getRuleSets() {
    return [
      { id: 'set-001', name: 'Production Ready', rules: ['rule-001', 'rule-002', 'rule-004', 'rule-008'], description: 'Rules for production deployment', active: true },
      { id: 'set-002', name: 'Code Quality', rules: ['rule-002', 'rule-003', 'rule-005', 'rule-006'], description: 'Code quality and maintainability', active: true },
      { id: 'set-003', name: 'Accessibility', rules: ['rule-007'], description: 'Web accessibility standards', active: false },
      { id: 'set-004', name: 'Security Audit', rules: ['rule-004', 'rule-008'], description: 'Security-focused validation', active: true },
      { id: 'set-005', name: 'Full Scan', rules: ['rule-001', 'rule-002', 'rule-003', 'rule-004', 'rule-005', 'rule-006', 'rule-007', 'rule-008'], description: 'All rules enabled', active: false },
    ];
  }
  function getRuleSet(id) { return getRuleSets().find(s => s.id === id) || null; }

  function getResults() {
    return [
      { id: 'res-001', ruleId: 'rule-001', status: 'pass', file: 'app.js', line: null, message: 'No console.log statements found', timestamp: '2026-02-06T01:00:00Z' },
      { id: 'res-002', ruleId: 'rule-002', status: 'fail', file: 'mock-data.js', line: 45, message: 'Loose equality operator used', timestamp: '2026-02-06T01:00:05Z' },
      { id: 'res-003', ruleId: 'rule-004', status: 'pass', file: 'harness-client.js', line: null, message: 'All async ops have error handling', timestamp: '2026-02-06T01:00:10Z' },
      { id: 'res-004', ruleId: 'rule-007', status: 'fail', file: 'index.html', line: 128, message: 'Missing aria-label on button', timestamp: '2026-02-06T01:00:15Z' },
    ];
  }
  function getResult(id) { return getResults().find(r => r.id === id) || null; }

  function getStats() {
    const rules = getRules();
    const results = getResults();
    return { totalRules: rules.length, enabledRules: getEnabledRules().length, totalSets: getRuleSets().length, passRate: Math.round((results.filter(r => r.status === 'pass').length / results.length) * 100) + '%' };
  }

  function render() {
    const container = document.getElementById('validation-rules-widget');
    if (!container) return;
    const stats = getStats();
    container.innerHTML = `
      <div id="validation-rules-card">
        <div class="vr-header"><h3>Custom Validation Rules</h3></div>
        <div class="vr-stats-row">
          <div class="vr-stat-card"><div class="vr-stat-val">${stats.totalRules}</div><div class="vr-stat-label">Rules</div></div>
          <div class="vr-stat-card"><div class="vr-stat-val">${stats.enabledRules}</div><div class="vr-stat-label">Enabled</div></div>
          <div class="vr-stat-card"><div class="vr-stat-val">${stats.totalSets}</div><div class="vr-stat-label">Rule Sets</div></div>
          <div class="vr-stat-card"><div class="vr-stat-val">${stats.passRate}</div><div class="vr-stat-label">Pass Rate</div></div>
        </div>
        <div class="vr-tabs">
          <button class="vr-tab ${state.activeTab === 'rules' ? 'active' : ''}" data-tab="rules">Rules</button>
          <button class="vr-tab ${state.activeTab === 'sets' ? 'active' : ''}" data-tab="sets">Sets</button>
          <button class="vr-tab ${state.activeTab === 'results' ? 'active' : ''}" data-tab="results">Results</button>
        </div>
        <div id="vr-content"></div>
      </div>`;
    container.querySelectorAll('.vr-tab').forEach(btn => { btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); }); });
    renderContent();
  }
  function renderContent() {
    const el = document.getElementById('vr-content');
    if (!el) return;
    const sevColor = s => s === 'error' ? '#ef4444' : s === 'warning' ? '#f59e0b' : '#3b82f6';
    if (state.activeTab === 'rules') el.innerHTML = `<div class="vr-list" id="vr-rule-list">${getRules().map(r => `<div class="vr-rule-item" data-id="${r.id}"><div class="vr-item-top"><div class="vr-item-name">${r.name}</div><span class="vr-badge" style="background:${sevColor(r.severity)}22;color:${sevColor(r.severity)}">${r.severity}</span></div><div class="vr-item-detail">${r.enabled ? 'Enabled' : 'Disabled'} · Pattern: ${r.pattern} · ${r.matchCount} matches</div></div>`).join('')}</div>`;
    else if (state.activeTab === 'sets') el.innerHTML = `<div id="vr-set-section"><div class="vr-list" id="vr-set-list">${getRuleSets().map(s => `<div class="vr-set-item" data-id="${s.id}"><div class="vr-item-top"><div class="vr-item-name">${s.name}</div><span class="vr-badge" style="background:${s.active?'#22c55e':'#6b7280'}22;color:${s.active?'#22c55e':'#6b7280'}">${s.active?'active':'inactive'}</span></div><div class="vr-item-detail">${s.description} · ${s.rules.length} rules</div></div>`).join('')}</div></div>`;
    else el.innerHTML = `<div id="vr-result-section"><div class="vr-list" id="vr-result-list">${getResults().map(r => `<div class="vr-result-item" data-id="${r.id}"><div class="vr-item-top"><div class="vr-item-name">${r.ruleId} - ${r.file}${r.line ? ':' + r.line : ''}</div><span class="vr-badge" style="background:${r.status==='pass'?'#22c55e':'#ef4444'}22;color:${r.status==='pass'?'#22c55e':'#ef4444'}">${r.status}</span></div><div class="vr-item-detail">${r.message}</div></div>`).join('')}</div></div>`;
  }
  function saveState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab })); } catch(e){} }
  function loadState() { try { const s=localStorage.getItem(STORAGE_KEY); if(s){const p=JSON.parse(s); state.activeTab=p.activeTab||state.activeTab;} } catch(e){} }

  window.validationRules = {
    getRules, getRule, getEnabledRules, getRuleSets, getRuleSet, getResults, getResult, getStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() { return { activeTab: state.activeTab, ruleCount: getRules().length, enabledCount: getEnabledRules().length, setCount: getRuleSets().length, resultCount: getResults().length }; },
  };
  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
