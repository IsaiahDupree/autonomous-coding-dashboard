// feat-081: REST API for External Integrations
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #rest-api-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .ra-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .ra-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .ra-badge {
      font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600;
    }
    .ra-tabs {
      display: flex; gap: 4px; margin-bottom: 16px;
      background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px;
    }
    .ra-tab {
      flex: 1; padding: 6px 12px; border: none; background: transparent;
      color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px;
      font-size: 13px; transition: all 0.2s;
    }
    .ra-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .ra-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .ra-stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .ra-stat-card {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px; text-align: center;
    }
    .ra-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .ra-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }

    /* Endpoints */
    .ra-endpoint-list { display: flex; flex-direction: column; gap: 8px; }
    .ra-endpoint-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .ra-endpoint-top { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .ra-method-badge {
      font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }
    .ra-method-GET { background: #22c55e22; color: #22c55e; }
    .ra-method-POST { background: #6366f122; color: #6366f1; }
    .ra-method-PUT { background: #f59e0b22; color: #f59e0b; }
    .ra-method-DELETE { background: #ef444422; color: #ef4444; }
    .ra-method-PATCH { background: #8b5cf622; color: #8b5cf6; }
    .ra-endpoint-path {
      font-family: 'JetBrains Mono', monospace; font-size: 13px;
      color: var(--color-text, #e0e0e0); font-weight: 500;
    }
    .ra-endpoint-desc { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-bottom: 6px; }
    .ra-endpoint-meta { font-size: 11px; color: var(--color-text-secondary, #a0a0b0); display: flex; gap: 12px; }

    /* Auth */
    .ra-auth-section {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 16px; margin-bottom: 10px;
    }
    .ra-auth-title { font-size: 14px; font-weight: 600; color: var(--color-text, #e0e0e0); margin-bottom: 8px; }
    .ra-auth-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-bottom: 4px; }
    .ra-token-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0; border-bottom: 1px solid var(--color-border, #2e2e3e);
    }
    .ra-token-name { font-size: 13px; color: var(--color-text, #e0e0e0); }
    .ra-token-key {
      font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--color-text-secondary, #a0a0b0);
    }

    /* Rate limit */
    .ra-rate-section {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 16px;
    }
    .ra-rate-bar-track { height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; margin-top: 8px; }
    .ra-rate-bar-fill { height: 8px; border-radius: 4px; transition: width 0.3s; }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'rest-api-config';

  const ENDPOINTS = [
    { method: 'GET', path: '/api/status', description: 'Get current harness status', auth: true, rateLimit: 100, category: 'status', params: [] },
    { method: 'GET', path: '/api/features', description: 'List all features with status', auth: true, rateLimit: 100, category: 'features', params: [{ name: 'status', type: 'string', desc: 'Filter by pass/fail' }] },
    { method: 'GET', path: '/api/features/:id', description: 'Get specific feature details', auth: true, rateLimit: 100, category: 'features', params: [{ name: 'id', type: 'string', desc: 'Feature ID' }] },
    { method: 'POST', path: '/api/harness/start', description: 'Start the coding harness', auth: true, rateLimit: 10, category: 'harness', params: [{ name: 'target', type: 'string', desc: 'Target feature' }] },
    { method: 'POST', path: '/api/harness/stop', description: 'Stop the running harness', auth: true, rateLimit: 10, category: 'harness', params: [] },
    { method: 'GET', path: '/api/harness/logs', description: 'Stream harness logs', auth: true, rateLimit: 50, category: 'harness', params: [{ name: 'lines', type: 'number', desc: 'Number of lines' }] },
    { method: 'GET', path: '/api/analytics/velocity', description: 'Get velocity metrics', auth: true, rateLimit: 60, category: 'analytics', params: [{ name: 'period', type: 'string', desc: 'Time period' }] },
    { method: 'GET', path: '/api/analytics/costs', description: 'Get cost breakdown', auth: true, rateLimit: 60, category: 'analytics', params: [] },
    { method: 'POST', path: '/api/deploy/trigger', description: 'Trigger a deployment', auth: true, rateLimit: 5, category: 'deploy', params: [{ name: 'environment', type: 'string', desc: 'Target environment' }] },
    { method: 'GET', path: '/api/deploy/status', description: 'Get deployment status', auth: true, rateLimit: 60, category: 'deploy', params: [] },
    { method: 'PUT', path: '/api/config', description: 'Update configuration', auth: true, rateLimit: 20, category: 'config', params: [{ name: 'settings', type: 'object', desc: 'Config settings' }] },
    { method: 'DELETE', path: '/api/cache', description: 'Clear application cache', auth: true, rateLimit: 5, category: 'config', params: [] },
    { method: 'GET', path: '/api/health', description: 'Health check endpoint', auth: false, rateLimit: 200, category: 'status', params: [] },
    { method: 'PATCH', path: '/api/features/:id', description: 'Update feature status', auth: true, rateLimit: 30, category: 'features', params: [{ name: 'passes', type: 'boolean', desc: 'Pass/fail status' }] },
  ];

  const API_TOKENS = [
    { id: 'tok-1', name: 'Production API Key', key: 'acd_prod_****7890', scopes: ['read', 'write'], createdAt: '2026-01-15', expiresAt: '2026-07-15', requestCount: 1245 },
    { id: 'tok-2', name: 'CI/CD Pipeline', key: 'acd_ci_****3456', scopes: ['read', 'deploy'], createdAt: '2026-01-20', expiresAt: '2026-04-20', requestCount: 892 },
    { id: 'tok-3', name: 'Monitoring Service', key: 'acd_mon_****9012', scopes: ['read'], createdAt: '2026-02-01', expiresAt: '2026-08-01', requestCount: 3456 },
  ];

  let state = {
    activeTab: 'endpoints',
    tokens: [...API_TOKENS],
    rateLimits: {
      windowMs: 60000,
      maxRequests: 100,
      currentUsage: 42,
      retryAfter: null,
    },
    requestLog: [],
  };

  function generateRequestLog() {
    const log = [];
    const now = Date.now();
    for (let i = 0; i < 20; i++) {
      const ep = ENDPOINTS[i % ENDPOINTS.length];
      log.push({
        id: 'req-' + i,
        method: ep.method,
        path: ep.path,
        status: i % 8 === 0 ? 429 : i % 5 === 0 ? 401 : 200,
        duration: 10 + Math.floor(Math.random() * 200),
        timestamp: new Date(now - i * 180000).toISOString(),
        token: API_TOKENS[i % API_TOKENS.length].name,
      });
    }
    return log;
  }

  // ── Core API ──────────────────────────────────────────────────
  function getEndpoints(filter) {
    let eps = ENDPOINTS.map((e, i) => ({ ...e, id: 'ep-' + i }));
    if (filter?.category) eps = eps.filter(e => e.category === filter.category);
    if (filter?.method) eps = eps.filter(e => e.method === filter.method);
    return eps;
  }

  function getEndpoint(path, method) {
    return ENDPOINTS.find(e => e.path === path && (!method || e.method === method)) || null;
  }

  function getDocumentation() {
    return {
      version: 'v1',
      baseUrl: '/api',
      authScheme: 'Bearer Token',
      contentType: 'application/json',
      endpoints: ENDPOINTS.map((e, i) => ({
        id: 'ep-' + i,
        ...e,
        example: {
          request: `curl -H "Authorization: Bearer <token>" ${e.method === 'GET' ? '' : '-X ' + e.method + ' '}http://localhost:3000${e.path}`,
          response: '{ "success": true, "data": {} }',
        },
      })),
    };
  }

  function getTokens() {
    return state.tokens;
  }

  function createToken(name, scopes) {
    const token = {
      id: 'tok-' + Math.random().toString(36).substring(2, 8),
      name: name,
      key: 'acd_new_****' + Math.random().toString(36).substring(2, 6),
      scopes: scopes || ['read'],
      createdAt: new Date().toISOString().split('T')[0],
      expiresAt: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
      requestCount: 0,
    };
    state.tokens.push(token);
    saveState();
    render();
    return token.id;
  }

  function revokeToken(id) {
    const idx = state.tokens.findIndex(t => t.id === id);
    if (idx === -1) return false;
    state.tokens.splice(idx, 1);
    saveState();
    render();
    return true;
  }

  function authenticateRequest(tokenKey) {
    const token = state.tokens.find(t => t.key === tokenKey);
    if (!token) return { authenticated: false, reason: 'Invalid token' };
    return { authenticated: true, tokenId: token.id, scopes: token.scopes };
  }

  function getRateLimitStatus() {
    return {
      windowMs: state.rateLimits.windowMs,
      maxRequests: state.rateLimits.maxRequests,
      remaining: state.rateLimits.maxRequests - state.rateLimits.currentUsage,
      currentUsage: state.rateLimits.currentUsage,
      usagePercent: Math.round(state.rateLimits.currentUsage / state.rateLimits.maxRequests * 100),
      resetAt: new Date(Date.now() + state.rateLimits.windowMs).toISOString(),
      isLimited: state.rateLimits.currentUsage >= state.rateLimits.maxRequests,
    };
  }

  function updateRateLimit(config) {
    Object.assign(state.rateLimits, config);
    saveState();
    render();
    return getRateLimitStatus();
  }

  function getRequestLog() {
    return state.requestLog;
  }

  function getStats() {
    const rl = getRateLimitStatus();
    return {
      totalEndpoints: ENDPOINTS.length,
      totalTokens: state.tokens.length,
      rateLimitUsage: rl.usagePercent,
      totalRequests: state.requestLog.length,
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('rest-api-widget');
    if (!container) return;
    const stats = getStats();

    container.innerHTML = `
      <div id="rest-api-card">
        <div class="ra-header">
          <h3>REST API</h3>
          <span class="ra-badge" style="background:#22c55e22;color:#22c55e">v1 Active</span>
        </div>
        <div class="ra-stats-row" id="ra-stats">
          <div class="ra-stat-card"><div class="ra-stat-val">${stats.totalEndpoints}</div><div class="ra-stat-label">Endpoints</div></div>
          <div class="ra-stat-card"><div class="ra-stat-val">${stats.totalTokens}</div><div class="ra-stat-label">API Tokens</div></div>
          <div class="ra-stat-card"><div class="ra-stat-val">${stats.rateLimitUsage}%</div><div class="ra-stat-label">Rate Used</div></div>
          <div class="ra-stat-card"><div class="ra-stat-val">${stats.totalRequests}</div><div class="ra-stat-label">Requests</div></div>
        </div>
        <div class="ra-tabs" id="ra-tabs">
          <button class="ra-tab ${state.activeTab === 'endpoints' ? 'active' : ''}" data-tab="endpoints">Endpoints</button>
          <button class="ra-tab ${state.activeTab === 'auth' ? 'active' : ''}" data-tab="auth">Auth & Tokens</button>
          <button class="ra-tab ${state.activeTab === 'ratelimit' ? 'active' : ''}" data-tab="ratelimit">Rate Limiting</button>
        </div>
        <div id="ra-content"></div>
      </div>
    `;

    container.querySelectorAll('.ra-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('ra-content');
    if (!el) return;
    if (state.activeTab === 'endpoints') renderEndpoints(el);
    else if (state.activeTab === 'auth') renderAuth(el);
    else renderRateLimit(el);
  }

  function renderEndpoints(el) {
    const endpoints = getEndpoints();
    el.innerHTML = `
      <div class="ra-endpoint-list" id="ra-endpoint-list">
        ${endpoints.map(e => `
          <div class="ra-endpoint-item" data-ep="${e.id}">
            <div class="ra-endpoint-top">
              <span class="ra-method-badge ra-method-${e.method}">${e.method}</span>
              <span class="ra-endpoint-path">${e.path}</span>
            </div>
            <div class="ra-endpoint-desc">${e.description}</div>
            <div class="ra-endpoint-meta">
              <span>Auth: ${e.auth ? 'Required' : 'None'}</span>
              <span>Rate: ${e.rateLimit}/min</span>
              <span>Category: ${e.category}</span>
              ${e.params.length > 0 ? `<span>Params: ${e.params.map(p => p.name).join(', ')}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderAuth(el) {
    const tokens = getTokens();
    el.innerHTML = `
      <div class="ra-auth-section" id="ra-auth-section">
        <div class="ra-auth-title">Authentication</div>
        <div class="ra-auth-detail">Method: Bearer Token</div>
        <div class="ra-auth-detail">Header: Authorization: Bearer &lt;token&gt;</div>
      </div>
      <div class="ra-auth-section" id="ra-token-list">
        <div class="ra-auth-title">API Tokens (${tokens.length})</div>
        ${tokens.map(t => `
          <div class="ra-token-item" data-token="${t.id}">
            <div>
              <div class="ra-token-name">${t.name}</div>
              <div class="ra-token-key">${t.key} · Scopes: ${t.scopes.join(', ')} · Requests: ${t.requestCount}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderRateLimit(el) {
    const rl = getRateLimitStatus();
    el.innerHTML = `
      <div class="ra-rate-section" id="ra-rate-section">
        <div class="ra-auth-title">Rate Limiting</div>
        <div class="ra-auth-detail">Window: ${rl.windowMs / 1000}s · Max: ${rl.maxRequests} requests</div>
        <div class="ra-auth-detail">Current: ${rl.currentUsage} / ${rl.maxRequests} (${rl.usagePercent}% used)</div>
        <div class="ra-auth-detail">Remaining: ${rl.remaining} · Reset: ${new Date(rl.resetAt).toLocaleTimeString()}</div>
        <div class="ra-rate-bar-track">
          <div class="ra-rate-bar-fill" style="width:${rl.usagePercent}%;background:${rl.usagePercent > 80 ? '#ef4444' : rl.usagePercent > 50 ? '#f59e0b' : '#22c55e'}"></div>
        </div>
        <div style="margin-top:16px">
          <div class="ra-auth-title">Request Log</div>
          ${state.requestLog.slice(0, 10).map(r => `
            <div class="ra-auth-detail" style="display:flex;gap:8px">
              <span class="ra-method-badge ra-method-${r.method}" style="font-size:10px;padding:1px 4px">${r.method}</span>
              <span>${r.path}</span>
              <span style="color:${r.status === 200 ? '#22c55e' : '#ef4444'}">${r.status}</span>
              <span>${r.duration}ms</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        activeTab: state.activeTab,
        tokens: state.tokens,
        rateLimits: state.rateLimits,
      }));
    } catch (e) {}
  }

  function loadState() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        const parsed = JSON.parse(s);
        state.activeTab = parsed.activeTab || state.activeTab;
        if (parsed.tokens?.length > 0) state.tokens = parsed.tokens;
        if (parsed.rateLimits) Object.assign(state.rateLimits, parsed.rateLimits);
      }
    } catch (e) {}
  }

  window.restApi = {
    getEndpoints, getEndpoint, getDocumentation,
    getTokens, createToken, revokeToken, authenticateRequest,
    getRateLimitStatus, updateRateLimit, getRequestLog, getStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        endpointCount: ENDPOINTS.length,
        tokenCount: state.tokens.length,
        rateLimitStatus: getRateLimitStatus(),
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    state.requestLog = generateRequestLog();
    render();
  });
})();
