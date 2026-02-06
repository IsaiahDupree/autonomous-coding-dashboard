// feat-099: Scheduled Harness Runs
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #scheduled-runs-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .sr-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .sr-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .sr-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .sr-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .sr-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .sr-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .sr-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .sr-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .sr-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .sr-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .sr-list { display: flex; flex-direction: column; gap: 8px; }
    .sr-schedule-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .sr-schedule-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .sr-schedule-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .sr-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .sr-schedule-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .sr-history-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .sr-history-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .sr-history-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .sr-history-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .sr-queue-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .sr-queue-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .sr-queue-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .sr-queue-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'scheduled-runs-config';
  let state = { activeTab: 'schedules' };

  function getSchedules() {
    return [
      { id: 'sch-001', name: 'Nightly Full Run', cron: '0 2 * * *', frequency: 'daily', mode: 'continuous', enabled: true, lastRun: '2025-01-15T02:00:00Z', nextRun: '2025-01-16T02:00:00Z', timeout: 7200 },
      { id: 'sch-002', name: 'Hourly Quick Check', cron: '0 * * * *', frequency: 'hourly', mode: 'single', enabled: true, lastRun: '2025-01-15T14:00:00Z', nextRun: '2025-01-15T15:00:00Z', timeout: 1800 },
      { id: 'sch-003', name: 'Weekly Deep Scan', cron: '0 3 * * 0', frequency: 'weekly', mode: 'continuous', enabled: true, lastRun: '2025-01-12T03:00:00Z', nextRun: '2025-01-19T03:00:00Z', timeout: 14400 },
      { id: 'sch-004', name: 'Pre-deploy Validation', cron: '30 8 * * 1-5', frequency: 'weekdays', mode: 'single', enabled: false, lastRun: '2025-01-14T08:30:00Z', nextRun: null, timeout: 3600 },
      { id: 'sch-005', name: 'Monthly Regression', cron: '0 4 1 * *', frequency: 'monthly', mode: 'continuous', enabled: true, lastRun: '2025-01-01T04:00:00Z', nextRun: '2025-02-01T04:00:00Z', timeout: 28800 },
      { id: 'sch-006', name: 'Feature Branch Test', cron: '*/30 * * * *', frequency: 'every-30min', mode: 'single', enabled: false, lastRun: null, nextRun: null, timeout: 900 },
    ];
  }

  function getSchedule(id) {
    return getSchedules().find(s => s.id === id) || null;
  }

  function getActiveSchedules() {
    return getSchedules().filter(s => s.enabled);
  }

  function getRunHistory() {
    return [
      { id: 'run-001', scheduleId: 'sch-001', name: 'Nightly Full Run', startedAt: '2025-01-15T02:00:00Z', completedAt: '2025-01-15T03:45:00Z', duration: 6300, status: 'completed', featuresRun: 120, featuresPassed: 95, featuresFailed: 25 },
      { id: 'run-002', scheduleId: 'sch-002', name: 'Hourly Quick Check', startedAt: '2025-01-15T14:00:00Z', completedAt: '2025-01-15T14:12:00Z', duration: 720, status: 'completed', featuresRun: 10, featuresPassed: 10, featuresFailed: 0 },
      { id: 'run-003', scheduleId: 'sch-003', name: 'Weekly Deep Scan', startedAt: '2025-01-12T03:00:00Z', completedAt: '2025-01-12T06:30:00Z', duration: 12600, status: 'completed', featuresRun: 120, featuresPassed: 88, featuresFailed: 32 },
      { id: 'run-004', scheduleId: 'sch-001', name: 'Nightly Full Run', startedAt: '2025-01-14T02:00:00Z', completedAt: '2025-01-14T03:30:00Z', duration: 5400, status: 'completed', featuresRun: 120, featuresPassed: 92, featuresFailed: 28 },
      { id: 'run-005', scheduleId: 'sch-002', name: 'Hourly Quick Check', startedAt: '2025-01-15T13:00:00Z', completedAt: null, duration: null, status: 'failed', featuresRun: 5, featuresPassed: 3, featuresFailed: 2 },
      { id: 'run-006', scheduleId: 'sch-004', name: 'Pre-deploy Validation', startedAt: '2025-01-14T08:30:00Z', completedAt: '2025-01-14T09:15:00Z', duration: 2700, status: 'completed', featuresRun: 40, featuresPassed: 38, featuresFailed: 2 },
      { id: 'run-007', scheduleId: 'sch-005', name: 'Monthly Regression', startedAt: '2025-01-01T04:00:00Z', completedAt: '2025-01-01T08:00:00Z', duration: 14400, status: 'completed', featuresRun: 120, featuresPassed: 82, featuresFailed: 38 },
      { id: 'run-008', scheduleId: 'sch-002', name: 'Hourly Quick Check', startedAt: '2025-01-15T12:00:00Z', completedAt: '2025-01-15T12:10:00Z', duration: 600, status: 'completed', featuresRun: 10, featuresPassed: 9, featuresFailed: 1 },
    ];
  }

  function getRunHistoryEntry(id) {
    return getRunHistory().find(r => r.id === id) || null;
  }

  function getRunsForSchedule(scheduleId) {
    return getRunHistory().filter(r => r.scheduleId === scheduleId);
  }

  function getQueuedRuns() {
    return [
      { id: 'q-001', scheduleId: 'sch-001', name: 'Nightly Full Run', scheduledFor: '2025-01-16T02:00:00Z', priority: 'high', estimatedDuration: 6300 },
      { id: 'q-002', scheduleId: 'sch-002', name: 'Hourly Quick Check', scheduledFor: '2025-01-15T15:00:00Z', priority: 'medium', estimatedDuration: 720 },
      { id: 'q-003', scheduleId: 'sch-003', name: 'Weekly Deep Scan', scheduledFor: '2025-01-19T03:00:00Z', priority: 'high', estimatedDuration: 12600 },
      { id: 'q-004', scheduleId: 'sch-005', name: 'Monthly Regression', scheduledFor: '2025-02-01T04:00:00Z', priority: 'low', estimatedDuration: 14400 },
    ];
  }

  function getQueuedRun(id) {
    return getQueuedRuns().find(q => q.id === id) || null;
  }

  function getScheduleStats() {
    const schedules = getSchedules();
    const history = getRunHistory();
    return {
      totalSchedules: schedules.length,
      activeSchedules: schedules.filter(s => s.enabled).length,
      totalRuns: history.length,
      queuedCount: getQueuedRuns().length,
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('scheduled-runs-widget');
    if (!container) return;
    const stats = getScheduleStats();

    container.innerHTML = `
      <div id="scheduled-runs-card">
        <div class="sr-header"><h3>Scheduled Harness Runs</h3></div>
        <div class="sr-stats-row">
          <div class="sr-stat-card"><div class="sr-stat-val">${stats.totalSchedules}</div><div class="sr-stat-label">Schedules</div></div>
          <div class="sr-stat-card"><div class="sr-stat-val">${stats.activeSchedules}</div><div class="sr-stat-label">Active</div></div>
          <div class="sr-stat-card"><div class="sr-stat-val">${stats.totalRuns}</div><div class="sr-stat-label">Total Runs</div></div>
          <div class="sr-stat-card"><div class="sr-stat-val">${stats.queuedCount}</div><div class="sr-stat-label">Queued</div></div>
        </div>
        <div class="sr-tabs">
          <button class="sr-tab ${state.activeTab === 'schedules' ? 'active' : ''}" data-tab="schedules">Schedules</button>
          <button class="sr-tab ${state.activeTab === 'history' ? 'active' : ''}" data-tab="history">History</button>
          <button class="sr-tab ${state.activeTab === 'queue' ? 'active' : ''}" data-tab="queue">Queue</button>
        </div>
        <div id="sr-content"></div>
      </div>
    `;

    container.querySelectorAll('.sr-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('sr-content');
    if (!el) return;
    if (state.activeTab === 'schedules') renderSchedules(el);
    else if (state.activeTab === 'history') renderHistory(el);
    else renderQueue(el);
  }

  function renderSchedules(el) {
    const schedules = getSchedules();
    el.innerHTML = `
      <div class="sr-list" id="sr-schedule-list">
        ${schedules.map(s => `
          <div class="sr-schedule-item" data-id="${s.id}">
            <div class="sr-schedule-top">
              <div class="sr-schedule-name">${s.name}</div>
              <span class="sr-badge" style="background:${s.enabled ? '#22c55e' : '#ef4444'}22;color:${s.enabled ? '#22c55e' : '#ef4444'}">${s.enabled ? 'Active' : 'Disabled'}</span>
            </div>
            <div class="sr-schedule-detail">${s.cron} · ${s.frequency} · ${s.mode} · Timeout: ${s.timeout}s</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderHistory(el) {
    const history = getRunHistory();
    const statusColors = { completed: '#22c55e', failed: '#ef4444', running: '#3b82f6' };
    el.innerHTML = `
      <div id="sr-history-section">
        <div class="sr-list" id="sr-history-list">
          ${history.map(r => `
            <div class="sr-history-item" data-id="${r.id}">
              <div class="sr-history-top">
                <div class="sr-history-name">${r.name}</div>
                <span class="sr-badge" style="background:${statusColors[r.status]}22;color:${statusColors[r.status]}">${r.status}</span>
              </div>
              <div class="sr-history-detail">${r.startedAt} · ${r.featuresRun} features · ${r.featuresPassed} passed · ${r.featuresFailed} failed</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderQueue(el) {
    const queue = getQueuedRuns();
    const priColors = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
    el.innerHTML = `
      <div id="sr-queue-section">
        <div class="sr-list" id="sr-queue-list">
          ${queue.map(q => `
            <div class="sr-queue-item" data-id="${q.id}">
              <div class="sr-queue-top">
                <div class="sr-queue-name">${q.name}</div>
                <span class="sr-badge" style="background:${priColors[q.priority]}22;color:${priColors[q.priority]}">${q.priority}</span>
              </div>
              <div class="sr-queue-detail">Scheduled: ${q.scheduledFor} · Est: ${Math.round(q.estimatedDuration / 60)}min</div>
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

  window.scheduledRuns = {
    getSchedules, getSchedule, getActiveSchedules,
    getRunHistory, getRunHistoryEntry, getRunsForSchedule,
    getQueuedRuns, getQueuedRun,
    getScheduleStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        scheduleCount: getSchedules().length,
        activeCount: getActiveSchedules().length,
        runCount: getRunHistory().length,
        queuedCount: getQueuedRuns().length,
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
