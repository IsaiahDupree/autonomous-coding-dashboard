// feat-089: Feature List Versioning
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #feature-versioning-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .fv-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .fv-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .fv-tabs {
      display: flex; gap: 4px; margin-bottom: 16px;
      background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px;
    }
    .fv-tab {
      flex: 1; padding: 6px 12px; border: none; background: transparent;
      color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px;
      font-size: 13px; transition: all 0.2s;
    }
    .fv-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .fv-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .fv-stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .fv-stat-card {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px; text-align: center;
    }
    .fv-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .fv-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .fv-list { display: flex; flex-direction: column; gap: 8px; }
    .fv-change-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .fv-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .fv-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .fv-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .fv-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .fv-version-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .fv-version-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .fv-version-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .fv-version-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .fv-diff-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .fv-diff-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .fv-diff-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .fv-diff-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .fv-diff-added { color: #22c55e; }
    .fv-diff-removed { color: #ef4444; }
    .fv-diff-modified { color: #f59e0b; }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'feature-versioning-config';

  let state = {
    activeTab: 'changes',
    versions: [],
    changes: [],
  };

  function generateVersions() {
    return [
      { id: 'v-001', version: '1.0.0', timestamp: new Date(Date.now() - 30 * 86400000).toISOString(), author: 'system', description: 'Initial feature list', featureCount: 120, changeCount: 120 },
      { id: 'v-002', version: '1.1.0', timestamp: new Date(Date.now() - 25 * 86400000).toISOString(), author: 'admin', description: 'Updated priorities for core features', featureCount: 120, changeCount: 8 },
      { id: 'v-003', version: '1.2.0', timestamp: new Date(Date.now() - 20 * 86400000).toISOString(), author: 'agent-001', description: 'Marked features 001-020 as passing', featureCount: 120, changeCount: 20 },
      { id: 'v-004', version: '1.3.0', timestamp: new Date(Date.now() - 15 * 86400000).toISOString(), author: 'agent-002', description: 'Completed testing features 021-050', featureCount: 120, changeCount: 30 },
      { id: 'v-005', version: '1.4.0', timestamp: new Date(Date.now() - 10 * 86400000).toISOString(), author: 'agent-003', description: 'Updated acceptance criteria', featureCount: 120, changeCount: 12 },
      { id: 'v-006', version: '1.5.0', timestamp: new Date(Date.now() - 5 * 86400000).toISOString(), author: 'agent-004', description: 'Added new feature categories', featureCount: 120, changeCount: 15 },
      { id: 'v-007', version: '2.0.0', timestamp: new Date(Date.now() - 86400000).toISOString(), author: 'admin', description: 'Major restructure of feature priorities', featureCount: 120, changeCount: 45 },
      { id: 'v-008', version: '2.1.0', timestamp: new Date().toISOString(), author: 'agent-005', description: 'Current version - latest updates', featureCount: 120, changeCount: 5, current: true },
    ];
  }

  function generateChanges() {
    return [
      { id: 'ch-001', featureId: 'feat-085', field: 'passes', oldValue: false, newValue: true, timestamp: new Date(Date.now() - 3600000).toISOString(), author: 'agent-005', version: '2.1.0', type: 'status_change' },
      { id: 'ch-002', featureId: 'feat-084', field: 'passes', oldValue: false, newValue: true, timestamp: new Date(Date.now() - 7200000).toISOString(), author: 'agent-005', version: '2.1.0', type: 'status_change' },
      { id: 'ch-003', featureId: 'feat-050', field: 'priority', oldValue: 20, newValue: 15, timestamp: new Date(Date.now() - 86400000).toISOString(), author: 'admin', version: '2.0.0', type: 'priority_change' },
      { id: 'ch-004', featureId: 'feat-030', field: 'description', oldValue: 'Old description', newValue: 'Updated description text', timestamp: new Date(Date.now() - 172800000).toISOString(), author: 'admin', version: '2.0.0', type: 'description_change' },
      { id: 'ch-005', featureId: 'feat-045', field: 'acceptance_criteria', oldValue: ['Criteria A'], newValue: ['Criteria A', 'Criteria B'], timestamp: new Date(Date.now() - 259200000).toISOString(), author: 'admin', version: '2.0.0', type: 'criteria_change' },
      { id: 'ch-006', featureId: 'feat-070', field: 'category', oldValue: 'misc', newValue: 'integration', timestamp: new Date(Date.now() - 345600000).toISOString(), author: 'admin', version: '1.5.0', type: 'category_change' },
      { id: 'ch-007', featureId: 'feat-020', field: 'passes', oldValue: false, newValue: true, timestamp: new Date(Date.now() - 432000000).toISOString(), author: 'agent-003', version: '1.3.0', type: 'status_change' },
      { id: 'ch-008', featureId: 'feat-015', field: 'passes', oldValue: true, newValue: false, timestamp: new Date(Date.now() - 518400000).toISOString(), author: 'agent-002', version: '1.3.0', type: 'status_change' },
      { id: 'ch-009', featureId: 'feat-010', field: 'priority', oldValue: 5, newValue: 3, timestamp: new Date(Date.now() - 604800000).toISOString(), author: 'admin', version: '1.2.0', type: 'priority_change' },
      { id: 'ch-010', featureId: 'feat-001', field: 'passes', oldValue: false, newValue: true, timestamp: new Date(Date.now() - 2592000000).toISOString(), author: 'agent-001', version: '1.0.0', type: 'status_change' },
    ];
  }

  function initState() {
    if (state.versions.length === 0) state.versions = generateVersions();
    if (state.changes.length === 0) state.changes = generateChanges();
  }

  // ── API ────────────────────────────────────────────────────────
  function getChanges(filter) {
    initState();
    let list = [...state.changes];
    if (filter?.featureId) list = list.filter(c => c.featureId === filter.featureId);
    if (filter?.type) list = list.filter(c => c.type === filter.type);
    if (filter?.version) list = list.filter(c => c.version === filter.version);
    if (filter?.author) list = list.filter(c => c.author === filter.author);
    return list;
  }

  function getChange(id) {
    initState();
    return state.changes.find(c => c.id === id) || null;
  }

  function trackChange(featureId, field, oldValue, newValue) {
    initState();
    const id = 'ch-' + String(state.changes.length + 1).padStart(3, '0');
    const change = {
      id, featureId, field, oldValue, newValue,
      timestamp: new Date().toISOString(),
      author: 'current-user',
      version: state.versions.find(v => v.current)?.version || '2.1.0',
      type: field + '_change',
    };
    state.changes.unshift(change);
    saveState();
    render();
    return id;
  }

  function getVersions() {
    initState();
    return [...state.versions];
  }

  function getVersion(id) {
    initState();
    return state.versions.find(v => v.id === id) || null;
  }

  function rollback(versionId) {
    initState();
    const version = state.versions.find(v => v.id === versionId);
    if (!version) return null;
    const currentIdx = state.versions.findIndex(v => v.current);
    const targetIdx = state.versions.findIndex(v => v.id === versionId);
    if (targetIdx >= currentIdx) return null;

    // Count changes that would be rolled back
    const rolledBackChanges = state.changes.filter(c => {
      const changeTime = new Date(c.timestamp).getTime();
      const targetTime = new Date(version.timestamp).getTime();
      return changeTime > targetTime;
    });

    // Mark new current
    state.versions.forEach(v => v.current = false);
    version.current = true;

    saveState();
    render();
    return {
      success: true,
      rolledBackTo: version.version,
      rolledBackAt: new Date().toISOString(),
      changesReverted: rolledBackChanges.length,
      previousVersion: state.versions[currentIdx]?.version,
    };
  }

  function diffVersions(versionId1, versionId2) {
    initState();
    const v1 = state.versions.find(v => v.id === versionId1);
    const v2 = state.versions.find(v => v.id === versionId2);
    if (!v1 || !v2) return null;

    const t1 = new Date(v1.timestamp).getTime();
    const t2 = new Date(v2.timestamp).getTime();
    const startTime = Math.min(t1, t2);
    const endTime = Math.max(t1, t2);

    const changesBetween = state.changes.filter(c => {
      const ct = new Date(c.timestamp).getTime();
      return ct >= startTime && ct <= endTime;
    });

    const added = changesBetween.filter(c => c.type === 'status_change' && c.newValue === true).length;
    const removed = changesBetween.filter(c => c.type === 'status_change' && c.newValue === false).length;
    const modified = changesBetween.filter(c => c.type !== 'status_change').length;

    return {
      fromVersion: v1.version,
      toVersion: v2.version,
      totalChanges: changesBetween.length,
      changes: changesBetween,
      summary: { added, removed, modified },
    };
  }

  function getChangeTypes() {
    return [
      { id: 'status_change', label: 'Status Change', count: state.changes.filter(c => c.type === 'status_change').length },
      { id: 'priority_change', label: 'Priority Change', count: state.changes.filter(c => c.type === 'priority_change').length },
      { id: 'description_change', label: 'Description Change', count: state.changes.filter(c => c.type === 'description_change').length },
      { id: 'criteria_change', label: 'Criteria Change', count: state.changes.filter(c => c.type === 'criteria_change').length },
      { id: 'category_change', label: 'Category Change', count: state.changes.filter(c => c.type === 'category_change').length },
    ];
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('feature-versioning-widget');
    if (!container) return;
    initState();
    const currentVer = state.versions.find(v => v.current);

    container.innerHTML = `
      <div id="feature-versioning-card">
        <div class="fv-header"><h3>Feature List Versioning</h3></div>
        <div class="fv-stats-row">
          <div class="fv-stat-card"><div class="fv-stat-val">${state.versions.length}</div><div class="fv-stat-label">Versions</div></div>
          <div class="fv-stat-card"><div class="fv-stat-val">${state.changes.length}</div><div class="fv-stat-label">Changes</div></div>
          <div class="fv-stat-card"><div class="fv-stat-val">v${currentVer?.version || '?'}</div><div class="fv-stat-label">Current</div></div>
          <div class="fv-stat-card"><div class="fv-stat-val">${getChangeTypes().length}</div><div class="fv-stat-label">Change Types</div></div>
        </div>
        <div class="fv-tabs">
          <button class="fv-tab ${state.activeTab === 'changes' ? 'active' : ''}" data-tab="changes">Changes</button>
          <button class="fv-tab ${state.activeTab === 'versions' ? 'active' : ''}" data-tab="versions">Versions</button>
          <button class="fv-tab ${state.activeTab === 'diff' ? 'active' : ''}" data-tab="diff">Diff</button>
        </div>
        <div id="fv-content"></div>
      </div>
    `;

    container.querySelectorAll('.fv-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('fv-content');
    if (!el) return;
    if (state.activeTab === 'changes') renderChanges(el);
    else if (state.activeTab === 'versions') renderVersions(el);
    else renderDiff(el);
  }

  function renderChanges(el) {
    const changes = getChanges();
    const typeColors = { status_change: '#22c55e', priority_change: '#f59e0b', description_change: '#6366f1', criteria_change: '#8b5cf6', category_change: '#06b6d4' };
    el.innerHTML = `
      <div class="fv-list" id="fv-change-list">
        ${changes.map(c => `
          <div class="fv-change-item" data-id="${c.id}">
            <div class="fv-item-top">
              <div class="fv-item-name">${c.featureId}: ${c.field}</div>
              <span class="fv-badge" style="background:${typeColors[c.type] || '#6b7280'}22;color:${typeColors[c.type] || '#6b7280'}">${c.type.replace('_', ' ')}</span>
            </div>
            <div class="fv-item-detail">${JSON.stringify(c.oldValue)} → ${JSON.stringify(c.newValue)} · by ${c.author} · v${c.version} · ${new Date(c.timestamp).toLocaleString()}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderVersions(el) {
    const versions = getVersions();
    el.innerHTML = `
      <div class="fv-list" id="fv-version-list">
        ${versions.map(v => `
          <div class="fv-version-item" data-id="${v.id}">
            <div class="fv-version-top">
              <div class="fv-version-name">v${v.version}${v.current ? ' (Current)' : ''}</div>
              <span class="fv-badge" style="background:${v.current ? '#22c55e' : '#6366f1'}22;color:${v.current ? '#22c55e' : '#6366f1'}">${v.changeCount} changes</span>
            </div>
            <div class="fv-version-detail">${v.description} · by ${v.author} · ${new Date(v.timestamp).toLocaleDateString()}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderDiff(el) {
    const versions = getVersions();
    if (versions.length < 2) { el.innerHTML = '<p>Need at least 2 versions to diff</p>'; return; }
    const diff = diffVersions(versions[versions.length - 2].id, versions[versions.length - 1].id);
    el.innerHTML = `
      <div id="fv-diff-section">
        <div class="fv-list" id="fv-diff-list">
          <div class="fv-diff-item">
            <div class="fv-diff-top">
              <div class="fv-diff-name">v${diff.fromVersion} → v${diff.toVersion}</div>
              <span class="fv-badge" style="background:#6366f122;color:#6366f1">${diff.totalChanges} changes</span>
            </div>
            <div class="fv-diff-detail">
              <span class="fv-diff-added">+${diff.summary.added} added</span> ·
              <span class="fv-diff-removed">-${diff.summary.removed} removed</span> ·
              <span class="fv-diff-modified">~${diff.summary.modified} modified</span>
            </div>
          </div>
          ${diff.changes.map(c => `
            <div class="fv-diff-item" data-change="${c.id}">
              <div class="fv-diff-top">
                <div class="fv-diff-name">${c.featureId}</div>
                <span class="fv-badge" style="background:#f59e0b22;color:#f59e0b">${c.field}</span>
              </div>
              <div class="fv-diff-detail"><span class="fv-diff-removed">${JSON.stringify(c.oldValue)}</span> → <span class="fv-diff-added">${JSON.stringify(c.newValue)}</span></div>
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

  window.featureVersioning = {
    getChanges, getChange, trackChange, getVersions, getVersion,
    rollback, diffVersions, getChangeTypes,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      initState();
      return {
        activeTab: state.activeTab,
        versionCount: state.versions.length,
        changeCount: state.changes.length,
        currentVersion: state.versions.find(v => v.current)?.version,
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
