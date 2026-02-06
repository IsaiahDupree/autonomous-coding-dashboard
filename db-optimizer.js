// feat-085: Database Query Optimization
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #db-optimizer-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .dbo-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .dbo-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .dbo-tabs {
      display: flex; gap: 4px; margin-bottom: 16px;
      background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px;
    }
    .dbo-tab {
      flex: 1; padding: 6px 12px; border: none; background: transparent;
      color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px;
      font-size: 13px; transition: all 0.2s;
    }
    .dbo-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .dbo-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .dbo-stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .dbo-stat-card {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px; text-align: center;
    }
    .dbo-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .dbo-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .dbo-list { display: flex; flex-direction: column; gap: 8px; }
    .dbo-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .dbo-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .dbo-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .dbo-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .dbo-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-bottom: 4px; }
    .dbo-query {
      font-family: 'JetBrains Mono', monospace; font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0); background: rgba(0,0,0,0.2);
      padding: 6px 10px; border-radius: 4px; overflow-x: auto;
    }
    .dbo-bar { height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; margin-top: 8px; }
    .dbo-bar-fill { height: 6px; border-radius: 3px; transition: width 0.3s; }
    .dbo-pool-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .dbo-pool-card {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .dbo-pool-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .dbo-pool-val { font-size: 18px; font-weight: 700; color: var(--color-text, #e0e0e0); margin-top: 4px; }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'db-optimizer-config';

  const INDEXES = [
    { id: 'idx-1', table: 'features', column: 'id', type: 'primary', size: '2KB', usage: 100, status: 'active', createdAt: '2026-01-01' },
    { id: 'idx-2', table: 'features', column: 'category', type: 'btree', size: '1KB', usage: 85, status: 'active', createdAt: '2026-01-01' },
    { id: 'idx-3', table: 'features', column: 'passes', type: 'btree', size: '512B', usage: 72, status: 'active', createdAt: '2026-01-05' },
    { id: 'idx-4', table: 'sessions', column: 'started_at', type: 'btree', size: '4KB', usage: 90, status: 'active', createdAt: '2026-01-10' },
    { id: 'idx-5', table: 'sessions', column: 'status', type: 'btree', size: '1KB', usage: 65, status: 'active', createdAt: '2026-01-10' },
    { id: 'idx-6', table: 'audit_logs', column: 'timestamp', type: 'btree', size: '8KB', usage: 95, status: 'active', createdAt: '2026-01-15' },
    { id: 'idx-7', table: 'audit_logs', column: 'user_id', type: 'btree', size: '3KB', usage: 45, status: 'unused', createdAt: '2026-01-15' },
    { id: 'idx-8', table: 'deployments', column: 'environment', type: 'btree', size: '1KB', usage: 55, status: 'active', createdAt: '2026-01-20' },
  ];

  const QUERIES_LOG = [
    { id: 'q-1', query: 'SELECT * FROM features WHERE passes = true', table: 'features', avgTime: 2.3, execCount: 1200, lastExec: new Date(Date.now() - 60000).toISOString(), status: 'optimized', plan: 'Index Scan using idx_passes' },
    { id: 'q-2', query: 'SELECT * FROM features WHERE category = ?', table: 'features', avgTime: 1.8, execCount: 800, lastExec: new Date(Date.now() - 120000).toISOString(), status: 'optimized', plan: 'Index Scan using idx_category' },
    { id: 'q-3', query: 'SELECT * FROM sessions ORDER BY started_at DESC LIMIT 50', table: 'sessions', avgTime: 5.1, execCount: 450, lastExec: new Date(Date.now() - 300000).toISOString(), status: 'optimized', plan: 'Index Scan using idx_started_at' },
    { id: 'q-4', query: 'SELECT COUNT(*) FROM audit_logs WHERE timestamp > ?', table: 'audit_logs', avgTime: 12.5, execCount: 300, lastExec: new Date(Date.now() - 600000).toISOString(), status: 'slow', plan: 'Seq Scan (consider adding composite index)' },
    { id: 'q-5', query: 'SELECT * FROM deployments JOIN features ON ...', table: 'deployments', avgTime: 25.3, execCount: 100, lastExec: new Date(Date.now() - 1800000).toISOString(), status: 'slow', plan: 'Nested Loop Join (needs optimization)' },
    { id: 'q-6', query: 'INSERT INTO audit_logs (action, user_id, ...)', table: 'audit_logs', avgTime: 0.8, execCount: 5000, lastExec: new Date(Date.now() - 30000).toISOString(), status: 'optimized', plan: 'Direct Insert' },
  ];

  let state = {
    activeTab: 'indexes',
    pool: {
      maxConnections: 20,
      activeConnections: 8,
      idleConnections: 5,
      waitingRequests: 0,
      totalCreated: 156,
      totalDestroyed: 143,
      avgAcquireTime: 1.2,
      avgQueryTime: 4.5,
    },
  };

  // ── Core API ──────────────────────────────────────────────────
  function getIndexes(filter) {
    let indexes = [...INDEXES];
    if (filter?.table) indexes = indexes.filter(i => i.table === filter.table);
    if (filter?.status) indexes = indexes.filter(i => i.status === filter.status);
    return indexes;
  }

  function getIndex(id) {
    return INDEXES.find(i => i.id === id) || null;
  }

  function getIndexSuggestions() {
    return [
      { table: 'audit_logs', column: 'timestamp, action', reason: 'Composite index for filtered time queries', impact: 'high' },
      { table: 'deployments', column: 'feature_id', reason: 'Foreign key lookup optimization', impact: 'medium' },
    ];
  }

  function analyzeQuery(queryId) {
    const q = QUERIES_LOG.find(q => q.id === queryId);
    if (!q) return null;
    return {
      id: q.id, query: q.query, table: q.table,
      avgTime: q.avgTime, execCount: q.execCount,
      plan: q.plan, status: q.status,
      suggestions: q.status === 'slow' ? ['Add composite index', 'Consider query restructuring'] : [],
    };
  }

  function getQueryLog(filter) {
    let queries = [...QUERIES_LOG];
    if (filter?.status) queries = queries.filter(q => q.status === filter.status);
    if (filter?.table) queries = queries.filter(q => q.table === filter.table);
    return queries;
  }

  function getSlowQueries() {
    return QUERIES_LOG.filter(q => q.status === 'slow');
  }

  function getConnectionPool() {
    return { ...state.pool };
  }

  function updatePoolConfig(config) {
    Object.assign(state.pool, config);
    saveState();
    render();
    return getConnectionPool();
  }

  function getPoolUtilization() {
    return {
      utilization: Math.round(state.pool.activeConnections / state.pool.maxConnections * 100),
      available: state.pool.maxConnections - state.pool.activeConnections - state.pool.idleConnections,
      healthy: state.pool.waitingRequests === 0,
    };
  }

  function getStats() {
    const slow = getSlowQueries().length;
    const util = getPoolUtilization();
    return {
      totalIndexes: INDEXES.length,
      slowQueries: slow,
      poolUtilization: util.utilization + '%',
      avgQueryTime: state.pool.avgQueryTime + 'ms',
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('db-optimizer-widget');
    if (!container) return;
    const stats = getStats();

    container.innerHTML = `
      <div id="db-optimizer-card">
        <div class="dbo-header"><h3>Database Query Optimization</h3></div>
        <div class="dbo-stats-row" id="dbo-stats">
          <div class="dbo-stat-card"><div class="dbo-stat-val">${stats.totalIndexes}</div><div class="dbo-stat-label">Indexes</div></div>
          <div class="dbo-stat-card"><div class="dbo-stat-val">${stats.slowQueries}</div><div class="dbo-stat-label">Slow Queries</div></div>
          <div class="dbo-stat-card"><div class="dbo-stat-val">${stats.poolUtilization}</div><div class="dbo-stat-label">Pool Usage</div></div>
          <div class="dbo-stat-card"><div class="dbo-stat-val">${stats.avgQueryTime}</div><div class="dbo-stat-label">Avg Query</div></div>
        </div>
        <div class="dbo-tabs" id="dbo-tabs">
          <button class="dbo-tab ${state.activeTab === 'indexes' ? 'active' : ''}" data-tab="indexes">Indexes</button>
          <button class="dbo-tab ${state.activeTab === 'queries' ? 'active' : ''}" data-tab="queries">Query Analysis</button>
          <button class="dbo-tab ${state.activeTab === 'pool' ? 'active' : ''}" data-tab="pool">Connection Pool</button>
        </div>
        <div id="dbo-content"></div>
      </div>
    `;

    container.querySelectorAll('.dbo-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('dbo-content');
    if (!el) return;
    if (state.activeTab === 'indexes') renderIndexes(el);
    else if (state.activeTab === 'queries') renderQueries(el);
    else renderPool(el);
  }

  function renderIndexes(el) {
    const indexes = getIndexes();
    const suggestions = getIndexSuggestions();
    el.innerHTML = `
      <div class="dbo-list" id="dbo-index-list">
        ${indexes.map(i => `
          <div class="dbo-item" data-index="${i.id}">
            <div class="dbo-item-top">
              <div class="dbo-item-name">${i.table}.${i.column}</div>
              <span class="dbo-badge" style="background:${i.status === 'active' ? '#22c55e' : '#f59e0b'}22;color:${i.status === 'active' ? '#22c55e' : '#f59e0b'}">${i.type} · ${i.status}</span>
            </div>
            <div class="dbo-item-detail">Size: ${i.size} · Usage: ${i.usage}%</div>
            <div class="dbo-bar"><div class="dbo-bar-fill" style="width:${i.usage}%;background:${i.usage > 70 ? '#22c55e' : '#f59e0b'}"></div></div>
          </div>
        `).join('')}
        ${suggestions.length > 0 ? `
          <div class="dbo-item" style="border-color:#f59e0b44">
            <div class="dbo-item-name" style="color:#f59e0b">Suggestions</div>
            ${suggestions.map(s => `<div class="dbo-item-detail">${s.table}.${s.column}: ${s.reason} (${s.impact} impact)</div>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderQueries(el) {
    const queries = getQueryLog();
    el.innerHTML = `
      <div class="dbo-list" id="dbo-query-list">
        ${queries.map(q => `
          <div class="dbo-item" data-query="${q.id}">
            <div class="dbo-item-top">
              <div class="dbo-item-name">${q.table}</div>
              <span class="dbo-badge" style="background:${q.status === 'optimized' ? '#22c55e' : '#ef4444'}22;color:${q.status === 'optimized' ? '#22c55e' : '#ef4444'}">${q.avgTime}ms · ${q.status}</span>
            </div>
            <div class="dbo-query">${q.query}</div>
            <div class="dbo-item-detail" style="margin-top:6px">Plan: ${q.plan} · Executions: ${q.execCount}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderPool(el) {
    const p = getConnectionPool();
    const util = getPoolUtilization();
    el.innerHTML = `
      <div id="dbo-pool-section">
        <div class="dbo-pool-grid" id="dbo-pool-grid">
          <div class="dbo-pool-card"><div class="dbo-pool-label">Max Connections</div><div class="dbo-pool-val">${p.maxConnections}</div></div>
          <div class="dbo-pool-card"><div class="dbo-pool-label">Active</div><div class="dbo-pool-val" style="color:#6366f1">${p.activeConnections}</div></div>
          <div class="dbo-pool-card"><div class="dbo-pool-label">Idle</div><div class="dbo-pool-val" style="color:#22c55e">${p.idleConnections}</div></div>
          <div class="dbo-pool-card"><div class="dbo-pool-label">Waiting</div><div class="dbo-pool-val" style="color:${p.waitingRequests > 0 ? '#ef4444' : '#22c55e'}">${p.waitingRequests}</div></div>
          <div class="dbo-pool-card"><div class="dbo-pool-label">Total Created</div><div class="dbo-pool-val">${p.totalCreated}</div></div>
          <div class="dbo-pool-card"><div class="dbo-pool-label">Total Destroyed</div><div class="dbo-pool-val">${p.totalDestroyed}</div></div>
          <div class="dbo-pool-card"><div class="dbo-pool-label">Avg Acquire Time</div><div class="dbo-pool-val">${p.avgAcquireTime}ms</div></div>
          <div class="dbo-pool-card"><div class="dbo-pool-label">Avg Query Time</div><div class="dbo-pool-val">${p.avgQueryTime}ms</div></div>
        </div>
        <div class="dbo-item" style="margin-top:12px">
          <div class="dbo-item-top">
            <div class="dbo-item-name">Pool Utilization</div>
            <span class="dbo-badge" style="background:${util.healthy ? '#22c55e' : '#ef4444'}22;color:${util.healthy ? '#22c55e' : '#ef4444'}">${util.utilization}% · ${util.healthy ? 'Healthy' : 'Overloaded'}</span>
          </div>
          <div class="dbo-bar"><div class="dbo-bar-fill" style="width:${util.utilization}%;background:${util.utilization > 80 ? '#ef4444' : '#22c55e'}"></div></div>
        </div>
      </div>
    `;
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab, pool: state.pool })); } catch (e) {}
  }
  function loadState() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) { const p = JSON.parse(s); state.activeTab = p.activeTab || state.activeTab; if (p.pool) Object.assign(state.pool, p.pool); }
    } catch (e) {}
  }

  window.dbOptimizer = {
    getIndexes, getIndex, getIndexSuggestions,
    analyzeQuery, getQueryLog, getSlowQueries,
    getConnectionPool, updatePoolConfig, getPoolUtilization, getStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        indexCount: INDEXES.length,
        queryCount: QUERIES_LOG.length,
        poolConfig: { ...state.pool },
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
