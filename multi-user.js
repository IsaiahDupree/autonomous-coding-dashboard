// feat-102: Multi-user Support
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #multi-user-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .mu-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .mu-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .mu-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .mu-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .mu-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .mu-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .mu-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .mu-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .mu-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .mu-list { display: flex; flex-direction: column; gap: 8px; }
    .mu-user-item, .mu-role-item, .mu-session-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .mu-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .mu-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .mu-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .mu-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'multi-user-config';
  let state = { activeTab: 'users' };

  function getUsers() {
    return [
      { id: 'user-001', name: 'Alice Chen', email: 'alice@example.com', role: 'admin', status: 'online', lastActive: new Date(Date.now() - 60000).toISOString(), features: 45 },
      { id: 'user-002', name: 'Bob Smith', email: 'bob@example.com', role: 'developer', status: 'online', lastActive: new Date(Date.now() - 300000).toISOString(), features: 32 },
      { id: 'user-003', name: 'Carol Davis', email: 'carol@example.com', role: 'developer', status: 'offline', lastActive: new Date(Date.now() - 86400000).toISOString(), features: 28 },
      { id: 'user-004', name: 'Dave Wilson', email: 'dave@example.com', role: 'viewer', status: 'online', lastActive: new Date(Date.now() - 120000).toISOString(), features: 0 },
      { id: 'user-005', name: 'Eve Brown', email: 'eve@example.com', role: 'developer', status: 'away', lastActive: new Date(Date.now() - 1800000).toISOString(), features: 15 },
      { id: 'user-006', name: 'Frank Lee', email: 'frank@example.com', role: 'admin', status: 'offline', lastActive: new Date(Date.now() - 172800000).toISOString(), features: 40 },
    ];
  }

  function getUser(id) { return getUsers().find(u => u.id === id) || null; }
  function getOnlineUsers() { return getUsers().filter(u => u.status === 'online'); }

  function getRoles() {
    return [
      { id: 'role-admin', name: 'Admin', permissions: ['read', 'write', 'delete', 'manage-users', 'config'], userCount: 2, description: 'Full system access' },
      { id: 'role-developer', name: 'Developer', permissions: ['read', 'write', 'execute'], userCount: 3, description: 'Code and feature access' },
      { id: 'role-viewer', name: 'Viewer', permissions: ['read'], userCount: 1, description: 'Read-only access' },
    ];
  }

  function getRole(id) { return getRoles().find(r => r.id === id) || null; }

  function getSessions() {
    return [
      { id: 'sess-001', userId: 'user-001', startedAt: new Date(Date.now() - 3600000).toISOString(), ip: '192.168.1.10', device: 'Chrome/Desktop', active: true },
      { id: 'sess-002', userId: 'user-002', startedAt: new Date(Date.now() - 7200000).toISOString(), ip: '10.0.0.5', device: 'Firefox/Desktop', active: true },
      { id: 'sess-003', userId: 'user-004', startedAt: new Date(Date.now() - 1800000).toISOString(), ip: '172.16.0.3', device: 'Safari/Mobile', active: true },
      { id: 'sess-004', userId: 'user-005', startedAt: new Date(Date.now() - 14400000).toISOString(), ip: '192.168.1.25', device: 'Chrome/Desktop', active: false },
      { id: 'sess-005', userId: 'user-001', startedAt: new Date(Date.now() - 86400000).toISOString(), ip: '192.168.1.10', device: 'Mobile App', active: false },
    ];
  }

  function getSession(id) { return getSessions().find(s => s.id === id) || null; }
  function getActiveSessions() { return getSessions().filter(s => s.active); }

  function getUserStats() {
    return { totalUsers: getUsers().length, onlineUsers: getOnlineUsers().length, roleCount: getRoles().length, activeSessions: getActiveSessions().length };
  }

  function render() {
    const container = document.getElementById('multi-user-widget');
    if (!container) return;
    const stats = getUserStats();
    container.innerHTML = `
      <div id="multi-user-card">
        <div class="mu-header"><h3>Multi-User Management</h3></div>
        <div class="mu-stats-row">
          <div class="mu-stat-card"><div class="mu-stat-val">${stats.totalUsers}</div><div class="mu-stat-label">Users</div></div>
          <div class="mu-stat-card"><div class="mu-stat-val">${stats.onlineUsers}</div><div class="mu-stat-label">Online</div></div>
          <div class="mu-stat-card"><div class="mu-stat-val">${stats.roleCount}</div><div class="mu-stat-label">Roles</div></div>
          <div class="mu-stat-card"><div class="mu-stat-val">${stats.activeSessions}</div><div class="mu-stat-label">Sessions</div></div>
        </div>
        <div class="mu-tabs">
          <button class="mu-tab ${state.activeTab === 'users' ? 'active' : ''}" data-tab="users">Users</button>
          <button class="mu-tab ${state.activeTab === 'roles' ? 'active' : ''}" data-tab="roles">Roles</button>
          <button class="mu-tab ${state.activeTab === 'sessions' ? 'active' : ''}" data-tab="sessions">Sessions</button>
        </div>
        <div id="mu-content"></div>
      </div>`;
    container.querySelectorAll('.mu-tab').forEach(btn => { btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); }); });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('mu-content');
    if (!el) return;
    if (state.activeTab === 'users') renderUsers(el);
    else if (state.activeTab === 'roles') renderRoles(el);
    else renderSessions(el);
  }

  const statusColors = { online: '#22c55e', offline: '#6b7280', away: '#f59e0b' };

  function renderUsers(el) {
    el.innerHTML = `<div class="mu-list" id="mu-user-list">${getUsers().map(u => `
      <div class="mu-user-item" data-id="${u.id}"><div class="mu-item-top"><div class="mu-item-name">${u.name}</div>
      <span class="mu-badge" style="background:${statusColors[u.status]}22;color:${statusColors[u.status]}">${u.status}</span></div>
      <div class="mu-item-detail">${u.email} · ${u.role} · ${u.features} features</div></div>`).join('')}</div>`;
  }

  function renderRoles(el) {
    el.innerHTML = `<div id="mu-role-section"><div class="mu-list" id="mu-role-list">${getRoles().map(r => `
      <div class="mu-role-item" data-id="${r.id}"><div class="mu-item-top"><div class="mu-item-name">${r.name}</div>
      <span class="mu-badge" style="background:#6366f122;color:#6366f1">${r.userCount} users</span></div>
      <div class="mu-item-detail">${r.description} · Permissions: ${r.permissions.join(', ')}</div></div>`).join('')}</div></div>`;
  }

  function renderSessions(el) {
    el.innerHTML = `<div id="mu-session-section"><div class="mu-list" id="mu-session-list">${getSessions().map(s => `
      <div class="mu-session-item" data-id="${s.id}"><div class="mu-item-top"><div class="mu-item-name">${s.userId} - ${s.device}</div>
      <span class="mu-badge" style="background:${s.active ? '#22c55e' : '#6b7280'}22;color:${s.active ? '#22c55e' : '#6b7280'}">${s.active ? 'Active' : 'Ended'}</span></div>
      <div class="mu-item-detail">IP: ${s.ip} · Started: ${new Date(s.startedAt).toLocaleString()}</div></div>`).join('')}</div></div>`;
  }

  function saveState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab })); } catch (e) {} }
  function loadState() { try { const s = localStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); state.activeTab = p.activeTab || state.activeTab; } } catch (e) {} }

  window.multiUser = {
    getUsers, getUser, getOnlineUsers, getRoles, getRole, getSessions, getSession, getActiveSessions, getUserStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() { return { activeTab: state.activeTab, userCount: getUsers().length, onlineCount: getOnlineUsers().length, roleCount: getRoles().length, sessionCount: getSessions().length }; },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
