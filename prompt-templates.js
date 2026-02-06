// feat-106: Custom Prompt Templates
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #prompt-templates-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .pt-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .pt-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .pt-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .pt-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .pt-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .pt-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .pt-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .pt-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .pt-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .pt-list { display: flex; flex-direction: column; gap: 8px; }
    .pt-template-item, .pt-variable-item, .pt-category-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .pt-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .pt-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .pt-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .pt-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);
  const STORAGE_KEY = 'prompt-templates-config';
  let state = { activeTab: 'templates' };

  function getTemplates() {
    return [
      { id: 'tpl-001', name: 'Feature Implementation', type: 'system', content: 'You are a coding agent implementing feature {{featureId}}...', variables: ['featureId', 'projectPath'], category: 'coding', usageCount: 142, lastUsed: '2026-02-06T01:00:00Z' },
      { id: 'tpl-002', name: 'Bug Fix Analysis', type: 'user', content: 'Analyze the following error and suggest a fix: {{errorMessage}}', variables: ['errorMessage', 'stackTrace'], category: 'debugging', usageCount: 87, lastUsed: '2026-02-05T22:00:00Z' },
      { id: 'tpl-003', name: 'Code Review', type: 'assistant', content: 'Review the following code changes for {{featureId}} in {{filePath}}...', variables: ['featureId', 'filePath'], category: 'review', usageCount: 64, lastUsed: '2026-02-05T20:00:00Z' },
      { id: 'tpl-004', name: 'Test Generation', type: 'system', content: 'Generate comprehensive tests for {{componentName}} covering {{testTypes}}', variables: ['componentName', 'testTypes'], category: 'testing', usageCount: 95, lastUsed: '2026-02-06T00:30:00Z' },
      { id: 'tpl-005', name: 'Documentation Writer', type: 'user', content: 'Write documentation for {{apiEndpoint}} with examples', variables: ['apiEndpoint', 'responseSchema'], category: 'documentation', usageCount: 38, lastUsed: '2026-02-04T18:00:00Z' },
      { id: 'tpl-006', name: 'Refactoring Guide', type: 'assistant', content: 'Suggest refactoring improvements for {{moduleName}}...', variables: ['moduleName', 'targetPattern'], category: 'coding', usageCount: 52, lastUsed: '2026-02-05T15:00:00Z' },
    ];
  }
  function getTemplate(id) { return getTemplates().find(t => t.id === id) || null; }
  function getTemplatesByType(type) { return getTemplates().filter(t => t.type === type); }

  function getVariables() {
    return [
      { id: 'var-001', name: 'featureId', defaultValue: 'feat-001', description: 'The feature identifier', usedIn: ['tpl-001', 'tpl-003'] },
      { id: 'var-002', name: 'projectPath', defaultValue: '/path/to/project', description: 'Absolute path to target project', usedIn: ['tpl-001'] },
      { id: 'var-003', name: 'errorMessage', defaultValue: '', description: 'Error message from logs', usedIn: ['tpl-002'] },
      { id: 'var-004', name: 'componentName', defaultValue: 'Component', description: 'Name of the component to test', usedIn: ['tpl-004'] },
    ];
  }
  function getVariable(id) { return getVariables().find(v => v.id === id) || null; }

  function getCategories() {
    return [
      { id: 'cat-001', name: 'coding', templateCount: 2, description: 'Code generation and implementation', color: '#6366f1' },
      { id: 'cat-002', name: 'debugging', templateCount: 1, description: 'Error analysis and bug fixing', color: '#ef4444' },
      { id: 'cat-003', name: 'review', templateCount: 1, description: 'Code review and quality checks', color: '#22c55e' },
      { id: 'cat-004', name: 'testing', templateCount: 1, description: 'Test generation and validation', color: '#f59e0b' },
      { id: 'cat-005', name: 'documentation', templateCount: 1, description: 'Documentation generation', color: '#3b82f6' },
    ];
  }
  function getCategory(id) { return getCategories().find(c => c.id === id) || null; }

  function getStats() {
    const templates = getTemplates();
    return { totalTemplates: templates.length, totalVariables: getVariables().length, totalCategories: getCategories().length, totalUsage: templates.reduce((a, t) => a + t.usageCount, 0) };
  }

  function render() {
    const container = document.getElementById('prompt-templates-widget');
    if (!container) return;
    const stats = getStats();
    container.innerHTML = `
      <div id="prompt-templates-card">
        <div class="pt-header"><h3>Custom Prompt Templates</h3></div>
        <div class="pt-stats-row">
          <div class="pt-stat-card"><div class="pt-stat-val">${stats.totalTemplates}</div><div class="pt-stat-label">Templates</div></div>
          <div class="pt-stat-card"><div class="pt-stat-val">${stats.totalVariables}</div><div class="pt-stat-label">Variables</div></div>
          <div class="pt-stat-card"><div class="pt-stat-val">${stats.totalCategories}</div><div class="pt-stat-label">Categories</div></div>
          <div class="pt-stat-card"><div class="pt-stat-val">${stats.totalUsage}</div><div class="pt-stat-label">Total Uses</div></div>
        </div>
        <div class="pt-tabs">
          <button class="pt-tab ${state.activeTab === 'templates' ? 'active' : ''}" data-tab="templates">Templates</button>
          <button class="pt-tab ${state.activeTab === 'variables' ? 'active' : ''}" data-tab="variables">Variables</button>
          <button class="pt-tab ${state.activeTab === 'categories' ? 'active' : ''}" data-tab="categories">Categories</button>
        </div>
        <div id="pt-content"></div>
      </div>`;
    container.querySelectorAll('.pt-tab').forEach(btn => { btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); }); });
    renderContent();
  }
  function renderContent() {
    const el = document.getElementById('pt-content');
    if (!el) return;
    if (state.activeTab === 'templates') el.innerHTML = `<div class="pt-list" id="pt-template-list">${getTemplates().map(t => `<div class="pt-template-item" data-id="${t.id}"><div class="pt-item-top"><div class="pt-item-name">${t.name}</div><span class="pt-badge" style="background:${t.type==='system'?'#6366f1':t.type==='user'?'#22c55e':'#f59e0b'}22;color:${t.type==='system'?'#6366f1':t.type==='user'?'#22c55e':'#f59e0b'}">${t.type}</span></div><div class="pt-item-detail">${t.category} · Used ${t.usageCount} times · Vars: ${t.variables.join(', ')}</div></div>`).join('')}</div>`;
    else if (state.activeTab === 'variables') el.innerHTML = `<div id="pt-variable-section"><div class="pt-list" id="pt-variable-list">${getVariables().map(v => `<div class="pt-variable-item" data-id="${v.id}"><div class="pt-item-top"><div class="pt-item-name">{{${v.name}}}</div><span class="pt-badge" style="background:#6366f122;color:#6366f1">${v.usedIn.length} uses</span></div><div class="pt-item-detail">${v.description} · Default: ${v.defaultValue || '(none)'}</div></div>`).join('')}</div></div>`;
    else el.innerHTML = `<div id="pt-category-section"><div class="pt-list" id="pt-category-list">${getCategories().map(c => `<div class="pt-category-item" data-id="${c.id}"><div class="pt-item-top"><div class="pt-item-name">${c.name}</div><span class="pt-badge" style="background:${c.color}22;color:${c.color}">${c.templateCount} templates</span></div><div class="pt-item-detail">${c.description}</div></div>`).join('')}</div></div>`;
  }
  function saveState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab })); } catch(e){} }
  function loadState() { try { const s=localStorage.getItem(STORAGE_KEY); if(s){const p=JSON.parse(s); state.activeTab=p.activeTab||state.activeTab;} } catch(e){} }

  window.promptTemplates = {
    getTemplates, getTemplate, getTemplatesByType, getVariables, getVariable, getCategories, getCategory, getStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() { return { activeTab: state.activeTab, templateCount: getTemplates().length, variableCount: getVariables().length, categoryCount: getCategories().length }; },
  };
  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
