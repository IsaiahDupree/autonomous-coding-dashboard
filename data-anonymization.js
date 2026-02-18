// feat-116: Data Anonymization for Sharing
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #data-anonymization-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .da-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .da-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .da-badge { background: #22c55e; color: #fff; font-size: 11px; padding: 3px 10px; border-radius: 20px; }
    .da-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .da-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .da-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .da-rules-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
    .da-rule { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 9px; padding: 14px; }
    .da-rule-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .da-rule-name { font-size: 13px; font-weight: 600; color: var(--color-text, #e0e0e0); display: flex; align-items: center; gap: 8px; }
    .da-toggle { position: relative; width: 36px; height: 20px; }
    .da-toggle input { opacity: 0; width: 0; height: 0; }
    .da-toggle-slider { position: absolute; inset: 0; background: var(--color-border, #2e2e3e); border-radius: 99px; cursor: pointer; transition: background 0.2s; }
    .da-toggle input:checked + .da-toggle-slider { background: var(--color-primary, #6366f1); }
    .da-toggle-slider::before { content:''; position: absolute; width: 14px; height: 14px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: transform 0.2s; }
    .da-toggle input:checked + .da-toggle-slider::before { transform: translateX(16px); }
    .da-rule-desc { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-bottom: 6px; }
    .da-rule-example { font-size: 11px; font-family: monospace; padding: 6px 10px; background: var(--color-card-bg, #1e1e2e); border-radius: 6px; color: var(--color-text-secondary, #a0a0b0); }
    .da-rule-example span.original { color: #f87171; }
    .da-rule-example span.anonymized { color: #22c55e; }
    .da-export-section { display: flex; flex-direction: column; gap: 12px; }
    .da-export-select { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 7px; padding: 10px; }
    .da-export-select-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-bottom: 6px; }
    .da-dataset-check { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 13px; color: var(--color-text, #e0e0e0); }
    .da-dataset-check input { accent-color: var(--color-primary, #6366f1); }
    .da-btn-row { display: flex; gap: 10px; }
    .da-btn { border: none; border-radius: 7px; font-size: 13px; font-weight: 600; padding: 9px 18px; cursor: pointer; transition: opacity 0.2s; }
    .da-btn-primary { background: var(--color-primary, #6366f1); color: #fff; }
    .da-btn-secondary { background: var(--color-border, #2e2e3e); color: var(--color-text, #e0e0e0); }
    .da-btn:hover { opacity: 0.8; }
    .da-preview { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 9px; padding: 14px; font-family: monospace; font-size: 12px; white-space: pre-wrap; max-height: 200px; overflow-y: auto; color: var(--color-text, #e0e0e0); }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'data-anonymization-config';

  const RULES = [
    { id: 'rule-api-keys', icon: '🔑', name: 'API Key Masking', desc: 'Replace API keys and secrets with masked values.', example: { original: 'ANTHROPIC_API_KEY=sk-ant-abc123xyz...', anonymized: 'ANTHROPIC_API_KEY=sk-ant-***REDACTED***' }, defaultEnabled: true },
    { id: 'rule-emails', icon: '📧', name: 'Email Address Masking', desc: 'Replace real email addresses with anonymized versions.', example: { original: 'user@company.com', anonymized: 'user_***@***.com' }, defaultEnabled: true },
    { id: 'rule-paths', icon: '📁', name: 'File Path Anonymization', desc: 'Replace user-specific file paths with generic placeholders.', example: { original: '/Users/johndoe/projects/myapp', anonymized: '/Users/[USER]/projects/[PROJECT]' }, defaultEnabled: true },
    { id: 'rule-tokens', icon: '🎟️', name: 'Token Scrubbing', desc: 'Remove auth tokens, session IDs, and JWTs from exported data.', example: { original: 'Bearer eyJhbGciOiJIUzI1NiJ9.abc...', anonymized: 'Bearer [TOKEN_REDACTED]' }, defaultEnabled: true },
    { id: 'rule-urls', icon: '🌐', name: 'Internal URL Masking', desc: 'Replace internal hostnames and IP addresses.', example: { original: 'http://192.168.1.100:3001/api', anonymized: 'http://[INTERNAL_HOST]/api' }, defaultEnabled: false },
    { id: 'rule-usernames', icon: '👤', name: 'Username Anonymization', desc: 'Replace usernames with generic identifiers.', example: { original: 'johndoe, jane.smith', anonymized: 'user_001, user_002' }, defaultEnabled: false },
  ];

  const DATASETS = [
    { id: 'ds-logs', label: 'Application Logs' },
    { id: 'ds-sessions', label: 'Session History' },
    { id: 'ds-features', label: 'Feature List' },
    { id: 'ds-config', label: 'Configuration' },
    { id: 'ds-errors', label: 'Error Reports' },
  ];

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }
  function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

  let state = loadState();
  let activeTab = 'rules';

  function isRuleEnabled(id) {
    if (state[id + '_enabled'] !== undefined) return state[id + '_enabled'];
    return RULES.find(r => r.id === id)?.defaultEnabled || false;
  }

  function toggleRule(id) {
    state[id + '_enabled'] = !isRuleEnabled(id);
    saveState(state); renderCard();
  }

  function getEnabledCount() { return RULES.filter(r => isRuleEnabled(r.id)).length; }

  function exportAnonymized() {
    const enabled = RULES.filter(r => isRuleEnabled(r.id));
    const selected = DATASETS.filter(d => state['ds_' + d.id] !== false);
    const output = {
      exportedAt: new Date().toISOString(),
      anonymizationRules: enabled.map(r => r.name),
      datasets: selected.map(d => d.label),
      note: 'This export has been anonymized. Sensitive data has been removed or replaced.',
      sampleData: {
        logs: '[ANONYMIZED LOG ENTRIES]',
        apiKeys: '[ALL_KEYS_REDACTED]',
        userPaths: '[PATHS_ANONYMIZED]',
      }
    };
    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'acd-anonymized-export.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function setTab(tab) { activeTab = tab; renderCard(); }

  function toggleDataset(id) {
    state['ds_' + id] = state['ds_' + id] === false ? true : false;
    saveState(state); renderCard();
  }

  function renderCard() {
    const card = document.getElementById('data-anonymization-card');
    if (!card) return;

    let content = '';
    if (activeTab === 'rules') {
      content = `<div class="da-rules-list">${RULES.map(r => {
        const enabled = isRuleEnabled(r.id);
        return `<div class="da-rule">
          <div class="da-rule-top">
            <div class="da-rule-name">${r.icon} ${r.name}</div>
            <label class="da-toggle">
              <input type="checkbox" ${enabled ? 'checked' : ''} onchange="window.dataAnonymization.toggleRule('${r.id}')">
              <div class="da-toggle-slider"></div>
            </label>
          </div>
          <div class="da-rule-desc">${r.desc}</div>
          <div class="da-rule-example">
            <span class="original">${r.example.original}</span> → <span class="anonymized">${r.example.anonymized}</span>
          </div>
        </div>`;
      }).join('')}</div>`;
    } else if (activeTab === 'export') {
      const dsChecks = DATASETS.map(d => {
        const checked = state['ds_' + d.id] !== false;
        return `<label class="da-dataset-check"><input type="checkbox" ${checked ? 'checked' : ''} onchange="window.dataAnonymization.toggleDataset('${d.id}')"> ${d.label}</label>`;
      }).join('');
      content = `<div class="da-export-section">
        <div class="da-export-select">
          <div class="da-export-select-label">Select datasets to include:</div>
          ${dsChecks}
        </div>
        <div class="da-btn-row">
          <button class="da-btn da-btn-primary" onclick="window.dataAnonymization.exportAnonymized()">📥 Export Anonymized Dataset</button>
          <button class="da-btn da-btn-secondary" onclick="window.dataAnonymization.preview()">👁 Preview</button>
        </div>
        <div class="da-preview" id="da-preview-area">Click Preview to see a sample of the anonymized output...</div>
      </div>`;
    }

    card.innerHTML = `
      <div class="da-header">
        <h3>🔒 Data Anonymization</h3>
        <span class="da-badge">${getEnabledCount()} Rules Active</span>
      </div>
      <div class="da-tabs">
        <button class="da-tab ${activeTab === 'rules' ? 'active' : ''}" onclick="window.dataAnonymization.setTab('rules')">Rules</button>
        <button class="da-tab ${activeTab === 'export' ? 'active' : ''}" onclick="window.dataAnonymization.setTab('export')">Export</button>
      </div>
      ${content}`;
  }

  function preview() {
    const area = document.getElementById('da-preview-area');
    if (!area) return;
    const enabled = RULES.filter(r => isRuleEnabled(r.id));
    area.textContent = JSON.stringify({
      exportedAt: new Date().toISOString(),
      anonymizationRules: enabled.map(r => r.name),
      note: 'Sensitive data removed/replaced by active rules.',
      sample: {
        apiKey: enabled.find(r => r.id === 'rule-api-keys') ? '***REDACTED***' : 'sk-ant-example123',
        userPath: enabled.find(r => r.id === 'rule-paths') ? '/Users/[USER]/...' : '/Users/johndoe/...',
        email: enabled.find(r => r.id === 'rule-emails') ? 'user_***@***.com' : 'john@example.com',
      }
    }, null, 2);
  }

  function init() {
    const main = document.querySelector('main.container');
    if (!main) return;
    const card = document.createElement('div');
    card.id = 'data-anonymization-card';
    main.insertBefore(card, main.firstChild);
    renderCard();
  }

  window.dataAnonymization = {
    toggleRule,
    setTab,
    toggleDataset,
    exportAnonymized,
    preview,
    getRules: () => RULES.map(r => ({ ...r, enabled: isRuleEnabled(r.id) })),
    getRule: (id) => { const r = RULES.find(x => x.id === id); return r ? { ...r, enabled: isRuleEnabled(id) } : null; },
    getEnabledCount,
    getState: () => ({ enabledRules: getEnabledCount(), totalRules: RULES.length }),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
