// feat-091: Mobile App Notifications
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #mobile-notifications-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .mn-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .mn-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .mn-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .mn-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .mn-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .mn-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .mn-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .mn-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .mn-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .mn-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .mn-list { display: flex; flex-direction: column; gap: 8px; }
    .mn-notif-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .mn-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .mn-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .mn-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .mn-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .mn-action-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .mn-action-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .mn-action-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .mn-action-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .mn-overview-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .mn-overview-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .mn-overview-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .mn-overview-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'mobile-notifications-config';

  let state = {
    activeTab: 'push',
    notifications: [],
    preferences: { pushEnabled: true, soundEnabled: true, vibrationEnabled: true, quietHoursStart: 22, quietHoursEnd: 7 },
  };

  function generateNotifications() {
    return [
      { id: 'pn-001', title: 'Feature Completed', body: 'feat-085 has passed all tests', type: 'success', category: 'feature', priority: 'high', read: true, timestamp: new Date(Date.now() - 1800000).toISOString(), actionable: true },
      { id: 'pn-002', title: 'Build Failed', body: 'Build #142 failed with 3 errors', type: 'error', category: 'build', priority: 'critical', read: false, timestamp: new Date(Date.now() - 3600000).toISOString(), actionable: true },
      { id: 'pn-003', title: 'Agent Started', body: 'Agent agent-003 started working on feat-090', type: 'info', category: 'agent', priority: 'medium', read: true, timestamp: new Date(Date.now() - 7200000).toISOString(), actionable: false },
      { id: 'pn-004', title: 'Memory Alert', body: 'Memory usage exceeded 80% threshold', type: 'warning', category: 'system', priority: 'high', read: false, timestamp: new Date(Date.now() - 14400000).toISOString(), actionable: true },
      { id: 'pn-005', title: 'Test Results', body: '65/65 tests passed for feat-086', type: 'success', category: 'test', priority: 'medium', read: true, timestamp: new Date(Date.now() - 21600000).toISOString(), actionable: false },
      { id: 'pn-006', title: 'Deploy Complete', body: 'Version 2.1.0 deployed to staging', type: 'info', category: 'deploy', priority: 'medium', read: false, timestamp: new Date(Date.now() - 43200000).toISOString(), actionable: true },
      { id: 'pn-007', title: 'Security Alert', body: 'Unusual API activity detected', type: 'error', category: 'security', priority: 'critical', read: false, timestamp: new Date(Date.now() - 86400000).toISOString(), actionable: true },
      { id: 'pn-008', title: 'Backup Complete', body: 'Daily backup completed successfully', type: 'success', category: 'backup', priority: 'low', read: true, timestamp: new Date(Date.now() - 172800000).toISOString(), actionable: false },
    ];
  }

  function getQuickActions() {
    return [
      { id: 'qa-001', name: 'Start Build', icon: '🔨', action: 'build.start', description: 'Trigger a new build', enabled: true },
      { id: 'qa-002', name: 'Restart Agent', icon: '🔄', action: 'agent.restart', description: 'Restart the active agent', enabled: true },
      { id: 'qa-003', name: 'View Logs', icon: '📋', action: 'logs.view', description: 'Open recent logs', enabled: true },
      { id: 'qa-004', name: 'Run Tests', icon: '🧪', action: 'tests.run', description: 'Execute test suite', enabled: true },
      { id: 'qa-005', name: 'Deploy', icon: '🚀', action: 'deploy.trigger', description: 'Deploy to staging', enabled: false },
      { id: 'qa-006', name: 'Create Backup', icon: '💾', action: 'backup.create', description: 'Create manual backup', enabled: true },
    ];
  }

  function getStatusOverview() {
    return [
      { id: 'so-001', name: 'Features', status: 'good', value: '90/120 passing', percent: 75, icon: '✅' },
      { id: 'so-002', name: 'Active Agents', status: 'good', value: '3 running', percent: 100, icon: '🤖' },
      { id: 'so-003', name: 'Build Status', status: 'warning', value: 'Last failed', percent: 0, icon: '🔨' },
      { id: 'so-004', name: 'System Health', status: 'good', value: '99.8% uptime', percent: 99.8, icon: '💚' },
      { id: 'so-005', name: 'Memory', status: 'good', value: '45% used', percent: 45, icon: '📊' },
      { id: 'so-006', name: 'Errors', status: 'warning', value: '2 unresolved', percent: 20, icon: '⚠️' },
    ];
  }

  function initState() {
    if (state.notifications.length === 0) state.notifications = generateNotifications();
  }

  // ── API ────────────────────────────────────────────────────────
  function getNotifications(filter) {
    initState();
    let list = [...state.notifications];
    if (filter?.type) list = list.filter(n => n.type === filter.type);
    if (filter?.category) list = list.filter(n => n.category === filter.category);
    if (filter?.read !== undefined) list = list.filter(n => n.read === filter.read);
    if (filter?.priority) list = list.filter(n => n.priority === filter.priority);
    return list;
  }

  function getNotification(id) {
    initState();
    return state.notifications.find(n => n.id === id) || null;
  }

  function markAsRead(id) {
    initState();
    const notif = state.notifications.find(n => n.id === id);
    if (!notif) return false;
    notif.read = true;
    saveState();
    render();
    return true;
  }

  function markAllAsRead() {
    initState();
    state.notifications.forEach(n => n.read = true);
    saveState();
    render();
    return true;
  }

  function deleteNotification(id) {
    initState();
    const idx = state.notifications.findIndex(n => n.id === id);
    if (idx === -1) return false;
    state.notifications.splice(idx, 1);
    saveState();
    render();
    return true;
  }

  function sendPushNotification(title, body, options) {
    initState();
    const id = 'pn-' + String(state.notifications.length + 1).padStart(3, '0');
    const notif = {
      id, title, body,
      type: options?.type || 'info',
      category: options?.category || 'system',
      priority: options?.priority || 'medium',
      read: false, actionable: options?.actionable || false,
      timestamp: new Date().toISOString(),
    };
    state.notifications.unshift(notif);
    saveState();
    render();
    return id;
  }

  function getPreferences() {
    return { ...state.preferences };
  }

  function updatePreferences(updates) {
    Object.assign(state.preferences, updates);
    saveState();
    return { ...state.preferences };
  }

  function executeQuickAction(actionId) {
    const actions = getQuickActions();
    const action = actions.find(a => a.id === actionId);
    if (!action || !action.enabled) return null;
    return { success: true, action: action.action, executedAt: new Date().toISOString(), message: `${action.name} executed successfully` };
  }

  function getUnreadCount() {
    initState();
    return state.notifications.filter(n => !n.read).length;
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('mobile-notifications-widget');
    if (!container) return;
    initState();
    const unread = getUnreadCount();
    const actions = getQuickActions();
    const overview = getStatusOverview();

    container.innerHTML = `
      <div id="mobile-notifications-card">
        <div class="mn-header"><h3>Mobile App Notifications</h3></div>
        <div class="mn-stats-row">
          <div class="mn-stat-card"><div class="mn-stat-val">${state.notifications.length}</div><div class="mn-stat-label">Notifications</div></div>
          <div class="mn-stat-card"><div class="mn-stat-val">${unread}</div><div class="mn-stat-label">Unread</div></div>
          <div class="mn-stat-card"><div class="mn-stat-val">${actions.filter(a => a.enabled).length}</div><div class="mn-stat-label">Quick Actions</div></div>
          <div class="mn-stat-card"><div class="mn-stat-val">${overview.filter(o => o.status === 'good').length}/${overview.length}</div><div class="mn-stat-label">Systems OK</div></div>
        </div>
        <div class="mn-tabs">
          <button class="mn-tab ${state.activeTab === 'push' ? 'active' : ''}" data-tab="push">Push Notifications</button>
          <button class="mn-tab ${state.activeTab === 'actions' ? 'active' : ''}" data-tab="actions">Quick Actions</button>
          <button class="mn-tab ${state.activeTab === 'overview' ? 'active' : ''}" data-tab="overview">Status Overview</button>
        </div>
        <div id="mn-content"></div>
      </div>
    `;

    container.querySelectorAll('.mn-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('mn-content');
    if (!el) return;
    if (state.activeTab === 'push') renderPush(el);
    else if (state.activeTab === 'actions') renderActions(el);
    else renderOverview(el);
  }

  function renderPush(el) {
    const notifs = getNotifications();
    const typeColors = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#6366f1' };
    el.innerHTML = `
      <div class="mn-list" id="mn-notif-list">
        ${notifs.map(n => `
          <div class="mn-notif-item" data-id="${n.id}" style="${!n.read ? 'border-left: 3px solid ' + (typeColors[n.type] || '#6366f1') : ''}">
            <div class="mn-item-top">
              <div class="mn-item-name">${n.title}</div>
              <span class="mn-badge" style="background:${typeColors[n.type]}22;color:${typeColors[n.type]}">${n.priority}</span>
            </div>
            <div class="mn-item-detail">${n.body}</div>
            <div class="mn-item-detail">${n.category} · ${n.read ? 'Read' : 'Unread'} · ${new Date(n.timestamp).toLocaleString()}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderActions(el) {
    const actions = getQuickActions();
    el.innerHTML = `
      <div id="mn-actions-section">
        <div class="mn-list" id="mn-action-list">
          ${actions.map(a => `
            <div class="mn-action-item" data-id="${a.id}">
              <div class="mn-action-top">
                <div class="mn-action-name">${a.icon} ${a.name}</div>
                <span class="mn-badge" style="background:${a.enabled ? '#22c55e' : '#6b7280'}22;color:${a.enabled ? '#22c55e' : '#6b7280'}">${a.enabled ? 'Available' : 'Disabled'}</span>
              </div>
              <div class="mn-action-detail">${a.description}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderOverview(el) {
    const overview = getStatusOverview();
    const statusColors = { good: '#22c55e', warning: '#f59e0b', error: '#ef4444' };
    el.innerHTML = `
      <div id="mn-overview-section">
        <div class="mn-list" id="mn-overview-list">
          ${overview.map(o => `
            <div class="mn-overview-item" data-id="${o.id}">
              <div class="mn-overview-top">
                <div class="mn-overview-name">${o.icon} ${o.name}</div>
                <span class="mn-badge" style="background:${statusColors[o.status]}22;color:${statusColors[o.status]}">${o.status}</span>
              </div>
              <div class="mn-overview-detail">${o.value}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab, preferences: state.preferences })); } catch (e) {}
  }
  function loadState() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) { const p = JSON.parse(s); state.activeTab = p.activeTab || state.activeTab; if (p.preferences) state.preferences = p.preferences; }
    } catch (e) {}
  }

  window.mobileNotifications = {
    getNotifications, getNotification, markAsRead, markAllAsRead,
    deleteNotification, sendPushNotification, getPreferences, updatePreferences,
    getQuickActions, executeQuickAction, getStatusOverview, getUnreadCount,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      initState();
      return {
        activeTab: state.activeTab,
        notificationCount: state.notifications.length,
        unreadCount: getUnreadCount(),
        preferences: state.preferences,
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
