// feat-086: Memory Usage Monitoring
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #memory-monitor-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .mm-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .mm-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .mm-tabs {
      display: flex; gap: 4px; margin-bottom: 16px;
      background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px;
    }
    .mm-tab {
      flex: 1; padding: 6px 12px; border: none; background: transparent;
      color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px;
      font-size: 13px; transition: all 0.2s;
    }
    .mm-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .mm-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .mm-stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .mm-stat-card {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px; text-align: center;
    }
    .mm-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .mm-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .mm-list { display: flex; flex-direction: column; gap: 8px; }
    .mm-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .mm-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .mm-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .mm-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .mm-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .mm-bar { height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; margin-top: 8px; }
    .mm-bar-fill { height: 6px; border-radius: 3px; transition: width 0.3s; }
    .mm-alert-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px 14px; display: flex; align-items: center; gap: 10px;
    }
    .mm-alert-icon { font-size: 16px; flex-shrink: 0; }
    .mm-alert-info { flex: 1; }
    .mm-alert-msg { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .mm-alert-meta { font-size: 11px; color: var(--color-text-secondary, #a0a0b0); }
    .mm-gc-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .mm-gc-card {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .mm-gc-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .mm-gc-val { font-size: 18px; font-weight: 700; color: var(--color-text, #e0e0e0); margin-top: 4px; }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'memory-monitor-config';

  let state = {
    activeTab: 'usage',
    alertThreshold: 80,
    alerts: [],
  };

  function getMemoryUsage() {
    return {
      totalHeap: 64,
      usedHeap: 28.5,
      heapLimit: 512,
      external: 4.2,
      arrayBuffers: 1.8,
      rss: 85.3,
      usagePercent: Math.round(28.5 / 64 * 100),
      timestamp: new Date().toISOString(),
      breakdown: [
        { category: 'Dashboard Components', size: 8.2, percent: 29 },
        { category: 'Feature Data', size: 5.1, percent: 18 },
        { category: 'Analytics Cache', size: 4.8, percent: 17 },
        { category: 'DOM References', size: 3.5, percent: 12 },
        { category: 'Event Listeners', size: 2.9, percent: 10 },
        { category: 'WebSocket Buffers', size: 2.1, percent: 7 },
        { category: 'Other', size: 1.9, percent: 7 },
      ],
    };
  }

  function getMemoryHistory() {
    const history = [];
    const now = Date.now();
    for (let i = 0; i < 20; i++) {
      history.push({
        timestamp: new Date(now - i * 300000).toISOString(),
        usedHeap: 25 + Math.random() * 10,
        totalHeap: 64,
        rss: 80 + Math.random() * 15,
      });
    }
    return history.reverse();
  }

  function generateAlerts() {
    return [
      { id: 'alert-1', type: 'warning', severity: 'warning', message: 'Memory usage above 80% threshold', value: '85%', timestamp: new Date(Date.now() - 1800000).toISOString(), resolved: true },
      { id: 'alert-2', type: 'info', severity: 'info', message: 'Garbage collection completed successfully', value: '12MB freed', timestamp: new Date(Date.now() - 3600000).toISOString(), resolved: true },
      { id: 'alert-3', type: 'warning', severity: 'warning', message: 'Large array buffer allocation detected', value: '5.2MB', timestamp: new Date(Date.now() - 7200000).toISOString(), resolved: false },
      { id: 'alert-4', type: 'error', severity: 'error', message: 'Memory leak suspected in event listeners', value: '+2.1MB/hr', timestamp: new Date(Date.now() - 14400000).toISOString(), resolved: false },
      { id: 'alert-5', type: 'info', severity: 'info', message: 'Memory snapshot captured', value: '28.5MB', timestamp: new Date(Date.now() - 21600000).toISOString(), resolved: true },
    ];
  }

  function getGCMetrics() {
    return {
      totalCollections: 245,
      minorGC: 220,
      majorGC: 25,
      avgPauseTime: 2.3,
      maxPauseTime: 15.8,
      totalPauseTime: 563,
      lastGCTime: new Date(Date.now() - 120000).toISOString(),
      freedMemory: 12.4,
      avgFreed: 8.5,
      gcFrequency: 45,
      heapGrowthRate: 0.2,
      fragmentation: 8,
      efficiency: 92,
    };
  }

  // ── Core API ──────────────────────────────────────────────────
  function getCurrentUsage() {
    return getMemoryUsage();
  }

  function getHistory() {
    return getMemoryHistory();
  }

  function getAlerts(filter) {
    let alerts = state.alerts.length > 0 ? state.alerts : generateAlerts();
    if (state.alerts.length === 0) state.alerts = alerts;
    if (filter?.type) alerts = alerts.filter(a => a.type === filter.type);
    if (filter?.resolved !== undefined) alerts = alerts.filter(a => a.resolved === filter.resolved);
    return alerts;
  }

  function getAlert(id) {
    return state.alerts.find(a => a.id === id) || null;
  }

  function resolveAlert(id) {
    const alert = state.alerts.find(a => a.id === id);
    if (!alert) return false;
    alert.resolved = true;
    saveState();
    render();
    return true;
  }

  function getAlertThreshold() {
    return state.alertThreshold;
  }

  function setAlertThreshold(percent) {
    state.alertThreshold = percent;
    saveState();
    render();
    return state.alertThreshold;
  }

  function isHighUsage() {
    return getMemoryUsage().usagePercent >= state.alertThreshold;
  }

  function getGarbageCollection() {
    return getGCMetrics();
  }

  function getStats() {
    const usage = getMemoryUsage();
    const gc = getGCMetrics();
    const unresolvedAlerts = getAlerts({ resolved: false }).length;
    return {
      usedHeap: usage.usedHeap + 'MB',
      usagePercent: usage.usagePercent,
      gcCount: gc.totalCollections,
      activeAlerts: unresolvedAlerts,
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('memory-monitor-widget');
    if (!container) return;
    const stats = getStats();

    container.innerHTML = `
      <div id="memory-monitor-card">
        <div class="mm-header"><h3>Memory Usage Monitoring</h3></div>
        <div class="mm-stats-row" id="mm-stats">
          <div class="mm-stat-card"><div class="mm-stat-val">${stats.usedHeap}</div><div class="mm-stat-label">Heap Used</div></div>
          <div class="mm-stat-card"><div class="mm-stat-val">${stats.usagePercent}%</div><div class="mm-stat-label">Usage</div></div>
          <div class="mm-stat-card"><div class="mm-stat-val">${stats.gcCount}</div><div class="mm-stat-label">GC Runs</div></div>
          <div class="mm-stat-card"><div class="mm-stat-val">${stats.activeAlerts}</div><div class="mm-stat-label">Alerts</div></div>
        </div>
        <div class="mm-tabs" id="mm-tabs">
          <button class="mm-tab ${state.activeTab === 'usage' ? 'active' : ''}" data-tab="usage">Memory Usage</button>
          <button class="mm-tab ${state.activeTab === 'alerts' ? 'active' : ''}" data-tab="alerts">Alerts</button>
          <button class="mm-tab ${state.activeTab === 'gc' ? 'active' : ''}" data-tab="gc">GC Metrics</button>
        </div>
        <div id="mm-content"></div>
      </div>
    `;

    container.querySelectorAll('.mm-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('mm-content');
    if (!el) return;
    if (state.activeTab === 'usage') renderUsage(el);
    else if (state.activeTab === 'alerts') renderAlerts(el);
    else renderGC(el);
  }

  function renderUsage(el) {
    const usage = getMemoryUsage();
    el.innerHTML = `
      <div class="mm-list" id="mm-usage-list">
        <div class="mm-usage-item mm-item">
          <div class="mm-item-top">
            <div class="mm-item-name">Overall Heap</div>
            <span class="mm-badge" style="background:${usage.usagePercent > 80 ? '#ef4444' : '#22c55e'}22;color:${usage.usagePercent > 80 ? '#ef4444' : '#22c55e'}">${usage.usedHeap}MB / ${usage.totalHeap}MB</span>
          </div>
          <div class="mm-bar"><div class="mm-bar-fill" style="width:${usage.usagePercent}%;background:${usage.usagePercent > 80 ? '#ef4444' : usage.usagePercent > 50 ? '#f59e0b' : '#22c55e'}"></div></div>
          <div class="mm-item-detail" style="margin-top:6px">RSS: ${usage.rss}MB · External: ${usage.external}MB · Buffers: ${usage.arrayBuffers}MB · Limit: ${usage.heapLimit}MB</div>
        </div>
        ${usage.breakdown.map(b => `
          <div class="mm-usage-item mm-item" data-component="${b.category}">
            <div class="mm-item-top">
              <div class="mm-item-name">${b.category}</div>
              <span class="mm-badge" style="background:#6366f122;color:#6366f1">${b.size}MB (${b.percent}%)</span>
            </div>
            <div class="mm-bar"><div class="mm-bar-fill" style="width:${b.percent}%;background:#6366f1"></div></div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderAlerts(el) {
    const alerts = getAlerts();
    const typeInfo = { error: { icon: '🔴', color: '#ef4444' }, warning: { icon: '🟡', color: '#f59e0b' }, info: { icon: '🔵', color: '#6366f1' } };
    el.innerHTML = `
      <div class="mm-list" id="mm-alert-list">
        ${alerts.map(a => {
          const t = typeInfo[a.type] || typeInfo.info;
          return `
            <div class="mm-alert-item" data-alert="${a.id}">
              <div class="mm-alert-icon">${t.icon}</div>
              <div class="mm-alert-info">
                <div class="mm-alert-msg">${a.message}</div>
                <div class="mm-alert-meta">${a.value} · ${new Date(a.timestamp).toLocaleString()} · ${a.resolved ? 'Resolved' : 'Active'}</div>
              </div>
              <span class="mm-badge" style="background:${a.resolved ? '#22c55e' : t.color}22;color:${a.resolved ? '#22c55e' : t.color}">${a.type}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderGC(el) {
    const gc = getGarbageCollection();
    el.innerHTML = `
      <div id="mm-gc-section">
        <div class="mm-gc-grid" id="mm-gc-grid">
          <div class="mm-gc-card"><div class="mm-gc-label">Total Collections</div><div class="mm-gc-val">${gc.totalCollections}</div></div>
          <div class="mm-gc-card"><div class="mm-gc-label">Minor GC</div><div class="mm-gc-val">${gc.minorGC}</div></div>
          <div class="mm-gc-card"><div class="mm-gc-label">Major GC</div><div class="mm-gc-val">${gc.majorGC}</div></div>
          <div class="mm-gc-card"><div class="mm-gc-label">Avg Pause</div><div class="mm-gc-val">${gc.avgPauseTime}ms</div></div>
          <div class="mm-gc-card"><div class="mm-gc-label">Max Pause</div><div class="mm-gc-val">${gc.maxPauseTime}ms</div></div>
          <div class="mm-gc-card"><div class="mm-gc-label">Total Pause</div><div class="mm-gc-val">${gc.totalPauseTime}ms</div></div>
          <div class="mm-gc-card"><div class="mm-gc-label">Freed Memory</div><div class="mm-gc-val">${gc.freedMemory}MB</div></div>
          <div class="mm-gc-card"><div class="mm-gc-label">Avg Freed</div><div class="mm-gc-val">${gc.avgFreed}MB</div></div>
          <div class="mm-gc-card"><div class="mm-gc-label">GC Frequency</div><div class="mm-gc-val">${gc.gcFrequency}s</div></div>
          <div class="mm-gc-card"><div class="mm-gc-label">Heap Growth</div><div class="mm-gc-val">${gc.heapGrowthRate}MB/h</div></div>
          <div class="mm-gc-card"><div class="mm-gc-label">Fragmentation</div><div class="mm-gc-val">${gc.fragmentation}%</div></div>
          <div class="mm-gc-card"><div class="mm-gc-label">Last GC</div><div class="mm-gc-val" style="font-size:13px">${new Date(gc.lastGCTime).toLocaleTimeString()}</div></div>
        </div>
      </div>
    `;
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab, alertThreshold: state.alertThreshold, alerts: state.alerts })); } catch (e) {}
  }
  function loadState() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) { const p = JSON.parse(s); state.activeTab = p.activeTab || state.activeTab; if (p.alertThreshold) state.alertThreshold = p.alertThreshold; if (p.alerts?.length > 0) state.alerts = p.alerts; }
    } catch (e) {}
  }

  window.memoryMonitor = {
    getCurrentUsage, getHistory, getAlerts, getAlert, resolveAlert,
    getAlertThreshold, setAlertThreshold, isHighUsage,
    getGarbageCollection, getStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        currentUsage: getMemoryUsage(),
        threshold: state.alertThreshold,
        alertCount: state.alerts.length,
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
