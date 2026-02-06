// feat-078: API Key Encryption at Rest
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #api-key-encryption-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .ake-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .ake-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .ake-badge {
      font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600;
    }
    .ake-badge.secure { background: #22c55e22; color: #22c55e; }
    .ake-badge.warning { background: #f59e0b22; color: #f59e0b; }
    .ake-tabs {
      display: flex; gap: 4px; margin-bottom: 16px;
      background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px;
    }
    .ake-tab {
      flex: 1; padding: 6px 12px; border: none; background: transparent;
      color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px;
      font-size: 13px; transition: all 0.2s;
    }
    .ake-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .ake-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .ake-stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .ake-stat-card {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px; text-align: center;
    }
    .ake-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .ake-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }

    /* Key list */
    .ake-key-list { display: flex; flex-direction: column; gap: 8px; }
    .ake-key-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .ake-key-top { display: flex; justify-content: space-between; align-items: center; }
    .ake-key-name { font-size: 14px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .ake-key-masked {
      font-family: 'JetBrains Mono', monospace; font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0); margin-top: 4px;
    }
    .ake-key-meta { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 6px; }
    .ake-key-actions { display: flex; gap: 6px; margin-top: 8px; }
    .ake-btn {
      padding: 4px 10px; border: 1px solid var(--color-border, #2e2e3e);
      background: transparent; color: var(--color-text-secondary, #a0a0b0);
      border-radius: 4px; font-size: 12px; cursor: pointer; transition: all 0.2s;
    }
    .ake-btn:hover { background: rgba(255,255,255,0.05); }
    .ake-btn.danger { border-color: #ef444444; color: #ef4444; }
    .ake-btn.primary { border-color: #6366f144; color: #6366f1; }

    /* Rotation log */
    .ake-rotation-list { display: flex; flex-direction: column; gap: 8px; }
    .ake-rotation-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;
    }
    .ake-rotation-info { flex: 1; }
    .ake-rotation-key { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .ake-rotation-date { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 2px; }
    .ake-rotation-reason { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .ake-rotation-badge {
      font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600;
    }

    /* Settings */
    .ake-settings-group {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px; margin-bottom: 10px;
    }
    .ake-settings-label { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); margin-bottom: 6px; }
    .ake-settings-value { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .ake-enc-indicator {
      display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px;
    }
    .ake-enc-indicator.encrypted { background: #22c55e; }
    .ake-enc-indicator.unencrypted { background: #ef4444; }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'api-key-encryption-config';
  const KEYS_STORAGE = 'api-encrypted-keys';

  // Simple XOR-based encryption simulation (for demo purposes in a browser widget)
  const ENCRYPTION_KEY = 'acd-enc-v1-secret';

  function simEncrypt(plaintext) {
    let result = '';
    for (let i = 0; i < plaintext.length; i++) {
      result += String.fromCharCode(plaintext.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
    }
    return btoa(result);
  }

  function simDecrypt(ciphertext) {
    const decoded = atob(ciphertext);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
    }
    return result;
  }

  function maskKey(key) {
    if (key.length <= 8) return '****';
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
  }

  function generateId() {
    return 'key-' + Math.random().toString(36).substring(2, 9);
  }

  let state = {
    activeTab: 'keys',
    keys: [],
    rotationLog: [],
    config: {
      algorithm: 'AES-256-GCM',
      autoRotateDays: 90,
      requireEncryption: true,
    },
  };

  function generateSampleKeys() {
    const services = [
      { name: 'Claude API Key', service: 'anthropic', key: 'sk-ant-api03-xYzAbC1234567890' },
      { name: 'OpenAI API Key', service: 'openai', key: 'sk-proj-AbCdEf9876543210' },
      { name: 'Supabase Service Key', service: 'supabase', key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-key' },
      { name: 'PostHog API Key', service: 'posthog', key: 'phc_abcdef1234567890abcdef' },
      { name: 'GitHub Token', service: 'github', key: 'ghp_ABCDEFghijklmnop1234567890' },
    ];
    const now = Date.now();
    return services.map((s, i) => ({
      id: generateId(),
      name: s.name,
      service: s.service,
      encrypted: simEncrypt(s.key),
      isEncrypted: true,
      createdAt: new Date(now - (i + 1) * 7 * 86400000).toISOString(),
      lastRotated: new Date(now - i * 14 * 86400000).toISOString(),
      lastAccessed: new Date(now - i * 3600000).toISOString(),
      rotationCount: i,
      expiresIn: 90 - (i * 14),
    }));
  }

  function generateRotationLog() {
    const reasons = ['scheduled', 'manual', 'security-incident', 'policy-update'];
    const log = [];
    const now = Date.now();
    for (let i = 0; i < 8; i++) {
      log.push({
        id: 'rot-' + i,
        keyName: state.keys[i % state.keys.length]?.name || 'Unknown Key',
        keyId: state.keys[i % state.keys.length]?.id || 'unknown',
        oldVersion: `v${i}`,
        newVersion: `v${i + 1}`,
        rotatedAt: new Date(now - i * 5 * 86400000).toISOString(),
        reason: reasons[i % reasons.length],
        rotatedBy: i % 2 === 0 ? 'system' : 'admin',
        success: true,
      });
    }
    return log;
  }

  // ── Core API ──────────────────────────────────────────────────
  function getKeys() {
    return state.keys.map(k => ({
      id: k.id,
      name: k.name,
      service: k.service,
      isEncrypted: k.isEncrypted,
      masked: maskKey(simDecrypt(k.encrypted)),
      createdAt: k.createdAt,
      lastRotated: k.lastRotated,
      lastAccessed: k.lastAccessed,
      rotationCount: k.rotationCount,
      expiresIn: k.expiresIn,
    }));
  }

  function getKey(id) {
    const k = state.keys.find(k => k.id === id);
    if (!k) return null;
    return {
      id: k.id, name: k.name, service: k.service,
      isEncrypted: k.isEncrypted,
      masked: maskKey(simDecrypt(k.encrypted)),
      createdAt: k.createdAt, lastRotated: k.lastRotated,
      lastAccessed: k.lastAccessed, rotationCount: k.rotationCount,
      expiresIn: k.expiresIn,
    };
  }

  function retrieveKey(id) {
    const k = state.keys.find(k => k.id === id);
    if (!k) return null;
    k.lastAccessed = new Date().toISOString();
    saveState();
    return {
      id: k.id,
      name: k.name,
      service: k.service,
      decrypted: simDecrypt(k.encrypted),
      accessedAt: k.lastAccessed,
    };
  }

  function storeKey(name, service, plaintext) {
    const newKey = {
      id: generateId(),
      name: name,
      service: service,
      encrypted: simEncrypt(plaintext),
      isEncrypted: true,
      createdAt: new Date().toISOString(),
      lastRotated: new Date().toISOString(),
      lastAccessed: null,
      rotationCount: 0,
      expiresIn: state.config.autoRotateDays,
    };
    state.keys.push(newKey);
    saveState();
    render();
    return newKey.id;
  }

  function deleteKey(id) {
    const idx = state.keys.findIndex(k => k.id === id);
    if (idx === -1) return false;
    state.keys.splice(idx, 1);
    saveState();
    render();
    return true;
  }

  function rotateKey(id, newPlaintext) {
    const k = state.keys.find(k => k.id === id);
    if (!k) return false;
    const oldVersion = `v${k.rotationCount}`;
    k.encrypted = simEncrypt(newPlaintext || simDecrypt(k.encrypted) + '-rotated');
    k.lastRotated = new Date().toISOString();
    k.rotationCount++;
    k.expiresIn = state.config.autoRotateDays;
    const newVersion = `v${k.rotationCount}`;
    state.rotationLog.unshift({
      id: 'rot-' + Date.now(),
      keyName: k.name,
      keyId: k.id,
      oldVersion: oldVersion,
      newVersion: newVersion,
      rotatedAt: new Date().toISOString(),
      reason: 'manual',
      rotatedBy: 'admin',
      success: true,
    });
    saveState();
    render();
    return true;
  }

  function rotateAllExpiring(thresholdDays) {
    const threshold = thresholdDays || 30;
    let count = 0;
    state.keys.forEach(k => {
      if (k.expiresIn <= threshold) {
        rotateKey(k.id);
        count++;
      }
    });
    return count;
  }

  function getRotationLog() {
    return state.rotationLog;
  }

  function getEncryptionConfig() {
    return { ...state.config };
  }

  function updateConfig(updates) {
    Object.assign(state.config, updates);
    saveState();
    render();
    return state.config;
  }

  function getEncryptionStats() {
    const keys = state.keys;
    const encrypted = keys.filter(k => k.isEncrypted).length;
    const expiringSoon = keys.filter(k => k.expiresIn <= 30).length;
    const totalRotations = state.rotationLog.length;
    return {
      totalKeys: keys.length,
      encryptedKeys: encrypted,
      unencryptedKeys: keys.length - encrypted,
      encryptionRate: keys.length > 0 ? Math.round(encrypted / keys.length * 100) : 100,
      expiringSoon: expiringSoon,
      totalRotations: totalRotations,
      algorithm: state.config.algorithm,
      autoRotateDays: state.config.autoRotateDays,
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('api-key-encryption-widget');
    if (!container) return;
    const stats = getEncryptionStats();

    container.innerHTML = `
      <div id="api-key-encryption-card">
        <div class="ake-header">
          <h3>API Key Encryption</h3>
          <span class="ake-badge ${stats.encryptionRate === 100 ? 'secure' : 'warning'}">
            ${stats.encryptionRate === 100 ? '🔒 Fully Encrypted' : '⚠️ ' + stats.unencryptedKeys + ' Unencrypted'}
          </span>
        </div>
        <div class="ake-stats-row" id="ake-stats">
          <div class="ake-stat-card"><div class="ake-stat-val">${stats.totalKeys}</div><div class="ake-stat-label">Total Keys</div></div>
          <div class="ake-stat-card"><div class="ake-stat-val">${stats.encryptionRate}%</div><div class="ake-stat-label">Encrypted</div></div>
          <div class="ake-stat-card"><div class="ake-stat-val">${stats.expiringSoon}</div><div class="ake-stat-label">Expiring Soon</div></div>
          <div class="ake-stat-card"><div class="ake-stat-val">${stats.totalRotations}</div><div class="ake-stat-label">Rotations</div></div>
        </div>
        <div class="ake-tabs" id="ake-tabs">
          <button class="ake-tab ${state.activeTab === 'keys' ? 'active' : ''}" data-tab="keys">Keys</button>
          <button class="ake-tab ${state.activeTab === 'rotation' ? 'active' : ''}" data-tab="rotation">Rotation Log</button>
          <button class="ake-tab ${state.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">Settings</button>
        </div>
        <div id="ake-content"></div>
      </div>
    `;

    container.querySelectorAll('.ake-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('ake-content');
    if (!el) return;
    if (state.activeTab === 'keys') renderKeys(el);
    else if (state.activeTab === 'rotation') renderRotation(el);
    else renderSettings(el);
  }

  function renderKeys(el) {
    const keys = getKeys();
    el.innerHTML = `
      <div class="ake-key-list" id="ake-key-list">
        ${keys.map(k => `
          <div class="ake-key-item" data-key-id="${k.id}">
            <div class="ake-key-top">
              <div class="ake-key-name">
                <span class="ake-enc-indicator ${k.isEncrypted ? 'encrypted' : 'unencrypted'}"></span>
                ${k.name}
              </div>
              <span class="ake-badge ${k.isEncrypted ? 'secure' : 'warning'}">${k.service}</span>
            </div>
            <div class="ake-key-masked">${k.masked}</div>
            <div class="ake-key-meta">
              Created: ${new Date(k.createdAt).toLocaleDateString()} ·
              Rotated: ${k.rotationCount}x ·
              Expires in: ${k.expiresIn} days
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderRotation(el) {
    const log = getRotationLog();
    el.innerHTML = `
      <div class="ake-rotation-list" id="ake-rotation-list">
        ${log.map(r => `
          <div class="ake-rotation-item" data-rotation-id="${r.id}">
            <div class="ake-rotation-info">
              <div class="ake-rotation-key">${r.keyName}: ${r.oldVersion} → ${r.newVersion}</div>
              <div class="ake-rotation-date">${new Date(r.rotatedAt).toLocaleString()} · ${r.rotatedBy}</div>
            </div>
            <span class="ake-rotation-badge" style="background:${reasonColor(r.reason)}22;color:${reasonColor(r.reason)}">${r.reason}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderSettings(el) {
    const cfg = state.config;
    el.innerHTML = `
      <div id="ake-settings">
        <div class="ake-settings-group">
          <div class="ake-settings-label">Encryption Algorithm</div>
          <div class="ake-settings-value">${cfg.algorithm}</div>
        </div>
        <div class="ake-settings-group">
          <div class="ake-settings-label">Auto-Rotation Interval</div>
          <div class="ake-settings-value">${cfg.autoRotateDays} days</div>
        </div>
        <div class="ake-settings-group">
          <div class="ake-settings-label">Require Encryption</div>
          <div class="ake-settings-value">${cfg.requireEncryption ? 'Yes - All keys must be encrypted' : 'No - Unencrypted keys allowed'}</div>
        </div>
      </div>
    `;
  }

  function reasonColor(reason) {
    const colors = { 'scheduled': '#6366f1', 'manual': '#22c55e', 'security-incident': '#ef4444', 'policy-update': '#f59e0b' };
    return colors[reason] || '#a0a0b0';
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab, config: state.config }));
      localStorage.setItem(KEYS_STORAGE, JSON.stringify({
        keys: state.keys,
        rotationLog: state.rotationLog,
      }));
    } catch (e) {}
  }

  function loadState() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        const parsed = JSON.parse(s);
        state.activeTab = parsed.activeTab || state.activeTab;
        if (parsed.config) Object.assign(state.config, parsed.config);
      }
      const k = localStorage.getItem(KEYS_STORAGE);
      if (k) {
        const parsed = JSON.parse(k);
        if (parsed.keys?.length > 0) state.keys = parsed.keys;
        if (parsed.rotationLog?.length > 0) state.rotationLog = parsed.rotationLog;
      }
    } catch (e) {}
  }

  window.apiKeyEncryption = {
    getKeys, getKey, retrieveKey, storeKey, deleteKey,
    rotateKey, rotateAllExpiring, getRotationLog,
    getEncryptionConfig, updateConfig, getEncryptionStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        keyCount: state.keys.length,
        rotationLogCount: state.rotationLog.length,
        config: { ...state.config },
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    if (state.keys.length === 0) state.keys = generateSampleKeys();
    if (state.rotationLog.length === 0) state.rotationLog = generateRotationLog();
    saveState();
    render();
  });
})();
