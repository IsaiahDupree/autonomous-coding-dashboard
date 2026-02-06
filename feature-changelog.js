// feat-097: Feature Changelog Generation
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #changelog-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .cl-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .cl-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .cl-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .cl-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .cl-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .cl-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .cl-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .cl-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .cl-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .cl-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .cl-list { display: flex; flex-direction: column; gap: 8px; }
    .cl-entry-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .cl-entry-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .cl-entry-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .cl-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .cl-entry-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .cl-release-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .cl-release-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .cl-release-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .cl-release-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .cl-breaking-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; border-left: 3px solid #ef4444; }
    .cl-breaking-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .cl-breaking-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .cl-breaking-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'changelog-config';
  let state = { activeTab: 'entries' };

  function getEntries() {
    return [
      { id: 'cl-001', version: '2.1.0', type: 'added', title: 'Natural Language Feature Search', description: 'Search features using natural language queries with relevance scoring', featureId: 'feat-095', date: '2025-01-15', author: 'claude' },
      { id: 'cl-002', version: '2.1.0', type: 'added', title: 'Code Quality Analysis Dashboard', description: 'Analyze code quality with scoring, improvements, and trend tracking', featureId: 'feat-094', date: '2025-01-14', author: 'claude' },
      { id: 'cl-003', version: '2.0.0', type: 'added', title: 'AI-Powered Error Diagnosis', description: 'Automatic error analysis with root cause detection and fix suggestions', featureId: 'feat-092', date: '2025-01-12', author: 'claude' },
      { id: 'cl-004', version: '2.0.0', type: 'changed', title: 'Mobile Responsive Redesign', description: 'Complete responsive overhaul with breakpoint system and touch controls', featureId: 'feat-090', date: '2025-01-10', author: 'claude' },
      { id: 'cl-005', version: '2.0.0', type: 'added', title: 'Database Query Optimizer', description: 'Automatic query optimization with execution plan analysis', featureId: 'feat-085', date: '2025-01-08', author: 'claude' },
      { id: 'cl-006', version: '1.5.0', type: 'fixed', title: 'Memory Leak in WebSocket Handler', description: 'Fixed memory leak causing gradual performance degradation', featureId: null, date: '2025-01-05', author: 'claude' },
      { id: 'cl-007', version: '1.5.0', type: 'changed', title: 'Configuration Export Format', description: 'Updated export format to support versioned configurations', featureId: 'feat-088', date: '2025-01-03', author: 'claude' },
      { id: 'cl-008', version: '1.5.0', type: 'deprecated', title: 'Legacy REST Endpoints', description: 'Old /v1 API endpoints deprecated in favor of /api routes', featureId: null, date: '2025-01-01', author: 'claude' },
      { id: 'cl-009', version: '1.0.0', type: 'added', title: 'Initial Dashboard Release', description: 'Core dashboard with feature tracking, progress monitoring, and agent control', featureId: 'feat-001', date: '2024-12-20', author: 'team' },
      { id: 'cl-010', version: '1.0.0', type: 'added', title: 'Webhook Integration System', description: 'Register webhooks for feature pass/fail events', featureId: 'feat-082', date: '2024-12-18', author: 'team' },
    ];
  }

  function getEntry(id) {
    return getEntries().find(e => e.id === id) || null;
  }

  function getEntriesByVersion(version) {
    return getEntries().filter(e => e.version === version);
  }

  function getEntriesByType(type) {
    return getEntries().filter(e => e.type === type);
  }

  function getReleases() {
    return [
      { version: '2.1.0', date: '2025-01-15', title: 'AI & Search Update', entryCount: 2, highlights: ['Natural language search', 'Code quality analysis'], status: 'latest' },
      { version: '2.0.0', date: '2025-01-12', title: 'Major Platform Update', entryCount: 3, highlights: ['AI error diagnosis', 'Mobile responsive', 'DB optimizer'], status: 'stable' },
      { version: '1.5.0', date: '2025-01-05', title: 'Stability & Config Update', entryCount: 3, highlights: ['Memory leak fix', 'Config export update', 'Legacy deprecation'], status: 'stable' },
      { version: '1.0.0', date: '2024-12-20', title: 'Initial Release', entryCount: 2, highlights: ['Core dashboard', 'Webhook integration'], status: 'stable' },
    ];
  }

  function getRelease(version) {
    return getReleases().find(r => r.version === version) || null;
  }

  function getBreakingChanges() {
    return [
      { id: 'bc-001', version: '2.0.0', title: 'Mobile Layout Grid Change', description: 'Dashboard grid changed from 12-column to responsive flexbox', migration: 'Update custom CSS that targets grid columns', severity: 'medium' },
      { id: 'bc-002', version: '2.0.0', title: 'API Response Format Update', description: 'All API responses now include metadata wrapper', migration: 'Update API consumers to unwrap response.data', severity: 'high' },
      { id: 'bc-003', version: '1.5.0', title: 'Config Export Schema Change', description: 'Export format changed from flat to nested structure', migration: 'Use importConfig v2 migration helper', severity: 'medium' },
      { id: 'bc-004', version: '1.5.0', title: 'Deprecated v1 Endpoints', description: '/v1/* endpoints return 301 redirects to /api/*', migration: 'Update base URL from /v1 to /api', severity: 'low' },
    ];
  }

  function getBreakingChange(id) {
    return getBreakingChanges().find(b => b.id === id) || null;
  }

  function generateChangelog(version) {
    const entries = version ? getEntriesByVersion(version) : getEntries();
    const types = {};
    entries.forEach(e => { types[e.type] = (types[e.type] || 0) + 1; });
    return {
      version: version || 'all',
      entryCount: entries.length,
      types,
      generated: new Date().toISOString(),
    };
  }

  function getChangelogStats() {
    const entries = getEntries();
    const types = {};
    entries.forEach(e => { types[e.type] = (types[e.type] || 0) + 1; });
    return {
      totalEntries: entries.length,
      releaseCount: getReleases().length,
      breakingCount: getBreakingChanges().length,
      typeCount: Object.keys(types).length,
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('changelog-widget');
    if (!container) return;
    const stats = getChangelogStats();

    container.innerHTML = `
      <div id="changelog-card">
        <div class="cl-header"><h3>Feature Changelog</h3></div>
        <div class="cl-stats-row">
          <div class="cl-stat-card"><div class="cl-stat-val">${stats.totalEntries}</div><div class="cl-stat-label">Entries</div></div>
          <div class="cl-stat-card"><div class="cl-stat-val">${stats.releaseCount}</div><div class="cl-stat-label">Releases</div></div>
          <div class="cl-stat-card"><div class="cl-stat-val">${stats.breakingCount}</div><div class="cl-stat-label">Breaking</div></div>
          <div class="cl-stat-card"><div class="cl-stat-val">${stats.typeCount}</div><div class="cl-stat-label">Types</div></div>
        </div>
        <div class="cl-tabs">
          <button class="cl-tab ${state.activeTab === 'entries' ? 'active' : ''}" data-tab="entries">Entries</button>
          <button class="cl-tab ${state.activeTab === 'releases' ? 'active' : ''}" data-tab="releases">Releases</button>
          <button class="cl-tab ${state.activeTab === 'breaking' ? 'active' : ''}" data-tab="breaking">Breaking</button>
        </div>
        <div id="cl-content"></div>
      </div>
    `;

    container.querySelectorAll('.cl-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('cl-content');
    if (!el) return;
    if (state.activeTab === 'entries') renderEntries(el);
    else if (state.activeTab === 'releases') renderReleases(el);
    else renderBreaking(el);
  }

  const typeColors = { added: '#22c55e', changed: '#3b82f6', fixed: '#f59e0b', deprecated: '#ef4444' };

  function renderEntries(el) {
    const entries = getEntries();
    el.innerHTML = `
      <div class="cl-list" id="cl-entry-list">
        ${entries.map(e => `
          <div class="cl-entry-item" data-id="${e.id}">
            <div class="cl-entry-top">
              <div class="cl-entry-name">${e.title}</div>
              <span class="cl-badge" style="background:${typeColors[e.type]}22;color:${typeColors[e.type]}">${e.type}</span>
            </div>
            <div class="cl-entry-detail">v${e.version} · ${e.date} · ${e.description}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderReleases(el) {
    const releases = getReleases();
    el.innerHTML = `
      <div id="cl-releases-section">
        <div class="cl-list" id="cl-release-list">
          ${releases.map(r => `
            <div class="cl-release-item" data-version="${r.version}">
              <div class="cl-release-top">
                <div class="cl-release-name">v${r.version}: ${r.title}</div>
                <span class="cl-badge" style="background:${r.status === 'latest' ? '#22c55e' : '#6366f1'}22;color:${r.status === 'latest' ? '#22c55e' : '#6366f1'}">${r.status}</span>
              </div>
              <div class="cl-release-detail">${r.date} · ${r.entryCount} entries · ${r.highlights.join(', ')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderBreaking(el) {
    const changes = getBreakingChanges();
    const sevColors = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
    el.innerHTML = `
      <div id="cl-breaking-section">
        <div class="cl-list" id="cl-breaking-list">
          ${changes.map(b => `
            <div class="cl-breaking-item" data-id="${b.id}">
              <div class="cl-breaking-top">
                <div class="cl-breaking-name">${b.title}</div>
                <span class="cl-badge" style="background:${sevColors[b.severity]}22;color:${sevColors[b.severity]}">${b.severity}</span>
              </div>
              <div class="cl-breaking-detail">v${b.version} · ${b.description} · Migration: ${b.migration}</div>
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

  window.featureChangelog = {
    getEntries, getEntry, getEntriesByVersion, getEntriesByType,
    getReleases, getRelease,
    getBreakingChanges, getBreakingChange,
    generateChangelog, getChangelogStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        entryCount: getEntries().length,
        releaseCount: getReleases().length,
        breakingCount: getBreakingChanges().length,
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
