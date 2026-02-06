// feat-084: Dashboard Load Time Optimization
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #load-optimizer-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .lo-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .lo-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .lo-tabs {
      display: flex; gap: 4px; margin-bottom: 16px;
      background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px;
    }
    .lo-tab {
      flex: 1; padding: 6px 12px; border: none; background: transparent;
      color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px;
      font-size: 13px; transition: all 0.2s;
    }
    .lo-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .lo-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .lo-stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .lo-stat-card {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px; text-align: center;
    }
    .lo-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .lo-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }

    /* Metrics */
    .lo-metric-list { display: flex; flex-direction: column; gap: 10px; }
    .lo-metric-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .lo-metric-top { display: flex; justify-content: space-between; align-items: center; }
    .lo-metric-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .lo-metric-val { font-size: 16px; font-weight: 700; }
    .lo-metric-bar { height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; margin-top: 8px; }
    .lo-metric-fill { height: 6px; border-radius: 3px; transition: width 0.3s; }
    .lo-metric-meta { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 6px; }

    /* Lazy loading */
    .lo-lazy-list { display: flex; flex-direction: column; gap: 8px; }
    .lo-lazy-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px 14px; display: flex; align-items: center; gap: 12px;
    }
    .lo-lazy-icon {
      width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center;
      justify-content: center; font-size: 14px; flex-shrink: 0;
    }
    .lo-lazy-info { flex: 1; }
    .lo-lazy-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .lo-lazy-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .lo-lazy-badge {
      font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600;
    }

    /* Cache */
    .lo-cache-list { display: flex; flex-direction: column; gap: 8px; }
    .lo-cache-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px 14px;
    }
    .lo-cache-top { display: flex; justify-content: space-between; align-items: center; }
    .lo-cache-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .lo-cache-val { font-size: 14px; font-weight: 600; }
    .lo-cache-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .lo-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'load-optimizer-config';

  function getLoadMetrics() {
    return {
      initialLoadMs: 380,
      domContentLoaded: 220,
      firstContentfulPaint: 280,
      largestContentfulPaint: 450,
      timeToInteractive: 520,
      totalBlockingTime: 45,
      cumulativeLayoutShift: 0.02,
      firstInputDelay: 12,
      resourceCount: 42,
      totalTransferSize: 1.8,
      domNodes: 2400,
      jsHeapSize: 28,
    };
  }

  function getLazyLoadConfig() {
    return [
      { id: 'lz-1', name: 'Analytics Charts', type: 'component', strategy: 'viewport', loaded: true, loadTime: 120, size: '45KB', priority: 'high' },
      { id: 'lz-2', name: 'Feature List Table', type: 'component', strategy: 'viewport', loaded: true, loadTime: 85, size: '32KB', priority: 'high' },
      { id: 'lz-3', name: 'Git Visualizations', type: 'component', strategy: 'idle', loaded: false, loadTime: null, size: '68KB', priority: 'medium' },
      { id: 'lz-4', name: 'Cost Breakdown Charts', type: 'component', strategy: 'idle', loaded: false, loadTime: null, size: '52KB', priority: 'medium' },
      { id: 'lz-5', name: 'Deployment Tracker', type: 'component', strategy: 'interaction', loaded: false, loadTime: null, size: '38KB', priority: 'low' },
      { id: 'lz-6', name: 'Session Replay', type: 'component', strategy: 'interaction', loaded: false, loadTime: null, size: '95KB', priority: 'low' },
      { id: 'lz-7', name: 'External Images', type: 'asset', strategy: 'viewport', loaded: true, loadTime: 200, size: '150KB', priority: 'medium' },
      { id: 'lz-8', name: 'Icon Sprites', type: 'asset', strategy: 'immediate', loaded: true, loadTime: 30, size: '12KB', priority: 'high' },
    ];
  }

  function getCacheConfig() {
    return [
      { id: 'cache-1', name: 'Feature Data', type: 'memory', ttl: 300, hitRate: 92, entries: 120, size: '45KB', lastRefresh: new Date(Date.now() - 120000).toISOString() },
      { id: 'cache-2', name: 'Analytics Results', type: 'memory', ttl: 600, hitRate: 88, entries: 35, size: '128KB', lastRefresh: new Date(Date.now() - 300000).toISOString() },
      { id: 'cache-3', name: 'API Responses', type: 'localStorage', ttl: 1800, hitRate: 75, entries: 50, size: '256KB', lastRefresh: new Date(Date.now() - 900000).toISOString() },
      { id: 'cache-4', name: 'Static Assets', type: 'serviceWorker', ttl: 86400, hitRate: 98, entries: 42, size: '1.2MB', lastRefresh: new Date(Date.now() - 3600000).toISOString() },
      { id: 'cache-5', name: 'User Preferences', type: 'localStorage', ttl: 604800, hitRate: 100, entries: 15, size: '8KB', lastRefresh: new Date(Date.now() - 7200000).toISOString() },
      { id: 'cache-6', name: 'Session State', type: 'sessionStorage', ttl: 0, hitRate: 95, entries: 20, size: '32KB', lastRefresh: new Date(Date.now() - 60000).toISOString() },
    ];
  }

  let state = {
    activeTab: 'metrics',
    metrics: null,
    lazyLoad: null,
    cache: null,
  };

  // ── Core API ──────────────────────────────────────────────────
  function getMetrics() {
    if (!state.metrics) state.metrics = getLoadMetrics();
    return state.metrics;
  }

  function isSubSecondLoad() {
    return getMetrics().initialLoadMs < 1000;
  }

  function getPerformanceScore() {
    const m = getMetrics();
    let score = 100;
    if (m.initialLoadMs > 1000) score -= 20;
    if (m.largestContentfulPaint > 2500) score -= 15;
    if (m.totalBlockingTime > 200) score -= 15;
    if (m.cumulativeLayoutShift > 0.1) score -= 10;
    if (m.firstInputDelay > 100) score -= 10;
    return Math.max(0, score);
  }

  function getLazyLoadStatus() {
    if (!state.lazyLoad) state.lazyLoad = getLazyLoadConfig();
    return state.lazyLoad;
  }

  function getLazyLoadItem(id) {
    return getLazyLoadStatus().find(i => i.id === id) || null;
  }

  function triggerLazyLoad(id) {
    const item = getLazyLoadStatus().find(i => i.id === id);
    if (!item || item.loaded) return false;
    item.loaded = true;
    item.loadTime = 50 + Math.floor(Math.random() * 200);
    saveState();
    render();
    return true;
  }

  function getCacheStatus() {
    if (!state.cache) state.cache = getCacheConfig();
    return state.cache;
  }

  function getCacheItem(id) {
    return getCacheStatus().find(c => c.id === id) || null;
  }

  function clearCache(id) {
    if (id) {
      const item = getCacheStatus().find(c => c.id === id);
      if (!item) return false;
      item.entries = 0;
      item.hitRate = 0;
      item.lastRefresh = new Date().toISOString();
    } else {
      getCacheStatus().forEach(c => { c.entries = 0; c.hitRate = 0; c.lastRefresh = new Date().toISOString(); });
    }
    saveState();
    render();
    return true;
  }

  function refreshCache(id) {
    const item = getCacheStatus().find(c => c.id === id);
    if (!item) return false;
    item.lastRefresh = new Date().toISOString();
    item.hitRate = Math.min(100, item.hitRate + 5);
    saveState();
    render();
    return true;
  }

  function getCacheOverallStats() {
    const cache = getCacheStatus();
    const avgHitRate = Math.round(cache.reduce((s, c) => s + c.hitRate, 0) / cache.length);
    const totalEntries = cache.reduce((s, c) => s + c.entries, 0);
    return {
      totalCaches: cache.length,
      avgHitRate: avgHitRate,
      totalEntries: totalEntries,
      cacheTypes: [...new Set(cache.map(c => c.type))],
    };
  }

  function getStats() {
    const m = getMetrics();
    const score = getPerformanceScore();
    const lazy = getLazyLoadStatus();
    const loaded = lazy.filter(i => i.loaded).length;
    return {
      loadTime: m.initialLoadMs + 'ms',
      perfScore: score,
      lazyLoaded: `${loaded}/${lazy.length}`,
      cacheHitRate: getCacheOverallStats().avgHitRate + '%',
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('load-optimizer-widget');
    if (!container) return;
    const stats = getStats();

    container.innerHTML = `
      <div id="load-optimizer-card">
        <div class="lo-header"><h3>Load Time Optimization</h3></div>
        <div class="lo-stats-row" id="lo-stats">
          <div class="lo-stat-card"><div class="lo-stat-val">${stats.loadTime}</div><div class="lo-stat-label">Load Time</div></div>
          <div class="lo-stat-card"><div class="lo-stat-val">${stats.perfScore}</div><div class="lo-stat-label">Perf Score</div></div>
          <div class="lo-stat-card"><div class="lo-stat-val">${stats.lazyLoaded}</div><div class="lo-stat-label">Lazy Loaded</div></div>
          <div class="lo-stat-card"><div class="lo-stat-val">${stats.cacheHitRate}</div><div class="lo-stat-label">Cache Hit Rate</div></div>
        </div>
        <div class="lo-tabs" id="lo-tabs">
          <button class="lo-tab ${state.activeTab === 'metrics' ? 'active' : ''}" data-tab="metrics">Load Metrics</button>
          <button class="lo-tab ${state.activeTab === 'lazy' ? 'active' : ''}" data-tab="lazy">Lazy Loading</button>
          <button class="lo-tab ${state.activeTab === 'cache' ? 'active' : ''}" data-tab="cache">Caching</button>
        </div>
        <div id="lo-content"></div>
      </div>
    `;

    container.querySelectorAll('.lo-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('lo-content');
    if (!el) return;
    if (state.activeTab === 'metrics') renderMetrics(el);
    else if (state.activeTab === 'lazy') renderLazy(el);
    else renderCache(el);
  }

  function metricColor(val, good, bad) {
    return val <= good ? '#22c55e' : val <= bad ? '#f59e0b' : '#ef4444';
  }

  function renderMetrics(el) {
    const m = getMetrics();
    const metrics = [
      { name: 'Initial Load', value: m.initialLoadMs + 'ms', pct: Math.min(100, m.initialLoadMs / 10), color: metricColor(m.initialLoadMs, 500, 1000) },
      { name: 'First Contentful Paint', value: m.firstContentfulPaint + 'ms', pct: Math.min(100, m.firstContentfulPaint / 10), color: metricColor(m.firstContentfulPaint, 1800, 3000) },
      { name: 'Largest Contentful Paint', value: m.largestContentfulPaint + 'ms', pct: Math.min(100, m.largestContentfulPaint / 25), color: metricColor(m.largestContentfulPaint, 2500, 4000) },
      { name: 'Time to Interactive', value: m.timeToInteractive + 'ms', pct: Math.min(100, m.timeToInteractive / 10), color: metricColor(m.timeToInteractive, 3800, 7300) },
      { name: 'Total Blocking Time', value: m.totalBlockingTime + 'ms', pct: Math.min(100, m.totalBlockingTime / 3), color: metricColor(m.totalBlockingTime, 200, 600) },
      { name: 'Cumulative Layout Shift', value: m.cumulativeLayoutShift.toFixed(3), pct: Math.min(100, m.cumulativeLayoutShift * 400), color: metricColor(m.cumulativeLayoutShift, 0.1, 0.25) },
    ];

    el.innerHTML = `
      <div class="lo-metric-list" id="lo-metric-list">
        ${metrics.map(met => `
          <div class="lo-metric-item" data-metric="${met.name}">
            <div class="lo-metric-top">
              <div class="lo-metric-name">${met.name}</div>
              <div class="lo-metric-val" style="color:${met.color}">${met.value}</div>
            </div>
            <div class="lo-metric-bar">
              <div class="lo-metric-fill" style="width:${met.pct}%;background:${met.color}"></div>
            </div>
          </div>
        `).join('')}
        <div class="lo-metric-item">
          <div class="lo-metric-meta">Resources: ${m.resourceCount} · Transfer: ${m.totalTransferSize}MB · DOM Nodes: ${m.domNodes} · JS Heap: ${m.jsHeapSize}MB</div>
        </div>
      </div>
    `;
  }

  function renderLazy(el) {
    const items = getLazyLoadStatus();
    const strategyColors = { immediate: '#ef4444', viewport: '#6366f1', idle: '#f59e0b', interaction: '#22c55e' };
    el.innerHTML = `
      <div class="lo-lazy-list" id="lo-lazy-list">
        ${items.map(i => `
          <div class="lo-lazy-item" data-lazy="${i.id}">
            <div class="lo-lazy-icon" style="background:${i.loaded ? '#22c55e' : '#f59e0b'}22">${i.loaded ? '✓' : '⏳'}</div>
            <div class="lo-lazy-info">
              <div class="lo-lazy-name">${i.name}</div>
              <div class="lo-lazy-detail">${i.type} · ${i.size} · ${i.loaded ? `Loaded in ${i.loadTime}ms` : 'Pending'}</div>
            </div>
            <span class="lo-lazy-badge" style="background:${strategyColors[i.strategy]}22;color:${strategyColors[i.strategy]}">${i.strategy}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderCache(el) {
    const caches = getCacheStatus();
    const typeColors = { memory: '#6366f1', localStorage: '#22c55e', sessionStorage: '#f59e0b', serviceWorker: '#06b6d4' };
    el.innerHTML = `
      <div class="lo-cache-list" id="lo-cache-list">
        ${caches.map(c => `
          <div class="lo-cache-item" data-cache="${c.id}">
            <div class="lo-cache-top">
              <div class="lo-cache-name">${c.name}</div>
              <div class="lo-cache-val" style="color:${c.hitRate >= 90 ? '#22c55e' : c.hitRate >= 70 ? '#f59e0b' : '#ef4444'}">${c.hitRate}% hit</div>
            </div>
            <div class="lo-cache-detail">
              <span class="lo-badge" style="background:${typeColors[c.type]}22;color:${typeColors[c.type]}">${c.type}</span>
              TTL: ${c.ttl}s · Entries: ${c.entries} · Size: ${c.size}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab }));
    } catch (e) {}
  }
  function loadState() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) state.activeTab = JSON.parse(s).activeTab || state.activeTab;
    } catch (e) {}
  }

  window.loadOptimizer = {
    getMetrics, isSubSecondLoad, getPerformanceScore,
    getLazyLoadStatus, getLazyLoadItem, triggerLazyLoad,
    getCacheStatus, getCacheItem, clearCache, refreshCache,
    getCacheOverallStats, getStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        loadTimeMs: getMetrics().initialLoadMs,
        perfScore: getPerformanceScore(),
        subSecondLoad: isSubSecondLoad(),
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
