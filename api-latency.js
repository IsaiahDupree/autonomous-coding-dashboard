// feat-109: API Latency Tracking
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #api-latency-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .al-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .al-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .al-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .al-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .al-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .al-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .al-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .al-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .al-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .al-list { display: flex; flex-direction: column; gap: 8px; }
    .al-endpoint-item, .al-trend-item, .al-slow-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .al-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .al-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .al-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .al-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);
  const STORAGE_KEY = 'api-latency-config';
  let state = { activeTab: 'endpoints' };

  function getEndpoints() {
    return [
      { id: 'ep-001', name: 'GET /api/status', method: 'GET', avg: 45, p50: 38, p95: 120, p99: 250, requestCount: 12450 },
      { id: 'ep-002', name: 'POST /api/harness/start', method: 'POST', avg: 230, p50: 180, p95: 450, p99: 890, requestCount: 342 },
      { id: 'ep-003', name: 'GET /api/features', method: 'GET', avg: 78, p50: 65, p95: 180, p99: 340, requestCount: 8920 },
      { id: 'ep-004', name: 'POST /api/harness/stop', method: 'POST', avg: 150, p50: 120, p95: 380, p99: 620, requestCount: 338 },
      { id: 'ep-005', name: 'GET /api/sessions', method: 'GET', avg: 92, p50: 75, p95: 210, p99: 420, requestCount: 5670 },
      { id: 'ep-006', name: 'POST /api/features/update', method: 'POST', avg: 185, p50: 150, p95: 400, p99: 750, requestCount: 2340 },
      { id: 'ep-007', name: 'GET /api/logs', method: 'GET', avg: 320, p50: 280, p95: 650, p99: 1200, requestCount: 15600 },
      { id: 'ep-008', name: 'POST /api/config', method: 'POST', avg: 55, p50: 42, p95: 130, p99: 280, requestCount: 890 },
    ];
  }
  function getEndpoint(id) { return getEndpoints().find(e => e.id === id) || null; }

  function getTrends() {
    return [
      { id: 'tr-001', endpoint: 'GET /api/status', period: '1h', avgLatency: 42, change: -3, direction: 'improving' },
      { id: 'tr-002', endpoint: 'GET /api/logs', period: '1h', avgLatency: 340, change: 20, direction: 'degrading' },
      { id: 'tr-003', endpoint: 'POST /api/harness/start', period: '6h', avgLatency: 225, change: -5, direction: 'improving' },
      { id: 'tr-004', endpoint: 'GET /api/features', period: '6h', avgLatency: 80, change: 2, direction: 'stable' },
      { id: 'tr-005', endpoint: 'POST /api/features/update', period: '24h', avgLatency: 190, change: 8, direction: 'degrading' },
      { id: 'tr-006', endpoint: 'GET /api/sessions', period: '24h', avgLatency: 88, change: -4, direction: 'improving' },
    ];
  }
  function getTrend(id) { return getTrends().find(t => t.id === id) || null; }

  function getSlowQueries() {
    return [
      { id: 'sq-001', endpoint: 'GET /api/logs', duration: 2400, timestamp: '2026-02-06T00:45:00Z', cause: 'Large result set - 50k+ log entries', status: 'resolved' },
      { id: 'sq-002', endpoint: 'POST /api/harness/start', duration: 1800, timestamp: '2026-02-06T00:30:00Z', cause: 'Cold start initialization', status: 'known' },
      { id: 'sq-003', endpoint: 'POST /api/features/update', duration: 1500, timestamp: '2026-02-05T23:15:00Z', cause: 'Concurrent write lock contention', status: 'investigating' },
      { id: 'sq-004', endpoint: 'GET /api/sessions', duration: 1200, timestamp: '2026-02-05T22:00:00Z', cause: 'Unindexed query on session history', status: 'resolved' },
    ];
  }
  function getSlowQuery(id) { return getSlowQueries().find(q => q.id === id) || null; }

  function getStats() {
    const endpoints = getEndpoints();
    const avgAll = Math.round(endpoints.reduce((a, e) => a + e.avg, 0) / endpoints.length);
    return { totalEndpoints: endpoints.length, avgLatency: avgAll + 'ms', trendCount: getTrends().length, slowCount: getSlowQueries().length };
  }

  function render() {
    const container = document.getElementById('api-latency-widget');
    if (!container) return;
    const stats = getStats();
    container.innerHTML = `
      <div id="api-latency-card">
        <div class="al-header"><h3>API Latency Tracking</h3></div>
        <div class="al-stats-row">
          <div class="al-stat-card"><div class="al-stat-val">${stats.totalEndpoints}</div><div class="al-stat-label">Endpoints</div></div>
          <div class="al-stat-card"><div class="al-stat-val">${stats.avgLatency}</div><div class="al-stat-label">Avg Latency</div></div>
          <div class="al-stat-card"><div class="al-stat-val">${stats.trendCount}</div><div class="al-stat-label">Trends</div></div>
          <div class="al-stat-card"><div class="al-stat-val">${stats.slowCount}</div><div class="al-stat-label">Slow Queries</div></div>
        </div>
        <div class="al-tabs">
          <button class="al-tab ${state.activeTab === 'endpoints' ? 'active' : ''}" data-tab="endpoints">Endpoints</button>
          <button class="al-tab ${state.activeTab === 'trends' ? 'active' : ''}" data-tab="trends">Trends</button>
          <button class="al-tab ${state.activeTab === 'slow' ? 'active' : ''}" data-tab="slow">Slow</button>
        </div>
        <div id="al-content"></div>
      </div>`;
    container.querySelectorAll('.al-tab').forEach(btn => { btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); }); });
    renderContent();
  }
  function renderContent() {
    const el = document.getElementById('al-content');
    if (!el) return;
    if (state.activeTab === 'endpoints') el.innerHTML = `<div class="al-list" id="al-endpoint-list">${getEndpoints().map(e => `<div class="al-endpoint-item" data-id="${e.id}"><div class="al-item-top"><div class="al-item-name">${e.name}</div><span class="al-badge" style="background:${e.avg<100?'#22c55e':e.avg<200?'#f59e0b':'#ef4444'}22;color:${e.avg<100?'#22c55e':e.avg<200?'#f59e0b':'#ef4444'}">${e.avg}ms avg</span></div><div class="al-item-detail">p50: ${e.p50}ms · p95: ${e.p95}ms · p99: ${e.p99}ms · ${e.requestCount.toLocaleString()} requests</div></div>`).join('')}</div>`;
    else if (state.activeTab === 'trends') el.innerHTML = `<div id="al-trend-section"><div class="al-list" id="al-trend-list">${getTrends().map(t => `<div class="al-trend-item" data-id="${t.id}"><div class="al-item-top"><div class="al-item-name">${t.endpoint}</div><span class="al-badge" style="background:${t.direction==='improving'?'#22c55e':t.direction==='degrading'?'#ef4444':'#6b7280'}22;color:${t.direction==='improving'?'#22c55e':t.direction==='degrading'?'#ef4444':'#6b7280'}">${t.direction}</span></div><div class="al-item-detail">Period: ${t.period} · Avg: ${t.avgLatency}ms · Change: ${t.change>0?'+':''}${t.change}ms</div></div>`).join('')}</div></div>`;
    else el.innerHTML = `<div id="al-slow-section"><div class="al-list" id="al-slow-list">${getSlowQueries().map(q => `<div class="al-slow-item" data-id="${q.id}"><div class="al-item-top"><div class="al-item-name">${q.endpoint}</div><span class="al-badge" style="background:${q.status==='resolved'?'#22c55e':q.status==='known'?'#f59e0b':'#ef4444'}22;color:${q.status==='resolved'?'#22c55e':q.status==='known'?'#f59e0b':'#ef4444'}">${q.duration}ms</span></div><div class="al-item-detail">${q.cause} · Status: ${q.status}</div></div>`).join('')}</div></div>`;
  }
  function saveState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab })); } catch(e){} }
  function loadState() { try { const s=localStorage.getItem(STORAGE_KEY); if(s){const p=JSON.parse(s); state.activeTab=p.activeTab||state.activeTab;} } catch(e){} }

  window.apiLatency = {
    getEndpoints, getEndpoint, getTrends, getTrend, getSlowQueries, getSlowQuery, getStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() { return { activeTab: state.activeTab, endpointCount: getEndpoints().length, trendCount: getTrends().length, slowCount: getSlowQueries().length }; },
  };
  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
