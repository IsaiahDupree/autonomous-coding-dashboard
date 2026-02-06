// feat-079: Audit Log for All Actions
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #audit-log-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .al-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .al-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .al-tabs {
      display: flex; gap: 4px; margin-bottom: 16px;
      background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px;
    }
    .al-tab {
      flex: 1; padding: 6px 12px; border: none; background: transparent;
      color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px;
      font-size: 13px; transition: all 0.2s;
    }
    .al-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .al-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .al-stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .al-stat-card {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px; text-align: center;
    }
    .al-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .al-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }

    /* Log entries */
    .al-log-list { display: flex; flex-direction: column; gap: 6px; }
    .al-log-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px 14px; display: flex; align-items: center; gap: 12px;
    }
    .al-log-icon {
      width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center;
      justify-content: center; font-size: 14px; flex-shrink: 0;
    }
    .al-log-body { flex: 1; min-width: 0; }
    .al-log-action { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .al-log-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 2px; }
    .al-log-meta {
      display: flex; gap: 12px; font-size: 11px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px;
    }
    .al-log-badge {
      font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; flex-shrink: 0;
    }

    /* Filters */
    .al-filter-bar {
      display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;
    }
    .al-filter-chip {
      padding: 4px 10px; border: 1px solid var(--color-border, #2e2e3e);
      background: transparent; color: var(--color-text-secondary, #a0a0b0);
      border-radius: 16px; font-size: 12px; cursor: pointer; transition: all 0.2s;
    }
    .al-filter-chip.active { background: #6366f122; color: #6366f1; border-color: #6366f144; }
    .al-filter-chip:hover:not(.active) { background: rgba(255,255,255,0.05); }

    /* User summary */
    .al-user-list { display: flex; flex-direction: column; gap: 10px; }
    .al-user-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .al-user-top { display: flex; justify-content: space-between; align-items: center; }
    .al-user-name { font-size: 14px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .al-user-count { font-size: 16px; font-weight: 700; color: #6366f1; }
    .al-user-bar-track { height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; margin-top: 8px; }
    .al-user-bar-fill { height: 6px; border-radius: 3px; transition: width 0.3s; }
    .al-user-meta { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 6px; }

    /* Export */
    .al-export-section {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 16px;
    }
    .al-export-title { font-size: 14px; font-weight: 600; color: var(--color-text, #e0e0e0); margin-bottom: 12px; }
    .al-export-btns { display: flex; gap: 8px; }
    .al-export-btn {
      padding: 8px 16px; border: 1px solid var(--color-border, #2e2e3e);
      background: transparent; color: var(--color-text, #e0e0e0);
      border-radius: 6px; font-size: 13px; cursor: pointer; transition: all 0.2s;
    }
    .al-export-btn:hover { background: rgba(255,255,255,0.05); }
    .al-export-btn.primary { background: #6366f1; border-color: #6366f1; color: #fff; }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'audit-log-config';
  const LOG_STORAGE = 'audit-log-entries';

  const ACTION_TYPES = {
    'feature.start': { icon: '▶️', color: '#6366f1', label: 'Feature Started' },
    'feature.complete': { icon: '✅', color: '#22c55e', label: 'Feature Completed' },
    'feature.fail': { icon: '❌', color: '#ef4444', label: 'Feature Failed' },
    'config.change': { icon: '⚙️', color: '#f59e0b', label: 'Config Changed' },
    'key.access': { icon: '🔑', color: '#06b6d4', label: 'Key Accessed' },
    'key.rotate': { icon: '🔄', color: '#8b5cf6', label: 'Key Rotated' },
    'deploy.start': { icon: '🚀', color: '#6366f1', label: 'Deploy Started' },
    'deploy.complete': { icon: '🎯', color: '#22c55e', label: 'Deploy Completed' },
    'user.login': { icon: '👤', color: '#06b6d4', label: 'User Login' },
    'user.logout': { icon: '👋', color: '#a0a0b0', label: 'User Logout' },
    'test.run': { icon: '🧪', color: '#f59e0b', label: 'Test Run' },
    'export.generate': { icon: '📦', color: '#8b5cf6', label: 'Export Generated' },
  };

  let state = {
    activeTab: 'log',
    entries: [],
    filter: 'all',
  };

  function generateSampleEntries() {
    const users = [
      { name: 'Admin', role: 'admin', ip: '192.168.1.10' },
      { name: 'Claude Agent', role: 'agent', ip: '10.0.0.1' },
      { name: 'Alice Chen', role: 'developer', ip: '192.168.1.25' },
      { name: 'System', role: 'system', ip: '127.0.0.1' },
    ];
    const actionKeys = Object.keys(ACTION_TYPES);
    const entries = [];
    const now = Date.now();

    for (let i = 0; i < 50; i++) {
      const action = actionKeys[i % actionKeys.length];
      const user = users[i % users.length];
      const featNum = 40 + (i % 40);
      const fid = 'feat-' + String(featNum).padStart(3, '0');

      entries.push({
        id: 'log-' + String(i).padStart(4, '0'),
        action: action,
        actionLabel: ACTION_TYPES[action].label,
        category: action.split('.')[0],
        description: generateDescription(action, fid),
        user: user.name,
        userRole: user.role,
        userIp: user.ip,
        timestamp: new Date(now - i * 1800000).toISOString(),
        metadata: { featureId: fid, duration: Math.floor(Math.random() * 300) + 10 },
        severity: action.includes('fail') ? 'error' : action.includes('key') ? 'warning' : 'info',
      });
    }
    return entries;
  }

  function generateDescription(action, fid) {
    const descriptions = {
      'feature.start': `Started implementation of ${fid}`,
      'feature.complete': `Completed ${fid} - all tests passing`,
      'feature.fail': `${fid} implementation failed - test errors`,
      'config.change': `Updated dashboard configuration`,
      'key.access': `Accessed API key for service integration`,
      'key.rotate': `Rotated API key for security compliance`,
      'deploy.start': `Started deployment pipeline for ${fid}`,
      'deploy.complete': `Deployment completed for ${fid}`,
      'user.login': `User authenticated successfully`,
      'user.logout': `User session ended`,
      'test.run': `Executed test suite for ${fid}`,
      'export.generate': `Generated analytics export report`,
    };
    return descriptions[action] || `Action: ${action}`;
  }

  // ── Core API ──────────────────────────────────────────────────
  function getEntries(options) {
    let entries = [...state.entries];
    if (options?.category && options.category !== 'all') {
      entries = entries.filter(e => e.category === options.category);
    }
    if (options?.user) {
      entries = entries.filter(e => e.user === options.user);
    }
    if (options?.severity) {
      entries = entries.filter(e => e.severity === options.severity);
    }
    if (options?.from) {
      entries = entries.filter(e => new Date(e.timestamp) >= new Date(options.from));
    }
    if (options?.to) {
      entries = entries.filter(e => new Date(e.timestamp) <= new Date(options.to));
    }
    if (options?.limit) {
      entries = entries.slice(0, options.limit);
    }
    return entries;
  }

  function getEntry(id) {
    return state.entries.find(e => e.id === id) || null;
  }

  function logAction(action, description, user, metadata) {
    const entry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      action: action,
      actionLabel: ACTION_TYPES[action]?.label || action,
      category: action.split('.')[0],
      description: description,
      user: user || 'System',
      userRole: 'system',
      userIp: '127.0.0.1',
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
      severity: action.includes('fail') ? 'error' : action.includes('key') ? 'warning' : 'info',
    };
    state.entries.unshift(entry);
    saveState();
    render();
    return entry.id;
  }

  function getUserSummary() {
    const userMap = {};
    state.entries.forEach(e => {
      if (!userMap[e.user]) {
        userMap[e.user] = {
          name: e.user,
          role: e.userRole,
          actionCount: 0,
          lastAction: e.timestamp,
          categories: {},
        };
      }
      userMap[e.user].actionCount++;
      const cat = e.category;
      userMap[e.user].categories[cat] = (userMap[e.user].categories[cat] || 0) + 1;
    });
    const users = Object.values(userMap);
    const maxActions = Math.max(...users.map(u => u.actionCount), 1);
    return users.map(u => ({ ...u, percentage: Math.round(u.actionCount / maxActions * 100) }))
      .sort((a, b) => b.actionCount - a.actionCount);
  }

  function getCategories() {
    const catMap = {};
    state.entries.forEach(e => {
      if (!catMap[e.category]) catMap[e.category] = 0;
      catMap[e.category]++;
    });
    return Object.entries(catMap).map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  function getStats() {
    const entries = state.entries;
    const now = new Date();
    const last24h = entries.filter(e => (now - new Date(e.timestamp)) < 86400000);
    const errors = entries.filter(e => e.severity === 'error');
    const uniqueUsers = new Set(entries.map(e => e.user));
    return {
      totalEntries: entries.length,
      last24Hours: last24h.length,
      errorCount: errors.length,
      uniqueUsers: uniqueUsers.size,
    };
  }

  function exportAuditLog(format) {
    const entries = state.entries;
    if (format === 'json') {
      return {
        format: 'json',
        data: JSON.stringify(entries, null, 2),
        filename: `audit-log-${new Date().toISOString().split('T')[0]}.json`,
        entryCount: entries.length,
        exportedAt: new Date().toISOString(),
      };
    } else if (format === 'csv') {
      const headers = 'ID,Action,Category,Description,User,Role,IP,Timestamp,Severity';
      const rows = entries.map(e =>
        `${e.id},${e.action},${e.category},"${e.description}",${e.user},${e.userRole},${e.userIp},${e.timestamp},${e.severity}`
      );
      return {
        format: 'csv',
        data: headers + '\n' + rows.join('\n'),
        filename: `audit-log-${new Date().toISOString().split('T')[0]}.csv`,
        entryCount: entries.length,
        exportedAt: new Date().toISOString(),
      };
    } else {
      const lines = entries.map(e =>
        `[${e.timestamp}] [${e.severity.toUpperCase()}] ${e.user} (${e.userRole}): ${e.actionLabel} - ${e.description}`
      );
      return {
        format: 'text',
        data: lines.join('\n'),
        filename: `audit-log-${new Date().toISOString().split('T')[0]}.txt`,
        entryCount: entries.length,
        exportedAt: new Date().toISOString(),
      };
    }
  }

  function clearLog() {
    state.entries = [];
    saveState();
    render();
    return true;
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('audit-log-widget');
    if (!container) return;
    const stats = getStats();

    container.innerHTML = `
      <div id="audit-log-card">
        <div class="al-header"><h3>Audit Log</h3></div>
        <div class="al-stats-row" id="al-stats">
          <div class="al-stat-card"><div class="al-stat-val">${stats.totalEntries}</div><div class="al-stat-label">Total Entries</div></div>
          <div class="al-stat-card"><div class="al-stat-val">${stats.last24Hours}</div><div class="al-stat-label">Last 24h</div></div>
          <div class="al-stat-card"><div class="al-stat-val">${stats.errorCount}</div><div class="al-stat-label">Errors</div></div>
          <div class="al-stat-card"><div class="al-stat-val">${stats.uniqueUsers}</div><div class="al-stat-label">Users</div></div>
        </div>
        <div class="al-tabs" id="al-tabs">
          <button class="al-tab ${state.activeTab === 'log' ? 'active' : ''}" data-tab="log">Activity Log</button>
          <button class="al-tab ${state.activeTab === 'users' ? 'active' : ''}" data-tab="users">User Summary</button>
          <button class="al-tab ${state.activeTab === 'export' ? 'active' : ''}" data-tab="export">Export</button>
        </div>
        <div id="al-content"></div>
      </div>
    `;

    container.querySelectorAll('.al-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('al-content');
    if (!el) return;
    if (state.activeTab === 'log') renderLog(el);
    else if (state.activeTab === 'users') renderUsers(el);
    else renderExport(el);
  }

  function renderLog(el) {
    const categories = getCategories();
    const entries = state.filter === 'all' ? state.entries.slice(0, 30) : state.entries.filter(e => e.category === state.filter).slice(0, 30);

    el.innerHTML = `
      <div class="al-filter-bar" id="al-filters">
        <button class="al-filter-chip ${state.filter === 'all' ? 'active' : ''}" data-filter="all">All</button>
        ${categories.map(c => `
          <button class="al-filter-chip ${state.filter === c.name ? 'active' : ''}" data-filter="${c.name}">${c.name} (${c.count})</button>
        `).join('')}
      </div>
      <div class="al-log-list" id="al-log-list">
        ${entries.map(e => {
          const aType = ACTION_TYPES[e.action] || { icon: '📝', color: '#a0a0b0' };
          return `
            <div class="al-log-item" data-entry-id="${e.id}">
              <div class="al-log-icon" style="background:${aType.color}22">${aType.icon}</div>
              <div class="al-log-body">
                <div class="al-log-action">${e.actionLabel}</div>
                <div class="al-log-detail">${escapeHtml(e.description)}</div>
                <div class="al-log-meta">
                  <span>${e.user} (${e.userRole})</span>
                  <span>${e.userIp}</span>
                  <span>${new Date(e.timestamp).toLocaleString()}</span>
                </div>
              </div>
              <span class="al-log-badge" style="background:${severityColor(e.severity)}22;color:${severityColor(e.severity)}">${e.severity}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;

    el.querySelectorAll('.al-filter-chip').forEach(chip => {
      chip.addEventListener('click', () => { state.filter = chip.dataset.filter; renderLog(el); });
    });
  }

  function renderUsers(el) {
    const users = getUserSummary();
    el.innerHTML = `
      <div class="al-user-list" id="al-user-list">
        ${users.map(u => `
          <div class="al-user-item" data-user="${u.name}">
            <div class="al-user-top">
              <div class="al-user-name">${u.name} <span style="font-size:12px;color:var(--color-text-secondary,#a0a0b0)">(${u.role})</span></div>
              <div class="al-user-count">${u.actionCount} actions</div>
            </div>
            <div class="al-user-bar-track">
              <div class="al-user-bar-fill" style="width:${u.percentage}%;background:#6366f1"></div>
            </div>
            <div class="al-user-meta">
              Last active: ${new Date(u.lastAction).toLocaleString()} ·
              Categories: ${Object.entries(u.categories).map(([k, v]) => `${k}(${v})`).join(', ')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderExport(el) {
    el.innerHTML = `
      <div class="al-export-section" id="al-export-section">
        <div class="al-export-title">Export Audit Log</div>
        <p style="font-size:13px;color:var(--color-text-secondary,#a0a0b0);margin-bottom:16px">
          Export the full audit log in various formats for compliance and record-keeping.
        </p>
        <div class="al-export-btns" id="al-export-btns">
          <button class="al-export-btn primary" data-format="json">Export JSON</button>
          <button class="al-export-btn" data-format="csv">Export CSV</button>
          <button class="al-export-btn" data-format="text">Export Text</button>
        </div>
      </div>
    `;
  }

  function severityColor(severity) {
    return severity === 'error' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#6366f1';
  }

  function escapeHtml(str) { return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab, filter: state.filter }));
      localStorage.setItem(LOG_STORAGE, JSON.stringify(state.entries));
    } catch (e) {}
  }

  function loadState() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        const parsed = JSON.parse(s);
        state.activeTab = parsed.activeTab || state.activeTab;
        state.filter = parsed.filter || state.filter;
      }
      const l = localStorage.getItem(LOG_STORAGE);
      if (l) {
        const entries = JSON.parse(l);
        if (entries?.length > 0) state.entries = entries;
      }
    } catch (e) {}
  }

  window.auditLog = {
    getEntries, getEntry, logAction, getUserSummary, getCategories,
    getStats, exportAuditLog, clearLog,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        entryCount: state.entries.length,
        filter: state.filter,
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    if (state.entries.length === 0) state.entries = generateSampleEntries();
    saveState();
    render();
  });
})();
