// feat-101: Off-hours Execution Mode
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #off-hours-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .oh-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .oh-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .oh-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .oh-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .oh-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .oh-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .oh-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .oh-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .oh-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .oh-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .oh-list { display: flex; flex-direction: column; gap: 8px; }
    .oh-window-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .oh-window-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .oh-window-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .oh-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .oh-window-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .oh-policy-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .oh-policy-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .oh-policy-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .oh-policy-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .oh-execution-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .oh-execution-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .oh-execution-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .oh-execution-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'off-hours-config';
  let state = { activeTab: 'windows' };

  function getWindows() {
    return [
      { id: 'win-001', name: 'Weeknight Window', startTime: '22:00', endTime: '06:00', days: ['mon', 'tue', 'wed', 'thu', 'fri'], timezone: 'UTC', enabled: true, priority: 'high' },
      { id: 'win-002', name: 'Weekend Full Day', startTime: '00:00', endTime: '23:59', days: ['sat', 'sun'], timezone: 'UTC', enabled: true, priority: 'medium' },
      { id: 'win-003', name: 'Holiday Schedule', startTime: '00:00', endTime: '23:59', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], timezone: 'UTC', enabled: false, priority: 'low' },
      { id: 'win-004', name: 'Lunch Break', startTime: '12:00', endTime: '13:00', days: ['mon', 'tue', 'wed', 'thu', 'fri'], timezone: 'UTC', enabled: true, priority: 'low' },
      { id: 'win-005', name: 'Early Morning', startTime: '04:00', endTime: '07:00', days: ['mon', 'tue', 'wed', 'thu', 'fri'], timezone: 'UTC', enabled: true, priority: 'high' },
      { id: 'win-006', name: 'Late Night', startTime: '23:00', endTime: '04:00', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], timezone: 'UTC', enabled: false, priority: 'medium' },
    ];
  }

  function getWindow(id) { return getWindows().find(w => w.id === id) || null; }
  function getActiveWindows() { return getWindows().filter(w => w.enabled); }

  function isOffHours() {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 22 || hour < 6;
  }

  function getPolicies() {
    return [
      { id: 'pol-001', name: 'Resource Allocation', description: 'Maximize CPU and memory allocation during off-hours', type: 'resource', maxCPU: 90, maxMemory: 85, enabled: true },
      { id: 'pol-002', name: 'Batch Processing', description: 'Queue heavy tasks for off-hours execution', type: 'scheduling', batchSize: 10, queueLimit: 50, enabled: true },
      { id: 'pol-003', name: 'Auto-scaling', description: 'Scale up worker count during off-hours', type: 'scaling', minWorkers: 2, maxWorkers: 8, enabled: true },
      { id: 'pol-004', name: 'Notification Suppression', description: 'Suppress non-critical notifications during off-hours', type: 'notification', suppressLevel: 'info', enabled: true },
      { id: 'pol-005', name: 'Backup Window', description: 'Run full backups during off-hours', type: 'maintenance', backupType: 'full', retention: 30, enabled: true },
    ];
  }

  function getPolicy(id) { return getPolicies().find(p => p.id === id) || null; }

  function getExecutionHistory() {
    return [
      { id: 'exec-001', windowId: 'win-001', startedAt: '2025-01-15T22:00:00Z', completedAt: '2025-01-16T05:30:00Z', duration: 27000, tasksCompleted: 45, tasksFailed: 2, status: 'completed' },
      { id: 'exec-002', windowId: 'win-002', startedAt: '2025-01-14T00:00:00Z', completedAt: '2025-01-14T18:00:00Z', duration: 64800, tasksCompleted: 120, tasksFailed: 5, status: 'completed' },
      { id: 'exec-003', windowId: 'win-001', startedAt: '2025-01-14T22:00:00Z', completedAt: '2025-01-15T04:00:00Z', duration: 21600, tasksCompleted: 38, tasksFailed: 1, status: 'completed' },
      { id: 'exec-004', windowId: 'win-004', startedAt: '2025-01-15T12:00:00Z', completedAt: '2025-01-15T12:45:00Z', duration: 2700, tasksCompleted: 8, tasksFailed: 0, status: 'completed' },
      { id: 'exec-005', windowId: 'win-005', startedAt: '2025-01-15T04:00:00Z', completedAt: '2025-01-15T06:30:00Z', duration: 9000, tasksCompleted: 22, tasksFailed: 3, status: 'completed' },
      { id: 'exec-006', windowId: 'win-001', startedAt: '2025-01-13T22:00:00Z', completedAt: null, duration: null, tasksCompleted: 30, tasksFailed: 8, status: 'failed' },
    ];
  }

  function getExecution(id) { return getExecutionHistory().find(e => e.id === id) || null; }

  function getOffHoursStats() {
    const windows = getWindows();
    const executions = getExecutionHistory();
    return {
      totalWindows: windows.length,
      activeWindows: windows.filter(w => w.enabled).length,
      policyCount: getPolicies().length,
      executionCount: executions.length,
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('off-hours-widget');
    if (!container) return;
    const stats = getOffHoursStats();

    container.innerHTML = `
      <div id="off-hours-card">
        <div class="oh-header"><h3>Off-Hours Execution</h3></div>
        <div class="oh-stats-row">
          <div class="oh-stat-card"><div class="oh-stat-val">${stats.totalWindows}</div><div class="oh-stat-label">Windows</div></div>
          <div class="oh-stat-card"><div class="oh-stat-val">${stats.activeWindows}</div><div class="oh-stat-label">Active</div></div>
          <div class="oh-stat-card"><div class="oh-stat-val">${stats.policyCount}</div><div class="oh-stat-label">Policies</div></div>
          <div class="oh-stat-card"><div class="oh-stat-val">${stats.executionCount}</div><div class="oh-stat-label">Executions</div></div>
        </div>
        <div class="oh-tabs">
          <button class="oh-tab ${state.activeTab === 'windows' ? 'active' : ''}" data-tab="windows">Windows</button>
          <button class="oh-tab ${state.activeTab === 'policies' ? 'active' : ''}" data-tab="policies">Policies</button>
          <button class="oh-tab ${state.activeTab === 'executions' ? 'active' : ''}" data-tab="executions">Executions</button>
        </div>
        <div id="oh-content"></div>
      </div>
    `;

    container.querySelectorAll('.oh-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('oh-content');
    if (!el) return;
    if (state.activeTab === 'windows') renderWindows(el);
    else if (state.activeTab === 'policies') renderPolicies(el);
    else renderExecutions(el);
  }

  function renderWindows(el) {
    const windows = getWindows();
    el.innerHTML = `
      <div class="oh-list" id="oh-window-list">
        ${windows.map(w => `
          <div class="oh-window-item" data-id="${w.id}">
            <div class="oh-window-top">
              <div class="oh-window-name">${w.name}</div>
              <span class="oh-badge" style="background:${w.enabled ? '#22c55e' : '#ef4444'}22;color:${w.enabled ? '#22c55e' : '#ef4444'}">${w.enabled ? 'Active' : 'Disabled'}</span>
            </div>
            <div class="oh-window-detail">${w.startTime}-${w.endTime} · ${w.days.join(', ')} · ${w.timezone} · Priority: ${w.priority}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderPolicies(el) {
    const policies = getPolicies();
    const typeColors = { resource: '#3b82f6', scheduling: '#f59e0b', scaling: '#22c55e', notification: '#8b5cf6', maintenance: '#ec4899' };
    el.innerHTML = `
      <div id="oh-policy-section">
        <div class="oh-list" id="oh-policy-list">
          ${policies.map(p => `
            <div class="oh-policy-item" data-id="${p.id}">
              <div class="oh-policy-top">
                <div class="oh-policy-name">${p.name}</div>
                <span class="oh-badge" style="background:${typeColors[p.type] || '#6366f1'}22;color:${typeColors[p.type] || '#6366f1'}">${p.type}</span>
              </div>
              <div class="oh-policy-detail">${p.description}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderExecutions(el) {
    const execs = getExecutionHistory();
    const statusColors = { completed: '#22c55e', failed: '#ef4444', running: '#3b82f6' };
    el.innerHTML = `
      <div id="oh-execution-section">
        <div class="oh-list" id="oh-execution-list">
          ${execs.map(e => `
            <div class="oh-execution-item" data-id="${e.id}">
              <div class="oh-execution-top">
                <div class="oh-execution-name">${e.windowId}</div>
                <span class="oh-badge" style="background:${statusColors[e.status]}22;color:${statusColors[e.status]}">${e.status}</span>
              </div>
              <div class="oh-execution-detail">${e.startedAt} · ${e.tasksCompleted} completed · ${e.tasksFailed} failed</div>
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

  window.offHoursMode = {
    getWindows, getWindow, getActiveWindows, isOffHours,
    getPolicies, getPolicy,
    getExecutionHistory, getExecution,
    getOffHoursStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        windowCount: getWindows().length,
        activeWindowCount: getActiveWindows().length,
        policyCount: getPolicies().length,
        executionCount: getExecutionHistory().length,
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
