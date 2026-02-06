// feat-105: Plugin Architecture
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #plugin-arch-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .pa-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .pa-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .pa-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .pa-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .pa-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .pa-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .pa-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .pa-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .pa-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .pa-list { display: flex; flex-direction: column; gap: 8px; }
    .pa-plugin-item, .pa-hook-item, .pa-api-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .pa-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .pa-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .pa-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .pa-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);
  const STORAGE_KEY = 'plugin-arch-config';
  let state = { activeTab: 'plugins' };

  function getPlugins() {
    return [
      { id: 'plug-001', name: 'GitHub Integration', version: '1.2.0', author: 'Core Team', status: 'active', category: 'integration', hooks: ['onFeaturePass', 'onCommit'], description: 'Sync features with GitHub Issues' },
      { id: 'plug-002', name: 'Slack Notifier', version: '2.0.1', author: 'Community', status: 'active', category: 'notification', hooks: ['onFeaturePass', 'onHarnessComplete'], description: 'Send notifications to Slack channels' },
      { id: 'plug-003', name: 'Custom Metrics', version: '1.0.0', author: 'Core Team', status: 'active', category: 'analytics', hooks: ['onMetricCollect', 'onDashboardLoad'], description: 'Track custom performance metrics' },
      { id: 'plug-004', name: 'Theme Manager', version: '1.1.0', author: 'Community', status: 'inactive', category: 'ui', hooks: ['onThemeChange', 'onDashboardLoad'], description: 'Custom theme support and management' },
      { id: 'plug-005', name: 'Data Exporter', version: '1.3.2', author: 'Core Team', status: 'active', category: 'data', hooks: ['onExportRequest', 'onDataChange'], description: 'Export data in multiple formats' },
      { id: 'plug-006', name: 'AI Assistant', version: '0.9.0', author: 'Community', status: 'active', category: 'ai', hooks: ['onErrorDetect', 'onFeatureAnalyze'], description: 'AI-powered coding assistance' },
    ];
  }
  function getPlugin(id) { return getPlugins().find(p => p.id === id) || null; }
  function getActivePlugins() { return getPlugins().filter(p => p.status === 'active'); }

  function getHooks() {
    return [
      { id: 'hook-001', name: 'onFeaturePass', description: 'Triggered when a feature test passes', subscribers: 2, category: 'feature' },
      { id: 'hook-002', name: 'onFeatureFail', description: 'Triggered when a feature test fails', subscribers: 1, category: 'feature' },
      { id: 'hook-003', name: 'onHarnessComplete', description: 'Triggered when harness run completes', subscribers: 2, category: 'harness' },
      { id: 'hook-004', name: 'onCommit', description: 'Triggered on new git commit', subscribers: 1, category: 'git' },
      { id: 'hook-005', name: 'onDashboardLoad', description: 'Triggered when dashboard loads', subscribers: 2, category: 'ui' },
      { id: 'hook-006', name: 'onErrorDetect', description: 'Triggered when an error is detected', subscribers: 1, category: 'error' },
      { id: 'hook-007', name: 'onMetricCollect', description: 'Triggered on metric collection', subscribers: 1, category: 'metrics' },
      { id: 'hook-008', name: 'onDataChange', description: 'Triggered when data changes', subscribers: 1, category: 'data' },
    ];
  }
  function getHook(id) { return getHooks().find(h => h.id === id) || null; }

  function getPluginAPIs() {
    return [
      { id: 'api-001', name: 'registerPlugin', description: 'Register a new plugin', params: ['name', 'version', 'hooks'], returnType: 'PluginInstance' },
      { id: 'api-002', name: 'subscribe', description: 'Subscribe to a hook event', params: ['hookName', 'callback'], returnType: 'Subscription' },
      { id: 'api-003', name: 'emit', description: 'Emit an event on a hook', params: ['hookName', 'data'], returnType: 'void' },
      { id: 'api-004', name: 'getPluginConfig', description: 'Get plugin configuration', params: ['pluginId'], returnType: 'Config' },
      { id: 'api-005', name: 'setPluginConfig', description: 'Update plugin configuration', params: ['pluginId', 'config'], returnType: 'boolean' },
    ];
  }
  function getPluginAPI(id) { return getPluginAPIs().find(a => a.id === id) || null; }

  function getPluginStats() {
    return { totalPlugins: getPlugins().length, activePlugins: getActivePlugins().length, hookCount: getHooks().length, apiCount: getPluginAPIs().length };
  }

  function render() {
    const container = document.getElementById('plugin-arch-widget');
    if (!container) return;
    const stats = getPluginStats();
    container.innerHTML = `
      <div id="plugin-arch-card">
        <div class="pa-header"><h3>Plugin Architecture</h3></div>
        <div class="pa-stats-row">
          <div class="pa-stat-card"><div class="pa-stat-val">${stats.totalPlugins}</div><div class="pa-stat-label">Plugins</div></div>
          <div class="pa-stat-card"><div class="pa-stat-val">${stats.activePlugins}</div><div class="pa-stat-label">Active</div></div>
          <div class="pa-stat-card"><div class="pa-stat-val">${stats.hookCount}</div><div class="pa-stat-label">Hooks</div></div>
          <div class="pa-stat-card"><div class="pa-stat-val">${stats.apiCount}</div><div class="pa-stat-label">APIs</div></div>
        </div>
        <div class="pa-tabs">
          <button class="pa-tab ${state.activeTab === 'plugins' ? 'active' : ''}" data-tab="plugins">Plugins</button>
          <button class="pa-tab ${state.activeTab === 'hooks' ? 'active' : ''}" data-tab="hooks">Hooks</button>
          <button class="pa-tab ${state.activeTab === 'apis' ? 'active' : ''}" data-tab="apis">APIs</button>
        </div>
        <div id="pa-content"></div>
      </div>`;
    container.querySelectorAll('.pa-tab').forEach(btn => { btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); }); });
    renderContent();
  }
  function renderContent() {
    const el = document.getElementById('pa-content');
    if (!el) return;
    if (state.activeTab === 'plugins') el.innerHTML = `<div class="pa-list" id="pa-plugin-list">${getPlugins().map(p => `<div class="pa-plugin-item" data-id="${p.id}"><div class="pa-item-top"><div class="pa-item-name">${p.name} v${p.version}</div><span class="pa-badge" style="background:${p.status==='active'?'#22c55e':'#6b7280'}22;color:${p.status==='active'?'#22c55e':'#6b7280'}">${p.status}</span></div><div class="pa-item-detail">${p.category} · ${p.author} · Hooks: ${p.hooks.join(', ')}</div></div>`).join('')}</div>`;
    else if (state.activeTab === 'hooks') el.innerHTML = `<div id="pa-hook-section"><div class="pa-list" id="pa-hook-list">${getHooks().map(h => `<div class="pa-hook-item" data-id="${h.id}"><div class="pa-item-top"><div class="pa-item-name">${h.name}</div><span class="pa-badge" style="background:#6366f122;color:#6366f1">${h.subscribers} subs</span></div><div class="pa-item-detail">${h.description} · ${h.category}</div></div>`).join('')}</div></div>`;
    else el.innerHTML = `<div id="pa-api-section"><div class="pa-list" id="pa-api-list">${getPluginAPIs().map(a => `<div class="pa-api-item" data-id="${a.id}"><div class="pa-item-top"><div class="pa-item-name">${a.name}()</div><span class="pa-badge" style="background:#22c55e22;color:#22c55e">${a.returnType}</span></div><div class="pa-item-detail">${a.description} · Params: ${a.params.join(', ')}</div></div>`).join('')}</div></div>`;
  }
  function saveState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab })); } catch(e){} }
  function loadState() { try { const s=localStorage.getItem(STORAGE_KEY); if(s){const p=JSON.parse(s); state.activeTab=p.activeTab||state.activeTab;} } catch(e){} }

  window.pluginArchitecture = {
    getPlugins, getPlugin, getActivePlugins, getHooks, getHook, getPluginAPIs, getPluginAPI, getPluginStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() { return { activeTab: state.activeTab, pluginCount: getPlugins().length, activeCount: getActivePlugins().length, hookCount: getHooks().length, apiCount: getPluginAPIs().length }; },
  };
  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
