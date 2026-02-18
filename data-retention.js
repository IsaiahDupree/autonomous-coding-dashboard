// feat-115: Data Retention Policies
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #data-retention-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .dr-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .dr-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .dr-badge { background: var(--color-primary, #6366f1); color: #fff; font-size: 11px; padding: 3px 10px; border-radius: 20px; }
    .dr-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .dr-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .dr-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .dr-policies { display: flex; flex-direction: column; gap: 10px; }
    .dr-policy { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 9px; padding: 14px; }
    .dr-policy-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .dr-policy-name { font-size: 14px; font-weight: 600; color: var(--color-text, #e0e0e0); display: flex; align-items: center; gap: 8px; }
    .dr-policy-icon { font-size: 16px; }
    .dr-status { font-size: 11px; padding: 3px 9px; border-radius: 4px; font-weight: 600; }
    .dr-status.active { background: rgba(34,197,94,0.15); color: #22c55e; }
    .dr-status.paused { background: rgba(234,179,8,0.15); color: #eab308; }
    .dr-policy-desc { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-bottom: 10px; }
    .dr-policy-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .dr-select { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 6px; color: var(--color-text, #e0e0e0); font-size: 12px; padding: 5px 8px; cursor: pointer; outline: none; }
    .dr-btn { border: none; border-radius: 6px; font-size: 12px; padding: 5px 12px; cursor: pointer; transition: opacity 0.2s; font-weight: 600; }
    .dr-btn-apply { background: var(--color-primary, #6366f1); color: #fff; }
    .dr-btn-pause { background: rgba(234,179,8,0.2); color: #eab308; }
    .dr-btn-archive { background: rgba(99,102,241,0.15); color: var(--color-primary, #6366f1); }
    .dr-btn:hover { opacity: 0.8; }
    .dr-stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
    .dr-stat { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .dr-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .dr-stat-label { font-size: 11px; color: var(--color-text-secondary, #a0a0b0); margin-top: 3px; }
    .dr-archive-list { display: flex; flex-direction: column; gap: 8px; }
    .dr-archive-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; }
    .dr-archive-name { font-size: 13px; color: var(--color-text, #e0e0e0); }
    .dr-archive-meta { font-size: 11px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'data-retention-config';

  const POLICIES = [
    { id: 'pol-logs', icon: '📋', name: 'Log Retention', desc: 'Auto-cleanup old log entries to prevent storage bloat.', category: 'logs', defaultPeriod: '30d', status: 'active' },
    { id: 'pol-sessions', icon: '🕐', name: 'Session History', desc: 'Retain session data for analysis and debugging.', category: 'sessions', defaultPeriod: '90d', status: 'active' },
    { id: 'pol-features', icon: '✅', name: 'Feature Snapshots', desc: 'Keep feature status snapshots for trend analysis.', category: 'features', defaultPeriod: '180d', status: 'active' },
    { id: 'pol-errors', icon: '🚨', name: 'Error Records', desc: 'Retain error logs for debugging and pattern detection.', category: 'errors', defaultPeriod: '14d', status: 'active' },
    { id: 'pol-metrics', icon: '📊', name: 'Performance Metrics', desc: 'Keep performance data for trend reporting.', category: 'metrics', defaultPeriod: '365d', status: 'paused' },
  ];

  const PERIODS = ['7d', '14d', '30d', '60d', '90d', '180d', '365d', 'never'];
  const ARCHIVES = [
    { name: 'session-archive-2026-01.json.gz', size: '2.4 MB', date: '2026-01-31', type: 'sessions' },
    { name: 'logs-archive-2026-01.json.gz', size: '8.1 MB', date: '2026-01-31', type: 'logs' },
    { name: 'features-snapshot-2025-12.json.gz', size: '0.3 MB', date: '2025-12-31', type: 'features' },
    { name: 'errors-archive-2025-12.json.gz', size: '1.2 MB', date: '2025-12-31', type: 'errors' },
  ];

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }
  function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

  let state = loadState();
  let activeTab = 'policies';

  function getPolicyPeriod(id) { return state[id + '_period'] || POLICIES.find(p => p.id === id)?.defaultPeriod || '30d'; }
  function getPolicyStatus(id) { return state[id + '_status'] || POLICIES.find(p => p.id === id)?.status || 'active'; }

  function applyPolicy(id) {
    const sel = document.getElementById('dr-select-' + id);
    if (sel) { state[id + '_period'] = sel.value; saveState(state); renderCard(); }
  }

  function togglePolicy(id) {
    const cur = getPolicyStatus(id);
    state[id + '_status'] = cur === 'active' ? 'paused' : 'active';
    saveState(state); renderCard();
  }

  function archiveNow(id) {
    alert(`Archiving "${id}" data... (simulated). In production, this would compress and store current data.`);
  }

  function setTab(tab) { activeTab = tab; renderCard(); }

  function renderCard() {
    const card = document.getElementById('data-retention-card');
    if (!card) return;

    let content = '';
    if (activeTab === 'policies') {
      content = `<div class="dr-policies">${POLICIES.map(p => {
        const period = getPolicyPeriod(p.id);
        const status = getPolicyStatus(p.id);
        const opts = PERIODS.map(d => `<option value="${d}" ${d === period ? 'selected' : ''}>${d === 'never' ? 'Never delete' : 'Keep ' + d}</option>`).join('');
        return `<div class="dr-policy" id="dr-pol-${p.id}">
          <div class="dr-policy-top">
            <div class="dr-policy-name"><span class="dr-policy-icon">${p.icon}</span>${p.name}</div>
            <span class="dr-status ${status}">${status === 'active' ? '● Active' : '⏸ Paused'}</span>
          </div>
          <div class="dr-policy-desc">${p.desc}</div>
          <div class="dr-policy-row">
            <select class="dr-select" id="dr-select-${p.id}">${opts}</select>
            <button class="dr-btn dr-btn-apply" onclick="window.dataRetention.applyPolicy('${p.id}')">Apply</button>
            <button class="dr-btn dr-btn-pause" onclick="window.dataRetention.togglePolicy('${p.id}')">${status === 'active' ? 'Pause' : 'Resume'}</button>
            <button class="dr-btn dr-btn-archive" onclick="window.dataRetention.archiveNow('${p.id}')">Archive Now</button>
          </div>
        </div>`;
      }).join('')}</div>`;
    } else if (activeTab === 'stats') {
      content = `<div class="dr-stat-row">
        <div class="dr-stat"><div class="dr-stat-val">${POLICIES.filter(p => getPolicyStatus(p.id) === 'active').length}</div><div class="dr-stat-label">Active Policies</div></div>
        <div class="dr-stat"><div class="dr-stat-val">${ARCHIVES.length}</div><div class="dr-stat-label">Archives</div></div>
        <div class="dr-stat"><div class="dr-stat-val">12.0 MB</div><div class="dr-stat-label">Archived Data</div></div>
      </div>`;
    } else {
      content = `<div class="dr-archive-list">${ARCHIVES.map(a => `
        <div class="dr-archive-item">
          <div>
            <div class="dr-archive-name">📦 ${a.name}</div>
            <div class="dr-archive-meta">${a.type} · ${a.date} · ${a.size}</div>
          </div>
          <button class="dr-btn dr-btn-apply" onclick="alert('Download: ${a.name}')">Download</button>
        </div>`).join('')}</div>`;
    }

    card.innerHTML = `
      <div class="dr-header">
        <h3>🗄️ Data Retention Policies</h3>
        <span class="dr-badge">${POLICIES.filter(p => getPolicyStatus(p.id) === 'active').length} Active</span>
      </div>
      <div class="dr-tabs">
        <button class="dr-tab ${activeTab === 'policies' ? 'active' : ''}" onclick="window.dataRetention.setTab('policies')">Policies</button>
        <button class="dr-tab ${activeTab === 'stats' ? 'active' : ''}" onclick="window.dataRetention.setTab('stats')">Statistics</button>
        <button class="dr-tab ${activeTab === 'archives' ? 'active' : ''}" onclick="window.dataRetention.setTab('archives')">Archives</button>
      </div>
      ${content}`;
  }

  function init() {
    const main = document.querySelector('main.container');
    if (!main) return;
    const card = document.createElement('div');
    card.id = 'data-retention-card';
    main.insertBefore(card, main.firstChild);
    renderCard();
  }

  window.dataRetention = {
    applyPolicy,
    togglePolicy,
    archiveNow,
    setTab,
    getPolicies: () => POLICIES.map(p => ({ ...p, period: getPolicyPeriod(p.id), status: getPolicyStatus(p.id) })),
    getPolicy: (id) => { const p = POLICIES.find(x => x.id === id); return p ? { ...p, period: getPolicyPeriod(id), status: getPolicyStatus(id) } : null; },
    getArchives: () => [...ARCHIVES],
    getState: () => ({ activePolicies: POLICIES.filter(p => getPolicyStatus(p.id) === 'active').length, archiveCount: ARCHIVES.length }),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
