// feat-080: Role-Based Access Control
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #rbac-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .rb-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .rb-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .rb-tabs {
      display: flex; gap: 4px; margin-bottom: 16px;
      background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px;
    }
    .rb-tab {
      flex: 1; padding: 6px 12px; border: none; background: transparent;
      color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px;
      font-size: 13px; transition: all 0.2s;
    }
    .rb-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .rb-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .rb-stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .rb-stat-card {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px; text-align: center;
    }
    .rb-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .rb-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }

    /* Role cards */
    .rb-role-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .rb-role-card {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 16px;
    }
    .rb-role-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .rb-role-name { font-size: 15px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .rb-role-badge {
      font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600;
    }
    .rb-role-desc { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-bottom: 10px; }
    .rb-perm-list { display: flex; flex-wrap: wrap; gap: 4px; }
    .rb-perm-tag {
      font-size: 11px; padding: 2px 8px; border-radius: 12px;
      background: rgba(255,255,255,0.05); color: var(--color-text-secondary, #a0a0b0);
    }
    .rb-perm-tag.granted { background: #22c55e22; color: #22c55e; }
    .rb-perm-tag.denied { background: #ef444422; color: #ef4444; text-decoration: line-through; }

    /* Permission matrix */
    .rb-matrix-container { overflow-x: auto; }
    .rb-matrix {
      width: 100%; border-collapse: collapse; font-size: 12px;
    }
    .rb-matrix th, .rb-matrix td {
      padding: 8px 12px; border: 1px solid var(--color-border, #2e2e3e); text-align: center;
    }
    .rb-matrix th {
      background: var(--color-bg, #12121a); color: var(--color-text, #e0e0e0); font-weight: 600;
    }
    .rb-matrix td { color: var(--color-text-secondary, #a0a0b0); }
    .rb-matrix td.first-col { text-align: left; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .rb-check { color: #22c55e; font-weight: 700; }
    .rb-cross { color: #ef4444; font-weight: 700; }

    /* Users */
    .rb-user-list { display: flex; flex-direction: column; gap: 8px; }
    .rb-user-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px 14px; display: flex; align-items: center; gap: 12px;
    }
    .rb-user-avatar {
      width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center;
      justify-content: center; font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .rb-user-info { flex: 1; }
    .rb-user-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .rb-user-email { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .rb-user-role-tag {
      font-size: 11px; padding: 3px 10px; border-radius: 4px; font-weight: 600;
    }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'rbac-config';

  const PERMISSIONS = [
    'dashboard.view',
    'dashboard.edit',
    'features.view',
    'features.manage',
    'harness.start',
    'harness.stop',
    'harness.configure',
    'keys.view',
    'keys.manage',
    'keys.rotate',
    'users.view',
    'users.manage',
    'audit.view',
    'audit.export',
    'deploy.trigger',
    'deploy.rollback',
    'settings.view',
    'settings.edit',
  ];

  const ROLES = [
    {
      id: 'admin',
      name: 'Administrator',
      description: 'Full access to all features and settings',
      color: '#ef4444',
      level: 100,
      permissions: [...PERMISSIONS],
      isSystem: true,
    },
    {
      id: 'manager',
      name: 'Manager',
      description: 'Manage features, users, and deployments',
      color: '#f59e0b',
      level: 75,
      permissions: PERMISSIONS.filter(p => !['users.manage', 'settings.edit', 'keys.manage'].includes(p)),
      isSystem: true,
    },
    {
      id: 'developer',
      name: 'Developer',
      description: 'View and manage features, run harness',
      color: '#6366f1',
      level: 50,
      permissions: PERMISSIONS.filter(p =>
        ['dashboard.view', 'dashboard.edit', 'features.view', 'features.manage',
         'harness.start', 'harness.stop', 'keys.view', 'audit.view', 'settings.view'].includes(p)
      ),
      isSystem: true,
    },
    {
      id: 'viewer',
      name: 'Viewer',
      description: 'Read-only access to dashboards and reports',
      color: '#22c55e',
      level: 25,
      permissions: PERMISSIONS.filter(p => p.endsWith('.view')),
      isSystem: true,
    },
  ];

  const USERS = [
    { id: 'u-1', name: 'Admin User', email: 'admin@dashboard.io', role: 'admin', avatar: 'A', lastActive: new Date(Date.now() - 300000).toISOString() },
    { id: 'u-2', name: 'Alice Chen', email: 'alice@example.com', role: 'manager', avatar: 'AC', lastActive: new Date(Date.now() - 3600000).toISOString() },
    { id: 'u-3', name: 'Bob Smith', email: 'bob@example.com', role: 'developer', avatar: 'BS', lastActive: new Date(Date.now() - 7200000).toISOString() },
    { id: 'u-4', name: 'Claude Agent', email: 'claude@anthropic.com', role: 'developer', avatar: 'CA', lastActive: new Date(Date.now() - 600000).toISOString() },
    { id: 'u-5', name: 'Guest User', email: 'guest@dashboard.io', role: 'viewer', avatar: 'G', lastActive: new Date(Date.now() - 86400000).toISOString() },
  ];

  let state = {
    activeTab: 'roles',
    roles: JSON.parse(JSON.stringify(ROLES)),
    users: JSON.parse(JSON.stringify(USERS)),
    currentUser: 'u-1',
  };

  // ── Core API ──────────────────────────────────────────────────
  function getRoles() {
    return state.roles.map(r => ({
      id: r.id, name: r.name, description: r.description, color: r.color,
      level: r.level, permissionCount: r.permissions.length,
      totalPermissions: PERMISSIONS.length, isSystem: r.isSystem,
    }));
  }

  function getRole(id) {
    const r = state.roles.find(r => r.id === id);
    if (!r) return null;
    return {
      ...r, permissionCount: r.permissions.length,
      totalPermissions: PERMISSIONS.length,
    };
  }

  function createRole(name, description, permissions, level) {
    const id = 'role-' + Math.random().toString(36).substring(2, 8);
    const newRole = {
      id, name, description, color: '#6366f1',
      level: level || 50,
      permissions: permissions || [],
      isSystem: false,
    };
    state.roles.push(newRole);
    saveState();
    render();
    return id;
  }

  function updateRole(id, updates) {
    const r = state.roles.find(r => r.id === id);
    if (!r) return false;
    if (updates.permissions) r.permissions = updates.permissions;
    if (updates.name) r.name = updates.name;
    if (updates.description) r.description = updates.description;
    if (updates.level !== undefined) r.level = updates.level;
    saveState();
    render();
    return true;
  }

  function deleteRole(id) {
    const r = state.roles.find(r => r.id === id);
    if (!r || r.isSystem) return false;
    state.roles = state.roles.filter(r => r.id !== id);
    saveState();
    render();
    return true;
  }

  function getPermissions() {
    return PERMISSIONS.map(p => {
      const [resource, action] = p.split('.');
      return { id: p, resource, action };
    });
  }

  function getPermissionMatrix() {
    return PERMISSIONS.map(p => {
      const row = { permission: p };
      state.roles.forEach(r => { row[r.id] = r.permissions.includes(p); });
      return row;
    });
  }

  function checkPermission(roleId, permission) {
    const role = state.roles.find(r => r.id === roleId);
    if (!role) return false;
    return role.permissions.includes(permission);
  }

  function getUsers() {
    return state.users.map(u => {
      const role = state.roles.find(r => r.id === u.role);
      return {
        id: u.id, name: u.name, email: u.email,
        role: u.role, roleName: role?.name || 'Unknown',
        roleColor: role?.color || '#a0a0b0',
        roleLevel: role?.level || 0,
        avatar: u.avatar, lastActive: u.lastActive,
      };
    });
  }

  function getUser(id) {
    const u = state.users.find(u => u.id === id);
    if (!u) return null;
    const role = state.roles.find(r => r.id === u.role);
    return {
      ...u, roleName: role?.name || 'Unknown',
      roleColor: role?.color || '#a0a0b0',
      permissions: role?.permissions || [],
    };
  }

  function assignRole(userId, roleId) {
    const u = state.users.find(u => u.id === userId);
    const r = state.roles.find(r => r.id === roleId);
    if (!u || !r) return false;
    u.role = roleId;
    saveState();
    render();
    return true;
  }

  function canPerformAction(userId, permission) {
    const u = state.users.find(u => u.id === userId);
    if (!u) return false;
    return checkPermission(u.role, permission);
  }

  function getRestrictedActions() {
    const sensitive = ['keys.manage', 'keys.rotate', 'users.manage', 'settings.edit', 'deploy.rollback', 'harness.configure'];
    return sensitive.map(p => {
      const allowed = state.roles.filter(r => r.permissions.includes(p)).map(r => r.name);
      const restricted = state.roles.filter(r => !r.permissions.includes(p)).map(r => r.name);
      return { permission: p, allowedRoles: allowed, restrictedRoles: restricted };
    });
  }

  function getStats() {
    return {
      totalRoles: state.roles.length,
      totalUsers: state.users.length,
      totalPermissions: PERMISSIONS.length,
      restrictedActions: getRestrictedActions().length,
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('rbac-widget');
    if (!container) return;
    const stats = getStats();

    container.innerHTML = `
      <div id="rbac-card">
        <div class="rb-header"><h3>Role-Based Access Control</h3></div>
        <div class="rb-stats-row" id="rb-stats">
          <div class="rb-stat-card"><div class="rb-stat-val">${stats.totalRoles}</div><div class="rb-stat-label">Roles</div></div>
          <div class="rb-stat-card"><div class="rb-stat-val">${stats.totalUsers}</div><div class="rb-stat-label">Users</div></div>
          <div class="rb-stat-card"><div class="rb-stat-val">${stats.totalPermissions}</div><div class="rb-stat-label">Permissions</div></div>
          <div class="rb-stat-card"><div class="rb-stat-val">${stats.restrictedActions}</div><div class="rb-stat-label">Restricted</div></div>
        </div>
        <div class="rb-tabs" id="rb-tabs">
          <button class="rb-tab ${state.activeTab === 'roles' ? 'active' : ''}" data-tab="roles">Roles</button>
          <button class="rb-tab ${state.activeTab === 'permissions' ? 'active' : ''}" data-tab="permissions">Permissions</button>
          <button class="rb-tab ${state.activeTab === 'users' ? 'active' : ''}" data-tab="users">Users</button>
        </div>
        <div id="rb-content"></div>
      </div>
    `;

    container.querySelectorAll('.rb-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('rb-content');
    if (!el) return;
    if (state.activeTab === 'roles') renderRoles(el);
    else if (state.activeTab === 'permissions') renderPermissions(el);
    else renderUsers(el);
  }

  function renderRoles(el) {
    const roles = getRoles();
    el.innerHTML = `
      <div class="rb-role-grid" id="rb-role-grid">
        ${roles.map(r => `
          <div class="rb-role-card" data-role="${r.id}">
            <div class="rb-role-top">
              <div class="rb-role-name">${r.name}</div>
              <span class="rb-role-badge" style="background:${r.color}22;color:${r.color}">Level ${r.level}</span>
            </div>
            <div class="rb-role-desc">${r.description}</div>
            <div class="rb-perm-list">
              ${getRole(r.id).permissions.slice(0, 6).map(p =>
                `<span class="rb-perm-tag granted">${p}</span>`
              ).join('')}
              ${r.permissionCount > 6 ? `<span class="rb-perm-tag">+${r.permissionCount - 6} more</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderPermissions(el) {
    const matrix = getPermissionMatrix();
    const roles = getRoles();
    el.innerHTML = `
      <div class="rb-matrix-container" id="rb-matrix-container">
        <table class="rb-matrix" id="rb-matrix">
          <thead>
            <tr>
              <th>Permission</th>
              ${roles.map(r => `<th style="color:${r.color}">${r.name}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${matrix.map(row => `
              <tr>
                <td class="first-col">${row.permission}</td>
                ${roles.map(r => `
                  <td class="${row[r.id] ? 'rb-check' : 'rb-cross'}">${row[r.id] ? '✓' : '✗'}</td>
                `).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderUsers(el) {
    const users = getUsers();
    el.innerHTML = `
      <div class="rb-user-list" id="rb-user-list">
        ${users.map(u => `
          <div class="rb-user-item" data-user-id="${u.id}">
            <div class="rb-user-avatar" style="background:${u.roleColor}">${u.avatar}</div>
            <div class="rb-user-info">
              <div class="rb-user-name">${u.name}</div>
              <div class="rb-user-email">${u.email} · Last active: ${new Date(u.lastActive).toLocaleString()}</div>
            </div>
            <span class="rb-user-role-tag" style="background:${u.roleColor}22;color:${u.roleColor}">${u.roleName}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        activeTab: state.activeTab,
        roles: state.roles,
        users: state.users,
        currentUser: state.currentUser,
      }));
    } catch (e) {}
  }

  function loadState() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        const parsed = JSON.parse(s);
        state.activeTab = parsed.activeTab || state.activeTab;
        if (parsed.roles?.length > 0) state.roles = parsed.roles;
        if (parsed.users?.length > 0) state.users = parsed.users;
        if (parsed.currentUser) state.currentUser = parsed.currentUser;
      }
    } catch (e) {}
  }

  window.rbac = {
    getRoles, getRole, createRole, updateRole, deleteRole,
    getPermissions, getPermissionMatrix, checkPermission,
    getUsers, getUser, assignRole, canPerformAction,
    getRestrictedActions, getStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        roleCount: state.roles.length,
        userCount: state.users.length,
        permissionCount: PERMISSIONS.length,
        currentUser: state.currentUser,
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
