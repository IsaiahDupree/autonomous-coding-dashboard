// feat-088: Configuration Export/Import
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #config-export-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .cei-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .cei-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .cei-tabs {
      display: flex; gap: 4px; margin-bottom: 16px;
      background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px;
    }
    .cei-tab {
      flex: 1; padding: 6px 12px; border: none; background: transparent;
      color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px;
      font-size: 13px; transition: all 0.2s;
    }
    .cei-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .cei-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .cei-stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .cei-stat-card {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px; text-align: center;
    }
    .cei-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .cei-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .cei-list { display: flex; flex-direction: column; gap: 8px; }
    .cei-setting-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .cei-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .cei-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .cei-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .cei-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .cei-import-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .cei-import-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .cei-import-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .cei-import-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .cei-compat-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .cei-compat-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .cei-compat-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .cei-compat-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'config-export-import';
  const CURRENT_VERSION = '2.1.0';

  let state = {
    activeTab: 'export',
    importHistory: [],
  };

  function getSettingsCategories() {
    return [
      { id: 'cat-general', name: 'General Settings', settingCount: 8, description: 'Theme, language, timezone, display preferences', exportable: true },
      { id: 'cat-features', name: 'Feature Configuration', settingCount: 15, description: 'Feature flags, priorities, acceptance criteria', exportable: true },
      { id: 'cat-notifications', name: 'Notification Settings', settingCount: 6, description: 'Email, Slack, desktop, webhook notifications', exportable: true },
      { id: 'cat-security', name: 'Security Settings', settingCount: 10, description: 'RBAC roles, API keys, audit log config', exportable: true },
      { id: 'cat-performance', name: 'Performance Settings', settingCount: 7, description: 'Cache, lazy loading, memory thresholds', exportable: true },
      { id: 'cat-integrations', name: 'Integration Settings', settingCount: 9, description: 'GitHub, Slack, REST API, GraphQL config', exportable: true },
      { id: 'cat-backup', name: 'Backup Settings', settingCount: 5, description: 'Backup schedules, retention policies', exportable: true },
      { id: 'cat-dashboard', name: 'Dashboard Layout', settingCount: 12, description: 'Widget positions, sizes, visibility', exportable: true },
    ];
  }

  function getAllSettings() {
    const categories = getSettingsCategories();
    const settings = [];
    categories.forEach(cat => {
      for (let i = 0; i < cat.settingCount; i++) {
        settings.push({
          id: `${cat.id}-s${i + 1}`,
          category: cat.id,
          categoryName: cat.name,
          key: `${cat.name.toLowerCase().replace(/\s+/g, '_')}_setting_${i + 1}`,
          value: `value_${i + 1}`,
          type: ['string', 'number', 'boolean', 'array', 'object'][i % 5],
          modified: i % 3 === 0,
        });
      }
    });
    return settings;
  }

  function exportConfig(options) {
    const categories = options?.categories || getSettingsCategories().map(c => c.id);
    const settings = getAllSettings().filter(s => categories.includes(s.category));
    const cats = getSettingsCategories().filter(c => categories.includes(c.id));
    return {
      version: CURRENT_VERSION,
      exportedAt: new Date().toISOString(),
      format: options?.format || 'json',
      categories: cats.map(c => c.id),
      categoryCount: cats.length,
      settingCount: settings.length,
      settings: settings,
      metadata: {
        appVersion: CURRENT_VERSION,
        exportedBy: 'admin',
        checksum: 'sha256:' + Math.random().toString(36).substring(2, 18),
      },
    };
  }

  function importConfig(configData) {
    if (!configData || !configData.version) return { success: false, error: 'Invalid config data' };
    const compat = checkCompatibility(configData.version);
    if (!compat.compatible) return { success: false, error: `Incompatible version: ${configData.version}` };

    const result = {
      success: true,
      importedAt: new Date().toISOString(),
      version: configData.version,
      settingsImported: configData.settingCount || configData.settings?.length || 0,
      categoriesImported: configData.categoryCount || configData.categories?.length || 0,
      warnings: compat.warnings || [],
      migrated: compat.needsMigration || false,
    };

    state.importHistory.unshift({
      id: 'imp-' + String(state.importHistory.length + 1).padStart(3, '0'),
      timestamp: result.importedAt,
      version: configData.version,
      settingsCount: result.settingsImported,
      categoriesCount: result.categoriesImported,
      status: 'success',
      migrated: result.migrated,
    });

    saveState();
    render();
    return result;
  }

  function getImportHistory() {
    return [...state.importHistory];
  }

  function getVersions() {
    return [
      { version: '2.1.0', current: true, releaseDate: '2025-01-15', changes: 8 },
      { version: '2.0.0', current: false, releaseDate: '2024-11-01', changes: 15 },
      { version: '1.5.0', current: false, releaseDate: '2024-08-15', changes: 12 },
      { version: '1.0.0', current: false, releaseDate: '2024-05-01', changes: 0 },
    ];
  }

  function checkCompatibility(version) {
    const versions = getVersions();
    const versionParts = version.split('.').map(Number);
    const currentParts = CURRENT_VERSION.split('.').map(Number);

    if (version === CURRENT_VERSION) {
      return { compatible: true, version, currentVersion: CURRENT_VERSION, needsMigration: false, warnings: [] };
    }
    if (versionParts[0] === currentParts[0]) {
      return {
        compatible: true, version, currentVersion: CURRENT_VERSION,
        needsMigration: true,
        warnings: [`Minor version difference: ${version} → ${CURRENT_VERSION}`],
        migrations: [`Update settings schema from ${version} to ${CURRENT_VERSION}`],
      };
    }
    if (versionParts[0] === currentParts[0] - 1 && versionParts[0] >= 1) {
      return {
        compatible: true, version, currentVersion: CURRENT_VERSION,
        needsMigration: true,
        warnings: [`Major version difference: ${version} → ${CURRENT_VERSION}`, 'Some settings may not be supported'],
        migrations: [`Migrate from v${versionParts[0]} to v${currentParts[0]} schema`],
      };
    }
    return {
      compatible: false, version, currentVersion: CURRENT_VERSION,
      needsMigration: false,
      warnings: [`Version ${version} is too old and incompatible with ${CURRENT_VERSION}`],
    };
  }

  function getExportFormats() {
    return [
      { id: 'json', name: 'JSON', extension: '.json', description: 'Standard JSON format' },
      { id: 'yaml', name: 'YAML', extension: '.yaml', description: 'YAML configuration format' },
      { id: 'toml', name: 'TOML', extension: '.toml', description: 'TOML configuration format' },
    ];
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('config-export-widget');
    if (!container) return;
    const cats = getSettingsCategories();
    const allSettings = getAllSettings();

    container.innerHTML = `
      <div id="config-export-card">
        <div class="cei-header"><h3>Configuration Export/Import</h3></div>
        <div class="cei-stats-row">
          <div class="cei-stat-card"><div class="cei-stat-val">${cats.length}</div><div class="cei-stat-label">Categories</div></div>
          <div class="cei-stat-card"><div class="cei-stat-val">${allSettings.length}</div><div class="cei-stat-label">Settings</div></div>
          <div class="cei-stat-card"><div class="cei-stat-val">v${CURRENT_VERSION}</div><div class="cei-stat-label">Version</div></div>
          <div class="cei-stat-card"><div class="cei-stat-val">${state.importHistory.length}</div><div class="cei-stat-label">Imports</div></div>
        </div>
        <div class="cei-tabs">
          <button class="cei-tab ${state.activeTab === 'export' ? 'active' : ''}" data-tab="export">Export</button>
          <button class="cei-tab ${state.activeTab === 'import' ? 'active' : ''}" data-tab="import">Import</button>
          <button class="cei-tab ${state.activeTab === 'versions' ? 'active' : ''}" data-tab="versions">Versions</button>
        </div>
        <div id="cei-content"></div>
      </div>
    `;

    container.querySelectorAll('.cei-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('cei-content');
    if (!el) return;
    if (state.activeTab === 'export') renderExport(el);
    else if (state.activeTab === 'import') renderImport(el);
    else renderVersions(el);
  }

  function renderExport(el) {
    const cats = getSettingsCategories();
    el.innerHTML = `
      <div class="cei-list" id="cei-export-list">
        ${cats.map(c => `
          <div class="cei-setting-item" data-id="${c.id}">
            <div class="cei-item-top">
              <div class="cei-item-name">${c.name}</div>
              <span class="cei-badge" style="background:#6366f122;color:#6366f1">${c.settingCount} settings</span>
            </div>
            <div class="cei-item-detail">${c.description}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderImport(el) {
    const history = getImportHistory();
    el.innerHTML = `
      <div class="cei-list" id="cei-import-list">
        ${history.length === 0 ? '<div class="cei-import-item"><div class="cei-import-name">No imports yet</div></div>' : ''}
        ${history.map(h => `
          <div class="cei-import-item" data-id="${h.id}">
            <div class="cei-import-top">
              <div class="cei-import-name">Import from v${h.version}</div>
              <span class="cei-badge" style="background:${h.status === 'success' ? '#22c55e' : '#ef4444'}22;color:${h.status === 'success' ? '#22c55e' : '#ef4444'}">${h.status}</span>
            </div>
            <div class="cei-import-detail">${h.settingsCount} settings · ${h.categoriesCount} categories${h.migrated ? ' · Migrated' : ''} · ${new Date(h.timestamp).toLocaleString()}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderVersions(el) {
    const versions = getVersions();
    el.innerHTML = `
      <div id="cei-version-section">
        <div class="cei-list" id="cei-version-list">
          ${versions.map(v => `
            <div class="cei-compat-item" data-version="${v.version}">
              <div class="cei-compat-top">
                <div class="cei-compat-name">v${v.version}${v.current ? ' (Current)' : ''}</div>
                <span class="cei-badge" style="background:${v.current ? '#22c55e' : '#6366f1'}22;color:${v.current ? '#22c55e' : '#6366f1'}">${v.current ? 'Current' : v.changes + ' changes'}</span>
              </div>
              <div class="cei-compat-detail">Released: ${v.releaseDate}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab, importHistory: state.importHistory })); } catch (e) {}
  }
  function loadState() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) { const p = JSON.parse(s); state.activeTab = p.activeTab || state.activeTab; if (p.importHistory) state.importHistory = p.importHistory; }
    } catch (e) {}
  }

  window.configExportImport = {
    getSettingsCategories, getAllSettings, exportConfig, importConfig,
    getImportHistory, getVersions, checkCompatibility, getExportFormats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        currentVersion: CURRENT_VERSION,
        categoryCount: getSettingsCategories().length,
        settingCount: getAllSettings().length,
        importCount: state.importHistory.length,
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
