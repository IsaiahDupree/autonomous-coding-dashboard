// feat-117: Data Import from Other Tools (Jira, Linear, field mapping)
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #data-import-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .di-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .di-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .di-badge { background: var(--color-primary, #6366f1); color: #fff; font-size: 11px; padding: 3px 10px; border-radius: 20px; }
    .di-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .di-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .di-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .di-source-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-bottom: 14px; }
    .di-source { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 10px; padding: 16px; cursor: pointer; transition: border-color 0.2s, background 0.2s; text-align: center; }
    .di-source:hover { border-color: var(--color-primary, #6366f1); background: rgba(99,102,241,0.07); }
    .di-source.selected { border-color: var(--color-primary, #6366f1); background: rgba(99,102,241,0.12); }
    .di-source-icon { font-size: 28px; margin-bottom: 8px; }
    .di-source-name { font-size: 14px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .di-source-desc { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .di-form { display: flex; flex-direction: column; gap: 12px; }
    .di-form-group { display: flex; flex-direction: column; gap: 4px; }
    .di-label { font-size: 12px; font-weight: 600; color: var(--color-text-secondary, #a0a0b0); }
    .di-input { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 7px; padding: 9px 12px; font-size: 13px; color: var(--color-text, #e0e0e0); outline: none; transition: border-color 0.2s; }
    .di-input:focus { border-color: var(--color-primary, #6366f1); }
    .di-mapping-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: center; margin-bottom: 8px; }
    .di-mapping-from { font-size: 12px; background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 6px; padding: 7px 10px; color: var(--color-text, #e0e0e0); }
    .di-mapping-arrow { font-size: 14px; color: var(--color-text-secondary, #a0a0b0); text-align: center; }
    .di-mapping-to { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 6px; padding: 5px 8px; font-size: 12px; color: var(--color-text, #e0e0e0); outline: none; cursor: pointer; }
    .di-btn-row { display: flex; gap: 10px; }
    .di-btn { border: none; border-radius: 7px; font-size: 13px; font-weight: 600; padding: 9px 18px; cursor: pointer; transition: opacity 0.2s; }
    .di-btn-primary { background: var(--color-primary, #6366f1); color: #fff; }
    .di-btn-secondary { background: var(--color-border, #2e2e3e); color: var(--color-text, #e0e0e0); }
    .di-btn:hover { opacity: 0.8; }
    .di-history { display: flex; flex-direction: column; gap: 8px; }
    .di-hist-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; }
    .di-hist-info { }
    .di-hist-name { font-size: 13px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .di-hist-meta { font-size: 11px; color: var(--color-text-secondary, #a0a0b0); margin-top: 2px; }
    .di-hist-status { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .di-hist-status.success { background: rgba(34,197,94,0.15); color: #22c55e; }
    .di-hist-status.error { background: rgba(239,68,68,0.15); color: #ef4444; }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'data-import-config';

  const SOURCES = [
    { id: 'jira', icon: '🔷', name: 'Jira', desc: 'Import issues, epics, and sprints from Jira Cloud.' },
    { id: 'linear', icon: '📐', name: 'Linear', desc: 'Import issues, projects, and cycles from Linear.' },
    { id: 'github', icon: '🐙', name: 'GitHub Issues', desc: 'Import GitHub issues and project board items.' },
    { id: 'notion', icon: '📝', name: 'Notion', desc: 'Import tasks and databases from Notion pages.' },
    { id: 'csv', icon: '📊', name: 'CSV File', desc: 'Import any structured data from a CSV file.' },
    { id: 'json', icon: '🗃️', name: 'JSON File', desc: 'Import feature data from a JSON file.' },
  ];

  const FIELD_MAPPINGS = {
    jira: [
      { from: 'summary', to: 'description' }, { from: 'priority', to: 'priority' },
      { from: 'status.name', to: 'status' }, { from: 'assignee.displayName', to: 'assignee' },
      { from: 'issuetype.name', to: 'category' },
    ],
    linear: [
      { from: 'title', to: 'description' }, { from: 'priority', to: 'priority' },
      { from: 'state.name', to: 'status' }, { from: 'assignee.name', to: 'assignee' },
      { from: 'label', to: 'category' },
    ],
    github: [
      { from: 'title', to: 'description' }, { from: 'milestone.title', to: 'category' },
      { from: 'state', to: 'status' }, { from: 'assignees[0].login', to: 'assignee' },
      { from: 'labels[0].name', to: 'priority' },
    ],
    csv: [{ from: 'Name', to: 'description' }, { from: 'Priority', to: 'priority' }, { from: 'Status', to: 'status' }],
    json: [{ from: 'name', to: 'description' }, { from: 'priority', to: 'priority' }],
    notion: [{ from: 'Name', to: 'description' }, { from: 'Status', to: 'status' }, { from: 'Priority', to: 'priority' }],
  };

  const ACD_FIELDS = ['description', 'priority', 'status', 'assignee', 'category', 'passes', 'id'];

  const HISTORY = [
    { source: 'Jira', items: 24, date: '2026-02-15T10:30:00Z', status: 'success', mapped: 5 },
    { source: 'Linear', items: 18, date: '2026-02-10T14:20:00Z', status: 'success', mapped: 4 },
    { source: 'CSV File', items: 50, date: '2026-02-05T09:00:00Z', status: 'error', mapped: 0 },
  ];

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }
  function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

  let state = loadState();
  let activeTab = 'sources';
  let selectedSource = state.selectedSource || null;

  function selectSource(id) {
    selectedSource = id;
    state.selectedSource = id;
    saveState(state);
    renderCard();
  }

  function setTab(tab) { activeTab = tab; renderCard(); }

  function runImport() {
    if (!selectedSource) { alert('Please select a data source first.'); return; }
    const cfg = { source: selectedSource, token: document.getElementById('di-token-input')?.value, project: document.getElementById('di-project-input')?.value };
    state.lastImport = { ...cfg, date: new Date().toISOString() };
    saveState(state);
    alert(`Simulating import from ${selectedSource.toUpperCase()}...\n\nIn production, this would:\n1. Connect to ${selectedSource} API using your token\n2. Fetch issues/tasks\n3. Apply field mappings\n4. Add to feature_list.json`);
  }

  function renderCard() {
    const card = document.getElementById('data-import-card');
    if (!card) return;

    let content = '';
    if (activeTab === 'sources') {
      const grid = SOURCES.map(s => `
        <div class="di-source ${selectedSource === s.id ? 'selected' : ''}" onclick="window.dataImport.selectSource('${s.id}')">
          <div class="di-source-icon">${s.icon}</div>
          <div class="di-source-name">${s.name}</div>
          <div class="di-source-desc">${s.desc}</div>
        </div>`).join('');
      content = `<div class="di-source-grid">${grid}</div>
        ${selectedSource ? `<div style="background:rgba(99,102,241,0.08);border:1px solid var(--color-primary,#6366f1);border-radius:8px;padding:12px;font-size:13px;color:var(--color-text,#e0e0e0)">
          ✓ Selected: <strong>${SOURCES.find(s => s.id === selectedSource)?.name}</strong> — go to <em>Connect</em> tab to configure.
        </div>` : ''}`;
    } else if (activeTab === 'connect') {
      const src = SOURCES.find(s => s.id === selectedSource);
      if (!src) {
        content = `<div style="text-align:center;padding:20px;color:var(--color-text-secondary,#a0a0b0)">Please select a data source first.</div>`;
      } else {
        const showToken = !['csv', 'json'].includes(selectedSource);
        content = `<div class="di-form">
          <div class="di-form-group"><div class="di-label">${src.name} ${showToken ? 'API Token' : 'File'}</div>
            ${showToken ? `<input class="di-input" id="di-token-input" type="password" placeholder="Enter your ${src.name} API token..." value="${state.token || ''}">` :
              `<input class="di-input" type="file" id="di-token-input">`}
          </div>
          ${showToken ? `<div class="di-form-group"><div class="di-label">Project / Organization</div>
            <input class="di-input" id="di-project-input" placeholder="e.g. my-company or project-key" value="${state.project || ''}">
          </div>` : ''}
          <div class="di-btn-row">
            <button class="di-btn di-btn-primary" onclick="window.dataImport.runImport()">▶ Start Import</button>
            <button class="di-btn di-btn-secondary" onclick="window.dataImport.setTab('map')">Configure Mapping →</button>
          </div>
        </div>`;
      }
    } else if (activeTab === 'map') {
      const mappings = FIELD_MAPPINGS[selectedSource] || FIELD_MAPPINGS.csv;
      const rows = mappings.map(m => {
        const opts = ACD_FIELDS.map(f => `<option value="${f}" ${f === m.to ? 'selected' : ''}>${f}</option>`).join('');
        return `<div class="di-mapping-grid">
          <div class="di-mapping-from">${m.from}</div>
          <div class="di-mapping-arrow">→</div>
          <select class="di-mapping-to">${opts}</select>
        </div>`;
      }).join('');
      content = `<div style="margin-bottom:10px;font-size:12px;color:var(--color-text-secondary,#a0a0b0)">Map source fields to ACD feature fields:</div>
        ${rows}
        <div class="di-btn-row" style="margin-top:10px">
          <button class="di-btn di-btn-primary" onclick="window.dataImport.runImport()">Apply & Import</button>
        </div>`;
    } else {
      const rows = HISTORY.map(h => `
        <div class="di-hist-item">
          <div class="di-hist-info">
            <div class="di-hist-name">${h.source}</div>
            <div class="di-hist-meta">${new Date(h.date).toLocaleDateString()} · ${h.items} items · ${h.mapped} fields mapped</div>
          </div>
          <span class="di-hist-status ${h.status}">${h.status === 'success' ? '✓ Success' : '✗ Failed'}</span>
        </div>`).join('');
      content = `<div class="di-history">${rows}</div>`;
    }

    card.innerHTML = `
      <div class="di-header">
        <h3>📥 Data Import</h3>
        <span class="di-badge">${SOURCES.length} Sources</span>
      </div>
      <div class="di-tabs">
        <button class="di-tab ${activeTab === 'sources' ? 'active' : ''}" onclick="window.dataImport.setTab('sources')">Sources</button>
        <button class="di-tab ${activeTab === 'connect' ? 'active' : ''}" onclick="window.dataImport.setTab('connect')">Connect</button>
        <button class="di-tab ${activeTab === 'map' ? 'active' : ''}" onclick="window.dataImport.setTab('map')">Map Fields</button>
        <button class="di-tab ${activeTab === 'history' ? 'active' : ''}" onclick="window.dataImport.setTab('history')">History</button>
      </div>
      ${content}`;
  }

  function init() {
    const main = document.querySelector('main.container');
    if (!main) return;
    const card = document.createElement('div');
    card.id = 'data-import-card';
    main.insertBefore(card, main.firstChild);
    renderCard();
  }

  window.dataImport = {
    selectSource,
    setTab,
    runImport,
    getSources: () => [...SOURCES],
    getSource: (id) => SOURCES.find(s => s.id === id) || null,
    getHistory: () => [...HISTORY],
    getFieldMappings: (src) => FIELD_MAPPINGS[src] || [],
    getState: () => ({ selectedSource, sources: SOURCES.length, historyCount: HISTORY.length }),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
