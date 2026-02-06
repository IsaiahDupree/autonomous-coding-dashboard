// feat-087: Automatic Database Backups
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #auto-backups-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .ab-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .ab-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .ab-tabs {
      display: flex; gap: 4px; margin-bottom: 16px;
      background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px;
    }
    .ab-tab {
      flex: 1; padding: 6px 12px; border: none; background: transparent;
      color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px;
      font-size: 13px; transition: all 0.2s;
    }
    .ab-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .ab-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .ab-stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .ab-stat-card {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px; text-align: center;
    }
    .ab-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .ab-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .ab-list { display: flex; flex-direction: column; gap: 8px; }
    .ab-backup-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .ab-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .ab-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .ab-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .ab-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .ab-schedule-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px; display: flex; justify-content: space-between; align-items: center;
    }
    .ab-schedule-info { flex: 1; }
    .ab-schedule-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .ab-schedule-meta { font-size: 11px; color: var(--color-text-secondary, #a0a0b0); margin-top: 2px; }
    .ab-retention-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .ab-retention-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .ab-retention-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .ab-retention-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'auto-backups-config';

  let state = {
    activeTab: 'backups',
    backups: [],
    schedules: [],
    retentionPolicy: null,
  };

  function generateBackups() {
    const now = Date.now();
    return [
      { id: 'bk-001', name: 'Daily Backup', type: 'full', status: 'completed', size: '245MB', duration: 45000, createdAt: new Date(now - 86400000).toISOString(), schedule: 'daily', tables: 12, records: 158000 },
      { id: 'bk-002', name: 'Hourly Incremental', type: 'incremental', status: 'completed', size: '18MB', duration: 8000, createdAt: new Date(now - 3600000).toISOString(), schedule: 'hourly', tables: 5, records: 12400 },
      { id: 'bk-003', name: 'Weekly Full Backup', type: 'full', status: 'completed', size: '512MB', duration: 120000, createdAt: new Date(now - 604800000).toISOString(), schedule: 'weekly', tables: 12, records: 158000 },
      { id: 'bk-004', name: 'Pre-Deploy Snapshot', type: 'snapshot', status: 'completed', size: '198MB', duration: 32000, createdAt: new Date(now - 172800000).toISOString(), schedule: 'manual', tables: 12, records: 155000 },
      { id: 'bk-005', name: 'Failed Nightly', type: 'full', status: 'failed', size: '0MB', duration: 15000, createdAt: new Date(now - 259200000).toISOString(), schedule: 'daily', tables: 0, records: 0, error: 'Connection timeout after 15s' },
      { id: 'bk-006', name: 'Monthly Archive', type: 'full', status: 'completed', size: '1.2GB', duration: 300000, createdAt: new Date(now - 2592000000).toISOString(), schedule: 'monthly', tables: 12, records: 152000 },
      { id: 'bk-007', name: 'Running Backup', type: 'incremental', status: 'running', size: '0MB', duration: 0, createdAt: new Date(now - 30000).toISOString(), schedule: 'hourly', tables: 3, records: 5200, progress: 65 },
      { id: 'bk-008', name: 'Pending Backup', type: 'full', status: 'pending', size: '0MB', duration: 0, createdAt: new Date(now).toISOString(), schedule: 'daily', tables: 0, records: 0 },
    ];
  }

  function generateSchedules() {
    return [
      { id: 'sch-001', name: 'Hourly Incremental', frequency: 'hourly', type: 'incremental', enabled: true, lastRun: new Date(Date.now() - 3600000).toISOString(), nextRun: new Date(Date.now() + 3600000).toISOString(), retention: 24 },
      { id: 'sch-002', name: 'Daily Full Backup', frequency: 'daily', type: 'full', enabled: true, lastRun: new Date(Date.now() - 86400000).toISOString(), nextRun: new Date(Date.now() + 86400000).toISOString(), retention: 30 },
      { id: 'sch-003', name: 'Weekly Archive', frequency: 'weekly', type: 'full', enabled: true, lastRun: new Date(Date.now() - 604800000).toISOString(), nextRun: new Date(Date.now() + 604800000).toISOString(), retention: 12 },
      { id: 'sch-004', name: 'Monthly Archive', frequency: 'monthly', type: 'full', enabled: false, lastRun: new Date(Date.now() - 2592000000).toISOString(), nextRun: new Date(Date.now() + 2592000000).toISOString(), retention: 6 },
    ];
  }

  function getDefaultRetentionPolicy() {
    return {
      maxBackups: 50,
      maxAge: 90,
      maxStorage: '10GB',
      keepMinimum: 5,
      autoCleanup: true,
      rules: [
        { type: 'full', keepCount: 10, maxAgeDays: 90 },
        { type: 'incremental', keepCount: 30, maxAgeDays: 30 },
        { type: 'snapshot', keepCount: 10, maxAgeDays: 60 },
      ],
    };
  }

  function initState() {
    if (state.backups.length === 0) state.backups = generateBackups();
    if (state.schedules.length === 0) state.schedules = generateSchedules();
    if (!state.retentionPolicy) state.retentionPolicy = getDefaultRetentionPolicy();
  }

  // ── API ────────────────────────────────────────────────────────
  function getBackups(filter) {
    initState();
    let list = [...state.backups];
    if (filter?.status) list = list.filter(b => b.status === filter.status);
    if (filter?.type) list = list.filter(b => b.type === filter.type);
    if (filter?.schedule) list = list.filter(b => b.schedule === filter.schedule);
    return list;
  }

  function getBackup(id) {
    initState();
    return state.backups.find(b => b.id === id) || null;
  }

  function createBackup(name, type) {
    initState();
    const id = 'bk-' + String(state.backups.length + 1).padStart(3, '0');
    const backup = {
      id, name: name || 'Manual Backup', type: type || 'full',
      status: 'completed', size: '185MB', duration: 42000,
      createdAt: new Date().toISOString(), schedule: 'manual',
      tables: 12, records: 158000,
    };
    state.backups.unshift(backup);
    saveState();
    render();
    return id;
  }

  function deleteBackup(id) {
    initState();
    const idx = state.backups.findIndex(b => b.id === id);
    if (idx === -1) return false;
    state.backups.splice(idx, 1);
    saveState();
    render();
    return true;
  }

  function restoreBackup(id) {
    initState();
    const backup = state.backups.find(b => b.id === id);
    if (!backup || backup.status !== 'completed') return null;
    return {
      success: true,
      backupId: id,
      restoredAt: new Date().toISOString(),
      tables: backup.tables,
      records: backup.records,
      duration: Math.round(backup.duration * 1.5),
    };
  }

  function getSchedules() {
    initState();
    return [...state.schedules];
  }

  function getSchedule(id) {
    initState();
    return state.schedules.find(s => s.id === id) || null;
  }

  function createSchedule(name, frequency, type) {
    initState();
    const id = 'sch-' + String(state.schedules.length + 1).padStart(3, '0');
    const schedule = {
      id, name, frequency, type: type || 'full', enabled: true,
      lastRun: null, nextRun: new Date(Date.now() + 3600000).toISOString(),
      retention: 30,
    };
    state.schedules.push(schedule);
    saveState();
    render();
    return id;
  }

  function updateSchedule(id, updates) {
    initState();
    const schedule = state.schedules.find(s => s.id === id);
    if (!schedule) return false;
    Object.assign(schedule, updates);
    saveState();
    render();
    return true;
  }

  function toggleSchedule(id) {
    initState();
    const schedule = state.schedules.find(s => s.id === id);
    if (!schedule) return false;
    schedule.enabled = !schedule.enabled;
    saveState();
    render();
    return schedule.enabled;
  }

  function deleteSchedule(id) {
    initState();
    const idx = state.schedules.findIndex(s => s.id === id);
    if (idx === -1) return false;
    state.schedules.splice(idx, 1);
    saveState();
    render();
    return true;
  }

  function getRetentionPolicy() {
    initState();
    return { ...state.retentionPolicy };
  }

  function updateRetentionPolicy(updates) {
    initState();
    Object.assign(state.retentionPolicy, updates);
    saveState();
    render();
    return { ...state.retentionPolicy };
  }

  function getBackupStats() {
    initState();
    const completed = state.backups.filter(b => b.status === 'completed');
    const totalSize = completed.reduce((sum, b) => {
      const num = parseFloat(b.size);
      return sum + (b.size.includes('GB') ? num * 1024 : num);
    }, 0);
    return {
      totalBackups: state.backups.length,
      completedBackups: completed.length,
      failedBackups: state.backups.filter(b => b.status === 'failed').length,
      totalSize: totalSize.toFixed(1) + 'MB',
      scheduleCount: state.schedules.length,
      activeSchedules: state.schedules.filter(s => s.enabled).length,
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('auto-backups-widget');
    if (!container) return;
    initState();
    const stats = getBackupStats();

    container.innerHTML = `
      <div id="auto-backups-card">
        <div class="ab-header"><h3>Automatic Database Backups</h3></div>
        <div class="ab-stats-row">
          <div class="ab-stat-card"><div class="ab-stat-val">${stats.totalBackups}</div><div class="ab-stat-label">Total Backups</div></div>
          <div class="ab-stat-card"><div class="ab-stat-val">${stats.completedBackups}</div><div class="ab-stat-label">Completed</div></div>
          <div class="ab-stat-card"><div class="ab-stat-val">${stats.activeSchedules}</div><div class="ab-stat-label">Active Schedules</div></div>
          <div class="ab-stat-card"><div class="ab-stat-val">${stats.totalSize}</div><div class="ab-stat-label">Total Size</div></div>
        </div>
        <div class="ab-tabs">
          <button class="ab-tab ${state.activeTab === 'backups' ? 'active' : ''}" data-tab="backups">Backups</button>
          <button class="ab-tab ${state.activeTab === 'schedules' ? 'active' : ''}" data-tab="schedules">Schedules</button>
          <button class="ab-tab ${state.activeTab === 'retention' ? 'active' : ''}" data-tab="retention">Retention</button>
        </div>
        <div id="ab-content"></div>
      </div>
    `;

    container.querySelectorAll('.ab-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('ab-content');
    if (!el) return;
    if (state.activeTab === 'backups') renderBackups(el);
    else if (state.activeTab === 'schedules') renderSchedules(el);
    else renderRetention(el);
  }

  function renderBackups(el) {
    const backups = getBackups();
    const statusColors = { completed: '#22c55e', failed: '#ef4444', running: '#f59e0b', pending: '#6366f1' };
    el.innerHTML = `
      <div class="ab-list" id="ab-backup-list">
        ${backups.map(b => `
          <div class="ab-backup-item" data-id="${b.id}">
            <div class="ab-item-top">
              <div class="ab-item-name">${b.name}</div>
              <span class="ab-badge" style="background:${statusColors[b.status]}22;color:${statusColors[b.status]}">${b.status}</span>
            </div>
            <div class="ab-item-detail">${b.type} · ${b.size} · ${b.tables} tables · ${b.records.toLocaleString()} records${b.progress !== undefined ? ' · ' + b.progress + '%' : ''}</div>
            <div class="ab-item-detail">${new Date(b.createdAt).toLocaleString()} · ${b.schedule}${b.error ? ' · Error: ' + b.error : ''}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderSchedules(el) {
    const schedules = getSchedules();
    el.innerHTML = `
      <div class="ab-list" id="ab-schedule-list">
        ${schedules.map(s => `
          <div class="ab-schedule-item" data-id="${s.id}">
            <div class="ab-schedule-info">
              <div class="ab-schedule-name">${s.name}</div>
              <div class="ab-schedule-meta">${s.frequency} · ${s.type} · Keep ${s.retention}${s.lastRun ? ' · Last: ' + new Date(s.lastRun).toLocaleDateString() : ''}</div>
            </div>
            <span class="ab-badge" style="background:${s.enabled ? '#22c55e' : '#6b7280'}22;color:${s.enabled ? '#22c55e' : '#6b7280'}">${s.enabled ? 'Active' : 'Disabled'}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderRetention(el) {
    const policy = getRetentionPolicy();
    el.innerHTML = `
      <div id="ab-retention-section">
        <div class="ab-list" id="ab-retention-list">
          <div class="ab-retention-item">
            <div class="ab-retention-top">
              <div class="ab-retention-name">Max Backups</div>
              <span class="ab-badge" style="background:#6366f122;color:#6366f1">${policy.maxBackups}</span>
            </div>
            <div class="ab-retention-detail">Maximum number of backups to retain</div>
          </div>
          <div class="ab-retention-item">
            <div class="ab-retention-top">
              <div class="ab-retention-name">Max Age</div>
              <span class="ab-badge" style="background:#6366f122;color:#6366f1">${policy.maxAge} days</span>
            </div>
            <div class="ab-retention-detail">Maximum age before automatic cleanup</div>
          </div>
          <div class="ab-retention-item">
            <div class="ab-retention-top">
              <div class="ab-retention-name">Max Storage</div>
              <span class="ab-badge" style="background:#6366f122;color:#6366f1">${policy.maxStorage}</span>
            </div>
            <div class="ab-retention-detail">Maximum total storage for backups</div>
          </div>
          <div class="ab-retention-item">
            <div class="ab-retention-top">
              <div class="ab-retention-name">Keep Minimum</div>
              <span class="ab-badge" style="background:#6366f122;color:#6366f1">${policy.keepMinimum}</span>
            </div>
            <div class="ab-retention-detail">Always keep at least this many backups</div>
          </div>
          <div class="ab-retention-item">
            <div class="ab-retention-top">
              <div class="ab-retention-name">Auto Cleanup</div>
              <span class="ab-badge" style="background:${policy.autoCleanup ? '#22c55e' : '#6b7280'}22;color:${policy.autoCleanup ? '#22c55e' : '#6b7280'}">${policy.autoCleanup ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div class="ab-retention-detail">Automatically remove backups exceeding policy</div>
          </div>
          ${policy.rules.map(r => `
            <div class="ab-retention-item">
              <div class="ab-retention-top">
                <div class="ab-retention-name">${r.type} Rule</div>
                <span class="ab-badge" style="background:#f59e0b22;color:#f59e0b">Keep ${r.keepCount} / ${r.maxAgeDays}d</span>
              </div>
              <div class="ab-retention-detail">Keep up to ${r.keepCount} ${r.type} backups for ${r.maxAgeDays} days</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab, retentionPolicy: state.retentionPolicy })); } catch (e) {}
  }
  function loadState() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) { const p = JSON.parse(s); state.activeTab = p.activeTab || state.activeTab; if (p.retentionPolicy) state.retentionPolicy = p.retentionPolicy; }
    } catch (e) {}
  }

  window.autoBackups = {
    getBackups, getBackup, createBackup, deleteBackup, restoreBackup,
    getSchedules, getSchedule, createSchedule, updateSchedule, toggleSchedule, deleteSchedule,
    getRetentionPolicy, updateRetentionPolicy, getBackupStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      initState();
      return {
        activeTab: state.activeTab,
        backupCount: state.backups.length,
        scheduleCount: state.schedules.length,
        retentionPolicy: state.retentionPolicy,
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
