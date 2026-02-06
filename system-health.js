// feat-108: System Health Dashboard
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #system-health-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .sh-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .sh-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .sh-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .sh-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .sh-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .sh-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .sh-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .sh-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .sh-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .sh-list { display: flex; flex-direction: column; gap: 8px; }
    .sh-check-item, .sh-metric-item, .sh-alert-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .sh-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .sh-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .sh-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .sh-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);
  const STORAGE_KEY = 'system-health-config';
  let state = { activeTab: 'checks' };

  function getChecks() {
    return [
      { id: 'chk-001', name: 'API Server', status: 'healthy', uptime: '99.97%', responseTime: '45ms', lastCheck: '2026-02-06T01:00:00Z' },
      { id: 'chk-002', name: 'Database', status: 'healthy', uptime: '99.99%', responseTime: '12ms', lastCheck: '2026-02-06T01:00:00Z' },
      { id: 'chk-003', name: 'Redis Cache', status: 'degraded', uptime: '98.50%', responseTime: '120ms', lastCheck: '2026-02-06T01:00:00Z' },
      { id: 'chk-004', name: 'WebSocket Server', status: 'healthy', uptime: '99.90%', responseTime: '8ms', lastCheck: '2026-02-06T01:00:00Z' },
      { id: 'chk-005', name: 'File Storage', status: 'healthy', uptime: '99.95%', responseTime: '65ms', lastCheck: '2026-02-06T01:00:00Z' },
      { id: 'chk-006', name: 'Background Workers', status: 'down', uptime: '85.20%', responseTime: 'N/A', lastCheck: '2026-02-06T00:55:00Z' },
    ];
  }
  function getCheck(id) { return getChecks().find(c => c.id === id) || null; }
  function getHealthyChecks() { return getChecks().filter(c => c.status === 'healthy'); }

  function getMetrics() {
    return [
      { id: 'met-001', name: 'CPU Usage', value: 42, unit: '%', threshold: 80, trend: 'stable' },
      { id: 'met-002', name: 'Memory Usage', value: 67, unit: '%', threshold: 90, trend: 'increasing' },
      { id: 'met-003', name: 'Disk Usage', value: 55, unit: '%', threshold: 85, trend: 'stable' },
      { id: 'met-004', name: 'Network I/O', value: 125, unit: 'MB/s', threshold: 500, trend: 'stable' },
      { id: 'met-005', name: 'Active Connections', value: 234, unit: '', threshold: 1000, trend: 'increasing' },
      { id: 'met-006', name: 'Request Rate', value: 1250, unit: 'req/min', threshold: 5000, trend: 'stable' },
      { id: 'met-007', name: 'Error Rate', value: 0.3, unit: '%', threshold: 5, trend: 'decreasing' },
      { id: 'met-008', name: 'Queue Depth', value: 12, unit: 'items', threshold: 100, trend: 'stable' },
    ];
  }
  function getMetric(id) { return getMetrics().find(m => m.id === id) || null; }

  function getAlerts() {
    return [
      { id: 'alt-001', severity: 'critical', message: 'Background Workers are down', service: 'Background Workers', triggered: '2026-02-06T00:55:00Z', acknowledged: false },
      { id: 'alt-002', severity: 'warning', message: 'Redis Cache response time elevated', service: 'Redis Cache', triggered: '2026-02-06T00:45:00Z', acknowledged: true },
      { id: 'alt-003', severity: 'info', message: 'Memory usage trending upward', service: 'System', triggered: '2026-02-06T00:30:00Z', acknowledged: false },
      { id: 'alt-004', severity: 'warning', message: 'Disk usage approaching threshold', service: 'File Storage', triggered: '2026-02-05T23:00:00Z', acknowledged: true },
      { id: 'alt-005', severity: 'info', message: 'Scheduled maintenance in 24 hours', service: 'System', triggered: '2026-02-05T20:00:00Z', acknowledged: false },
    ];
  }
  function getAlert(id) { return getAlerts().find(a => a.id === id) || null; }

  function getStats() {
    const checks = getChecks();
    return { totalChecks: checks.length, healthyCount: getHealthyChecks().length, metricCount: getMetrics().length, alertCount: getAlerts().length };
  }

  function render() {
    const container = document.getElementById('system-health-widget');
    if (!container) return;
    const stats = getStats();
    container.innerHTML = `
      <div id="system-health-card">
        <div class="sh-header"><h3>System Health Dashboard</h3></div>
        <div class="sh-stats-row">
          <div class="sh-stat-card"><div class="sh-stat-val">${stats.totalChecks}</div><div class="sh-stat-label">Checks</div></div>
          <div class="sh-stat-card"><div class="sh-stat-val">${stats.healthyCount}</div><div class="sh-stat-label">Healthy</div></div>
          <div class="sh-stat-card"><div class="sh-stat-val">${stats.metricCount}</div><div class="sh-stat-label">Metrics</div></div>
          <div class="sh-stat-card"><div class="sh-stat-val">${stats.alertCount}</div><div class="sh-stat-label">Alerts</div></div>
        </div>
        <div class="sh-tabs">
          <button class="sh-tab ${state.activeTab === 'checks' ? 'active' : ''}" data-tab="checks">Checks</button>
          <button class="sh-tab ${state.activeTab === 'metrics' ? 'active' : ''}" data-tab="metrics">Metrics</button>
          <button class="sh-tab ${state.activeTab === 'alerts' ? 'active' : ''}" data-tab="alerts">Alerts</button>
        </div>
        <div id="sh-content"></div>
      </div>`;
    container.querySelectorAll('.sh-tab').forEach(btn => { btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); }); });
    renderContent();
  }
  function renderContent() {
    const el = document.getElementById('sh-content');
    if (!el) return;
    const statusColor = s => s === 'healthy' ? '#22c55e' : s === 'degraded' ? '#f59e0b' : '#ef4444';
    const sevColor = s => s === 'critical' ? '#ef4444' : s === 'warning' ? '#f59e0b' : '#3b82f6';
    if (state.activeTab === 'checks') el.innerHTML = `<div class="sh-list" id="sh-check-list">${getChecks().map(c => `<div class="sh-check-item" data-id="${c.id}"><div class="sh-item-top"><div class="sh-item-name">${c.name}</div><span class="sh-badge" style="background:${statusColor(c.status)}22;color:${statusColor(c.status)}">${c.status}</span></div><div class="sh-item-detail">Uptime: ${c.uptime} · Response: ${c.responseTime}</div></div>`).join('')}</div>`;
    else if (state.activeTab === 'metrics') el.innerHTML = `<div id="sh-metric-section"><div class="sh-list" id="sh-metric-list">${getMetrics().map(m => `<div class="sh-metric-item" data-id="${m.id}"><div class="sh-item-top"><div class="sh-item-name">${m.name}</div><span class="sh-badge" style="background:#6366f122;color:#6366f1">${m.value}${m.unit}</span></div><div class="sh-item-detail">Threshold: ${m.threshold}${m.unit} · Trend: ${m.trend}</div></div>`).join('')}</div></div>`;
    else el.innerHTML = `<div id="sh-alert-section"><div class="sh-list" id="sh-alert-list">${getAlerts().map(a => `<div class="sh-alert-item" data-id="${a.id}"><div class="sh-item-top"><div class="sh-item-name">${a.service}</div><span class="sh-badge" style="background:${sevColor(a.severity)}22;color:${sevColor(a.severity)}">${a.severity}</span></div><div class="sh-item-detail">${a.message} · ${a.acknowledged ? 'Acknowledged' : 'Unacknowledged'}</div></div>`).join('')}</div></div>`;
  }
  function saveState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab })); } catch(e){} }
  function loadState() { try { const s=localStorage.getItem(STORAGE_KEY); if(s){const p=JSON.parse(s); state.activeTab=p.activeTab||state.activeTab;} } catch(e){} }

  window.systemHealth = {
    getChecks, getCheck, getHealthyChecks, getMetrics, getMetric, getAlerts, getAlert, getStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() { return { activeTab: state.activeTab, checkCount: getChecks().length, healthyCount: getHealthyChecks().length, metricCount: getMetrics().length, alertCount: getAlerts().length }; },
  };
  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
